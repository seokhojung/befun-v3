import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import type { ApiResponse } from '@/types/auth'

export async function POST(request: NextRequest) {
  try {
    // IP 주소와 User-Agent 가져오기 (로깅용)
    const clientIp = request.headers.get('x-forwarded-for') ||
                    request.headers.get('x-real-ip') ||
                    '127.0.0.1'
    const userAgent = request.headers.get('user-agent') || 'Unknown'

    // 현재 사용자 정보 가져오기
    const { data: currentUser } = await supabase.auth.getUser()

    // Supabase 세션 종료
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Logout error:', error)

      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          message: '로그아웃 중 오류가 발생했습니다. 다시 시도해주세요.',
          code: 'LOGOUT_ERROR'
        }
      }, { status: 500 })
    }

    // 로그아웃 활동 로그 기록
    if (currentUser.user) {
      try {
        await supabaseAdmin
          .from('user_activity_logs')
          .insert({
            user_id: currentUser.user.id,
            action: 'user_logout',
            details: {
              logout_method: 'explicit',
              user_agent: userAgent
            },
            ip_address: clientIp,
            user_agent: userAgent
          })
      } catch (logError) {
        console.error('Failed to log user logout activity:', logError)
      }
    }

    // 쿠키 제거
    const response = NextResponse.json<ApiResponse>({
      success: true,
      data: {
        message: '성공적으로 로그아웃되었습니다.'
      }
    }, { status: 200 })

    // 인증 관련 쿠키 제거
    response.cookies.delete('supabase-auth-token')
    response.cookies.delete('supabase-refresh-token')

    // 추가 보안을 위해 쿠키를 명시적으로 만료시킴
    response.cookies.set('supabase-auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      expires: new Date(0)
    })

    response.cookies.set('supabase-refresh-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      expires: new Date(0)
    })

    return response

  } catch (error) {
    console.error('Logout error:', error)

    // 로그아웃 실패 로그 기록
    try {
      const clientIp = request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      '127.0.0.1'
      const userAgent = request.headers.get('user-agent') || 'Unknown'

      // 현재 사용자 정보 가져오기 (가능한 경우)
      const { data: currentUser } = await supabase.auth.getUser()

      if (currentUser.user) {
        await supabaseAdmin
          .from('user_activity_logs')
          .insert({
            user_id: currentUser.user.id,
            action: 'user_logout_failed',
            details: {
              error_message: error instanceof Error ? error.message : 'Unknown error',
              user_agent: userAgent
            },
            ip_address: clientIp,
            user_agent: userAgent
          })
      }
    } catch (logError) {
      console.error('Failed to log logout error:', logError)
    }

    return NextResponse.json<ApiResponse>({
      success: false,
      error: {
        message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        code: 'INTERNAL_SERVER_ERROR'
      }
    }, { status: 500 })
  }
}

// GET 메서드도 지원 (URL을 통한 로그아웃)
export async function GET(request: NextRequest) {
  return POST(request)
}

// OPTIONS 메서드 처리 (CORS)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}