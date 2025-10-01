// @server-only
// 이 파일은 서버 컴포넌트와 API 라우트에서만 사용 가능합니다.

import { createClient } from '@supabase/supabase-js'

// 환경 변수 검증
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  if (process.env.NODE_ENV === 'development') {
    console.info('📝 Supabase Admin 환경 변수가 설정되지 않아 더미 값을 사용합니다.')
  }
}

// 서버사이드 전용 Admin 클라이언트 (서비스 역할 키 사용)
// RLS 정책을 우회하고 전체 데이터베이스 접근 권한 보유
export const supabaseAdmin = createClient(
  supabaseUrl || 'https://example.supabase.co',
  supabaseServiceKey || 'dummy-service-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)