// CORS 설정 유틸리티

/**
 * 환경별 CORS Origin 반환
 * 개발: localhost:3000
 * 프로덕션: 환경 변수의 APP URL
 */
export function getCorsOrigin(): string {
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_APP_URL || 'https://befun.vercel.app'
  }
  return 'http://localhost:3000'
}

/**
 * CORS 헤더 생성
 */
export function getCorsHeaders(additionalMethods?: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': getCorsOrigin(),
    'Access-Control-Allow-Methods': additionalMethods || 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  }
}