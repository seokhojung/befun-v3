import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'

export function middleware(request: NextRequest) {
  // 인증 미들웨어 적용
  return authMiddleware(request, {
    redirectTo: '/login'
  })
}

// 미들웨어가 적용될 경로 설정
export const config = {
  matcher: [
    // API 라우트 제외
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}