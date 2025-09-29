// API 설정 관리
import type { RateLimitConfig, CacheConfig } from '@/types/api'

// 환경별 설정
const isDevelopment = process.env.NODE_ENV === 'development'
const isProduction = process.env.NODE_ENV === 'production'

// API 기본 설정
export const API_CONFIG = {
  // API 버전
  VERSION: 'v1',

  // 기본 응답 설정
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  // 타임아웃 설정 (밀리초)
  TIMEOUT: {
    DEFAULT: 30000, // 30초
    LONG_RUNNING: 60000, // 1분
    FILE_UPLOAD: 300000, // 5분
  },

  // CORS 설정
  CORS: {
    origin: isProduction
      ? process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'
      : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-CSRF-Token',
      'X-Requested-With',
      'X-API-Key',
    ],
    credentials: true,
  },

  // 보안 헤더
  SECURITY_HEADERS: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  },

  // 로깅 설정
  LOGGING: {
    LEVEL: isDevelopment ? 'debug' : 'info',
    INCLUDE_STACK_TRACE: isDevelopment,
    LOG_REQUEST_BODY: isDevelopment,
    LOG_RESPONSE_BODY: isDevelopment,
  },
} as const

// Rate Limiting 설정
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // 일반적인 API 요청
  DEFAULT: {
    windowMs: 15 * 60 * 1000, // 15분
    max: 1000, // 15분당 1000회
  },

  // 인증 관련 요청 (더 엄격)
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15분
    max: 100, // 15분당 100회
  },

  // 로그인 시도 (매우 엄격)
  LOGIN: {
    windowMs: 15 * 60 * 1000, // 15분
    max: 10, // 15분당 10회
  },

  // 검색 API (적당히 엄격)
  SEARCH: {
    windowMs: 1 * 60 * 1000, // 1분
    max: 60, // 1분당 60회
  },

  // 파일 업로드 (제한적)
  UPLOAD: {
    windowMs: 60 * 60 * 1000, // 1시간
    max: 50, // 1시간당 50회
  },

  // BFF 엔드포인트 (높은 사용량 예상)
  BFF: {
    windowMs: 1 * 60 * 1000, // 1분
    max: 120, // 1분당 120회
  },
}

// 캐싱 설정
export const CACHE_CONFIGS: Record<string, CacheConfig> = {
  // 정적 데이터 (옵션 목록, 가격표 등)
  STATIC: {
    ttl: 24 * 60 * 60, // 24시간
    keyPrefix: 'static',
    tags: ['static-data'],
  },

  // 사용자별 데이터
  USER: {
    ttl: 30 * 60, // 30분
    keyPrefix: 'user',
    tags: ['user-data'],
  },

  // 디자인 데이터
  DESIGN: {
    ttl: 60 * 60, // 1시간
    keyPrefix: 'design',
    tags: ['design-data'],
  },

  // 가격 계산 결과
  PRICING: {
    ttl: 15 * 60, // 15분
    keyPrefix: 'pricing',
    tags: ['pricing-data'],
  },

  // BFF 집계 데이터
  BFF_AGGREGATED: {
    ttl: 5 * 60, // 5분
    keyPrefix: 'bff',
    tags: ['bff-data'],
  },

  // 세션 데이터
  SESSION: {
    ttl: 60 * 60, // 1시간
    keyPrefix: 'session',
    tags: ['session-data'],
  },
}

// Database 설정
export const DATABASE_CONFIG = {
  // 연결 풀 설정
  CONNECTION_POOL: {
    min: 0,
    max: 10,
    idleTimeoutMillis: 30000,
  },

  // 쿼리 타임아웃
  QUERY_TIMEOUT: 30000, // 30초

  // 재시도 설정
  RETRY: {
    attempts: 3,
    delay: 1000, // 1초
    backoffMultiplier: 2,
  },
}

// JWT 설정
export const JWT_CONFIG = {
  // 토큰 만료 시간
  ACCESS_TOKEN_EXPIRES_IN: '1h',
  REFRESH_TOKEN_EXPIRES_IN: '30d',

  // 토큰 검증 설정
  VERIFY_OPTIONS: {
    issuer: process.env.JWT_ISSUER || 'befun-v3',
    audience: process.env.JWT_AUDIENCE || 'befun-v3-app',
  },
}

// 파일 업로드 설정
export const UPLOAD_CONFIG = {
  // 파일 크기 제한 (바이트)
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB

  // 허용되는 파일 타입
  ALLOWED_TYPES: {
    IMAGE: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    DOCUMENT: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    DESIGN: ['application/json', 'text/plain'], // 3D 디자인 파일
  },

  // 임시 파일 저장 디렉토리
  TEMP_DIR: '/tmp/uploads',

  // 파일 이름 패턴
  FILENAME_PATTERN: /^[a-zA-Z0-9._-]+$/,
}

// 에러 처리 설정
export const ERROR_CONFIG = {
  // 스택 트레이스 포함 여부
  INCLUDE_STACK_TRACE: isDevelopment,

  // 에러 리포팅 설정
  REPORTING: {
    ENABLED: isProduction,
    MAX_ERROR_LENGTH: 1000,
    INCLUDE_REQUEST_DATA: false, // 보안상 기본적으로 비활성화
  },

  // 사용자 친화적 메시지
  USER_FRIENDLY_MESSAGES: {
    INTERNAL_SERVER_ERROR: '서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    VALIDATION_FAILED: '입력하신 정보를 다시 확인해 주세요.',
    UNAUTHORIZED: '로그인이 필요합니다.',
    FORBIDDEN: '이 작업을 수행할 권한이 없습니다.',
    RATE_LIMIT_EXCEEDED: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
  },
}

// Monitoring 설정
export const MONITORING_CONFIG = {
  // 메트릭 수집 간격 (밀리초)
  METRICS_INTERVAL: 60000, // 1분

  // 성능 임계값
  PERFORMANCE_THRESHOLDS: {
    RESPONSE_TIME_WARNING: 1000, // 1초
    RESPONSE_TIME_ERROR: 5000, // 5초
    ERROR_RATE_WARNING: 0.05, // 5%
    ERROR_RATE_ERROR: 0.1, // 10%
  },

  // 건강 상태 체크 설정
  HEALTH_CHECK: {
    INTERVAL: 30000, // 30초
    TIMEOUT: 5000, // 5초
    ENDPOINTS: [
      '/api/health',
      '/api/v1/status',
    ],
  },
}

// 외부 서비스 설정
export const EXTERNAL_SERVICES = {
  // Supabase
  SUPABASE: {
    URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    TIMEOUT: 10000, // 10초
  },

  // 결제 서비스 (추후 구현)
  PAYMENT: {
    TIMEOUT: 30000, // 30초
    RETRY_ATTEMPTS: 3,
  },

  // 이메일 서비스 (추후 구현)
  EMAIL: {
    TIMEOUT: 15000, // 15초
    RETRY_ATTEMPTS: 2,
  },
}

// 개발 환경 전용 설정
export const DEV_CONFIG = isDevelopment ? {
  // 개발용 디버그 모드
  DEBUG_MODE: true,

  // 모의 데이터 사용
  USE_MOCK_DATA: process.env.USE_MOCK_DATA === 'true',

  // API 응답 지연 시뮬레이션
  SIMULATE_DELAY: parseInt(process.env.API_DELAY || '0', 10),
} : {}

// 모든 설정을 내보내는 통합 객체
export const CONFIG = {
  API: API_CONFIG,
  RATE_LIMITS,
  CACHE: CACHE_CONFIGS,
  DATABASE: DATABASE_CONFIG,
  JWT: JWT_CONFIG,
  UPLOAD: UPLOAD_CONFIG,
  ERROR: ERROR_CONFIG,
  MONITORING: MONITORING_CONFIG,
  EXTERNAL_SERVICES,
  DEV: DEV_CONFIG,
} as const

// 설정 유효성 검사
export function validateConfig(): void {
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]

  const missingVars = requiredEnvVars.filter(
    varName => !process.env[varName]
  )

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    )
  }
}

// 설정 초기화
if (typeof window === 'undefined') {
  validateConfig()
}