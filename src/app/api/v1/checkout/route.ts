// 결제 리디렉션 API 엔드포인트
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSuccessResponse, createErrorResponse, withErrorHandling } from '@/lib/api/errors'
import { authenticateRequest, authorizeRequest } from '@/lib/api/auth'
import { validateRequestBody, CommonSchemas } from '@/lib/api/validation'
import { checkDefaultRateLimit, getRateLimitHeaders } from '@/lib/api/rate-limiter'
import { processApiVersion } from '@/lib/api/version'
import { RequestTimer, logger } from '@/lib/api/logger'
import { supabase } from '@/lib/supabase'

// 결제 세션 생성 요청 스키마
const createCheckoutSessionSchema = z.object({
  design_id: CommonSchemas.uuid,
  quantity: z.number().min(1).max(100),
  customizations: z.array(z.object({
    type: z.enum(['engraving', 'custom_color', 'premium_packaging']),
    value: z.string().optional(),
    price: z.number(),
  })).optional(),
  accessories: z.array(z.object({
    id: z.string(),
    name: z.string(),
    quantity: z.number().min(1),
    price: z.number(),
  })).optional(),
  shipping_address: z.object({
    name: z.string().min(1),
    phone: z.string().min(10),
    address_line1: z.string().min(5),
    address_line2: z.string().optional(),
    city: z.string().min(2),
    state: z.string().min(2),
    postal_code: z.string().min(5),
    country: z.string().default('KR'),
  }),
  billing_address: z.object({
    name: z.string().min(1),
    phone: z.string().min(10),
    address_line1: z.string().min(5),
    address_line2: z.string().optional(),
    city: z.string().min(2),
    state: z.string().min(2),
    postal_code: z.string().min(5),
    country: z.string().default('KR'),
  }).optional(),
  discount_code: z.string().max(20).optional(),
  rush_order: z.boolean().optional(),
  notes: z.string().max(500).optional(),
  payment_method: z.enum(['card', 'bank_transfer', 'paypal']).default('card'),
  success_url: z.string().url(),
  cancel_url: z.string().url(),
})

// 결제 세션 응답 타입
interface CheckoutSessionResponse {
  session_id: string
  checkout_url: string
  expires_at: string
  order_id: string
  payment_intent_id?: string
  total_amount: number
  currency: string
  status: 'pending' | 'active' | 'expired'
  metadata: {
    design_id: string
    user_id: string
    quantity: number
  }
}

// POST 핸들러 - 결제 세션 생성
async function handlePost(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const timer = new RequestTimer(request, requestId)

  try {
    // API 버전 확인
    const { version } = processApiVersion(request, requestId)

    // Rate Limiting
    const rateLimitResult = checkDefaultRateLimit(request, requestId)
    if (!rateLimitResult.allowed) {
      const response = createErrorResponse(
        new Error('Rate limit exceeded'),
        requestId
      )
      Object.entries(getRateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      return response
    }

    // 인증 확인
    const authContext = await authenticateRequest(request, requestId)

    // 권한 확인 - 체크아웃 생성 권한
    await authorizeRequest(authContext, ['checkout:create'])

    // 요청 본문 검증
    const requestBody = await validateRequestBody(request, createCheckoutSessionSchema, requestId)

    logger.info('Create checkout session request started', requestId, {
      userId: authContext.user.id,
      designId: requestBody.design_id,
      quantity: requestBody.quantity,
    })

    // 디자인 존재 및 소유권 확인
    const { data: design, error: designError } = await supabase
      .from('saved_designs')
      .select(`
        id,
        name,
        user_id,
        estimated_price,
        width_cm,
        depth_cm,
        height_cm,
        material,
        status
      `)
      .eq('id', requestBody.design_id)
      .single()

    if (designError || !design) {
      throw new Error('디자인을 찾을 수 없습니다')
    }

    if (design.user_id !== authContext.user.id) {
      throw new Error('본인의 디자인만 주문할 수 있습니다')
    }

    if (design.status !== 'completed') {
      throw new Error('완성된 디자인만 주문할 수 있습니다')
    }

    // 가격 계산
    const basePrice = design.estimated_price
    let customizationCost = 0
    let accessoryCost = 0

    if (requestBody.customizations) {
      customizationCost = requestBody.customizations.reduce((sum, custom) => sum + custom.price, 0)
    }

    if (requestBody.accessories) {
      accessoryCost = requestBody.accessories.reduce((sum, acc) => sum + (acc.price * acc.quantity), 0)
    }

    const subtotal = (basePrice + customizationCost + accessoryCost) * requestBody.quantity

    // 할인 적용
    let discountAmount = 0
    if (requestBody.discount_code) {
      // 실제로는 데이터베이스에서 할인 코드 검증
      const MOCK_DISCOUNTS = {
        'WELCOME10': 0.1,
        'SUMMER20': 0.2,
      }
      const discountRate = MOCK_DISCOUNTS[requestBody.discount_code as keyof typeof MOCK_DISCOUNTS]
      if (discountRate) {
        discountAmount = subtotal * discountRate
      }
    }

    // 급송 주문 수수료
    let rushOrderFee = 0
    if (requestBody.rush_order) {
      rushOrderFee = subtotal * 0.3
    }

    const totalAmount = subtotal - discountAmount + rushOrderFee

    // 주문 생성
    const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    const sessionId = crypto.randomUUID()

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        id: orderId,
        user_id: authContext.user.id,
        design_id: requestBody.design_id,
        quantity: requestBody.quantity,
        customizations: requestBody.customizations,
        accessories: requestBody.accessories,
        subtotal: subtotal,
        discount_amount: discountAmount,
        discount_code: requestBody.discount_code,
        rush_order_fee: rushOrderFee,
        total_amount: totalAmount,
        currency: 'KRW',
        shipping_address: requestBody.shipping_address,
        billing_address: requestBody.billing_address || requestBody.shipping_address,
        payment_method: requestBody.payment_method,
        status: 'pending',
        notes: requestBody.notes,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30분 후 만료
      })
      .select()
      .single()

    if (orderError) {
      logger.error('Failed to create order', requestId, { error: orderError })
      throw new Error('주문을 생성할 수 없습니다')
    }

    // 결제 세션 생성 (실제로는 PG사 API 호출)
    const checkoutSession: CheckoutSessionResponse = {
      session_id: sessionId,
      checkout_url: `https://checkout.example.com/pay/${sessionId}?order=${orderId}`,
      expires_at: order.expires_at,
      order_id: orderId,
      payment_intent_id: `pi_${Math.random().toString(36).substring(2)}`,
      total_amount: totalAmount,
      currency: 'KRW',
      status: 'active',
      metadata: {
        design_id: requestBody.design_id,
        user_id: authContext.user.id,
        quantity: requestBody.quantity,
      },
    }

    // 세션 정보를 데이터베이스에 저장
    await supabase
      .from('checkout_sessions')
      .insert({
        session_id: sessionId,
        order_id: orderId,
        user_id: authContext.user.id,
        checkout_url: checkoutSession.checkout_url,
        payment_intent_id: checkoutSession.payment_intent_id,
        status: 'active',
        expires_at: order.expires_at,
        success_url: requestBody.success_url,
        cancel_url: requestBody.cancel_url,
        created_at: new Date().toISOString(),
      })

    logger.info('Create checkout session request completed', requestId, {
      userId: authContext.user.id,
      orderId,
      sessionId,
      totalAmount,
    })

    const response = createSuccessResponse(checkoutSession, requestId, 201)

    // Rate limit 헤더 추가
    Object.entries(getRateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    timer.complete(201)
    return response

  } catch (error) {
    timer.complete(500)
    return createErrorResponse(error, requestId)
  }
}

// GET 핸들러 - 결제 세션 상태 조회
async function handleGet(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const timer = new RequestTimer(request, requestId)

  try {
    // API 버전 확인
    const { version } = processApiVersion(request, requestId)

    // Rate Limiting
    const rateLimitResult = checkDefaultRateLimit(request, requestId)
    if (!rateLimitResult.allowed) {
      const response = createErrorResponse(
        new Error('Rate limit exceeded'),
        requestId
      )
      Object.entries(getRateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      return response
    }

    // 인증 확인
    const authContext = await authenticateRequest(request, requestId)

    // 권한 확인 - 체크아웃 읽기 권한
    await authorizeRequest(authContext, ['checkout:read'])

    // 쿼리 파라미터에서 세션 ID 추출
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('session_id')
    const orderId = url.searchParams.get('order_id')

    if (!sessionId && !orderId) {
      throw new Error('session_id 또는 order_id가 필요합니다')
    }

    logger.info('Get checkout session request started', requestId, {
      userId: authContext.user.id,
      sessionId,
      orderId,
    })

    // 세션 정보 조회
    let query = supabase
      .from('checkout_sessions')
      .select(`
        *,
        orders!inner(*)
      `)
      .eq('user_id', authContext.user.id)

    if (sessionId) {
      query = query.eq('session_id', sessionId)
    } else if (orderId) {
      query = query.eq('order_id', orderId)
    }

    const { data: session, error: sessionError } = await query.single()

    if (sessionError || !session) {
      throw new Error('결제 세션을 찾을 수 없습니다')
    }

    // 만료된 세션 확인
    const now = new Date()
    const expiresAt = new Date(session.expires_at)
    let status = session.status

    if (now > expiresAt && status === 'active') {
      status = 'expired'
      // 상태 업데이트
      await supabase
        .from('checkout_sessions')
        .update({ status: 'expired' })
        .eq('session_id', session.session_id)
    }

    const sessionResponse: CheckoutSessionResponse = {
      session_id: session.session_id,
      checkout_url: session.checkout_url,
      expires_at: session.expires_at,
      order_id: session.order_id,
      payment_intent_id: session.payment_intent_id,
      total_amount: session.orders.total_amount,
      currency: session.orders.currency,
      status: status as any,
      metadata: {
        design_id: session.orders.design_id,
        user_id: session.user_id,
        quantity: session.orders.quantity,
      },
    }

    logger.info('Get checkout session request completed', requestId, {
      userId: authContext.user.id,
      sessionId: session.session_id,
      status,
    })

    const response = createSuccessResponse(sessionResponse, requestId)

    // Rate limit 헤더 추가
    Object.entries(getRateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    timer.complete(200)
    return response

  } catch (error) {
    timer.complete(500)
    return createErrorResponse(error, requestId)
  }
}

// OPTIONS 핸들러 (CORS)
async function handleOptions() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Version',
    },
  })
}

// 메인 핸들러들
export const GET = withErrorHandling(handleGet)
export const POST = withErrorHandling(handlePost)
export const OPTIONS = handleOptions