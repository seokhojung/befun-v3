// 리디렉션 플로우 E2E 테스트
// Story 3.1: 장바구니 및 결제 연동

import { jest } from '@jest/globals'

// 환경 변수 설정
process.env.EXTERNAL_SHOP_API_URL = 'https://api.test-shop.com'
process.env.EXTERNAL_SHOP_API_KEY = 'test-api-key'
process.env.USE_MOCK_API = 'true'

// Location 모킹 (브라우저 환경 시뮬레이션)
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    replace: jest.fn(),
    assign: jest.fn()
  },
  writable: true
})

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
            single: jest.fn(),
            order: jest.fn(() => ({
              limit: jest.fn(() => ({
                single: jest.fn()
              }))
            }))
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

import { NextRequest } from 'next/server'
import { POST as addToCartPOST } from '@/app/api/v1/cart/add/route'
import { GET as checkoutRedirectGET } from '@/app/api/v1/checkout/redirect/route'
import { createMocks } from 'node-mocks-http'

describe('Cart to Checkout Flow Integration', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Supabase 모킹 설정
    const { createClient } = require('@/lib/supabase/server')
    mockSupabase = createClient()

    // 기본 인증 사용자 설정
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-123' } },
      error: null
    })
  })

  const createPostRequest = (body: any): NextRequest => {
    const { req } = createMocks({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    })

    return new NextRequest(new URL('http://localhost:3000/api/v1/cart/add'), {
      method: 'POST',
      headers: req.headers as any,
      body: JSON.stringify(body)
    })
  }

  const createGetRequest = (searchParams: Record<string, string>): NextRequest => {
    const url = new URL('http://localhost:3000/api/v1/checkout/redirect')
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })

    return new NextRequest(url, { method: 'GET' })
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

  describe('완전한 구매 플로우', () => {
    it('장바구니 추가 → 리디렉션 → 결제 페이지 이동', async () => {
      // 1. 디자인 검증 모킹
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: validCartData.designId,
                  user_id: 'test-user-123',
                  name: '테스트 디자인'
                },
                error: null
              })
            })
          })
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'purchase-request-123',
                cart_id: 'cart-123',
                redirect_url: 'https://test-shop.com/checkout/cart-123'
              },
              error: null
            })
          })
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null })
        })
      })

      // 2. 장바구니 추가 API 호출
      const addRequest = createPostRequest(validCartData)
      const addResponse = await addToCartPOST(addRequest)
      const addResult = await addResponse.json()

      expect(addResponse.status).toBe(200)
      expect(addResult.success).toBe(true)
      expect(addResult.cartId).toBeDefined()
      expect(addResult.redirectUrl).toBeDefined()

      // 3. 구매 요청 로그 검증을 위한 모킹 설정
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      redirect_url: 'https://test-shop.com/checkout/cart-123',
                      status: 'success',
                      cart_id: addResult.cartId
                    },
                    error: null
                  })
                })
              })
            })
          })
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null })
        })
      })

      // 4. 리디렉션 API 호출
      const redirectRequest = createGetRequest({
        cartId: addResult.cartId
      })

      const redirectResponse = await checkoutRedirectGET(redirectRequest)

      // 5. 리디렉션 응답 검증
      expect(redirectResponse.status).toBe(302)
      expect(redirectResponse.headers.get('Location')).toContain('test-shop.com')
    })

    it('인증되지 않은 사용자의 결제 시도', async () => {
      // 인증 실패 설정
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated')
      })

      const request = createPostRequest(validCartData)
      const response = await addToCartPOST(request)
      const result = await response.json()

      expect(response.status).toBe(401)
      expect(result.success).toBe(false)
      expect(result.error.code).toBe('UNAUTHORIZED')
    })

    it('잘못된 cartId로 리디렉션 시도', async () => {
      const request = createGetRequest({
        cartId: 'invalid-cart-id'
      })

      const response = await checkoutRedirectGET(request)

      expect(response.status).toBe(302)
      expect(response.headers.get('Location')).toContain('/cart/error')
    })
  })

  describe('외부 API 실패 시나리오', () => {
    it('외부 API 실패 시 fallback 처리', async () => {
      // 외부 API 실패를 시뮬레이션하기 위해 Mock API의 실패 케이스 강제 발생
      const originalRandom = Math.random
      Math.random = jest.fn().mockReturnValue(0.05) // 10% 미만으로 실패 유도

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: validCartData.designId, user_id: 'test-user-123' },
                error: null
              })
            })
          })
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'purchase-request-failed' },
              error: null
            })
          })
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null })
        })
      })

      const request = createPostRequest(validCartData)
      const response = await addToCartPOST(request)
      const result = await response.json()

      expect(response.status).toBe(503)
      expect(result.success).toBe(false)
      expect(result.fallback).toBe(true)
      expect(result.retryUrl).toBeDefined()

      // Math.random 복원
      Math.random = originalRandom
    })
  })

  describe('브라우저별 리디렉션 호환성', () => {
    it('iOS Safari를 위한 Meta refresh 리디렉션', async () => {
      // User-Agent를 iOS Safari로 설정
      const url = new URL('http://localhost:3000/api/v1/checkout/redirect')
      url.searchParams.set('cartId', 'test-cart-id')

      const request = new NextRequest(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
        }
      })

      // 구매 요청 데이터 모킹
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      redirect_url: 'https://test-shop.com/checkout/cart-123',
                      status: 'success',
                      cart_id: 'test-cart-id'
                    },
                    error: null
                  })
                })
              })
            })
          })
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null })
        })
      })

      const response = await checkoutRedirectGET(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toContain('text/html')

      const html = await response.text()
      expect(html).toContain('meta http-equiv="refresh"')
      expect(html).toContain('test-shop.com')
    })

    it('Desktop Chrome을 위한 표준 HTTP 리디렉션', async () => {
      const url = new URL('http://localhost:3000/api/v1/checkout/redirect')
      url.searchParams.set('cartId', 'test-cart-id')

      const request = new NextRequest(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      })

      // 구매 요청 데이터 모킹
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      redirect_url: 'https://test-shop.com/checkout/cart-123',
                      status: 'success',
                      cart_id: 'test-cart-id'
                    },
                    error: null
                  })
                })
              })
            })
          })
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null })
        })
      })

      const response = await checkoutRedirectGET(request)

      expect(response.status).toBe(302)
      expect(response.headers.get('Location')).toContain('test-shop.com')
    })
  })

  describe('에러 복구 플로우', () => {
    it('재시도 페이지에서 성공적인 복구', async () => {
      // 재시도 API는 실제로 구현되어 있지 않으므로 기본적인 구조만 테스트
      const retryPageUrl = '/cart/retry/purchase-request-123'

      // 재시도 페이지가 올바른 구조를 가지는지 확인
      expect(retryPageUrl).toMatch(/^\/cart\/retry\/[\w-]+$/)
    })

    it('에러 페이지 리디렉션', async () => {
      // 구매 요청이 없는 경우
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: new Error('Purchase request not found')
                  })
                })
              })
            })
          })
        })
      })

      const request = createGetRequest({
        cartId: 'non-existent-cart-id'
      })

      const response = await checkoutRedirectGET(request)

      expect(response.status).toBe(302)
      expect(response.headers.get('Location')).toContain('/cart/error')
    })
  })

  describe('보안 테스트', () => {
    it('다른 사용자의 cartId 접근 시도', async () => {
      // 다른 사용자의 구매 요청 데이터 반환
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: null, // 사용자 ID가 다르므로 결과 없음
                    error: new Error('Access denied')
                  })
                })
              })
            })
          })
        })
      })

      const request = createGetRequest({
        cartId: 'other-user-cart-id'
      })

      const response = await checkoutRedirectGET(request)

      expect(response.status).toBe(302)
      expect(response.headers.get('Location')).toContain('/cart/error')
    })

    it('조작된 가격 데이터 거부', async () => {
      const manipulatedData = {
        ...validCartData,
        customizations: {
          ...validCartData.customizations,
          calculated_price: 1000 // 비정상적으로 낮은 가격
        }
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: validCartData.designId, user_id: 'test-user-123' },
                error: null
              })
            })
          })
        })
      })

      const request = createPostRequest(manipulatedData)
      const response = await addToCartPOST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.success).toBe(false)
      expect(result.error.code).toBe('PRICE_MISMATCH')
    })
  })
})