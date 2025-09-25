import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabase } from './supabase'

// 보호된 경로들
const PROTECTED_ROUTES = [
  '/profile',
  '/dashboard',
  '/configurator', // 3D 컨피규레이터 (향후)
  '/saved-designs', // 저장된 디자인 (향후)
]

// 인증이 필요하지 않은 경로들 (로그인한 사용자가 접근하면 리다이렉트)
const PUBLIC_ONLY_ROUTES = [
  '/login',
  '/register',
  '/forgot-password'
]

// API 경로 패턴
const API_ROUTES = [
  '/api/auth',
]

export interface AuthMiddlewareConfig {
  redirectTo?: string
  allowUnauthenticated?: boolean
}

/**
 * 인증 미들웨어 메인 함수
 */
export function authMiddleware(request: NextRequest, config?: AuthMiddlewareConfig) {
  const pathname = request.nextUrl.pathname
  const redirectTo = config?.redirectTo || '/login'

  // API 경로는 미들웨어에서 처리하지 않음
  if (API_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // 정적 파일과 Next.js 내부 경로는 제외
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/public') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  return handleAuthRoute(request, pathname, redirectTo)
}

/**
 * 인증 상태에 따른 라우트 처리
 */
async function handleAuthRoute(
  request: NextRequest,
  pathname: string,
  redirectTo: string
): Promise<NextResponse> {
  const isAuthenticated = await checkAuthentication(request)

  // 보호된 경로에 대한 처리
  if (isProtectedRoute(pathname)) {
    if (!isAuthenticated) {
      // 원래 요청한 페이지를 redirect 파라미터로 추가
      const redirectUrl = new URL(redirectTo, request.url)
      redirectUrl.searchParams.set('redirect', pathname)

      return NextResponse.redirect(redirectUrl)
    }

    return NextResponse.next()
  }

  // 인증된 사용자가 로그인/회원가입 페이지에 접근하는 경우
  if (isPublicOnlyRoute(pathname)) {
    if (isAuthenticated) {
      const redirectUrl = request.nextUrl.searchParams.get('redirect') || '/'
      return NextResponse.redirect(new URL(redirectUrl, request.url))
    }

    return NextResponse.next()
  }

  // 그 외 모든 경로는 통과
  return NextResponse.next()
}

/**
 * 사용자 인증 상태 확인
 */
async function checkAuthentication(request: NextRequest): Promise<boolean> {
  try {
    // Authorization 헤더 확인
    const authHeader = request.headers.get('authorization')
    let token: string | null = null

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }

    // 쿠키에서 토큰 확인
    if (!token) {
      const cookieToken = request.cookies.get('supabase-auth-token')?.value
      if (cookieToken) {
        token = cookieToken
      }
    }

    if (!token) {
      return false
    }

    // Supabase를 통한 토큰 검증
    const { data, error } = await supabase.auth.getUser(token)

    if (error || !data.user) {
      // 토큰이 유효하지 않은 경우 refresh token으로 시도
      const refreshToken = request.cookies.get('supabase-refresh-token')?.value

      if (refreshToken) {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
          refresh_token: refreshToken
        })

        return !refreshError && !!refreshData.session?.user
      }

      return false
    }

    return true
  } catch (error) {
    console.error('Authentication check error:', error)
    return false
  }
}

/**
 * 보호된 경로인지 확인
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route =>
    pathname.startsWith(route) || pathname === route
  )
}

/**
 * 공개 전용 경로인지 확인 (인증된 사용자는 접근 불가)
 */
function isPublicOnlyRoute(pathname: string): boolean {
  return PUBLIC_ONLY_ROUTES.some(route =>
    pathname.startsWith(route) || pathname === route
  )
}

/**
 * HOC를 위한 타입 정의
 */
export interface WithAuthOptions {
  redirectTo?: string
  allowUnauthenticated?: boolean
}

/**
 * 서버 컴포넌트용 인증 확인 함수
 */
export async function getServerAuthState(request: NextRequest) {
  const isAuthenticated = await checkAuthentication(request)

  return {
    isAuthenticated,
    redirect: isAuthenticated ? null : '/login'
  }
}