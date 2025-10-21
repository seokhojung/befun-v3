// @ts-nocheck
/**
 * @jest-environment node
 */

// 테스트 전용 NextRequest 어댑터는 require로 로드 (경로 해석 호환)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { makeNextRequest } = require('../../../helpers/next-request')

// Mocks
jest.mock('@/lib/api/auth', () => ({
  authenticateRequest: jest.fn(async () => ({ user: { id: 'user-1', email: 'u@test.com' } }))
}))

jest.mock('@/lib/api/rate-limiter', () => ({
  checkBffRateLimit: jest.fn(() => ({ allowed: true })),
  getRateLimitHeaders: jest.fn(() => ({})),
}))

jest.mock('@/lib/api/version', () => ({
  processApiVersion: jest.fn(() => ({ version: '1.0' }))
}))

jest.mock('@/lib/api/logger', () => ({
  RequestTimer: class { complete(_: number) {} },
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

// Cache utils mocked shape used by route
jest.mock('@/lib/api/cache', () => ({
  getCachedData: jest.fn(() => null),
  setCachedData: jest.fn(),
}))

// Supabase client mock to return materials including inactive/disabled
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: (table: string) => ({
      select: jest.fn(async () => {
        if (table === 'materials') {
          return {
            data: [
              { id: 'wood', name: 'Wood', is_active: true },
              { id: 'disabled', name: 'Hidden', is_active: true },
              { id: 'glass', name: 'Glass', is_active: false },
              { id: 'metal', name: 'Metal', is_active: true },
            ],
            error: null,
          }
        }
        return { data: [], error: null }
      }),
    })
  }))
}))

// errors helpers to plain Response
jest.mock('@/lib/api/errors', () => ({
  createSuccessResponse: jest.fn((data: any) => ({
    status: 200,
    headers: new Map<string, string>(),
    async json() { return { success: true, data } },
  })),
  createErrorResponse: jest.fn((error: any) => ({
    status: 500,
    headers: new Map<string, string>(),
    async json() { return { success: false, error: String(error?.message || error) } },
  })),
  withErrorHandling: jest.fn((handler: any) => async (request: any, context?: any) => handler(request, context)),
  AuthenticationError: class extends Error { constructor(message?: string) { super(message); this.name = 'AuthenticationError' } },
}))

describe('BFF Configurator materials filtering', () => {
  let GET: any

  beforeAll(() => {
    const mod = require('@/app/api/v1/bff/configurator/route')
    GET = mod.GET
  })

  it('excludes inactive and id=="disabled" materials', async () => {
    const req = makeNextRequest('http://localhost:3000/api/v1/bff/configurator')
    const res = await GET(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    const materials = data.data.materials
    const ids = materials.map((m: any) => m.id)
    expect(ids).toContain('wood')
    expect(ids).toContain('metal')
    expect(ids).not.toContain('glass')
    expect(ids).not.toContain('disabled')
  })
})

export {}
