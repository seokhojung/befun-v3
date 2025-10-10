// NextRequest-like adapter for Node/Jest tests targeting Next.js App Router handlers

export function makeNextRequest(
  url: string,
  init: RequestInit & { body?: any } = {} as any
): any {
  const method = (init.method || 'GET').toUpperCase()

  // Use real Headers to match runtime behavior (iteration, get/set, case-insensitivity)
  const headers = new Headers(init.headers as any)

  // Preserve provided body for request.json()/text() compatibility
  const bodyInit = (init as any).body

  // Provide a minimal NextRequest-compatible shape used across our routes
  const req = {
    url,
    method,
    headers,
    // NextRequest.json() compatibility
    async json() {
      if (typeof bodyInit === 'undefined' || bodyInit === null) return null
      if (typeof bodyInit === 'string') {
        return JSON.parse(bodyInit)
      }
      return bodyInit
    },
    async text() {
      if (typeof bodyInit === 'string') return bodyInit
      if (typeof bodyInit === 'undefined' || bodyInit === null) return ''
      return JSON.stringify(bodyInit)
    },
    // Minimal cookies API
    cookies: {
      get: (_: string) => undefined,
      getAll: () => [],
      set: (_k: string, _v: string) => {},
      delete: (_: string) => {},
    },
    // Minimal nextUrl used by some utilities
    nextUrl: new URL(url),
    signal: (init as any).signal,
    clone() {
      return makeNextRequest(url, init)
    },
  }

  return req
}
