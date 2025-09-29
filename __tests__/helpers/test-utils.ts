// 테스트 유틸리티 함수들
import { NextRequest } from 'next/server'
import type { AuthenticatedContext } from '@/types/api'
import type { User, Session } from '@/types/auth'

// 모의 JWT 토큰 생성
export function createMockJWTToken(payload: any = {}): string {
  const header = { typ: 'JWT', alg: 'HS256' }
  const defaultPayload = {
    sub: 'test-user-id',
    email: 'test@example.com',
    iat: Date.now() / 1000,
    exp: (Date.now() / 1000) + 3600,
    ...payload,
  }

  const encodedHeader = btoa(JSON.stringify(header))
  const encodedPayload = btoa(JSON.stringify(defaultPayload))
  const signature = 'test-signature'

  return `${encodedHeader}.${encodedPayload}.${signature}`
}

// 모의 사용자 생성
export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    email_confirmed_at: '2024-01-01T00:00:00Z',
    last_sign_in_at: '2024-01-01T00:00:00Z',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    ...overrides,
  } as User
}

// 모의 세션 생성
export function createMockSession(overrides: Partial<Session> = {}): Session {
  return {
    access_token: createMockJWTToken(),
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: createMockUser(),
    ...overrides,
  } as Session
}

// 모의 인증 컨텍스트 생성
export function createMockAuthContext(overrides: Partial<AuthenticatedContext> = {}): AuthenticatedContext {
  return {
    user: createMockUser(),
    session: createMockSession(),
    requestId: 'test-request-id',
    ...overrides,
  }
}

// 모의 NextRequest 생성
export function createMockRequest(options: {
  method?: string
  url?: string
  headers?: Record<string, string>
  body?: any
  cookies?: Record<string, string>
} = {}): NextRequest {
  const {
    method = 'GET',
    url = 'http://localhost:3000/api/test',
    headers = {},
    body = null,
    cookies = {},
  } = options

  const request = new NextRequest(url, {
    method,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  // 쿠키 모의
  Object.entries(cookies).forEach(([name, value]) => {
    jest.spyOn(request.cookies, 'get').mockImplementation((cookieName) => {
      if (cookieName === name) {
        return { name, value } as any
      }
      return undefined
    })
  })

  return request
}

// 인증된 요청 생성
export function createAuthenticatedRequest(options: {
  method?: string
  url?: string
  headers?: Record<string, string>
  body?: any
  token?: string
} = {}): NextRequest {
  const {
    token = createMockJWTToken(),
    headers = {},
    ...rest
  } = options

  return createMockRequest({
    headers: {
      authorization: `Bearer ${token}`,
      ...headers,
    },
    ...rest,
  })
}

// CSRF 토큰이 포함된 요청 생성
export function createCSRFProtectedRequest(options: {
  method?: string
  url?: string
  headers?: Record<string, string>
  body?: any
  csrfToken?: string
} = {}): NextRequest {
  const {
    csrfToken = 'test-csrf-token',
    headers = {},
    ...rest
  } = options

  return createMockRequest({
    headers: {
      'x-csrf-token': csrfToken,
      ...headers,
    },
    ...rest,
  })
}

// API 응답 검증 헬퍼
export function expectApiResponse(response: any, expectedStatus: number = 200) {
  expect(response.status).toBe(expectedStatus)

  if (response.status < 400) {
    expect(response.body).toHaveProperty('success', true)
    expect(response.body).toHaveProperty('timestamp')
  } else {
    expect(response.body).toHaveProperty('success', false)
    expect(response.body).toHaveProperty('error')
    expect(response.body.error).toHaveProperty('code')
    expect(response.body.error).toHaveProperty('message')
  }
}

// 페이지네이션 응답 검증
export function expectPaginatedResponse(response: any, expectedItemCount?: number) {
  expectApiResponse(response)

  expect(response.body.data).toHaveProperty('pagination')
  expect(response.body.data.pagination).toHaveProperty('page')
  expect(response.body.data.pagination).toHaveProperty('limit')
  expect(response.body.data.pagination).toHaveProperty('total')
  expect(response.body.data.pagination).toHaveProperty('totalPages')
  expect(response.body.data.pagination).toHaveProperty('hasNext')
  expect(response.body.data.pagination).toHaveProperty('hasPrev')

  if (expectedItemCount !== undefined) {
    expect(response.body.data.items).toHaveLength(expectedItemCount)
  }
}

// Rate Limit 헤더 검증
export function expectRateLimitHeaders(response: any) {
  expect(response.headers).toHaveProperty('x-ratelimit-limit')
  expect(response.headers).toHaveProperty('x-ratelimit-remaining')
  expect(response.headers).toHaveProperty('x-ratelimit-reset')
}

// Supabase 모의
export function mockSupabase() {
  const mockSelect = jest.fn().mockReturnThis()
  const mockFrom = jest.fn().mockReturnThis()
  const mockEq = jest.fn().mockReturnThis()
  const mockSingle = jest.fn()
  const mockInsert = jest.fn().mockReturnThis()
  const mockUpdate = jest.fn().mockReturnThis()
  const mockDelete = jest.fn().mockReturnThis()

  const mockSupabaseClient = {
    from: mockFrom,
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      refreshSession: jest.fn(),
    },
    storage: {
      listBuckets: jest.fn(),
      from: jest.fn(),
    },
    rpc: jest.fn(),
  }

  // 체이닝 메서드 설정
  mockFrom.mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  })

  mockSelect.mockReturnValue({
    eq: mockEq,
    limit: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: mockSingle,
  })

  mockInsert.mockReturnValue({
    select: mockSelect,
    single: mockSingle,
  })

  mockUpdate.mockReturnValue({
    eq: mockEq,
    select: mockSelect,
    single: mockSingle,
  })

  mockDelete.mockReturnValue({
    eq: mockEq,
  })

  mockEq.mockReturnValue({
    single: mockSingle,
    select: mockSelect,
  })

  return {
    mockSupabaseClient,
    mockFrom,
    mockSelect,
    mockEq,
    mockSingle,
    mockInsert,
    mockUpdate,
    mockDelete,
  }
}

// 테스트 데이터 생성 헬퍼
export const testData = {
  design: {
    id: 'design-123',
    name: 'Test Design',
    description: 'A test design',
    user_id: 'test-user-id',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    status: 'completed',
    width_cm: 120,
    depth_cm: 60,
    height_cm: 75,
    material: 'wood',
    color: '#8B4513',
    finish: 'matte',
    tags: ['modern', 'minimalist'],
    is_public: false,
    estimated_price: 250000,
    thumbnail_url: 'https://example.com/thumb.jpg',
    likes_count: 5,
    views_count: 100,
  },

  priceCalculation: {
    dimensions: {
      width_cm: 120,
      depth_cm: 60,
      height_cm: 75,
    },
    material: 'wood' as const,
    finish: 'matte' as const,
    quantity: 1,
    discount_code: 'WELCOME10',
    rush_order: false,
  },

  userProfile: {
    user_id: 'test-user-id',
    email: 'test@example.com',
    display_name: 'Test User',
    subscription_tier: 'free' as const,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    design_quota_used: 2,
    design_quota_limit: 5,
    ui_preferences: {
      theme: 'light' as const,
      units: 'cm' as const,
      currency: 'KRW' as const,
    },
  },
}

// 비동기 테스트 헬퍼
export async function waitFor(condition: () => boolean, timeout: number = 5000): Promise<void> {
  const startTime = Date.now()

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error(`Timeout waiting for condition after ${timeout}ms`)
    }
    await new Promise(resolve => setTimeout(resolve, 10))
  }
}