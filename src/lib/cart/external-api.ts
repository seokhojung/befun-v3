// 외부 쇼핑몰 API 클라이언트 모듈
// Story 3.1: 장바구니 및 결제 연동

import { CartServiceError, type ExternalCartItem, type ExternalApiConfig } from '@/types/cart'

/**
 * 외부 쇼핑몰 API 응답 타입
 */
interface ExternalApiResponse {
  success: boolean
  cart_id?: string
  redirect_url?: string
  message?: string
  error_code?: string
  error_details?: any
}

/**
 * API 호출 결과 타입
 */
export interface ApiCallResult {
  success: boolean
  cartId?: string
  redirectUrl?: string
  request: any
  response: any
  error?: string
}

/**
 * 외부 쇼핑몰 API 클라이언트
 */
export class ExternalShoppingMallAPI {
  private config: ExternalApiConfig
  private baseHeaders: Record<string, string>

  constructor(config: ExternalApiConfig) {
    this.config = config
    this.baseHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      'User-Agent': 'BeFun-Configurator/1.0'
    }
  }

  /**
   * 장바구니에 아이템 추가
   */
  async addToCart(item: ExternalCartItem): Promise<ApiCallResult> {
    let lastError: string | undefined

    for (let attempt = 1; attempt <= this.config.retryCount; attempt++) {
      try {
        const result = await this.makeApiCall('/cart/add', item, attempt)

        if (result.success) {
          return {
            success: true,
            cartId: result.cart_id,
            redirectUrl: result.redirect_url,
            request: item,
            response: result
          }
        } else {
          lastError = result.error_code || result.message || 'Unknown error'

          // 재시도 불가능한 에러인경우 즉시 실패
          if (this.isNonRetryableError(result.error_code)) {
            break
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Network error'

        // 네트워크 에러는 재시도 가능
        if (attempt < this.config.retryCount) {
          await this.delay(this.getRetryDelay(attempt))
          continue
        }
      }
    }

    return {
      success: false,
      request: item,
      response: null,
      error: lastError || 'API call failed after retries'
    }
  }

  /**
   * API 호출 실행
   */
  private async makeApiCall(
    endpoint: string,
    data: any,
    attempt: number
  ): Promise<ExternalApiResponse> {
    const url = `${this.config.baseUrl}${endpoint}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.baseHeaders,
        body: JSON.stringify(data),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new CartServiceError(
          `HTTP ${response.status}: ${response.statusText}`,
          'HTTP_ERROR',
          { status: response.status, statusText: response.statusText }
        )
      }

      const result: ExternalApiResponse = await response.json()

      // API 응답 로깅 (개발용)
      if (process.env.NODE_ENV === 'development') {
        console.log(`External API call (attempt ${attempt}):`, {
          endpoint,
          request: data,
          response: result
        })
      }

      return result

    } catch (error: any) {
      clearTimeout(timeoutId)

      if (error?.name === 'AbortError') {
        throw new CartServiceError(
          `API call timeout after ${this.config.timeout}ms`,
          'TIMEOUT_ERROR'
        )
      }

      throw error
    }
  }

  /**
   * 재시도 불가능한 에러 확인
   */
  private isNonRetryableError(errorCode?: string): boolean {
    const nonRetryableErrors = [
      'INVALID_PRODUCT',
      'INVALID_PRICE',
      'UNAUTHORIZED',
      'FORBIDDEN',
      'VALIDATION_ERROR'
    ]

    return errorCode ? nonRetryableErrors.includes(errorCode) : false
  }

  /**
   * 재시도 지연 시간 계산 (지수 백오프)
   */
  private getRetryDelay(attempt: number): number {
    const baseDelay = 1000 // 1초
    const maxDelay = 10000 // 10초
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay)

    // 지터 추가 (랜덤 요소)
    const jitter = Math.random() * 0.1 * delay
    return delay + jitter
  }

  /**
   * 지연 헬퍼 함수
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * API 상태 확인
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${this.config.apiKey}` },
        signal: AbortSignal.timeout(5000) // 5초 타임아웃
      })

      return response.ok
    } catch {
      return false
    }
  }
}

/**
 * Mock 외부 API (개발/테스트용)
 */
export class MockExternalShoppingMallAPI extends ExternalShoppingMallAPI {
  constructor() {
    super({
      baseUrl: 'https://mock-api.example.com',
      apiKey: 'mock-key',
      timeout: 5000,
      retryCount: 1
    })
  }

  async addToCart(item: ExternalCartItem): Promise<ApiCallResult> {
    // Mock 응답 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 200)) // 200ms 지연

    const cartId = `mock_cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const redirectUrl = `https://mock-shop.example.com/cart/${cartId}`

    // 10% 확률로 실패 시뮬레이션
    if (Math.random() < 0.1) {
      return {
        success: false,
        request: item,
        response: { success: false, error_code: 'MOCK_RANDOM_FAILURE' },
        error: 'Mock random failure for testing'
      }
    }

    return {
      success: true,
      cartId,
      redirectUrl,
      request: item,
      response: {
        success: true,
        cart_id: cartId,
        redirect_url: redirectUrl,
        message: 'Mock item added successfully'
      }
    }
  }

  async healthCheck(): Promise<boolean> {
    // Mock은 항상 정상
    return true
  }
}

/**
 * API 클라이언트 팩토리
 */
export function createExternalAPI(config?: ExternalApiConfig): ExternalShoppingMallAPI {
  // 환경에 따라 Mock 또는 실제 API 사용
  if (process.env.NODE_ENV === 'development' || process.env.USE_MOCK_API === 'true') {
    return new MockExternalShoppingMallAPI()
  }

  if (!config) {
    throw new CartServiceError(
      'External API configuration is required',
      'CONFIG_MISSING'
    )
  }

  return new ExternalShoppingMallAPI(config)
}

/**
 * 기본 설정으로 API 클라이언트 생성
 */
export function createDefaultExternalAPI(): ExternalShoppingMallAPI {
  const config: ExternalApiConfig = {
    baseUrl: process.env.EXTERNAL_SHOP_API_URL || 'https://api.external-shop.com',
    apiKey: process.env.EXTERNAL_SHOP_API_KEY || '',
    timeout: parseInt(process.env.EXTERNAL_SHOP_TIMEOUT || '10000'),
    retryCount: parseInt(process.env.EXTERNAL_SHOP_RETRY_COUNT || '3')
  }

  return createExternalAPI(config)
}
