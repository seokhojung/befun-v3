// 개별 디자인 API 엔드포인트 ([id])
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSuccessResponse, createErrorResponse, withErrorHandling, NotFoundError } from '@/lib/api/errors'
import { authenticateRequest, authorizeResourceAccess } from '@/lib/api/auth'
import { validateRequestBody, validatePathParams, CommonSchemas } from '@/lib/api/validation'
import { checkDefaultRateLimit, getRateLimitHeaders } from '@/lib/api/rate-limiter'
import { processApiVersion } from '@/lib/api/version'
import { RequestTimer, logger } from '@/lib/api/logger'
import { supabase } from '@/lib/supabase'

// 경로 파라미터 스키마
const pathParamsSchema = z.object({
  id: CommonSchemas.uuid,
})

// 디자인 업데이트 스키마
const updateDesignSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  options: z.object({
    width_cm: z.number().min(10).max(500).optional(),
    depth_cm: z.number().min(10).max(500).optional(),
    height_cm: z.number().min(10).max(300).optional(),
    material: z.enum(['wood', 'metal', 'glass', 'fabric']).optional(),
    color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
    finish: z.enum(['matte', 'glossy', 'satin']).optional(),
  }).optional(),
  custom_specs: z.record(z.any()).optional(),
  tags: z.array(z.string().max(20)).max(10).optional(),
  is_public: z.boolean().optional(),
  status: z.enum(['draft', 'completed', 'ordered', 'archived']).optional(),
  estimated_price: z.number().optional(),
  thumbnail_data: z.string().optional(),
})

// 디자인 상세 조회
async function handleGet(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // 경로 파라미터 검증
    const { id } = validatePathParams(params, pathParamsSchema, requestId)

    // 인증 확인
    const authContext = await authenticateRequest(request, requestId)

    logger.info('Get design by ID request started', requestId, {
      userId: authContext.user.id,
      designId: id,
    })

    // 디자인 조회
    const { data: design, error: designError } = await supabase
      .from('saved_designs')
      .select(`
        *,
        user_profiles!inner(email, subscription_tier)
      `)
      .eq('id', id)
      .single()

    if (designError || !design) {
      throw new NotFoundError('디자인', requestId)
    }

    // 접근 권한 확인 (자신의 디자인이거나 공개 디자인)
    const canAccess = design.user_id === authContext.user.id || design.is_public
    if (!canAccess) {
      throw new NotFoundError('디자인', requestId)
    }

    // 조회수 증가 (자신의 디자인이 아닌 경우에만)
    if (design.user_id !== authContext.user.id) {
      await supabase
        .from('saved_designs')
        .update({ views_count: (design.views_count || 0) + 1 })
        .eq('id', id)
    }

    // 응답 데이터 구성
    const designResponse = {
      id: design.id,
      name: design.name,
      description: design.description,
      user_id: design.user_id,
      user_email: design.user_profiles?.email,
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
      views_count: (design.views_count || 0) + (design.user_id !== authContext.user.id ? 1 : 0),
      permissions: {
        can_edit: design.user_id === authContext.user.id,
        can_delete: design.user_id === authContext.user.id,
        can_like: design.user_id !== authContext.user.id,
      },
    }

    logger.info('Get design by ID request completed', requestId, {
      userId: authContext.user.id,
      designId: id,
      isOwner: design.user_id === authContext.user.id,
    })

    const response = createSuccessResponse(designResponse, requestId)

    // Rate limit 헤더 추가
    Object.entries(getRateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    timer.complete(200)
    return response

  } catch (error) {
    timer.complete(error instanceof NotFoundError ? 404 : 500)
    return createErrorResponse(error, requestId)
  }
}

// 디자인 업데이트
async function handlePut(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // 경로 파라미터 검증
    const { id } = validatePathParams(params, pathParamsSchema, requestId)

    // 인증 확인
    const authContext = await authenticateRequest(request, requestId)

    // 리소스 소유권 확인
    await authorizeResourceAccess(authContext, 'design', id, 'design:update')

    // 요청 본문 검증
    const requestBody = await validateRequestBody(request, updateDesignSchema, requestId)

    logger.info('Update design request started', requestId, {
      userId: authContext.user.id,
      designId: id,
    })

    // 기존 디자인 조회
    const { data: existingDesign, error: fetchError } = await supabase
      .from('saved_designs')
      .select('*')
      .eq('id', id)
      .eq('user_id', authContext.user.id) // 추가 보안 체크
      .single()

    if (fetchError || !existingDesign) {
      throw new NotFoundError('디자인', requestId)
    }

    // 업데이트 데이터 구성
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (requestBody.name !== undefined) updateData.name = requestBody.name
    if (requestBody.description !== undefined) updateData.description = requestBody.description
    if (requestBody.tags !== undefined) updateData.tags = requestBody.tags
    if (requestBody.is_public !== undefined) updateData.is_public = requestBody.is_public
    if (requestBody.status !== undefined) updateData.status = requestBody.status
    if (requestBody.estimated_price !== undefined) updateData.estimated_price = requestBody.estimated_price
    if (requestBody.custom_specs !== undefined) updateData.custom_specs = requestBody.custom_specs

    // 옵션 업데이트
    if (requestBody.options) {
      if (requestBody.options.width_cm !== undefined) updateData.width_cm = requestBody.options.width_cm
      if (requestBody.options.depth_cm !== undefined) updateData.depth_cm = requestBody.options.depth_cm
      if (requestBody.options.height_cm !== undefined) updateData.height_cm = requestBody.options.height_cm
      if (requestBody.options.material !== undefined) updateData.material = requestBody.options.material
      if (requestBody.options.color !== undefined) updateData.color = requestBody.options.color
      if (requestBody.options.finish !== undefined) updateData.finish = requestBody.options.finish
    }

    // 썸네일 처리
    if (requestBody.thumbnail_data) {
      // 실제 구현에서는 이미지 처리 및 저장
      updateData.thumbnail_url = `https://example.com/thumbnails/${id}_${Date.now()}.jpg`
    }

    // 디자인 업데이트
    const { data: updatedDesign, error: updateError } = await supabase
      .from('saved_designs')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', authContext.user.id)
      .select()
      .single()

    if (updateError) {
      logger.error('Failed to update design', requestId, { error: updateError })
      throw new Error('디자인을 업데이트할 수 없습니다')
    }

    // 응답 데이터 구성
    const designResponse = {
      id: updatedDesign.id,
      name: updatedDesign.name,
      description: updatedDesign.description,
      user_id: updatedDesign.user_id,
      created_at: updatedDesign.created_at,
      updated_at: updatedDesign.updated_at,
      status: updatedDesign.status,
      options: {
        width_cm: updatedDesign.width_cm,
        depth_cm: updatedDesign.depth_cm,
        height_cm: updatedDesign.height_cm,
        material: updatedDesign.material,
        color: updatedDesign.color,
        finish: updatedDesign.finish,
      },
      custom_specs: updatedDesign.custom_specs,
      tags: updatedDesign.tags || [],
      is_public: updatedDesign.is_public,
      estimated_price: updatedDesign.estimated_price,
      thumbnail_url: updatedDesign.thumbnail_url,
      likes_count: updatedDesign.likes_count || 0,
      views_count: updatedDesign.views_count || 0,
    }

    logger.info('Update design request completed', requestId, {
      userId: authContext.user.id,
      designId: id,
      changedFields: Object.keys(updateData),
    })

    const response = createSuccessResponse(designResponse, requestId)

    // Rate limit 헤더 추가
    Object.entries(getRateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    timer.complete(200)
    return response

  } catch (error) {
    timer.complete(error instanceof NotFoundError ? 404 : 500)
    return createErrorResponse(error, requestId)
  }
}

// 디자인 삭제
async function handleDelete(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // 경로 파라미터 검증
    const { id } = validatePathParams(params, pathParamsSchema, requestId)

    // 인증 확인
    const authContext = await authenticateRequest(request, requestId)

    // 리소스 소유권 확인
    await authorizeResourceAccess(authContext, 'design', id, 'design:delete')

    logger.info('Delete design request started', requestId, {
      userId: authContext.user.id,
      designId: id,
    })

    // 기존 디자인 조회 (삭제 전 확인)
    const { data: existingDesign, error: fetchError } = await supabase
      .from('saved_designs')
      .select('user_id, name, status')
      .eq('id', id)
      .eq('user_id', authContext.user.id) // 추가 보안 체크
      .single()

    if (fetchError || !existingDesign) {
      throw new NotFoundError('디자인', requestId)
    }

    // 주문된 디자인은 삭제 불가
    if (existingDesign.status === 'ordered') {
      throw new Error('주문이 완료된 디자인은 삭제할 수 없습니다')
    }

    // 디자인 삭제 (실제로는 상태를 archived로 변경)
    const { error: deleteError } = await supabase
      .from('saved_designs')
      .update({
        status: 'archived',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', authContext.user.id)

    if (deleteError) {
      logger.error('Failed to delete design', requestId, { error: deleteError })
      throw new Error('디자인을 삭제할 수 없습니다')
    }

    // 사용자 할당량 업데이트 (archived 상태로 변경 시 할당량 반환)
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('design_quota_used, subscription_tier')
      .eq('id', authContext.user.id)
      .single()

    if (userProfile && userProfile.subscription_tier !== 'premium' &&
        userProfile.subscription_tier !== 'admin' &&
        userProfile.subscription_tier !== 'superadmin') {
      await supabase
        .from('user_profiles')
        .update({
          design_quota_used: Math.max(0, (userProfile.design_quota_used || 0) - 1)
        })
        .eq('id', authContext.user.id)
    }

    logger.info('Delete design request completed', requestId, {
      userId: authContext.user.id,
      designId: id,
      designName: existingDesign.name,
    })

    const response = createSuccessResponse(
      { message: '디자인이 삭제되었습니다', id },
      requestId
    )

    // Rate limit 헤더 추가
    Object.entries(getRateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    timer.complete(200)
    return response

  } catch (error) {
    timer.complete(error instanceof NotFoundError ? 404 : 500)
    return createErrorResponse(error, requestId)
  }
}

// OPTIONS 핸들러 (CORS)
async function handleOptions() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Version',
    },
  })
}

// 메인 핸들러들
export const GET = withErrorHandling(handleGet)
export const PUT = withErrorHandling(handlePut)
export const DELETE = withErrorHandling(handleDelete)
export const OPTIONS = handleOptions