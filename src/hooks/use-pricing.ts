'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import useSWR from 'swr'
import { useDebounce } from '@/hooks/use-debounce'
import type {
  PriceCalculationRequest,
  PriceCalculationResponse,
  MaterialType
} from '@/types/pricing'

// 재료 타입 상수 배열 (변경되지 않으므로 hook 외부에 정의)
const MATERIAL_TYPES: MaterialType[] = ['wood', 'mdf', 'steel', 'metal', 'glass', 'fabric']

interface UsePricingOptions {
  debounceMs?: number
  cacheEnabled?: boolean
  estimateOnly?: boolean
  onPriceChange?: (newPrice: PriceCalculationResponse, oldPrice?: PriceCalculationResponse) => void
  onError?: (error: Error) => void
}

interface UsePricingResult {
  priceData: PriceCalculationResponse | null
  loading: boolean
  error: string | null
  calculatePrice: (request: PriceCalculationRequest) => Promise<void>
  clearError: () => void
  previousPrice: PriceCalculationResponse | null
  retryCount: number
  fallbackPrice: number | null
  isUsingFallback: boolean
  networkStatus: 'online' | 'offline' | 'unknown'
}

// API 호출 함수
const fetchPrice = async (request: PriceCalculationRequest): Promise<PriceCalculationResponse> => {
  const response = await fetch('/api/v1/pricing/calculate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || '가격 계산 중 오류가 발생했습니다')
  }

  const data = await response.json()
  return data.data.result // API 응답 구조에 맞게 조정
}

// SWR 키 생성 함수
const createCacheKey = (request: PriceCalculationRequest | null): string | null => {
  if (!request) return null
  return `price-${request.width_cm}-${request.depth_cm}-${request.height_cm}-${request.material}`
}

/**
 * 실시간 가격 계산 훅
 *
 * 특징:
 * - 500ms 디바운싱으로 연속 변경 최적화
 * - 메모리 캐시를 통한 중복 계산 방지
 * - 이전 가격과의 비교를 위한 상태 관리
 * - 에러 처리 및 로딩 상태 관리
 */
export const usePricing = (options: UsePricingOptions = {}): UsePricingResult => {
  const {
    debounceMs = 500,
    cacheEnabled = true,
    estimateOnly = false,
    onPriceChange,
    onError
  } = options

  const [currentRequest, setCurrentRequest] = useState<PriceCalculationRequest | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previousPrice, setPreviousPrice] = useState<PriceCalculationResponse | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [fallbackPrice, setFallbackPrice] = useState<number | null>(null)
  const [isUsingFallback, setIsUsingFallback] = useState(false)
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'unknown'>(
    typeof navigator !== 'undefined' ? (navigator.onLine ? 'online' : 'offline') : 'unknown'
  )

  // 네트워크 상태 모니터링
  useEffect(() => {
    const handleOnline = () => setNetworkStatus('online')
    const handleOffline = () => setNetworkStatus('offline')

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)

      return () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    }
  }, [])

  // 디바운싱된 요청
  const debouncedRequest = useDebounce(currentRequest, debounceMs)

  // SWR 캐시 키
  const cacheKey = cacheEnabled ? createCacheKey(debouncedRequest) : null

  // SWR을 사용한 캐싱 및 자동 재검증
  const { data: priceData, error: swrError, mutate } = useSWR(
    cacheKey,
    () => debouncedRequest ? fetchPrice({
      ...debouncedRequest,
      use_cache: cacheEnabled,
      estimate_only: estimateOnly
    }) : null,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      shouldRetryOnError: false,
      dedupingInterval: 10000, // 10초간 중복 요청 방지
    }
  )

  // 로컬 fallback 계산 제거: 서버 권위 경로 단일화
  // 더 이상 새 가격을 로컬에서 계산하지 않으며, 이전값 유지만 허용
  const calculateFallbackPrice = useCallback((/* request: PriceCalculationRequest */): number | null => {
    return previousPrice ? previousPrice.total : null
  }, [previousPrice])

  // 에러 처리 및 fallback
  useEffect(() => {
    if (swrError) {
      const errorMessage = swrError.message || '가격 계산 중 오류가 발생했습니다'
      setError(errorMessage)
      setRetryCount(prev => {
        const newCount = prev + 1

        // 연속 5회 실패 시 재시도 중단
        if (newCount >= 5) {
          console.error('Price calculation failed 5 times, stopping retries')
          return newCount
        }

        return newCount
      })

      // 재시도 제한에 도달하지 않은 경우에만 fallback 처리
      if (retryCount < 5) {
        // 네트워크 오류인 경우에도 이전 가격만 유지(신규 계산 금지)
        const fallback = calculateFallbackPrice()
        if (fallback != null) {
          setFallbackPrice(fallback)
          setIsUsingFallback(true)
        }
      }

      onError?.(swrError)
    } else {
      setError(null)
      setRetryCount(0)
      setIsUsingFallback(false)
    }
  }, [swrError, onError, debouncedRequest, networkStatus, previousPrice, calculateFallbackPrice, retryCount])

  // 로딩 상태 관리
  useEffect(() => {
    if (debouncedRequest && !priceData && !swrError) {
      setLoading(true)
    } else {
      setLoading(false)
    }
  }, [debouncedRequest, priceData, swrError])

  // onPriceChange는 ref로 안정화하여 렌더마다 참조가 바뀌어도 콜백이 재발화되지 않도록 함
  const onPriceChangeRef = useRef<typeof onPriceChange>(onPriceChange)
  useEffect(() => {
    onPriceChangeRef.current = onPriceChange
  }, [onPriceChange])

  // 가격 변경 콜백 (안정화 + 동일 가격이면 무시)
  useEffect(() => {
    if (!priceData) return

    const shouldNotify = !previousPrice || previousPrice.total !== priceData.total
    if (shouldNotify) {
      onPriceChangeRef.current?.(priceData, previousPrice || undefined)
      setPreviousPrice(priceData)
    }
    // previousPrice를 의존성에서 제외하여 루프 방지
  }, [priceData])

  // 가격 계산 함수
  const calculatePrice = useCallback(async (request: PriceCalculationRequest) => {
    try {
      setError(null)
      setCurrentRequest(request)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다'
      setError(errorMessage)
      onError?.(err instanceof Error ? err : new Error(errorMessage))
    }
  }, [onError])

  // 에러 클리어 함수
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    priceData: priceData || null,
    loading,
    error,
    calculatePrice,
    clearError,
    previousPrice,
    retryCount,
    fallbackPrice,
    isUsingFallback,
    networkStatus
  }
}

/**
 * 여러 재료에 대한 가격 비교 훅
 */
export const usePriceComparison = (dimensions: {
  width_cm: number
  depth_cm: number
  height_cm: number
} | null) => {
  const [comparisons, setComparisons] = useState<Record<MaterialType, PriceCalculationResponse | null>>({
    wood: null,
    mdf: null,
    steel: null,
    metal: null,
    glass: null,
    fabric: null
  })

  const [loading, setLoading] = useState(false)

  const fetchComparisons = useCallback(async () => {
    if (!dimensions) return

    setLoading(true)

    try {
      const requests = MATERIAL_TYPES.map(material => ({
        ...dimensions,
        material,
        use_cache: true,
        estimate_only: true
      }))

      const response = await fetch('/api/v1/pricing/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          calculations: requests,
          use_cache: true
        }),
      })

      if (!response.ok) {
        throw new Error('가격 비교 데이터를 가져올 수 없습니다')
      }

      const data = await response.json()
      const results = data.data.calculations

      const newComparisons: Record<MaterialType, PriceCalculationResponse | null> = {
        wood: null,
        mdf: null,
        steel: null,
        metal: null,
        glass: null,
        fabric: null
      }

      results.forEach((calc: any, index: number) => {
        const material = MATERIAL_TYPES[index]
        newComparisons[material] = calc.result
      })

      setComparisons(newComparisons)
    } catch (error) {
      console.error('Price comparison failed:', error)
    } finally {
      setLoading(false)
    }
  }, [dimensions])

  useEffect(() => {
    if (dimensions) {
      fetchComparisons()
    }
  }, [dimensions, fetchComparisons])

  return {
    comparisons,
    loading,
    refresh: fetchComparisons
  }
}

/**
 * 가격 이력 추적 훅
 */
export const usePriceHistory = () => {
  const [history, setHistory] = useState<PriceCalculationResponse[]>([])
  const maxHistorySize = 50

  const addToHistory = useCallback((priceData: PriceCalculationResponse) => {
    setHistory(prev => {
      const newHistory = [priceData, ...prev]
      return newHistory.slice(0, maxHistorySize)
    })
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
  }, [])

  const getLastPrice = useCallback(() => {
    return history[0] || null
  }, [history])

  const getPriceChange = useCallback(() => {
    if (history.length < 2) return null

    const current = history[0]
    const previous = history[1]

    const change = current.total - previous.total
    const percentage = (change / previous.total) * 100

    return {
      amount: Math.abs(change),
      percentage: Math.abs(percentage),
      type: change > 0 ? 'increase' as const : change < 0 ? 'decrease' as const : 'same' as const
    }
  }, [history])

  return {
    history,
    addToHistory,
    clearHistory,
    getLastPrice,
    getPriceChange
  }
}
