/**
 * @jest-environment node
 */

import { createMocks } from 'node-mocks-http'
import { GET, POST } from '@/app/api/v1/pricing/calculate/route'
import { NextRequest } from 'next/server'

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
  createSuccessResponse: jest.fn((data, requestId) =>
    new Response(JSON.stringify({ success: true, data, requestId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  ),
  createErrorResponse: jest.fn((error, requestId) =>
    new Response(JSON.stringify({
      success: false,
      error: error.message || error.toString(),
      requestId
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  ),
  withErrorHandling: jest.fn((handler) => handler)
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

describe('/api/v1/pricing/calculate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
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

      const request = new NextRequest('http://localhost:3000/api/v1/pricing/calculate', {
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

      const request = new NextRequest('http://localhost:3000/api/v1/pricing/calculate', {
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
      const request = new NextRequest('http://localhost:3000/api/v1/pricing/calculate', {
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

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Dimensions must be positive')
    })

    it('should handle pricing calculation errors', async () => {
      mockPricingAPI.calculatePrice.mockRejectedValue(
        new PriceCalculationError('Material not found', 'MATERIAL_NOT_FOUND')
      )

      const request = new NextRequest('http://localhost:3000/api/v1/pricing/calculate', {
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

      const request = new NextRequest('http://localhost:3000/api/v1/pricing/calculate', {
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

      const request = new NextRequest('http://localhost:3000/api/v1/pricing/calculate', {
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

      const request = new NextRequest('http://localhost:3000/api/v1/pricing/calculate', {
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
      const request = new NextRequest(
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

      const request = new NextRequest(
        'http://localhost:3000/api/v1/pricing/calculate?action=materials'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.materials).toHaveLength(2)
      expect(data.data.materials[0].type).toBe('wood')
    })

    it('should handle invalid action parameter', async () => {
      const request = new NextRequest(
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

      const request = new NextRequest('http://localhost:3000/api/v1/pricing/calculate', {
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
        new NextRequest('http://localhost:3000/api/v1/pricing/calculate', {
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
      const request = new NextRequest('http://localhost:3000/api/v1/pricing/calculate', {
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
      const request = new NextRequest('http://localhost:3000/api/v1/pricing/calculate', {
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

      const request = new NextRequest('http://localhost:3000/api/v1/pricing/calculate', {
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
    })
  })
})