// OpenAPI 3.0 스펙 및 Swagger 문서화
import swaggerJsdoc from 'swagger-jsdoc'
import { getVersionInfo } from './version'

// OpenAPI 기본 설정
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Befun v3 API',
    version: '1.0.0',
    description: '3D Configurator Platform API',
    termsOfService: 'https://befun.example.com/terms',
    contact: {
      name: 'API Support',
      email: 'api-support@befun.example.com',
      url: 'https://befun.example.com/support',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
      description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token for authentication',
      },
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key for service-to-service authentication',
      },
      CSRFToken: {
        type: 'apiKey',
        in: 'header',
        name: 'X-CSRF-Token',
        description: 'CSRF protection token',
      },
    },
    schemas: {
      // 기본 응답 스키마
      ApiResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: 'Request success status',
          },
          data: {
            type: 'object',
            description: 'Response data',
          },
          error: {
            $ref: '#/components/schemas/ApiError',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Response timestamp',
          },
          requestId: {
            type: 'string',
            description: 'Unique request identifier',
          },
        },
        required: ['success'],
      },

      // 에러 스키마
      ApiError: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'Error code',
            example: 'VALIDATION_FAILED',
          },
          message: {
            type: 'string',
            description: 'Human-readable error message',
            example: 'The provided data is invalid',
          },
          details: {
            type: 'object',
            description: 'Additional error details',
          },
        },
        required: ['code', 'message'],
      },

      // 페이지네이션 스키마
      PaginationInfo: {
        type: 'object',
        properties: {
          page: {
            type: 'integer',
            minimum: 1,
            description: 'Current page number',
            example: 1,
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            description: 'Items per page',
            example: 20,
          },
          total: {
            type: 'integer',
            description: 'Total number of items',
            example: 150,
          },
          totalPages: {
            type: 'integer',
            description: 'Total number of pages',
            example: 8,
          },
          hasNext: {
            type: 'boolean',
            description: 'Whether there is a next page',
            example: true,
          },
          hasPrev: {
            type: 'boolean',
            description: 'Whether there is a previous page',
            example: false,
          },
        },
        required: ['page', 'limit', 'total', 'totalPages', 'hasNext', 'hasPrev'],
      },

      // 디자인 스키마
      Design: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Design unique identifier',
            example: '123e4567-e89b-12d3-a456-426614174000',
          },
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
            description: 'Design name',
            example: 'Modern Living Room Table',
          },
          description: {
            type: 'string',
            maxLength: 500,
            description: 'Design description',
            example: 'A sleek modern table perfect for contemporary living rooms',
          },
          user_id: {
            type: 'string',
            format: 'uuid',
            description: 'Owner user ID',
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            description: 'Creation timestamp',
          },
          updated_at: {
            type: 'string',
            format: 'date-time',
            description: 'Last update timestamp',
          },
          status: {
            type: 'string',
            enum: ['draft', 'completed', 'ordered', 'archived'],
            description: 'Design status',
            example: 'completed',
          },
          options: {
            $ref: '#/components/schemas/DesignOptions',
          },
          tags: {
            type: 'array',
            items: {
              type: 'string',
              maxLength: 20,
            },
            maxItems: 10,
            description: 'Design tags',
            example: ['modern', 'minimalist', 'wood'],
          },
          is_public: {
            type: 'boolean',
            description: 'Whether the design is publicly visible',
            example: false,
          },
          estimated_price: {
            type: 'number',
            minimum: 0,
            description: 'Estimated price in KRW',
            example: 250000,
          },
          thumbnail_url: {
            type: 'string',
            format: 'uri',
            description: 'Design thumbnail image URL',
            example: 'https://example.com/thumbnails/design123.jpg',
          },
          likes_count: {
            type: 'integer',
            minimum: 0,
            description: 'Number of likes',
            example: 15,
          },
          views_count: {
            type: 'integer',
            minimum: 0,
            description: 'Number of views',
            example: 342,
          },
        },
        required: ['id', 'name', 'user_id', 'created_at', 'updated_at', 'status', 'options'],
      },

      // 디자인 옵션 스키마
      DesignOptions: {
        type: 'object',
        properties: {
          width_cm: {
            type: 'number',
            minimum: 10,
            maximum: 500,
            description: 'Width in centimeters',
            example: 120,
          },
          depth_cm: {
            type: 'number',
            minimum: 10,
            maximum: 500,
            description: 'Depth in centimeters',
            example: 60,
          },
          height_cm: {
            type: 'number',
            minimum: 10,
            maximum: 300,
            description: 'Height in centimeters',
            example: 75,
          },
          material: {
            type: 'string',
            enum: ['wood', 'metal', 'glass', 'fabric'],
            description: 'Material type',
            example: 'wood',
          },
          color: {
            type: 'string',
            pattern: '^#[0-9A-F]{6}$',
            description: 'Color code in hexadecimal format',
            example: '#8B4513',
          },
          finish: {
            type: 'string',
            enum: ['matte', 'glossy', 'satin'],
            description: 'Finish type',
            example: 'matte',
          },
        },
        required: ['width_cm', 'depth_cm', 'height_cm', 'material', 'color'],
      },

      // 가격 계산 요청 스키마
      PriceCalculationRequest: {
        type: 'object',
        properties: {
          dimensions: {
            type: 'object',
            properties: {
              width_cm: {
                type: 'number',
                minimum: 10,
                maximum: 500,
              },
              depth_cm: {
                type: 'number',
                minimum: 10,
                maximum: 500,
              },
              height_cm: {
                type: 'number',
                minimum: 10,
                maximum: 300,
              },
            },
            required: ['width_cm', 'depth_cm', 'height_cm'],
          },
          material: {
            type: 'string',
            enum: ['wood', 'metal', 'glass', 'fabric'],
          },
          finish: {
            type: 'string',
            enum: ['matte', 'glossy', 'satin'],
          },
          quantity: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 1,
          },
          discount_code: {
            type: 'string',
            maxLength: 20,
          },
          rush_order: {
            type: 'boolean',
            default: false,
          },
        },
        required: ['dimensions', 'material'],
      },

      // 가격 계산 응답 스키마
      PriceCalculationResponse: {
        type: 'object',
        properties: {
          base_price: {
            type: 'number',
            description: 'Base price',
            example: 50000,
          },
          material_cost: {
            type: 'number',
            description: 'Material cost',
            example: 75000,
          },
          size_cost: {
            type: 'number',
            description: 'Size-based cost',
            example: 54000,
          },
          total: {
            type: 'number',
            description: 'Total price',
            example: 179000,
          },
          currency: {
            type: 'string',
            description: 'Currency code',
            example: 'KRW',
          },
          warnings: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Warning messages',
          },
          recommendations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['cost_optimization', 'material_suggestion', 'size_adjustment'],
                },
                message: {
                  type: 'string',
                },
                potential_savings: {
                  type: 'number',
                },
              },
            },
            description: 'Optimization recommendations',
          },
        },
        required: ['base_price', 'total', 'currency'],
      },

      // 사용자 프로필 스키마
      UserProfile: {
        type: 'object',
        properties: {
          user_id: {
            type: 'string',
            format: 'uuid',
            description: 'User unique identifier',
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address',
            example: 'user@example.com',
          },
          display_name: {
            type: 'string',
            maxLength: 50,
            description: 'Display name',
            example: 'John Doe',
          },
          subscription_tier: {
            type: 'string',
            enum: ['free', 'premium', 'admin', 'superadmin'],
            description: 'Subscription tier',
            example: 'free',
          },
          preferences: {
            type: 'object',
            properties: {
              theme: {
                type: 'string',
                enum: ['light', 'dark', 'auto'],
                example: 'light',
              },
              units: {
                type: 'string',
                enum: ['cm', 'inch'],
                example: 'cm',
              },
              currency: {
                type: 'string',
                enum: ['KRW', 'USD', 'EUR', 'JPY'],
                example: 'KRW',
              },
            },
          },
          quota: {
            type: 'object',
            properties: {
              designs_used: {
                type: 'integer',
                minimum: 0,
                example: 3,
              },
              designs_limit: {
                type: 'integer',
                minimum: 1,
                example: 5,
              },
            },
          },
        },
        required: ['user_id', 'email', 'subscription_tier'],
      },

      // API 상태 스키마
      ApiStatus: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['healthy', 'degraded', 'down'],
            description: 'Overall API status',
            example: 'healthy',
          },
          version: {
            type: 'string',
            description: 'API version',
            example: 'v1',
          },
          environment: {
            type: 'string',
            description: 'Environment',
            example: 'production',
          },
          services: {
            type: 'object',
            properties: {
              database: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    enum: ['healthy', 'degraded', 'down'],
                  },
                  response_time_ms: {
                    type: 'number',
                  },
                },
              },
              authentication: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    enum: ['healthy', 'degraded', 'down'],
                  },
                  response_time_ms: {
                    type: 'number',
                  },
                },
              },
            },
          },
          features: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Available features',
          },
        },
        required: ['status', 'version', 'services'],
      },
    },

    // 공통 파라미터
    parameters: {
      PageParam: {
        name: 'page',
        in: 'query',
        description: 'Page number',
        required: false,
        schema: {
          type: 'integer',
          minimum: 1,
          default: 1,
        },
      },
      LimitParam: {
        name: 'limit',
        in: 'query',
        description: 'Number of items per page',
        required: false,
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 20,
        },
      },
      SortByParam: {
        name: 'sort_by',
        in: 'query',
        description: 'Sort field',
        required: false,
        schema: {
          type: 'string',
          enum: ['created_at', 'updated_at', 'name', 'estimated_price'],
          default: 'updated_at',
        },
      },
      SortOrderParam: {
        name: 'sort_order',
        in: 'query',
        description: 'Sort order',
        required: false,
        schema: {
          type: 'string',
          enum: ['asc', 'desc'],
          default: 'desc',
        },
      },
    },

    // 공통 응답
    responses: {
      BadRequest: {
        description: 'Bad Request - Invalid input',
        content: {
          'application/json': {
            schema: {
              allOf: [
                { $ref: '#/components/schemas/ApiResponse' },
                {
                  type: 'object',
                  properties: {
                    success: { example: false },
                    error: {
                      type: 'object',
                      properties: {
                        code: { example: 'BAD_REQUEST' },
                        message: { example: 'Invalid request data' },
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      },
      Unauthorized: {
        description: 'Unauthorized - Authentication required',
        content: {
          'application/json': {
            schema: {
              allOf: [
                { $ref: '#/components/schemas/ApiResponse' },
                {
                  type: 'object',
                  properties: {
                    success: { example: false },
                    error: {
                      type: 'object',
                      properties: {
                        code: { example: 'UNAUTHORIZED' },
                        message: { example: 'Authentication required' },
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      },
      Forbidden: {
        description: 'Forbidden - Insufficient permissions',
        content: {
          'application/json': {
            schema: {
              allOf: [
                { $ref: '#/components/schemas/ApiResponse' },
                {
                  type: 'object',
                  properties: {
                    success: { example: false },
                    error: {
                      type: 'object',
                      properties: {
                        code: { example: 'FORBIDDEN' },
                        message: { example: 'Insufficient permissions' },
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      },
      NotFound: {
        description: 'Not Found - Resource not found',
        content: {
          'application/json': {
            schema: {
              allOf: [
                { $ref: '#/components/schemas/ApiResponse' },
                {
                  type: 'object',
                  properties: {
                    success: { example: false },
                    error: {
                      type: 'object',
                      properties: {
                        code: { example: 'NOT_FOUND' },
                        message: { example: 'Resource not found' },
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      },
      RateLimitExceeded: {
        description: 'Too Many Requests - Rate limit exceeded',
        content: {
          'application/json': {
            schema: {
              allOf: [
                { $ref: '#/components/schemas/ApiResponse' },
                {
                  type: 'object',
                  properties: {
                    success: { example: false },
                    error: {
                      type: 'object',
                      properties: {
                        code: { example: 'RATE_LIMIT_EXCEEDED' },
                        message: { example: 'Rate limit exceeded' },
                      },
                    },
                  },
                },
              ],
            },
          },
        },
        headers: {
          'X-RateLimit-Limit': {
            schema: { type: 'integer' },
            description: 'Request limit per time window',
          },
          'X-RateLimit-Remaining': {
            schema: { type: 'integer' },
            description: 'Remaining requests in time window',
          },
          'X-RateLimit-Reset': {
            schema: { type: 'integer' },
            description: 'Time window reset timestamp',
          },
          'Retry-After': {
            schema: { type: 'integer' },
            description: 'Seconds to wait before next request',
          },
        },
      },
      InternalServerError: {
        description: 'Internal Server Error - Server error',
        content: {
          'application/json': {
            schema: {
              allOf: [
                { $ref: '#/components/schemas/ApiResponse' },
                {
                  type: 'object',
                  properties: {
                    success: { example: false },
                    error: {
                      type: 'object',
                      properties: {
                        code: { example: 'INTERNAL_SERVER_ERROR' },
                        message: { example: 'Internal server error' },
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      },
    },
  },

  // 태그 분류
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and authorization',
    },
    {
      name: 'Designs',
      description: '3D design management',
    },
    {
      name: 'Pricing',
      description: 'Price calculation services',
    },
    {
      name: 'Profile',
      description: 'User profile management',
    },
    {
      name: 'Checkout',
      description: 'Order and payment processing',
    },
    {
      name: 'BFF',
      description: 'Backend for Frontend aggregation endpoints',
    },
    {
      name: 'System',
      description: 'System status and monitoring',
    },
  ],

  // 기본 보안 요구사항
  security: [
    {
      BearerAuth: [],
    },
  ],
}

// Swagger JSDoc 옵션
const swaggerOptions: swaggerJsdoc.Options = {
  definition: swaggerDefinition,
  apis: [
    // API 라우트 파일들
    './src/app/api/v1/**/*.ts',
    './src/app/api/docs/**/*.ts',
    // 추가 문서 파일들
    './docs/api/*.md',
  ],
}

// Swagger 스펙 생성
export function generateSwaggerSpec() {
  try {
    const specs = swaggerJsdoc(swaggerOptions)
    return specs
  } catch (error) {
    console.error('Error generating Swagger spec:', error)
    return null
  }
}

// Swagger JSON 스펙 생성 (캐시된 버전)
let cachedSpec: any = null
let specGeneratedAt = 0
const SPEC_CACHE_TTL = 5 * 60 * 1000 // 5분

export function getSwaggerSpec() {
  const now = Date.now()

  if (!cachedSpec || (now - specGeneratedAt > SPEC_CACHE_TTL)) {
    cachedSpec = generateSwaggerSpec()
    specGeneratedAt = now
  }

  return cachedSpec
}

// API 버전 정보 추가
export function getSwaggerSpecWithVersion() {
  const spec = getSwaggerSpec()
  const versionInfo = getVersionInfo()

  if (spec) {
    spec.info.version = versionInfo.current
    spec.info['x-api-versions'] = versionInfo.supported
    spec.info['x-deprecated-versions'] = versionInfo.deprecated
  }

  return spec
}

// 개발용 Swagger 설정
export const swaggerConfig = {
  url: '/api/docs/swagger.json',
  dom_id: '#swagger-ui',
  presets: ['standalone'],
  layout: 'StandaloneLayout',
  deepLinking: true,
  displayOperationId: true,
  defaultModelsExpandDepth: 1,
  defaultModelExpandDepth: 1,
  defaultModelRendering: 'example',
  displayRequestDuration: true,
  docExpansion: 'none',
  filter: true,
  maxDisplayedTags: 10,
  showExtensions: true,
  showCommonExtensions: true,
  tryItOutEnabled: true,
  requestInterceptor: (request: any) => {
    // 요청 인터셉터 - CSRF 토큰 추가 등
    console.log('Swagger request:', request)
    return request
  },
  responseInterceptor: (response: any) => {
    // 응답 인터셉터 - 로깅 등
    console.log('Swagger response:', response)
    return response
  },
}