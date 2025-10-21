// 장바구니 추가 API 엔드포인트
// Story 3.1: 장바구니 및 결제 연동

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getCartService } from '@/lib/cart/cart-service'
import { CartServiceError, type AddToCartRequest, type AddToCartResponse } from '@/types/cart'
import { getCSRFTokenFromHeaders, validateCSRFToken } from '@/lib/csrf'

// 요청 데이터 검증 스키마
const addToCartSchema = z.object({
  designId: z.string().uuid('유효한 디자인 ID가 필요합니다'),
  quantity: z.number().min(1).max(10).optional().default(1),
  customizations: z.object({
    width_cm: z.number().min(60).max(300, '너비는 60-300cm 범위여야 합니다'),
    depth_cm: z.number().min(40).max(200, '깊이는 40-200cm 범위여야 합니다'),
    height_cm: z.number().min(60).max(120, '높이는 60-120cm 범위여야 합니다'),
    material: z.enum(['wood', 'mdf', 'steel', 'metal', 'glass', 'fabric'] as const),
    calculated_price: z.number().min(0, '가격은 0 이상이어야 합니다'),
    price_breakdown: z.object({
      base_price: z.number(),
      material_modifier: z.number(),
      volume_m3: z.number(),
      subtotal: z.number(),
      tax: z.number().optional(),
      total: z.number(),
      currency: z.string()
    }),
    color: z.string().optional(),
    name: z.string().min(1, '디자인 이름이 필요합니다')
  })
})

// Rate limiting을 위한 메모리 저장소 (실제 환경에서는 Redis 사용 권장)
const rateLimitStore = new Map<string, { count: number, resetTime: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const windowMs = 60 * 1000 // 1분
  const maxRequests = 5

  const userLimit = rateLimitStore.get(userId)

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitStore.set(userId, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (userLimit.count >= maxRequests) {
    return false
  }

  userLimit.count++
  return true
}

export async function POST(request: NextRequest): Promise<NextResponse<AddToCartResponse>> {
  try {
    // CSRF 토큰 검증
    const submittedToken = await getCSRFTokenFromHeaders()
    const sessionToken = request.cookies.get('csrf-token')?.value

    if (!submittedToken || !sessionToken || !validateCSRFToken(submittedToken, sessionToken)) {
      return NextResponse.json({
        success: false,
        message: 'CSRF 토큰이 유효하지 않습니다',
        error: { code: 'CSRF_TOKEN_INVALID' }
      }, { status: 403 })
    }

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

    // Rate limiting 확인
    if (!checkRateLimit(user.id)) {
      return NextResponse.json({
        success: false,
        message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요',
        error: { code: 'RATE_LIMIT_EXCEEDED' }
      }, { status: 429 })
    }

    // 요청 데이터 파싱 및 검증
    const body = await request.json()
    const validatedData = addToCartSchema.parse(body) as AddToCartRequest

    // 장바구니 서비스를 통해 처리
    const cartService = getCartService()
    const result = await cartService.addToCart(validatedData, user.id)

    const statusCode = result.success ? 200 : (result.fallback ? 503 : 400)
    return NextResponse.json(result, { status: statusCode })

  } catch (error) {
    console.error('Cart add error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: '입력 데이터가 올바르지 않습니다',
        error: {
          code: 'VALIDATION_ERROR',
          details: (error as any).errors ?? error.issues
        }
      }, { status: 400 })
    }

    if (error instanceof CartServiceError) {
      return NextResponse.json({
        success: false,
        message: error.message,
        error: { code: error.code, details: error.details }
      }, { status: 500 })
    }

    return NextResponse.json({
      success: false,
      message: '서버 오류가 발생했습니다',
      error: { code: 'INTERNAL_ERROR' }
    }, { status: 500 })
  }
}
