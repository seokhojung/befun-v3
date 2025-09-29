// 장바구니 에러 페이지
// Story 3.1: 장바구니 및 결제 연동

'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { AlertTriangle, Home, ShoppingCart, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export default function CartErrorPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [errorMessage, setErrorMessage] = useState('')
  const [errorCode, setErrorCode] = useState('')

  useEffect(() => {
    const message = searchParams?.get('message') || '알 수 없는 오류가 발생했습니다'
    const code = searchParams?.get('code') || 'UNKNOWN_ERROR'

    setErrorMessage(message)
    setErrorCode(code)
  }, [searchParams])

  const handleRetry = () => {
    // 이전 페이지로 돌아가기
    router.back()
  }

  const handleGoHome = () => {
    router.push('/')
  }

  const handleGoToCart = () => {
    router.push('/cart')
  }

  const getErrorDetails = (code: string) => {
    switch (code) {
      case 'INVALID_CART_ID':
        return {
          title: '유효하지 않은 장바구니',
          description: '장바구니 정보가 유효하지 않거나 만료되었습니다.',
          suggestions: [
            '장바구니를 다시 확인해보세요',
            '새로운 장바구니에 상품을 추가해보세요',
            '로그인 상태를 확인해보세요'
          ]
        }
      case 'PURCHASE_REQUEST_NOT_FOUND':
        return {
          title: '구매 요청을 찾을 수 없음',
          description: '해당 구매 요청이 존재하지 않습니다.',
          suggestions: [
            '장바구니에 상품을 다시 추가해보세요',
            '결제 과정을 처음부터 다시 시작해보세요'
          ]
        }
      case 'MISSING_REDIRECT_URL':
        return {
          title: '결제 페이지 연결 실패',
          description: '결제 페이지로 연결할 수 없습니다.',
          suggestions: [
            '잠시 후 다시 시도해보세요',
            '고객 서비스에 문의하세요'
          ]
        }
      case 'EXTERNAL_API_FAILED':
        return {
          title: '결제 시스템 연결 오류',
          description: '외부 결제 시스템과의 연결에 문제가 발생했습니다.',
          suggestions: [
            '인터넷 연결 상태를 확인해보세요',
            '몇 분 후 다시 시도해보세요',
            '문제가 지속되면 고객 서비스에 문의하세요'
          ]
        }
      default:
        return {
          title: '오류 발생',
          description: '예상치 못한 오류가 발생했습니다.',
          suggestions: [
            '페이지를 새로고침해보세요',
            '잠시 후 다시 시도해보세요',
            '문제가 계속되면 고객 서비스에 문의하세요'
          ]
        }
    }
  }

  const errorDetails = getErrorDetails(errorCode)

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-xl text-red-700">
            {errorDetails.title}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 에러 설명 */}
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              {errorDetails.description}
            </p>
            <p className="text-sm text-gray-500">
              {errorMessage}
            </p>
          </div>

          {/* 해결 방법 제안 */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">해결 방법:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              {errorDetails.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 액션 버튼들 */}
          <div className="space-y-3">
            <Button
              onClick={handleRetry}
              className="w-full flex items-center gap-2"
              variant="default"
            >
              <RefreshCw className="w-4 h-4" />
              다시 시도
            </Button>

            <Button
              onClick={handleGoToCart}
              className="w-full flex items-center gap-2"
              variant="outline"
            >
              <ShoppingCart className="w-4 h-4" />
              장바구니로 이동
            </Button>

            <Button
              onClick={handleGoHome}
              className="w-full flex items-center gap-2"
              variant="ghost"
            >
              <Home className="w-4 h-4" />
              홈으로 이동
            </Button>
          </div>

          {/* 고객 서비스 정보 */}
          <div className="text-center pt-4 border-t">
            <p className="text-xs text-gray-500 mb-2">
              문제가 계속 발생하나요?
            </p>
            <Button
              variant="link"
              className="text-sm p-0 h-auto"
              onClick={() => {
                // 고객 서비스 페이지나 채팅으로 이동
                console.log('Contact customer service')
              }}
            >
              고객 서비스 문의하기
            </Button>
          </div>

          {/* 에러 코드 (디버깅용) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-center pt-2 border-t">
              <p className="text-xs text-gray-400">
                Error Code: {errorCode}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}