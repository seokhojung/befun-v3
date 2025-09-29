// API 라우트 공통 타입 정의
import type { NextRequest, NextResponse } from 'next/server'
import type { User, Session } from '@/types/auth'

// 기본 API 응답 타입
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: ApiError
  timestamp?: string
  requestId?: string
}

// API 에러 타입
export interface ApiError {
  code: string
  message: string
  details?: any
  stack?: string // 개발 환경에서만 포함
}

// API 핸들러 타입
export type ApiHandler = (
  request: NextRequest,
  context?: { params: Record<string, string> }
) => Promise<NextResponse>

// 인증된 요청 컨텍스트
export interface AuthenticatedContext {
  user: User
  session: Session
  requestId: string
}

// 인증된 API 핸들러
export type AuthenticatedApiHandler<T = any> = (
  request: NextRequest,
  context: AuthenticatedContext,
  params?: Record<string, string>
) => Promise<NextResponse<ApiResponse<T>>>

// HTTP 메서드 타입
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS'

// API 엔드포인트 설정
export interface ApiEndpointConfig {
  requireAuth: boolean
  allowedMethods: HttpMethod[]
  rateLimit?: {
    requests: number
    windowMs: number
  }
  rbac?: {
    roles?: string[]
    permissions?: string[]
  }
  validation?: {
    body?: any // Zod schema
    query?: any // Zod schema
    params?: any // Zod schema
  }
  cache?: {
    ttl: number
    key?: string
  }
}

// 페이지네이션 타입
export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// 정렬 파라미터
export interface SortParams {
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// 필터링 파라미터 (Generic)
export interface FilterParams {
  [key: string]: any
}

// 완전한 쿼리 파라미터
export interface QueryParams extends PaginationParams, SortParams, FilterParams {}

// BFF 패턴용 데이터 집계 타입
export interface AggregatedData {
  [key: string]: any
}

// API 로그 레벨
export type LogLevel = 'error' | 'warn' | 'info' | 'debug'

// API 로그 엔트리
export interface ApiLogEntry {
  level: LogLevel
  message: string
  requestId: string
  userId?: string
  method: string
  url: string
  statusCode?: number
  responseTime?: number
  userAgent?: string
  ip?: string
  timestamp: string
  metadata?: Record<string, any>
}

// Rate Limiting 설정
export interface RateLimitConfig {
  windowMs: number
  max: number
  keyGenerator?: (request: NextRequest) => string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

// 캐시 설정
export interface CacheConfig {
  ttl: number
  keyPrefix?: string
  tags?: string[]
}

// RBAC 권한 체크 결과
export interface RbacResult {
  allowed: boolean
  reason?: string
  requiredRoles?: string[]
  requiredPermissions?: string[]
}

// Validation 에러 세부사항
export interface ValidationErrorDetail {
  field: string
  message: string
  value?: any
}

// 표준 API 에러 코드
export const API_ERROR_CODES = {
  // 4xx Client Errors
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  CSRF_TOKEN_INVALID: 'CSRF_TOKEN_INVALID',

  // 5xx Server Errors
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  BAD_GATEWAY: 'BAD_GATEWAY',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',

  // Custom Business Logic Errors
  DESIGN_NOT_FOUND: 'DESIGN_NOT_FOUND',
  PRICING_CALCULATION_ERROR: 'PRICING_CALCULATION_ERROR',
  CHECKOUT_SESSION_EXPIRED: 'CHECKOUT_SESSION_EXPIRED',
  INVALID_DESIGN_OPTIONS: 'INVALID_DESIGN_OPTIONS',
} as const

export type ApiErrorCode = typeof API_ERROR_CODES[keyof typeof API_ERROR_CODES]

// API 성능 메트릭
export interface ApiMetrics {
  requestCount: number
  averageResponseTime: number
  errorRate: number
  cacheHitRate: number
  timestamp: string
}

// WebSocket 메시지 타입 (향후 실시간 기능용)
export interface WebSocketMessage<T = any> {
  type: string
  data: T
  timestamp: string
  userId?: string
}