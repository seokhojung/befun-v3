'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSWR } from 'swr'
import { useDebounce } from '@/hooks/use-debounce'
import type {
  PriceCalculationRequest,
  PriceCalculationResponse,
  MaterialType
} from '@/types/pricing'

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

  // 로컬 fallback 가격 계산 함수
  const calculateFallbackPrice = useCallback((request: PriceCalculationRequest): number => {
    const { width_cm, depth_cm, height_cm, material } = request

    // 기본 계산 공식 (서버와 동일한 로직)
    const volume_m3 = (width_cm * depth_cm * height_cm) / 1000000

    const MATERIAL_DEFAULTS = {
      wood: { basePrice: 50000, modifier: 1.0 },
      mdf: { basePrice: 50000, modifier: 0.8 },
      steel: { basePrice: 50000, modifier: 1.15 },
      metal: { basePrice: 50000, modifier: 1.5 },
      glass: { basePrice: 50000, modifier: 2.0 },
      fabric: { basePrice: 50000, modifier: 0.8 },
    }

    const FIXED_COSTS = {
      BASE_MANUFACTURING: 50000,
      SHIPPING: 30000,
      TAX_RATE: 0.1
    }

    const materialConfig = MATERIAL_DEFAULTS[material]
    const materialCost = Math.round(volume_m3 * materialConfig.basePrice * materialConfig.modifier)
    const subtotal = materialCost + FIXED_COSTS.BASE_MANUFACTURING + FIXED_COSTS.SHIPPING
    const tax = Math.round(subtotal * FIXED_COSTS.TAX_RATE)

    return subtotal + tax
  }, [])

  // 에러 처리 및 fallback
  useEffect(() => {
    if (swrError) {
      const errorMessage = swrError.message || '가격 계산 중 오류가 발생했습니다'
      setError(errorMessage)
      setRetryCount(prev => prev + 1)

      // 네트워크 오류인 경우 fallback 가격 계산
      if (debouncedRequest && (errorMessage.includes('fetch') || networkStatus === 'offline')) {
        const fallback = calculateFallbackPrice(debouncedRequest)
        setFallbackPrice(fallback)
        setIsUsingFallback(true)
      } else if (previousPrice) {
        // 네트워크 오류가 아닌 경우 이전 가격 유지
        setFallbackPrice(previousPrice.total)
        setIsUsingFallback(true)
      }

      onError?.(swrError)
    } else {
      setError(null)
      setRetryCount(0)
      setIsUsingFallback(false)
    }
  }, [swrError, onError, debouncedRequest, networkStatus, previousPrice, calculateFallbackPrice])

  // 로딩 상태 관리
  useEffect(() => {
    if (debouncedRequest && !priceData && !swrError) {
      setLoading(true)
    } else {
      setLoading(false)
    }
  }, [debouncedRequest, priceData, swrError])

  // 가격 변경 콜백
  useEffect(() => {
    if (priceData && onPriceChange) {
      onPriceChange(priceData, previousPrice)
      setPreviousPrice(priceData)
    }
  }, [priceData, onPriceChange, previousPrice])

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

  const materials: MaterialType[] = ['wood', 'mdf', 'steel', 'metal', 'glass', 'fabric']

  const fetchComparisons = useCallback(async () => {
    if (!dimensions) return

    setLoading(true)

    try {
      const requests = materials.map(material => ({
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
        const material = materials[index]
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