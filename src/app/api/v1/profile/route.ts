// 사용자 프로필 관리 API 엔드포인트
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSuccessResponse, createErrorResponse, withErrorHandling } from '@/lib/api/errors'
import { authenticateRequest, authorizeRequest } from '@/lib/api/auth'
import { validateRequestBody } from '@/lib/api/validation'
import { checkDefaultRateLimit, getRateLimitHeaders } from '@/lib/api/rate-limiter'
import { processApiVersion } from '@/lib/api/version'
import { RequestTimer, logger } from '@/lib/api/logger'
import { supabase } from '@/lib/supabase'

// 프로필 업데이트 스키마
const updateProfileSchema = z.object({
  display_name: z.string().min(2, '이름은 2글자 이상이어야 합니다').max(50, '이름은 50자 이내로 입력해주세요').optional(),
  bio: z.string().max(200, '자기소개는 200자 이내로 입력해주세요').optional(),
  website: z.string().url('올바른 웹사이트 주소를 입력해주세요').optional(),
  avatar_data: z.string().optional(), // Base64 인코딩된 아바타 이미지
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'auto']).optional(),
    units: z.enum(['cm', 'inch']).optional(),
    currency: z.enum(['KRW', 'USD', 'EUR', 'JPY']).optional(),
    notifications: z.object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
      sms: z.boolean().optional(),
      marketing: z.boolean().optional(),
    }).optional(),
    privacy: z.object({
      show_profile: z.boolean().optional(),
      show_designs: z.boolean().optional(),
      show_activity: z.boolean().optional(),
    }).optional(),
  }).optional(),
  contact_info: z.object({
    phone: z.string().min(10).max(20).optional(),
    address: z.object({
      address_line1: z.string().min(5).optional(),
      address_line2: z.string().optional(),
      city: z.string().min(2).optional(),
      state: z.string().min(2).optional(),
      postal_code: z.string().min(5).optional(),
      country: z.string().default('KR').optional(),
    }).optional(),
  }).optional(),
})

// 프로필 응답 타입
interface ProfileResponse {
  user_id: string
  email: string
  display_name?: string
  bio?: string
  website?: string
  avatar_url?: string
  subscription_tier: 'free' | 'premium' | 'admin' | 'superadmin'
  created_at: string
  updated_at: string
  last_active: string
  stats: {
    total_designs: number
    public_designs: number
    total_likes: number
    profile_views: number
  }
  quota: {
    designs_used: number
    designs_limit: number
    storage_used: number
    storage_limit: number
  }
  preferences: {
    theme: 'light' | 'dark' | 'auto'
    units: 'cm' | 'inch'
    currency: 'KRW' | 'USD' | 'EUR' | 'JPY'
    notifications: {
      email: boolean
      push: boolean
      sms: boolean
      marketing: boolean
    }
    privacy: {
      show_profile: boolean
      show_designs: boolean
      show_activity: boolean
    }
  }
  contact_info?: {
    phone?: string
    address?: {
      address_line1?: string
      address_line2?: string
      city?: string
      state?: string
      postal_code?: string
      country?: string
    }
  }
  badges: Array<{
    id: string
    name: string
    description: string
    earned_at: string
  }>
}

// GET 핸들러 - 프로필 조회
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

    // 권한 확인 - 프로필 읽기 권한
    await authorizeRequest(authContext, ['profile:read'])

    logger.info('Get profile request started', requestId, {
      userId: authContext.user.id,
    })

    // 사용자 프로필 조회
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        *,
        user_badges(
          badges(id, name, description),
          earned_at
        )
      `)
      .eq('id', authContext.user.id)
      .single()

    if (profileError) {
      logger.error('Failed to fetch profile', requestId, { error: profileError })
      throw new Error('프로필을 조회할 수 없습니다')
    }

    // 사용자 통계 조회
    const { data: stats, error: statsError } = await supabase
      .rpc('get_user_stats', {
        user_id: authContext.user.id,
      })

    const userStats = stats || {
      total_designs: 0,
      public_designs: 0,
      total_likes: 0,
      profile_views: 0,
    }

    // 응답 데이터 구성
    const profileResponse: ProfileResponse = {
      user_id: authContext.user.id,
      email: authContext.user.email || '',
      display_name: profile.display_name,
      bio: profile.bio,
      website: profile.website,
      avatar_url: profile.avatar_url,
      subscription_tier: profile.subscription_tier || 'free',
      created_at: profile.created_at || authContext.user.created_at,
      updated_at: profile.updated_at || profile.created_at,
      last_active: profile.last_sign_in_at || new Date().toISOString(),
      stats: userStats,
      quota: {
        designs_used: profile.design_quota_used || 0,
        designs_limit: profile.design_quota_limit || 5,
        storage_used: profile.storage_used || 0,
        storage_limit: profile.storage_limit || (100 * 1024 * 1024), // 100MB
      },
      preferences: {
        theme: profile.ui_preferences?.theme || 'light',
        units: profile.ui_preferences?.units || 'cm',
        currency: profile.ui_preferences?.currency || 'KRW',
        notifications: {
          email: profile.notification_preferences?.email ?? true,
          push: profile.notification_preferences?.push ?? false,
          sms: profile.notification_preferences?.sms ?? false,
          marketing: profile.notification_preferences?.marketing ?? false,
        },
        privacy: {
          show_profile: profile.privacy_preferences?.show_profile ?? true,
          show_designs: profile.privacy_preferences?.show_designs ?? true,
          show_activity: profile.privacy_preferences?.show_activity ?? false,
        },
      },
      contact_info: profile.contact_info,
      badges: (profile.user_badges || []).map((badge: any) => ({
        id: badge.badges.id,
        name: badge.badges.name,
        description: badge.badges.description,
        earned_at: badge.earned_at,
      })),
    }

    // 프로필 조회수 증가
    await supabase
      .from('user_profiles')
      .update({
        profile_views: (profile.profile_views || 0) + 1,
        last_active_at: new Date().toISOString(),
      })
      .eq('id', authContext.user.id)

    logger.info('Get profile request completed', requestId, {
      userId: authContext.user.id,
      hasAvatar: !!profile.avatar_url,
      subscriptionTier: profile.subscription_tier,
    })

    const response = createSuccessResponse(profileResponse, requestId)

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

// PUT 핸들러 - 프로필 업데이트
async function handlePut(request: NextRequest) {
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

    // 권한 확인 - 프로필 쓰기 권한
    await authorizeRequest(authContext, ['profile:write'])

    // 요청 본문 검증
    const requestBody = await validateRequestBody(request, updateProfileSchema, requestId)

    logger.info('Update profile request started', requestId, {
      userId: authContext.user.id,
      updatedFields: Object.keys(requestBody),
    })

    // 업데이트 데이터 구성
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (requestBody.display_name !== undefined) updateData.display_name = requestBody.display_name
    if (requestBody.bio !== undefined) updateData.bio = requestBody.bio
    if (requestBody.website !== undefined) updateData.website = requestBody.website

    // 아바타 처리
    if (requestBody.avatar_data) {
      // 실제 구현에서는 이미지 최적화 및 저장
      updateData.avatar_url = `https://example.com/avatars/${authContext.user.id}_${Date.now()}.jpg`
    }

    // 설정 업데이트
    if (requestBody.preferences) {
      const currentProfile = await supabase
        .from('user_profiles')
        .select('ui_preferences, notification_preferences, privacy_preferences')
        .eq('id', authContext.user.id)
        .single()

      if (requestBody.preferences.theme || requestBody.preferences.units || requestBody.preferences.currency) {
        updateData.ui_preferences = {
          ...(currentProfile.data?.ui_preferences || {}),
          ...(requestBody.preferences.theme && { theme: requestBody.preferences.theme }),
          ...(requestBody.preferences.units && { units: requestBody.preferences.units }),
          ...(requestBody.preferences.currency && { currency: requestBody.preferences.currency }),
        }
      }

      if (requestBody.preferences.notifications) {
        updateData.notification_preferences = {
          ...(currentProfile.data?.notification_preferences || {}),
          ...requestBody.preferences.notifications,
        }
      }

      if (requestBody.preferences.privacy) {
        updateData.privacy_preferences = {
          ...(currentProfile.data?.privacy_preferences || {}),
          ...requestBody.preferences.privacy,
        }
      }
    }

    // 연락처 정보
    if (requestBody.contact_info) {
      updateData.contact_info = requestBody.contact_info
    }

    // 프로필 업데이트
    const { data: updatedProfile, error: updateError } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', authContext.user.id)
      .select()
      .single()

    if (updateError) {
      logger.error('Failed to update profile', requestId, { error: updateError })
      throw new Error('프로필을 업데이트할 수 없습니다')
    }

    // 활동 로그
    await supabase
      .from('user_activity_logs')
      .insert({
        user_id: authContext.user.id,
        action: 'profile_updated',
        details: {
          updated_fields: Object.keys(requestBody),
          timestamp: new Date().toISOString(),
        },
      })

    // 업데이트된 프로필 응답
    const profileResponse = {
      user_id: authContext.user.id,
      email: authContext.user.email,
      display_name: updatedProfile.display_name,
      bio: updatedProfile.bio,
      website: updatedProfile.website,
      avatar_url: updatedProfile.avatar_url,
      subscription_tier: updatedProfile.subscription_tier,
      updated_at: updatedProfile.updated_at,
      preferences: {
        theme: updatedProfile.ui_preferences?.theme || 'light',
        units: updatedProfile.ui_preferences?.units || 'cm',
        currency: updatedProfile.ui_preferences?.currency || 'KRW',
        notifications: updatedProfile.notification_preferences || {
          email: true,
          push: false,
          sms: false,
          marketing: false,
        },
        privacy: updatedProfile.privacy_preferences || {
          show_profile: true,
          show_designs: true,
          show_activity: false,
        },
      },
      contact_info: updatedProfile.contact_info,
    }

    logger.info('Update profile request completed', requestId, {
      userId: authContext.user.id,
      updatedFields: Object.keys(updateData),
    })

    const response = createSuccessResponse(profileResponse, requestId)

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

// DELETE 핸들러 - 계정 삭제 (비활성화)
async function handleDelete(request: NextRequest) {
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

    logger.info('Delete profile request started', requestId, {
      userId: authContext.user.id,
    })

    // 계정 비활성화 (실제 삭제 대신)
    const { error: deactivateError } = await supabase
      .from('user_profiles')
      .update({
        status: 'deactivated',
        deactivated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', authContext.user.id)

    if (deactivateError) {
      logger.error('Failed to deactivate account', requestId, { error: deactivateError })
      throw new Error('계정을 비활성화할 수 없습니다')
    }

    // 디자인들도 비공개로 변경
    await supabase
      .from('saved_designs')
      .update({
        is_public: false,
        status: 'archived',
      })
      .eq('user_id', authContext.user.id)

    // 활동 로그
    await supabase
      .from('user_activity_logs')
      .insert({
        user_id: authContext.user.id,
        action: 'account_deactivated',
        details: {
          timestamp: new Date().toISOString(),
          reason: 'user_requested',
        },
      })

    logger.info('Delete profile request completed', requestId, {
      userId: authContext.user.id,
    })

    const response = createSuccessResponse(
      { message: '계정이 비활성화되었습니다' },
      requestId
    )

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