'use client'

// 장바구니 추가 버튼 컴포넌트
// Story 3.1: 장바구니 및 결제 연동

import { useState } from 'react'
import { ShoppingCart, Loader2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { type CartItemData, type AddToCartResponse } from '@/types/cart'

interface AddToCartButtonProps {
  cartData: CartItemData
  onSuccess?: (response: AddToCartResponse) => void
  onError?: (error: string) => void
  onLoginRequired?: () => void
  disabled?: boolean
  className?: string
  variant?: 'default' | 'secondary' | 'outline'
  size?: 'sm' | 'default' | 'lg'
}

export function AddToCartButton({
  cartData,
  onSuccess,
  onError,
  onLoginRequired,
  disabled = false,
  className,
  variant = 'default',
  size = 'default'
}: AddToCartButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleAddToCart = async () => {
    if (disabled || isLoading) return

    setIsLoading(true)
    setStatus('idle')

    try {
      const response = await fetch('/api/v1/cart/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cartData)
      })

      const result: AddToCartResponse = await response.json()

      if (response.status === 401) {
        // 인증 필요
        onLoginRequired?.()
        return
      }

      if (result.success) {
        setStatus('success')
        onSuccess?.(result)

        // 성공 시 리디렉션
        if (result.redirectUrl) {
          setTimeout(() => {
            window.location.href = result.redirectUrl!
          }, 1000) // 1초 후 리디렉션 (사용자에게 피드백 표시 시간)
        }
      } else {
        setStatus('error')
        onError?.(result.message)

        // 재시도 URL이 있는 경우 fallback 처리
        if (result.fallback && result.retryUrl) {
          setTimeout(() => {
            // 재시도 페이지로 이동하거나 모달 표시
            console.log('Retry URL:', result.retryUrl)
          }, 2000)
        }
      }
    } catch (error) {
      console.error('Add to cart error:', error)
      setStatus('error')
      onError?.('네트워크 오류가 발생했습니다')
    } finally {
      setIsLoading(false)

      // 상태 초기화 (3초 후)
      setTimeout(() => {
        if (status !== 'idle') {
          setStatus('idle')
        }
      }, 3000)
    }
  }

  const getButtonContent = () => {
    if (isLoading) {
      return (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          장바구니에 추가 중...
        </>
      )
    }

    if (status === 'success') {
      return (
        <>
          <Check className="w-4 h-4 mr-2 text-green-600" />
          추가 완료! 이동 중...
        </>
      )
    }

    if (status === 'error') {
      return (
        <>
          <X className="w-4 h-4 mr-2 text-red-600" />
          오류 발생
        </>
      )
    }

    return (
      <>
        <ShoppingCart className="w-4 h-4 mr-2" />
        장바구니에 담기
      </>
    )
  }

  const getButtonVariant = () => {
    if (status === 'success') return 'default'
    if (status === 'error') return 'outline'
    return variant
  }

  return (
    <Button
      onClick={handleAddToCart}
      disabled={disabled || isLoading}
      variant={getButtonVariant()}
      size={size}
      className={cn(
        'transition-all duration-200',
        status === 'success' && 'bg-green-600 hover:bg-green-700 text-white',
        status === 'error' && 'border-red-300 text-red-600 hover:bg-red-50',
        isLoading && 'cursor-not-allowed',
        className
      )}
    >
      {getButtonContent()}
    </Button>
  )
}

// 간단한 사용 예시 컴포넌트
export function AddToCartButtonExample() {
  const handleSuccess = (response: AddToCartResponse) => {
    console.log('장바구니 추가 성공:', response)
  }

  const handleError = (error: string) => {
    console.error('장바구니 추가 실패:', error)
  }

  const handleLoginRequired = () => {
    console.log('로그인이 필요합니다')
    // 로그인 모달 표시 또는 로그인 페이지로 이동
  }

  const exampleCartData: CartItemData = {
    designId: 'example-design-id',
    quantity: 1,
    customizations: {
      width_cm: 120,
      depth_cm: 60,
      height_cm: 75,
      material: 'wood',
      calculated_price: 116700,
      price_breakdown: {
        base_price: 50000,
        material_modifier: 1.0,
        volume_m3: 0.54,
        subtotal: 27000,
        total: 116700,
        currency: 'KRW'
      },
      name: '내 맞춤 책상'
    }
  }

  return (
    <div className="space-y-4">
      <AddToCartButton
        cartData={exampleCartData}
        onSuccess={handleSuccess}
        onError={handleError}
        onLoginRequired={handleLoginRequired}
      />

      <AddToCartButton
        cartData={exampleCartData}
        onSuccess={handleSuccess}
        onError={handleError}
        onLoginRequired={handleLoginRequired}
        variant="outline"
        size="lg"
        className="w-full"
      />
    </div>
  )
}