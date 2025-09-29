// 장바구니 재시도 페이지
// Story 3.1: 장바구니 및 결제 연동

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { RefreshCw, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface RetryStatus {
  status: 'idle' | 'retrying' | 'success' | 'failed'
  message: string
  redirectUrl?: string
}

export default function CartRetryPage() {
  const params = useParams()
  const router = useRouter()
  const [retryStatus, setRetryStatus] = useState<RetryStatus>({
    status: 'idle',
    message: '재시도 준비 중...'
  })
  const [countdown, setCountdown] = useState(0)

  const purchaseRequestId = params?.id as string

  useEffect(() => {
    if (!purchaseRequestId) {
      router.push('/cart/error?message=Invalid retry ID')
      return
    }

    // 초기 상태 확인
    checkRetryStatus()
  }, [purchaseRequestId, router])

  // 성공 시 자동 리디렉션 카운트다운
  useEffect(() => {
    if (retryStatus.status === 'success' && retryStatus.redirectUrl && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (retryStatus.status === 'success' && retryStatus.redirectUrl && countdown === 0) {
      window.location.href = retryStatus.redirectUrl
    }
  }, [retryStatus, countdown])

  const checkRetryStatus = async () => {
    try {
      // 구매 요청 상태 확인 API 호출 (실제로는 구현 필요)
      // const response = await fetch(`/api/v1/cart/retry/status/${purchaseRequestId}`)
      // const data = await response.json()

      setRetryStatus({
        status: 'idle',
        message: '결제 시스템 연결에 실패했습니다. 다시 시도해보세요.'
      })
    } catch (error) {
      setRetryStatus({
        status: 'failed',
        message: '상태 확인 중 오류가 발생했습니다.'
      })
    }
  }

  const handleRetry = async () => {
    setRetryStatus({
      status: 'retrying',
      message: '재시도 중입니다...'
    })

    try {
      const response = await fetch(`/api/v1/cart/retry/${purchaseRequestId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()

      if (result.success) {
        setRetryStatus({
          status: 'success',
          message: '재시도가 성공했습니다! 결제 페이지로 이동합니다.',
          redirectUrl: result.redirectUrl
        })
        setCountdown(5)
      } else {
        setRetryStatus({
          status: 'failed',
          message: result.message || '재시도에 실패했습니다.'
        })
      }
    } catch (error) {
      console.error('Retry error:', error)
      setRetryStatus({
        status: 'failed',
        message: '재시도 중 네트워크 오류가 발생했습니다.'
      })
    }
  }

  const handleManualRedirect = () => {
    if (retryStatus.redirectUrl) {
      window.location.href = retryStatus.redirectUrl
    }
  }

  const getStatusIcon = () => {
    switch (retryStatus.status) {
      case 'retrying':
        return <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-600" />
      case 'failed':
        return <AlertCircle className="w-8 h-8 text-red-600" />
      default:
        return <RefreshCw className="w-8 h-8 text-gray-600" />
    }
  }

  const getStatusBadge = () => {
    switch (retryStatus.status) {
      case 'retrying':
        return <Badge className="bg-blue-100 text-blue-700">재시도 중</Badge>
      case 'success':
        return <Badge className="bg-green-100 text-green-700">성공</Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-700">실패</Badge>
      default:
        return <Badge variant="secondary">대기 중</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-gray-100 rounded-full">
              {getStatusIcon()}
            </div>
          </div>
          <CardTitle className="text-xl flex items-center justify-center gap-2">
            결제 재시도
            {getStatusBadge()}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 상태 메시지 */}
          <div className="text-center">
            <p className="text-gray-600">
              {retryStatus.message}
            </p>
          </div>

          {/* 성공 시 자동 리디렉션 안내 */}
          {retryStatus.status === 'success' && retryStatus.redirectUrl && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm text-green-700 mb-2 text-center">
                <strong>{countdown}초</strong> 후 결제 페이지로 자동 이동됩니다
              </p>
              <Button
                onClick={handleManualRedirect}
                className="w-full flex items-center gap-2"
                variant="default"
              >
                <ExternalLink className="w-4 h-4" />
                지금 이동
              </Button>
            </div>
          )}

          {/* 재시도 버튼 */}
          {(retryStatus.status === 'idle' || retryStatus.status === 'failed') && (
            <div className="space-y-3">
              <Button
                onClick={handleRetry}
                disabled={retryStatus.status === 'retrying'}
                className="w-full flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${retryStatus.status === 'retrying' ? 'animate-spin' : ''}`} />
                다시 시도
              </Button>

              <Button
                onClick={() => router.push('/cart')}
                variant="outline"
                className="w-full"
              >
                장바구니로 돌아가기
              </Button>
            </div>
          )}

          {/* 도움말 정보 */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">재시도가 실패하는 경우:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>인터넷 연결 상태를 확인해보세요</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>장바구니에 상품을 다시 추가해보세요</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>고객 서비스에 문의하세요</span>
              </li>
            </ul>
          </div>

          {/* 고객 서비스 */}
          <div className="text-center pt-4 border-t">
            <p className="text-xs text-gray-500 mb-2">
              계속 문제가 발생하나요?
            </p>
            <Button
              variant="link"
              className="text-sm p-0 h-auto"
              onClick={() => {
                console.log('Contact customer service')
              }}
            >
              고객 서비스 문의하기
            </Button>
          </div>

          {/* 디버깅 정보 */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-center pt-2 border-t">
              <p className="text-xs text-gray-400">
                Request ID: {purchaseRequestId}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}