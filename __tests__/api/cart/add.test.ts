// 장바구니 추가 API 단위 테스트
// Story 3.1: 장바구니 및 결제 연동

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/v1/cart/add/route'
import { createMocks } from 'node-mocks-http'
import { jest } from '@jest/globals'

// Supabase 모킹
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn()
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn()
          }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn()
      }))
    }))
  }))
}))

// CartService 모킹
jest.mock('@/lib/cart/cart-service', () => ({
  getCartService: jest.fn(() => ({
    addToCart: jest.fn()
  }))
}))

describe('/api/v1/cart/add', () => {
  let mockSupabase: any
  let mockCartService: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Supabase 모킹 설정
    const { createClient } = require('@/lib/supabase/server')
    mockSupabase = createClient()

    // CartService 모킹 설정
    const { getCartService } = require('@/lib/cart/cart-service')
    mockCartService = getCartService()
  })

  const createTestRequest = (body: any): NextRequest => {
    const { req } = createMocks({
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(body)
    })

    // NextRequest로 변환
    const request = new NextRequest(new URL('http://localhost:3000/api/v1/cart/add'), {
      method: 'POST',
      headers: req.headers as any,
      body: JSON.stringify(body)
    })

    return request
  }

  const validCartData = {
    designId: '123e4567-e89b-12d3-a456-426614174000',
    quantity: 1,
    customizations: {
      width_cm: 120,
      depth_cm: 60,
      height_cm: 75,
      material: 'wood',
      calculated_price: 116700,
      price_breakdown: {
        base_price: 50000,
        material_modifier: 1.0,
        volume_m3: 0.54,
        subtotal: 27000,
        total: 116700,
        currency: 'KRW'
      },
      name: '내 맞춤 책상'
    }
  }

  describe('인증 검증', () => {
    it('비로그인 사용자는 401 에러를 반환해야 함', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated')
      })

      const request = createTestRequest(validCartData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('인증된 사용자는 처리를 진행해야 함', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })

      mockCartService.addToCart.mockResolvedValue({
        success: true,
        cartId: 'cart-123',
        redirectUrl: 'https://example.com/checkout',
        message: '성공'
      })

      const request = createTestRequest(validCartData)
      const response = await POST(request)

      expect(mockCartService.addToCart).toHaveBeenCalledWith(
        validCartData,
        'user-123'
      )
    })
  })

  describe('입력 데이터 검증', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })
    })

    it('유효한 데이터는 성공해야 함', async () => {
      mockCartService.addToCart.mockResolvedValue({
        success: true,
        cartId: 'cart-123',
        redirectUrl: 'https://example.com/checkout',
        message: '성공'
      })

      const request = createTestRequest(validCartData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('잘못된 UUID 형식의 designId는 400 에러를 반환해야 함', async () => {
      const invalidData = {
        ...validCartData,
        designId: 'invalid-uuid'
      }

      const request = createTestRequest(invalidData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('범위를 벗어난 치수는 400 에러를 반환해야 함', async () => {
      const invalidData = {
        ...validCartData,
        customizations: {
          ...validCartData.customizations,
          width_cm: 500 // 최대 300cm 초과
        }
      }

      const request = createTestRequest(invalidData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('지원되지 않는 재료는 400 에러를 반환해야 함', async () => {
      const invalidData = {
        ...validCartData,
        customizations: {
          ...validCartData.customizations,
          material: 'unknown_material'
        }
      }

      const request = createTestRequest(invalidData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('음수 가격은 400 에러를 반환해야 함', async () => {
      const invalidData = {
        ...validCartData,
        customizations: {
          ...validCartData.customizations,
          calculated_price: -100
        }
      }

      const request = createTestRequest(invalidData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('장바구니 서비스 통합', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })
    })

    it('성공적인 장바구니 추가', async () => {
      mockCartService.addToCart.mockResolvedValue({
        success: true,
        cartId: 'cart-123',
        redirectUrl: 'https://example.com/checkout',
        message: '장바구니에 추가되었습니다'
      })

      const request = createTestRequest(validCartData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.cartId).toBe('cart-123')
      expect(data.redirectUrl).toBe('https://example.com/checkout')
    })

    it('외부 API 실패 시 fallback 처리', async () => {
      mockCartService.addToCart.mockResolvedValue({
        success: false,
        fallback: true,
        message: '결제 시스템 연결에 문제가 있습니다',
        retryUrl: '/cart/retry/req-123',
        error: { code: 'EXTERNAL_API_FAILED' }
      })

      const request = createTestRequest(validCartData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.success).toBe(false)
      expect(data.fallback).toBe(true)
      expect(data.retryUrl).toBe('/cart/retry/req-123')
    })

    it('일반적인 실패 시 400 에러', async () => {
      mockCartService.addToCart.mockResolvedValue({
        success: false,
        message: '디자인을 찾을 수 없습니다',
        error: { code: 'DESIGN_NOT_FOUND' }
      })

      const request = createTestRequest(validCartData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('DESIGN_NOT_FOUND')
    })
  })

  describe('Rate Limiting', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })
    })

    it('Rate limit 초과 시 429 에러를 반환해야 함', async () => {
      // Rate limit을 테스트하기 위해 동일한 사용자로 6번 연속 요청
      const requests = Array(6).fill(null).map(() =>
        createTestRequest(validCartData)
      )

      // 처음 5번은 성공해야 함
      for (let i = 0; i < 5; i++) {
        mockCartService.addToCart.mockResolvedValue({
          success: true,
          cartId: `cart-${i}`,
          redirectUrl: 'https://example.com/checkout',
          message: '성공'
        })

        const response = await POST(requests[i])
        expect(response.status).toBe(200)
      }

      // 6번째 요청은 rate limit 에러를 반환해야 함
      const lastResponse = await POST(requests[5])
      const data = await lastResponse.json()

      expect(lastResponse.status).toBe(429)
      expect(data.error.code).toBe('RATE_LIMIT_EXCEEDED')
    })
  })

  describe('에러 처리', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })
    })

    it('서버 에러 시 500 에러를 반환해야 함', async () => {
      mockCartService.addToCart.mockRejectedValue(new Error('Database error'))

      const request = createTestRequest(validCartData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })

    it('잘못된 JSON 형식은 적절히 처리해야 함', async () => {
      const { req } = createMocks({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: '{ invalid json'
      })

      // 잘못된 JSON으로 NextRequest 생성
      const request = new NextRequest(new URL('http://localhost:3000/api/v1/cart/add'), {
        method: 'POST',
        headers: req.headers as any,
        body: '{ invalid json'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })
})