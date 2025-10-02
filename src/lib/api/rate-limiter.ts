// API Rate Limiting 미들웨어
import type { NextRequest } from 'next/server'
import type { RateLimitConfig } from '@/types/api'
import { RateLimitError } from './errors'
import { CONFIG } from '@/config/api'
import { logger } from './logger'

// 메모리 기반 Rate Limit 저장소 (향후 Redis로 대체 가능)
interface RateLimitEntry {
  count: number
  resetTime: number
  firstRequest: number
}

class MemoryRateLimitStore {
  private store = new Map<string, RateLimitEntry>()
  private cleanupInterval: NodeJS.Timer | null = null

  constructor() {
    // 5분마다 만료된 항목 정리
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime < now) {
        this.store.delete(key)
      }
    }
  }

  get(key: string): RateLimitEntry | undefined {
    const entry = this.store.get(key)
    if (entry && entry.resetTime < Date.now()) {
      this.store.delete(key)
      return undefined
    }
    return entry
  }

  set(key: string, entry: RateLimitEntry): void {
    this.store.set(key, entry)
  }

  increment(key: string, windowMs: number): RateLimitEntry {
    const now = Date.now()
    const existing = this.get(key)

    if (!existing) {
      const entry: RateLimitEntry = {
        count: 1,
        resetTime: now + windowMs,
        firstRequest: now,
      }
      this.set(key, entry)
      return entry
    }

    existing.count++
    this.set(key, existing)
    return existing
  }

  // 서버 종료 시 정리
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.store.clear()
  }
}

// 전역 저장소 인스턴스
const rateLimitStore = new MemoryRateLimitStore()

// 클라이언트 식별을 위한 키 생성 (다중 식별자 지원)
export function generateRateLimitKey(
  request: NextRequest,
  config: RateLimitConfig & { keyType?: 'ip' | 'user' | 'api_key' | 'hybrid' }
): string {
  const keyType = config.keyType || 'ip'

  switch (keyType) {
    case 'ip':
      return getClientIp(request) || 'unknown'

    case 'user': {
      const userId = extractUserIdFromRequest(request)
      return userId ? `user:${userId}` : getClientIp(request) || 'unknown'
    }

    case 'api_key': {
      const apiKey = request.headers.get('X-API-Key')
      return apiKey ? `api:${apiKey}` : 'no-key'
    }

    case 'hybrid': {
      // 다중 식별자 조합: 사용자 + IP + User-Agent 해시
      const userId = extractUserIdFromRequest(request)
      const ip = getClientIp(request)
      const userAgent = request.headers.get('user-agent')

      // User-Agent의 해시 생성 (간단한 해시 함수)
      const uaHash = userAgent ? simpleHash(userAgent.substring(0, 100)) : 'no-ua'

      if (userId) {
        return `hybrid:${userId}:${ip || 'no-ip'}:${uaHash}`
      } else {
        return `hybrid:anon:${ip || 'no-ip'}:${uaHash}`
      }
    }

    default:
      return getClientIp(request) || 'unknown'
  }
}

// 간단한 해시 함수 (User-Agent용)
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // 32bit 정수로 변환
  }
  return Math.abs(hash).toString(36)
}

// 클라이언트 IP 추출 (보안 강화)
function getClientIp(request: NextRequest): string | null {
  // 신뢰할 수 있는 프록시 IP 목록 (Vercel, Cloudflare 등)
  const trustedProxies = [
    '76.76.21.21', // Vercel
    '76.76.19.19', // Vercel
    '103.21.244.0/22', // Cloudflare (간단한 예시)
  ]

  // X-Forwarded-For 헤더 처리 시 보안 검증
  const xForwardedFor = request.headers.get('x-forwarded-for')
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',').map(ip => ip.trim()).filter(ip => {
      // 유효하지 않은 IP 주소 필터링
      return isValidIpAddress(ip) && !isPrivateIpAddress(ip)
    })

    // 첫 번째 유효한 공용 IP 반환
    for (const ip of ips) {
      if (ip && !isInternalIpAddress(ip)) {
        return ip
      }
    }
  }

  // 다른 헤더들도 검증
  const xRealIp = request.headers.get('x-real-ip')
  if (xRealIp && isValidIpAddress(xRealIp) && !isPrivateIpAddress(xRealIp)) {
    return xRealIp
  }

  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  if (cfConnectingIp && isValidIpAddress(cfConnectingIp) && !isPrivateIpAddress(cfConnectingIp)) {
    return cfConnectingIp
  }

  return null
}

// IP 주소 유효성 검증
function isValidIpAddress(ip: string): boolean {
  // IPv4 정규식
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/

  // IPv6 간단 검증 (실제로는 더 복잡할 수 있음)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/

  return ipv4Regex.test(ip) || ipv6Regex.test(ip)
}

// 프라이빗/내부 IP 주소 확인
function isPrivateIpAddress(ip: string): boolean {
  // RFC 1918 프라이빗 IP 범위
  const privateRanges = [
    /^10\./,                    // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12
    /^192\.168\./,              // 192.168.0.0/16
    /^127\./,                   // 127.0.0.0/8 (로컬호스트)
    /^169\.254\./,              // 169.254.0.0/16 (링크 로컬)
  ]

  return privateRanges.some(range => range.test(ip))
}

// 내부/로컬 IP 주소 확인
function isInternalIpAddress(ip: string): boolean {
  return ip === '127.0.0.1' ||
         ip === '::1' ||
         ip.startsWith('192.168.') ||
         ip.startsWith('10.') ||
         ip.startsWith('172.16.') ||
         ip === '0.0.0.0'
}

// 요청에서 사용자 ID 추출 (JWT에서)
function extractUserIdFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  try {
    const token = authHeader.substring(7)
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.sub || payload.user_id || null
  } catch {
    return null
  }
}

// Rate Limit 결과 타입
interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetTime: number
  retryAfter?: number
}

// Rate Limit 체크
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig & { keyType?: 'ip' | 'user' | 'api_key' },
  requestId?: string
): RateLimitResult {
  const key = generateRateLimitKey(request, config)
  const now = Date.now()

  // Rate limit 건너뛰기 조건 확인
  if (config.skipSuccessfulRequests || config.skipFailedRequests) {
    // 이 조건들은 응답 후에 확인해야 하므로 여기서는 처리하지 않음
    // 실제 구현에서는 응답 미들웨어에서 처리
  }

  const entry = rateLimitStore.increment(key, config.windowMs)
  const remaining = Math.max(0, config.max - entry.count)
  const allowed = entry.count <= config.max

  const result: RateLimitResult = {
    allowed,
    limit: config.max,
    remaining,
    resetTime: entry.resetTime,
  }

  if (!allowed) {
    result.retryAfter = Math.ceil((entry.resetTime - now) / 1000)

    logger.warn(
      'Rate limit exceeded',
      requestId || 'unknown',
      {
        key,
        count: entry.count,
        limit: config.max,
        resetTime: new Date(entry.resetTime).toISOString(),
        windowMs: config.windowMs,
      }
    )
  }

  return result
}

// Rate Limit 미들웨어
export function rateLimit(
  request: NextRequest,
  config: RateLimitConfig & { keyType?: 'ip' | 'user' | 'api_key' },
  requestId?: string
): void {
  const result = checkRateLimit(request, config, requestId)

  if (!result.allowed) {
    throw new RateLimitError(requestId, result.retryAfter)
  }
}

// 사전 정의된 Rate Limit 설정으로 체크하는 편의 함수들
export function checkDefaultRateLimit(request: NextRequest, requestId?: string): RateLimitResult {
  return checkRateLimit(request, CONFIG.RATE_LIMITS.DEFAULT, requestId)
}

export function checkAuthRateLimit(request: NextRequest, requestId?: string): RateLimitResult {
  return checkRateLimit(request, CONFIG.RATE_LIMITS.AUTH, requestId)
}

export function checkLoginRateLimit(request: NextRequest, requestId?: string): RateLimitResult {
  return checkRateLimit(request, CONFIG.RATE_LIMITS.LOGIN, requestId)
}

export function checkSearchRateLimit(request: NextRequest, requestId?: string): RateLimitResult {
  return checkRateLimit(request, CONFIG.RATE_LIMITS.SEARCH, requestId)
}

export function checkUploadRateLimit(request: NextRequest, requestId?: string): RateLimitResult {
  return checkRateLimit(request, CONFIG.RATE_LIMITS.UPLOAD, requestId)
}

export function checkBffRateLimit(request: NextRequest, requestId?: string): RateLimitResult {
  return checkRateLimit(request, CONFIG.RATE_LIMITS.BFF, requestId)
}

// API 엔드포인트용 Rate Limit 체크 (checkApiRateLimit alias)
export function checkApiRateLimit(request: NextRequest, requestId?: string): RateLimitResult {
  return checkDefaultRateLimit(request, requestId)
}

// Rate Limit 헤더 설정 유틸리티
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
  }

  if (result.retryAfter !== undefined) {
    headers['Retry-After'] = result.retryAfter.toString()
  }

  return headers
}

// 스마트 Rate Limiting (사용자 유형별 다른 제한)
export function smartRateLimit(
  request: NextRequest,
  requestId?: string
): RateLimitResult {
  const userId = extractUserIdFromRequest(request)

  // 인증된 사용자는 더 관대한 제한
  if (userId) {
    return checkRateLimit(
      request,
      {
        ...CONFIG.RATE_LIMITS.DEFAULT,
        max: CONFIG.RATE_LIMITS.DEFAULT.max * 2, // 2배 허용
        keyType: 'user',
      },
      requestId
    )
  }

  // 익명 사용자는 기본 제한
  return checkDefaultRateLimit(request, requestId)
}

// 동적 Rate Limiting (트래픽 패턴에 따른 조정)
export function adaptiveRateLimit(
  request: NextRequest,
  baseConfig: RateLimitConfig,
  requestId?: string
): RateLimitResult {
  // 현재 시간대별 트래픽 분석 (간단한 예시)
  const hour = new Date().getHours()
  let multiplier = 1

  // 피크 시간대 (오전 9시-12시, 오후 1시-6시)에는 제한 완화
  if ((hour >= 9 && hour <= 12) || (hour >= 13 && hour <= 18)) {
    multiplier = 1.5
  }
  // 심야 시간대 (오후 11시-오전 6시)에는 제한 강화
  else if (hour >= 23 || hour <= 6) {
    multiplier = 0.7
  }

  const adaptedConfig: RateLimitConfig = {
    ...baseConfig,
    max: Math.ceil(baseConfig.max * multiplier),
  }

  return checkRateLimit(request, adaptedConfig, requestId)
}

// Rate Limit 우회 체크 (화이트리스트)
export function shouldBypassRateLimit(request: NextRequest): boolean {
  // 관리자 API 키
  const adminApiKey = process.env.ADMIN_API_KEY
  if (adminApiKey && request.headers.get('X-API-Key') === adminApiKey) {
    return true
  }

  // 로컬호스트에서의 요청 (개발 환경)
  if (process.env.NODE_ENV === 'development') {
    const ip = getClientIp(request)
    if (ip === '127.0.0.1' || ip === '::1' || ip?.startsWith('192.168.')) {
      return true
    }
  }

  // 화이트리스트 IP (환경 변수에서)
  const whitelistIps = process.env.RATE_LIMIT_WHITELIST_IPS?.split(',') || []
  const clientIp = getClientIp(request)
  if (clientIp && whitelistIps.includes(clientIp)) {
    return true
  }

  return false
}

// 조건부 Rate Limiting
export function conditionalRateLimit(
  request: NextRequest,
  condition: (req: NextRequest) => boolean,
  config: RateLimitConfig,
  requestId?: string
): RateLimitResult | null {
  if (!condition(request)) {
    return null
  }

  return checkRateLimit(request, config, requestId)
}

// Rate Limit 통계 수집
interface RateLimitStats {
  totalRequests: number
  limitedRequests: number
  topLimitedKeys: Array<{ key: string; count: number }>
}

const rateLimitStats: RateLimitStats = {
  totalRequests: 0,
  limitedRequests: 0,
  topLimitedKeys: [],
}

export function updateRateLimitStats(
  key: string,
  wasLimited: boolean
): void {
  rateLimitStats.totalRequests++

  if (wasLimited) {
    rateLimitStats.limitedRequests++

    // 상위 제한된 키 업데이트 (간단한 구현)
    const existingEntry = rateLimitStats.topLimitedKeys.find(entry => entry.key === key)
    if (existingEntry) {
      existingEntry.count++
    } else {
      rateLimitStats.topLimitedKeys.push({ key, count: 1 })
    }

    // 상위 10개만 유지
    rateLimitStats.topLimitedKeys.sort((a, b) => b.count - a.count)
    rateLimitStats.topLimitedKeys = rateLimitStats.topLimitedKeys.slice(0, 10)
  }
}

export function getRateLimitStats(): RateLimitStats {
  return { ...rateLimitStats }
}

// 통합 Rate Limit 미들웨어 (여러 조건 확인)
export function comprehensiveRateLimit(
  request: NextRequest,
  endpoint: string,
  requestId?: string
): RateLimitResult {
  // 우회 조건 확인
  if (shouldBypassRateLimit(request)) {
    return {
      allowed: true,
      limit: Number.MAX_SAFE_INTEGER,
      remaining: Number.MAX_SAFE_INTEGER,
      resetTime: Date.now() + 3600000, // 1시간 후
    }
  }

  // 엔드포인트별 설정 적용
  let config: RateLimitConfig

  if (endpoint.includes('/auth/')) {
    config = CONFIG.RATE_LIMITS.AUTH
  } else if (endpoint.includes('/login')) {
    config = CONFIG.RATE_LIMITS.LOGIN
  } else if (endpoint.includes('/search')) {
    config = CONFIG.RATE_LIMITS.SEARCH
  } else if (endpoint.includes('/upload')) {
    config = CONFIG.RATE_LIMITS.UPLOAD
  } else if (endpoint.includes('/bff/')) {
    config = CONFIG.RATE_LIMITS.BFF
  } else {
    config = CONFIG.RATE_LIMITS.DEFAULT
  }

  // 적응형 Rate Limiting 적용
  const result = adaptiveRateLimit(request, config, requestId)

  // 통계 업데이트
  const key = generateRateLimitKey(request, config)
  updateRateLimitStats(key, !result.allowed)

  return result
}

// 정리 함수 (서버 종료 시 호출)
export function cleanupRateLimit(): void {
  rateLimitStore.destroy()
}