import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isMockMode } from '@/lib/utils/env-check'
import { mockGetUser } from '@/lib/utils/mock-auth'
import type { ApiResponse, AuthResponse } from '@/types/auth'
import { getCorsHeaders } from '@/lib/utils/cors'

// 세션 유효성 검증 및 갱신
export async function GET(request: NextRequest) {
  try {
    // Authorization 헤더 또는 쿠키에서 토큰 가져오기
    let token: string | null = null

    // 1. Authorization 헤더 확인
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }

    // 2. 쿠키에서 토큰 확인
    if (!token) {
      const cookieToken = request.cookies.get('supabase-auth-token')?.value
      if (cookieToken) {
        token = cookieToken
      }
    }

    // 토큰이 없는 경우는 정상적인 비인증 상태이므로 200 OK 반환
    if (!token) {
      return NextResponse.json<ApiResponse<AuthResponse>>({
        success: true,
        data: {
          user: null,
          session: null
        }
      }, { status: 200 })
    }

    // 토큰으로 사용자 정보 가져오기 (Mock 또는 실제)
    let userData: { user: any }
    let userError: { message: string } | null = null

    if (isMockMode()) {
      // Mock 모드: 토큰 검증
      const mockResult = await mockGetUser(token)
      userData = mockResult.data
      userError = mockResult.error
    } else {
      // 실제 Supabase
      const result = await supabase.auth.getUser(token)
      userData = result.data
      userError = result.error
    }

    if (userError || !userData.user) {
      // Mock 모드에서는 토큰 만료 시 그냥 null 반환
      if (isMockMode()) {
        return NextResponse.json<ApiResponse<AuthResponse>>({
          success: true,
          data: {
            user: null,
            session: null
          }
        }, { status: 200 })
      }

      // 실제 환경: 토큰이 만료되었거나 유효하지 않은 경우 refresh token 확인
      const refreshToken = request.cookies.get('supabase-refresh-token')?.value

      if (refreshToken) {
        try {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
            refresh_token: refreshToken
          })

          if (refreshError || !refreshData.session) {
            return NextResponse.json<ApiResponse>({
              success: false,
              error: {
                message: '세션이 만료되었습니다. 다시 로그인해주세요.',
                code: 'SESSION_EXPIRED'
              }
            }, { status: 401 })
          }

          // 새로운 토큰으로 사용자 정보 가져오기
          const { data: newUserData } = await supabase.auth.getUser(refreshData.session.access_token)

          const response: AuthResponse = {
            user: newUserData.user,
            session: refreshData.session,
          }

          // 새로운 토큰을 쿠키에 설정
          const sessionResponse = NextResponse.json<ApiResponse<AuthResponse>>({
            success: true,
            data: response
          }, { status: 200 })

          sessionResponse.cookies.set('supabase-auth-token', refreshData.session.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: refreshData.session.expires_in || 3600
          })

          if (refreshData.session.refresh_token) {
            sessionResponse.cookies.set('supabase-refresh-token', refreshData.session.refresh_token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 60 * 60 * 24 * 30 // 30일
            })
          }

          return sessionResponse

        } catch (refreshError) {
          console.error('Token refresh error:', refreshError)
          return NextResponse.json<ApiResponse>({
            success: false,
            error: {
              message: '세션 갱신 중 오류가 발생했습니다.',
              code: 'REFRESH_ERROR'
            }
          }, { status: 401 })
        }
      }

      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          message: '유효하지 않은 세션입니다.',
          code: 'INVALID_SESSION'
        }
      }, { status: 401 })
    }

    // 현재 세션 정보 가져오기
    const { data: sessionData } = await supabase.auth.getSession()

    const response: AuthResponse = {
      user: userData.user,
      session: sessionData.session,
    }

    return NextResponse.json<ApiResponse<AuthResponse>>({
      success: true,
      data: response
    }, { status: 200 })

  } catch (error) {
    console.error('Session validation error:', error)

    return NextResponse.json<ApiResponse>({
      success: false,
      error: {
        message: '세션 검증 중 오류가 발생했습니다.',
        code: 'SESSION_VALIDATION_ERROR'
      }
    }, { status: 500 })
  }
}

// 세션 새로 고침
export async function POST(request: NextRequest) {
  try {
    const { refresh_token } = await request.json()

    if (!refresh_token) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          message: 'Refresh token이 필요합니다.',
          code: 'MISSING_REFRESH_TOKEN'
        }
      }, { status: 400 })
    }

    // 토큰 새로 고침
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
      refresh_token
    })

    if (refreshError || !refreshData.session) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          message: '토큰 새로 고침에 실패했습니다.',
          code: 'REFRESH_FAILED'
        }
      }, { status: 401 })
    }

    // IP 주소와 User-Agent 가져오기 (로깅용)
    const clientIp = request.headers.get('x-forwarded-for') ||
                    request.headers.get('x-real-ip') ||
                    '127.0.0.1'
    const userAgent = request.headers.get('user-agent') || 'Unknown'

    // 세션 갱신 활동 로그 기록
    try {
      if (refreshData.user) {
        await supabaseAdmin
          .from('user_activity_logs')
          .insert({
            user_id: refreshData.user.id,
          action: 'session_refreshed',
          details: {
            user_agent: userAgent,
            refresh_method: 'api'
          },
          ip_address: clientIp,
          user_agent: userAgent
        })
      }
    } catch (logError) {
      console.error('Failed to log session refresh:', logError)
    }

    const response: AuthResponse = {
      user: refreshData.user,
      session: refreshData.session,
    }

    // 새로운 토큰을 쿠키에 설정
    const sessionResponse = NextResponse.json<ApiResponse<AuthResponse>>({
      success: true,
      data: response
    }, { status: 200 })

    sessionResponse.cookies.set('supabase-auth-token', refreshData.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: refreshData.session.expires_in || 3600
    })

    if (refreshData.session.refresh_token) {
      sessionResponse.cookies.set('supabase-refresh-token', refreshData.session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30 // 30일
      })
    }

    return sessionResponse

  } catch (error) {
    console.error('Session refresh error:', error)

    return NextResponse.json<ApiResponse>({
      success: false,
      error: {
        message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        code: 'INTERNAL_SERVER_ERROR'
      }
    }, { status: 500 })
  }
}

// 세션 정보 확인 (간단한 버전)
export async function HEAD(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.substring(7) // 'Bearer ' 제거

    if (!token) {
      return new NextResponse(null, { status: 401 })
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(token)

    if (userError || !userData.user) {
      return new NextResponse(null, { status: 401 })
    }

    return new NextResponse(null, { status: 200 })

  } catch (error) {
    return new NextResponse(null, { status: 500 })
  }
}

// OPTIONS 메서드 처리 (CORS)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders('GET, POST, HEAD, OPTIONS'),
  })
}
