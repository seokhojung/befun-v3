// API 캐싱 시스템
import type { CacheConfig } from '@/types/api'
import { CONFIG } from '@/config/api'
import { logger } from './logger'

// 캐시 엔트리 인터페이스
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  tags: string[]
  accessCount: number
  lastAccessed: number
}

// 캐시 통계
interface CacheStats {
  hits: number
  misses: number
  sets: number
  deletes: number
  size: number
  hitRate: number
}

// 메모리 기반 캐시 구현
class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>()
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    size: 0,
    hitRate: 0,
  }
  private cleanupInterval: NodeJS.Timer | null = null
  private maxSize: number = 10000 // 최대 캐시 항목 수
  private cleanupIntervalMs: number = 5 * 60 * 1000 // 5분

  constructor(options: { maxSize?: number; cleanupIntervalMs?: number } = {}) {
    this.maxSize = options.maxSize || 10000
    this.cleanupIntervalMs = options.cleanupIntervalMs || 5 * 60 * 1000

    // 주기적 정리 작업
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, this.cleanupIntervalMs)
  }

  // 키 생성
  private generateKey(keyPrefix: string, key: string): string {
    return keyPrefix ? `${keyPrefix}:${key}` : key
  }

  // 만료 확인
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl * 1000
  }

  // 캐시 조회
  get<T>(key: string, config?: CacheConfig): T | null {
    const fullKey = this.generateKey(config?.keyPrefix || '', key)
    const entry = this.cache.get(fullKey)

    if (!entry) {
      this.stats.misses++
      this.updateHitRate()
      return null
    }

    if (this.isExpired(entry)) {
      this.cache.delete(fullKey)
      this.stats.misses++
      this.stats.deletes++
      this.updateHitRate()
      return null
    }

    // 접근 정보 업데이트
    entry.accessCount++
    entry.lastAccessed = Date.now()

    this.stats.hits++
    this.updateHitRate()

    return entry.data as T
  }

  // 캐시 저장
  set<T>(key: string, data: T, config: CacheConfig): void {
    const fullKey = this.generateKey(config.keyPrefix || '', key)

    // 캐시 크기 제한 확인
    if (this.cache.size >= this.maxSize && !this.cache.has(fullKey)) {
      this.evictLRU()
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: config.ttl,
      tags: config.tags || [],
      accessCount: 0,
      lastAccessed: Date.now(),
    }

    this.cache.set(fullKey, entry)
    this.stats.sets++
    this.stats.size = this.cache.size
  }

  // 캐시 삭제
  delete(key: string, config?: CacheConfig): boolean {
    const fullKey = this.generateKey(config?.keyPrefix || '', key)
    const result = this.cache.delete(fullKey)

    if (result) {
      this.stats.deletes++
      this.stats.size = this.cache.size
    }

    return result
  }

  // 태그별 삭제
  deleteByTags(tags: string[]): number {
    let deletedCount = 0

    for (const [key, entry] of this.cache.entries()) {
      const hasMatchingTag = tags.some(tag => entry.tags.includes(tag))
      if (hasMatchingTag) {
        this.cache.delete(key)
        deletedCount++
      }
    }

    this.stats.deletes += deletedCount
    this.stats.size = this.cache.size

    return deletedCount
  }

  // 패턴별 삭제
  deleteByPattern(pattern: RegExp): number {
    let deletedCount = 0

    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key)
        deletedCount++
      }
    }

    this.stats.deletes += deletedCount
    this.stats.size = this.cache.size

    return deletedCount
  }

  // 전체 캐시 클리어
  clear(): void {
    const previousSize = this.cache.size
    this.cache.clear()
    this.stats.deletes += previousSize
    this.stats.size = 0
  }

  // LRU 정책으로 항목 제거
  private evictLRU(): void {
    let oldestKey: string | null = null
    let oldestTime = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
      this.stats.deletes++
    }
  }

  // 만료된 항목 정리
  private cleanup(): void {
    const now = Date.now()
    let cleanedCount = 0

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      this.stats.deletes += cleanedCount
      this.stats.size = this.cache.size

      logger.debug('Cache cleanup completed', 'cache-cleanup', {
        cleanedCount,
        remainingSize: this.stats.size,
      })
    }
  }

  // 히트율 업데이트
  private updateHitRate(): void {
    const totalRequests = this.stats.hits + this.stats.misses
    this.stats.hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0
  }

  // 통계 조회
  getStats(): CacheStats {
    return { ...this.stats }
  }

  // 캐시 정보 조회
  getInfo(): {
    size: number
    maxSize: number
    memoryUsage: string
    topKeys: Array<{ key: string; accessCount: number; lastAccessed: string }>
  } {
    const topKeys = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => b.accessCount - a.accessCount)
      .slice(0, 10)
      .map(([key, entry]) => ({
        key,
        accessCount: entry.accessCount,
        lastAccessed: new Date(entry.lastAccessed).toISOString(),
      }))

    // 메모리 사용량 추정 (대략적)
    const memoryUsage = `~${Math.round(
      JSON.stringify(Array.from(this.cache.entries())).length / 1024
    )}KB`

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      memoryUsage,
      topKeys,
    }
  }

  // 정리
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.cache.clear()
  }
}

// 전역 캐시 인스턴스
const globalCache = new MemoryCache({
  maxSize: 10000,
  cleanupIntervalMs: 5 * 60 * 1000,
})

// 캐시 래퍼 함수들
export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  config: CacheConfig
): Promise<T> {
  // 캐시에서 조회 시도
  const cached = globalCache.get<T>(key, config)
  if (cached !== null) {
    return cached
  }

  // 캐시 미스 - 데이터 페치
  try {
    const data = await fetcher()
    globalCache.set(key, data, config)
    return data
  } catch (error) {
    // 에러 발생 시 캐시하지 않음
    throw error
  }
}

// 동기 캐시 함수
export function cachedSync<T>(
  key: string,
  fetcher: () => T,
  config: CacheConfig
): T {
  // 캐시에서 조회 시도
  const cached = globalCache.get<T>(key, config)
  if (cached !== null) {
    return cached
  }

  // 캐시 미스 - 데이터 페치
  const data = fetcher()
  globalCache.set(key, data, config)
  return data
}

// 메모이제이션 데코레이터
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  config: CacheConfig & { keyGenerator?: (...args: Parameters<T>) => string }
): T {
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = config.keyGenerator
      ? config.keyGenerator(...args)
      : `memoize:${fn.name}:${JSON.stringify(args)}`

    return cachedSync(
      key,
      () => fn(...args),
      config
    )
  }) as T
}

// 비동기 메모이제이션
export function memoizeAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  config: CacheConfig & { keyGenerator?: (...args: Parameters<T>) => string }
): T {
  return (async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    const key = config.keyGenerator
      ? config.keyGenerator(...args)
      : `memoize:${fn.name}:${JSON.stringify(args)}`

    return cached(
      key,
      () => fn(...args),
      config
    )
  }) as T
}

// 조건부 캐싱
export async function cachedIf<T>(
  key: string,
  fetcher: () => Promise<T>,
  config: CacheConfig,
  condition: (data: T) => boolean
): Promise<T> {
  const cached = globalCache.get<T>(key, config)
  if (cached !== null) {
    return cached
  }

  const data = await fetcher()

  if (condition(data)) {
    globalCache.set(key, data, config)
  }

  return data
}

// 캐시 무효화
export function invalidateCache(
  pattern?: {
    key?: string
    prefix?: string
    tags?: string[]
    pattern?: RegExp
  }
): number {
  if (!pattern) {
    globalCache.clear()
    return 0
  }

  let deletedCount = 0

  if (pattern.key && pattern.prefix) {
    const deleted = globalCache.delete(pattern.key, { keyPrefix: pattern.prefix } as CacheConfig)
    deletedCount += deleted ? 1 : 0
  }

  if (pattern.tags) {
    deletedCount += globalCache.deleteByTags(pattern.tags)
  }

  if (pattern.pattern) {
    deletedCount += globalCache.deleteByPattern(pattern.pattern)
  }

  return deletedCount
}

// 사전 정의된 캐시 설정으로 캐싱하는 편의 함수들
export const cacheStrategies = {
  // 정적 데이터 캐싱 (24시간)
  static: async <T>(key: string, fetcher: () => Promise<T>): Promise<T> =>
    cached(key, fetcher, CONFIG.CACHE.STATIC),

  // 사용자 데이터 캐싱 (30분)
  user: async <T>(key: string, fetcher: () => Promise<T>): Promise<T> =>
    cached(key, fetcher, CONFIG.CACHE.USER),

  // 디자인 데이터 캐싱 (1시간)
  design: async <T>(key: string, fetcher: () => Promise<T>): Promise<T> =>
    cached(key, fetcher, CONFIG.CACHE.DESIGN),

  // 가격 계산 캐싱 (15분)
  pricing: async <T>(key: string, fetcher: () => Promise<T>): Promise<T> =>
    cached(key, fetcher, CONFIG.CACHE.PRICING),

  // BFF 집계 데이터 캐싱 (5분)
  bff: async <T>(key: string, fetcher: () => Promise<T>): Promise<T> =>
    cached(key, fetcher, CONFIG.CACHE.BFF_AGGREGATED),

  // 세션 데이터 캐싱 (1시간)
  session: async <T>(key: string, fetcher: () => Promise<T>): Promise<T> =>
    cached(key, fetcher, CONFIG.CACHE.SESSION),
}

// 캐시 통계 및 관리
export const cacheManager = {
  getStats: () => globalCache.getStats(),
  getInfo: () => globalCache.getInfo(),
  clear: () => globalCache.clear(),
  invalidate: invalidateCache,

  // 태그별 무효화
  invalidateByTags: (tags: string[]) => globalCache.deleteByTags(tags),

  // 패턴별 무효화
  invalidateByPattern: (pattern: RegExp) => globalCache.deleteByPattern(pattern),

  // 사용자별 캐시 무효화
  invalidateUser: (userId: string) => {
    return globalCache.deleteByPattern(new RegExp(`user:${userId}:`))
  },

  // 디자인별 캐시 무효화
  invalidateDesign: (designId: string) => {
    return globalCache.deleteByTags([`design-${designId}`])
  },
}

// 정리 함수 (서버 종료 시)
export function cleanupCache(): void {
  globalCache.destroy()
}

// 캐시 워밍 (자주 사용되는 데이터 미리 로드)
export async function warmupCache(): Promise<void> {
  try {
    logger.info('Starting cache warmup', 'cache-warmup')

    // 예시: 재료 목록 캐싱
    await cacheStrategies.static('materials:list', async () => {
      // 실제로는 DB에서 재료 목록 조회
      return [
        { id: 'wood', name: '목재', price: 1.0 },
        { id: 'metal', name: '금속', price: 1.5 },
        { id: 'glass', name: '유리', price: 2.0 },
        { id: 'fabric', name: '패브릭', price: 0.8 },
      ]
    })

    // 예시: 가격 기준 캐싱
    await cacheStrategies.static('pricing:base-rates', async () => {
      return {
        base_price: 50000,
        size_multiplier: 1000,
        material_multipliers: {
          wood: 1.0,
          metal: 1.5,
          glass: 2.0,
          fabric: 0.8,
        },
      }
    })

    logger.info('Cache warmup completed', 'cache-warmup', {
      cacheSize: globalCache.getStats().size,
    })

  } catch (error) {
    logger.error('Cache warmup failed', 'cache-warmup', { error })
  }
}