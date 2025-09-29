'use client'

// 구매 플로우 통합 컴포넌트 (모바일 반응형)
// Story 3.1: 장바구니 및 결제 연동

import { useState } from 'react'
import { AddToCartButton } from './AddToCartButton'
import { CartModal } from './CartModal'
import { LoginPromptModal } from './LoginPromptModal'
import { type CartItemData, type AddToCartResponse } from '@/types/cart'
import { cn } from '@/lib/utils'

interface PurchaseFlowProps {
  cartData: CartItemData
  isAuthenticated?: boolean
  onLogin?: () => void
  className?: string
  buttonVariant?: 'default' | 'secondary' | 'outline'
  buttonSize?: 'sm' | 'default' | 'lg'
  showPriceInButton?: boolean
}

export function PurchaseFlow({
  cartData,
  isAuthenticated = false,
  onLogin,
  className,
  buttonVariant = 'default',
  buttonSize = 'default',
  showPriceInButton = false
}: PurchaseFlowProps) {
  const [showCartModal, setShowCartModal] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [cartResponse, setCartResponse] = useState<AddToCartResponse>()

  const handleSuccess = (response: AddToCartResponse) => {
    setCartResponse(response)
    setShowCartModal(true)
  }

  const handleError = (error: string) => {
    setCartResponse({
      success: false,
      message: error,
      error: { code: 'UNKNOWN_ERROR' }
    })
    setShowCartModal(true)
  }

  const handleLoginRequired = () => {
    setShowLoginModal(true)
  }

  const handleLogin = () => {
    setShowLoginModal(false)
    onLogin?.()
  }

  const price = cartData.customizations.calculated_price
  const designName = cartData.customizations.name

  return (
    <div className={cn('w-full', className)}>
      {/* 반응형 장바구니 버튼 */}
      <div className="w-full">
        <AddToCartButton
          cartData={cartData}
          onSuccess={handleSuccess}
          onError={handleError}
          onLoginRequired={isAuthenticated ? undefined : handleLoginRequired}
          variant={buttonVariant}
          size={buttonSize}
          className={cn(
            'w-full transition-all duration-200',
            // 모바일에서 더 큰 버튼
            'h-12 text-base sm:h-10 sm:text-sm',
            // 가격 표시 옵션
            showPriceInButton && 'flex-col gap-1 h-16 sm:h-12 sm:flex-row sm:gap-2'
          )}
        />

        {/* 모바일에서 가격 표시 */}
        {showPriceInButton && (
          <div className="text-center mt-2 sm:hidden">
            <span className="text-lg font-semibold text-gray-900">
              ₩{price.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* 로그인 유도 모달 */}
      <LoginPromptModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLogin}
        designName={designName}
        price={price}
      />

      {/* 장바구니 결과 모달 */}
      <CartModal
        isOpen={showCartModal}
        onClose={() => setShowCartModal(false)}
        response={cartResponse}
        designName={designName}
        price={price}
      />
    </div>
  )
}

// 가격 정보 카드 컴포넌트
interface PriceCardProps {
  price: number
  priceBreakdown?: any
  material?: string
  className?: string
}

export function PriceCard({
  price,
  priceBreakdown,
  material,
  className
}: PriceCardProps) {
  return (
    <div className={cn(
      'bg-white border border-gray-200 rounded-lg p-4 shadow-sm',
      className
    )}>
      <div className="space-y-3">
        {/* 총 가격 */}
        <div className="flex items-center justify-between">
          <span className="text-lg font-medium text-gray-900">총 가격</span>
          <span className="text-2xl font-bold text-gray-900">
            ₩{price.toLocaleString()}
          </span>
        </div>

        {/* 가격 분해 정보 */}
        {priceBreakdown && (
          <div className="border-t pt-3 space-y-2">
            <h4 className="text-sm font-medium text-gray-700">가격 구성</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>기본 단가 (m³당)</span>
                <span>₩{priceBreakdown.base_price?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>부피</span>
                <span>{priceBreakdown.volume_m3?.toFixed(3)}m³</span>
              </div>
              {material && (
                <div className="flex justify-between">
                  <span>재료 ({material})</span>
                  <span>×{priceBreakdown.material_modifier}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// 완전한 구매 섹션 컴포넌트
interface PurchaseSectionProps {
  cartData: CartItemData
  isAuthenticated?: boolean
  onLogin?: () => void
  showPriceCard?: boolean
  className?: string
}

export function PurchaseSection({
  cartData,
  isAuthenticated = false,
  onLogin,
  showPriceCard = true,
  className
}: PurchaseSectionProps) {
  const price = cartData.customizations.calculated_price
  const priceBreakdown = cartData.customizations.price_breakdown
  const material = cartData.customizations.material

  return (
    <div className={cn('space-y-4', className)}>
      {/* 가격 카드 (선택적) */}
      {showPriceCard && (
        <PriceCard
          price={price}
          priceBreakdown={priceBreakdown}
          material={material}
        />
      )}

      {/* 구매 플로우 */}
      <PurchaseFlow
        cartData={cartData}
        isAuthenticated={isAuthenticated}
        onLogin={onLogin}
        buttonSize="lg"
        showPriceInButton={!showPriceCard}
      />

      {/* 추가 정보 */}
      <div className="text-center space-y-2">
        <p className="text-xs text-gray-500">
          * 배송비는 별도이며, 결제 페이지에서 확인하실 수 있습니다
        </p>
        <p className="text-xs text-gray-500">
          * 맞춤 제작 상품은 주문 후 제작이 시작되며, 취소/변경이 제한될 수 있습니다
        </p>
      </div>
    </div>
  )
}

// 반응형 그리드 레이아웃용 헬퍼
export function ResponsiveCartLayout({
  children,
  className
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn(
      'grid gap-6',
      'grid-cols-1', // 모바일: 세로 배치
      'lg:grid-cols-2', // 데스크톱: 가로 배치
      className
    )}>
      {children}
    </div>
  )
}