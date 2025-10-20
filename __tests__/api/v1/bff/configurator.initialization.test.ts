/**
 * @jest-environment node
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { makeNextRequest } = require('../../../helpers/next-request')

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
const getCachedData = jest.fn(() => null)
const setCachedData = jest.fn()
jest.mock('@/lib/api/cache', () => ({
  getCachedData: (...args: any[]) => getCachedData(...args),
  setCachedData: (...args: any[]) => setCachedData(...args),
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

import { ConfiguratorInitResponseSchema } from '@/lib/validators/bff-configurator'

describe('BFF Configurator initialization (2.4A.3)', () => {
  let GET: any

  beforeAll(() => {
    const mod = require('@/app/api/v1/bff/configurator/route')
    GET = mod.GET
  })

  it('returns required keys with schema compliance', async () => {
    const req = makeNextRequest('http://localhost:3000/api/v1/bff/configurator?include_materials=true')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)

    const data = body.data
    // 필수 키 존재
    expect(data).toHaveProperty('materials')
    expect(data).toHaveProperty('rules')
    expect(data).toHaveProperty('constraints')

    // Zod 스키마 검증
    const parsed = ConfiguratorInitResponseSchema.safeParse({
      materials: data.materials,
      rules: data.rules,
      constraints: data.constraints,
    })
    expect(parsed.success).toBe(true)

    // 캐시 미스 후 리빌드 로그가 호출되도록 setCachedData가 수행됨
    expect(setCachedData).toHaveBeenCalled()
  })
})
