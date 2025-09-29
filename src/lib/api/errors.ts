// API 에러 처리 유틸리티
import { NextResponse } from 'next/server'
import type { ApiResponse, ApiError, ApiErrorCode } from '@/types/api'
import { API_ERROR_CODES } from '@/types/api'

// 커스텀 API 에러 클래스
export class ApiException extends Error {
  public readonly code: ApiErrorCode
  public readonly statusCode: number
  public readonly details?: any
  public readonly requestId?: string

  constructor(
    code: ApiErrorCode,
    message: string,
    statusCode: number = 500,
    details?: any,
    requestId?: string
  ) {
    super(message)
    this.name = 'ApiException'
    this.code = code
    this.statusCode = statusCode
    this.details = details
    this.requestId = requestId
  }
}

// 특정 에러 타입들을 위한 편의 클래스들
export class ValidationError extends ApiException {
  constructor(message: string, details?: any, requestId?: string) {
    super(API_ERROR_CODES.VALIDATION_FAILED, message, 400, details, requestId)
  }
}

export class AuthenticationError extends ApiException {
  constructor(message: string = '인증이 필요합니다.', requestId?: string) {
    super(API_ERROR_CODES.UNAUTHORIZED, message, 401, undefined, requestId)
  }
}

export class AuthorizationError extends ApiException {
  constructor(message: string = '권한이 없습니다.', requestId?: string) {
    super(API_ERROR_CODES.FORBIDDEN, message, 403, undefined, requestId)
  }
}

export class NotFoundError extends ApiException {
  constructor(resource: string = '리소스', requestId?: string) {
    super(
      API_ERROR_CODES.NOT_FOUND,
      `요청하신 ${resource}를 찾을 수 없습니다.`,
      404,
      undefined,
      requestId
    )
  }
}

export class RateLimitError extends ApiException {
  constructor(requestId?: string, retryAfter?: number) {
    super(
      API_ERROR_CODES.RATE_LIMIT_EXCEEDED,
      '요청 제한을 초과했습니다. 잠시 후 다시 시도해 주세요.',
      429,
      { retryAfter },
      requestId
    )
  }
}

export class DatabaseError extends ApiException {
  constructor(message: string = '데이터베이스 오류가 발생했습니다.', details?: any, requestId?: string) {
    super(API_ERROR_CODES.DATABASE_ERROR, message, 500, details, requestId)
  }
}

// 에러 코드별 HTTP 상태 코드 매핑
const ERROR_STATUS_MAP: Record<ApiErrorCode, number> = {
  [API_ERROR_CODES.BAD_REQUEST]: 400,
  [API_ERROR_CODES.UNAUTHORIZED]: 401,
  [API_ERROR_CODES.FORBIDDEN]: 403,
  [API_ERROR_CODES.NOT_FOUND]: 404,
  [API_ERROR_CODES.METHOD_NOT_ALLOWED]: 405,
  [API_ERROR_CODES.VALIDATION_FAILED]: 422,
  [API_ERROR_CODES.RATE_LIMIT_EXCEEDED]: 429,
  [API_ERROR_CODES.CSRF_TOKEN_INVALID]: 403,
  [API_ERROR_CODES.INTERNAL_SERVER_ERROR]: 500,
  [API_ERROR_CODES.BAD_GATEWAY]: 502,
  [API_ERROR_CODES.SERVICE_UNAVAILABLE]: 503,
  [API_ERROR_CODES.DATABASE_ERROR]: 500,
  [API_ERROR_CODES.EXTERNAL_API_ERROR]: 502,
  [API_ERROR_CODES.DESIGN_NOT_FOUND]: 404,
  [API_ERROR_CODES.PRICING_CALCULATION_ERROR]: 422,
  [API_ERROR_CODES.CHECKOUT_SESSION_EXPIRED]: 410,
  [API_ERROR_CODES.INVALID_DESIGN_OPTIONS]: 422,
}

// ApiError 객체 생성 헬퍼
export function createApiError(
  code: ApiErrorCode,
  message: string,
  details?: any,
  requestId?: string
): ApiError {
  const error: ApiError = {
    code,
    message,
    details,
  }

  // 개발 환경에서만 스택 트레이스 포함
  if (process.env.NODE_ENV === 'development' && details?.stack) {
    error.stack = details.stack
  }

  return error
}

// 에러로부터 HTTP 상태 코드 추출
export function getStatusCodeFromError(error: unknown): number {
  if (error instanceof ApiException) {
    return error.statusCode
  }

  if (isApiError(error) && error.code) {
    return ERROR_STATUS_MAP[error.code] || 500
  }

  return 500
}

// 에러가 ApiError 타입인지 확인
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  )
}

// 에러 응답 생성
export function createErrorResponse(
  error: unknown,
  requestId?: string,
  includeDetails: boolean = process.env.NODE_ENV === 'development'
): NextResponse<ApiResponse> {
  let apiError: ApiError
  let statusCode: number

  if (error instanceof ApiException) {
    statusCode = error.statusCode
    apiError = createApiError(error.code, error.message, error.details, requestId)
  } else if (isApiError(error)) {
    statusCode = getStatusCodeFromError(error)
    apiError = createApiError(error.code, error.message, error.details, requestId)
  } else if (error instanceof Error) {
    statusCode = 500
    apiError = createApiError(
      API_ERROR_CODES.INTERNAL_SERVER_ERROR,
      '내부 서버 오류가 발생했습니다.',
      includeDetails ? { originalMessage: error.message, stack: error.stack } : undefined,
      requestId
    )
  } else {
    statusCode = 500
    apiError = createApiError(
      API_ERROR_CODES.INTERNAL_SERVER_ERROR,
      '내부 서버 오류가 발생했습니다.',
      includeDetails ? { originalError: error } : undefined,
      requestId
    )
  }

  const response: ApiResponse = {
    success: false,
    error: apiError,
    timestamp: new Date().toISOString(),
    requestId,
  }

  return NextResponse.json(response, {
    status: statusCode,
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'Content-Type': 'application/json',
    },
  })
}

// 성공 응답 생성
export function createSuccessResponse<T>(
  data?: T,
  requestId?: string,
  statusCode: number = 200
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    requestId,
  }

  return NextResponse.json(response, {
    status: statusCode,
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'Content-Type': 'application/json',
    },
  })
}

// 글로벌 에러 핸들러
export function handleApiError(error: unknown, requestId?: string): NextResponse {
  // 에러 로깅 (향후 logger 구현 후 대체)
  if (process.env.NODE_ENV === 'development') {
    console.error(`API Error [${requestId}]:`, error)
  }

  return createErrorResponse(error, requestId)
}

// 비동기 API 핸들러 래퍼 (에러 처리 자동화)
export function withErrorHandling(
  handler: (request: Request, context?: any) => Promise<NextResponse>
) {
  return async (request: Request, context?: any): Promise<NextResponse> => {
    const requestId = crypto.randomUUID()

    try {
      return await handler(request, context)
    } catch (error) {
      return handleApiError(error, requestId)
    }
  }
}

// Zod 검증 에러를 API 에러로 변환
export function transformZodError(error: any, requestId?: string): ValidationError {
  const details = error.issues?.map((issue: any) => ({
    field: issue.path.join('.'),
    message: issue.message,
    value: issue.received,
  })) || []

  return new ValidationError(
    '입력값이 올바르지 않습니다.',
    details,
    requestId
  )
}

// Database 에러를 API 에러로 변환
export function transformDatabaseError(error: any, requestId?: string): DatabaseError {
  // Supabase/PostgreSQL 특정 에러 처리
  if (error.code === '23505') { // unique_violation
    return new DatabaseError('이미 존재하는 데이터입니다.', { code: error.code }, requestId)
  }

  if (error.code === '23503') { // foreign_key_violation
    return new DatabaseError('참조된 데이터가 존재하지 않습니다.', { code: error.code }, requestId)
  }

  if (error.code === '42P01') { // undefined_table
    return new DatabaseError('요청된 리소스를 찾을 수 없습니다.', { code: error.code }, requestId)
  }

  // 일반적인 데이터베이스 에러
  return new DatabaseError(
    '내부 서버 오류가 발생했습니다.',
    process.env.NODE_ENV === 'development' ? { originalError: error } : undefined,
    requestId
  )
}

// 외부 API 에러를 내부 API 에러로 변환
export function transformExternalApiError(error: any, service: string, requestId?: string): ApiException {
  return new ApiException(
    API_ERROR_CODES.EXTERNAL_API_ERROR,
    `${service} 서비스에서 오류가 발생했습니다.`,
    502,
    process.env.NODE_ENV === 'development' ? { service, originalError: error } : { service },
    requestId
  )
}