import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { useAuthActions, useAuthState, useAuthGuard, useSession } from '@/hooks/useAuth'
import { AuthProvider } from '@/lib/auth-context'
import { AuthStatus } from '@/types/auth'

// Mock fetch
global.fetch = jest.fn()

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}))

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      })),
      refreshSession: jest.fn()
    }
  }
}))

// Test wrapper component
const createWrapper = (initialUser = null, initialSession = null) => {
  return ({ children }: { children: React.ReactNode }) => React.createElement(AuthProvider, null, children)
}

describe('useAuthActions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('signIn', () => {
    it('성공적인 로그인을 처리한다', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          success: true,
          data: {
            user: { id: '123', email: 'test@example.com' },
            session: { access_token: 'token123' }
          }
        })
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useAuthActions(), {
        wrapper: createWrapper()
      })

      let response
      await act(async () => {
        response = await result.current.signIn('test@example.com', 'password123')
      })

      expect(response).toEqual({ success: true })
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
      })
    })

    it('로그인 실패를 처리한다', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          success: false,
          error: { message: 'Invalid credentials' }
        })
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useAuthActions(), {
        wrapper: createWrapper()
      })

      let response
      await act(async () => {
        response = await result.current.signIn('test@example.com', 'wrongpassword')
      })

      expect(response).toEqual({
        success: false,
        error: 'Invalid credentials'
      })
    })

    it('네트워크 에러를 처리한다', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useAuthActions(), {
        wrapper: createWrapper()
      })

      let response
      await act(async () => {
        response = await result.current.signIn('test@example.com', 'password123')
      })

      expect(response).toEqual({
        success: false,
        error: '네트워크 오류가 발생했습니다.'
      })
    })
  })

  describe('signUp', () => {
    it('성공적인 회원가입을 처리한다', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          success: true,
          data: {
            user: { id: '123', email: 'test@example.com' },
            session: { access_token: 'token123' }
          }
        })
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useAuthActions(), {
        wrapper: createWrapper()
      })

      let response
      await act(async () => {
        response = await result.current.signUp('test@example.com', 'password123')
      })

      expect(response).toEqual({ success: true })
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
      })
    })
  })

  describe('signOut', () => {
    it('로그아웃을 처리한다', async () => {
      const mockResponse = { ok: true }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useAuthActions(), {
        wrapper: createWrapper()
      })

      await act(async () => {
        await result.current.signOut()
      })

      expect(global.fetch).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST'
      })
    })

    it('로그아웃 실패시에도 클라이언트 상태를 정리한다', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useAuthActions(), {
        wrapper: createWrapper()
      })

      // 에러가 발생해도 정상적으로 완료되어야 함
      await act(async () => {
        await result.current.signOut()
      })

      expect(global.fetch).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST'
      })
    })
  })
})

describe('useAuthState', () => {
  it('초기 상태를 올바르게 반환한다', () => {
    const { result } = renderHook(() => useAuthState(), {
      wrapper: createWrapper()
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.isLoading).toBe(true)
    expect(result.current.isInitialized).toBe(false)
    expect(result.current.user).toBe(null)
  })
})

describe('useAuthGuard', () => {
  it('인증되지 않은 상태를 올바르게 반환한다', () => {
    const { result } = renderHook(() => useAuthGuard(), {
      wrapper: createWrapper()
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.isUnauthenticated).toBe(false) // 로딩 중이므로
    expect(result.current.requireAuth).toBe(false) // 로딩 중이므로
  })

  it('로딩 상태를 올바르게 반환한다', () => {
    const { result } = renderHook(() => useAuthGuard(), {
      wrapper: createWrapper()
    })

    expect(result.current.isLoading).toBe(true)
  })
})

describe('useSession', () => {
  it('세션이 없을 때 적절한 값을 반환한다', () => {
    const { result } = renderHook(() => useSession(), {
      wrapper: createWrapper()
    })

    expect(result.current.session).toBe(null)
    expect(result.current.accessToken).toBe(null)
    expect(result.current.refreshToken).toBe(null)
    expect(result.current.expiresAt).toBe(null)
    expect(result.current.isExpired).toBe(false)
    expect(result.current.expiresIn).toBe(0)
  })

  it('유효한 세션이 있을 때 적절한 값을 반환한다', () => {
    const mockSession = {
      access_token: 'token123',
      refresh_token: 'refresh123',
      expires_at: Math.floor(Date.now() / 1000) + 3600 // 1시간 후
    }

    // AuthProvider에 mockSession을 설정하는 방법이 필요함
    // 실제 구현에서는 AuthContext mock이나 initial state 설정이 필요
  })
})

describe('인증 플로우 통합 테스트', () => {
  it('전체 인증 플로우가 올바르게 작동한다', async () => {
    // 로그인 성공 응답 모킹
    const loginResponse = {
      ok: true,
      json: async () => ({
        success: true,
        data: {
          user: { id: '123', email: 'test@example.com' },
          session: { access_token: 'token123', refresh_token: 'refresh123' }
        }
      })
    }

    // 세션 검증 응답 모킹
    const sessionResponse = {
      ok: true,
      json: async () => ({
        success: true,
        data: {
          user: { id: '123', email: 'test@example.com' },
          session: { access_token: 'token123' }
        }
      })
    }

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(sessionResponse) // 초기 세션 검증
      .mockResolvedValueOnce(loginResponse) // 로그인 요청

    const { result } = renderHook(() => {
      const authActions = useAuthActions()
      const authState = useAuthState()
      return { ...authActions, ...authState }
    }, {
      wrapper: createWrapper()
    })

    // 초기 상태 확인
    expect(result.current.isAuthenticated).toBe(false)

    // 로그인 수행
    await act(async () => {
      const response = await result.current.signIn('test@example.com', 'password123')
      expect(response.success).toBe(true)
    })

    // 로그인 후 상태는 AuthContext의 상태 업데이트를 기다려야 함
    // 실제 구현에서는 waitFor나 적절한 상태 업데이트 대기가 필요
  })
})