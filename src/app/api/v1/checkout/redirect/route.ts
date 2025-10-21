// 결제 리디렉션 API 엔드포인트
// Story 3.1: 장바구니 및 결제 연동

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSecurityManager } from '@/lib/cart/security'
import { CartServiceError, type CheckoutRedirectParams } from '@/types/cart'

// 쿼리 파라미터 검증 스키마
const redirectParamsSchema = z.object({
  cartId: z.string().min(1, '장바구니 ID가 필요합니다'),
  returnUrl: z.string().url().optional()
})

// 지원되는 브라우저별 리디렉션 방법
interface RedirectMethod {
  method: 'location' | 'meta' | 'javascript'
  code: string
}

function getBrowserRedirectMethod(userAgent: string): RedirectMethod {
  const ua = userAgent.toLowerCase()

  // 모바일 브라우저 감지
  if (/mobile|android|iphone|ipad/.test(ua)) {
    if (/safari/.test(ua) && !/chrome/.test(ua)) {
      // iOS Safari
      return {
        method: 'meta',
        code: 'ios-safari'
      }
    } else if (/chrome/.test(ua)) {
      // 모바일 Chrome
      return {
        method: 'location',
        code: 'mobile-chrome'
      }
    }
  }

  // 데스크톱 브라우저
  if (/firefox/.test(ua)) {
    return {
      method: 'location',
      code: 'firefox'
    }
  } else if (/chrome/.test(ua)) {
    return {
      method: 'location',
      code: 'chrome'
    }
  } else if (/safari/.test(ua)) {
    return {
      method: 'location',
      code: 'safari'
    }
  }

  // 기본값
  return {
    method: 'location',
    code: 'default'
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // 인증 확인
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // 쿼리 파라미터 파싱 및 검증
    const searchParams = request.nextUrl.searchParams
    const queryParams = {
      cartId: searchParams.get('cartId'),
      returnUrl: searchParams.get('returnUrl')
    }

    const validatedParams = redirectParamsSchema.parse(queryParams) as CheckoutRedirectParams

    // 장바구니 ID 검증 및 파싱
    const securityManager = getSecurityManager()
    const cartIdData = securityManager.parseCartId(validatedParams.cartId)

    if (!cartIdData.isValid || cartIdData.userId !== user.id) {
      throw new CartServiceError(
        'Invalid or expired cart ID',
        'INVALID_CART_ID'
      )
    }

    // 구매 요청 로그에서 리디렉션 URL 조회
    const { data: purchaseRequest, error: logError } = await supabase
      .from('purchase_requests')
      .select('redirect_url, status, cart_id')
      .eq('cart_id', validatedParams.cartId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (logError || !purchaseRequest) {
      throw new CartServiceError(
        'Purchase request not found',
        'PURCHASE_REQUEST_NOT_FOUND'
      )
    }

    if (purchaseRequest.status !== 'success') {
      throw new CartServiceError(
        'Purchase request is not in success status',
        'INVALID_PURCHASE_STATUS'
      )
    }

    const redirectUrl = purchaseRequest.redirect_url
    if (!redirectUrl) {
      throw new CartServiceError(
        'No redirect URL found',
        'MISSING_REDIRECT_URL'
      )
    }

    // URL 파라미터 생성 및 암호화
    const encryptedParams = await generateSecureRedirectParams({
      cartId: validatedParams.cartId,
      userId: user.id,
      returnUrl: validatedParams.returnUrl,
      timestamp: Date.now()
    })

    // 최종 리디렉션 URL 구성
    const finalRedirectUrl = new URL(redirectUrl)
    finalRedirectUrl.searchParams.set('ref', 'befun-configurator')
    finalRedirectUrl.searchParams.set('params', encryptedParams)

    if (validatedParams.returnUrl) {
      finalRedirectUrl.searchParams.set('return_url', validatedParams.returnUrl)
    }

    // 브라우저별 최적화된 리디렉션 방법 선택
    const userAgent = request.headers.get('user-agent') || ''
    const redirectMethod = getBrowserRedirectMethod(userAgent)

    // 로그 업데이트 (리디렉션 실행)
    await supabase
      .from('purchase_requests')
      .update({
        status: 'redirected',
        updated_at: new Date().toISOString()
      })
      .eq('cart_id', validatedParams.cartId)

    // 리디렉션 방법에 따른 응답 생성
    switch (redirectMethod.method) {
      case 'meta':
        // Meta refresh 방식 (iOS Safari 최적화)
        return new NextResponse(
          generateMetaRedirectHTML(finalRedirectUrl.toString(), redirectMethod.code),
          {
            status: 200,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
          }
        )

      case 'javascript':
        // JavaScript 방식
        return new NextResponse(
          generateJavaScriptRedirectHTML(finalRedirectUrl.toString(), redirectMethod.code),
          {
            status: 200,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
          }
        )

      case 'location':
      default:
        // HTTP 302 리디렉션 (기본값)
        return NextResponse.redirect(finalRedirectUrl.toString(), 302)
    }

  } catch (error) {
    console.error('Checkout redirect error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid parameters',
        details: (error as any).issues || (error as any).errors
      }, { status: 400 })
    }

    if (error instanceof CartServiceError) {
      return NextResponse.json({
        error: error.message,
        code: error.code
      }, { status: 400 })
    }

    // Fallback 페이지로 리디렉션
    const fallbackUrl = new URL('/cart/error', request.url)
    fallbackUrl.searchParams.set('message', 'Redirect failed')
    return NextResponse.redirect(fallbackUrl.toString())
  }
}

/**
 * 안전한 리디렉션 파라미터 생성 및 암호화
 */
async function generateSecureRedirectParams(data: {
  cartId: string
  userId: string
  returnUrl?: string
  timestamp: number
}): Promise<string> {
  const securityManager = getSecurityManager()

  const payload = {
    cartId: data.cartId,
    userId: data.userId,
    returnUrl: data.returnUrl,
    timestamp: data.timestamp,
    nonce: Math.random().toString(36).substr(2, 9)
  }

  const encrypted = securityManager.encrypt(JSON.stringify(payload))

  return Buffer.from(JSON.stringify(encrypted)).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Meta refresh HTML 생성 (iOS Safari 최적화)
 */
function generateMetaRedirectHTML(url: string, browserCode: string): string {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="0; url=${url}">
  <title>결제 페이지로 이동 중...</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background-color: #f9fafb;
      color: #374151;
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #e5e7eb;
      border-top: 3px solid #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .message {
      margin-top: 16px;
      text-align: center;
    }
    .fallback {
      margin-top: 24px;
    }
    .fallback a {
      color: #3b82f6;
      text-decoration: none;
      padding: 8px 16px;
      border: 1px solid #3b82f6;
      border-radius: 6px;
    }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <div class="message">
    <h2>결제 페이지로 이동 중입니다...</h2>
    <p>잠시만 기다려주세요.</p>
  </div>
  <div class="fallback">
    <p>자동 이동이 되지 않으면 <a href="${url}" target="_self">여기를 클릭</a>하세요.</p>
  </div>
  <script>
    // Fallback JavaScript 리디렉션
    setTimeout(function() {
      if (!document.hidden) {
        window.location.href = '${url}';
      }
    }, 2000);

    // 브라우저별 최적화 (${browserCode})
    if (window.location.href !== '${url}') {
      window.location.replace('${url}');
    }
  </script>
</body>
</html>
  `.trim()
}

/**
 * JavaScript 리디렉션 HTML 생성
 */
function generateJavaScriptRedirectHTML(url: string, browserCode: string): string {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>결제 페이지로 이동 중...</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background-color: #f9fafb;
      color: #374151;
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #e5e7eb;
      border-top: 3px solid #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <div>
    <h2>결제 페이지로 이동 중입니다...</h2>
    <p>잠시만 기다려주세요.</p>
  </div>
  <script>
    // 즉시 리디렉션 (${browserCode})
    window.location.href = '${url}';

    // Fallback
    setTimeout(function() {
      if (window.location.href.indexOf('${url}') === -1) {
        window.location.replace('${url}');
      }
    }, 1000);
  </script>
</body>
</html>
  `.trim()
}
