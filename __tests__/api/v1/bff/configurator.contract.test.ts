/**
 * @jest-environment node
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { makeNextRequest } = require('../../../helpers/next-request')

// Auth as logged-in user to trigger all queries
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

// Capture Supabase table query order
const queryOrder: string[] = []
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: (table: string) => ({
      select: jest.fn(async () => {
        queryOrder.push(table)
        switch (table) {
          case 'materials':
            return { data: [{ id: 'wood', name: 'Wood', is_active: true }], error: null }
          case 'pricing_rules':
            return { data: [{ material_type: 'wood', base_price_per_m3: 1, price_modifier: 1, legacy_material: false }], error: null }
          case 'saved_designs':
            return { data: [{ id: 'd1', name: 'Desk 1', created_at: new Date().toISOString(), options: { width_cm: 120, depth_cm: 60, height_cm: 75, material: 'wood', color: 'oak' }, estimated_price: 100000 }], error: null }
          case 'user_profiles':
            return { data: [{ id: 'user-1', subscription_tier: 'free', design_quota_used: 1, design_quota_limit: 5, ui_preferences: { theme: 'light', units: 'cm', currency: 'KRW' } }], error: null }
          default:
            return { data: [], error: null }
        }
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

describe('BFF Configurator contract and query ordering (3.3A.1)', () => {
  let GET: any

  beforeAll(() => {
    const mod = require('@/app/api/v1/bff/configurator/route')
    GET = mod.GET
  })

  beforeEach(() => {
    queryOrder.length = 0
  })

  it('ensures contract keys and query ordering', async () => {
    const req = makeNextRequest('http://localhost:3000/api/v1/bff/configurator')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)

    const data = body.data
    // Contract keys (camelCase)
    expect(data).toHaveProperty('materials')
    expect(data).toHaveProperty('pricingRules')
    expect(data).toHaveProperty('savedDesigns')
    expect(data).toHaveProperty('preferences')
    expect(data).toHaveProperty('quotaStatus')

    // Query order: materials -> pricing_rules -> saved_designs -> user_profiles
    const expected = ['materials', 'pricing_rules', 'saved_designs', 'user_profiles']
    const observed = Array.isArray((data as any).__order) ? (data as any).__order : []
    expect(observed).toEqual(expected)
  })
})
