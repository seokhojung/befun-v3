// jest.polyfills.js
import { TextDecoder, TextEncoder } from 'util'

// Polyfill for Next.js server components
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock fetch for tests
global.fetch = jest.fn()

// Mock Headers
global.Headers = class Headers {
  constructor(init) {
    this.map = new Map()
    if (init) {
      if (init instanceof Headers) {
        init.forEach((value, key) => this.map.set(key, value))
      } else if (Array.isArray(init)) {
        init.forEach(([key, value]) => this.map.set(key, value))
      } else {
        Object.entries(init).forEach(([key, value]) => this.map.set(key, value))
      }
    }
  }

  get(key) { return this.map.get(key) || null }
  set(key, value) { this.map.set(key, value) }
  has(key) { return this.map.has(key) }
  delete(key) { return this.map.delete(key) }
  forEach(callback) { this.map.forEach((value, key) => callback(value, key, this)) }
}

// Mock Request
global.Request = class Request {
  constructor(input, init = {}) {
    this.url = typeof input === 'string' ? input : input.url
    this.method = init.method || 'GET'
    this.headers = new Headers(init.headers || {})
    this.body = init.body || null
    this._bodyUsed = false
  }

  async json() {
    if (this._bodyUsed) throw new Error('Body already used')
    this._bodyUsed = true
    return this.body ? JSON.parse(this.body) : {}
  }

  clone() {
    return new Request(this.url, {
      method: this.method,
      headers: this.headers,
      body: this.body
    })
  }
}

// Mock Response
global.Response = class Response {
  constructor(body, init = {}) {
    this.body = body
    this.status = init.status || 200
    this.ok = this.status >= 200 && this.status < 300
    this.headers = new Headers(init.headers || {})
  }

  async json() {
    return typeof this.body === 'string' ? JSON.parse(this.body) : this.body
  }

  async text() {
    return typeof this.body === 'string' ? this.body : JSON.stringify(this.body)
  }
}

// Mock NextRequest
global.NextRequest = global.Request

// Mock NextResponse
global.NextResponse = class NextResponse extends Response {
  constructor(body, init = {}) {
    super(body, init)
    this.cookies = {
      set: jest.fn(),
      get: jest.fn(),
      delete: jest.fn()
    }
  }

  static json(body, init = {}) {
    return new NextResponse(JSON.stringify(body), {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...init.headers
      }
    })
  }

  static redirect(url, init = {}) {
    return new NextResponse(null, {
      ...init,
      status: init.status || 302,
      headers: {
        location: url,
        ...init.headers
      }
    })
  }

  static next() {
    return new NextResponse(null, { status: 200 })
  }
}