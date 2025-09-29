// 가격 계산 시스템 통합 인덱스
export * from './calculator'
export * from './policies'
export * from '@/types/pricing'

import { priceCalculator } from './calculator'
import { pricingPolicyManager } from './policies'
import {
  PriceCalculationRequest,
  PriceCalculationResponse,
  MaterialType,
  MATERIAL_DEFAULTS
} from '@/types/pricing'

/**
 * 간편 가격 계산 함수들
 */
export const PricingAPI = {
  /**
   * 실시간 가격 계산 (권장 방법)
   */
  async calculatePrice(request: PriceCalculationRequest): Promise<PriceCalculationResponse> {
    return priceCalculator.calculatePrice(request)
  },

  /**
   * 빠른 가격 추정 (기본값 사용)
   */
  calculatePriceEstimate(request: PriceCalculationRequest): PriceCalculationResponse {
    return priceCalculator.calculatePriceSync(request)
  },

  /**
   * 여러 옵션 조합에 대한 일괄 가격 계산
   */
  async calculateMultiplePrices(requests: PriceCalculationRequest[]): Promise<PriceCalculationResponse[]> {
    return Promise.all(requests.map(request => priceCalculator.calculatePrice(request)))
  },

  /**
   * 재료별 가격 비교 (동일 치수)
   */
  async compareMaterialPrices(dimensions: {
    width_cm: number
    depth_cm: number
    height_cm: number
  }): Promise<Record<MaterialType, PriceCalculationResponse>> {
    const materials: MaterialType[] = ['wood', 'mdf', 'steel', 'metal', 'glass', 'fabric']
    const results: Record<string, PriceCalculationResponse> = {}

    await Promise.all(
      materials.map(async (material) => {
        try {
          const price = await priceCalculator.calculatePrice({
            ...dimensions,
            material
          })
          results[material] = price
        } catch (error) {
          console.error(`Failed to calculate price for ${material}:`, error)
        }
      })
    )

    return results as Record<MaterialType, PriceCalculationResponse>
  },

  /**
   * 치수 범위별 가격 시뮬레이션
   */
  async simulatePriceRange(
    material: MaterialType,
    dimensionRange: {
      width_cm: { min: number; max: number; step: number }
      depth_cm: { min: number; max: number; step: number }
      height_cm: { min: number; max: number; step: number }
    }
  ): Promise<Array<PriceCalculationResponse & { dimensions: { width_cm: number; depth_cm: number; height_cm: number } }>> {
    const results: Array<PriceCalculationResponse & { dimensions: { width_cm: number; depth_cm: number; height_cm: number } }> = []

    for (let width = dimensionRange.width_cm.min; width <= dimensionRange.width_cm.max; width += dimensionRange.width_cm.step) {
      for (let depth = dimensionRange.depth_cm.min; depth <= dimensionRange.depth_cm.max; depth += dimensionRange.depth_cm.step) {
        for (let height = dimensionRange.height_cm.min; height <= dimensionRange.height_cm.max; height += dimensionRange.height_cm.step) {
          try {
            const price = await priceCalculator.calculatePrice({
              width_cm: width,
              depth_cm: depth,
              height_cm: height,
              material
            })

            results.push({
              ...price,
              dimensions: { width_cm: width, depth_cm: depth, height_cm: height }
            })
          } catch (error) {
            console.error(`Failed to calculate price for dimensions ${width}x${depth}x${height}:`, error)
          }
        }
      }
    }

    return results
  },

  /**
   * 가격 정책 관리
   */
  policies: {
    async getAll() {
      return pricingPolicyManager.getPricingPolicies()
    },

    async getByMaterial(material: MaterialType) {
      return pricingPolicyManager.getPolicyByMaterial(material)
    },

    async update(policy: Parameters<typeof pricingPolicyManager.updatePricingPolicy>[0]) {
      return pricingPolicyManager.updatePricingPolicy(policy)
    },

    async initialize() {
      return pricingPolicyManager.initializeDefaultPolicies()
    }
  }
}

/**
 * 가격 계산 훅을 위한 유틸리티
 */
export const PriceCalculationUtils = {
  /**
   * 요청 객체 생성 헬퍼
   */
  createRequest(
    width_cm: number,
    depth_cm: number,
    height_cm: number,
    material: MaterialType,
    options?: Record<string, any>
  ): PriceCalculationRequest {
    return {
      width_cm,
      depth_cm,
      height_cm,
      material,
      options
    }
  },

  /**
   * 기본 재료 목록
   */
  getAvailableMaterials(): MaterialType[] {
    return Object.keys(MATERIAL_DEFAULTS) as MaterialType[]
  },

  /**
   * 재료 정보 조회
   */
  getMaterialInfo(material: MaterialType) {
    return MATERIAL_DEFAULTS[material]
  },

  /**
   * 가격 응답 유효성 검증
   */
  isValidPriceResponse(response: any): response is PriceCalculationResponse {
    return (
      response &&
      typeof response.total === 'number' &&
      typeof response.volume_m3 === 'number' &&
      response.material_info &&
      response.breakdown
    )
  }
}

// 기본 내보내기
export { priceCalculator, pricingPolicyManager }