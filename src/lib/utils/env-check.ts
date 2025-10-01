// 환경 변수 상태 확인 유틸리티

/**
 * Supabase 환경 변수가 실제 프로젝트와 연결되어 있는지 확인
 * @returns true if using real Supabase, false if using dummy/mock
 */
export function isRealSupabaseEnv(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // 더미 값이거나 비어있으면 false
  if (!url || !anonKey || !serviceKey) {
    return false
  }

  // example.supabase.co 또는 dummy로 시작하는 값은 Mock 환경
  const isDummyUrl = url.includes('example.supabase.co')
  const isDummyKey = anonKey.startsWith('dummy') || serviceKey.startsWith('dummy')

  return !isDummyUrl && !isDummyKey
}

/**
 * 개발 환경에서 Mock 모드 사용 여부
 */
export function isMockMode(): boolean {
  return process.env.NODE_ENV === 'development' && !isRealSupabaseEnv()
}