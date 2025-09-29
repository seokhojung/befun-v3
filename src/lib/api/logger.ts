// API 로깅 시스템
import type { NextRequest } from 'next/server'
import type { ApiLogEntry, LogLevel } from '@/types/api'
import { CONFIG } from '@/config/api'

// 로그 레벨 우선순위
const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
}

// 현재 로그 레벨
const CURRENT_LOG_LEVEL = LOG_LEVELS[CONFIG.API.LOGGING.LEVEL]

// 로거 클래스
export class ApiLogger {
  private static instance: ApiLogger
  private context: string = 'API'

  private constructor() {}

  static getInstance(): ApiLogger {
    if (!ApiLogger.instance) {
      ApiLogger.instance = new ApiLogger()
    }
    return ApiLogger.instance
  }

  // 컨텍스트 설정
  setContext(context: string): ApiLogger {
    this.context = context
    return this
  }

  // 로그 출력 여부 확인
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] <= CURRENT_LOG_LEVEL
  }

  // 기본 로그 생성
  private createLogEntry(
    level: LogLevel,
    message: string,
    requestId: string,
    metadata?: Record<string, any>
  ): ApiLogEntry {
    return {
      level,
      message,
      requestId,
      timestamp: new Date().toISOString(),
      metadata: {
        context: this.context,
        ...metadata,
      },
    }
  }

  // 요청 정보에서 로그 엔트리 생성 (민감 정보 보호 강화)
  private createRequestLogEntry(
    level: LogLevel,
    message: string,
    request: NextRequest,
    requestId: string,
    additionalMetadata?: Record<string, any>
  ): ApiLogEntry {
    const metadata: Record<string, any> = {
      method: request.method,
      url: this.sanitizeUrl(request.url),
      userAgent: this.sanitizeUserAgent(request.headers.get('user-agent')),
      ip: this.getClientIp(request),
      ...this.sanitizeMetadata(additionalMetadata),
    }

    // 사용자 ID 추출 (Authorization 헤더에서) - 토큰 자체는 로그에 기록하지 않음
    const authHeader = request.headers.get('authorization')
    let userId: string | undefined

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        // JWT 페이로드에서 사용자 ID만 추출 (토큰은 로그하지 않음)
        const token = authHeader.substring(7)
        const payload = JSON.parse(atob(token.split('.')[1]))
        userId = payload.sub || payload.user_id
      } catch {
        // JWT 파싱 실패 시 무시
        userId = undefined
      }
    }

    return {
      level,
      message,
      requestId,
      method: request.method,
      url: this.sanitizeUrl(request.url),
      userAgent: this.sanitizeUserAgent(request.headers.get('user-agent')),
      ip: this.getClientIp(request),
      timestamp: new Date().toISOString(),
      userId: userId,
      metadata,
    }
  }

  // URL에서 민감한 정보 제거
  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url)

      // 쿼리 파라미터에서 민감한 정보 제거
      const sensitiveParams = ['token', 'password', 'key', 'secret', 'auth', 'session']

      sensitiveParams.forEach(param => {
        if (urlObj.searchParams.has(param)) {
          urlObj.searchParams.set(param, '[REDACTED]')
        }
      })

      return urlObj.toString()
    } catch {
      return '[INVALID_URL]'
    }
  }

  // User-Agent에서 민감한 정보 제거 (너무 길거나 의심스러운 경우)
  private sanitizeUserAgent(userAgent: string | null): string | undefined {
    if (!userAgent) return undefined

    // 너무 긴 User-Agent는 잠재적으로 의심스러우므로 잘라냄
    if (userAgent.length > 500) {
      return userAgent.substring(0, 500) + '[TRUNCATED]'
    }

    return userAgent
  }

  // 메타데이터에서 민감한 정보 제거
  private sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> {
    if (!metadata) return {}

    const sanitized: Record<string, any> = {}
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization', 'cookie', 'session']

    for (const [key, value] of Object.entries(metadata)) {
      const lowerKey = key.toLowerCase()

      // 민감한 키인지 확인
      if (sensitiveKeys.some(sensitiveKey => lowerKey.includes(sensitiveKey))) {
        sanitized[key] = '[REDACTED]'
      } else if (typeof value === 'string' && value.length > 1000) {
        // 너무 긴 문자열 값은 잘라냄
        sanitized[key] = value.substring(0, 1000) + '[TRUNCATED]'
      } else {
        sanitized[key] = value
      }
    }

    return sanitized
  }

  // 클라이언트 IP 추출
  private getClientIp(request: NextRequest): string | undefined {
    return (
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      undefined
    )
  }

  // 로그 출력 (민감 정보 보호 강화)
  private output(logEntry: ApiLogEntry): void {
    const { level, message, timestamp, requestId, metadata } = logEntry

    // 모든 환경에서 민감 정보 제거
    const sanitizedMetadata = this.sanitizeMetadata(metadata)

    // 구조화된 로그 객체
    const structuredLog = {
      level: level.toUpperCase(),
      message,
      timestamp,
      requestId,
      context: this.context,
      ...sanitizedMetadata,
    }

    // 개발 환경에서도 민감 정보 보호 적용
    if (CONFIG.API.LOGGING.LEVEL === 'debug') {
      // 개발 환경에서는 읽기 쉽게 출력하되, 민감 정보는 제거
      const safeMessage = this.sanitizeMessage(message)
      console[level === 'error' ? 'error' : 'log'](
        `[${timestamp}] ${level.toUpperCase()} [${requestId}] ${safeMessage}`,
        sanitizedMetadata
      )
    } else {
      // 프로덕션에서는 JSON 형태로 출력
      console[level === 'error' ? 'error' : 'log'](JSON.stringify(structuredLog))
    }
  }

  // 메시지에서 민감한 정보 제거
  private sanitizeMessage(message: string): string {
    // JWT 토큰 패턴 제거
    const jwtPattern = /Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g
    let sanitized = message.replace(jwtPattern, 'Bearer [REDACTED]')

    // API 키 패턴 제거
    const apiKeyPattern = /[Aa]pi[_\-]?[Kk]ey[:\s]*[A-Za-z0-9\-_]{16,}/g
    sanitized = sanitized.replace(apiKeyPattern, 'api_key: [REDACTED]')

    // 비밀번호 패턴 제거
    const passwordPattern = /[Pp]assword[:\s]*[\S]+/g
    sanitized = sanitized.replace(passwordPattern, 'password: [REDACTED]')

    // 이메일 주소 부분 마스킹 (GDPR 준수)
    const emailPattern = /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
    sanitized = sanitized.replace(emailPattern, (match, local, domain) => {
      const maskedLocal = local.length > 2 ? local.substring(0, 2) + '***' : '***'
      return `${maskedLocal}@${domain}`
    })

    return sanitized
  }

  // 에러 로그
  error(message: string, requestId: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog('error')) return

    const logEntry = this.createLogEntry('error', message, requestId, metadata)
    this.output(logEntry)
  }

  // 경고 로그
  warn(message: string, requestId: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog('warn')) return

    const logEntry = this.createLogEntry('warn', message, requestId, metadata)
    this.output(logEntry)
  }

  // 정보 로그
  info(message: string, requestId: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog('info')) return

    const logEntry = this.createLogEntry('info', message, requestId, metadata)
    this.output(logEntry)
  }

  // 디버그 로그
  debug(message: string, requestId: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog('debug')) return

    const logEntry = this.createLogEntry('debug', message, requestId, metadata)
    this.output(logEntry)
  }

  // 요청 시작 로그
  logRequestStart(request: NextRequest, requestId: string): void {
    if (!this.shouldLog('info')) return

    const logEntry = this.createRequestLogEntry(
      'info',
      `API Request Started: ${request.method} ${new URL(request.url).pathname}`,
      request,
      requestId,
      {
        requestStart: true,
        contentType: request.headers.get('content-type'),
        contentLength: request.headers.get('content-length'),
      }
    )

    this.output(logEntry)
  }

  // 요청 완료 로그
  logRequestComplete(
    request: NextRequest,
    requestId: string,
    statusCode: number,
    responseTime: number,
    metadata?: Record<string, any>
  ): void {
    if (!this.shouldLog('info')) return

    const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info'

    const logEntry = this.createRequestLogEntry(
      level,
      `API Request Completed: ${request.method} ${new URL(request.url).pathname} - ${statusCode} (${responseTime}ms)`,
      request,
      requestId,
      {
        requestComplete: true,
        statusCode,
        responseTime,
        ...metadata,
      }
    )

    this.output(logEntry)
  }

  // 데이터베이스 쿼리 로그
  logDatabaseQuery(
    query: string,
    requestId: string,
    duration?: number,
    params?: any[]
  ): void {
    if (!this.shouldLog('debug')) return

    const logEntry = this.createLogEntry(
      'debug',
      `Database Query: ${query.substring(0, 100)}${query.length > 100 ? '...' : ''}`,
      requestId,
      {
        databaseQuery: true,
        query,
        duration,
        params: CONFIG.API.LOGGING.INCLUDE_STACK_TRACE ? params : undefined,
      }
    )

    this.output(logEntry)
  }

  // 외부 API 호출 로그
  logExternalApiCall(
    service: string,
    endpoint: string,
    method: string,
    requestId: string,
    duration?: number,
    statusCode?: number
  ): void {
    if (!this.shouldLog('info')) return

    const level: LogLevel = statusCode && statusCode >= 400 ? 'warn' : 'info'

    const logEntry = this.createLogEntry(
      level,
      `External API Call: ${service} ${method} ${endpoint}`,
      requestId,
      {
        externalApiCall: true,
        service,
        endpoint,
        method,
        duration,
        statusCode,
      }
    )

    this.output(logEntry)
  }

  // 인증 이벤트 로그
  logAuthEvent(
    event: string,
    userId: string | undefined,
    requestId: string,
    metadata?: Record<string, any>
  ): void {
    if (!this.shouldLog('info')) return

    const logEntry = this.createLogEntry(
      'info',
      `Auth Event: ${event}`,
      requestId,
      {
        authEvent: true,
        event,
        userId,
        ...metadata,
      }
    )

    this.output(logEntry)
  }

  // 비즈니스 로직 이벤트 로그
  logBusinessEvent(
    event: string,
    requestId: string,
    metadata?: Record<string, any>
  ): void {
    if (!this.shouldLog('info')) return

    const logEntry = this.createLogEntry(
      'info',
      `Business Event: ${event}`,
      requestId,
      {
        businessEvent: true,
        event,
        ...metadata,
      }
    )

    this.output(logEntry)
  }

  // 성능 메트릭 로그
  logPerformanceMetric(
    metric: string,
    value: number,
    unit: string,
    requestId: string,
    metadata?: Record<string, any>
  ): void {
    if (!this.shouldLog('debug')) return

    const logEntry = this.createLogEntry(
      'debug',
      `Performance Metric: ${metric} = ${value}${unit}`,
      requestId,
      {
        performanceMetric: true,
        metric,
        value,
        unit,
        ...metadata,
      }
    )

    this.output(logEntry)
  }
}

// 싱글톤 인스턴스 생성
export const logger = ApiLogger.getInstance()

// 편의 함수들
export const logRequestStart = (request: NextRequest, requestId: string) =>
  logger.logRequestStart(request, requestId)

export const logRequestComplete = (
  request: NextRequest,
  requestId: string,
  statusCode: number,
  responseTime: number,
  metadata?: Record<string, any>
) => logger.logRequestComplete(request, requestId, statusCode, responseTime, metadata)

export const logError = (message: string, requestId: string, error?: Error) =>
  logger.error(message, requestId, {
    error: error?.message,
    stack: CONFIG.ERROR.INCLUDE_STACK_TRACE ? error?.stack : undefined
  })

export const logAuthEvent = (event: string, userId: string | undefined, requestId: string) =>
  logger.logAuthEvent(event, userId, requestId)

export const logBusinessEvent = (event: string, requestId: string, metadata?: Record<string, any>) =>
  logger.logBusinessEvent(event, requestId, metadata)

// 특정 컨텍스트용 로거 팩토리
export function createLogger(context: string): ApiLogger {
  return ApiLogger.getInstance().setContext(context)
}

// 요청 처리 시간 측정 헬퍼
export class RequestTimer {
  private startTime: number
  private requestId: string
  private request: NextRequest

  constructor(request: NextRequest, requestId: string) {
    this.startTime = Date.now()
    this.requestId = requestId
    this.request = request

    logRequestStart(request, requestId)
  }

  // 완료 시간 측정 및 로그
  complete(statusCode: number, metadata?: Record<string, any>): number {
    const responseTime = Date.now() - this.startTime
    logRequestComplete(this.request, this.requestId, statusCode, responseTime, metadata)
    return responseTime
  }
}