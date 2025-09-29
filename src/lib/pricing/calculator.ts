// 핵심 가격 계산 엔진
import {
  PriceCalculationRequest,
  PriceCalculationResponse,
  PriceBreakdown,
  VolumeCalculation,
  PriceCalculator,
  MaterialType,
  FIXED_COSTS,
  PriceCalculationError
} from '@/types/pricing'
import { pricingPolicyManager } from './policies'

export class ConfiguratorPriceCalculator implements PriceCalculator {
  /**
   * 비동기 가격 계산 (DB에서 가격 정책 조회)
   */
  async calculatePrice(request: PriceCalculationRequest): Promise<PriceCalculationResponse> {
    this.validateRequest(request)

    try {
      // 1. 부피 계산
      const volume = this.calculateVolume(request)

      // 2. 재료 정책 조회
      const policy = await pricingPolicyManager.getPolicyByMaterial(request.material)

      // 3. 가격 계산
      const breakdown = this.calculatePriceBreakdown(volume, policy.base_price_per_m3, policy.price_modifier, request.material)

      // 4. 응답 구성
      return {
        base_price: breakdown.base_cost,
        material_cost: breakdown.material_cost,
        shipping_cost: breakdown.shipping_cost,
        subtotal: breakdown.subtotal,
        tax: breakdown.tax,
        total: breakdown.total,
        volume_m3: breakdown.volume_m3,
        material_info: {
          type: request.material,
          modifier: policy.price_modifier
        },
        breakdown,
        calculated_at: new Date().toISOString()
      }
    } catch (error) {
      console.error('Price calculation error:', error)
      throw new PriceCalculationError(
        'Failed to calculate price',
        'CALCULATION_FAILED',
        error
      )
    }
  }

  /**
   * 동기 가격 계산 (기본값 사용, 빠른 응답)
   */
  calculatePriceSync(request: PriceCalculationRequest): PriceCalculationResponse {
    this.validateRequest(request)

    try {
      // 1. 부피 계산
      const volume = this.calculateVolume(request)

      // 2. 기본 재료 정책 사용
      const { basePrice, modifier } = this.getDefaultMaterialConfig(request.material)

      // 3. 가격 계산
      const breakdown = this.calculatePriceBreakdown(volume, basePrice, modifier, request.material)

      // 4. 응답 구성
      return {
        base_price: breakdown.base_cost,
        material_cost: breakdown.material_cost,
        shipping_cost: breakdown.shipping_cost,
        subtotal: breakdown.subtotal,
        tax: breakdown.tax,
        total: breakdown.total,
        volume_m3: breakdown.volume_m3,
        material_info: {
          type: request.material,
          modifier
        },
        breakdown,
        calculated_at: new Date().toISOString()
      }
    } catch (error) {
      console.error('Sync price calculation error:', error)
      throw new PriceCalculationError(
        'Failed to calculate price synchronously',
        'CALCULATION_FAILED',
        error
      )
    }
  }

  /**
   * 부피 계산 (cm → m³)
   */
  private calculateVolume(request: PriceCalculationRequest): VolumeCalculation {
    const { width_cm, depth_cm, height_cm } = request

    // cm → m 변환
    const width_m = width_cm / 100
    const depth_m = depth_cm / 100
    const height_m = height_cm / 100

    // 부피 계산 (m³)
    const volume_m3 = width_m * depth_m * height_m

    return {
      width_m,
      depth_m,
      height_m,
      volume_m3: Number(volume_m3.toFixed(6)) // 소수점 6자리로 정밀도 제한
    }
  }

  /**
   * 가격 세부 계산
   * 공식: 부피 × 기본단가 × 재료배수 + 고정비 + 부가세
   */
  private calculatePriceBreakdown(
    volume: VolumeCalculation,
    basePricePerM3: number,
    priceModifier: number,
    materialType: MaterialType
  ): PriceBreakdown {
    // 재료비 계산: 부피 × 기본단가 × 재료배수
    const material_cost = Math.round(volume.volume_m3 * basePricePerM3 * priceModifier)

    // 고정비
    const base_cost = FIXED_COSTS.BASE_MANUFACTURING
    const shipping_cost = FIXED_COSTS.SHIPPING

    // 소계 (재료비 + 고정비)
    const subtotal = material_cost + base_cost + shipping_cost

    // 부가세 (10%)
    const tax = Math.round(subtotal * FIXED_COSTS.TAX_RATE)

    // 총액
    const total = subtotal + tax

    return {
      volume_m3: volume.volume_m3,
      base_cost,
      material_cost,
      shipping_cost,
      subtotal,
      tax,
      total,
      material_info: {
        type: materialType,
        modifier: priceModifier,
        base_price_per_m3: basePricePerM3
      }
    }
  }

  /**
   * 요청 데이터 검증
   */
  private validateRequest(request: PriceCalculationRequest): void {
    const { width_cm, depth_cm, height_cm, material } = request

    // 치수 검증
    if (width_cm <= 0 || depth_cm <= 0 || height_cm <= 0) {
      throw new PriceCalculationError(
        'Invalid dimensions: all dimensions must be positive',
        'INVALID_DIMENSIONS',
        { width_cm, depth_cm, height_cm }
      )
    }

    // 최대 치수 제한 (안전성)
    const MAX_DIMENSION = 1000 // 10m
    if (width_cm > MAX_DIMENSION || depth_cm > MAX_DIMENSION || height_cm > MAX_DIMENSION) {
      throw new PriceCalculationError(
        'Dimensions too large',
        'INVALID_DIMENSIONS',
        { max_allowed: MAX_DIMENSION, provided: { width_cm, depth_cm, height_cm } }
      )
    }

    // 재료 타입 검증
    const validMaterials: MaterialType[] = ['wood', 'mdf', 'steel', 'metal', 'glass', 'fabric']
    if (!validMaterials.includes(material)) {
      throw new PriceCalculationError(
        `Invalid material type: ${material}`,
        'MATERIAL_NOT_FOUND',
        { validMaterials, provided: material }
      )
    }
  }

  /**
   * 기본 재료 설정 조회 (캐시 실패시 fallback)
   */
  private getDefaultMaterialConfig(material: MaterialType): { basePrice: number; modifier: number } {
    const materialDefaults = {
      wood: { basePrice: 50000, modifier: 1.0 },
      mdf: { basePrice: 50000, modifier: 0.8 },
      steel: { basePrice: 50000, modifier: 1.15 },
      metal: { basePrice: 50000, modifier: 1.5 },
      glass: { basePrice: 50000, modifier: 2.0 },
      fabric: { basePrice: 50000, modifier: 0.8 },
    }

    return materialDefaults[material]
  }

  /**
   * 가격 정책 조회 (PriceCalculator 인터페이스 구현)
   */
  async getPricingPolicies() {
    return pricingPolicyManager.getPricingPolicies()
  }

  /**
   * 가격 정책 업데이트 (PriceCalculator 인터페이스 구현)
   */
  async updatePricingPolicy(policy: Parameters<typeof pricingPolicyManager.updatePricingPolicy>[0]) {
    return pricingPolicyManager.updatePricingPolicy(policy)
  }
}

// 싱글톤 인스턴스 내보내기
export const priceCalculator = new ConfiguratorPriceCalculator()

// 유틸리티 함수들
export const PriceUtils = {
  /**
   * KRW 통화 포맷팅
   */
  formatKRW(amount: number): string {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  },

  /**
   * 부피를 사용자 친화적 형태로 포맷팅
   */
  formatVolume(volume_m3: number): string {
    if (volume_m3 < 0.001) {
      return `${(volume_m3 * 1000000).toFixed(0)}cm³`
    }
    return `${volume_m3.toFixed(3)}m³`
  },

  /**
   * 가격 변경 계산 (이전 가격 대비)
   */
  calculatePriceChange(currentPrice: number, previousPrice: number): {
    amount: number
    percentage: number
    type: 'increase' | 'decrease' | 'same'
  } {
    const amount = currentPrice - previousPrice
    const percentage = previousPrice > 0 ? (amount / previousPrice) * 100 : 0

    let type: 'increase' | 'decrease' | 'same' = 'same'
    if (amount > 0) type = 'increase'
    else if (amount < 0) type = 'decrease'

    return {
      amount: Math.abs(amount),
      percentage: Math.abs(percentage),
      type
    }
  }
}