// BFF 3D 컨피규레이터 통합 API
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSuccessResponse, createErrorResponse, withErrorHandling } from '@/lib/api/errors'
import { authenticateRequest } from '@/lib/api/auth'
import { validateQueryParams, CommonSchemas } from '@/lib/api/validation'
import { checkBffRateLimit, getRateLimitHeaders } from '@/lib/api/rate-limiter'
import { processApiVersion } from '@/lib/api/version'
import { RequestTimer, logger } from '@/lib/api/logger'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { PricingAPI } from '@/lib/pricing'

// BFF 컨피규레이터 응답 타입
interface ConfiguratorResponse {
  user: {
    id: string
    email: string
    subscription_tier: 'free' | 'premium'
    design_quota: {
      used: number
      limit: number
    }
  }
  materials: Array<{
    id: string
    name: string
    type: 'wood' | 'mdf' | 'steel' | 'metal' | 'glass' | 'fabric'
    price_per_unit: number
    availability: boolean
    thumbnail_url?: string
  }>
  pricing_policies: Array<{
    material_type: 'wood' | 'mdf' | 'steel' | 'metal' | 'glass' | 'fabric'
    base_price_per_m3: number
    price_modifier: number
    legacy_material: boolean
  }>
  pricing_rules: {
    base_price: number
    size_multiplier: number
    material_multipliers: Record<string, number>
    finish_multipliers: Record<string, number>
  }
  saved_designs: Array<{
    id: string
    name: string
    created_at: string
    thumbnail_url?: string
    options: {
      width_cm: number
      depth_cm: number
      height_cm: number
      material: string
      color: string
    }
    estimated_price: number
  }>
  design_limits: {
    max_dimensions: {
      width_cm: number
      depth_cm: number
      height_cm: number
    }
    available_materials: string[]
    available_finishes: string[]
  }
  ui_preferences?: {
    theme: 'light' | 'dark'
    units: 'cm' | 'inch'
    currency: 'KRW' | 'USD'
  }
}

// 쿼리 파라미터 스키마
const configuratorQuerySchema = z.object({
  include_designs: z.string().optional().transform(val => val === 'true'),
  include_materials: z.string().optional().transform(val => val !== 'false'),
  include_pricing: z.string().optional().transform(val => val !== 'false'),
  design_limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 10),
}).merge(CommonSchemas.pagination)

// GET 핸들러 - 3D 컨피규레이터 초기 데이터 로드
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
    const queryParams = validateQueryParams(request, configuratorQuerySchema, requestId)

    logger.info('BFF configurator request started', requestId, {
      userId: authContext.user.id,
      queryParams,
    })

    // 사용자 정보 및 구독 상태 조회
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('subscription_tier, design_quota_used, design_quota_limit, ui_preferences')
      .eq('id', authContext.user.id)
      .single()

    if (userError) {
      logger.error('Failed to fetch user profile', requestId, { error: userError })
      throw new Error('사용자 정보를 조회할 수 없습니다')
    }

    // 가격 정책 조회 (Story 2.2)
    let pricingPolicies: ConfiguratorResponse['pricing_policies'] = []
    if (queryParams.include_pricing) {
      try {
        const policies = await PricingAPI.policies.getAll()
        pricingPolicies = policies.map(policy => ({
          material_type: policy.material_type,
          base_price_per_m3: policy.base_price_per_m3,
          price_modifier: policy.price_modifier,
          legacy_material: policy.legacy_material
        }))
      } catch (error) {
        logger.warn('Failed to load pricing policies, using defaults', requestId, { error })
        // 기본값 사용
        pricingPolicies = [
          { material_type: 'wood', base_price_per_m3: 50000, price_modifier: 1.0, legacy_material: true },
          { material_type: 'mdf', base_price_per_m3: 50000, price_modifier: 0.8, legacy_material: true },
          { material_type: 'steel', base_price_per_m3: 50000, price_modifier: 1.15, legacy_material: true },
          { material_type: 'metal', base_price_per_m3: 50000, price_modifier: 1.5, legacy_material: false },
          { material_type: 'glass', base_price_per_m3: 50000, price_modifier: 2.0, legacy_material: false },
          { material_type: 'fabric', base_price_per_m3: 50000, price_modifier: 0.8, legacy_material: false },
        ]
      }
    }

    // 응답 데이터 구성
    const responseData: ConfiguratorResponse = {
      user: {
        id: authContext.user.id,
        email: authContext.user.email || '',
        subscription_tier: userProfile?.subscription_tier || 'free',
        design_quota: {
          used: userProfile?.design_quota_used || 0,
          limit: userProfile?.design_quota_limit || 5,
        },
      },
      materials: [],
      pricing_policies: pricingPolicies,
      pricing_rules: {
        base_price: 50000, // 기본 가격 (KRW)
        size_multiplier: 1000, // 크기당 가격 배율
        material_multipliers: {
          wood: 1.0,
          mdf: 0.8,
          steel: 1.15,
          metal: 1.5,
          glass: 2.0,
          fabric: 0.8,
        },
        finish_multipliers: {
          matte: 1.0,
          glossy: 1.2,
          satin: 1.1,
        },
      },
      saved_designs: [],
      design_limits: {
        max_dimensions: {
          width_cm: userProfile?.subscription_tier === 'premium' ? 500 : 300,
          depth_cm: userProfile?.subscription_tier === 'premium' ? 500 : 300,
          height_cm: userProfile?.subscription_tier === 'premium' ? 300 : 200,
        },
        available_materials: ['wood', 'mdf', 'steel', 'metal', 'glass', 'fabric'],
        available_finishes: ['matte', 'glossy', 'satin'],
      },
      ui_preferences: userProfile?.ui_preferences || {
        theme: 'light',
        units: 'cm',
        currency: 'KRW',
      },
    }

    // 재료 정보 조회 (옵션)
    if (queryParams.include_materials) {
      const { data: materials, error: materialsError } = await supabaseAdmin
        .from('materials')
        .select('id, name, type, price_per_unit, availability, thumbnail_url')
        .eq('availability', true)
        .order('name')

      if (!materialsError && materials) {
        responseData.materials = materials
      }
    }

    // 저장된 디자인 조회 (옵션)
    if (queryParams.include_designs) {
      const { data: designs, error: designsError } = await supabaseAdmin
        .from('saved_designs')
        .select(`
          id,
          name,
          created_at,
          thumbnail_url,
          width_cm,
          depth_cm,
          height_cm,
          material,
          color,
          estimated_price
        `)
        .eq('user_id', authContext.user.id)
        .order('created_at', { ascending: false })
        .limit(queryParams.design_limit)

      if (!designsError && designs) {
        responseData.saved_designs = designs.map(design => ({
          id: design.id,
          name: design.name,
          created_at: design.created_at,
          thumbnail_url: design.thumbnail_url,
          options: {
            width_cm: design.width_cm,
            depth_cm: design.depth_cm,
            height_cm: design.height_cm,
            material: design.material,
            color: design.color,
          },
          estimated_price: design.estimated_price,
        }))
      }
    }

    logger.info('BFF configurator request completed', requestId, {
      userId: authContext.user.id,
      dataSize: {
        materials: responseData.materials.length,
        designs: responseData.saved_designs.length,
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