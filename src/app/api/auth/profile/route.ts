import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import type { ApiResponse, UserProfile } from '@/types/auth'

// 프로필 조회
export async function GET(request: NextRequest) {
  try {
    // Authorization 헤더에서 토큰 가져오기
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          message: '인증이 필요합니다.',
          code: 'UNAUTHORIZED'
        }
      }, { status: 401 })
    }

    const token = authHeader.substring(7) // 'Bearer ' 제거

    // 토큰으로 사용자 정보 가져오기
    const { data: userData, error: userError } = await supabase.auth.getUser(token)

    if (userError || !userData.user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          message: '유효하지 않은 토큰입니다.',
          code: 'INVALID_TOKEN'
        }
      }, { status: 401 })
    }

    // 사용자 프로필 정보 조회
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userData.user.id)
      .single()

    // 사용자 설정 정보 조회
    const { data: settingsData, error: settingsError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('id', userData.user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Profile fetch error:', profileError)
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          message: '프로필 정보를 가져올 수 없습니다.',
          code: 'PROFILE_FETCH_ERROR'
        }
      }, { status: 500 })
    }

    const userProfile: UserProfile = {
      id: userData.user.id,
      email: userData.user.email || '',
      created_at: userData.user.created_at || new Date().toISOString(),
      last_sign_in_at: userData.user.last_sign_in_at,
      email_verified: userData.user.email_confirmed_at !== null,
    }

    // 확장 프로필 정보가 있는 경우 추가
    const extendedProfile = {
      ...userProfile,
      full_name: profileData?.full_name,
      avatar_url: profileData?.avatar_url,
      website: profileData?.website,
      bio: profileData?.bio,
      settings: settingsData ? {
        theme: settingsData.theme,
        language: settingsData.language,
        notifications_enabled: settingsData.notifications_enabled,
        email_notifications: settingsData.email_notifications
      } : null
    }

    return NextResponse.json<ApiResponse<typeof extendedProfile>>({
      success: true,
      data: extendedProfile
    })

  } catch (error) {
    console.error('Profile GET error:', error)

    return NextResponse.json<ApiResponse>({
      success: false,
      error: {
        message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        code: 'INTERNAL_SERVER_ERROR'
      }
    }, { status: 500 })
  }
}

// 프로필 업데이트
export async function PATCH(request: NextRequest) {
  try {
    // Authorization 헤더에서 토큰 가져오기
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          message: '인증이 필요합니다.',
          code: 'UNAUTHORIZED'
        }
      }, { status: 401 })
    }

    const token = authHeader.substring(7)

    // 토큰으로 사용자 정보 가져오기
    const { data: userData, error: userError } = await supabase.auth.getUser(token)

    if (userError || !userData.user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          message: '유효하지 않은 토큰입니다.',
          code: 'INVALID_TOKEN'
        }
      }, { status: 401 })
    }

    const updateData = await request.json()

    // 업데이트할 수 있는 필드들 필터링
    const allowedProfileFields = ['full_name', 'avatar_url', 'website', 'bio']
    const allowedSettingsFields = ['theme', 'language', 'notifications_enabled', 'email_notifications']

    const profileUpdates: any = {}
    const settingsUpdates: any = {}

    // 프로필 필드 분리
    for (const [key, value] of Object.entries(updateData)) {
      if (allowedProfileFields.includes(key)) {
        profileUpdates[key] = value
      } else if (allowedSettingsFields.includes(key)) {
        settingsUpdates[key] = value
      }
    }

    // IP 주소와 User-Agent 가져오기 (로깅용)
    const clientIp = request.headers.get('x-forwarded-for') ||
                    request.headers.get('x-real-ip') ||
                    '127.0.0.1'
    const userAgent = request.headers.get('user-agent') || 'Unknown'

    let profileResult = null
    let settingsResult = null

    // 프로필 업데이트
    if (Object.keys(profileUpdates).length > 0) {
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .update(profileUpdates)
        .eq('id', userData.user.id)
        .select()
        .single()

      if (profileError) {
        console.error('Profile update error:', profileError)
        return NextResponse.json<ApiResponse>({
          success: false,
          error: {
            message: '프로필 업데이트 중 오류가 발생했습니다.',
            code: 'PROFILE_UPDATE_ERROR'
          }
        }, { status: 500 })
      }

      profileResult = profileData
    }

    // 설정 업데이트
    if (Object.keys(settingsUpdates).length > 0) {
      const { data: settingsData, error: settingsError } = await supabase
        .from('user_settings')
        .update(settingsUpdates)
        .eq('id', userData.user.id)
        .select()
        .single()

      if (settingsError) {
        console.error('Settings update error:', settingsError)
        return NextResponse.json<ApiResponse>({
          success: false,
          error: {
            message: '설정 업데이트 중 오류가 발생했습니다.',
            code: 'SETTINGS_UPDATE_ERROR'
          }
        }, { status: 500 })
      }

      settingsResult = settingsData
    }

    // 활동 로그 기록
    try {
      await supabaseAdmin
        .from('user_activity_logs')
        .insert({
          user_id: userData.user.id,
          action: 'profile_updated',
          details: {
            updated_fields: [...Object.keys(profileUpdates), ...Object.keys(settingsUpdates)],
            user_agent: userAgent
          },
          ip_address: clientIp,
          user_agent: userAgent
        })
    } catch (logError) {
      console.error('Failed to log profile update:', logError)
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        message: '프로필이 성공적으로 업데이트되었습니다.',
        profile: profileResult,
        settings: settingsResult
      }
    })

  } catch (error) {
    console.error('Profile PATCH error:', error)

    return NextResponse.json<ApiResponse>({
      success: false,
      error: {
        message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        code: 'INTERNAL_SERVER_ERROR'
      }
    }, { status: 500 })
  }
}

// 계정 삭제
export async function DELETE(request: NextRequest) {
  try {
    // Authorization 헤더에서 토큰 가져오기
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          message: '인증이 필요합니다.',
          code: 'UNAUTHORIZED'
        }
      }, { status: 401 })
    }

    const token = authHeader.substring(7)

    // 토큰으로 사용자 정보 가져오기
    const { data: userData, error: userError } = await supabase.auth.getUser(token)

    if (userError || !userData.user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          message: '유효하지 않은 토큰입니다.',
          code: 'INVALID_TOKEN'
        }
      }, { status: 401 })
    }

    // 관리자 권한으로 사용자 삭제
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      userData.user.id
    )

    if (deleteError) {
      console.error('User deletion error:', deleteError)
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          message: '계정 삭제 중 오류가 발생했습니다.',
          code: 'DELETE_ERROR'
        }
      }, { status: 500 })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        message: '계정이 성공적으로 삭제되었습니다.'
      }
    })

  } catch (error) {
    console.error('Profile DELETE error:', error)

    return NextResponse.json<ApiResponse>({
      success: false,
      error: {
        message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        code: 'INTERNAL_SERVER_ERROR'
      }
    }, { status: 500 })
  }
}

// OPTIONS 메서드 처리 (CORS)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}