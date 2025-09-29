// 인증 라이브러리 테스트
import { validateAuth, checkPermissions, canAccessResource } from '@/lib/api/auth'
import { createMockRequest, createAuthenticatedRequest, createMockUser, createMockSession } from '../../helpers/test-utils'
import { createClient } from '@supabase/supabase-js'
import { ApiError } from '@/lib/api/errors'

// Supabase 모의
jest.mock('@supabase/supabase-js')
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

// JWT 디코딩 모의
const mockDecodeJWT = jest.fn()
jest.mock('jsonwebtoken', () => ({
  verify: mockDecodeJWT,
}))

describe('Auth Library', () => {
  const mockSupabaseClient = {
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
    },
  }

  beforeEach(() => {
    mockCreateClient.mockReturnValue(mockSupabaseClient as any)
    jest.clearAllMocks()
  })

  describe('validateAuth', () => {
    it('유효한 JWT 토큰으로 사용자 인증을 성공해야 함', async () => {
      const mockUser = createMockUser()
      const mockSession = createMockSession()

      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      })

      const request = createAuthenticatedRequest()
      const result = await validateAuth(request)

      expect(result).toBeDefined()
      expect(result.user).toEqual(mockUser)
      expect(result.session).toEqual(mockSession)
      expect(result.requestId).toBeDefined()
    })

    it('Authorization 헤더가 없는 경우 오류를 발생시켜야 함', async () => {
      const request = createMockRequest()

      await expect(validateAuth(request)).rejects.toThrow(ApiError)
      await expect(validateAuth(request)).rejects.toThrow('Missing authorization header')
    })

    it('잘못된 토큰 형식인 경우 오류를 발생시켜야 함', async () => {
      const request = createMockRequest({
        headers: { authorization: 'InvalidToken' }, // Bearer 누락
      })

      await expect(validateAuth(request)).rejects.toThrow(ApiError)
      await expect(validateAuth(request)).rejects.toThrow('Invalid token format')
    })

    it('만료된 토큰인 경우 오류를 발생시켜야 함', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'JWT expired' },
      })

      const request = createAuthenticatedRequest()

      await expect(validateAuth(request)).rejects.toThrow(ApiError)
      await expect(validateAuth(request)).rejects.toThrow('Invalid or expired token')
    })

    it('Supabase 인증 오류를 적절히 처리해야 함', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Authentication failed' },
      })

      const request = createAuthenticatedRequest()

      await expect(validateAuth(request)).rejects.toThrow(ApiError)
    })

    it('사용자 정보가 없는 경우 오류를 발생시켜야 함', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      })

      const request = createAuthenticatedRequest()

      await expect(validateAuth(request)).rejects.toThrow(ApiError)
      await expect(validateAuth(request)).rejects.toThrow('User not found')
    })

    it('요청 ID를 올바르게 생성해야 함', async () => {
      const mockUser = createMockUser()
      const mockSession = createMockSession()

      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      })

      const request = createAuthenticatedRequest()
      const result = await validateAuth(request)

      expect(result.requestId).toMatch(/^req_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/)
    })
  })

  describe('checkPermissions', () => {
    const mockUser = createMockUser({
      app_metadata: {
        role: 'user',
        permissions: ['read:designs', 'write:own_designs'],
      },
    })

    it('사용자가 필요한 권한을 가지고 있는 경우 true를 반환해야 함', () => {
      const result = checkPermissions(mockUser, ['read:designs'])
      expect(result).toBe(true)
    })

    it('사용자가 여러 권한을 모두 가지고 있는 경우 true를 반환해야 함', () => {
      const result = checkPermissions(mockUser, ['read:designs', 'write:own_designs'])
      expect(result).toBe(true)
    })

    it('사용자가 필요한 권한을 가지고 있지 않은 경우 false를 반환해야 함', () => {
      const result = checkPermissions(mockUser, ['admin:all'])
      expect(result).toBe(false)
    })

    it('관리자 역할을 가진 사용자는 모든 권한을 가져야 함', () => {
      const adminUser = createMockUser({
        app_metadata: {
          role: 'admin',
          permissions: [],
        },
      })

      const result = checkPermissions(adminUser, ['admin:all', 'read:designs', 'write:designs'])
      expect(result).toBe(true)
    })

    it('권한 배열이 비어있는 경우 true를 반환해야 함', () => {
      const result = checkPermissions(mockUser, [])
      expect(result).toBe(true)
    })

    it('사용자 메타데이터가 없는 경우 false를 반환해야 함', () => {
      const userWithoutMeta = createMockUser({
        app_metadata: {},
      })

      const result = checkPermissions(userWithoutMeta, ['read:designs'])
      expect(result).toBe(false)
    })

    it('사용자 권한이 정의되지 않은 경우 false를 반환해야 함', () => {
      const userWithoutPermissions = createMockUser({
        app_metadata: {
          role: 'user',
        },
      })

      const result = checkPermissions(userWithoutPermissions, ['read:designs'])
      expect(result).toBe(false)
    })
  })

  describe('canAccessResource', () => {
    const mockUser = createMockUser({ id: 'user-123' })
    const mockResource = {
      id: 'resource-1',
      user_id: 'user-123',
      is_public: false,
    }

    it('자신이 소유한 리소스에 접근할 수 있어야 함', () => {
      const result = canAccessResource(mockUser, mockResource)
      expect(result).toBe(true)
    })

    it('공개 리소스에 접근할 수 있어야 함', () => {
      const publicResource = {
        ...mockResource,
        user_id: 'other-user',
        is_public: true,
      }

      const result = canAccessResource(mockUser, publicResource)
      expect(result).toBe(true)
    })

    it('다른 사용자의 비공개 리소스에 접근할 수 없어야 함', () => {
      const privateResource = {
        ...mockResource,
        user_id: 'other-user',
        is_public: false,
      }

      const result = canAccessResource(mockUser, privateResource)
      expect(result).toBe(false)
    })

    it('관리자는 모든 리소스에 접근할 수 있어야 함', () => {
      const adminUser = createMockUser({
        id: 'admin-user',
        app_metadata: { role: 'admin' },
      })

      const privateResource = {
        ...mockResource,
        user_id: 'other-user',
        is_public: false,
      }

      const result = canAccessResource(adminUser, privateResource)
      expect(result).toBe(true)
    })

    it('중재자는 모든 공개 리소스와 신고된 리소스에 접근할 수 있어야 함', () => {
      const moderatorUser = createMockUser({
        id: 'moderator-user',
        app_metadata: { role: 'moderator' },
      })

      const reportedResource = {
        ...mockResource,
        user_id: 'other-user',
        is_public: false,
        is_reported: true,
      }

      const result = canAccessResource(moderatorUser, reportedResource)
      expect(result).toBe(true)
    })

    it('공유된 리소스에 접근할 수 있어야 함', () => {
      const sharedResource = {
        ...mockResource,
        user_id: 'other-user',
        is_public: false,
        shared_with: ['user-123', 'another-user'],
      }

      const result = canAccessResource(mockUser, sharedResource)
      expect(result).toBe(true)
    })

    it('collaborator로 추가된 리소스에 접근할 수 있어야 함', () => {
      const collaborativeResource = {
        ...mockResource,
        user_id: 'other-user',
        is_public: false,
        collaborators: [
          { user_id: 'user-123', role: 'editor' },
          { user_id: 'another-user', role: 'viewer' },
        ],
      }

      const result = canAccessResource(mockUser, collaborativeResource)
      expect(result).toBe(true)
    })

    it('리소스에 user_id가 없는 경우 false를 반환해야 함', () => {
      const resourceWithoutOwner = {
        id: 'resource-1',
        is_public: false,
      }

      const result = canAccessResource(mockUser, resourceWithoutOwner)
      expect(result).toBe(false)
    })

    it('사용자 ID가 없는 경우 공개 리소스에만 접근할 수 있어야 함', () => {
      const userWithoutId = createMockUser({ id: '' })

      const publicResource = {
        ...mockResource,
        is_public: true,
      }

      const privateResource = {
        ...mockResource,
        is_public: false,
      }

      expect(canAccessResource(userWithoutId, publicResource)).toBe(true)
      expect(canAccessResource(userWithoutId, privateResource)).toBe(false)
    })
  })

  describe('Edge Cases and Security', () => {
    it('JWT 토큰 조작 시도를 감지해야 함', async () => {
      const maliciousToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6OTk5OTk5OTk5OX0.fake-signature'

      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid signature' },
      })

      const request = createMockRequest({
        headers: { authorization: `Bearer ${maliciousToken}` },
      })

      await expect(validateAuth(request)).rejects.toThrow(ApiError)
    })

    it('SQL 인젝션 시도를 방어해야 함', async () => {
      const sqlInjectionUser = createMockUser({
        id: "'; DROP TABLE users; --",
      })

      const resource = {
        id: 'resource-1',
        user_id: 'normal-user',
        is_public: false,
      }

      const result = canAccessResource(sqlInjectionUser, resource)
      expect(result).toBe(false)
    })

    it('권한 상승 시도를 방어해야 함', () => {
      const maliciousUser = createMockUser({
        app_metadata: {
          role: 'user',
          permissions: ['read:designs'],
        },
      })

      // 관리자 권한이 필요한 작업 시도
      const result = checkPermissions(maliciousUser, ['admin:delete_any'])
      expect(result).toBe(false)
    })

    it('매우 긴 토큰을 안전하게 처리해야 함', async () => {
      const veryLongToken = 'Bearer ' + 'a'.repeat(10000)

      const request = createMockRequest({
        headers: { authorization: veryLongToken },
      })

      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Token too long' },
      })

      await expect(validateAuth(request)).rejects.toThrow(ApiError)
    })

    it('특수 문자가 포함된 사용자 데이터를 안전하게 처리해야 함', () => {
      const userWithSpecialChars = createMockUser({
        email: 'test+user@example.com',
        user_metadata: {
          name: "O'Malley & Sons <script>alert('xss')</script>",
        },
      })

      const resource = {
        id: 'resource-1',
        user_id: userWithSpecialChars.id,
        is_public: false,
      }

      const result = canAccessResource(userWithSpecialChars, resource)
      expect(result).toBe(true)
    })
  })
})