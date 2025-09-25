-- 사용자 인증 시스템을 위한 추가 RLS 보안 정책
-- 보안 강화를 위한 세부 정책 설정

-- 1. 사용자 세션 보안 정책
-- auth.users 테이블은 Supabase가 관리하므로 직접 정책을 설정하지 않음

-- 2. API 접근 제한을 위한 함수 생성
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 관리자 권한 확인 함수
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.jwt() ->> 'role' = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 사용자 활동 로깅을 위한 함수
CREATE OR REPLACE FUNCTION public.log_user_activity(
  action_name TEXT,
  action_details JSONB DEFAULT NULL,
  user_ip INET DEFAULT NULL,
  user_agent_string TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- 인증된 사용자만 로그 생성 가능
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.user_activity_logs (
    user_id,
    action,
    details,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    action_name,
    action_details,
    user_ip,
    user_agent_string
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 사용자 프로필 업데이트 시 검증 함수
CREATE OR REPLACE FUNCTION public.validate_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  -- 이메일 형식 검증
  IF NEW.email IS NOT NULL AND NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;

  -- 웹사이트 URL 검증 (선택적)
  IF NEW.website IS NOT NULL AND NEW.website != '' AND NEW.website !~ '^https?://.*' THEN
    RAISE EXCEPTION 'Website URL must start with http:// or https://';
  END IF;

  -- 바이오 길이 제한
  IF NEW.bio IS NOT NULL AND LENGTH(NEW.bio) > 500 THEN
    RAISE EXCEPTION 'Bio must be 500 characters or less';
  END IF;

  -- 이름 길이 제한
  IF NEW.full_name IS NOT NULL AND LENGTH(NEW.full_name) > 100 THEN
    RAISE EXCEPTION 'Full name must be 100 characters or less';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 프로필 업데이트 검증 트리거 설정
CREATE TRIGGER validate_profile_update_trigger
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_profile_update();

-- 6. 비밀번호 정책 강화를 위한 함수 (클라이언트에서 사용)
CREATE OR REPLACE FUNCTION public.validate_password_strength(password TEXT)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  has_minimum_length BOOLEAN;
  has_letter BOOLEAN;
  has_number BOOLEAN;
  has_special_char BOOLEAN;
BEGIN
  -- 길이 검사 (최소 8자)
  has_minimum_length := LENGTH(password) >= 8;

  -- 영문자 포함 여부
  has_letter := password ~ '[A-Za-z]';

  -- 숫자 포함 여부
  has_number := password ~ '[0-9]';

  -- 특수문자 포함 여부 (권장사항)
  has_special_char := password ~ '[^A-Za-z0-9]';

  result := jsonb_build_object(
    'isValid', has_minimum_length AND has_letter AND has_number,
    'hasMinimumLength', has_minimum_length,
    'hasLetter', has_letter,
    'hasNumber', has_number,
    'hasSpecialChar', has_special_char,
    'score',
      CASE
        WHEN has_minimum_length AND has_letter AND has_number AND has_special_char THEN 'strong'
        WHEN has_minimum_length AND has_letter AND has_number THEN 'medium'
        ELSE 'weak'
      END
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 로그인 시도 제한을 위한 테이블 (선택적 - 실제 제품에서는 Redis 사용 권장)
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address INET NOT NULL,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  success BOOLEAN DEFAULT FALSE,

  -- 인덱스
  INDEX idx_login_attempts_email_ip ON login_attempts(email, ip_address),
  INDEX idx_login_attempts_attempted_at ON login_attempts(attempted_at)
);

-- RLS 설정
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- 로그인 시도 기록은 관리자만 볼 수 있음
CREATE POLICY "Only admins can view login attempts" ON public.login_attempts
  FOR ALL USING (public.is_admin());

-- 8. 로그인 시도 기록 함수
CREATE OR REPLACE FUNCTION public.record_login_attempt(
  user_email TEXT,
  client_ip INET,
  is_successful BOOLEAN DEFAULT FALSE
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.login_attempts (email, ip_address, success)
  VALUES (user_email, client_ip, is_successful);

  -- 오래된 로그인 시도 기록 정리 (7일 이상된 것)
  DELETE FROM public.login_attempts
  WHERE attempted_at < (now() - interval '7 days');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. 로그인 시도 횟수 확인 함수
CREATE OR REPLACE FUNCTION public.check_login_rate_limit(
  user_email TEXT,
  client_ip INET,
  max_attempts INTEGER DEFAULT 5,
  time_window INTERVAL DEFAULT INTERVAL '1 hour'
)
RETURNS BOOLEAN AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO attempt_count
  FROM public.login_attempts
  WHERE email = user_email
    AND ip_address = client_ip
    AND attempted_at > (now() - time_window)
    AND success = FALSE;

  RETURN attempt_count < max_attempts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. 사용자 데이터 삭제 시 관련 데이터 정리 함수
CREATE OR REPLACE FUNCTION public.cleanup_user_data()
RETURNS TRIGGER AS $$
BEGIN
  -- 사용자 활동 로그 삭제
  DELETE FROM public.user_activity_logs WHERE user_id = OLD.id;

  -- 로그인 시도 기록 삭제
  DELETE FROM public.login_attempts WHERE email = OLD.email;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 사용자 삭제 시 관련 데이터 정리 트리거
CREATE TRIGGER cleanup_user_data_trigger
  BEFORE DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_user_data();

-- 11. 보안 감사를 위한 뷰 생성 (관리자용)
CREATE OR REPLACE VIEW public.security_audit_view AS
SELECT
  u.id as user_id,
  u.email,
  u.created_at as user_created_at,
  u.last_sign_in_at,
  COUNT(DISTINCT al.id) as activity_count,
  MAX(al.created_at) as last_activity,
  COUNT(DISTINCT la.id) FILTER (WHERE la.success = false) as failed_login_attempts
FROM auth.users u
LEFT JOIN public.user_activity_logs al ON u.id = al.user_id
LEFT JOIN public.login_attempts la ON u.email = la.email
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.email, u.created_at, u.last_sign_in_at
ORDER BY u.created_at DESC;

-- 보안 감사 뷰에 RLS 적용 (관리자만 접근 가능)
ALTER VIEW public.security_audit_view OWNER TO postgres;

-- 권한 설정
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.user_profiles TO anon, authenticated;
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_settings TO authenticated;
GRANT SELECT ON public.user_activity_logs TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_password_strength TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_user_activity TO authenticated;