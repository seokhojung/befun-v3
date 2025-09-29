// 장바구니 핵심 로직 통합 서비스
// Story 3.1: 장바구니 및 결제 연동

import { createClient } from '@/lib/supabase/server'
import { ExternalShoppingMallAPI, createDefaultExternalAPI, type ApiCallResult } from './external-api'
import { DataTransformer } from './data-transformer'
import { getSecurityManager, type SecurityManager } from './security'
import {
  CartServiceError,
  type CartItemData,
  type AddToCartResponse,
  type PurchaseRequest,
  type CartServiceConfig
} from '@/types/cart'

/**
 * 장바구니 서비스 메인 클래스
 */
export class CartService {
  private externalAPI: ExternalShoppingMallAPI
  private securityManager: SecurityManager
  private config: CartServiceConfig

  constructor(
    externalAPI?: ExternalShoppingMallAPI,
    securityManager?: SecurityManager,
    config?: Partial<CartServiceConfig>
  ) {
    this.externalAPI = externalAPI || createDefaultExternalAPI()
    this.securityManager = securityManager || getSecurityManager()

    // 기본 설정
    this.config = {
      externalApi: {
        baseUrl: process.env.EXTERNAL_SHOP_API_URL || 'https://api.external-shop.com',
        apiKey: process.env.EXTERNAL_SHOP_API_KEY || '',
        timeout: 10000,
        retryCount: 3
      },
      priceValidationTolerance: 0.01,
      rateLimitPerMinute: 5,
      ...config
    }
  }

  /**
   * 장바구니에 아이템 추가 (메인 로직)
   */
  async addToCart(
    cartData: CartItemData,
    userId: string
  ): Promise<AddToCartResponse> {
    try {
      // 1. 데이터 검증
      const validation = DataTransformer.validateCartItemData(cartData)
      if (!validation.isValid) {
        return {
          success: false,
          message: `입력 데이터 오류: ${validation.errors.join(', ')}`,
          error: { code: 'VALIDATION_ERROR', details: validation.errors }
        }
      }

      // 2. 사용자 및 디자인 검증
      const design = await this.validateUserDesign(cartData.designId, userId)
      if (!design) {
        return {
          success: false,
          message: '디자인을 찾을 수 없거나 권한이 없습니다',
          error: { code: 'DESIGN_NOT_FOUND' }
        }
      }

      // 3. 가격 재계산 및 검증
      const priceValidation = await this.validatePrice(cartData)
      if (!priceValidation.isValid) {
        return {
          success: false,
          message: '가격 정보가 일치하지 않습니다. 새로고침 후 다시 시도해주세요',
          error: {
            code: 'PRICE_MISMATCH',
            details: priceValidation.details
          }
        }
      }

      // 4. 외부 API 형식으로 변환
      const externalItem = DataTransformer.transformToExternalCartItem(cartData)

      // 5. 민감한 정보 제거
      const sanitizedItem = DataTransformer.sanitizeForExternalAPI(externalItem)

      // 6. 외부 쇼핑몰 API 호출
      const apiResult = await this.externalAPI.addToCart(sanitizedItem)

      // 7. 구매 요청 로그 저장
      const purchaseRequest = await this.logPurchaseRequest({
        userId,
        designId: cartData.designId,
        apiResult,
        originalData: cartData
      })

      // 8. 결과에 따른 처리
      if (apiResult.success) {
        // 성공: 디자인 상태 업데이트
        await this.updateDesignCartStatus(cartData.designId, 'in_cart', apiResult.cartId)

        return {
          success: true,
          cartId: apiResult.cartId,
          redirectUrl: apiResult.redirectUrl,
          message: '장바구니에 추가되었습니다. 결제 페이지로 이동합니다.'
        }
      } else {
        // 실패: fallback 처리
        return {
          success: false,
          fallback: true,
          message: '결제 시스템 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.',
          retryUrl: `/cart/retry/${purchaseRequest?.id}`,
          error: { code: 'EXTERNAL_API_FAILED', details: apiResult.error }
        }
      }

    } catch (error) {
      console.error('CartService.addToCart error:', error)

      if (error instanceof CartServiceError) {
        return {
          success: false,
          message: error.message,
          error: { code: error.code, details: error.details }
        }
      }

      return {
        success: false,
        message: '서버 오류가 발생했습니다',
        error: { code: 'INTERNAL_ERROR' }
      }
    }
  }

  /**
   * 사용자 디자인 검증
   */
  private async validateUserDesign(designId: string, userId: string) {
    const supabase = createClient()

    const { data: design, error } = await supabase
      .from('saved_designs')
      .select('*')
      .eq('id', designId)
      .eq('user_id', userId)
      .single()

    if (error || !design) {
      return null
    }

    return design
  }

  /**
   * 가격 검증
   */
  private async validatePrice(cartData: CartItemData): Promise<{
    isValid: boolean
    details?: any
  }> {
    try {
      // 서버 사이드 가격 재계산
      const serverPrice = await this.recalculatePrice({
        width_cm: cartData.customizations.width_cm,
        depth_cm: cartData.customizations.depth_cm,
        height_cm: cartData.customizations.height_cm,
        material: cartData.customizations.material
      })

      const clientPrice = cartData.customizations.calculated_price
      const priceDifference = Math.abs(serverPrice.total - clientPrice)

      const isValid = priceDifference <= this.config.priceValidationTolerance

      return {
        isValid,
        details: {
          clientPrice,
          serverPrice: serverPrice.total,
          difference: priceDifference,
          tolerance: this.config.priceValidationTolerance
        }
      }
    } catch (error) {
      return {
        isValid: false,
        details: { error: 'Price calculation failed' }
      }
    }
  }

  /**
   * 가격 재계산 (Story 2.2 로직 재사용)
   */
  private async recalculatePrice(dimensions: {
    width_cm: number
    depth_cm: number
    height_cm: number
    material: string
  }) {
    // 부피 계산 (m³)
    const volume_m3 = (dimensions.width_cm * dimensions.depth_cm * dimensions.height_cm) / 1_000_000

    // 재료별 가격 배수 (CLAUDE.md에서 정의된 값)
    const materialModifiers: Record<string, number> = {
      wood: 1.0,
      mdf: 0.8,
      steel: 1.15,
      metal: 1.5,
      glass: 2.0,
      fabric: 0.8
    }

    const base_price_per_m3 = 50000 // KRW
    const material_modifier = materialModifiers[dimensions.material] || 1.0
    const subtotal = volume_m3 * base_price_per_m3 * material_modifier
    const total = Math.round(subtotal)

    return {
      base_price: base_price_per_m3,
      material_modifier,
      volume_m3,
      subtotal,
      total,
      currency: 'KRW'
    }
  }

  /**
   * 구매 요청 로그 저장
   */
  private async logPurchaseRequest(data: {
    userId: string
    designId: string
    apiResult: ApiCallResult
    originalData: CartItemData
  }): Promise<PurchaseRequest | null> {
    try {
      const supabase = createClient()

      const { data: purchaseRequest, error } = await supabase
        .from('purchase_requests')
        .insert({
          user_id: data.userId,
          design_id: data.designId,
          external_api_request: data.apiResult.request,
          external_api_response: data.apiResult.response,
          status: data.apiResult.success ? 'success' : 'failed',
          error_message: data.apiResult.error,
          cart_id: data.apiResult.cartId,
          redirect_url: data.apiResult.redirectUrl
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to log purchase request:', error)
        return null
      }

      return purchaseRequest
    } catch (error) {
      console.error('Purchase request logging error:', error)
      return null
    }
  }

  /**
   * 디자인 장바구니 상태 업데이트
   */
  private async updateDesignCartStatus(
    designId: string,
    status: 'saved' | 'in_cart' | 'purchased' | 'cancelled',
    externalOrderId?: string
  ): Promise<void> {
    try {
      const supabase = createClient()

      const updateData: any = { cart_status: status }

      if (externalOrderId) {
        updateData.external_order_id = externalOrderId
      }

      await supabase
        .from('saved_designs')
        .update(updateData)
        .eq('id', designId)

    } catch (error) {
      console.error('Failed to update design cart status:', error)
      // 상태 업데이트 실패는 치명적이지 않으므로 에러를 throw하지 않음
    }
  }

  /**
   * 장바구니 재시도 처리
   */
  async retryCartOperation(purchaseRequestId: string, userId: string): Promise<AddToCartResponse> {
    try {
      const supabase = createClient()

      // 구매 요청 로그 조회
      const { data: purchaseRequest, error } = await supabase
        .from('purchase_requests')
        .select('*')
        .eq('id', purchaseRequestId)
        .eq('user_id', userId)
        .single()

      if (error || !purchaseRequest) {
        return {
          success: false,
          message: '재시도할 요청을 찾을 수 없습니다',
          error: { code: 'REQUEST_NOT_FOUND' }
        }
      }

      // 원본 요청 데이터로 재시도
      const originalRequest = purchaseRequest.external_api_request

      if (!originalRequest) {
        return {
          success: false,
          message: '원본 요청 데이터가 없습니다',
          error: { code: 'MISSING_ORIGINAL_DATA' }
        }
      }

      // 외부 API 재호출
      const apiResult = await this.externalAPI.addToCart(originalRequest)

      // 상태 업데이트
      await supabase
        .from('purchase_requests')
        .update({
          external_api_response: apiResult.response,
          status: apiResult.success ? 'success' : 'failed',
          error_message: apiResult.error,
          cart_id: apiResult.cartId,
          redirect_url: apiResult.redirectUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', purchaseRequestId)

      if (apiResult.success) {
        // 디자인 상태도 업데이트
        await this.updateDesignCartStatus(
          purchaseRequest.design_id,
          'in_cart',
          apiResult.cartId
        )

        return {
          success: true,
          cartId: apiResult.cartId,
          redirectUrl: apiResult.redirectUrl,
          message: '재시도가 성공했습니다. 결제 페이지로 이동합니다.'
        }
      } else {
        return {
          success: false,
          message: '재시도가 실패했습니다. 고객 서비스에 문의하세요.',
          error: { code: 'RETRY_FAILED', details: apiResult.error }
        }
      }

    } catch (error) {
      console.error('Retry cart operation error:', error)
      return {
        success: false,
        message: '재시도 중 오류가 발생했습니다',
        error: { code: 'RETRY_ERROR' }
      }
    }
  }

  /**
   * 외부 API 상태 확인
   */
  async checkExternalAPIHealth(): Promise<boolean> {
    try {
      return await this.externalAPI.healthCheck()
    } catch {
      return false
    }
  }
}

/**
 * 기본 장바구니 서비스 인스턴스
 */
let defaultCartService: CartService | null = null

export function getCartService(): CartService {
  if (!defaultCartService) {
    defaultCartService = new CartService()
  }
  return defaultCartService
}

/**
 * 커스텀 설정으로 장바구니 서비스 생성
 */
export function createCartService(config?: {
  externalAPI?: ExternalShoppingMallAPI
  securityManager?: SecurityManager
  config?: Partial<CartServiceConfig>
}): CartService {
  return new CartService(
    config?.externalAPI,
    config?.securityManager,
    config?.config
  )
}