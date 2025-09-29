// 보안 토큰 관리 및 API 인증 로직
// Story 3.1: 장바구니 및 결제 연동

import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto'
import { CartServiceError } from '@/types/cart'

/**
 * 보안 토큰 관리자
 */
export class SecurityManager {
  private readonly algorithm = 'aes-256-gcm'
  private readonly secretKey: string

  constructor(secretKey?: string) {
    this.secretKey = secretKey || process.env.CART_ENCRYPTION_KEY || this.generateSecretKey()

    if (this.secretKey.length !== 64) { // 32 bytes = 64 hex chars
      throw new CartServiceError(
        'Invalid secret key length. Must be 32 bytes (64 hex characters)',
        'INVALID_SECRET_KEY'
      )
    }
  }

  /**
   * 랜덤 시크릿 키 생성 (개발용)
   */
  private generateSecretKey(): string {
    if (process.env.NODE_ENV === 'production') {
      throw new CartServiceError(
        'Secret key must be provided in production environment',
        'MISSING_SECRET_KEY'
      )
    }
    return randomBytes(32).toString('hex')
  }

  /**
   * 데이터 암호화
   */
  encrypt(data: string): {
    encrypted: string
    iv: string
    tag: string
  } {
    try {
      const iv = randomBytes(16)
      const cipher = createCipheriv(this.algorithm, Buffer.from(this.secretKey, 'hex'), iv)

      let encrypted = cipher.update(data, 'utf8', 'hex')
      encrypted += cipher.final('hex')

      const tag = cipher.getAuthTag()

      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex')
      }
    } catch (error) {
      throw new CartServiceError(
        'Encryption failed',
        'ENCRYPTION_ERROR',
        error
      )
    }
  }

  /**
   * 데이터 복호화
   */
  decrypt(encryptedData: {
    encrypted: string
    iv: string
    tag: string
  }): string {
    try {
      const decipher = createDecipheriv(
        this.algorithm,
        Buffer.from(this.secretKey, 'hex'),
        Buffer.from(encryptedData.iv, 'hex')
      )

      decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'))

      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')

      return decrypted
    } catch (error) {
      throw new CartServiceError(
        'Decryption failed',
        'DECRYPTION_ERROR',
        error
      )
    }
  }

  /**
   * 장바구니 ID 생성 (암호화된 고유 ID)
   */
  generateCartId(userId: string, designId: string, timestamp?: number): string {
    const ts = timestamp || Date.now()
    const payload = JSON.stringify({
      userId,
      designId,
      timestamp: ts,
      nonce: randomBytes(8).toString('hex')
    })

    const encrypted = this.encrypt(payload)

    // Base64 URL-safe 인코딩
    const cartId = Buffer.from(JSON.stringify(encrypted)).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    return `cart_${cartId}`
  }

  /**
   * 장바구니 ID 검증 및 파싱
   */
  parseCartId(cartId: string): {
    userId: string
    designId: string
    timestamp: number
    isValid: boolean
  } {
    try {
      if (!cartId.startsWith('cart_')) {
        throw new Error('Invalid cart ID format')
      }

      const base64Data = cartId.slice(5) // 'cart_' 제거
        .replace(/-/g, '+')
        .replace(/_/g, '/')

      // 패딩 추가
      const padding = '='.repeat((4 - base64Data.length % 4) % 4)
      const encrypted = JSON.parse(Buffer.from(base64Data + padding, 'base64').toString())

      const decrypted = this.decrypt(encrypted)
      const payload = JSON.parse(decrypted)

      return {
        userId: payload.userId,
        designId: payload.designId,
        timestamp: payload.timestamp,
        isValid: true
      }
    } catch (error) {
      return {
        userId: '',
        designId: '',
        timestamp: 0,
        isValid: false
      }
    }
  }

  /**
   * API 인증 토큰 생성
   */
  generateAuthToken(data: {
    userId: string
    cartId: string
    expiresIn?: number // 초 단위
  }): string {
    const expiresAt = Date.now() + (data.expiresIn || 3600) * 1000 // 기본 1시간

    const payload = {
      userId: data.userId,
      cartId: data.cartId,
      expiresAt,
      iat: Date.now()
    }

    const encrypted = this.encrypt(JSON.stringify(payload))

    return Buffer.from(JSON.stringify(encrypted)).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  }

  /**
   * API 인증 토큰 검증
   */
  verifyAuthToken(token: string): {
    isValid: boolean
    userId?: string
    cartId?: string
    isExpired?: boolean
  } {
    try {
      const base64Data = token
        .replace(/-/g, '+')
        .replace(/_/g, '/')

      const padding = '='.repeat((4 - base64Data.length % 4) % 4)
      const encrypted = JSON.parse(Buffer.from(base64Data + padding, 'base64').toString())

      const decrypted = this.decrypt(encrypted)
      const payload = JSON.parse(decrypted)

      const isExpired = Date.now() > payload.expiresAt

      return {
        isValid: !isExpired,
        userId: payload.userId,
        cartId: payload.cartId,
        isExpired
      }
    } catch (error) {
      return { isValid: false }
    }
  }

  /**
   * 데이터 무결성 해시 생성
   */
  generateDataHash(data: any): string {
    const normalizedData = this.normalizeData(data)
    return createHash('sha256')
      .update(JSON.stringify(normalizedData))
      .digest('hex')
  }

  /**
   * 데이터 무결성 검증
   */
  verifyDataIntegrity(data: any, expectedHash: string): boolean {
    const actualHash = this.generateDataHash(data)
    return actualHash === expectedHash
  }

  /**
   * 데이터 정규화 (해시 생성을 위한 일관된 형식)
   */
  private normalizeData(data: any): any {
    if (data === null || data === undefined) {
      return null
    }

    if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
      return data
    }

    if (Array.isArray(data)) {
      return data.map(item => this.normalizeData(item)).sort()
    }

    if (typeof data === 'object') {
      const normalized: any = {}
      const sortedKeys = Object.keys(data).sort()

      for (const key of sortedKeys) {
        normalized[key] = this.normalizeData(data[key])
      }

      return normalized
    }

    return data
  }

  /**
   * CSRF 토큰 생성
   */
  generateCSRFToken(sessionId: string): string {
    const timestamp = Date.now()
    const payload = { sessionId, timestamp }

    const hash = createHash('sha256')
      .update(this.secretKey)
      .update(JSON.stringify(payload))
      .digest('hex')

    return `${timestamp}.${hash}`
  }

  /**
   * CSRF 토큰 검증
   */
  verifyCSRFToken(token: string, sessionId: string, maxAge: number = 3600000): boolean {
    try {
      const [timestampStr, hash] = token.split('.')
      const timestamp = parseInt(timestampStr, 10)

      // 시간 만료 확인
      if (Date.now() - timestamp > maxAge) {
        return false
      }

      // 해시 검증
      const expectedHash = createHash('sha256')
        .update(this.secretKey)
        .update(JSON.stringify({ sessionId, timestamp }))
        .digest('hex')

      return hash === expectedHash
    } catch {
      return false
    }
  }
}

/**
 * 기본 보안 관리자 인스턴스
 */
let defaultSecurityManager: SecurityManager | null = null

export function getSecurityManager(): SecurityManager {
  if (!defaultSecurityManager) {
    defaultSecurityManager = new SecurityManager()
  }
  return defaultSecurityManager
}

/**
 * 민감한 데이터 마스킹
 */
export function maskSensitiveData(data: any): any {
  const sensitiveKeys = [
    'password',
    'secret',
    'key',
    'token',
    'auth',
    'credential',
    'private'
  ]

  if (typeof data === 'string') {
    return data.length > 4 ? `${data.slice(0, 2)}***${data.slice(-2)}` : '***'
  }

  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveData(item))
  }

  if (typeof data === 'object' && data !== null) {
    const masked: any = {}

    for (const [key, value] of Object.entries(data)) {
      const isSensitive = sensitiveKeys.some(sensitiveKey =>
        key.toLowerCase().includes(sensitiveKey.toLowerCase())
      )

      masked[key] = isSensitive ? '***MASKED***' : maskSensitiveData(value)
    }

    return masked
  }

  return data
}