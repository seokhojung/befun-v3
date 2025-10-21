// API 성능 모니터링 시스템
import { logger } from './logger'
import { CONFIG } from '@/config/api'

// 성능 메트릭 타입
interface PerformanceMetric {
  name: string
  value: number
  unit: string
  timestamp: number
  tags?: Record<string, string>
}

// 응답 시간 메트릭
interface ResponseTimeMetric {
  endpoint: string
  method: string
  responseTime: number
  statusCode: number
  timestamp: number
  userId?: string
}

// 처리량 메트릭
interface ThroughputMetric {
  endpoint: string
  requestCount: number
  timeWindow: number // seconds
  timestamp: number
}

// 에러율 메트릭
interface ErrorRateMetric {
  endpoint: string
  totalRequests: number
  errorRequests: number
  errorRate: number
  timeWindow: number
  timestamp: number
}

// 성능 통계
interface PerformanceStats {
  responseTime: {
    p50: number
    p95: number
    p99: number
    avg: number
    min: number
    max: number
  }
  throughput: {
    requestsPerSecond: number
    requestsPerMinute: number
  }
  errorRate: {
    rate: number
    count: number
  }
  resources: {
    memoryUsage: number
    cpuUsage?: number
  }
}

// 성능 모니터링 클래스
class PerformanceMonitor {
  private responseTimeMetrics: ResponseTimeMetric[] = []
  private throughputMetrics: ThroughputMetric[] = []
  private errorRateMetrics: ErrorRateMetric[] = []
  private customMetrics: PerformanceMetric[] = []

  private readonly maxMetricsHistory = 10000 // 최대 메트릭 히스토리
  private readonly cleanupIntervalMs = 60 * 60 * 1000 // 1시간
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // 주기적으로 오래된 메트릭 정리
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, this.cleanupIntervalMs)
  }

  // 응답 시간 기록
  recordResponseTime(metric: ResponseTimeMetric): void {
    this.responseTimeMetrics.push(metric)

    // 배열 크기 제한
    if (this.responseTimeMetrics.length > this.maxMetricsHistory) {
      this.responseTimeMetrics.shift()
    }

    // 경고 임계값 확인
    if (metric.responseTime > CONFIG.MONITORING.PERFORMANCE_THRESHOLDS.RESPONSE_TIME_WARNING) {
      logger.warn('Slow response time detected', metric.endpoint, {
        responseTime: metric.responseTime,
        endpoint: metric.endpoint,
        method: metric.method,
        statusCode: metric.statusCode,
        threshold: CONFIG.MONITORING.PERFORMANCE_THRESHOLDS.RESPONSE_TIME_WARNING,
      })
    }

    if (metric.responseTime > CONFIG.MONITORING.PERFORMANCE_THRESHOLDS.RESPONSE_TIME_ERROR) {
      logger.error('Very slow response time detected', metric.endpoint, {
        responseTime: metric.responseTime,
        endpoint: metric.endpoint,
        method: metric.method,
        statusCode: metric.statusCode,
        threshold: CONFIG.MONITORING.PERFORMANCE_THRESHOLDS.RESPONSE_TIME_ERROR,
      })
    }
  }

  // 처리량 기록
  recordThroughput(metric: ThroughputMetric): void {
    this.throughputMetrics.push(metric)

    if (this.throughputMetrics.length > this.maxMetricsHistory) {
      this.throughputMetrics.shift()
    }
  }

  // 에러율 기록
  recordErrorRate(metric: ErrorRateMetric): void {
    this.errorRateMetrics.push(metric)

    if (this.errorRateMetrics.length > this.maxMetricsHistory) {
      this.errorRateMetrics.shift()
    }

    // 에러율 임계값 확인
    if (metric.errorRate > CONFIG.MONITORING.PERFORMANCE_THRESHOLDS.ERROR_RATE_WARNING) {
      logger.warn('High error rate detected', metric.endpoint, {
        errorRate: metric.errorRate,
        endpoint: metric.endpoint,
        totalRequests: metric.totalRequests,
        errorRequests: metric.errorRequests,
        threshold: CONFIG.MONITORING.PERFORMANCE_THRESHOLDS.ERROR_RATE_WARNING,
      })
    }

    if (metric.errorRate > CONFIG.MONITORING.PERFORMANCE_THRESHOLDS.ERROR_RATE_ERROR) {
      logger.error('Very high error rate detected', metric.endpoint, {
        errorRate: metric.errorRate,
        endpoint: metric.endpoint,
        totalRequests: metric.totalRequests,
        errorRequests: metric.errorRequests,
        threshold: CONFIG.MONITORING.PERFORMANCE_THRESHOLDS.ERROR_RATE_ERROR,
      })
    }
  }

  // 커스텀 메트릭 기록
  recordCustomMetric(metric: PerformanceMetric): void {
    this.customMetrics.push(metric)

    if (this.customMetrics.length > this.maxMetricsHistory) {
      this.customMetrics.shift()
    }
  }

  // 백분위수 계산
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0

    const sorted = values.sort((a, b) => a - b)
    const index = Math.ceil((percentile / 100) * sorted.length) - 1
    return sorted[Math.max(0, index)]
  }

  // 성능 통계 계산
  getPerformanceStats(timeWindowMinutes = 60): PerformanceStats {
    const now = Date.now()
    const timeWindow = timeWindowMinutes * 60 * 1000

    // 시간 범위 내 메트릭 필터링
    const recentResponseTimes = this.responseTimeMetrics
      .filter(m => now - m.timestamp <= timeWindow)
      .map(m => m.responseTime)

    const recentRequests = this.responseTimeMetrics
      .filter(m => now - m.timestamp <= timeWindow)

    const recentErrors = recentRequests
      .filter(m => m.statusCode >= 400)

    // 응답 시간 통계
    const responseTime = {
      p50: this.calculatePercentile(recentResponseTimes, 50),
      p95: this.calculatePercentile(recentResponseTimes, 95),
      p99: this.calculatePercentile(recentResponseTimes, 99),
      avg: recentResponseTimes.length > 0
        ? recentResponseTimes.reduce((sum, time) => sum + time, 0) / recentResponseTimes.length
        : 0,
      min: recentResponseTimes.length > 0 ? Math.min(...recentResponseTimes) : 0,
      max: recentResponseTimes.length > 0 ? Math.max(...recentResponseTimes) : 0,
    }

    // 처리량 통계
    const throughput = {
      requestsPerSecond: recentRequests.length / (timeWindowMinutes * 60),
      requestsPerMinute: recentRequests.length / timeWindowMinutes,
    }

    // 에러율 통계
    const errorRate = {
      rate: recentRequests.length > 0 ? recentErrors.length / recentRequests.length : 0,
      count: recentErrors.length,
    }

    // 리소스 사용량
    const memoryUsage = this.getMemoryUsage()

    return {
      responseTime,
      throughput,
      errorRate,
      resources: {
        memoryUsage,
      },
    }
  }

  // 엔드포인트별 통계
  getEndpointStats(endpoint: string, timeWindowMinutes = 60): PerformanceStats {
    const now = Date.now()
    const timeWindow = timeWindowMinutes * 60 * 1000

    const endpointMetrics = this.responseTimeMetrics
      .filter(m => m.endpoint === endpoint && now - m.timestamp <= timeWindow)

    const responseTimes = endpointMetrics.map(m => m.responseTime)
    const errors = endpointMetrics.filter(m => m.statusCode >= 400)

    return {
      responseTime: {
        p50: this.calculatePercentile(responseTimes, 50),
        p95: this.calculatePercentile(responseTimes, 95),
        p99: this.calculatePercentile(responseTimes, 99),
        avg: responseTimes.length > 0
          ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
          : 0,
        min: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
        max: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      },
      throughput: {
        requestsPerSecond: endpointMetrics.length / (timeWindowMinutes * 60),
        requestsPerMinute: endpointMetrics.length / timeWindowMinutes,
      },
      errorRate: {
        rate: endpointMetrics.length > 0 ? errors.length / endpointMetrics.length : 0,
        count: errors.length,
      },
      resources: {
        memoryUsage: this.getMemoryUsage(),
      },
    }
  }

  // 메모리 사용량 조회
  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage()
      return Math.round(usage.heapUsed / 1024 / 1024) // MB
    }
    return 0
  }

  // 상위 느린 엔드포인트
  getSlowEndpoints(limit = 10, timeWindowMinutes = 60): Array<{
    endpoint: string
    avgResponseTime: number
    requestCount: number
    p95ResponseTime: number
  }> {
    const now = Date.now()
    const timeWindow = timeWindowMinutes * 60 * 1000

    const endpointGroups = new Map<string, ResponseTimeMetric[]>()

    // 엔드포인트별 그룹화
    this.responseTimeMetrics
      .filter(m => now - m.timestamp <= timeWindow)
      .forEach(metric => {
        const key = `${metric.method} ${metric.endpoint}`
        if (!endpointGroups.has(key)) {
          endpointGroups.set(key, [])
        }
        endpointGroups.get(key)!.push(metric)
      })

    // 평균 응답시간 계산 및 정렬
    return Array.from(endpointGroups.entries())
      .map(([endpoint, metrics]) => ({
        endpoint,
        avgResponseTime: metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length,
        requestCount: metrics.length,
        p95ResponseTime: this.calculatePercentile(metrics.map(m => m.responseTime), 95),
      }))
      .sort((a, b) => b.avgResponseTime - a.avgResponseTime)
      .slice(0, limit)
  }

  // 에러가 많은 엔드포인트
  getErrorProneEndpoints(limit = 10, timeWindowMinutes = 60): Array<{
    endpoint: string
    errorRate: number
    totalRequests: number
    errorCount: number
  }> {
    const now = Date.now()
    const timeWindow = timeWindowMinutes * 60 * 1000

    const endpointGroups = new Map<string, ResponseTimeMetric[]>()

    // 엔드포인트별 그룹화
    this.responseTimeMetrics
      .filter(m => now - m.timestamp <= timeWindow)
      .forEach(metric => {
        const key = `${metric.method} ${metric.endpoint}`
        if (!endpointGroups.has(key)) {
          endpointGroups.set(key, [])
        }
        endpointGroups.get(key)!.push(metric)
      })

    // 에러율 계산 및 정렬
    return Array.from(endpointGroups.entries())
      .map(([endpoint, metrics]) => {
        const errorCount = metrics.filter(m => m.statusCode >= 400).length
        return {
          endpoint,
          errorRate: errorCount / metrics.length,
          totalRequests: metrics.length,
          errorCount,
        }
      })
      .filter(item => item.totalRequests >= 10) // 최소 요청 수 필터
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, limit)
  }

  // 실시간 메트릭 (최근 5분)
  getRealTimeMetrics(): {
    currentRPS: number
    avgResponseTime: number
    currentErrorRate: number
    activeEndpoints: number
  } {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
    const recentMetrics = this.responseTimeMetrics
      .filter(m => m.timestamp >= fiveMinutesAgo)

    const errors = recentMetrics.filter(m => m.statusCode >= 400)
    const uniqueEndpoints = new Set(recentMetrics.map(m => `${m.method} ${m.endpoint}`))

    return {
      currentRPS: recentMetrics.length / 300, // 5분 = 300초
      avgResponseTime: recentMetrics.length > 0
        ? recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length
        : 0,
      currentErrorRate: recentMetrics.length > 0 ? errors.length / recentMetrics.length : 0,
      activeEndpoints: uniqueEndpoints.size,
    }
  }

  // 오래된 메트릭 정리
  private cleanup(): void {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000 // 24시간

    const originalSize = this.responseTimeMetrics.length
    this.responseTimeMetrics = this.responseTimeMetrics.filter(m => m.timestamp >= cutoff)
    this.throughputMetrics = this.throughputMetrics.filter(m => m.timestamp >= cutoff)
    this.errorRateMetrics = this.errorRateMetrics.filter(m => m.timestamp >= cutoff)
    this.customMetrics = this.customMetrics.filter(m => m.timestamp >= cutoff)

    const cleanedSize = originalSize - this.responseTimeMetrics.length

    if (cleanedSize > 0) {
      logger.debug('Performance metrics cleaned up', 'performance-cleanup', {
        cleanedMetrics: cleanedSize,
        remainingMetrics: this.responseTimeMetrics.length,
      })
    }
  }

  // 정리
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }

    this.responseTimeMetrics = []
    this.throughputMetrics = []
    this.errorRateMetrics = []
    this.customMetrics = []
  }
}

// 전역 성능 모니터 인스턴스
const performanceMonitor = new PerformanceMonitor()

// 성능 측정 래퍼 함수
export async function measurePerformance<T>(
  operation: () => Promise<T>,
  operationName: string,
  tags?: Record<string, string>
): Promise<T> {
  const startTime = Date.now()

  try {
    const result = await operation()
    const duration = Date.now() - startTime

    performanceMonitor.recordCustomMetric({
      name: operationName,
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      tags,
    })

    logger.debug('Operation completed', operationName, {
      duration,
      ...tags,
    })

    return result
  } catch (error) {
    const duration = Date.now() - startTime

    performanceMonitor.recordCustomMetric({
      name: `${operationName}_error`,
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      tags: { ...tags, error: 'true' },
    })

    logger.error('Operation failed', operationName, {
      duration,
      error,
      ...tags,
    })

    throw error
  }
}

// API 응답 시간 기록
export function recordApiResponseTime(
  endpoint: string,
  method: string,
  responseTime: number,
  statusCode: number,
  userId?: string
): void {
  performanceMonitor.recordResponseTime({
    endpoint,
    method,
    responseTime,
    statusCode,
    timestamp: Date.now(),
    userId,
  })
}

// 처리량 기록
export function recordThroughput(
  endpoint: string,
  requestCount: number,
  timeWindow: number
): void {
  performanceMonitor.recordThroughput({
    endpoint,
    requestCount,
    timeWindow,
    timestamp: Date.now(),
  })
}

// 에러율 기록
export function recordErrorRate(
  endpoint: string,
  totalRequests: number,
  errorRequests: number,
  timeWindow: number
): void {
  performanceMonitor.recordErrorRate({
    endpoint,
    totalRequests,
    errorRequests,
    errorRate: totalRequests > 0 ? errorRequests / totalRequests : 0,
    timeWindow,
    timestamp: Date.now(),
  })
}

// 성능 통계 조회
export const performanceAnalytics = {
  getStats: (timeWindowMinutes?: number) => performanceMonitor.getPerformanceStats(timeWindowMinutes),
  getEndpointStats: (endpoint: string, timeWindowMinutes?: number) =>
    performanceMonitor.getEndpointStats(endpoint, timeWindowMinutes),
  getSlowEndpoints: (limit?: number, timeWindowMinutes?: number) =>
    performanceMonitor.getSlowEndpoints(limit, timeWindowMinutes),
  getErrorProneEndpoints: (limit?: number, timeWindowMinutes?: number) =>
    performanceMonitor.getErrorProneEndpoints(limit, timeWindowMinutes),
  getRealTimeMetrics: () => performanceMonitor.getRealTimeMetrics(),
}

// 성능 알람
export interface PerformanceAlert {
  type: 'slow_response' | 'high_error_rate' | 'high_throughput' | 'memory_usage'
  severity: 'warning' | 'error' | 'critical'
  message: string
  details: Record<string, any>
  timestamp: number
}

class PerformanceAlerting {
  private alerts: PerformanceAlert[] = []
  private alertCallbacks: Array<(alert: PerformanceAlert) => void> = []

  // 알람 콜백 등록
  onAlert(callback: (alert: PerformanceAlert) => void): void {
    this.alertCallbacks.push(callback)
  }

  // 알람 발생
  triggerAlert(alert: Omit<PerformanceAlert, 'timestamp'>): void {
    const fullAlert: PerformanceAlert = {
      ...alert,
      timestamp: Date.now(),
    }

    this.alerts.push(fullAlert)

    // 최대 1000개 알람 유지
    if (this.alerts.length > 1000) {
      this.alerts.shift()
    }

    // 콜백 실행
    this.alertCallbacks.forEach(callback => {
      try {
        callback(fullAlert)
      } catch (error) {
        logger.error('Performance alert callback failed', 'performance-alert', { error })
      }
    })

    // 로그 기록
    logger.warn('Performance alert triggered', 'performance-alert', {
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      details: alert.details,
    })
  }

  // 최근 알람 조회
  getRecentAlerts(limit = 50): PerformanceAlert[] {
    return this.alerts
      .slice(-limit)
      .sort((a, b) => b.timestamp - a.timestamp)
  }
}

export const performanceAlerting = new PerformanceAlerting()

// 정리 함수
export function cleanupPerformanceMonitoring(): void {
  performanceMonitor.destroy()
}
