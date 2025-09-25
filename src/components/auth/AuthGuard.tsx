'use client'

import React from 'react'
import { useAuthGuard } from '@/hooks/useAuth'

interface WithAuthOptions {
  redirectTo?: string
  allowUnauthenticated?: boolean
}

/**
 * HOC: 컴포넌트를 보호하는 고차 컴포넌트
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  config?: WithAuthOptions
) {
  return function AuthenticatedComponent(props: P) {
    const { isLoading, isAuthenticated, requireAuth } = useAuthGuard()

    // 로딩 중일 때
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )
    }

    // 인증이 필요한 경우
    if (requireAuth && !config?.allowUnauthenticated) {
      if (typeof window !== 'undefined') {
        window.location.href = config?.redirectTo || '/login'
      }
      return null
    }

    return <Component {...props} />
  }
}

/**
 * 클라이언트 컴포넌트용 인증 가드
 */
export function ClientAuthGuard({
  children,
  fallback,
  redirectTo = '/login'
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
  redirectTo?: string
}) {
  const { isLoading, isAuthenticated, requireAuth } = useAuthGuard()

  // 로딩 중일 때
  if (isLoading) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // 인증이 필요한 경우 리다이렉트
  if (requireAuth) {
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname
      const redirectUrl = `${redirectTo}?redirect=${encodeURIComponent(currentPath)}`
      window.location.href = redirectUrl
    }
    return null
  }

  return <>{children}</>
}