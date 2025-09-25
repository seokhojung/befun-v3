import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import type { LoginRequest, ApiResponse, AuthResponse } from '@/types/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password }: LoginRequest = await request.json()

    // 입력 검증
    if (!email || !password) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          message: '이메일과 비밀번호를 입력해주세요.',
          code: 'MISSING_CREDENTIALS'
        }
      }, { status: 400 })
    }

    // IP 주소 가져오기
    const clientIp = request.headers.get('x-forwarded-for') ||
                    request.headers.get('x-real-ip') ||
                    '127.0.0.1'

    // User-Agent 가져오기
    const userAgent = request.headers.get('user-agent') || 'Unknown'

    // 로그인 시도 횟수 확인 (Rate Limiting)
    try {
      const { data: rateLimitCheck } = await supabaseAdmin
        .rpc('check_login_rate_limit', {
          user_email: email,
          client_ip: clientIp,
          max_attempts: 5,
          time_window: '1 hour'
        })

      if (!rateLimitCheck) {
        // 로그인 시도 기록 (실패)
        await supabaseAdmin
          .from('login_attempts')
          .insert({
            email,
            ip_address: clientIp,
            success: false
          })

        return NextResponse.json<ApiResponse>({
          success: false,
          error: {
            message: '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.',
            code: 'RATE_LIMIT_EXCEEDED'
          }
        }, { status: 429 })
      }
    } catch (rateLimitError) {
      // Rate limiting 체크 실패시 로그만 남기고 계속 진행
      console.warn('Rate limit check failed:', rateLimitError)
    }

    // Supabase를 통한 로그인 시도
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    // 로그인 시도 기록
    const loginSuccess = !authError && authData.user
    try {
      await supabaseAdmin
        .from('login_attempts')
        .insert({
          email,
          ip_address: clientIp,
          success: loginSuccess
        })
    } catch (logError) {
      console.error('Failed to log login attempt:', logError)
    }

    if (authError || !authData.user || !authData.session) {
      // 로그인 실패 처리
      let errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.'
      let errorCode = 'INVALID_CREDENTIALS'

      if (authError?.message.includes('Email not confirmed')) {
        errorMessage = '이메일 인증이 완료되지 않았습니다. 이메일을 확인해주세요.'
        errorCode = 'EMAIL_NOT_CONFIRMED'
      } else if (authError?.message.includes('Invalid login credentials')) {
        errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.'
        errorCode = 'INVALID_CREDENTIALS'
      } else if (authError?.message.includes('too many requests')) {
        errorMessage = '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
        errorCode = 'RATE_LIMIT_EXCEEDED'
      }

      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          message: errorMessage,
          code: errorCode
        }
      }, { status: 401 })
    }

    // 성공적인 로그인 활동 로그 기록
    try {
      await supabaseAdmin
        .from('user_activity_logs')
        .insert({
          user_id: authData.user.id,
          action: 'user_login',
          details: {
            login_method: 'email',
            user_agent: userAgent,
            successful: true
          },
          ip_address: clientIp,
          user_agent: userAgent
        })
    } catch (logError) {
      console.error('Failed to log user login activity:', logError)
    }

    const response: AuthResponse = {
      user: authData.user,
      session: authData.session,
    }

    // JWT 토큰을 쿠키에 설정
    const cookieResponse = NextResponse.json<ApiResponse<AuthResponse>>({
      success: true,
      data: response
    }, { status: 200 })

    // HttpOnly 쿠키에 세션 토큰 저장
    if (authData.session.access_token) {
      cookieResponse.cookies.set('supabase-auth-token', authData.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: authData.session.expires_in || 3600 // 1시간
      })
    }

    if (authData.session.refresh_token) {
      cookieResponse.cookies.set('supabase-refresh-token', authData.session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30 // 30일
      })
    }

    return cookieResponse

  } catch (error) {
    console.error('Login error:', error)

    // 로그인 시도 기록 (에러)
    try {
      const clientIp = request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      '127.0.0.1'

      const requestBody = await request.clone().json().catch(() => ({}))
      const email = requestBody.email

      if (email) {
        await supabaseAdmin
          .from('login_attempts')
          .insert({
            email,
            ip_address: clientIp,
            success: false
          })
      }
    } catch (logError) {
      console.error('Failed to log error login attempt:', logError)
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

// OPTIONS 메서드 처리 (CORS)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}