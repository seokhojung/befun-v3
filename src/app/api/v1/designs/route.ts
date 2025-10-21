// 디자인 저장/조회 API 엔드포인트
/**
 * @swagger
 * /api/v1/designs:
 *   get:
 *     summary: Get designs
 *     description: Retrieve a list of designs with filtering and pagination
 *     tags:
 *       - Designs
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SortByParam'
 *       - $ref: '#/components/parameters/SortOrderParam'
 *       - name: status
 *         in: query
 *         description: Filter by status
 *         schema:
 *           type: string
 *           enum: [all, draft, completed, ordered, archived]
 *           default: all
 *       - name: material
 *         in: query
 *         description: Filter by material
 *         schema:
 *           type: string
 *           enum: [wood, metal, glass, fabric]
 *       - name: is_public
 *         in: query
 *         description: Filter by public visibility
 *         schema:
 *           type: boolean
 *       - name: search
 *         in: query
 *         description: Search in name and description
 *         schema:
 *           type: string
 *           maxLength: 100
 *       - name: tags
 *         in: query
 *         description: Filter by tags (comma-separated)
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         designs:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Design'
 *                         pagination:
 *                           $ref: '#/components/schemas/PaginationInfo'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       429:
 *         $ref: '#/components/responses/RateLimitExceeded'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *   post:
 *     summary: Create design
 *     description: Create a new 3D design
 *     tags:
 *       - Designs
 *     security:
 *       - BearerAuth: []
 *       - CSRFToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: "Modern Coffee Table"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: "A sleek modern coffee table with clean lines"
 *               options:
 *                 $ref: '#/components/schemas/DesignOptions'
 *               custom_specs:
 *                 type: object
 *                 description: Additional custom specifications
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                   maxLength: 20
 *                 maxItems: 10
 *                 example: ["modern", "minimalist", "coffee-table"]
 *               is_public:
 *                 type: boolean
 *                 default: false
 *                 example: false
 *               estimated_price:
 *                 type: number
 *                 minimum: 0
 *                 example: 250000
 *               thumbnail_data:
 *                 type: string
 *                 description: Base64 encoded thumbnail image
 *             required:
 *               - name
 *               - options
 *     responses:
 *       201:
 *         description: Design created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Design'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       422:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     error:
 *                       type: object
 *                       properties:
 *                         code:
 *                           example: "VALIDATION_FAILED"
 *                         message:
 *                           example: "Design quota exceeded"
 *       429:
 *         $ref: '#/components/responses/RateLimitExceeded'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSuccessResponse, createErrorResponse, withErrorHandling } from '@/lib/api/errors'
import { authenticateRequest, authorizeRequest } from '@/lib/api/auth'
import { validateRequestBody, validateQueryParams, CommonSchemas, BusinessSchemas } from '@/lib/api/validation'
import { checkDefaultRateLimit, getRateLimitHeaders } from '@/lib/api/rate-limiter'
import { processApiVersion } from '@/lib/api/version'
import { RequestTimer, logger } from '@/lib/api/logger'
import { supabase } from '@/lib/supabase'

// 디자인 저장 요청 스키마
const saveDesignSchema = z.object({
  name: z.string().min(1, '디자인 이름을 입력해주세요').max(100, '디자인 이름은 100자 이내로 입력해주세요'),
  description: z.string().max(500, '설명은 500자 이내로 입력해주세요').optional(),
  options: z.object({
    width_cm: z.number().min(10).max(500),
    depth_cm: z.number().min(10).max(500),
    height_cm: z.number().min(10).max(300),
    material: z.enum(['wood', 'metal', 'glass', 'fabric']),
    color: z.string().regex(/^#[0-9A-F]{6}$/i, '올바른 색상 코드 형식이 아닙니다'),
    finish: z.enum(['matte', 'glossy', 'satin']).optional(),
  }),
  custom_specs: z.record(z.string(), z.any()).optional(), // JSONB로 저장될 추가 사양
  tags: z.array(z.string().max(20)).max(10, '태그는 최대 10개까지 등록할 수 있습니다').optional(),
  is_public: z.boolean().default(false),
  estimated_price: z.number().optional(),
  thumbnail_data: z.string().optional(), // Base64 인코딩된 썸네일 이미지
})

// 디자인 조회 쿼리 스키마
const getDesignsQuerySchema = z.object({
  status: z.enum(['all', 'draft', 'completed', 'ordered', 'archived']).default('all'),
  material: z.enum(['wood', 'metal', 'glass', 'fabric']).optional(),
  is_public: z.string().transform(val => val === 'true').optional(),
  search: z.string().max(100).optional(),
  tags: z.string().transform(val => val.split(',').filter(Boolean)).optional(),
  sort_by: z.enum(['created_at', 'updated_at', 'name', 'estimated_price']).default('updated_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
}).merge(CommonSchemas.pagination)

// 디자인 응답 타입
interface DesignResponse {
  id: string
  name: string
  description?: string
  user_id: string
  user_email?: string
  created_at: string
  updated_at: string
  status: 'draft' | 'completed' | 'ordered' | 'archived'
  options: {
    width_cm: number
    depth_cm: number
    height_cm: number
    material: string
    color: string
    finish?: string
  }
  custom_specs?: Record<string, any>
  tags: string[]
  is_public: boolean
  estimated_price: number
  thumbnail_url?: string
  likes_count: number
  views_count: number
}

// GET 핸들러 - 디자인 목록 조회
async function handleGet(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const timer = new RequestTimer(request, requestId)

  try {
    // API 버전 확인
    const { version } = processApiVersion(request, requestId)

    // Rate Limiting
    const rateLimitResult = checkDefaultRateLimit(request, requestId)
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

    // 권한 확인 - 디자인 읽기 권한
    await authorizeRequest(authContext, ['design:read'])

    // 쿼리 파라미터 검증
    const queryParams = validateQueryParams(request, getDesignsQuerySchema, requestId)

    logger.info('Get designs request started', requestId, {
      userId: authContext.user.id,
      queryParams,
    })

    // 기본 쿼리 구성
    let query = supabase
      .from('saved_designs')
      .select(`
        id,
        name,
        description,
        user_id,
        created_at,
        updated_at,
        status,
        width_cm,
        depth_cm,
        height_cm,
        material,
        color,
        finish,
        custom_specs,
        tags,
        is_public,
        estimated_price,
        thumbnail_url,
        likes_count,
        views_count,
        user_profiles!inner(email)
      `)

    // 사용자별 필터링 (자신의 디자인 + 공개 디자인)
    if (queryParams.is_public === true) {
      query = query.eq('is_public', true)
    } else if (queryParams.is_public === false) {
      query = query.eq('user_id', authContext.user.id).eq('is_public', false)
    } else {
      query = query.or(`user_id.eq.${authContext.user.id},is_public.eq.true`)
    }

    // 상태 필터
    if (queryParams.status !== 'all') {
      query = query.eq('status', queryParams.status)
    }

    // 재료 필터
    if (queryParams.material) {
      query = query.eq('material', queryParams.material)
    }

    // 검색 필터
    if (queryParams.search) {
      query = query.or(`name.ilike.%${queryParams.search}%,description.ilike.%${queryParams.search}%`)
    }

    // 태그 필터
    if (queryParams.tags && queryParams.tags.length > 0) {
      query = query.overlaps('tags', queryParams.tags)
    }

    // 정렬
    query = query.order(queryParams.sort_by, { ascending: queryParams.sort_order === 'asc' })

    // 페이지네이션
    const offset = (queryParams.page - 1) * queryParams.limit
    query = query.range(offset, offset + queryParams.limit - 1)

    // 전체 개수 조회를 위한 별도 쿼리
    let countQuery = supabase
      .from('saved_designs')
      .select('*', { count: 'exact', head: true })

    if (queryParams.is_public === true) {
      countQuery = countQuery.eq('is_public', true)
    } else if (queryParams.is_public === false) {
      countQuery = countQuery.eq('user_id', authContext.user.id).eq('is_public', false)
    } else {
      countQuery = countQuery.or(`user_id.eq.${authContext.user.id},is_public.eq.true`)
    }

    if (queryParams.status !== 'all') {
      countQuery = countQuery.eq('status', queryParams.status)
    }
    if (queryParams.material) {
      countQuery = countQuery.eq('material', queryParams.material)
    }
    if (queryParams.search) {
      countQuery = countQuery.or(`name.ilike.%${queryParams.search}%,description.ilike.%${queryParams.search}%`)
    }
    if (queryParams.tags && queryParams.tags.length > 0) {
      countQuery = countQuery.overlaps('tags', queryParams.tags)
    }

    // 동시 실행
    const [{ data: designs, error: designsError }, { count, error: countError }] = await Promise.all([
      query,
      countQuery,
    ])

    if (designsError || countError) {
      logger.error('Failed to fetch designs', requestId, {
        designsError,
        countError
      })
      throw new Error('디자인을 조회할 수 없습니다')
    }

    // 응답 데이터 변환
    const designsResponse: DesignResponse[] = (designs || []).map(design => ({
      id: design.id,
      name: design.name,
      description: design.description,
      user_id: design.user_id,
      user_email: (design as any).user_profiles?.email,
      created_at: design.created_at,
      updated_at: design.updated_at,
      status: design.status || 'draft',
      options: {
        width_cm: design.width_cm,
        depth_cm: design.depth_cm,
        height_cm: design.height_cm,
        material: design.material,
        color: design.color,
        finish: design.finish,
      },
      custom_specs: design.custom_specs,
      tags: design.tags || [],
      is_public: design.is_public,
      estimated_price: design.estimated_price,
      thumbnail_url: design.thumbnail_url,
      likes_count: design.likes_count || 0,
      views_count: design.views_count || 0,
    }))

    // 페이지네이션 정보
    const totalCount = count || 0
    const totalPages = Math.ceil(totalCount / queryParams.limit)

    const paginatedResponse = {
      designs: designsResponse,
      pagination: {
        page: queryParams.page,
        limit: queryParams.limit,
        total: totalCount,
        totalPages,
        hasNext: queryParams.page < totalPages,
        hasPrev: queryParams.page > 1,
      },
    }

    logger.info('Get designs request completed', requestId, {
      userId: authContext.user.id,
      resultCount: designsResponse.length,
      totalCount,
    })

    const response = createSuccessResponse(paginatedResponse, requestId)

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

// POST 핸들러 - 새 디자인 저장
async function handlePost(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const timer = new RequestTimer(request, requestId)

  try {
    // API 버전 확인
    const { version } = processApiVersion(request, requestId)

    // Rate Limiting
    const rateLimitResult = checkDefaultRateLimit(request, requestId)
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

    // 권한 확인 - 디자인 생성 권한
    await authorizeRequest(authContext, ['design:write'])

    // 요청 본문 검증
    const requestBody = await validateRequestBody(request, saveDesignSchema, requestId)

    logger.info('Save design request started', requestId, {
      userId: authContext.user.id,
      designName: requestBody.name,
      material: requestBody.options.material,
    })

    // 사용자 할당량 확인
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('design_quota_used, design_quota_limit, subscription_tier')
      .eq('id', authContext.user.id)
      .single()

    if (profileError) {
      logger.error('Failed to fetch user profile', requestId, { error: profileError })
      throw new Error('사용자 정보를 확인할 수 없습니다')
    }

    // 할당량 체크 (Premium 사용자는 무제한)
    if (userProfile.subscription_tier !== 'premium' &&
        userProfile.subscription_tier !== 'admin' &&
        userProfile.subscription_tier !== 'superadmin') {
      if ((userProfile.design_quota_used || 0) >= (userProfile.design_quota_limit || 5)) {
        throw new Error('디자인 생성 할당량을 초과했습니다. Premium으로 업그레이드하세요.')
      }
    }

    // 썸네일 처리 (실제 구현에서는 이미지 최적화 및 저장)
    let thumbnailUrl: string | undefined
    if (requestBody.thumbnail_data) {
      // 여기서 실제로는 이미지를 처리하고 저장
      // 현재는 간단히 placeholder 처리
      thumbnailUrl = `https://example.com/thumbnails/${crypto.randomUUID()}.jpg`
    }

    // 디자인 저장
    const { data: savedDesign, error: saveError } = await supabase
      .from('saved_designs')
      .insert({
        name: requestBody.name,
        description: requestBody.description,
        user_id: authContext.user.id,
        width_cm: requestBody.options.width_cm,
        depth_cm: requestBody.options.depth_cm,
        height_cm: requestBody.options.height_cm,
        material: requestBody.options.material,
        color: requestBody.options.color,
        finish: requestBody.options.finish,
        custom_specs: requestBody.custom_specs,
        tags: requestBody.tags || [],
        is_public: requestBody.is_public,
        estimated_price: requestBody.estimated_price || 0,
        thumbnail_url: thumbnailUrl,
        status: 'draft',
        views_count: 0,
        likes_count: 0,
      })
      .select()
      .single()

    if (saveError) {
      logger.error('Failed to save design', requestId, { error: saveError })
      throw new Error('디자인을 저장할 수 없습니다')
    }

    // 사용자 할당량 업데이트
    if (userProfile.subscription_tier !== 'premium' &&
        userProfile.subscription_tier !== 'admin' &&
        userProfile.subscription_tier !== 'superadmin') {
      await supabase
        .from('user_profiles')
        .update({
          design_quota_used: (userProfile.design_quota_used || 0) + 1
        })
        .eq('id', authContext.user.id)
    }

    // 응답 데이터 구성
    const designResponse: DesignResponse = {
      id: savedDesign.id,
      name: savedDesign.name,
      description: savedDesign.description,
      user_id: savedDesign.user_id,
      created_at: savedDesign.created_at,
      updated_at: savedDesign.updated_at,
      status: savedDesign.status,
      options: {
        width_cm: savedDesign.width_cm,
        depth_cm: savedDesign.depth_cm,
        height_cm: savedDesign.height_cm,
        material: savedDesign.material,
        color: savedDesign.color,
        finish: savedDesign.finish,
      },
      custom_specs: savedDesign.custom_specs,
      tags: savedDesign.tags,
      is_public: savedDesign.is_public,
      estimated_price: savedDesign.estimated_price,
      thumbnail_url: savedDesign.thumbnail_url,
      likes_count: 0,
      views_count: 0,
    }

    logger.info('Save design request completed', requestId, {
      userId: authContext.user.id,
      designId: savedDesign.id,
      designName: savedDesign.name,
    })

    const response = createSuccessResponse(designResponse, requestId, 201)

    // Rate limit 헤더 추가
    Object.entries(getRateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    timer.complete(201)
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Version',
    },
  })
}

// 메인 핸들러들
export const GET = withErrorHandling(handleGet)
export const POST = withErrorHandling(handlePost)
export const OPTIONS = handleOptions
