'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'
import {
  type User,
  type Session,
  type AuthState,
  type AuthContextType,
  type AuthResponse,
  AuthStatus
} from '@/types/auth'

// Context 생성
const AuthContext = createContext<AuthContextType | null>(null)

// Provider Props 타입
interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    initialized: false
  })

  // 세션 상태 업데이트 함수
  const updateAuthState = useCallback((user: User | null, session: Session | null) => {
    setState(prevState => ({
      ...prevState,
      user,
      session,
      loading: false,
      initialized: true
    }))
  }, [])

  // 회원가입 함수
  const signUp = useCallback(async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const result = await response.json()

      if (!result.success) {
        return {
          user: null,
          session: null,
          error: result.error
        }
      }

      return result.data
    } catch (error) {
      return {
        user: null,
        session: null,
        error: {
          message: '네트워크 오류가 발생했습니다.',
          status: 0
        }
      }
    }
  }, [])

  // 로그인 함수
  const signIn = useCallback(async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const result = await response.json()

      if (!result.success) {
        return {
          user: null,
          session: null,
          error: result.error
        }
      }

      // 성공적인 로그인 시 상태 업데이트
      updateAuthState(result.data.user, result.data.session)

      return result.data
    } catch (error) {
      return {
        user: null,
        session: null,
        error: {
          message: '네트워크 오류가 발생했습니다.',
          status: 0
        }
      }
    }
  }, [updateAuthState])

  // 로그아웃 함수
  const signOut = useCallback(async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      })

      // 상태 초기화
      updateAuthState(null, null)
    } catch (error) {
      console.error('Logout error:', error)
      // 에러가 발생해도 클라이언트 상태는 초기화
      updateAuthState(null, null)
    }
  }, [updateAuthState])

  // 프로필 업데이트 함수
  const updateProfile = useCallback(async (updates: Partial<User>): Promise<AuthResponse> => {
    if (!state.session?.access_token) {
      return {
        user: null,
        session: null,
        error: {
          message: '인증이 필요합니다.',
          status: 401
        }
      }
    }

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.session.access_token}`,
        },
        body: JSON.stringify(updates),
      })

      const result = await response.json()

      if (!result.success) {
        return {
          user: null,
          session: null,
          error: result.error
        }
      }

      // 프로필 업데이트 성공 시 현재 사용자 정보 새로고침
      if (state.user) {
        const updatedUser = { ...state.user, ...updates }
        updateAuthState(updatedUser, state.session)
      }

      return {
        user: state.user,
        session: state.session
      }
    } catch (error) {
      return {
        user: null,
        session: null,
        error: {
          message: '네트워크 오류가 발생했습니다.',
          status: 0
        }
      }
    }
  }, [state.session, state.user, updateAuthState])

  // 세션 검증 및 갱신
  const validateSession = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/auth/session', {
        method: 'GET',
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          updateAuthState(result.data.user, result.data.session)
          return
        }
      }

      // 세션이 유효하지 않은 경우 상태 초기화
      updateAuthState(null, null)
    } catch (error) {
      console.error('Session validation error:', error)
      updateAuthState(null, null)
    }
  }, [updateAuthState])

  // 컴포넌트 마운트 시 세션 확인
  useEffect(() => {
    validateSession()
  }, [validateSession])

  // Supabase Auth 상태 변경 리스너 설정
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email)

        switch (event) {
          case 'SIGNED_IN':
            updateAuthState(session?.user || null, session)
            break
          case 'SIGNED_OUT':
            updateAuthState(null, null)
            break
          case 'TOKEN_REFRESHED':
            updateAuthState(session?.user || null, session)
            break
          case 'USER_UPDATED':
            updateAuthState(session?.user || null, session)
            break
          default:
            break
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [updateAuthState])

  // 자동 토큰 갱신 (10분마다)
  useEffect(() => {
    if (!state.session) return

    const refreshInterval = setInterval(async () => {
      if (state.session?.refresh_token) {
        try {
          const { data, error } = await supabase.auth.refreshSession({
            refresh_token: state.session.refresh_token
          })

          if (error) {
            console.error('Token refresh failed:', error)
            signOut()
          } else if (data.session) {
            updateAuthState(data.user, data.session)
          }
        } catch (error) {
          console.error('Token refresh error:', error)
          signOut()
        }
      }
    }, 10 * 60 * 1000) // 10분

    return () => clearInterval(refreshInterval)
  }, [state.session, signOut, updateAuthState])

  // Context value
  const value: AuthContextType = {
    user: state.user,
    session: state.session,
    loading: state.loading,
    initialized: state.initialized,
    signUp,
    signIn,
    signOut,
    updateProfile
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Context 사용을 위한 커스텀 훅
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}

// 인증 상태 확인 헬퍼 함수들
export function useAuthStatus(): AuthStatus {
  const { user, loading, initialized } = useAuth()

  if (!initialized || loading) {
    return AuthStatus.LOADING
  }

  return user ? AuthStatus.AUTHENTICATED : AuthStatus.UNAUTHENTICATED
}

// 사용자 정보 확인 헬퍼
export function useUser(): User | null {
  const { user } = useAuth()
  return user
}

// 세션 정보 확인 헬퍼
export function useSession(): Session | null {
  const { session } = useAuth()
  return session
}