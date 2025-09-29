-- 가격 계산 시스템을 위한 데이터베이스 스키마 생성
-- Story 2.2: 실시간 가격 계산 시스템

-- 가격 정책 테이블 생성 (기존 재료 시스템 확장)
CREATE TABLE IF NOT EXISTS public.pricing_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_type VARCHAR(20) NOT NULL CHECK (
    material_type IN ('wood', 'mdf', 'steel', 'metal', 'glass', 'fabric')
  ),
  base_price_per_m3 DECIMAL(10,2) NOT NULL CHECK (base_price_per_m3 > 0), -- m³당 기본 단가 (KRW)
  price_modifier DECIMAL(5,4) NOT NULL DEFAULT 1.0000 CHECK (price_modifier > 0), -- 가격 배수
  is_active BOOLEAN NOT NULL DEFAULT true,
  legacy_material BOOLEAN NOT NULL DEFAULT false, -- 기존 재료 구분 (wood/mdf/steel)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- 유니크 제약조건
  CONSTRAINT pricing_policies_material_type_unique UNIQUE(material_type)
);

-- 재료 정보 테이블 (BFF API와 연동)
CREATE TABLE IF NOT EXISTS public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL, -- 재료 이름 (한국어)
  type VARCHAR(20) NOT NULL CHECK (
    type IN ('wood', 'mdf', 'steel', 'metal', 'glass', 'fabric')
  ),
  price_per_unit DECIMAL(10,2), -- 단위당 가격 (pricing_policies와 중복되지만 UI 표시용)
  availability BOOLEAN NOT NULL DEFAULT true,
  thumbnail_url TEXT, -- 썸네일 이미지 URL
  description TEXT, -- 재료 설명
  properties JSONB, -- 재료 물성 정보 (metalness, roughness 등)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- 외래키 제약조건
  CONSTRAINT fk_materials_pricing_policy
    FOREIGN KEY (type) REFERENCES pricing_policies(material_type) ON UPDATE CASCADE
);

-- 기존 saved_design 테이블이 있는지 확인하고 생성 또는 확장
CREATE TABLE IF NOT EXISTS public.saved_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  width_cm INTEGER NOT NULL CHECK (width_cm > 0 AND width_cm <= 1000),
  depth_cm INTEGER NOT NULL CHECK (depth_cm > 0 AND depth_cm <= 1000),
  height_cm INTEGER NOT NULL CHECK (height_cm > 0 AND height_cm <= 300),
  material VARCHAR(20) NOT NULL CHECK (
    material IN ('wood', 'mdf', 'steel', 'metal', 'glass', 'fabric')
  ),
  color VARCHAR(50),
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- saved_design 테이블에 가격 관련 컬럼 추가 (만약 존재하지 않는다면)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_designs' AND column_name = 'calculated_price'
  ) THEN
    ALTER TABLE public.saved_designs
    ADD COLUMN calculated_price DECIMAL(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_designs' AND column_name = 'price_breakdown'
  ) THEN
    ALTER TABLE public.saved_designs
    ADD COLUMN price_breakdown JSONB;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_designs' AND column_name = 'estimated_price'
  ) THEN
    ALTER TABLE public.saved_designs
    ADD COLUMN estimated_price DECIMAL(10,2);
  END IF;
END $$;

-- user_profiles 테이블에 구독 및 디자인 할당량 컬럼 추가 (만약 존재하지 않는다면)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE public.user_profiles
    ADD COLUMN subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'design_quota_used'
  ) THEN
    ALTER TABLE public.user_profiles
    ADD COLUMN design_quota_used INTEGER DEFAULT 0 CHECK (design_quota_used >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'design_quota_limit'
  ) THEN
    ALTER TABLE public.user_profiles
    ADD COLUMN design_quota_limit INTEGER DEFAULT 5 CHECK (design_quota_limit > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'ui_preferences'
  ) THEN
    ALTER TABLE public.user_profiles
    ADD COLUMN ui_preferences JSONB DEFAULT '{"theme": "light", "units": "cm", "currency": "KRW"}';
  END IF;
END $$;

-- 가격 계산 히스토리 테이블 (선택적, 분석용)
CREATE TABLE IF NOT EXISTS public.price_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  width_cm INTEGER NOT NULL,
  depth_cm INTEGER NOT NULL,
  height_cm INTEGER NOT NULL,
  material VARCHAR(20) NOT NULL,
  volume_m3 DECIMAL(10,6) NOT NULL,
  calculated_price DECIMAL(10,2) NOT NULL,
  price_breakdown JSONB NOT NULL,
  calculation_duration_ms INTEGER, -- 계산 소요 시간
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- 인덱스 생성
  INDEX idx_price_calculations_user_id ON price_calculations(user_id),
  INDEX idx_price_calculations_material ON price_calculations(material),
  INDEX idx_price_calculations_created_at ON price_calculations(created_at)
);

-- RLS (Row Level Security) 정책 활성화
ALTER TABLE public.pricing_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_calculations ENABLE ROW LEVEL SECURITY;

-- RLS 정책 생성

-- pricing_policies 정책 (모든 사용자 읽기 가능, 관리자만 수정)
CREATE POLICY "Anyone can view active pricing policies" ON public.pricing_policies
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage pricing policies" ON public.pricing_policies
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- materials 정책 (모든 사용자 읽기 가능, 관리자만 수정)
CREATE POLICY "Anyone can view available materials" ON public.materials
  FOR SELECT USING (availability = true);

CREATE POLICY "Admins can manage materials" ON public.materials
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- saved_designs 정책 (사용자는 자신의 디자인만 접근)
CREATE POLICY "Users can view their own designs" ON public.saved_designs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own designs" ON public.saved_designs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own designs" ON public.saved_designs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own designs" ON public.saved_designs
  FOR DELETE USING (auth.uid() = user_id);

-- price_calculations 정책 (사용자는 자신의 계산 이력만 접근)
CREATE POLICY "Users can view their own price calculations" ON public.price_calculations
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Anyone can insert price calculations" ON public.price_calculations
  FOR INSERT WITH CHECK (true); -- 익명 사용자도 가격 계산 가능

-- updated_at 트리거 설정
CREATE TRIGGER set_updated_at_pricing_policies
  BEFORE UPDATE ON public.pricing_policies
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_materials
  BEFORE UPDATE ON public.materials
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_saved_designs
  BEFORE UPDATE ON public.saved_designs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_pricing_policies_material_type ON public.pricing_policies(material_type);
CREATE INDEX IF NOT EXISTS idx_pricing_policies_is_active ON public.pricing_policies(is_active);
CREATE INDEX IF NOT EXISTS idx_materials_type ON public.materials(type);
CREATE INDEX IF NOT EXISTS idx_materials_availability ON public.materials(availability);
CREATE INDEX IF NOT EXISTS idx_saved_designs_user_id ON public.saved_designs(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_designs_material ON public.saved_designs(material);
CREATE INDEX IF NOT EXISTS idx_saved_designs_created_at ON public.saved_designs(created_at);

-- 기본 가격 정책 데이터 삽입
INSERT INTO public.pricing_policies (material_type, base_price_per_m3, price_modifier, legacy_material)
VALUES
  -- 기존 재료 (Story 2.1에서 구현됨)
  ('wood', 50000.00, 1.0000, true),
  ('mdf', 50000.00, 0.8000, true),
  ('steel', 50000.00, 1.1500, true),

  -- 신규 재료 (Story 2.2에서 추가)
  ('metal', 50000.00, 1.5000, false),
  ('glass', 50000.00, 2.0000, false),
  ('fabric', 50000.00, 0.8000, false)
ON CONFLICT (material_type) DO UPDATE SET
  base_price_per_m3 = EXCLUDED.base_price_per_m3,
  price_modifier = EXCLUDED.price_modifier,
  legacy_material = EXCLUDED.legacy_material,
  updated_at = timezone('utc'::text, now());

-- 기본 재료 정보 삽입
INSERT INTO public.materials (name, type, price_per_unit, availability, description, properties)
VALUES
  -- 기존 재료
  ('원목', 'wood', 50000.00, true, '자연스러운 원목 소재로 내구성이 뛰어남', '{"metalness": 0.0, "roughness": 0.8, "type": "wood"}'),
  ('MDF', 'mdf', 40000.00, true, '경제적이고 가공이 용이한 중밀도 섬유판', '{"metalness": 0.0, "roughness": 0.6, "type": "mdf"}'),
  ('스틸', 'steel', 57500.00, true, '견고하고 모던한 스틸 프레임', '{"metalness": 1.0, "roughness": 0.2, "type": "steel"}'),

  -- 신규 재료
  ('메탈', 'metal', 75000.00, true, '고급스러운 메탈 마감재', '{"metalness": 0.9, "roughness": 0.1, "type": "metal"}'),
  ('유리', 'glass', 100000.00, true, '투명하고 세련된 강화유리', '{"metalness": 0.0, "roughness": 0.05, "type": "glass"}'),
  ('패브릭', 'fabric', 40000.00, true, '부드럽고 따뜻한 원단 소재', '{"metalness": 0.0, "roughness": 0.9, "type": "fabric"}')
ON CONFLICT (type) DO UPDATE SET
  name = EXCLUDED.name,
  price_per_unit = EXCLUDED.price_per_unit,
  description = EXCLUDED.description,
  properties = EXCLUDED.properties,
  updated_at = timezone('utc'::text, now());

-- 함수: 사용자 디자인 할당량 체크
CREATE OR REPLACE FUNCTION check_design_quota()
RETURNS TRIGGER AS $$
BEGIN
  -- 사용자의 현재 할당량 확인
  IF EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = NEW.user_id
    AND up.design_quota_used >= up.design_quota_limit
  ) THEN
    RAISE EXCEPTION 'Design quota exceeded. Please upgrade your subscription.';
  END IF;

  -- 할당량 사용량 증가
  UPDATE user_profiles
  SET design_quota_used = design_quota_used + 1
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 디자인 저장 시 할당량 체크 트리거
CREATE TRIGGER check_design_quota_trigger
  BEFORE INSERT ON public.saved_designs
  FOR EACH ROW EXECUTE FUNCTION check_design_quota();

-- 함수: 디자인 삭제 시 할당량 사용량 감소
CREATE OR REPLACE FUNCTION decrease_design_quota()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_profiles
  SET design_quota_used = GREATEST(0, design_quota_used - 1)
  WHERE id = OLD.user_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 디자인 삭제 시 할당량 감소 트리거
CREATE TRIGGER decrease_design_quota_trigger
  AFTER DELETE ON public.saved_designs
  FOR EACH ROW EXECUTE FUNCTION decrease_design_quota();