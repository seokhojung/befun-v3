// 보안 검증 테스트
// Story 3.1: 장바구니 및 결제 연동

import { SecurityManager, getSecurityManager, maskSensitiveData } from '@/lib/cart/security'
import { jest } from '@jest/globals'

describe('SecurityManager', () => {
  let securityManager: SecurityManager

  beforeEach(() => {
    // 테스트용 고정 시크릿 키 사용
    const testSecretKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    securityManager = new SecurityManager(testSecretKey)
  })

  describe('암호화 및 복호화', () => {
    it('데이터 암호화 및 복호화', () => {
      const originalData = 'test data for encryption'

      const encrypted = securityManager.encrypt(originalData)
      expect(encrypted.encrypted).toBeDefined()
      expect(encrypted.iv).toBeDefined()
      expect(encrypted.tag).toBeDefined()

      const decrypted = securityManager.decrypt(encrypted)
      expect(decrypted).toBe(originalData)
    })

    it('복잡한 JSON 데이터 암호화', () => {
      const complexData = {
        userId: 'user-123',
        cartData: {
          items: [{ id: 1, name: 'desk' }],
          total: 100000
        },
        timestamp: Date.now()
      }

      const dataString = JSON.stringify(complexData)
      const encrypted = securityManager.encrypt(dataString)
      const decrypted = securityManager.decrypt(encrypted)
      const parsedData = JSON.parse(decrypted)

      expect(parsedData).toEqual(complexData)
    })

    it('잘못된 암호화 데이터 복호화 실패', () => {
      const invalidEncrypted = {
        encrypted: 'invalid',
        iv: 'invalid',
        tag: 'invalid'
      }

      expect(() => {
        securityManager.decrypt(invalidEncrypted)
      }).toThrow()
    })

    it('변조된 암호화 데이터 감지', () => {
      const originalData = 'sensitive information'
      const encrypted = securityManager.encrypt(originalData)

      // 암호화된 데이터 변조
      encrypted.encrypted = encrypted.encrypted.slice(0, -2) + '00'

      expect(() => {
        securityManager.decrypt(encrypted)
      }).toThrow()
    })
  })

  describe('장바구니 ID 생성 및 검증', () => {
    it('장바구니 ID 생성 및 파싱', () => {
      const userId = 'user-123'
      const designId = 'design-456'
      const timestamp = 1234567890000

      const cartId = securityManager.generateCartId(userId, designId, timestamp)
      expect(cartId).toMatch(/^cart_/)

      const parsed = securityManager.parseCartId(cartId)
      expect(parsed.isValid).toBe(true)
      expect(parsed.userId).toBe(userId)
      expect(parsed.designId).toBe(designId)
      expect(parsed.timestamp).toBe(timestamp)
    })

    it('잘못된 형식의 장바구니 ID 처리', () => {
      const invalidCartIds = [
        'invalid-cart-id',
        'cart_invalid_base64',
        'cart_',
        ''
      ]

      invalidCartIds.forEach(cartId => {
        const parsed = securityManager.parseCartId(cartId)
        expect(parsed.isValid).toBe(false)
      })
    })

    it('변조된 장바구니 ID 감지', () => {
      const cartId = securityManager.generateCartId('user-123', 'design-456')
      const tamperedCartId = cartId.slice(0, -5) + 'XXXXX'

      const parsed = securityManager.parseCartId(tamperedCartId)
      expect(parsed.isValid).toBe(false)
    })
  })

  describe('API 인증 토큰', () => {
    it('인증 토큰 생성 및 검증', () => {
      const tokenData = {
        userId: 'user-123',
        cartId: 'cart-456',
        expiresIn: 3600 // 1시간
      }

      const token = securityManager.generateAuthToken(tokenData)
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)

      const verified = securityManager.verifyAuthToken(token)
      expect(verified.isValid).toBe(true)
      expect(verified.userId).toBe(tokenData.userId)
      expect(verified.cartId).toBe(tokenData.cartId)
      expect(verified.isExpired).toBe(false)
    })

    it('만료된 토큰 검증', () => {
      const tokenData = {
        userId: 'user-123',
        cartId: 'cart-456',
        expiresIn: -1 // 이미 만료
      }

      const token = securityManager.generateAuthToken(tokenData)
      const verified = securityManager.verifyAuthToken(token)

      expect(verified.isValid).toBe(false)
      expect(verified.isExpired).toBe(true)
    })

    it('변조된 토큰 감지', () => {
      const token = securityManager.generateAuthToken({
        userId: 'user-123',
        cartId: 'cart-456'
      })

      const tamperedToken = token.slice(0, -5) + 'XXXXX'
      const verified = securityManager.verifyAuthToken(tamperedToken)

      expect(verified.isValid).toBe(false)
    })
  })

  describe('데이터 무결성 검증', () => {
    it('데이터 해시 생성 및 검증', () => {
      const testData = {
        width_cm: 120,
        depth_cm: 60,
        height_cm: 75,
        material: 'wood',
        price: 100000
      }

      const hash = securityManager.generateDataHash(testData)
      expect(typeof hash).toBe('string')
      expect(hash.length).toBe(64) // SHA-256 해시 길이

      const isValid = securityManager.verifyDataIntegrity(testData, hash)
      expect(isValid).toBe(true)
    })

    it('변조된 데이터 감지', () => {
      const originalData = {
        price: 100000,
        material: 'wood'
      }

      const hash = securityManager.generateDataHash(originalData)

      const tamperedData = {
        price: 1000, // 가격 변조
        material: 'wood'
      }

      const isValid = securityManager.verifyDataIntegrity(tamperedData, hash)
      expect(isValid).toBe(false)
    })

    it('객체 순서에 관계없이 동일한 해시 생성', () => {
      const data1 = { a: 1, b: 2, c: 3 }
      const data2 = { c: 3, a: 1, b: 2 }

      const hash1 = securityManager.generateDataHash(data1)
      const hash2 = securityManager.generateDataHash(data2)

      expect(hash1).toBe(hash2)
    })

    it('중첩된 객체의 정규화', () => {
      const data1 = {
        user: { id: 123, name: 'test' },
        items: [{ id: 1 }, { id: 2 }]
      }

      const data2 = {
        items: [{ id: 2 }, { id: 1 }], // 배열 순서 다름
        user: { name: 'test', id: 123 } // 객체 순서 다름
      }

      const hash1 = securityManager.generateDataHash(data1)
      const hash2 = securityManager.generateDataHash(data2)

      expect(hash1).toBe(hash2)
    })
  })

  describe('CSRF 토큰', () => {
    it('CSRF 토큰 생성 및 검증', () => {
      const sessionId = 'session-123'

      const token = securityManager.generateCSRFToken(sessionId)
      expect(typeof token).toBe('string')
      expect(token).toMatch(/^\d+\.[\da-f]+$/) // timestamp.hash 형식

      const isValid = securityManager.verifyCSRFToken(token, sessionId)
      expect(isValid).toBe(true)
    })

    it('잘못된 세션 ID로 CSRF 토큰 검증 실패', () => {
      const token = securityManager.generateCSRFToken('session-123')
      const isValid = securityManager.verifyCSRFToken(token, 'session-456')

      expect(isValid).toBe(false)
    })

    it('만료된 CSRF 토큰 검증 실패', () => {
      const sessionId = 'session-123'
      const token = securityManager.generateCSRFToken(sessionId)

      // maxAge를 0으로 설정하여 즉시 만료
      const isValid = securityManager.verifyCSRFToken(token, sessionId, 0)
      expect(isValid).toBe(false)
    })

    it('변조된 CSRF 토큰 감지', () => {
      const sessionId = 'session-123'
      const token = securityManager.generateCSRFToken(sessionId)

      const [timestamp] = token.split('.')
      const tamperedToken = `${timestamp}.0000000000000000`

      const isValid = securityManager.verifyCSRFToken(tamperedToken, sessionId)
      expect(isValid).toBe(false)
    })
  })

  describe('에러 처리', () => {
    it('잘못된 시크릿 키 길이 에러', () => {
      expect(() => {
        new SecurityManager('too_short_key')
      }).toThrow('Invalid secret key length')
    })

    it('프로덕션 환경에서 시크릿 키 누락 에러', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      expect(() => {
        new SecurityManager()
      }).toThrow('Secret key must be provided in production environment')

      process.env.NODE_ENV = originalEnv
    })
  })
})

describe('getSecurityManager', () => {
  it('싱글톤 인스턴스 반환', () => {
    const manager1 = getSecurityManager()
    const manager2 = getSecurityManager()

    expect(manager1).toBe(manager2)
  })
})

describe('maskSensitiveData', () => {
  it('문자열 마스킹', () => {
    expect(maskSensitiveData('password123')).toBe('pa***23')
    expect(maskSensitiveData('test')).toBe('te***st')
    expect(maskSensitiveData('ab')).toBe('***')
  })

  it('객체의 민감한 필드 마스킹', () => {
    const data = {
      username: 'john',
      password: 'secret123',
      api_key: 'sk-1234567890',
      auth_token: 'bearer_token_123',
      normal_field: 'normal_value'
    }

    const masked = maskSensitiveData(data)

    expect(masked.username).toBe('john')
    expect(masked.password).toBe('***MASKED***')
    expect(masked.api_key).toBe('***MASKED***')
    expect(masked.auth_token).toBe('***MASKED***')
    expect(masked.normal_field).toBe('normal_value')
  })

  it('중첩된 객체의 민감한 필드 마스킹', () => {
    const data = {
      user: {
        name: 'john',
        credentials: {
          password: 'secret',
          private_key: 'rsa_key_123'
        }
      },
      config: {
        api_secret: 'secret_key'
      }
    }

    const masked = maskSensitiveData(data)

    expect(masked.user.name).toBe('john')
    expect(masked.user.credentials.password).toBe('***MASKED***')
    expect(masked.user.credentials.private_key).toBe('***MASKED***')
    expect(masked.config.api_secret).toBe('***MASKED***')
  })

  it('배열 내 민감한 데이터 마스킹', () => {
    const data = [
      { name: 'user1', token: 'token123' },
      { name: 'user2', secret: 'secret456' }
    ]

    const masked = maskSensitiveData(data)

    expect(masked[0].name).toBe('user1')
    expect(masked[0].token).toBe('***MASKED***')
    expect(masked[1].name).toBe('user2')
    expect(masked[1].secret).toBe('***MASKED***')
  })

  it('null 및 undefined 값 처리', () => {
    expect(maskSensitiveData(null)).toBe(null)
    expect(maskSensitiveData(undefined)).toBe(undefined)
    expect(maskSensitiveData({ password: null })).toEqual({ password: '***MASKED***' })
  })

  it('기본 타입 값 처리', () => {
    expect(maskSensitiveData(123)).toBe(123)
    expect(maskSensitiveData(true)).toBe(true)
    expect(maskSensitiveData(false)).toBe(false)
  })
})

describe('보안 시나리오 테스트', () => {
  let securityManager: SecurityManager

  beforeEach(() => {
    const testSecretKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    securityManager = new SecurityManager(testSecretKey)
  })

  it('가격 조작 시도 감지', () => {
    const originalPriceData = {
      width_cm: 120,
      depth_cm: 60,
      height_cm: 75,
      material: 'wood',
      calculated_price: 116700
    }

    const hash = securityManager.generateDataHash(originalPriceData)

    // 가격 조작 시도
    const manipulatedData = {
      ...originalPriceData,
      calculated_price: 1000
    }

    const isValid = securityManager.verifyDataIntegrity(manipulatedData, hash)
    expect(isValid).toBe(false)
  })

  it('세션 하이재킹 방지', () => {
    const userASession = 'session-user-a'
    const userBSession = 'session-user-b'

    const userAToken = securityManager.generateCSRFToken(userASession)

    // 사용자 B가 사용자 A의 토큰을 사용하려고 시도
    const isValid = securityManager.verifyCSRFToken(userAToken, userBSession)
    expect(isValid).toBe(false)
  })

  it('타임 기반 공격 방지', () => {
    const userId = 'user-123'
    const designId = 'design-456'

    const cartId1 = securityManager.generateCartId(userId, designId, 1000000000000)
    const cartId2 = securityManager.generateCartId(userId, designId, 1000000000001)

    // 시간이 다르면 다른 cartId 생성
    expect(cartId1).not.toBe(cartId2)

    // 각각 올바르게 파싱됨
    const parsed1 = securityManager.parseCartId(cartId1)
    const parsed2 = securityManager.parseCartId(cartId2)

    expect(parsed1.isValid).toBe(true)
    expect(parsed2.isValid).toBe(true)
    expect(parsed1.timestamp).not.toBe(parsed2.timestamp)
  })

  it('리플레이 공격 방지', () => {
    const tokenData = {
      userId: 'user-123',
      cartId: 'cart-456',
      expiresIn: 1 // 1초 후 만료
    }

    const token = securityManager.generateAuthToken(tokenData)

    // 즉시 검증 - 성공
    const verification1 = securityManager.verifyAuthToken(token)
    expect(verification1.isValid).toBe(true)

    // 2초 후 검증 시뮬레이션 - 실제로는 setTimeout 대신 만료 시간 조작
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 2000)

    const verification2 = securityManager.verifyAuthToken(token)
    expect(verification2.isValid).toBe(false)
    expect(verification2.isExpired).toBe(true)

    jest.restoreAllMocks()
  })
})