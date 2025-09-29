'use client'

// 비로그인 사용자 로그인 유도 모달
// Story 3.1: 장바구니 및 결제 연동

import { useState } from 'react'
import { LogIn, User, X, ShoppingCart } from 'lucide-react'
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

interface LoginPromptModalProps {
  isOpen: boolean
  onClose: () => void
  onLogin: () => void
  designName?: string
  price?: number
  className?: string
}

export function LoginPromptModal({
  isOpen,
  onClose,
  onLogin,
  designName = '맞춤 책상',
  price = 0,
  className
}: LoginPromptModalProps) {
  const [isRedirecting, setIsRedirecting] = useState(false)

  const handleLogin = () => {
    setIsRedirecting(true)
    onLogin()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn('sm:max-w-md', className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              로그인이 필요합니다
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            장바구니에 상품을 추가하려면 먼저 로그인해야 합니다
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* 디자인 정보 카드 */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">{designName}</h3>
                <p className="text-sm text-gray-600">장바구니에 추가할 상품</p>
              </div>
              <Badge variant="secondary" className="text-lg">
                ₩{price.toLocaleString()}
              </Badge>
            </div>
          </div>

          {/* 로그인 혜택 안내 */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900">로그인 후 이용 가능한 기능:</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                나만의 맞춤 디자인 저장 및 관리
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                장바구니 및 주문 히스토리 조회
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                빠르고 안전한 결제 진행
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                주문 상태 실시간 추적
              </li>
            </ul>
          </div>

          {/* 로그인 버튼 */}
          <div className="space-y-2">
            <Button
              onClick={handleLogin}
              disabled={isRedirecting}
              className="w-full flex items-center gap-2"
            >
              {isRedirecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  로그인 페이지로 이동 중...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  로그인하고 장바구니에 담기
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={onClose}
              className="w-full"
              disabled={isRedirecting}
            >
              나중에 하기
            </Button>
          </div>

          {/* 회원가입 안내 */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              아직 계정이 없으신가요?{' '}
              <button
                onClick={() => {
                  // 회원가입 페이지로 이동하거나 회원가입 모달 표시
                  console.log('Navigate to signup')
                }}
                className="text-blue-600 hover:underline"
                disabled={isRedirecting}
              >
                회원가입
              </button>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// 간단한 사용자 상태 확인 훅 (예시)
export function useAuthStatus() {
  // 실제로는 Supabase Auth 상태를 확인해야 함
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // 여기서 실제 인증 상태 확인 로직 구현
  // const { data: { user }, error } = supabase.auth.getUser()

  return {
    isAuthenticated,
    isLoading,
    login: () => {
      // 로그인 페이지로 리디렉션 또는 모달 표시
      window.location.href = '/login'
    },
    logout: () => {
      // 로그아웃 처리
      setIsAuthenticated(false)
    }
  }
}

// 조건부 장바구니 버튼 래퍼
interface ConditionalCartButtonProps {
  children: React.ReactNode
  cartData: any
  onLoginRequired?: () => void
  className?: string
}

export function ConditionalCartButton({
  children,
  cartData,
  onLoginRequired,
  className
}: ConditionalCartButtonProps) {
  const { isAuthenticated, isLoading, login } = useAuthStatus()
  const [showLoginModal, setShowLoginModal] = useState(false)

  const handleClick = () => {
    if (!isAuthenticated) {
      setShowLoginModal(true)
      onLoginRequired?.()
      return
    }

    // 인증된 사용자는 정상적으로 장바구니 기능 실행
  }

  if (isLoading) {
    return (
      <div className={cn('animate-pulse bg-gray-200 rounded h-10', className)} />
    )
  }

  return (
    <>
      <div onClick={handleClick} className={className}>
        {children}
      </div>

      <LoginPromptModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={() => {
          setShowLoginModal(false)
          login()
        }}
        designName={cartData?.customizations?.name}
        price={cartData?.customizations?.calculated_price}
      />
    </>
  )
}