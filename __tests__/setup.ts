// 테스트 전역 설정
import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

// 환경 변수 설정
process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

// Web API 폴리필
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder as any

// jsdom provides Request, Response, Headers
// Only mock NextRequest and NextResponse for Next.js compatibility

if (typeof global.NextRequest === 'undefined') {
  global.NextRequest = class MockNextRequest extends Request {
    constructor(url: string, init: any = {}) {
      super(url, init)
      this.nextUrl = { searchParams: new URLSearchParams(url.split('?')[1] || '') } as any
      this.cookies = {
        get: jest.fn(),
        getAll: jest.fn(() => []),
        set: jest.fn(),
        delete: jest.fn(),
      } as any
    }
    nextUrl: any
    cookies: any
  } as any
}

if (typeof global.NextResponse === 'undefined') {
  global.NextResponse = class MockNextResponse extends Response {
    constructor(body?: any, init: any = {}) {
      super(body, init)
      this.cookies = {
        set: jest.fn(),
        get: jest.fn(),
        delete: jest.fn(),
      } as any
    }

    static json(data: any, init?: any) {
      return new MockNextResponse(JSON.stringify(data), {
        ...init,
        headers: { 'Content-Type': 'application/json', ...init?.headers }
      })
    }

    static redirect(url: string, init?: any) {
      return new MockNextResponse(null, {
        ...init,
        status: init?.status || 302,
        headers: { Location: url, ...init?.headers }
      })
    }

    static next() {
      return new MockNextResponse(null, { status: 200 })
    }

    cookies: any
  } as any
}

// 전역 모의(Mock) 설정
global.crypto = {
  randomUUID: jest.fn(() => 'test-uuid-123'),
  getRandomValues: jest.fn((array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
    return array
  }),
} as any

// fetch 모의
global.fetch = jest.fn()

// console 모의 (테스트 중 로그 숨김)
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Date.now 모의 (일관된 타임스탬프)
const mockTimestamp = new Date('2024-01-01T00:00:00.000Z').getTime()
Date.now = jest.fn(() => mockTimestamp)

// cleanup 함수
afterEach(() => {
  jest.clearAllMocks()
})

// 타임아웃 증가
jest.setTimeout(10000)