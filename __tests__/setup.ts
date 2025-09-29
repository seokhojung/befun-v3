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

// Node.js 환경에서 jsdom 사용 시 필요한 Web API 모의
if (typeof global.Request === 'undefined') {
  global.Request = class MockRequest {
    constructor(public url: string, public init: any = {}) {}
    json() { return Promise.resolve(JSON.parse(this.init.body || '{}')) }
    text() { return Promise.resolve(this.init.body || '') }
    headers = new Map()
    method = this.init.method || 'GET'
    nextUrl = { searchParams: new URLSearchParams() }
    cookies = { get: jest.fn() }
  } as any
}

global.Response = class MockResponse {
  constructor(public body?: any, public init: any = {}) {}
  static json(data: any, init?: any) {
    return new MockResponse(JSON.stringify(data), {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers }
    })
  }
  json() { return Promise.resolve(JSON.parse(this.body || '{}')) }
  text() { return Promise.resolve(this.body || '') }
  get status() { return this.init.status || 200 }
  get headers() {
    return new Map(Object.entries(this.init.headers || {}))
  }
} as any

global.Headers = Map as any

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

// Date 모의 (일관된 타임스탬프)
const mockDate = new Date('2024-01-01T00:00:00.000Z')
jest.spyOn(global, 'Date').mockImplementation(() => mockDate)
Date.now = jest.fn(() => mockDate.getTime())

// cleanup 함수
afterEach(() => {
  jest.clearAllMocks()
})

// 타임아웃 증가
jest.setTimeout(10000)