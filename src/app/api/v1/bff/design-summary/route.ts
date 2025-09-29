// BFF 디자인 요약 정보 통합 API
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSuccessResponse, createErrorResponse, withErrorHandling } from '@/lib/api/errors'
import { authenticateRequest } from '@/lib/api/auth'
import { validateQueryParams, CommonSchemas } from '@/lib/api/validation'
import { checkBffRateLimit, getRateLimitHeaders } from '@/lib/api/rate-limiter'
import { processApiVersion } from '@/lib/api/version'
import { RequestTimer, logger } from '@/lib/api/logger'
import { supabase } from '@/lib/supabase'

// 디자인 요약 응답 타입
interface DesignSummaryResponse {
  design_collection: {
    total_count: number
    by_status: {
      draft: number
      completed: number
      ordered: number
      archived: number
    }
    by_material: Record<string, number>
    by_size_category: {
      small: number    // < 100cm width
      medium: number   // 100-300cm width
      large: number    // > 300cm width
    }
    total_value: number
    avg_value: number
  }
  recent_designs: Array<{
    id: string
    name: string
    created_at: string
    updated_at: string
    status: 'draft' | 'completed' | 'ordered' | 'archived'
    thumbnail_url?: string
    dimensions: {
      width_cm: number
      depth_cm: number
      height_cm: number
    }
    material: string
    color: string
    estimated_price: number
    tags: string[]
    shared: boolean
    likes_count: number
  }>
  popular_combinations: Array<{
    material: string
    finish: string
    color_scheme: string
    usage_count: number
    avg_price: number
  }>
  size_analytics: {
    most_common_dimensions: {
      width_cm: number
      depth_cm: number
      height_cm: number
    }
    size_distribution: Array<{
      size_range: string
      count: number
      percentage: number
    }>
  }
  pricing_insights: {
    price_ranges: Array<{
      range: string
      count: number
      percentage: number
    }>
    cost_optimization_tips: Array<{
      type: 'material' | 'size' | 'finish'
      suggestion: string
      potential_savings: number
    }>
  }
  trends: {
    monthly_creation_rate: Array<{
      month: string
      count: number
    }>
    material_popularity_trend: Array<{
      material: string
      this_month: number
      last_month: number
      change_percentage: number
    }>
  }
  recommendations: {
    similar_designs: Array<{
      id: string
      name: string
      similarity_score: number
      thumbnail_url?: string
    }>
    suggested_materials: Array<{
      material: string
      reason: string
      price_impact: number
    }>
  }
}

// 쿼리 파라미터 스키마
const designSummaryQuerySchema = z.object({
  include_analytics: z.string().optional().transform(val => val !== 'false'),
  include_recommendations: z.string().optional().transform(val => val !== 'false'),
  include_trends: z.string().optional().transform(val => val !== 'false'),
  time_period: z.enum(['7d', '30d', '90d', '1y']).optional().default('30d'),
  status_filter: z.enum(['all', 'active', 'completed']).optional().default('all'),
  limit: z.string().optional().transform(val => val ? Math.min(parseInt(val, 10), 50) : 20),
}).merge(CommonSchemas.pagination)

// GET 핸들러 - 디자인 요약 정보 조회
async function handleGet(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const timer = new RequestTimer(request, requestId)

  try {
    // API 버전 확인
    const { version } = processApiVersion(request, requestId)

    // Rate Limiting
    const rateLimitResult = checkBffRateLimit(request, requestId)
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

    // 인증 확인
    const authContext = await authenticateRequest(request, requestId)

    // 쿼리 파라미터 검증
    const queryParams = validateQueryParams(request, designSummaryQuerySchema, requestId)

    logger.info('BFF design summary request started', requestId, {
      userId: authContext.user.id,
      queryParams,
    })

    // 날짜 범위 계산
    const periodDays = queryParams.time_period === '7d' ? 7 :
                      queryParams.time_period === '30d' ? 30 :
                      queryParams.time_period === '90d' ? 90 : 365
    const periodStart = new Date()
    periodStart.setDate(periodStart.getDate() - periodDays)

    // 상태 필터 조건
    let statusCondition = 'true'
    if (queryParams.status_filter === 'active') {
      statusCondition = "status IN ('draft', 'completed')"
    } else if (queryParams.status_filter === 'completed') {
      statusCondition = "status = 'completed'"
    }

    // 기본 디자인 컬렉션 통계 조회
    const { data: collectionStats, error: collectionError } = await supabase
      .rpc('get_design_collection_stats', {
        user_id: authContext.user.id,
        period_start: periodStart.toISOString(),
        status_condition: statusCondition,
      })

    if (collectionError) {
      logger.error('Failed to fetch collection stats', requestId, { error: collectionError })
      throw new Error('디자인 컬렉션 통계를 조회할 수 없습니다')
    }

    // 최근 디자인 조회
    let designQuery = supabase
      .from('saved_designs')
      .select(`
        id,
        name,
        created_at,
        updated_at,
        status,
        thumbnail_url,
        width_cm,
        depth_cm,
        height_cm,
        material,
        color,
        estimated_price,
        tags,
        is_public,
        likes_count
      `)
      .eq('user_id', authContext.user.id)
      .gte('created_at', periodStart.toISOString())
      .order('updated_at', { ascending: false })
      .limit(queryParams.limit)

    if (queryParams.status_filter !== 'all') {
      if (queryParams.status_filter === 'active') {
        designQuery = designQuery.in('status', ['draft', 'completed'])
      } else {
        designQuery = designQuery.eq('status', queryParams.status_filter)
      }
    }

    const { data: recentDesigns, error: designsError } = await designQuery

    if (designsError) {
      logger.error('Failed to fetch recent designs', requestId, { error: designsError })
      throw new Error('최근 디자인을 조회할 수 없습니다')
    }

    // 응답 데이터 기본 구성
    const responseData: DesignSummaryResponse = {
      design_collection: {
        total_count: collectionStats?.total_count || 0,
        by_status: collectionStats?.by_status || {
          draft: 0,
          completed: 0,
          ordered: 0,
          archived: 0,
        },
        by_material: collectionStats?.by_material || {},
        by_size_category: collectionStats?.by_size_category || {
          small: 0,
          medium: 0,
          large: 0,
        },
        total_value: collectionStats?.total_value || 0,
        avg_value: collectionStats?.avg_value || 0,
      },
      recent_designs: (recentDesigns || []).map(design => ({
        id: design.id,
        name: design.name,
        created_at: design.created_at,
        updated_at: design.updated_at,
        status: design.status || 'draft',
        thumbnail_url: design.thumbnail_url,
        dimensions: {
          width_cm: design.width_cm,
          depth_cm: design.depth_cm,
          height_cm: design.height_cm,
        },
        material: design.material,
        color: design.color,
        estimated_price: design.estimated_price,
        tags: design.tags || [],
        shared: design.is_public || false,
        likes_count: design.likes_count || 0,
      })),
      popular_combinations: [],
      size_analytics: {
        most_common_dimensions: {
          width_cm: 120,
          depth_cm: 60,
          height_cm: 80,
        },
        size_distribution: [],
      },
      pricing_insights: {
        price_ranges: [],
        cost_optimization_tips: [],
      },
      trends: {
        monthly_creation_rate: [],
        material_popularity_trend: [],
      },
      recommendations: {
        similar_designs: [],
        suggested_materials: [],
      },
    }

    // 인기 조합 분석 (옵션)
    if (queryParams.include_analytics) {
      const { data: popularCombos, error: combosError } = await supabase
        .rpc('get_popular_material_combinations', {
          user_id: authContext.user.id,
          limit: 5,
        })

      if (!combosError && popularCombos) {
        responseData.popular_combinations = popularCombos.map((combo: any) => ({
          material: combo.material,
          finish: combo.finish,
          color_scheme: combo.color_scheme,
          usage_count: combo.usage_count,
          avg_price: combo.avg_price,
        }))
      }

      // 크기 분석
      const { data: sizeAnalytics, error: sizeError } = await supabase
        .rpc('get_size_analytics', {
          user_id: authContext.user.id,
        })

      if (!sizeError && sizeAnalytics) {
        responseData.size_analytics = {
          most_common_dimensions: sizeAnalytics.most_common_dimensions || {
            width_cm: 120,
            depth_cm: 60,
            height_cm: 80,
          },
          size_distribution: sizeAnalytics.size_distribution || [],
        }
      }

      // 가격 인사이트
      const { data: pricingInsights, error: pricingError } = await supabase
        .rpc('get_pricing_insights', {
          user_id: authContext.user.id,
        })

      if (!pricingError && pricingInsights) {
        responseData.pricing_insights = {
          price_ranges: pricingInsights.price_ranges || [],
          cost_optimization_tips: pricingInsights.optimization_tips || [],
        }
      }
    }

    // 트렌드 분석 (옵션)
    if (queryParams.include_trends) {
      const { data: trends, error: trendsError } = await supabase
        .rpc('get_design_trends', {
          user_id: authContext.user.id,
          months_back: 12,
        })

      if (!trendsError && trends) {
        responseData.trends = {
          monthly_creation_rate: trends.monthly_creation_rate || [],
          material_popularity_trend: trends.material_popularity_trend || [],
        }
      }
    }

    // 추천 시스템 (옵션)
    if (queryParams.include_recommendations) {
      // 유사한 디자인 찾기
      const { data: similarDesigns, error: similarError } = await supabase
        .rpc('get_similar_designs', {
          user_id: authContext.user.id,
          limit: 5,
        })

      if (!similarError && similarDesigns) {
        responseData.recommendations.similar_designs = similarDesigns.map((design: any) => ({
          id: design.id,
          name: design.name,
          similarity_score: design.similarity_score,
          thumbnail_url: design.thumbnail_url,
        }))
      }

      // 추천 재료
      const userMaterials = [...new Set((recentDesigns || []).map(d => d.material))]
      const allMaterials = ['wood', 'metal', 'glass', 'fabric']
      const suggestedMaterials = allMaterials.filter(m => !userMaterials.includes(m))

      responseData.recommendations.suggested_materials = suggestedMaterials.slice(0, 3).map(material => ({
        material,
        reason: `${material} 재료로 새로운 디자인을 시도해보세요`,
        price_impact: material === 'glass' ? 50 : material === 'metal' ? 30 : -10,
      }))
    }

    logger.info('BFF design summary request completed', requestId, {
      userId: authContext.user.id,
      resultSize: {
        total_designs: responseData.design_collection.total_count,
        recent_designs: responseData.recent_designs.length,
        popular_combinations: responseData.popular_combinations.length,
      },
    })

    const response = createSuccessResponse(responseData, requestId)

    // Rate limit 헤더 추가
    Object.entries(getRateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    timer.complete(200)
    return response

  } catch (error) {
    timer.complete(500)
    return createErrorResponse(error, requestId)
  }
}

// OPTIONS 핸들러 (CORS)
async function handleOptions() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Version',
    },
  })
}

// 메인 핸들러들
export const GET = withErrorHandling(handleGet)
export const OPTIONS = handleOptions