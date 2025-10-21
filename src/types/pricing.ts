// 가격 계산 시스템 전용 타입 정의

export type MaterialType = 'wood' | 'mdf' | 'steel' | 'metal' | 'glass' | 'fabric'
export type FinishType = 'matte' | 'glossy' | 'satin'
export type TierType = 'free' | 'premium' | 'vip'

export interface PricingPolicy {
  id: string
  material_type: MaterialType
  base_price_per_m3: number // m³당 기본 단가 (KRW)
  price_modifier: number // 가격 배수
  is_active: boolean
  legacy_material: boolean // 기존 재료 구분 (wood/mdf/steel)
  created_at: string
  updated_at: string
}

export interface PriceCalculationRequest {
  width_cm: number
  depth_cm: number
  height_cm: number
  material: MaterialType
  options?: Record<string, any>
  // API 확장 필드(선택): 서버 스키마와 호환
  use_cache?: boolean
  estimate_only?: boolean
}

export interface PriceBreakdown {
  volume_m3: number // 계산된 부피 (m³)
  base_cost: number // 기본 제작비
  material_cost: number // 재료비 (부피 × 단가 × 배수)
  shipping_cost: number // 배송비
  subtotal: number // 소계
  tax: number // 부가세 (10%)
  total: number // 총액
  material_info: {
    type: MaterialType
    modifier: number
    base_price_per_m3: number
  }
}

export interface PriceCalculationResponse {
  base_price: number // 기본 제작비
  material_cost: number // 재료비
  shipping_cost: number // 배송비
  subtotal: number // 소계
  tax: number // 부가세
  total: number // 총액
  volume_m3: number // 계산된 부피
  material_info: {
    type: MaterialType
    modifier: number
  }
  breakdown: PriceBreakdown
  calculated_at: string // 계산 시간
}

// 가격 계산 엔진 인터페이스
export interface PriceCalculator {
  calculatePrice(request: PriceCalculationRequest): Promise<PriceCalculationResponse>
  calculatePriceSync(request: PriceCalculationRequest): PriceCalculationResponse
  getPricingPolicies(): Promise<PricingPolicy[]>
  updatePricingPolicy(policy: Partial<PricingPolicy> & Pick<PricingPolicy, 'id'>): Promise<void>
}

// 재료별 기본 설정값
export const MATERIAL_DEFAULTS: Record<MaterialType, { basePrice: number; modifier: number; legacy: boolean }> = {
  // 기존 재료 (Story 2.1에서 구현됨)
  wood: { basePrice: 50000, modifier: 1.0, legacy: true },
  mdf: { basePrice: 50000, modifier: 0.8, legacy: true },
  steel: { basePrice: 50000, modifier: 1.15, legacy: true },

  // 신규 재료 (Story 2.2에서 추가)
  metal: { basePrice: 50000, modifier: 1.5, legacy: false },
  glass: { basePrice: 50000, modifier: 2.0, legacy: false },
  fabric: { basePrice: 50000, modifier: 0.8, legacy: false },
}

// 고정비 설정
export const FIXED_COSTS = {
  BASE_MANUFACTURING: 50000, // 기본 제작비 (KRW)
  SHIPPING: 30000, // 배송비 (KRW)
  TAX_RATE: 0.1, // 부가세율 (10%)
} as const

// 표준화된 가격 산식 상수 (Story 2.3A.2)
export const BASE_PRICE_KRW = 50_000
export const SIZE_MULTIPLIER = 1_000
export const MATERIAL_MULTIPLIERS: Record<MaterialType, number> = {
  wood: 1.0,
  mdf: 0.8,
  steel: 1.15,
  metal: 1.5,
  glass: 2.0,
  fabric: 0.8,
}
export const FINISH_MULTIPLIERS: Record<FinishType, number> = {
  matte: 1.0,
  glossy: 1.2,
  satin: 1.1,
}
export const TIER_MULTIPLIERS: Record<TierType, number> = {
  free: 1.0,
  premium: 0.95,
  vip: 0.90,
}

// 표준화된 DTO (Story 2.3A.2)
export interface PriceCalculationRequestV2 {
  width_cm: number
  depth_cm: number
  height_cm: number
  material: MaterialType
  finish: FinishType
  tier: TierType
  quantity: number
}

export interface PriceCalculationResponseV2 {
  volume_m3: number
  components: {
    base: number
    size: number
    material: number
    finish: number
    tier: number
  }
  unit_price: number
  quantity: number
  line_total: number
  currency: 'KRW'
}

// 가격 계산 유틸리티 타입
export interface VolumeCalculation {
  width_m: number
  depth_m: number
  height_m: number
  volume_m3: number
}

// 에러 타입
export class PriceCalculationError extends Error {
  constructor(
    message: string,
    public code: 'INVALID_DIMENSIONS' | 'MATERIAL_NOT_FOUND' | 'CALCULATION_FAILED',
    public details?: any
  ) {
    super(message)
    this.name = 'PriceCalculationError'
  }
}
