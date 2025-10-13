/**
 * @jest-environment node
 */

import { createMocks } from 'node-mocks-http'
import { NextResponse } from 'next/server'
let GET: any, POST: any
// 테스트 전용 NextRequest 어댑터
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { makeNextRequest } = require('../../../helpers/next-request')
// 모든 요청 생성을 NextRequest 어댑터를 통해 수행

// PricingAPI 모킹
jest.mock('@/lib/pricing', () => ({
  PricingAPI: {
    calculatePrice: jest.fn(),
    calculatePriceEstimate: jest.fn(),
    policies: {
      getAll: jest.fn()
    }
  },
  PriceCalculationError: class extends Error {
    constructor(message: string, public code: string, public details?: any) {
      super(message)
      this.name = 'PriceCalculationError'
    }
  }
}))

// API 의존성 모킹
jest.mock('@/lib/api/errors', () => ({
  createSuccessResponse: jest.fn((data, requestId, status = 200) =>
    new Response(JSON.stringify({ success: true, data, requestId }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    })
  ),
  createErrorResponse: jest.fn((error, requestId) => {
    const code = (error && (error.code || error?.error?.code)) || ''
    const status = code === 'BAD_REQUEST' ? 400 : 500
    const message = (error && (error.message || error?.error?.message)) || String(error)
    return new Response(JSON.stringify({ success: false, error: message, requestId }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    })
  }),
  withErrorHandling: jest.fn((handler) => async (request: any, context?: any) => {
    try {
      const res = await handler(request, context)
      if (!res) {
        return new Response(JSON.stringify({ success: false, error: 'Handler returned undefined' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      return res
    } catch (e: any) {
      return new Response(JSON.stringify({ success: false, error: e?.message || String(e) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  })
}))

jest.mock('@/lib/api/validation', () => ({
  validateRequestBody: jest.fn((body, schema, requestId) => {
    // 기본적인 검증 로직
    if (!body.width_cm || !body.depth_cm || !body.height_cm || !body.material) {
      throw new Error('Required fields missing')
    }
    if (body.width_cm <= 0 || body.depth_cm <= 0 || body.height_cm <= 0) {
      throw new Error('Dimensions must be positive')
    }
    return body
  })
}))

jest.mock('@/lib/api/rate-limiter', () => ({
  checkApiRateLimit: jest.fn(() => ({ allowed: true })),
  getRateLimitHeaders: jest.fn(() => ({}))
}))

jest.mock('@/lib/api/version', () => ({
  processApiVersion: jest.fn(() => ({ version: '1.0' }))
}))

jest.mock('@/lib/api/logger', () => ({
  RequestTimer: class {
    complete(status: number) {}
  },
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}))

import { PricingAPI, PriceCalculationError } from '@/lib/pricing'

const mockPricingAPI = PricingAPI as jest.Mocked<typeof PricingAPI>

// 모듈 모킹이 설정된 이후 라우트를 로드해야 핸들러가 모킹과 일치합니다.
beforeAll(() => {
  // 테스트별 환경 변수 재설정(기화 부작용 차단)
  process.env.NODE_ENV = 'test'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
  const mod = require('@/app/api/v1/pricing/calculate/route')
  GET = mod.GET
  POST = mod.POST
})

describe('/api/v1/pricing/calculate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST - Batch price calculation', () => {
    it('should calculate multiple prices', async () => {
      // Mock calculatePrice to return different totals per call
      ;(mockPricingAPI.calculatePrice as any)
        .mockResolvedValueOnce({ total: 1000, volume_m3: 0.1, material_info: { type: 'wood', modifier: 1.0 }, calculated_at: new Date().toISOString() })
        .mockResolvedValueOnce({ total: 2000, volume_m3: 0.2, material_info: { type: 'metal', modifier: 1.5 }, calculated_at: new Date().toISOString() })

      const request = makeNextRequest('http://localhost:3000/api/v1/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calculations: [
            { width_cm: 120, depth_cm: 60, height_cm: 75, material: 'wood', use_cache: true },
            { width_cm: 100, depth_cm: 50, height_cm: 70, material: 'metal', use_cache: true },
          ],
          use_cache: true,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.calculations).toHaveLength(2)
    })

    it('should calculate a 6-item batch and preserve order', async () => {
      ;(mockPricingAPI.calculatePrice as any)
        .mockResolvedValueOnce({ total: 1100, volume_m3: 0.11, material_info: { type: 'wood', modifier: 1.0 }, calculated_at: new Date().toISOString() })
        .mockResolvedValueOnce({ total: 1200, volume_m3: 0.12, material_info: { type: 'mdf', modifier: 1.1 }, calculated_at: new Date().toISOString() })
        .mockResolvedValueOnce({ total: 1300, volume_m3: 0.13, material_info: { type: 'steel', modifier: 1.2 }, calculated_at: new Date().toISOString() })
        .mockResolvedValueOnce({ total: 1400, volume_m3: 0.14, material_info: { type: 'metal', modifier: 1.3 }, calculated_at: new Date().toISOString() })
        .mockResolvedValueOnce({ total: 1500, volume_m3: 0.15, material_info: { type: 'glass', modifier: 1.1 }, calculated_at: new Date().toISOString() })
        .mockResolvedValueOnce({ total: 1600, volume_m3: 0.16, material_info: { type: 'fabric', modifier: 0.9 }, calculated_at: new Date().toISOString() })

      const request = makeNextRequest('http://localhost:3000/api/v1/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calculations: [
            { width_cm: 120, depth_cm: 60, height_cm: 75, material: 'wood', use_cache: true },
            { width_cm: 121, depth_cm: 61, height_cm: 76, material: 'mdf', use_cache: true },
            { width_cm: 122, depth_cm: 62, height_cm: 77, material: 'steel', use_cache: true },
            { width_cm: 123, depth_cm: 63, height_cm: 78, material: 'metal', use_cache: true },
            { width_cm: 124, depth_cm: 64, height_cm: 79, material: 'glass', use_cache: true },
            { width_cm: 125, depth_cm: 65, height_cm: 80, material: 'fabric', use_cache: true },
          ],
          use_cache: true,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.calculations).toHaveLength(6)
      // Order and totals check
      expect(data.data.calculations.map((c: any) => c.result.total)).toEqual([
        1100, 1200, 1300, 1400, 1500, 1600,
      ])
      // API was called 6 times with stripped payloads (no use_cache)
      expect(mockPricingAPI.calculatePrice).toHaveBeenCalledTimes(6)
      expect(mockPricingAPI.calculatePrice).toHaveBeenNthCalledWith(1, expect.objectContaining({ material: 'wood' }))
      expect(mockPricingAPI.calculatePrice).toHaveBeenNthCalledWith(2, expect.objectContaining({ material: 'mdf' }))
      expect(mockPricingAPI.calculatePrice).toHaveBeenNthCalledWith(3, expect.objectContaining({ material: 'steel' }))
      expect(mockPricingAPI.calculatePrice).toHaveBeenNthCalledWith(4, expect.objectContaining({ material: 'metal' }))
      expect(mockPricingAPI.calculatePrice).toHaveBeenNthCalledWith(5, expect.objectContaining({ material: 'glass' }))
      expect(mockPricingAPI.calculatePrice).toHaveBeenNthCalledWith(6, expect.objectContaining({ material: 'fabric' }))
    })

    it('should return 400 on invalid batch item', async () => {
      const request = makeNextRequest('http://localhost:3000/api/v1/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calculations: [
            { width_cm: -10, depth_cm: 60, height_cm: 75, material: 'wood' }, // invalid
            { width_cm: 100, depth_cm: 50, height_cm: 70, material: 'metal' },
          ],
          use_cache: true,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should process a 10-item batch under 500ms (reasonable)', async () => {
      // 빠른 resolve를 보장하는 mock
      mockPricingAPI.calculatePrice.mockResolvedValue({
        total: 1000,
        volume_m3: 0.1,
        material_info: { type: 'wood', modifier: 1.0 },
        calculated_at: new Date().toISOString(),
      } as any)

      const calculations = Array.from({ length: 10 }).map((_, i) => ({
        width_cm: 100 + i,
        depth_cm: 50 + i,
        height_cm: 70 + i,
        material: (['wood','mdf','steel','metal','glass','fabric'][i % 6]) as any,
        use_cache: true,
      }))

      const start = Date.now()
      const request = makeNextRequest('http://localhost:3000/api/v1/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calculations, use_cache: true }),
      })
      const response = await POST(request)
      const elapsed = Date.now() - start

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.calculations).toHaveLength(10)
      expect(elapsed).toBeLessThan(500)
    })
  })

  describe('POST - Single price calculation', () => {
    it('should calculate price successfully', async () => {
      // Mock successful calculation
      const mockResult = {
        base_price: 50000,
        material_cost: 27000,
        shipping_cost: 30000,
        subtotal: 107000,
        tax: 10700,
        total: 117700,
        volume_m3: 0.54,
        material_info: {
          type: 'wood',
          modifier: 1.0
        },
        breakdown: {
          volume_m3: 0.54,
          base_cost: 50000,
          material_cost: 27000,
          shipping_cost: 30000,
          subtotal: 107000,
          tax: 10700,
          total: 117700,
          material_info: {
            type: 'wood',
            modifier: 1.0,
            base_price_per_m3: 50000
          }
        },
        calculated_at: new Date().toISOString()
      }

      mockPricingAPI.calculatePrice.mockResolvedValue(mockResult)

      const request = makeNextRequest('http://localhost:3000/api/v1/pricing/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          width_cm: 120,
          depth_cm: 60,
          height_cm: 75,
          material: 'wood'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.result.total).toBe(117700)
      expect(mockPricingAPI.calculatePrice).toHaveBeenCalledWith({
        width_cm: 120,
        depth_cm: 60,
        height_cm: 75,
        material: 'wood'
      })
    })

    it('should handle estimate-only requests', async () => {
      const mockEstimate = {
        total: 115000,
        volume_m3: 0.54,
        material_info: { type: 'wood', modifier: 1.0 },
        calculated_at: new Date().toISOString()
      }

      mockPricingAPI.calculatePriceEstimate.mockReturnValue(mockEstimate as any)

      const request = makeNextRequest('http://localhost:3000/api/v1/pricing/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          width_cm: 120,
          depth_cm: 60,
          height_cm: 75,
          material: 'wood',
          estimate_only: true
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockPricingAPI.calculatePriceEstimate).toHaveBeenCalled()
    })

    it('should handle validation errors', async () => {
      const request = makeNextRequest('http://localhost:3000/api/v1/pricing/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          width_cm: -100,
          depth_cm: 60,
          height_cm: 75,
          material: 'wood'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Dimensions must be positive')
    })

    it('should handle pricing calculation errors', async () => {
      mockPricingAPI.calculatePrice.mockRejectedValue(
        new PriceCalculationError('Material not found', 'MATERIAL_NOT_FOUND')
      )

      const request = makeNextRequest('http://localhost:3000/api/v1/pricing/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          width_cm: 120,
          depth_cm: 60,
          height_cm: 75,
          material: 'invalid_material'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })

    it('should support cache control', async () => {
      const mockResult = {
        total: 117700,
        volume_m3: 0.54,
        material_info: { type: 'wood', modifier: 1.0 },
        calculated_at: new Date().toISOString()
      }

      mockPricingAPI.calculatePrice.mockResolvedValue(mockResult as any)

      const request = makeNextRequest('http://localhost:3000/api/v1/pricing/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          width_cm: 120,
          depth_cm: 60,
          height_cm: 75,
          material: 'wood',
          use_cache: false
        })
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockPricingAPI.calculatePrice).toHaveBeenCalledWith({
        width_cm: 120,
        depth_cm: 60,
        height_cm: 75,
        material: 'wood',
        use_cache: false
      })
    })
  })

  describe('POST - Batch price calculation', () => {
    it('should calculate multiple prices', async () => {
      const mockResults = [
        { total: 117700, material_info: { type: 'wood' } },
        { total: 140000, material_info: { type: 'metal' } }
      ]

      mockPricingAPI.calculatePrice
        .mockResolvedValueOnce(mockResults[0] as any)
        .mockResolvedValueOnce(mockResults[1] as any)

      const request = makeNextRequest('http://localhost:3000/api/v1/pricing/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          calculations: [
            {
              width_cm: 120,
              depth_cm: 60,
              height_cm: 75,
              material: 'wood'
            },
            {
              width_cm: 120,
              depth_cm: 60,
              height_cm: 75,
              material: 'metal'
            }
          ]
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.calculations).toHaveLength(2)
      expect(mockPricingAPI.calculatePrice).toHaveBeenCalledTimes(2)
    })

    it('should reject too many batch requests', async () => {
      const calculations = Array(15).fill({
        width_cm: 100,
        depth_cm: 50,
        height_cm: 70,
        material: 'wood'
      })

      const request = makeNextRequest('http://localhost:3000/api/v1/pricing/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          calculations
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })

  describe('GET - Cache stats and materials', () => {
    it('should return cache statistics', async () => {
      const request = makeNextRequest(
        'http://localhost:3000/api/v1/pricing/calculate?action=cache-stats'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.cache).toBeDefined()
      expect(data.data.timestamp).toBeDefined()
    })

    it('should return materials information', async () => {
      const mockPolicies = [
        {
          material_type: 'wood',
          base_price_per_m3: 50000,
          price_modifier: 1.0,
          legacy_material: true
        },
        {
          material_type: 'metal',
          base_price_per_m3: 50000,
          price_modifier: 1.5,
          legacy_material: false
        }
      ]

      mockPricingAPI.policies.getAll.mockResolvedValue(mockPolicies as any)

      const request = makeNextRequest(
        'http://localhost:3000/api/v1/pricing/calculate?action=materials'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.materials).toHaveLength(2)
      expect(data.data.materials[0].type).toBe('wood')
    })

    it('should return 6 materials with valid fields', async () => {
      const mockPolicies = [
        { material_type: 'wood', base_price_per_m3: 50000, price_modifier: 1.0, legacy_material: true },
        { material_type: 'mdf', base_price_per_m3: 50000, price_modifier: 0.8, legacy_material: true },
        { material_type: 'steel', base_price_per_m3: 50000, price_modifier: 1.15, legacy_material: true },
        { material_type: 'metal', base_price_per_m3: 50000, price_modifier: 1.5, legacy_material: false },
        { material_type: 'glass', base_price_per_m3: 50000, price_modifier: 2.0, legacy_material: false },
        { material_type: 'fabric', base_price_per_m3: 50000, price_modifier: 0.8, legacy_material: false },
      ]
      mockPricingAPI.policies.getAll.mockResolvedValue(mockPolicies as any)

      const request = makeNextRequest('http://localhost:3000/api/v1/pricing/calculate?action=materials')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.data.materials)).toBe(true)
      expect(data.data.materials).toHaveLength(6)
      for (const m of data.data.materials) {
        expect(typeof m.type).toBe('string')
        expect(m.type.length).toBeGreaterThan(0)
        expect(typeof m.base_price_per_m3).toBe('number')
        expect(typeof m.price_modifier).toBe('number')
        expect(typeof m.legacy_material).toBe('boolean')
      }
    })

    it('should return cache-stats with expected schema', async () => {
      const request = makeNextRequest('http://localhost:3000/api/v1/pricing/calculate?action=cache-stats')
      const response = await GET(request)
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(typeof data.data.cache.size).toBe('number')
      expect(typeof data.data.cache.maxSize).toBe('number')
      expect(typeof data.data.cache.ttl).toBe('number')
      expect(typeof data.data.timestamp).toBe('string')
      expect(() => new Date(data.data.timestamp)).not.toThrow()
    })

    it('should handle invalid action parameter', async () => {
      const request = makeNextRequest(
        'http://localhost:3000/api/v1/pricing/calculate?action=invalid'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid action parameter')
    })
  })

  describe('Performance requirements', () => {
    it('should respond within 500ms for single calculation', async () => {
      // 빠른 응답을 위한 mock
      mockPricingAPI.calculatePrice.mockResolvedValue({
        total: 117700,
        volume_m3: 0.54,
        material_info: { type: 'wood', modifier: 1.0 },
        calculated_at: new Date().toISOString()
      } as any)

      const startTime = Date.now()

      const request = makeNextRequest('http://localhost:3000/api/v1/pricing/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          width_cm: 120,
          depth_cm: 60,
          height_cm: 75,
          material: 'wood'
        })
      })

      const response = await POST(request)
      const endTime = Date.now()

      const responseTime = endTime - startTime

      expect(response.status).toBe(200)
      expect(responseTime).toBeLessThan(500) // 500ms 이내 응답
    })

    it('should handle concurrent requests efficiently', async () => {
      mockPricingAPI.calculatePrice.mockResolvedValue({
        total: 117700,
        volume_m3: 0.54,
        material_info: { type: 'wood', modifier: 1.0 },
        calculated_at: new Date().toISOString()
      } as any)

      const requests = Array(5).fill(null).map(() =>
        makeNextRequest('http://localhost:3000/api/v1/pricing/calculate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            width_cm: 120,
            depth_cm: 60,
            height_cm: 75,
            material: 'wood'
          })
        })
      )

      const startTime = Date.now()
      const responses = await Promise.all(requests.map(req => POST(req)))
      const endTime = Date.now()

      responses.forEach(response => {
        expect(response.status).toBe(200)
      })

      // 동시 요청 처리 시간이 합리적인지 확인
      expect(endTime - startTime).toBeLessThan(2000)
    })
  })

  describe('Error scenarios', () => {
    it('should handle malformed JSON', async () => {
      const request = makeNextRequest('http://localhost:3000/api/v1/pricing/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: 'invalid json'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })

    it('should handle missing request body', async () => {
      const request = makeNextRequest('http://localhost:3000/api/v1/pricing/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })

    it('should handle database connection errors', async () => {
      mockPricingAPI.calculatePrice.mockRejectedValue(
        new Error('Database connection failed')
      )

      const request = makeNextRequest('http://localhost:3000/api/v1/pricing/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          width_cm: 120,
          depth_cm: 60,
          height_cm: 75,
          material: 'wood'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      // 표준 에러 메시지 확인
      expect(String(data.error)).toContain('Invalid action parameter')
    })
  })
})
