import { createClient } from '@supabase/supabase-js'

// 환경 변수 검증
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  if (process.env.NODE_ENV === 'development') {
    console.info('📝 Supabase 환경 변수가 설정되지 않아 더미 값을 사용합니다.')
  }
}

// Supabase 클라이언트 생성 (싱글톤 패턴)
export const supabase = createClient(
  supabaseUrl || 'https://example.supabase.co',
  supabaseAnonKey || 'dummy-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  }
)

// 서버사이드 전용 클라이언트 (서비스 역할 키 사용)
export const supabaseAdmin = createClient(
  supabaseUrl || 'https://example.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-service-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// 연결 상태 확인 헬퍼
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase.from('_supabase_dummy_test').select('*').limit(1)
    return !error
  } catch (error) {
    // 개발 환경에서만 로그 출력 (더미 환경 변수 사용 시 예상되는 오류)
    if (process.env.NODE_ENV === 'development') {
      console.debug('🔗 Supabase 연결 테스트 (더미 환경): ', error instanceof Error ? error.message : error)
    }
    return false
  }
}