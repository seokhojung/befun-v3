'use client'

// 장바구니 모달 컴포넌트 (로딩, 피드백, 에러 처리)
// Story 3.1: 장바구니 및 결제 연동

import { useState, useEffect } from 'react'
import { X, CheckCircle, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { type AddToCartResponse } from '@/types/cart'

interface CartModalProps {
  isOpen: boolean
  onClose: () => void
  response?: AddToCartResponse
  designName?: string
  price?: number
}

export function CartModal({
  isOpen,
  onClose,
  response,
  designName = '맞춤 책상',
  price = 0
}: CartModalProps) {
  const [countdown, setCountdown] = useState(5)
  const [autoRedirect, setAutoRedirect] = useState(true)

  // 성공 시 자동 리디렉션 카운트다운
  useEffect(() => {
    if (!isOpen || !response?.success || !response.redirectUrl || !autoRedirect) {
      return
    }

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      // 카운트다운 완료 시 리디렉션
      window.location.href = response.redirectUrl
    }
  }, [isOpen, response, countdown, autoRedirect])

  // 모달이 열릴 때마다 카운트다운 초기화
  useEffect(() => {
    if (isOpen && response?.success) {
      setCountdown(5)
      setAutoRedirect(true)
    }
  }, [isOpen, response?.success])

  const handleManualRedirect = () => {
    if (response?.redirectUrl) {
      window.location.href = response.redirectUrl
    }
  }

  const handleRetry = () => {
    if (response?.retryUrl) {
      window.location.href = response.retryUrl
    }
  }

  const handleCancelAutoRedirect = () => {
    setAutoRedirect(false)
  }

  const renderSuccessContent = () => (
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <CheckCircle className="w-16 h-16 text-green-500" />
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-green-700">
          장바구니에 추가되었습니다!
        </h3>
        <p className="text-sm text-gray-600">
          <strong>{designName}</strong>이(가) 장바구니에 성공적으로 추가되었습니다.
        </p>
        <Badge variant="secondary" className="text-lg">
          ₩{price.toLocaleString()}
        </Badge>
      </div>

      {response?.redirectUrl && autoRedirect && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700 mb-2">
            <strong>{countdown}초</strong> 후 결제 페이지로 자동 이동됩니다
          </p>
          <div className="flex gap-2 justify-center">
            <Button
              onClick={handleManualRedirect}
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              지금 이동
            </Button>
            <Button
              variant="outline"
              onClick={handleCancelAutoRedirect}
            >
              자동 이동 취소
            </Button>
          </div>
        </div>
      )}

      {response?.redirectUrl && !autoRedirect && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            준비가 되면 아래 버튼을 클릭하여 결제를 진행하세요
          </p>
          <Button
            onClick={handleManualRedirect}
            className="flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            결제 페이지로 이동
          </Button>
        </div>
      )}
    </div>
  )

  const renderErrorContent = () => (
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <AlertCircle className="w-16 h-16 text-red-500" />
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-red-700">
          {response?.fallback ? '일시적인 오류' : '장바구니 추가 실패'}
        </h3>
        <p className="text-sm text-gray-600">
          {response?.message || '알 수 없는 오류가 발생했습니다'}
        </p>
      </div>

      {response?.fallback && response?.retryUrl && (
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <p className="text-sm text-orange-700 mb-3">
            결제 시스템에 일시적인 문제가 발생했습니다.<br />
            잠시 후 다시 시도하거나 재시도 페이지에서 처리할 수 있습니다.
          </p>
          <div className="flex gap-2 justify-center">
            <Button
              onClick={handleRetry}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              재시도 페이지로 이동
            </Button>
          </div>
        </div>
      )}

      {!response?.fallback && (
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <p className="text-sm text-red-700 mb-3">
            장바구니 추가에 실패했습니다. 다음을 확인해보세요:
          </p>
          <ul className="text-xs text-red-600 text-left space-y-1">
            <li>• 인터넷 연결 상태</li>
            <li>• 로그인 상태</li>
            <li>• 디자인 정보의 유효성</li>
          </ul>
        </div>
      )}
    </div>
  )

  const getModalTitle = () => {
    if (response?.success) return '장바구니 추가 완료'
    if (response?.fallback) return '일시적인 오류 발생'
    return '오류 발생'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {getModalTitle()}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {response?.success ? renderSuccessContent() : renderErrorContent()}
        </div>

        <div className="flex justify-center">
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// 간단한 로딩 스피너 컴포넌트
export function CartLoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
}

// 장바구니 상태 표시 배지
export function CartStatusBadge({
  status
}: {
  status: 'saved' | 'in_cart' | 'purchased' | 'cancelled'
}) {
  const statusConfig = {
    saved: { label: '저장됨', variant: 'secondary' as const, className: 'bg-gray-100 text-gray-700' },
    in_cart: { label: '장바구니', variant: 'default' as const, className: 'bg-blue-100 text-blue-700' },
    purchased: { label: '구매완료', variant: 'default' as const, className: 'bg-green-100 text-green-700' },
    cancelled: { label: '취소됨', variant: 'destructive' as const, className: 'bg-red-100 text-red-700' }
  }

  const config = statusConfig[status]

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  )
}