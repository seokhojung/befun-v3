-- 장바구니 및 구매 시스템을 위한 데이터베이스 스키마 확장
-- Story 3.1: 장바구니 및 결제 연동

-- saved_designs 테이블에 장바구니 관련 컬럼 추가
DO $$
BEGIN
  -- cart_status 컬럼 추가 (기본값: 'saved')
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_designs' AND column_name = 'cart_status'
  ) THEN
    ALTER TABLE public.saved_designs
    ADD COLUMN cart_status VARCHAR(20) DEFAULT 'saved' CHECK (
      cart_status IN ('saved', 'in_cart', 'purchased', 'cancelled')
    );
  END IF;

  -- cart_added_at 컬럼 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_designs' AND column_name = 'cart_added_at'
  ) THEN
    ALTER TABLE public.saved_designs
    ADD COLUMN cart_added_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- external_order_id 컬럼 추가 (외부 쇼핑몰 주문 ID)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_designs' AND column_name = 'external_order_id'
  ) THEN
    ALTER TABLE public.saved_designs
    ADD COLUMN external_order_id VARCHAR(100);
  END IF;
END $$;

-- 구매 요청 로그 테이블 생성
CREATE TABLE IF NOT EXISTS public.purchase_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  design_id UUID REFERENCES public.saved_designs(id) ON DELETE CASCADE NOT NULL,
  external_api_request JSONB, -- 외부 API 요청 데이터
  external_api_response JSONB, -- 외부 API 응답 데이터
  status VARCHAR(20) DEFAULT 'pending' CHECK (
    status IN ('pending', 'success', 'failed', 'redirected')
  ),
  error_message TEXT,
  cart_id VARCHAR(100), -- 장바구니 ID (외부 시스템용)
  redirect_url TEXT, -- 리디렉션 URL
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS 정책 적용
ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;

-- purchase_requests 정책 생성
CREATE POLICY "Users can view own purchase requests" ON public.purchase_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own purchase requests" ON public.purchase_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own purchase requests" ON public.purchase_requests
  FOR UPDATE USING (auth.uid() = user_id);

-- updated_at 트리거 설정
CREATE TRIGGER set_updated_at_purchase_requests
  BEFORE UPDATE ON public.purchase_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_purchase_requests_user_id ON public.purchase_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_design_id ON public.purchase_requests(design_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_status ON public.purchase_requests(status);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_created_at ON public.purchase_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_saved_designs_cart_status ON public.saved_designs(cart_status);
CREATE INDEX IF NOT EXISTS idx_saved_designs_cart_added_at ON public.saved_designs(cart_added_at);

-- 함수: 장바구니 상태 업데이트 시 timestamp 자동 설정
CREATE OR REPLACE FUNCTION update_cart_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- cart_status가 'in_cart'로 변경될 때 cart_added_at 설정
  IF NEW.cart_status = 'in_cart' AND OLD.cart_status != 'in_cart' THEN
    NEW.cart_added_at = timezone('utc'::text, now());
  END IF;

  -- cart_status가 'in_cart'에서 다른 상태로 변경될 때 cart_added_at 초기화
  IF NEW.cart_status != 'in_cart' AND OLD.cart_status = 'in_cart' THEN
    NEW.cart_added_at = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 장바구니 상태 변경 트리거
CREATE TRIGGER update_cart_timestamp_trigger
  BEFORE UPDATE ON public.saved_designs
  FOR EACH ROW EXECUTE FUNCTION update_cart_timestamp();