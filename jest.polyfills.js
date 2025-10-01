// jest.polyfills.js
// Minimal polyfills that run before jsdom is loaded
// Most Web API mocks are handled in __tests__/setup.ts which runs after jsdom

import { TextDecoder, TextEncoder } from 'util'
import { ReadableStream as NodeReadableStream } from 'stream/web'

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

// Minimal Request/Response polyfills
// jsdom in Node v20 should provide these, but adding fallback
if (typeof global.Request === 'undefined') {
  // Simple mock Request class for testing
  global.Request = class Request {
    constructor(input, init = {}) {
      this.url = typeof input === 'string' ? input : input.url
      this.method = init.method || 'GET'
      this.headers = new Map(Object.entries(init.headers || {}))
      this.body = init.body || null
    }
    async json() {
      return this.body ? JSON.parse(this.body) : null
    }
    async text() {
      return this.body || ''
    }
  }
}

if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init = {}) {
      this.body = body
      this.status = init.status || 200
      this.statusText = init.statusText || 'OK'
      this.headers = new Map(Object.entries(init.headers || {}))
      this.ok = this.status >= 200 && this.status < 300
    }
    async json() {
      return this.body ? JSON.parse(this.body) : null
    }
    async text() {
      return this.body || ''
    }
    // Static json() method for NextResponse compatibility
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
      this.data = new Map()
    }
    append(name, value) {
      this.data.set(name, value)
    }
    get(name) {
      return this.data.get(name) || null
    }
  }
}