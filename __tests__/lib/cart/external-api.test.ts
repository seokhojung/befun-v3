// 외부 API 연동 모킹 테스트
// Story 3.1: 장바구니 및 결제 연동

import { ExternalShoppingMallAPI, MockExternalShoppingMallAPI, createExternalAPI } from '@/lib/cart/external-api'
import { CartServiceError, type ExternalCartItem } from '@/types/cart'
import { jest } from '@jest/globals'

// fetch 모킹
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>

describe('ExternalShoppingMallAPI', () => {
  let api: ExternalShoppingMallAPI
  const mockConfig = {
    baseUrl: 'https://api.test-shop.com',
    apiKey: 'test-api-key',
    timeout: 5000,
    retryCount: 2
  }

  const testCartItem: ExternalCartItem = {
    product_id: 'custom_desk',
    product_name: '맞춤 제작 책상',
    quantity: 1,
    unit_price: 116700,
    custom_options: {
      dimensions: '120cm × 60cm × 75cm',
      material: '원목',
      specifications: 'Custom specifications'
    },
    total_price: 116700
  }

  beforeEach(() => {
    jest.clearAllMocks()
    api = new ExternalShoppingMallAPI(mockConfig)
  })

  describe('addToCart', () => {
    it('성공적인 API 호출', async () => {
      const mockResponse = {
        success: true,
        cart_id: 'cart-123',
        redirect_url: 'https://test-shop.com/checkout/cart-123',
        message: 'Item added successfully'
      }

      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      const result = await api.addToCart(testCartItem)

      expect(result.success).toBe(true)
      expect(result.cartId).toBe('cart-123')
      expect(result.redirectUrl).toBe('https://test-shop.com/checkout/cart-123')
      expect(result.request).toEqual(testCartItem)

      expect(fetch).toHaveBeenCalledWith(
        'https://api.test-shop.com/cart/add',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key',
            'User-Agent': 'BeFun-Configurator/1.0'
          }),
          body: JSON.stringify(testCartItem)
        })
      )
    })

    it('API 에러 응답 처리', async () => {
      const mockResponse = {
        success: false,
        error_code: 'INVALID_PRODUCT',
        message: 'Product not found'
      }

      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      const result = await api.addToCart(testCartItem)

      expect(result.success).toBe(false)
      expect(result.error).toBe('INVALID_PRODUCT')
    })

    it('HTTP 에러 상태 처리', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as Response)

      const result = await api.addToCart(testCartItem)

      expect(result.success).toBe(false)
      expect(result.error).toContain('HTTP 404')
    })

    it('네트워크 에러 처리', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error')
      )

      const result = await api.addToCart(testCartItem)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Network error')
    })

    it('타임아웃 처리', async () => {
      // 타임아웃을 시뮬레이션하기 위해 AbortError 사용
      const abortError = new Error('AbortError')
      abortError.name = 'AbortError'

      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(abortError)

      const result = await api.addToCart(testCartItem)

      expect(result.success).toBe(false)
      expect(result.error).toContain('timeout')
    })

    it('재시도 로직 - 일시적 에러', async () => {
      // 첫 번째 호출은 실패, 두 번째 호출은 성공
      ;(fetch as jest.MockedFunction<typeof fetch>)
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            cart_id: 'cart-retry-123',
            redirect_url: 'https://test-shop.com/checkout/cart-retry-123'
          })
        } as Response)

      const result = await api.addToCart(testCartItem)

      expect(result.success).toBe(true)
      expect(result.cartId).toBe('cart-retry-123')
      expect(fetch).toHaveBeenCalledTimes(2)
    })

    it('재시도 불가능한 에러 즉시 실패', async () => {
      const mockResponse = {
        success: false,
        error_code: 'INVALID_PRODUCT',
        message: 'Product validation failed'
      }

      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      const result = await api.addToCart(testCartItem)

      expect(result.success).toBe(false)
      expect(fetch).toHaveBeenCalledTimes(1) // 재시도 없음
    })

    it('최대 재시도 횟수 초과', async () => {
      // 모든 시도가 실패
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
        new Error('Persistent error')
      )

      const result = await api.addToCart(testCartItem)

      expect(result.success).toBe(false)
      expect(fetch).toHaveBeenCalledTimes(mockConfig.retryCount)
    })
  })

  describe('healthCheck', () => {
    it('정상적인 health check', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true
      } as Response)

      const result = await api.healthCheck()

      expect(result).toBe(true)
      expect(fetch).toHaveBeenCalledWith(
        'https://api.test-shop.com/health',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key'
          })
        })
      )
    })

    it('실패한 health check', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 503
      } as Response)

      const result = await api.healthCheck()

      expect(result).toBe(false)
    })

    it('health check 네트워크 에러', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error')
      )

      const result = await api.healthCheck()

      expect(result).toBe(false)
    })
  })
})

describe('MockExternalShoppingMallAPI', () => {
  let mockApi: MockExternalShoppingMallAPI

  const testCartItem: ExternalCartItem = {
    product_id: 'custom_desk',
    product_name: '맞춤 제작 책상',
    quantity: 1,
    unit_price: 116700,
    custom_options: {
      dimensions: '120cm × 60cm × 75cm',
      material: '원목',
      specifications: 'Custom specifications'
    },
    total_price: 116700
  }

  beforeEach(() => {
    mockApi = new MockExternalShoppingMallAPI()
  })

  it('Mock API 성공 응답', async () => {
    const result = await mockApi.addToCart(testCartItem)

    expect(result.success).toBe(true)
    expect(result.cartId).toMatch(/^mock_cart_/)
    expect(result.redirectUrl).toContain('mock-shop.example.com')
    expect(result.request).toEqual(testCartItem)
  })

  it('Mock API 랜덤 실패 (재시도로 테스트)', async () => {
    // Math.random을 모킹하여 실패 시뮬레이션
    const originalRandom = Math.random
    Math.random = jest.fn().mockReturnValue(0.05) // 10% 미만이므로 실패

    const result = await mockApi.addToCart(testCartItem)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Mock random failure')

    // Math.random 복원
    Math.random = originalRandom
  })

  it('Mock API health check는 항상 성공', async () => {
    const result = await mockApi.healthCheck()
    expect(result).toBe(true)
  })
})

describe('createExternalAPI', () => {
  beforeEach(() => {
    // 환경 변수 초기화
    delete process.env.NODE_ENV
    delete process.env.USE_MOCK_API
  })

  it('개발 환경에서는 Mock API 반환', () => {
    process.env.NODE_ENV = 'development'

    const api = createExternalAPI()

    expect(api).toBeInstanceOf(MockExternalShoppingMallAPI)
  })

  it('USE_MOCK_API 플래그가 true이면 Mock API 반환', () => {
    process.env.NODE_ENV = 'production'
    process.env.USE_MOCK_API = 'true'

    const api = createExternalAPI()

    expect(api).toBeInstanceOf(MockExternalShoppingMallAPI)
  })

  it('설정이 제공되면 실제 API 인스턴스 반환', () => {
    process.env.NODE_ENV = 'production'
    process.env.USE_MOCK_API = 'false'

    const config = {
      baseUrl: 'https://api.real-shop.com',
      apiKey: 'real-api-key',
      timeout: 10000,
      retryCount: 3
    }

    const api = createExternalAPI(config)

    expect(api).toBeInstanceOf(ExternalShoppingMallAPI)
    expect(api).not.toBeInstanceOf(MockExternalShoppingMallAPI)
  })

  it('프로덕션에서 설정 없이 호출하면 에러', () => {
    process.env.NODE_ENV = 'production'
    process.env.USE_MOCK_API = 'false'

    expect(() => {
      createExternalAPI()
    }).toThrow(CartServiceError)
  })
})

describe('API 응답 형식 호환성', () => {
  it('다양한 성공 응답 형식 처리', async () => {
    const api = new ExternalShoppingMallAPI({
      baseUrl: 'https://api.test.com',
      apiKey: 'test-key',
      timeout: 5000,
      retryCount: 1
    })

    // 다른 필드명을 사용하는 응답 형식들
    const responseVariations = [
      {
        success: true,
        cart_id: 'cart-123',
        redirect_url: 'https://shop.com/checkout'
      },
      {
        status: 'success',
        cartId: 'cart-456',
        redirectUrl: 'https://shop.com/checkout'
      },
      {
        success: true,
        id: 'cart-789',
        checkout_url: 'https://shop.com/checkout'
      }
    ]

    for (const mockResponse of responseVariations) {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      const result = await api.addToCart({} as ExternalCartItem)

      expect(result.success).toBe(true)
      expect(result.cartId).toBeDefined()
      expect(result.redirectUrl).toBeDefined()
    }
  })
})