// 장바구니 재시도 API 엔드포인트
// Story 3.1: 장바구니 및 결제 연동

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCartService } from '@/lib/cart/cart-service'
import { type AddToCartResponse } from '@/types/cart'

interface RouteParams {
  params: {
    id: string
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<AddToCartResponse>> {
  try {
    // 인증 확인
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        message: '로그인이 필요합니다',
        error: { code: 'UNAUTHORIZED' }
      }, { status: 401 })
    }

    const purchaseRequestId = params.id

    if (!purchaseRequestId) {
      return NextResponse.json({
        success: false,
        message: '유효하지 않은 요청 ID입니다',
        error: { code: 'INVALID_REQUEST_ID' }
      }, { status: 400 })
    }

    // 장바구니 서비스를 통해 재시도 처리
    const cartService = getCartService()
    const result = await cartService.retryCartOperation(purchaseRequestId, user.id)

    const statusCode = result.success ? 200 : (result.fallback ? 503 : 400)
    return NextResponse.json(result, { status: statusCode })

  } catch (error) {
    console.error('Cart retry error:', error)

    return NextResponse.json({
      success: false,
      message: '서버 오류가 발생했습니다',
      error: { code: 'INTERNAL_ERROR' }
    }, { status: 500 })
  }
}