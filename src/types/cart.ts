// 장바구니 시스템 전용 타입 정의
// Story 3.1: 장바구니 및 결제 연동

/**
 * 장바구니 아이템 상태
 */
export type CartStatus = 'saved' | 'in_cart' | 'purchased' | 'cancelled'

/**
 * 구매 요청 상태
 */
export type PurchaseRequestStatus = 'pending' | 'success' | 'failed' | 'redirected'

/**
 * 장바구니에 추가할 디자인 데이터
 */
export interface CartItemData {
  designId: string
  quantity?: number
  customizations: {
    width_cm: number
    depth_cm: number
    height_cm: number
    material: string
    calculated_price: number
    price_breakdown: PriceBreakdown
    color?: string
    name: string
  }
}

/**
 * 가격 분해 구조 (Story 2.2에서 정의된 구조)
 */
export interface PriceBreakdown {
  base_price: number
  material_modifier: number
  volume_m3: number
  subtotal: number
  tax?: number
  total: number
  currency: string
}

/**
 * 장바구니 추가 API 요청
 */
export interface AddToCartRequest {
  designId: string
  quantity?: number
  customizations: {
    width_cm: number
    depth_cm: number
    height_cm: number
    material: string
    calculated_price: number
    price_breakdown: PriceBreakdown
    color?: string
    name: string
  }
}

/**
 * 장바구니 추가 API 응답
 */
export interface AddToCartResponse {
  success: boolean
  cartId?: string
  redirectUrl?: string
  message: string
  fallback?: boolean
  retryUrl?: string
  error?: {
    code: string
    details?: any
  }
}

/**
 * 외부 쇼핑몰 API 전송용 데이터 형식
 */
export interface ExternalCartItem {
  product_id: string // "custom_desk"
  product_name: string // "맞춤 제작 책상"
  quantity: number
  unit_price: number
  custom_options: {
    dimensions: string // "120cm x 60cm x 75cm"
    material: string // "원목"
    specifications: string // 상세 사양
  }
  total_price: number
}

/**
 * 구매 요청 로그 데이터
 */
export interface PurchaseRequest {
  id: string
  user_id: string
  design_id: string
  external_api_request?: any
  external_api_response?: any
  status: PurchaseRequestStatus
  error_message?: string
  cart_id?: string
  redirect_url?: string
  created_at: string
  updated_at: string
}

/**
 * 결제 리디렉션 쿼리 파라미터
 */
export interface CheckoutRedirectParams {
  cartId: string
  returnUrl?: string
}

/**
 * 장바구니 서비스 에러
 */
export class CartServiceError extends Error {
  public code: string
  public details?: any

  constructor(message: string, code: string, details?: any) {
    super(message)
    this.name = 'CartServiceError'
    this.code = code
    this.details = details
  }
}

/**
 * 외부 API 클라이언트 설정
 */
export interface ExternalApiConfig {
  baseUrl: string
  apiKey: string
  timeout: number
  retryCount: number
}

/**
 * 장바구니 서비스 설정
 */
export interface CartServiceConfig {
  externalApi: ExternalApiConfig
  priceValidationTolerance: number // 가격 검증 허용 오차 (예: 0.01)
  rateLimitPerMinute: number // 분당 요청 제한
}

/**
 * 확장된 디자인 데이터 (saved_designs 테이블 + 장바구니 필드)
 */
export interface ExtendedDesignData {
  id: string
  user_id: string
  name: string
  width_cm: number
  depth_cm: number
  height_cm: number
  material: string
  color?: string
  thumbnail_url?: string
  calculated_price?: number
  price_breakdown?: PriceBreakdown
  estimated_price?: number
  cart_status: CartStatus
  cart_added_at?: string
  external_order_id?: string
  created_at: string
  updated_at: string
}