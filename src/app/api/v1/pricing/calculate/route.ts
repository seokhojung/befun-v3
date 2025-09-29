// 실시간 가격 계산 API 엔드포인트 (Story 2.2)
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSuccessResponse, createErrorResponse, withErrorHandling } from '@/lib/api/errors'
import { validateRequestBody, CommonSchemas } from '@/lib/api/validation'
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api/rate-limiter'
import { processApiVersion } from '@/lib/api/version'
import { RequestTimer, logger } from '@/lib/api/logger'
import { PricingAPI, PriceCalculationError } from '@/lib/pricing'
import type { MaterialType } from '@/types/pricing'

// 가격 계산 요청 스키마 (Story 2.2 새로운 시스템)
const priceCalculationSchema = z.object({
  width_cm: z.number().min(1).max(1000, '가로는 1cm~1000cm 범위여야 합니다'),
  depth_cm: z.number().min(1).max(1000, '세로는 1cm~1000cm 범위여야 합니다'),
  height_cm: z.number().min(1).max(300, '높이는 1cm~300cm 범위여야 합니다'),
  material: z.enum(['wood', 'mdf', 'steel', 'metal', 'glass', 'fabric'], {
    errorMap: () => ({ message: '유효하지 않은 재료 타입입니다' })
  }),
  options: z.record(z.any()).optional(),
  use_cache: z.boolean().default(true), // 캐시 사용 여부
  estimate_only: z.boolean().default(false) // 빠른 추정 모드
})

// 일괄 계산 요청 스키마
const batchCalculationSchema = z.object({
  calculations: z.array(priceCalculationSchema).min(1).max(10, '최대 10개까지 일괄 계산 가능합니다'),
  use_cache: z.boolean().default(true)
})

// 응답 타입 정의 (새로운 가격 계산 시스템)
interface SingleCalculationResponse {
  request: z.infer<typeof priceCalculationSchema>
  result: Awaited<ReturnType<typeof PricingAPI.calculatePrice>>
  calculation_time_ms: number
}

interface BatchCalculationResponse {
  calculations: SingleCalculationResponse[]
  total_calculation_time_ms: number
  cache_hits: number
  cache_misses: number
}

// 메모리 캐시 (간단한 LRU 구현)
class PriceCache {
  private cache = new Map<string, { data: any; timestamp: number }>()
  private readonly TTL = 5 * 60 * 1000 // 5분
  private readonly MAX_SIZE = 1000

  private generateKey(request: z.infer<typeof priceCalculationSchema>): string {
    return `${request.width_cm}-${request.depth_cm}-${request.height_cm}-${request.material}`
  }

  get(request: z.infer<typeof priceCalculationSchema>): any | null {
    const key = this.generateKey(request)
    const cached = this.cache.get(key)

    if (!cached) return null

    // TTL 체크
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key)
      return null
    }

    // LRU 업데이트 (재삽입으로 최근 사용 표시)
    this.cache.delete(key)
    this.cache.set(key, cached)

    return cached.data
  }

  set(request: z.infer<typeof priceCalculationSchema>, data: any): void {
    const key = this.generateKey(request)

    // 크기 제한
    if (this.cache.size >= this.MAX_SIZE) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  getStats(): { size: number; maxSize: number; ttl: number } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_SIZE,
      ttl: this.TTL
    }
  }
}

const priceCache = new PriceCache()

// POST 핸들러 - 가격 계산
async function handlePost(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const timer = new RequestTimer(request, requestId)

  try {
    // API 버전 확인
    const { version } = processApiVersion(request, requestId)

    // Rate Limiting
    const rateLimitResult = checkApiRateLimit(request, requestId)
    if (!rateLimitResult.allowed) {
      const response = createErrorResponse(
        new Error('Rate limit exceeded'),
        requestId
      )
      Object.entries(getRateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      return response
    }

    // 요청 본문 파싱
    const body = await request.json()

    // 일괄 계산 vs 단일 계산 구분
    const isBatch = Array.isArray(body.calculations)

    if (isBatch) {
      return handleBatchCalculation(body, requestId, timer)
    } else {
      return handleSingleCalculation(body, requestId, timer)
    }

  } catch (error) {
    timer.complete(500)
    logger.error('Price calculation API error', requestId, { error })
    return createErrorResponse(error, requestId)
  }
}

// 단일 가격 계산 처리
async function handleSingleCalculation(
  body: any,
  requestId: string,
  timer: RequestTimer
): Promise<NextResponse> {
  // 요청 데이터 검증
  const validatedData = validateRequestBody(body, priceCalculationSchema, requestId)

  logger.info('Single price calculation request', requestId, {
    dimensions: `${validatedData.width_cm}x${validatedData.depth_cm}x${validatedData.height_cm}`,
    material: validatedData.material
  })

  const startTime = Date.now()
  let cacheHit = false

  try {
    let result

    // 캐시 확인
    if (validatedData.use_cache) {
      const cached = priceCache.get(validatedData)
      if (cached) {
        result = cached
        cacheHit = true
        logger.info('Price calculation cache hit', requestId)
      }
    }

    // 캐시 미스 시 계산 수행
    if (!result) {
      if (validatedData.estimate_only) {
        // 빠른 추정 모드 (동기 계산)
        result = PricingAPI.calculatePriceEstimate(validatedData)
      } else {
        // 정확한 계산 (비동기, DB 조회)
        result = await PricingAPI.calculatePrice(validatedData)
      }

      // 캐시 저장
      if (validatedData.use_cache) {
        priceCache.set(validatedData, result)
      }
    }

    const calculationTime = Date.now() - startTime

    const responseData: SingleCalculationResponse = {
      request: validatedData,
      result,
      calculation_time_ms: calculationTime
    }

    logger.info('Single price calculation completed', requestId, {
      calculationTime,
      cacheHit,
      totalPrice: result.total
    })

    const response = createSuccessResponse(responseData, requestId)

    // 캐시 정보 헤더 추가
    response.headers.set('X-Cache-Status', cacheHit ? 'HIT' : 'MISS')
    response.headers.set('X-Calculation-Time', calculationTime.toString())

    timer.complete(200)
    return response

  } catch (error) {
    const calculationTime = Date.now() - startTime

    if (error instanceof PriceCalculationError) {
      logger.warn('Price calculation validation error', requestId, {
        error: error.message,
        code: error.code,
        details: error.details
      })

      timer.complete(400)
      return createErrorResponse(error, requestId)
    }

    logger.error('Price calculation failed', requestId, {
      error,
      calculationTime
    })

    timer.complete(500)
    return createErrorResponse(
      new Error('가격 계산 중 오류가 발생했습니다'),
      requestId
    )
  }
}

// 일괄 가격 계산 처리
async function handleBatchCalculation(
  body: any,
  requestId: string,
  timer: RequestTimer
): Promise<NextResponse> {
  // 요청 데이터 검증
  const validatedData = validateRequestBody(body, batchCalculationSchema, requestId)

  logger.info('Batch price calculation request', requestId, {
    count: validatedData.calculations.length
  })

  const startTime = Date.now()
  let cacheHits = 0
  let cacheMisses = 0

  try {
    const results: SingleCalculationResponse[] = []

    // 순차적으로 계산 (병렬 처리 시 DB 부하 고려)
    for (const calculation of validatedData.calculations) {
      const calcStartTime = Date.now()
      let result
      let cacheHit = false

      // 캐시 확인
      if (validatedData.use_cache) {
        const cached = priceCache.get(calculation)
        if (cached) {
          result = cached
          cacheHit = true
          cacheHits++
        }
      }

      // 캐시 미스 시 계산
      if (!result) {
        if (calculation.estimate_only) {
          result = PricingAPI.calculatePriceEstimate(calculation)
        } else {
          result = await PricingAPI.calculatePrice(calculation)
        }

        if (validatedData.use_cache) {
          priceCache.set(calculation, result)
        }
        cacheMisses++
      }

      const calculationTime = Date.now() - calcStartTime

      results.push({
        request: calculation,
        result,
        calculation_time_ms: calculationTime
      })
    }

    const totalCalculationTime = Date.now() - startTime

    const responseData: BatchCalculationResponse = {
      calculations: results,
      total_calculation_time_ms: totalCalculationTime,
      cache_hits: cacheHits,
      cache_misses: cacheMisses
    }

    logger.info('Batch price calculation completed', requestId, {
      count: results.length,
      totalCalculationTime,
      cacheHits,
      cacheMisses
    })

    const response = createSuccessResponse(responseData, requestId)

    // 캐시 정보 헤더 추가
    response.headers.set('X-Cache-Hits', cacheHits.toString())
    response.headers.set('X-Cache-Misses', cacheMisses.toString())
    response.headers.set('X-Total-Calculation-Time', totalCalculationTime.toString())

    timer.complete(200)
    return response

  } catch (error) {
    const totalCalculationTime = Date.now() - startTime

    logger.error('Batch price calculation failed', requestId, {
      error,
      totalCalculationTime
    })

    timer.complete(500)
    return createErrorResponse(
      new Error('일괄 가격 계산 중 오류가 발생했습니다'),
      requestId
    )
  }
}

// GET 핸들러 - 캐시 상태 및 재료 정보 조회
async function handleGet(request: NextRequest) {
  const requestId = crypto.randomUUID()

  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'cache-stats') {
      return createSuccessResponse({
        cache: priceCache.getStats(),
        timestamp: new Date().toISOString()
      }, requestId)
    }

    if (action === 'materials') {
      const materials = await PricingAPI.policies.getAll()
      return createSuccessResponse({
        materials: materials.map(policy => ({
          type: policy.material_type,
          base_price_per_m3: policy.base_price_per_m3,
          price_modifier: policy.price_modifier,
          legacy_material: policy.legacy_material
        }))
      }, requestId)
    }

    return createErrorResponse(
      new Error('Invalid action parameter'),
      requestId
    )

  } catch (error) {
    return createErrorResponse(error, requestId)
  }
}

// OPTIONS 핸들러 (CORS)
async function handleOptions() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Version',
    },
  })
}

// 메인 핸들러들
export const GET = withErrorHandling(handleGet)
export const POST = withErrorHandling(handlePost)
export const OPTIONS = handleOptions