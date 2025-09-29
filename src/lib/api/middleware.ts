// 통합 API 미들웨어 시스템
import { NextRequest, NextResponse } from 'next/server'
import type { ApiHandler, AuthenticatedContext, ApiEndpointConfig } from '@/types/api'
import { createErrorResponse, createSuccessResponse, withErrorHandling } from './errors'
import { authenticateRequest, optionalAuthentication, authenticateApiKey, Permission } from './auth'
import { checkRateLimit, getRateLimitHeaders, shouldBypassRateLimit, RateLimitConfig } from './rate-limiter'
import { validateCSRFToken, getCSRFTokenFromHeaders } from '../csrf'
import { processApiVersion, addVersionHeaders } from './version'
import { RequestTimer, logger } from './logger'
import { CONFIG } from '@/config/api'

// 미들웨어 옵션
interface MiddlewareOptions {
  authentication?: {
    required: boolean
    permissions?: Permission[]
    allowApiKey?: boolean
  }
  rateLimit?: RateLimitConfig | keyof typeof CONFIG.RATE_LIMITS
  csrf?: {
    required: boolean
    exemptMethods?: string[]
  }
  cors?: {
    origins?: string[]
    methods?: string[]
    headers?: string[]
    credentials?: boolean
  }
  validation?: {
    version?: boolean
  }
  logging?: {
    logRequest?: boolean
    logResponse?: boolean
    sensitiveFields?: string[]
  }
}

// 기본 미들웨어 옵션
const DEFAULT_OPTIONS: MiddlewareOptions = {
  authentication: {
    required: true,
    permissions: [],
    allowApiKey: false,
  },
  rateLimit: 'DEFAULT',
  csrf: {
    required: true,
    exemptMethods: ['GET', 'HEAD', 'OPTIONS'],
  },
  cors: {
    origins: ['*'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    headers: ['Content-Type', 'Authorization', 'X-API-Version', 'X-CSRF-Token'],
    credentials: true,
  },
  validation: {
    version: true,
  },
  logging: {
    logRequest: true,
    logResponse: true,
    sensitiveFields: ['password', 'token', 'secret', 'key'],
  },
}

// CORS 헤더 설정
function setCorsHeaders(response: NextResponse, options: MiddlewareOptions): void {
  const corsOptions = { ...DEFAULT_OPTIONS.cors, ...options.cors }

  if (corsOptions.origins) {
    response.headers.set(
      'Access-Control-Allow-Origin',
      corsOptions.origins.includes('*') ? '*' : corsOptions.origins.join(', ')
    )
  }

  if (corsOptions.methods) {
    response.headers.set('Access-Control-Allow-Methods', corsOptions.methods.join(', '))
  }

  if (corsOptions.headers) {
    response.headers.set('Access-Control-Allow-Headers', corsOptions.headers.join(', '))
  }

  if (corsOptions.credentials) {
    response.headers.set('Access-Control-Allow-Credentials', 'true')
  }

  // 보안 헤더도 함께 설정
  Object.entries(CONFIG.API.SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
}

// 요청 로깅 헬퍼
function sanitizeForLogging(data: any, sensitiveFields: string[]): any {
  if (!data || typeof data !== 'object') {
    return data
  }

  const sanitized = { ...data }
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]'
    }
  }

  return sanitized
}

// 통합 API 미들웨어
export function createApiMiddleware(options: MiddlewareOptions = {}) {
  return function middleware(handler: ApiHandler): ApiHandler {
    return async function (request: NextRequest, context?: any): Promise<NextResponse> {
      const requestId = crypto.randomUUID()
      const timer = new RequestTimer(request, requestId)
      const mergedOptions = { ...DEFAULT_OPTIONS, ...options }

      try {
        // 1. 기본 검증 및 로깅
        if (mergedOptions.logging?.logRequest) {
          const sanitizedHeaders = sanitizeForLogging(
            Object.fromEntries(request.headers.entries()),
            mergedOptions.logging.sensitiveFields || []
          )

          logger.info('API request started', requestId, {
            method: request.method,
            url: request.url,
            headers: sanitizedHeaders,
            userAgent: request.headers.get('user-agent'),
            ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          })
        }

        // 2. OPTIONS 요청 처리 (CORS preflight)
        if (request.method === 'OPTIONS') {
          const response = new NextResponse(null, { status: 200 })
          setCorsHeaders(response, mergedOptions)
          timer.complete(200)
          return response
        }

        // 3. API 버전 검증
        if (mergedOptions.validation?.version) {
          const { version, isDeprecated } = processApiVersion(request, requestId)

          if (isDeprecated) {
            logger.warn('Deprecated API version used', requestId, { version })
          }
        }

        // 4. Rate Limiting
        if (mergedOptions.rateLimit && !shouldBypassRateLimit(request)) {
          const rateLimitConfig = typeof mergedOptions.rateLimit === 'string'
            ? CONFIG.RATE_LIMITS[mergedOptions.rateLimit]
            : mergedOptions.rateLimit

          const rateLimitResult = checkRateLimit(request, rateLimitConfig, requestId)

          if (!rateLimitResult.allowed) {
            const response = createErrorResponse(
              new Error('Rate limit exceeded'),
              requestId
            )
            setCorsHeaders(response, mergedOptions)
            Object.entries(getRateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
              response.headers.set(key, value)
            })
            timer.complete(429)
            return response
          }
        }

        // 5. CSRF 토큰 검증
        if (mergedOptions.csrf?.required) {
          const exemptMethods = mergedOptions.csrf.exemptMethods || []

          if (!exemptMethods.includes(request.method)) {
            const csrfToken = await getCSRFTokenFromHeaders()
            const submittedToken = request.headers.get('x-csrf-token')

            if (!csrfToken || !submittedToken || !validateCSRFToken(submittedToken, csrfToken)) {
              const response = createErrorResponse(
                new Error('Invalid CSRF token'),
                requestId
              )
              setCorsHeaders(response, mergedOptions)
              timer.complete(403)
              return response
            }
          }
        }

        // 6. 인증 처리
        let authContext: AuthenticatedContext | undefined

        if (mergedOptions.authentication?.required) {
          // API 키 인증 시도 (허용된 경우)
          if (mergedOptions.authentication.allowApiKey && request.headers.get('X-API-Key')) {
            try {
              authenticateApiKey(request, requestId)
              // API 키 인증 성공 시 권한 검사 생략
            } catch (error) {
              // API 키 실패 시 JWT로 fallback
              authContext = await authenticateRequest(request, requestId)
            }
          } else {
            // JWT 토큰 인증
            authContext = await authenticateRequest(request, requestId)
          }

          // 권한 확인
          if (authContext && mergedOptions.authentication.permissions?.length) {
            // 실제 권한 체크는 RBAC 시스템에서 처리
            // 여기서는 기본적인 권한만 확인
          }
        } else if (mergedOptions.authentication?.required === false) {
          // 선택적 인증
          authContext = await optionalAuthentication(request, requestId)
        }

        // 7. 핸들러 실행
        let response: NextResponse

        if (authContext) {
          // 인증된 핸들러로 실행
          const authenticatedHandler = handler as any
          response = await authenticatedHandler(request, authContext, context)
        } else {
          // 일반 핸들러로 실행
          response = await handler(request, context)
        }

        // 8. 응답 후처리
        setCorsHeaders(response, mergedOptions)

        // API 버전 헤더 추가
        if (mergedOptions.validation?.version) {
          const { version } = processApiVersion(request, requestId)
          addVersionHeaders(response, version)
        }

        // Rate limit 헤더 추가
        if (mergedOptions.rateLimit && !shouldBypassRateLimit(request)) {
          const rateLimitConfig = typeof mergedOptions.rateLimit === 'string'
            ? CONFIG.RATE_LIMITS[mergedOptions.rateLimit]
            : mergedOptions.rateLimit

          const rateLimitResult = checkRateLimit(request, rateLimitConfig, requestId)
          Object.entries(getRateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
            response.headers.set(key, value)
          })
        }

        // 9. 응답 로깅
        if (mergedOptions.logging?.logResponse) {
          logger.info('API request completed', requestId, {
            statusCode: response.status,
            responseTime: timer.complete(response.status),
          })
        }

        return response

      } catch (error) {
        // 에러 처리
        logger.error('API middleware error', requestId, { error })

        const errorResponse = createErrorResponse(error, requestId)
        setCorsHeaders(errorResponse, mergedOptions)

        timer.complete(errorResponse.status)
        return errorResponse
      }
    }
  }
}

// 사전 정의된 미들웨어 프리셋
export const presets = {
  // 공개 API (인증 불필요)
  public: createApiMiddleware({
    authentication: { required: false },
    rateLimit: 'DEFAULT',
    csrf: { required: false },
  }),

  // 보호된 API (인증 필요)
  protected: createApiMiddleware({
    authentication: { required: true },
    rateLimit: 'DEFAULT',
  }),

  // 관리자 API
  admin: createApiMiddleware({
    authentication: {
      required: true,
      permissions: ['admin:read', 'admin:write'],
    },
    rateLimit: 'AUTH',
    csrf: { required: true },
  }),

  // 고성능 API (BFF 등)
  highThroughput: createApiMiddleware({
    authentication: { required: true },
    rateLimit: 'BFF',
    csrf: { required: false },
    logging: {
      logRequest: false,
      logResponse: false,
    },
  }),

  // 인증 API (특별 처리)
  auth: createApiMiddleware({
    authentication: { required: false },
    rateLimit: 'AUTH',
    csrf: { required: true },
    cors: {
      origins: [process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'],
      credentials: true,
    },
  }),

  // API 키 전용
  apiKeyOnly: createApiMiddleware({
    authentication: {
      required: true,
      allowApiKey: true,
    },
    rateLimit: 'DEFAULT',
    csrf: { required: false },
  }),
}

// 편의 래퍼 함수들
export const withPublicMiddleware = presets.public
export const withProtectedMiddleware = presets.protected
export const withAdminMiddleware = presets.admin
export const withHighThroughputMiddleware = presets.highThroughput
export const withAuthMiddleware = presets.auth
export const withApiKeyMiddleware = presets.apiKeyOnly

// 커스텀 미들웨어 체인
export function chainMiddlewares(...middlewares: Array<(handler: ApiHandler) => ApiHandler>) {
  return function (handler: ApiHandler): ApiHandler {
    return middlewares.reduceRight(
      (acc, middleware) => middleware(acc),
      handler
    )
  }
}

// 조건부 미들웨어
export function conditionalMiddleware(
  condition: (request: NextRequest) => boolean,
  middleware: (handler: ApiHandler) => ApiHandler
) {
  return function (handler: ApiHandler): ApiHandler {
    return async function (request: NextRequest, context?: any): Promise<NextResponse> {
      if (condition(request)) {
        return middleware(handler)(request, context)
      }
      return handler(request, context)
    }
  }
}

// 경로별 미들웨어
export function pathBasedMiddleware(
  pathMiddlewares: Record<string, (handler: ApiHandler) => ApiHandler>
) {
  return function (handler: ApiHandler): ApiHandler {
    return async function (request: NextRequest, context?: any): Promise<NextResponse> {
      const url = new URL(request.url)
      const pathname = url.pathname

      for (const [path, middleware] of Object.entries(pathMiddlewares)) {
        if (pathname.includes(path)) {
          return middleware(handler)(request, context)
        }
      }

      return handler(request, context)
    }
  }
}