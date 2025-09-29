'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertTriangle,
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  Shield,
  Info
} from 'lucide-react'

interface PriceErrorProps {
  error: string | null
  onRetry?: () => void
  onDismiss?: () => void
  fallbackPrice?: number | null
  showFallback?: boolean
  retryCount?: number
  maxRetries?: number
}

interface NetworkStatusProps {
  isOnline: boolean
  onStatusChange?: (isOnline: boolean) => void
}

// 네트워크 상태 모니터링 컴포넌트
const NetworkStatus: React.FC<NetworkStatusProps> = ({ isOnline, onStatusChange }) => {
  const [isVisible, setIsVisible] = useState(!isOnline)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isOnline) {
        setIsVisible(false)
      }
    }, 3000) // 3초 후 온라인 알림 숨김

    return () => clearTimeout(timer)
  }, [isOnline])

  useEffect(() => {
    if (!isOnline) {
      setIsVisible(true)
    }
  }, [isOnline])

  useEffect(() => {
    onStatusChange?.(isOnline)
  }, [isOnline, onStatusChange])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
            isOnline
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {isOnline ? (
            <Wifi className="w-4 h-4" />
          ) : (
            <WifiOff className="w-4 h-4" />
          )}
          <span>
            {isOnline ? '연결이 복구되었습니다' : '네트워크 연결을 확인해주세요'}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// 대체 가격 표시 컴포넌트
const FallbackPrice: React.FC<{ price: number; showEstimate?: boolean }> = ({
  price,
  showEstimate = true
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-amber-50 border border-amber-200 rounded-lg p-4"
    >
      <div className="flex items-start gap-3">
        <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-amber-800 mb-1">
            {showEstimate ? '추정 가격' : '이전 가격'}
          </h4>
          <p className="text-2xl font-bold text-amber-900">
            {new Intl.NumberFormat('ko-KR', {
              style: 'currency',
              currency: 'KRW',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(price)}
          </p>
          <p className="text-xs text-amber-700 mt-1">
            {showEstimate
              ? '네트워크 오류로 인해 로컬에서 계산된 추정 가격입니다'
              : '이전에 계산된 가격을 표시하고 있습니다'
            }
          </p>
        </div>
      </div>
    </motion.div>
  )
}

// 에러 타입별 메시지 및 액션
const getErrorInfo = (error: string) => {
  const errorLower = error.toLowerCase()

  if (errorLower.includes('network') || errorLower.includes('fetch')) {
    return {
      type: 'network' as const,
      title: '네트워크 연결 오류',
      message: '인터넷 연결을 확인하고 다시 시도해주세요.',
      icon: WifiOff,
      severity: 'warning' as const,
      retryable: true
    }
  }

  if (errorLower.includes('rate limit') || errorLower.includes('too many')) {
    return {
      type: 'rate_limit' as const,
      title: '요청 한도 초과',
      message: '잠시 후 다시 시도해주세요.',
      icon: Shield,
      severity: 'warning' as const,
      retryable: true
    }
  }

  if (errorLower.includes('invalid') || errorLower.includes('validation')) {
    return {
      type: 'validation' as const,
      title: '입력값 오류',
      message: '치수나 재료 선택을 확인해주세요.',
      icon: AlertTriangle,
      severity: 'error' as const,
      retryable: false
    }
  }

  if (errorLower.includes('server') || errorLower.includes('500')) {
    return {
      type: 'server' as const,
      title: '서버 오류',
      message: '일시적인 서버 문제입니다. 잠시 후 다시 시도해주세요.',
      icon: AlertTriangle,
      severity: 'error' as const,
      retryable: true
    }
  }

  return {
    type: 'unknown' as const,
    title: '알 수 없는 오류',
    message: error || '가격 계산 중 오류가 발생했습니다.',
    icon: Info,
    severity: 'error' as const,
    retryable: true
  }
}

// 메인 가격 에러 컴포넌트
export const PriceErrorBoundary: React.FC<PriceErrorProps> = ({
  error,
  onRetry,
  onDismiss,
  fallbackPrice,
  showFallback = true,
  retryCount = 0,
  maxRetries = 3
}) => {
  const [isOnline, setIsOnline] = useState(navigator?.onLine ?? true)
  const [isRetrying, setIsRetrying] = useState(false)

  // 네트워크 상태 모니터링
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const errorInfo = error ? getErrorInfo(error) : null

  const handleRetry = async () => {
    if (!onRetry || isRetrying) return

    setIsRetrying(true)
    try {
      await onRetry()
    } finally {
      setIsRetrying(false)
    }
  }

  const canRetry = errorInfo?.retryable && retryCount < maxRetries && isOnline

  if (!error) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-3"
    >
      {/* 네트워크 상태 */}
      <NetworkStatus isOnline={isOnline} />

      {/* 에러 메시지 */}
      <Alert className={`${
        errorInfo?.severity === 'error'
          ? 'border-red-200 bg-red-50'
          : 'border-amber-200 bg-amber-50'
      }`}>
        <div className="flex items-start gap-3">
          {errorInfo?.icon && (
            <errorInfo.icon className={`w-5 h-5 mt-0.5 ${
              errorInfo.severity === 'error' ? 'text-red-600' : 'text-amber-600'
            }`} />
          )}
          <div className="flex-1 min-w-0">
            <h4 className={`font-medium mb-1 ${
              errorInfo?.severity === 'error' ? 'text-red-800' : 'text-amber-800'
            }`}>
              {errorInfo?.title}
            </h4>
            <AlertDescription className={
              errorInfo?.severity === 'error' ? 'text-red-700' : 'text-amber-700'
            }>
              {errorInfo?.message}
              {retryCount > 0 && (
                <span className="block text-xs mt-1">
                  재시도 {retryCount}/{maxRetries}
                </span>
              )}
            </AlertDescription>
          </div>
        </div>

        {/* 액션 버튼들 */}
        <div className="flex items-center justify-end gap-2 mt-3">
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="text-xs"
            >
              닫기
            </Button>
          )}

          {canRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              disabled={isRetrying}
              className="text-xs"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  재시도 중...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3 mr-1" />
                  다시 시도
                </>
              )}
            </Button>
          )}
        </div>
      </Alert>

      {/* 대체 가격 표시 */}
      {showFallback && fallbackPrice && (
        <FallbackPrice
          price={fallbackPrice}
          showEstimate={errorInfo?.type === 'network' || !isOnline}
        />
      )}
    </motion.div>
  )
}

export default PriceErrorBoundary