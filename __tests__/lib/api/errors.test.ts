// 에러 처리 라이브러리 테스트
import {
  ApiException,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  createApiError,
  handleError,
} from '@/lib/api/errors'

describe('API Error Classes', () => {
  describe('ApiException', () => {
    it('기본 ApiException을 올바르게 생성해야 함', () => {
      const error = new ApiException('INTERNAL_ERROR', 'Something went wrong', 500)

      expect(error.message).toBe('Something went wrong')
      expect(error.statusCode).toBe(500)
      expect(error.code).toBe('INTERNAL_ERROR')
      expect(error.name).toBe('ApiException')
      expect(error instanceof Error).toBe(true)
    })

    it('세부 정보와 함께 ApiException을 생성해야 함', () => {
      const details = { field: 'email', reason: 'invalid format' }
      const error = new ApiException('VALIDATION_FAILED', 'Validation failed', 400, details)

      expect(error.details).toEqual(details)
    })

    it('스택 트레이스를 포함해야 함', () => {
      const error = new ApiException('INTERNAL_ERROR', 'Test error')
      expect(error.stack).toBeDefined()
      expect(error.stack).toContain('ApiException')
    })
  })

  describe('ValidationError', () => {
    it('ValidationError를 올바르게 생성해야 함', () => {
      const error = new ValidationError('Invalid input data', { field: 'email' })

      expect(error.message).toBe('Invalid input data')
      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('VALIDATION_FAILED')
      expect(error.details).toEqual({ field: 'email' })
      expect(error instanceof ApiException).toBe(true)
    })

    it('세부 정보 없이 ValidationError를 생성할 수 있어야 함', () => {
      const error = new ValidationError('Validation failed')

      expect(error.message).toBe('Validation failed')
      expect(error.details).toBeUndefined()
    })
  })

  describe('AuthenticationError', () => {
    it('AuthenticationError를 올바르게 생성해야 함', () => {
      const error = new AuthenticationError('Invalid credentials')

      expect(error.message).toBe('Invalid credentials')
      expect(error.statusCode).toBe(401)
      expect(error.code).toBe('AUTHENTICATION_FAILED')
      expect(error instanceof ApiError).toBe(true)
    })

    it('기본 메시지로 AuthenticationError를 생성할 수 있어야 함', () => {
      const error = new AuthenticationError()

      expect(error.message).toBe('Authentication required')
    })
  })

  describe('AuthorizationError', () => {
    it('AuthorizationError를 올바르게 생성해야 함', () => {
      const error = new AuthorizationError('Insufficient permissions')

      expect(error.message).toBe('Insufficient permissions')
      expect(error.statusCode).toBe(403)
      expect(error.code).toBe('AUTHORIZATION_FAILED')
      expect(error instanceof ApiError).toBe(true)
    })

    it('기본 메시지로 AuthorizationError를 생성할 수 있어야 함', () => {
      const error = new AuthorizationError()

      expect(error.message).toBe('Insufficient permissions')
    })
  })

  describe('NotFoundError', () => {
    it('NotFoundError를 올바르게 생성해야 함', () => {
      const error = new NotFoundError('Resource not found')

      expect(error.message).toBe('Resource not found')
      expect(error.statusCode).toBe(404)
      expect(error.code).toBe('NOT_FOUND')
      expect(error instanceof ApiError).toBe(true)
    })

    it('리소스 타입과 함께 NotFoundError를 생성할 수 있어야 함', () => {
      const error = new NotFoundError('Design not found', 'design')

      expect(error.message).toBe('Design not found')
      expect(error.details).toEqual({ resource: 'design' })
    })
  })

  describe('RateLimitError', () => {
    it('RateLimitError를 올바르게 생성해야 함', () => {
      const error = new RateLimitError(60)

      expect(error.message).toBe('Rate limit exceeded. Try again in 60 seconds.')
      expect(error.statusCode).toBe(429)
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED')
      expect(error.retryAfter).toBe(60)
      expect(error instanceof ApiError).toBe(true)
    })

    it('기본 재시도 시간으로 RateLimitError를 생성할 수 있어야 함', () => {
      const error = new RateLimitError()

      expect(error.retryAfter).toBe(60)
      expect(error.message).toContain('60 seconds')
    })
  })
})

describe('Error Response Creation', () => {
  describe('createErrorResponse', () => {
    it('ApiError로부터 올바른 응답을 생성해야 함', () => {
      const error = new ValidationError('Invalid email', { field: 'email' })
      const response = createErrorResponse(error, 'test-request-id')

      expect(response.success).toBe(false)
      expect(response.error).toEqual({
        code: 'VALIDATION_FAILED',
        message: 'Invalid email',
        details: { field: 'email' },
      })
      expect(response.timestamp).toBeDefined()
      expect(response.requestId).toBe('test-request-id')
    })

    it('일반 Error로부터 응답을 생성해야 함', () => {
      const error = new Error('Unexpected error')
      const response = createErrorResponse(error, 'test-request-id')

      expect(response.success).toBe(false)
      expect(response.error).toEqual({
        code: 'INTERNAL_ERROR',
        message: 'Unexpected error',
      })
      expect(response.requestId).toBe('test-request-id')
    })

    it('문자열 에러로부터 응답을 생성해야 함', () => {
      const response = createErrorResponse('Something went wrong', 'test-request-id')

      expect(response.success).toBe(false)
      expect(response.error).toEqual({
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong',
      })
    })

    it('requestId 없이 응답을 생성할 수 있어야 함', () => {
      const error = new ApiError('Test error')
      const response = createErrorResponse(error)

      expect(response.requestId).toBeUndefined()
    })

    it('timestamp가 올바른 ISO 형식이어야 함', () => {
      const error = new ApiError('Test error')
      const response = createErrorResponse(error)

      expect(response.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    })
  })
})

describe('Error Handling', () => {
  describe('handleApiError', () => {
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('ApiError를 올바른 HTTP 응답으로 변환해야 함', () => {
      const error = new ValidationError('Invalid data', { field: 'name' })
      const response = handleApiError(error, 'test-request-id')

      expect(response.status).toBe(400)
      expect(response.headers.get('Content-Type')).toBe('application/json')

      // Response body 확인을 위해 json() 호출이 가능해야 함
      expect(response.json).toBeDefined()
    })

    it('일반 Error를 500 응답으로 변환해야 함', () => {
      const error = new Error('Unexpected error')
      const response = handleApiError(error, 'test-request-id')

      expect(response.status).toBe(500)
    })

    it('문자열 에러를 500 응답으로 변환해야 함', () => {
      const response = handleApiError('Something went wrong', 'test-request-id')

      expect(response.status).toBe(500)
    })

    it('RateLimitError의 경우 Retry-After 헤더를 포함해야 함', () => {
      const error = new RateLimitError(120)
      const response = handleApiError(error, 'test-request-id')

      expect(response.status).toBe(429)
      expect(response.headers.get('Retry-After')).toBe('120')
    })

    it('에러를 콘솔에 로그해야 함', () => {
      const consoleSpy = jest.spyOn(console, 'error')
      const error = new Error('Test error')

      handleApiError(error, 'test-request-id')

      expect(consoleSpy).toHaveBeenCalledWith(
        'API Error [test-request-id]:',
        error
      )
    })

    it('requestId 없이도 작동해야 함', () => {
      const consoleSpy = jest.spyOn(console, 'error')
      const error = new Error('Test error')

      const response = handleApiError(error)

      expect(response.status).toBe(500)
      expect(consoleSpy).toHaveBeenCalledWith('API Error:', error)
    })
  })

  describe('Error Chaining and Causes', () => {
    it('원인 에러를 포함한 ApiError를 생성할 수 있어야 함', () => {
      const originalError = new Error('Database connection failed')
      const apiError = new ApiError('Service unavailable', 503, 'SERVICE_UNAVAILABLE')

      // cause를 수동으로 설정
      ;(apiError as any).cause = originalError

      expect((apiError as any).cause).toBe(originalError)
    })

    it('중첩된 에러의 스택 트레이스를 포함해야 함', () => {
      const originalError = new Error('Original error')
      const wrappedError = new ApiError('Wrapped error', 500, 'WRAPPED_ERROR')
      ;(wrappedError as any).cause = originalError

      expect(wrappedError.stack).toContain('Wrapped error')
    })
  })

  describe('Security Considerations', () => {
    it('민감한 정보를 에러 메시지에 노출하지 않아야 함', () => {
      // 실제 데이터베이스 연결 문자열이나 비밀번호 등이 에러에 포함되면 안 됨
      const error = new Error('Connection failed: postgresql://user:password123@localhost:5432/db')
      const response = createErrorResponse(error)

      // 프로덕션에서는 민감한 정보를 제거해야 함
      expect(response.error.message).not.toContain('password123')
    })

    it('스택 트레이스를 프로덕션에서 숨겨야 함', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      try {
        const error = new ApiError('Production error')
        const response = createErrorResponse(error)

        // 프로덕션에서는 스택 트레이스나 내부 구현 세부사항을 노출하지 않아야 함
        expect(response.error).not.toHaveProperty('stack')
      } finally {
        process.env.NODE_ENV = originalEnv
      }
    })

    it('사용자 입력으로 인한 에러 메시지를 적절히 처리해야 함', () => {
      const userInput = '<script>alert("xss")</script>'
      const error = new ValidationError(`Invalid input: ${userInput}`)

      // XSS 공격을 방지하기 위해 사용자 입력을 그대로 반환하지 않아야 함
      const response = createErrorResponse(error)
      expect(response.error.message).not.toContain('<script>')
    })
  })
})