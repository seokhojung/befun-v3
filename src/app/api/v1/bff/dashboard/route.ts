// BFF 대시보드 데이터 집계 API
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSuccessResponse, createErrorResponse, withErrorHandling } from '@/lib/api/errors'
import { authenticateRequest } from '@/lib/api/auth'
import { validateQueryParams, CommonSchemas } from '@/lib/api/validation'
import { checkBffRateLimit, getRateLimitHeaders } from '@/lib/api/rate-limiter'
import { processApiVersion } from '@/lib/api/version'
import { RequestTimer, logger } from '@/lib/api/logger'
import { supabase } from '@/lib/supabase'

// 대시보드 응답 타입
interface DashboardResponse {
  user_summary: {
    id: string
    email: string
    subscription_tier: 'free' | 'premium'
    member_since: string
    last_active: string
  }
  design_analytics: {
    total_designs: number
    designs_this_month: number
    favorite_material: string | null
    avg_design_value: number
    recent_activity: Array<{
      type: 'created' | 'updated' | 'deleted'
      design_name: string
      timestamp: string
    }>
  }
  usage_stats: {
    design_quota: {
      used: number
      limit: number
      percentage: number
    }
    api_calls_this_month: number
    storage_used: number // bytes
    pricing_calculations: number
  }
  recent_designs: Array<{
    id: string
    name: string
    created_at: string
    updated_at: string
    thumbnail_url?: string
    estimated_price: number
    status: 'draft' | 'completed' | 'ordered'
  }>
  recommendations: Array<{
    type: 'material' | 'size' | 'feature'
    title: string
    description: string
    action_url?: string
  }>
  notifications: Array<{
    id: string
    type: 'info' | 'warning' | 'success' | 'error'
    title: string
    message: string
    created_at: string
    read: boolean
  }>
  pricing_trends: {
    avg_price_last_30_days: number
    price_change_percentage: number
    material_price_trends: Record<string, number>
  }
}

// 쿼리 파라미터 스키마
const dashboardQuerySchema = z.object({
  include_analytics: z.string().optional().transform(val => val !== 'false'),
  include_recommendations: z.string().optional().transform(val => val !== 'false'),
  include_notifications: z.string().optional().transform(val => val !== 'false'),
  recent_designs_limit: z.string().optional().transform(val => val ? Math.min(parseInt(val, 10), 20) : 5),
  analytics_period: z.enum(['7d', '30d', '90d']).optional().default('30d'),
})

// GET 핸들러 - 사용자 대시보드 데이터 조회
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
    const queryParams = validateQueryParams(request, dashboardQuerySchema, requestId)

    logger.info('BFF dashboard request started', requestId, {
      userId: authContext.user.id,
      queryParams,
    })

    // 기본 사용자 정보 조회
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select(`
        subscription_tier,
        created_at,
        last_sign_in_at,
        design_quota_used,
        design_quota_limit,
        storage_used,
        api_calls_this_month
      `)
      .eq('id', authContext.user.id)
      .single()

    if (userError) {
      logger.error('Failed to fetch user profile', requestId, { error: userError })
      throw new Error('사용자 정보를 조회할 수 없습니다')
    }

    // 날짜 범위 계산
    const periodDays = queryParams.analytics_period === '7d' ? 7 :
                     queryParams.analytics_period === '30d' ? 30 : 90
    const periodStart = new Date()
    periodStart.setDate(periodStart.getDate() - periodDays)

    // 응답 데이터 기본 구성
    const responseData: DashboardResponse = {
      user_summary: {
        id: authContext.user.id,
        email: authContext.user.email || '',
        subscription_tier: userProfile?.subscription_tier || 'free',
        member_since: userProfile?.created_at || authContext.user.created_at,
        last_active: userProfile?.last_sign_in_at || new Date().toISOString(),
      },
      design_analytics: {
        total_designs: 0,
        designs_this_month: 0,
        favorite_material: null,
        avg_design_value: 0,
        recent_activity: [],
      },
      usage_stats: {
        design_quota: {
          used: userProfile?.design_quota_used || 0,
          limit: userProfile?.design_quota_limit || 5,
          percentage: Math.round(((userProfile?.design_quota_used || 0) / (userProfile?.design_quota_limit || 5)) * 100),
        },
        api_calls_this_month: userProfile?.api_calls_this_month || 0,
        storage_used: userProfile?.storage_used || 0,
        pricing_calculations: 0,
      },
      recent_designs: [],
      recommendations: [],
      notifications: [],
      pricing_trends: {
        avg_price_last_30_days: 0,
        price_change_percentage: 0,
        material_price_trends: {},
      },
    }

    // 디자인 통계 조회
    const { data: designStats, error: designStatsError } = await supabase
      .rpc('get_user_design_stats', {
        user_id: authContext.user.id,
        period_days: periodDays,
      })

    if (!designStatsError && designStats) {
      responseData.design_analytics = {
        total_designs: designStats.total_designs || 0,
        designs_this_month: designStats.designs_this_period || 0,
        favorite_material: designStats.favorite_material,
        avg_design_value: designStats.avg_price || 0,
        recent_activity: designStats.recent_activity || [],
      }

      responseData.pricing_trends = {
        avg_price_last_30_days: designStats.avg_price || 0,
        price_change_percentage: designStats.price_change_percentage || 0,
        material_price_trends: designStats.material_price_trends || {},
      }

      responseData.usage_stats.pricing_calculations = designStats.pricing_calculations || 0
    }

    // 최근 디자인 조회
    const { data: recentDesigns, error: recentDesignsError } = await supabase
      .from('saved_designs')
      .select(`
        id,
        name,
        created_at,
        updated_at,
        thumbnail_url,
        estimated_price,
        status
      `)
      .eq('user_id', authContext.user.id)
      .order('updated_at', { ascending: false })
      .limit(queryParams.recent_designs_limit)

    if (!recentDesignsError && recentDesigns) {
      responseData.recent_designs = recentDesigns.map(design => ({
        id: design.id,
        name: design.name,
        created_at: design.created_at,
        updated_at: design.updated_at,
        thumbnail_url: design.thumbnail_url,
        estimated_price: design.estimated_price,
        status: design.status || 'draft',
      }))
    }

    // 추천 사항 생성 (옵션)
    if (queryParams.include_recommendations) {
      const recommendations = []

      // 할당량 기반 추천
      if (responseData.usage_stats.design_quota.percentage > 80) {
        recommendations.push({
          type: 'feature' as const,
          title: 'Premium 업그레이드',
          description: '디자인 할당량이 거의 다 찼습니다. Premium으로 업그레이드하여 무제한 디자인을 생성하세요.',
          action_url: '/upgrade',
        })
      }

      // 인기 재료 추천
      if (responseData.design_analytics.favorite_material) {
        recommendations.push({
          type: 'material' as const,
          title: '새로운 재료 체험',
          description: `${responseData.design_analytics.favorite_material} 외에 다른 재료도 한번 사용해보세요.`,
        })
      }

      // 크기 최적화 추천
      if (responseData.design_analytics.avg_design_value > 200000) {
        recommendations.push({
          type: 'size' as const,
          title: '비용 최적화',
          description: '크기를 약간 조정하면 비용을 20% 절약할 수 있습니다.',
        })
      }

      responseData.recommendations = recommendations.slice(0, 3)
    }

    // 알림 조회 (옵션)
    if (queryParams.include_notifications) {
      const { data: notifications, error: notificationsError } = await supabase
        .from('user_notifications')
        .select('id, type, title, message, created_at, read')
        .eq('user_id', authContext.user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (!notificationsError && notifications) {
        responseData.notifications = notifications
      }
    }

    logger.info('BFF dashboard request completed', requestId, {
      userId: authContext.user.id,
      dataSize: {
        designs: responseData.recent_designs.length,
        recommendations: responseData.recommendations.length,
        notifications: responseData.notifications.length,
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