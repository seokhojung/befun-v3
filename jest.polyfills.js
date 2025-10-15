// jest.polyfills.js
// Minimal polyfills that run before jsdom is loaded
// Most Web API mocks are handled in __tests__/setup.ts which runs after jsdom

const { TextDecoder, TextEncoder } = require('util')
const { ReadableStream: NodeReadableStream } = require('stream/web')
const { randomUUID: nodeRandomUUID } = require('crypto')

// Only add basic text encoding polyfills
// These are safe to add before jsdom loads
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder
}

if (typeof global.ReadableStream === 'undefined') {
  global.ReadableStream = NodeReadableStream
}

// Minimal crypto polyfill for Node/Jest environments
// Next.js route helpers and our handlers use crypto.randomUUID()
// Provide a stable implementation using Node's crypto when available
if (typeof global.crypto === 'undefined') {
  global.crypto = {
    randomUUID: typeof nodeRandomUUID === 'function'
      ? nodeRandomUUID
      : () => `jest-${Math.random().toString(36).slice(2)}`,
  }
} else if (typeof global.crypto.randomUUID !== 'function') {
  global.crypto.randomUUID = typeof nodeRandomUUID === 'function'
    ? nodeRandomUUID
    : () => `jest-${Math.random().toString(36).slice(2)}`
}

// Ensure Date.now provides a stable numeric value in tests
if (process.env.NODE_ENV === 'test' || typeof process?.env?.JEST_WORKER_ID !== 'undefined') {
  const fixed = new Date('2024-01-01T00:00:00.000Z').getTime()
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  Date.now = () => fixed
}

// Safe, minimal Fetch API fallbacks ONLY if missing.
// Keep descriptors compatible (use internal fields + getters) to avoid
// clashing with Next.js NextRequest/NextResponse prototypes.
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init = {}) {
      this._url = typeof input === 'string' ? input : input?.url || ''
      this._method = init.method || 'GET'
      this._headers = new Map(Object.entries(init.headers || {}))
      this._body = init.body ?? null
    }
    get url() {
      return this._url
    }
    get method() {
      return this._method
    }
    get headers() {
      return this._headers
    }
    get body() {
      return this._body
    }
    async json() {
      if (typeof this._body === 'string') return JSON.parse(this._body)
      return this._body
    }
    async text() {
      return this._body != null ? String(this._body) : ''
    }
  }
}

if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init = {}) {
      this._body = body
      this._status = init.status || 200
      this._statusText = init.statusText || 'OK'
      this._headers = new Map(Object.entries(init.headers || {}))
    }
    get body() {
      return this._body
    }
    get status() {
      return this._status
    }
    get statusText() {
      return this._statusText
    }
    get headers() {
      return this._headers
    }
    get ok() {
      return this._status >= 200 && this._status < 300
    }
    async json() {
      if (typeof this._body === 'string') return JSON.parse(this._body)
      return this._body
    }
    async text() {
      return this._body != null ? String(this._body) : ''
    }
    static json(data, init = {}) {
      return new Response(JSON.stringify(data), {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(init.headers || {}),
        },
      })
    }
  }
}

if (typeof global.Headers === 'undefined') {
  global.Headers = class Headers extends Map {
    append(name, value) {
      this.set(name, value)
    }
    get(name) {
      return super.get(name) || null
    }
  }
}

if (typeof global.FormData === 'undefined') {
  global.FormData = class FormData {
    constructor() {
      this._data = new Map()
    }
    append(name, value) {
      this._data.set(name, value)
    }
    get(name) {
      return this._data.get(name) || null
    }
  }
}

// --- jsdom 환경 보완 폴리필들 ---

// window.matchMedia 폴리필 (ThemeProvider 등에서 사용)
if (typeof global.matchMedia === 'undefined') {
  global.matchMedia = query => {
    // 기본적으로 다크모드 false로 가정
    const mql = {
      matches: false,
      media: String(query),
      onchange: null,
      addEventListener: (_event, _cb) => {},
      removeEventListener: (_event, _cb) => {},
      addListener: () => {}, // Safari/구버전 호환
      removeListener: () => {},
      dispatchEvent: () => false,
    }
    return mql
  }
}

// requestAnimationFrame/cancelAnimationFrame 폴리필 (애니메이션/성능 측정용)
if (typeof global.requestAnimationFrame === 'undefined') {
  global.requestAnimationFrame = cb => setTimeout(() => cb(Date.now()), 16)
}
if (typeof global.cancelAnimationFrame === 'undefined') {
  global.cancelAnimationFrame = id => clearTimeout(id)
}

// 캔버스 컨텍스트 모킹 (Three.js/2D 테스트 안정화)
// 개별 테스트에서 별도 모킹 시 해당 모킹이 우선
try {
  const proto = global.HTMLCanvasElement && global.HTMLCanvasElement.prototype
  if (proto) {
    // jsdom 기본 getContext가 throw 할 수 있으므로 존재 여부와 무관하게 오버라이드
    proto.getContext = function (type) {
      if (type === '2d') {
        // 최소 2D 컨텍스트 모킹
        return {
          fillRect: () => {},
          clearRect: () => {},
          getImageData: () => ({ data: new Uint8ClampedArray(0) }),
          putImageData: () => {},
          createImageData: () => ({ data: new Uint8ClampedArray(0) }),
          setTransform: () => {},
          drawImage: () => {},
          save: () => {},
          restore: () => {},
          beginPath: () => {},
          closePath: () => {},
          moveTo: () => {},
          lineTo: () => {},
          stroke: () => {},
          translate: () => {},
          scale: () => {},
          rotate: () => {},
          arc: () => {},
          fillText: () => {},
          measureText: () => ({ width: 0 }),
        }
      }
      if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
        // 최소 WebGL 컨텍스트 모킹 (존재 여부만 필요할 때)
        return {
          getExtension: () => null,
          getParameter: () => null,
          getContextAttributes: () => ({}),
          createShader: () => ({}),
          shaderSource: () => {},
          compileShader: () => {},
          createProgram: () => ({}),
          attachShader: () => {},
          linkProgram: () => {},
          useProgram: () => {},
          createBuffer: () => ({}),
          bindBuffer: () => {},
          bufferData: () => {},
          drawArrays: () => {},
          viewport: () => {},
          clearColor: () => {},
          clear: () => {},
        }
      }
      return null
    }
  }
} catch {}
