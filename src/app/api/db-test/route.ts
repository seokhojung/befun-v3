import { NextResponse } from 'next/server'
import { checkSupabaseConnection } from '@/lib/supabase'

export async function GET() {
  try {
    // 환경 변수 체크
    const envVars = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '***' : undefined,
    }

    // 환경 변수 누락 체크
    const missingVars = Object.entries(envVars)
      .filter(([key, value]) => !value)
      .map(([key]) => key)

    if (missingVars.length > 0) {
      return NextResponse.json(
        {
          status: 'error',
          message: `환경 변수 누락: ${missingVars.join(', ')}`,
          envCheck: envVars,
          connectionTest: false,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }

    // Supabase 연결 테스트 (실제 연결이 설정되었을 때만 작동)
    const isConnected = await checkSupabaseConnection()

    return NextResponse.json(
      {
        status: isConnected ? 'success' : 'warning',
        message: isConnected
          ? 'Supabase 연결 성공'
          : 'Supabase 연결 실패 - 더미 환경 변수 사용 중',
        envCheck: {
          ...envVars,
          allSet: missingVars.length === 0
        },
        connectionTest: isConnected,
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: '데이터베이스 연결 테스트 중 오류 발생',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}