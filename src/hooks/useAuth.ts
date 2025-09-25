import { useAuth as useAuthContext, useAuthStatus, useUser, useSession as useAuthSession } from '@/lib/auth-context'
import { useCallback, useMemo } from 'react'
import { AuthStatus, type User, type Session, type AuthResponse } from '@/types/auth'

// 기본 useAuth 훅 (AuthContext 래퍼)
export { useAuthContext as useAuth }

// 확장된 인증 관련 훅들

/**
 * 인증 상태만 필요한 경우 사용하는 경량화된 훅
 */
export function useAuthState() {
  const { user, loading, initialized } = useAuthContext()

  return useMemo(() => ({
    isAuthenticated: !!user,
    isLoading: loading,
    isInitialized: initialized,
    user,
  }), [user, loading, initialized])
}

/**
 * 로그인/회원가입 폼에서 사용하는 훅
 */
export function useAuthActions() {
  const { signIn, signUp, signOut } = useAuthContext()

  const handleSignIn = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      const result = await signIn(email, password)

      if (result.error) {
        return {
          success: false,
          error: result.error.message
        }
      }

      return { success: true }
    },
    [signIn]
  )

  const handleSignUp = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      const result = await signUp(email, password)

      if (result.error) {
        return {
          success: false,
          error: result.error.message
        }
      }

      return { success: true }
    },
    [signUp]
  )

  const handleSignOut = useCallback(async (): Promise<void> => {
    await signOut()
  }, [signOut])

  return {
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut
  }
}

/**
 * 현재 사용자의 정보와 권한을 확인하는 훅
 */
export function useCurrentUser() {
  const user = useUser()
  const session = useSession()

  return useMemo(() => ({
    user,
    session,
    isEmailVerified: user?.email_confirmed_at !== null,
    userId: user?.id || null,
    userEmail: user?.email || null,
    createdAt: user?.created_at || null,
    lastSignIn: user?.last_sign_in_at || null,
  }), [user, session])
}

/**
 * 조건부 렌더링을 위한 인증 상태 훅
 */
export function useAuthGuard() {
  const status = useAuthStatus()
  const { user, loading } = useAuthContext()

  return useMemo(() => ({
    isLoading: status === AuthStatus.LOADING || loading,
    isAuthenticated: status === AuthStatus.AUTHENTICATED,
    isUnauthenticated: status === AuthStatus.UNAUTHENTICATED,
    requireAuth: !loading && status !== AuthStatus.AUTHENTICATED,
    user
  }), [status, loading, user])
}

/**
 * 프로필 관리를 위한 훅
 */
export function useProfile() {
  const { user, updateProfile } = useAuthContext()

  const handleUpdateProfile = useCallback(
    async (updates: Partial<User>): Promise<{ success: boolean; error?: string }> => {
      const result = await updateProfile(updates)

      if (result.error) {
        return {
          success: false,
          error: result.error.message
        }
      }

      return { success: true }
    },
    [updateProfile]
  )

  return {
    user,
    updateProfile: handleUpdateProfile,
    isProfileComplete: !!(user?.email)
  }
}

/**
 * 세션 관리를 위한 훅
 */
export function useSession() {
  const session = useAuthSession()

  return useMemo(() => ({
    session,
    accessToken: session?.access_token || null,
    refreshToken: session?.refresh_token || null,
    expiresAt: session?.expires_at || null,
    isExpired: session ? (session.expires_at || 0) < Date.now() / 1000 : false,
    expiresIn: session ? Math.max(0, (session.expires_at || 0) - Date.now() / 1000) : 0
  }), [session])
}

/**
 * 로그아웃 확인 다이얼로그를 위한 훅
 */
export function useLogout() {
  const { signOut } = useAuthContext()

  const confirmLogout = useCallback(
    (onConfirm?: () => void) => {
      const confirmed = window.confirm('정말 로그아웃하시겠습니까?')
      if (confirmed) {
        signOut()
        onConfirm?.()
      }
    },
    [signOut]
  )

  return {
    logout: signOut,
    confirmLogout
  }
}

/**
 * 리다이렉션 로직을 포함한 인증 훅
 */
export function useAuthRedirect(
  redirectTo: string = '/login',
  redirectAfterLogin: string = '/'
) {
  const { isAuthenticated, isLoading } = useAuthGuard()

  const shouldRedirectToLogin = !isLoading && !isAuthenticated
  const shouldRedirectAfterLogin = isAuthenticated

  return {
    isAuthenticated,
    isLoading,
    shouldRedirectToLogin,
    shouldRedirectAfterLogin,
    loginRedirectUrl: redirectTo,
    postLoginRedirectUrl: redirectAfterLogin
  }
}

// 타입 재내보내기
export type { AuthStatus, User, Session, AuthResponse } from '@/types/auth'