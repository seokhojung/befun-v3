// API 상태 및 버전 정보 엔드포인트
import { NextRequest, NextResponse } from 'next/server'
import { createSuccessResponse, createErrorResponse, withErrorHandling } from '@/lib/api/errors'
import { optionalAuthentication } from '@/lib/api/auth'
import { checkDefaultRateLimit, getRateLimitHeaders, getRateLimitStats } from '@/lib/api/rate-limiter'
import { getVersionInfo, processApiVersion } from '@/lib/api/version'
import { RequestTimer, logger } from '@/lib/api/logger'
import { CONFIG } from '@/config/api'
import { supabase } from '@/lib/supabase'

// API 상태 응답 타입
interface ApiStatusResponse {
  status: 'healthy' | 'degraded' | 'down'
  timestamp: string
  version: string
  environment: string
  services: {
    database: {
      status: 'healthy' | 'degraded' | 'down'
      response_time_ms?: number
      last_checked: string
    }
    authentication: {
      status: 'healthy' | 'degraded' | 'down'
      response_time_ms?: number
      last_checked: string
    }
    storage: {
      status: 'healthy' | 'degraded' | 'down'
      response_time_ms?: number
      last_checked: string
    }
  }
  performance: {
    uptime_seconds: number
    memory_usage: {
      used_mb: number
      total_mb: number
      percentage: number
    }
    rate_limiting: {
      total_requests: number
      limited_requests: number
      error_rate: number
    }
  }
  features: string[]
  rate_limits: Record<string, {
    limit: number
    window_ms: number
  }>
}

// 서비스 상태 체크
async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'down'
  response_time_ms?: number
}> {
  try {
    const startTime = Date.now()
    const { error } = await supabase.from('user_profiles').select('id').limit(1).single()
    const responseTime = Date.now() - startTime

    return {
      status: error ? 'down' : responseTime > 1000 ? 'degraded' : 'healthy',
      response_time_ms: responseTime,
    }
  } catch {
    return { status: 'down' }
  }
}

async function checkAuthenticationHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'down'
  response_time_ms?: number
}> {
  try {
    const startTime = Date.now()
    // 간단한 Supabase 인증 서비스 체크
    const { error } = await supabase.auth.getSession()
    const responseTime = Date.now() - startTime

    return {
      status: error ? 'down' : responseTime > 500 ? 'degraded' : 'healthy',
      response_time_ms: responseTime,
    }
  } catch {
    return { status: 'down' }
  }
}

async function checkStorageHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'down'
  response_time_ms?: number
}> {
  try {
    const startTime = Date.now()
    // Supabase Storage 체크
    const { error } = await supabase.storage.listBuckets()
    const responseTime = Date.now() - startTime

    return {
      status: error ? 'down' : responseTime > 1000 ? 'degraded' : 'healthy',
      response_time_ms: responseTime,
    }
  } catch {
    return { status: 'down' }
  }
}

// 메모리 사용량 체크 (Node.js 환경)
function getMemoryUsage() {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage()
    const totalMB = usage.heapTotal / 1024 / 1024
    const usedMB = usage.heapUsed / 1024 / 1024

    return {
      used_mb: Math.round(usedMB),
      total_mb: Math.round(totalMB),
      percentage: Math.round((usedMB / totalMB) * 100),
    }
  }

  return {
    used_mb: 0,
    total_mb: 0,
    percentage: 0,
  }
}

// 업타임 계산 (간단한 구현)
const startTime = Date.now()
function getUptimeSeconds(): number {
  return Math.floor((Date.now() - startTime) / 1000)
}

// GET 핸들러 - API 상태 조회
async function handleGet(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const timer = new RequestTimer(request, requestId)

  try {
    // API 버전 확인
    const { version, supportedFeatures } = processApiVersion(request, requestId)

    // Rate Limiting (관대한 설정)
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

    // 선택적 인증 (인증되지 않은 사용자도 기본 상태 확인 가능)
    const authContext = await optionalAuthentication(request, requestId)

    logger.info('API status check request', requestId, {
      userId: authContext?.user.id,
      authenticated: !!authContext,
    })

    // 서비스 상태 체크 (병렬 실행)
    const [databaseHealth, authHealth, storageHealth] = await Promise.all([
      checkDatabaseHealth(),
      checkAuthenticationHealth(),
      checkStorageHealth(),
    ])

    // 전체 상태 결정
    const services = [databaseHealth, authHealth, storageHealth]
    const hasDown = services.some(s => s.status === 'down')
    const hasDegraded = services.some(s => s.status === 'degraded')

    const overallStatus = hasDown ? 'down' : hasDegraded ? 'degraded' : 'healthy'

    // Rate limiting 통계
    const rateLimitStats = getRateLimitStats()

    // 버전 정보
    const versionInfo = getVersionInfo()

    // 응답 데이터 구성
    const statusResponse: ApiStatusResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: version,
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: {
          ...databaseHealth,
          last_checked: new Date().toISOString(),
        },
        authentication: {
          ...authHealth,
          last_checked: new Date().toISOString(),
        },
        storage: {
          ...storageHealth,
          last_checked: new Date().toISOString(),
        },
      },
      performance: {
        uptime_seconds: getUptimeSeconds(),
        memory_usage: getMemoryUsage(),
        rate_limiting: {
          total_requests: rateLimitStats.totalRequests,
          limited_requests: rateLimitStats.limitedRequests,
          error_rate: rateLimitStats.totalRequests > 0
            ? rateLimitStats.limitedRequests / rateLimitStats.totalRequests
            : 0,
        },
      },
      features: supportedFeatures,
      rate_limits: Object.fromEntries(
        Object.entries(CONFIG.RATE_LIMITS).map(([key, config]) => [
          key.toLowerCase(),
          {
            limit: config.max,
            window_ms: config.windowMs,
          },
        ])
      ),
    }

    // 인증된 사용자에게는 추가 정보 제공
    if (authContext) {
      // 관리자에게는 더 자세한 정보 제공
      const userRole: 'user' | 'admin' | 'superadmin' = 'user' // 실제로는 DB에서 조회
      if (userRole !== 'user') {
        // 관리자 전용 추가 정보
        (statusResponse as any).admin_info = {
          active_sessions: 'N/A', // 실제로는 활성 세션 수
          error_rate_24h: 'N/A', // 24시간 에러율
          database_connections: 'N/A', // DB 연결 수
        }
      }
    }

    logger.info('API status check completed', requestId, {
      userId: authContext?.user.id,
      overallStatus,
      serviceStatuses: {
        database: databaseHealth.status,
        auth: authHealth.status,
        storage: storageHealth.status,
      },
    })

    const response = createSuccessResponse(statusResponse, requestId)

    // Rate limit 헤더 추가
    Object.entries(getRateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    // 상태별 HTTP 상태 코드
    if (overallStatus === 'down') {
      response.headers.set('Status', '503')
    } else if (overallStatus === 'degraded') {
      response.headers.set('Status', '200') // 성능 저하이지만 사용 가능
    }

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
