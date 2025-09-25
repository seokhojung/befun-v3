import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { RegisterRequest, ApiResponse, AuthResponse } from '@/types/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password }: RegisterRequest = await request.json()

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

    // 이메일 형식 검증
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
    if (!emailRegex.test(email)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          message: '올바른 이메일 형식을 입력해주세요.',
          code: 'INVALID_EMAIL_FORMAT'
        }
      }, { status: 400 })
    }

    // 비밀번호 강도 검증 (최소 8자, 영문+숫자 조합)
    if (password.length < 8) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          message: '비밀번호는 최소 8자 이상이어야 합니다.',
          code: 'WEAK_PASSWORD'
        }
      }, { status: 400 })
    }

    const hasLetter = /[A-Za-z]/.test(password)
    const hasNumber = /[0-9]/.test(password)

    if (!hasLetter || !hasNumber) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          message: '비밀번호는 영문과 숫자를 포함해야 합니다.',
          code: 'WEAK_PASSWORD'
        }
      }, { status: 400 })
    }

    // IP 주소 가져오기 (rate limiting용)
    const clientIp = request.headers.get('x-forwarded-for') ||
                    request.headers.get('x-real-ip') ||
                    '127.0.0.1'

    // User-Agent 가져오기
    const userAgent = request.headers.get('user-agent') || 'Unknown'

    // Supabase를 통한 사용자 등록
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: process.env.NODE_ENV === 'development' ? false : true, // 개발 환경에서는 이메일 확인 생략
    })

    if (authError) {
      // Supabase 에러 처리
      let errorMessage = '회원가입 중 오류가 발생했습니다.'
      let errorCode = 'SIGNUP_ERROR'

      if (authError.message.includes('already registered')) {
        errorMessage = '이미 가입된 이메일입니다.'
        errorCode = 'EMAIL_ALREADY_EXISTS'
      } else if (authError.message.includes('Password')) {
        errorMessage = '비밀번호가 보안 요구사항을 충족하지 않습니다.'
        errorCode = 'WEAK_PASSWORD'
      } else if (authError.message.includes('rate limit')) {
        errorMessage = '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
        errorCode = 'RATE_LIMIT_EXCEEDED'
      }

      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          message: errorMessage,
          code: errorCode
        }
      }, { status: 400 })
    }

    // 성공적인 가입 로그 기록 (실제 Supabase 연결시 활성화)
    try {
      // 로그인 시도 기록 (성공)
      await supabaseAdmin
        .from('login_attempts')
        .insert({
          email,
          ip_address: clientIp,
          success: true
        })

      // 사용자 활동 로그 기록
      if (authData.user) {
        await supabaseAdmin
          .from('user_activity_logs')
          .insert({
            user_id: authData.user.id,
            action: 'user_registered',
            details: {
              registration_method: 'email',
              user_agent: userAgent
            },
            ip_address: clientIp,
            user_agent: userAgent
          })
      }
    } catch (logError) {
      // 로그 기록 실패해도 회원가입은 성공으로 처리
      console.error('Failed to log user registration:', logError)
    }

    const response: AuthResponse = {
      user: authData.user,
      session: null, // 회원가입 후 자동 로그인하지 않음
    }

    return NextResponse.json<ApiResponse<AuthResponse>>({
      success: true,
      data: response
    }, { status: 201 })

  } catch (error) {
    console.error('Registration error:', error)

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