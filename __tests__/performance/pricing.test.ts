/**
 * @jest-environment node
 */

import { ConfiguratorPriceCalculator } from '@/lib/pricing'
import type { PriceCalculationRequest, MaterialType } from '@/types/pricing'

describe('Pricing Performance Tests', () => {
  let calculator: ConfiguratorPriceCalculator

  beforeEach(() => {
    calculator = new ConfiguratorPriceCalculator()
  })

  describe('Single calculation performance', () => {
    it('should calculate price within 50ms (sync)', () => {
      const request: PriceCalculationRequest = {
        width_cm: 120,
        depth_cm: 60,
        height_cm: 75,
        material: 'wood'
      }

      const iterations = 100
      const startTime = performance.now()

      for (let i = 0; i < iterations; i++) {
        calculator.calculatePriceSync(request)
      }

      const endTime = performance.now()
      const averageTime = (endTime - startTime) / iterations

      expect(averageTime).toBeLessThan(50) // 50ms 이내
    })

    it('should handle complex calculations efficiently', () => {
      const complexRequests: PriceCalculationRequest[] = [
        { width_cm: 345.67, depth_cm: 123.45, height_cm: 289.12, material: 'glass' },
        { width_cm: 999.99, depth_cm: 299.99, height_cm: 199.99, material: 'metal' },
        { width_cm: 1.5, depth_cm: 2.3, height_cm: 4.7, material: 'fabric' }
      ]

      complexRequests.forEach(request => {
        const startTime = performance.now()

        const result = calculator.calculatePriceSync(request)

        const endTime = performance.now()
        const calculationTime = endTime - startTime

        expect(calculationTime).toBeLessThan(10) // 10ms 이내
        expect(result.total).toBeGreaterThan(0)
      })
    })
  })

  describe('Batch calculation performance', () => {
    it('should handle multiple materials efficiently', () => {
      const materials: MaterialType[] = ['wood', 'mdf', 'steel', 'metal', 'glass', 'fabric']
      const baseDimensions = { width_cm: 120, depth_cm: 60, height_cm: 75 }

      const startTime = performance.now()

      const results = materials.map(material => {
        return calculator.calculatePriceSync({
          ...baseDimensions,
          material
        })
      })

      const endTime = performance.now()
      const totalTime = endTime - startTime

      expect(totalTime).toBeLessThan(100) // 100ms 이내
      expect(results).toHaveLength(6)
      results.forEach(result => {
        expect(result.total).toBeGreaterThan(0)
      })
    })

    it('should scale linearly with request count', () => {
      const baseRequest: PriceCalculationRequest = {
        width_cm: 100,
        depth_cm: 100,
        height_cm: 100,
        material: 'wood'
      }

      const testSizes = [10, 50, 100, 200]
      const results: { size: number; time: number; perRequest: number }[] = []

      testSizes.forEach(size => {
        const requests = Array(size).fill(baseRequest)

        const startTime = performance.now()

        requests.forEach(req => calculator.calculatePriceSync(req))

        const endTime = performance.now()
        const totalTime = endTime - startTime
        const timePerRequest = totalTime / size

        results.push({
          size,
          time: totalTime,
          perRequest: timePerRequest
        })

        // 개별 요청당 시간이 5ms를 초과하지 않아야 함
        expect(timePerRequest).toBeLessThan(5)
      })

      // 선형 확장성 검증
      for (let i = 1; i < results.length; i++) {
        const current = results[i]
        const previous = results[i - 1]

        // 크기가 2배 증가할 때 시간도 대략 2배 증가해야 함 (허용 오차 50%)
        const sizeRatio = current.size / previous.size
        const timeRatio = current.time / previous.time

        expect(timeRatio).toBeLessThan(sizeRatio * 1.5)
        expect(timeRatio).toBeGreaterThan(sizeRatio * 0.5)
      }
    })
  })

  describe('Memory usage optimization', () => {
    it('should not cause memory leaks with repeated calculations', () => {
      const request: PriceCalculationRequest = {
        width_cm: 120,
        depth_cm: 60,
        height_cm: 75,
        material: 'wood'
      }

      // 초기 메모리 사용량 측정 (Node.js에서만 가능)
      const initialMemory = process.memoryUsage().heapUsed

      // 대량 계산 수행
      for (let i = 0; i < 10000; i++) {
        calculator.calculatePriceSync({
          ...request,
          width_cm: 100 + (i % 100), // 다양한 치수로 테스트
          material: (['wood', 'mdf', 'steel'] as const)[i % 3]
        })
      }

      // 가비지 컬렉션 강제 실행 (가능한 경우)
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory

      // 메모리 증가가 10MB를 초과하지 않아야 함
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
    })

    it('should handle large dimension values efficiently', () => {
      const largeRequests: PriceCalculationRequest[] = [
        { width_cm: 999, depth_cm: 999, height_cm: 299, material: 'wood' },
        { width_cm: 500, depth_cm: 500, height_cm: 300, material: 'metal' },
        { width_cm: 800, depth_cm: 400, height_cm: 250, material: 'glass' }
      ]

      largeRequests.forEach(request => {
        const startTime = performance.now()

        const result = calculator.calculatePriceSync(request)

        const endTime = performance.now()
        const calculationTime = endTime - startTime

        expect(calculationTime).toBeLessThan(20) // 20ms 이내
        expect(result.total).toBeGreaterThan(0)
        expect(result.volume_m3).toBeGreaterThan(0)
      })
    })
  })

  describe('Precision and accuracy under load', () => {
    it('should maintain calculation accuracy under stress', () => {
      const referenceRequest: PriceCalculationRequest = {
        width_cm: 120,
        depth_cm: 60,
        height_cm: 75,
        material: 'wood'
      }

      // 기준 결과 계산
      const referenceResult = calculator.calculatePriceSync(referenceRequest)

      // 동일한 계산을 여러 번 수행하여 일관성 검증
      for (let i = 0; i < 1000; i++) {
        const result = calculator.calculatePriceSync(referenceRequest)

        expect(result.total).toBe(referenceResult.total)
        expect(result.volume_m3).toBe(referenceResult.volume_m3)
        expect(result.material_cost).toBe(referenceResult.material_cost)
      }
    })

    it('should handle edge cases without performance degradation', () => {
      const edgeCases: PriceCalculationRequest[] = [
        { width_cm: 1, depth_cm: 1, height_cm: 1, material: 'wood' }, // 최소값
        { width_cm: 1000, depth_cm: 1000, height_cm: 300, material: 'glass' }, // 최대값
        { width_cm: 123.456, depth_cm: 78.901, height_cm: 234.567, material: 'metal' } // 소수점
      ]

      edgeCases.forEach(request => {
        const iterations = 100
        const startTime = performance.now()

        for (let i = 0; i < iterations; i++) {
          const result = calculator.calculatePriceSync(request)
          expect(result.total).toBeGreaterThan(0)
        }

        const endTime = performance.now()
        const averageTime = (endTime - startTime) / iterations

        expect(averageTime).toBeLessThan(10) // 10ms 이내
      })
    })
  })

  describe('Concurrent calculation simulation', () => {
    it('should handle simulated concurrent requests', async () => {
      const requests: PriceCalculationRequest[] = Array(20).fill(null).map((_, i) => ({
        width_cm: 100 + i,
        depth_cm: 50 + i,
        height_cm: 70 + i,
        material: (['wood', 'mdf', 'steel', 'metal'] as const)[i % 4]
      }))

      const startTime = performance.now()

      // 동시 계산 시뮬레이션 (실제로는 동기 함수이므로 순차 실행)
      const results = await Promise.all(
        requests.map(request =>
          Promise.resolve(calculator.calculatePriceSync(request))
        )
      )

      const endTime = performance.now()
      const totalTime = endTime - startTime

      expect(totalTime).toBeLessThan(500) // 500ms 이내
      expect(results).toHaveLength(20)

      results.forEach((result, index) => {
        expect(result.total).toBeGreaterThan(0)
        expect(result.material_info.type).toBe(requests[index].material)
      })
    })
  })

  describe('CPU-intensive operations', () => {
    it('should perform well with complex calculations', () => {
      const complexCalculations = () => {
        let totalTime = 0
        const iterations = 500

        for (let i = 0; i < iterations; i++) {
          const request: PriceCalculationRequest = {
            width_cm: Math.random() * 900 + 100, // 100-1000 범위
            depth_cm: Math.random() * 900 + 100,
            height_cm: Math.random() * 250 + 50, // 50-300 범위
            material: (['wood', 'mdf', 'steel', 'metal', 'glass', 'fabric'] as const)[
              Math.floor(Math.random() * 6)
            ]
          }

          const startTime = performance.now()
          calculator.calculatePriceSync(request)
          const endTime = performance.now()

          totalTime += (endTime - startTime)
        }

        return totalTime / iterations
      }

      const averageTime = complexCalculations()

      expect(averageTime).toBeLessThan(5) // 평균 5ms 이내
    })

    it('should maintain performance with varying load patterns', () => {
      const loadPatterns = [
        { requests: 10, description: 'light load' },
        { requests: 100, description: 'medium load' },
        { requests: 500, description: 'heavy load' }
      ]

      loadPatterns.forEach(({ requests, description }) => {
        const startTime = performance.now()

        for (let i = 0; i < requests; i++) {
          calculator.calculatePriceSync({
            width_cm: 120,
            depth_cm: 60,
            height_cm: 75,
            material: 'wood'
          })
        }

        const endTime = performance.now()
        const totalTime = endTime - startTime
        const timePerRequest = totalTime / requests

        console.log(`${description}: ${timePerRequest.toFixed(2)}ms per request`)

        // 요청당 시간이 로드에 관계없이 일정해야 함
        expect(timePerRequest).toBeLessThan(10)
      })
    })
  })
})

describe('API Performance Benchmarks', () => {
  // 실제 API 성능은 네트워크와 서버 상태에 따라 달라지므로
  // 여기서는 시뮬레이션된 테스트만 수행

  it('should simulate 500ms response time requirement', async () => {
    const mockApiCall = async (request: PriceCalculationRequest) => {
      // 네트워크 지연 시뮬레이션 (10-50ms)
      const networkDelay = Math.random() * 40 + 10
      await new Promise(resolve => setTimeout(resolve, networkDelay))

      // 실제 계산
      const calculator = new ConfiguratorPriceCalculator()
      return calculator.calculatePriceSync(request)
    }

    const request: PriceCalculationRequest = {
      width_cm: 120,
      depth_cm: 60,
      height_cm: 75,
      material: 'wood'
    }

    const startTime = performance.now()
    const result = await mockApiCall(request)
    const endTime = performance.now()

    const responseTime = endTime - startTime

    expect(responseTime).toBeLessThan(500) // 500ms 이내
    expect(result.total).toBeGreaterThan(0)
  })

  it('should handle burst requests efficiently', async () => {
    const burstSize = 10
    const requests: PriceCalculationRequest[] = Array(burstSize).fill(null).map((_, i) => ({
      width_cm: 100 + i * 10,
      depth_cm: 50 + i * 5,
      height_cm: 70 + i * 3,
      material: (['wood', 'metal', 'glass'] as const)[i % 3]
    }))

    const calculator = new ConfiguratorPriceCalculator()

    const startTime = performance.now()

    const results = await Promise.all(
      requests.map(async (request) => {
        // 작은 지연으로 실제 API 호출 시뮬레이션
        await new Promise(resolve => setTimeout(resolve, Math.random() * 20))
        return calculator.calculatePriceSync(request)
      })
    )

    const endTime = performance.now()
    const totalTime = endTime - startTime

    expect(totalTime).toBeLessThan(1000) // 1초 이내
    expect(results).toHaveLength(burstSize)

    results.forEach(result => {
      expect(result.total).toBeGreaterThan(0)
    })
  })
})