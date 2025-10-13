/**
 * @jest-environment node
 */

import { ConfiguratorPriceCalculator, PriceUtils } from '@/lib/pricing'
import { PriceCalculationError, PriceCalculationRequest } from '@/types/pricing'

describe('ConfiguratorPriceCalculator', () => {
  let calculator: ConfiguratorPriceCalculator

  beforeEach(() => {
    calculator = new ConfiguratorPriceCalculator()
  })

  describe('calculatePriceSync', () => {
    it('should calculate correct price for wood material', () => {
      const request: PriceCalculationRequest = {
        width_cm: 120,
        depth_cm: 60,
        height_cm: 75,
        material: 'wood'
      }

      const result = calculator.calculatePriceSync(request)

      // 부피: 1.2 × 0.6 × 0.75 = 0.54 m³
      expect(result.volume_m3).toBe(0.54)

      // 재료비: 0.54m³ × 50,000원 × 1.0 = 27,000원
      expect(result.material_cost).toBe(27000)

      // 총액: 재료비 27,000 + 기본비 50,000 + 배송비 30,000 + 부가세 10,700 = 117,700원
      expect(result.total).toBe(117700)

      // 재료 정보 확인
      expect(result.material_info.type).toBe('wood')
      expect(result.material_info.modifier).toBe(1.0)
    })

    it('should calculate correct price for MDF material with discount', () => {
      const request: PriceCalculationRequest = {
        width_cm: 100,
        depth_cm: 50,
        height_cm: 70,
        material: 'mdf'
      }

      const result = calculator.calculatePriceSync(request)

      // 부피: 1.0 × 0.5 × 0.7 = 0.35 m³
      expect(result.volume_m3).toBe(0.35)

      // 재료비: 0.35m³ × 50,000원 × 0.8 = 14,000원
      expect(result.material_cost).toBe(14000)

      // MDF 배수 확인
      expect(result.material_info.modifier).toBe(0.8)
    })

    it('should calculate correct price for premium materials', () => {
      const testCases = [
        { material: 'steel' as const, modifier: 1.15 },
        { material: 'metal' as const, modifier: 1.5 },
        { material: 'glass' as const, modifier: 2.0 },
        { material: 'fabric' as const, modifier: 0.8 }
      ]

      testCases.forEach(({ material, modifier }) => {
        const request: PriceCalculationRequest = {
          width_cm: 100,
          depth_cm: 100,
          height_cm: 80,
          material
        }

        const result = calculator.calculatePriceSync(request)

        // 부피: 1.0 × 1.0 × 0.8 = 0.8 m³
        expect(result.volume_m3).toBe(0.8)

        // 재료비 확인
        const expectedMaterialCost = Math.round(0.8 * 50000 * modifier)
        expect(result.material_cost).toBe(expectedMaterialCost)

        // 재료 정보 확인
        expect(result.material_info.type).toBe(material)
        expect(result.material_info.modifier).toBe(modifier)
      })
    })

    it('should include correct fixed costs', () => {
      const request: PriceCalculationRequest = {
        width_cm: 50,
        depth_cm: 50,
        height_cm: 50,
        material: 'wood'
      }

      const result = calculator.calculatePriceSync(request)

      // 고정비 확인
      expect(result.base_price).toBe(50000) // 기본 제작비
      expect(result.shipping_cost).toBe(30000) // 배송비

      // 부가세 계산 확인 (10%)
      const expectedSubtotal = result.material_cost + 50000 + 30000
      const expectedTax = Math.round(expectedSubtotal * 0.1)
      expect(result.tax).toBe(expectedTax)
    })

    it('should validate input dimensions', () => {
      const invalidRequests = [
        {
          width_cm: 0,
          depth_cm: 100,
          height_cm: 100,
          material: 'wood' as const
        },
        {
          width_cm: 100,
          depth_cm: -50,
          height_cm: 100,
          material: 'wood' as const
        },
        {
          width_cm: 100,
          depth_cm: 100,
          height_cm: 1500, // 너무 큰 값
          material: 'wood' as const
        }
      ]

      invalidRequests.forEach(request => {
        expect(() => calculator.calculatePriceSync(request))
          .toThrow(PriceCalculationError)
      })
    })

    it('should validate material types', () => {
      const request = {
        width_cm: 100,
        depth_cm: 100,
        height_cm: 100,
        material: 'invalid_material' as any
      }

      expect(() => calculator.calculatePriceSync(request))
        .toThrow(PriceCalculationError)
    })

    it('should handle small dimensions correctly', () => {
      const request: PriceCalculationRequest = {
        width_cm: 10,
        depth_cm: 10,
        height_cm: 10,
        material: 'wood'
      }

      const result = calculator.calculatePriceSync(request)

      // 부피: 0.1 × 0.1 × 0.1 = 0.001 m³
      expect(result.volume_m3).toBe(0.001)

      // 아주 작은 부피에 대해서도 최소 고정비는 적용
      expect(result.total).toBeGreaterThan(80000) // 기본비 + 배송비 + 부가세
    })

    it('should handle large dimensions correctly', () => {
      const request: PriceCalculationRequest = {
        width_cm: 500,
        depth_cm: 300,
        height_cm: 200,
        material: 'glass' // 가장 비싼 재료
      }

      const result = calculator.calculatePriceSync(request)

      // 부피: 5.0 × 3.0 × 2.0 = 30 m³
      expect(result.volume_m3).toBe(30)

      // 유리 재료비: 30m³ × 50,000원 × 2.0 = 3,000,000원
      expect(result.material_cost).toBe(3000000)

      // 총액이 합리적인 범위인지 확인
      expect(result.total).toBeGreaterThan(3000000)
      expect(result.total).toBeLessThan(4000000)
    })
  })

  describe('Volume calculations', () => {
    it('should calculate volume with correct precision', () => {
      const request: PriceCalculationRequest = {
        width_cm: 123,
        depth_cm: 67,
        height_cm: 89,
        material: 'wood'
      }

      const result = calculator.calculatePriceSync(request)

      // 예상 부피: 1.23 × 0.67 × 0.89 ≈ 0.733449 m³
      expect(result.volume_m3).toBeCloseTo(0.733449, 6)
    })

    it('should handle decimal precision consistently', () => {
      const requests = [
        { width_cm: 100.5, depth_cm: 200.7, height_cm: 150.3, material: 'wood' as const },
        { width_cm: 99.9, depth_cm: 199.1, height_cm: 149.8, material: 'wood' as const }
      ]

      requests.forEach(request => {
        const result = calculator.calculatePriceSync(request)

        // 부피가 정확히 계산되는지 확인
        const expectedVolume = (request.width_cm * request.depth_cm * request.height_cm) / 1000000
        expect(result.volume_m3).toBeCloseTo(expectedVolume, 6)
      })
    })
  })
})

describe('PriceUtils', () => {
  describe('formatKRW', () => {
    it('should format Korean currency correctly', () => {
      expect(PriceUtils.formatKRW(100000)).toBe('₩100,000')
      expect(PriceUtils.formatKRW(1234567)).toBe('₩1,234,567')
      expect(PriceUtils.formatKRW(0)).toBe('₩0')
      expect(PriceUtils.formatKRW(999)).toBe('₩999')
    })
  })

  describe('formatVolume', () => {
    it('should format volume appropriately', () => {
      expect(PriceUtils.formatVolume(0.001)).toBe('0.001m³')
      expect(PriceUtils.formatVolume(0.0005)).toBe('500cm³')
      expect(PriceUtils.formatVolume(0.000001)).toBe('1cm³')
      expect(PriceUtils.formatVolume(1.234567)).toBe('1.235m³')
    })
  })

  describe('calculatePriceChange', () => {
    it('should calculate price increases correctly', () => {
      const result = PriceUtils.calculatePriceChange(110000, 100000)

      expect(result.type).toBe('increase')
      expect(result.amount).toBe(10000)
      expect(result.percentage).toBe(10)
    })

    it('should calculate price decreases correctly', () => {
      const result = PriceUtils.calculatePriceChange(90000, 100000)

      expect(result.type).toBe('decrease')
      expect(result.amount).toBe(10000)
      expect(result.percentage).toBe(10)
    })

    it('should handle same prices', () => {
      const result = PriceUtils.calculatePriceChange(100000, 100000)

      expect(result.type).toBe('same')
      expect(result.amount).toBe(0)
      expect(result.percentage).toBe(0)
    })

    it('should handle zero previous price', () => {
      const result = PriceUtils.calculatePriceChange(100000, 0)

      expect(result.type).toBe('increase')
      expect(result.amount).toBe(100000)
      expect(result.percentage).toBe(0)
    })
  })
})

describe('Error handling', () => {
  let calculator: ConfiguratorPriceCalculator

  beforeEach(() => {
    calculator = new ConfiguratorPriceCalculator()
  })

  it('should throw PriceCalculationError for invalid inputs', () => {
    const invalidRequest: PriceCalculationRequest = {
      width_cm: -100,
      depth_cm: 100,
      height_cm: 100,
      material: 'wood'
    }

    expect(() => calculator.calculatePriceSync(invalidRequest))
      .toThrow(PriceCalculationError)

    try {
      calculator.calculatePriceSync(invalidRequest)
    } catch (error) {
      expect(error).toBeInstanceOf(PriceCalculationError)
      expect((error as PriceCalculationError).code).toBe('INVALID_DIMENSIONS')
    }
  })

  it('should provide detailed error information', () => {
    const invalidRequest: PriceCalculationRequest = {
      width_cm: 100,
      depth_cm: 100,
      height_cm: 100,
      material: 'invalid' as any
    }

    try {
      calculator.calculatePriceSync(invalidRequest)
    } catch (error) {
      expect(error).toBeInstanceOf(PriceCalculationError)
      expect((error as PriceCalculationError).code).toBe('MATERIAL_NOT_FOUND')
      expect((error as PriceCalculationError).details).toBeDefined()
    }
  })
})
