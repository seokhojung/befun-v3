// API 입력 검증 유틸리티
import { z } from 'zod'
import type { NextRequest } from 'next/server'
import { ValidationError, transformZodError } from './errors'

// 공통 검증 스키마들
export const CommonSchemas = {
  // UUID 검증
  uuid: z.string().uuid('올바른 UUID 형식이 아닙니다'),

  // 이메일 검증
  email: z.string().email('올바른 이메일 형식이 아닙니다'),

  // 페이지네이션 검증
  pagination: z.object({
    page: z
      .string()
      .optional()
      .transform(val => val ? parseInt(val, 10) : 1)
      .pipe(z.number().min(1, '페이지는 1 이상이어야 합니다')),
    limit: z
      .string()
      .optional()
      .transform(val => val ? parseInt(val, 10) : 20)
      .pipe(z.number().min(1).max(100, '한 페이지당 최대 100개까지 조회할 수 있습니다')),
  }),

  // 정렬 검증
  sorting: z.object({
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  }),

  // 날짜 범위 검증
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }).refine(
    data => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate)
      }
      return true
    },
    { message: '시작일은 종료일보다 빨라야 합니다' }
  ),

  // 검색 쿼리 검증
  search: z.object({
    q: z.string().min(1, '검색어를 입력해주세요').max(100, '검색어는 100자 이내로 입력해주세요').optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
}

// 디자인 옵션 스키마 (재사용을 위해 별도 정의)
const designOptionsSchema = z.object({
  width_cm: z.number().min(10, '너비는 최소 10cm 이상이어야 합니다').max(500, '너비는 최대 500cm까지 가능합니다'),
  depth_cm: z.number().min(10, '깊이는 최소 10cm 이상이어야 합니다').max(500, '깊이는 최대 500cm까지 가능합니다'),
  height_cm: z.number().min(10, '높이는 최소 10cm 이상이어야 합니다').max(300, '높이는 최대 300cm까지 가능합니다'),
  material: z.enum(['wood', 'metal', 'glass', 'fabric'] as const),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, '올바른 색상 코드 형식이 아닙니다'),
  finish: z.enum(['matte', 'glossy', 'satin']).optional(),
})

// 비즈니스 로직 스키마들
export const BusinessSchemas = {
  // 디자인 관련 검증
  designOptions: designOptionsSchema,
  
  // Desk 옵션(컨피규레이터) 검증
  deskOptions: z.object({
    width_cm: z
      .number()
      .int('정수(cm)만 허용합니다')
      .min(30, '너비는 최소 30cm 이상이어야 합니다')
      .max(300, '너비는 최대 300cm까지 가능합니다'),
    depth_cm: z
      .number()
      .int('정수(cm)만 허용합니다')
      .min(30, '깊이는 최소 30cm 이상이어야 합니다')
      .max(300, '깊이는 최대 300cm까지 가능합니다'),
    height_cm: z
      .number()
      .int('정수(cm)만 허용합니다')
      .min(40, '높이는 최소 40cm 이상이어야 합니다')
      .max(120, '높이는 최대 120cm까지 가능합니다'),
    material: z.enum(['wood', 'mdf', 'steel', 'metal', 'glass', 'fabric'] as const),
    finish: z.enum(['matte', 'glossy', 'satin']).optional(),
    color: z.string().regex(/^#[0-9A-F]{6}$/i, '올바른 색상 코드 형식이 아닙니다'),
  }),

  // 가격 계산 요청 검증
  pricingRequest: z.object({
    designId: CommonSchemas.uuid.optional(),
    options: z.object({
      width_cm: z.number().positive(),
      depth_cm: z.number().positive(),
      height_cm: z.number().positive(),
      material: z.string(),
      finish: z.string().optional(),
      accessories: z.array(z.string()).optional(),
    }),
    quantity: z.number().min(1, '수량은 1개 이상이어야 합니다').max(100, '한 번에 최대 100개까지 주문 가능합니다'),
    discountCode: z.string().optional(),
  }),

  // 디자인 저장 요청 검증
  saveDesignRequest: z.object({
    name: z.string().min(1, '디자인 이름을 입력해주세요').max(100, '디자인 이름은 100자 이내로 입력해주세요'),
    description: z.string().max(500, '설명은 500자 이내로 입력해주세요').optional(),
    options: designOptionsSchema,
    tags: z.array(z.string().max(20)).max(10, '태그는 최대 10개까지 등록할 수 있습니다').optional(),
    isPublic: z.boolean().default(false),
  }),

  // 사용자 프로필 업데이트 검증
  updateProfileRequest: z.object({
    displayName: z.string().min(2, '이름은 2글자 이상이어야 합니다').max(50, '이름은 50자 이내로 입력해주세요').optional(),
    bio: z.string().max(200, '자기소개는 200자 이내로 입력해주세요').optional(),
    website: z.string().url('올바른 웹사이트 주소를 입력해주세요').optional(),
    preferences: z.object({
      theme: z.enum(['light', 'dark', 'auto']).optional(),
      notifications: z.object({
        email: z.boolean().optional(),
        push: z.boolean().optional(),
        sms: z.boolean().optional(),
      }).optional(),
      privacy: z.object({
        showProfile: z.boolean().optional(),
        showDesigns: z.boolean().optional(),
      }).optional(),
    }).optional(),
  }),
}

// 검증 옵션
interface ValidationOptions {
  stripUnknown?: boolean
  allowExtraKeys?: boolean
}

// 요청 본문 검증
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>,
  requestId?: string,
  options: ValidationOptions = {}
): Promise<T> {
  try {
    const body = await request.json()

    // 빈 본문 체크
    if (!body || (typeof body === 'object' && Object.keys(body).length === 0)) {
      throw new ValidationError('요청 본문이 비어있습니다', undefined, requestId)
    }

    const result = schema.parse(body)
    return result
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw transformZodError(error, requestId)
    }
    if (error instanceof ValidationError) {
      throw error
    }
    throw new ValidationError('요청 본문을 파싱할 수 없습니다', { originalError: error }, requestId)
  }
}

// 쿼리 파라미터 검증
export function validateQueryParams<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>,
  requestId?: string
): T {
  try {
    const url = new URL(request.url)
    const params = Object.fromEntries(url.searchParams.entries())

    const result = schema.parse(params)
    return result
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw transformZodError(error, requestId)
    }
    throw new ValidationError('쿼리 파라미터가 올바르지 않습니다', { originalError: error }, requestId)
  }
}

// 경로 파라미터 검증
export function validatePathParams<T>(
  params: Record<string, string>,
  schema: z.ZodSchema<T>,
  requestId?: string
): T {
  try {
    const result = schema.parse(params)
    return result
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw transformZodError(error, requestId)
    }
    throw new ValidationError('경로 파라미터가 올바르지 않습니다', { originalError: error }, requestId)
  }
}

// 헤더 검증
export function validateHeaders<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>,
  requestId?: string
): T {
  try {
    const headers: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value
    })

    const result = schema.parse(headers)
    return result
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw transformZodError(error, requestId)
    }
    throw new ValidationError('요청 헤더가 올바르지 않습니다', { originalError: error }, requestId)
  }
}

// 통합 검증 함수
export async function validateRequest<TBody, TQuery, TParams>(
  request: NextRequest,
  schemas: {
    body?: z.ZodSchema<TBody>
    query?: z.ZodSchema<TQuery>
    params?: z.ZodSchema<TParams>
    headers?: z.ZodSchema<any>
  },
  params?: Record<string, string>,
  requestId?: string
): Promise<{
  body?: TBody
  query?: TQuery
  params?: TParams
  headers?: any
}> {
  const result: any = {}

  // 본문 검증
  if (schemas.body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
    result.body = await validateRequestBody(request, schemas.body, requestId)
  }

  // 쿼리 파라미터 검증
  if (schemas.query) {
    result.query = validateQueryParams(request, schemas.query, requestId)
  }

  // 경로 파라미터 검증
  if (schemas.params && params) {
    result.params = validatePathParams(params, schemas.params, requestId)
  }

  // 헤더 검증
  if (schemas.headers) {
    result.headers = validateHeaders(request, schemas.headers, requestId)
  }

  return result
}

// 파일 업로드 검증
export function validateFileUpload(
  file: File,
  options: {
    maxSize?: number
    allowedTypes?: string[]
    allowedExtensions?: string[]
  } = {},
  requestId?: string
): void {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB
    allowedTypes = [],
    allowedExtensions = []
  } = options

  // 파일 크기 검증
  if (file.size > maxSize) {
    throw new ValidationError(
      `파일 크기는 ${Math.round(maxSize / 1024 / 1024)}MB 이하여야 합니다`,
      { fileSize: file.size, maxSize },
      requestId
    )
  }

  // 파일 타입 검증
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    throw new ValidationError(
      '지원되지 않는 파일 형식입니다',
      { fileType: file.type, allowedTypes },
      requestId
    )
  }

  // 파일 확장자 검증
  if (allowedExtensions.length > 0) {
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!extension || !allowedExtensions.includes(extension)) {
      throw new ValidationError(
        '지원되지 않는 파일 확장자입니다',
        { extension, allowedExtensions },
        requestId
      )
    }
  }
}

// 배치 검증 (여러 항목 검증)
export function validateBatch<T>(
  items: unknown[],
  schema: z.ZodSchema<T>,
  maxItems: number = 100,
  requestId?: string
): T[] {
  if (!Array.isArray(items)) {
    throw new ValidationError('배열 형태의 데이터가 필요합니다', undefined, requestId)
  }

  if (items.length === 0) {
    throw new ValidationError('최소 1개 이상의 항목이 필요합니다', undefined, requestId)
  }

  if (items.length > maxItems) {
    throw new ValidationError(
      `한 번에 최대 ${maxItems}개까지만 처리할 수 있습니다`,
      { itemCount: items.length, maxItems },
      requestId
    )
  }

  try {
    return items.map((item, index) => {
      try {
        return schema.parse(item)
      } catch (error) {
        if (error instanceof z.ZodError) {
          const validationError = transformZodError(error, requestId)
          validationError.details.index = index
          throw validationError
        }
        throw error
      }
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error
    }
    throw new ValidationError('배치 데이터 검증에 실패했습니다', { originalError: error }, requestId)
  }
}

// 조건부 검증 (특정 조건에서만 검증)
export function validateConditional<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
  condition: boolean,
  requestId?: string
): T | undefined {
  if (!condition) {
    return undefined
  }

  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw transformZodError(error, requestId)
    }
    throw new ValidationError('조건부 검증에 실패했습니다', { originalError: error }, requestId)
  }
}

// 비즈니스 규칙 검증 헬퍼
export const BusinessValidators = {
  // 디자인 옵션 조합 검증
  validateDesignCombination: (options: any, requestId?: string): void => {
    const { material, finish, width_cm, height_cm } = options

    // 유리 재질의 경우 높이 제한
    if (material === 'glass' && height_cm > 200) {
      throw new ValidationError(
        '유리 재질의 경우 높이는 200cm를 초과할 수 없습니다',
        { material, height_cm },
        requestId
      )
    }

    // 금속 재질의 경우 특정 마감재만 가능
    if (material === 'metal' && finish && !['matte', 'glossy'].includes(finish)) {
      throw new ValidationError(
        '금속 재질의 경우 무광(matte) 또는 광택(glossy) 마감재만 선택할 수 있습니다',
        { material, finish },
        requestId
      )
    }

    // 너비가 300cm 이상인 경우 특별 제작 안내
    if (width_cm >= 300) {
      // 이것은 경고성 메시지이므로 로그로 기록하고 통과
      console.warn(`Large width detected: ${width_cm}cm - Special manufacturing required`)
    }
  },

  // 가격 계산 요청 검증
  validatePricingRequest: (request: any, requestId?: string): void => {
    const { quantity, options, discountCode } = request

    // 대량 주문시 확인
    if (quantity > 50) {
      console.info(`Bulk order detected: ${quantity} items`)
    }

    // 할인 코드 형식 검증 (간단한 예시)
    if (discountCode && !/^[A-Z0-9]{6,10}$/.test(discountCode)) {
      throw new ValidationError(
        '올바른 할인 코드 형식이 아닙니다 (6-10자리 대문자/숫자)',
        { discountCode },
        requestId
      )
    }

    // 디자인 옵션 조합 검증
    BusinessValidators.validateDesignCombination(options, requestId)
  }
}
