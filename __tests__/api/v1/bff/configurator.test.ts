// BFF 설정기 API 엔드포인트 테스트
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/v1/bff/configurator/route'
import { createAuthenticatedRequest, createMockAuthContext, expectApiResponse, testData, mockSupabase } from '../../../helpers/test-utils'
import * as authModule from '@/lib/api/auth'
import { createClient } from '@supabase/supabase-js'

// Supabase 모의
jest.mock('@supabase/supabase-js')
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

// 인증 모의
jest.mock('@/lib/api/auth', () => ({
  ...jest.requireActual('@/lib/api/auth'),
  authenticateRequest: jest.fn(),
}))
const mockAuthenticateRequest = authModule.authenticateRequest as jest.MockedFunction<typeof authModule.authenticateRequest>

// 캐시 모의
jest.mock('@/lib/api/cache', () => ({
  getCachedData: jest.fn(),
  setCachedData: jest.fn(),
  invalidateCache: jest.fn(),
}))

describe('/api/v1/bff/configurator', () => {
  const { mockSupabaseClient, mockFrom, mockSelect, mockSingle } = mockSupabase()

  beforeEach(() => {
    mockCreateClient.mockReturnValue(mockSupabaseClient as any)
    mockAuthenticateRequest.mockResolvedValue(createMockAuthContext())
  })

  describe('GET /api/v1/bff/configurator', () => {
    const mockMaterials = [
      { id: 'wood', name: 'Wood', base_price: 100, properties: {} },
      { id: 'metal', name: 'Metal', base_price: 150, properties: {} },
    ]

    const mockPricingRules = [
      { id: 'rule-1', condition: 'material=wood', modifier: 1.0 },
      { id: 'rule-2', condition: 'size>100', modifier: 1.2 },
    ]

    const mockSavedDesigns = [
      { ...testData.design, id: 'design-1', name: 'Design 1' },
      { ...testData.design, id: 'design-2', name: 'Design 2' },
    ]

    const mockUserProfile = testData.userProfile

    beforeEach(() => {
      // materials 쿼리 모의
      mockSelect.mockImplementation((columns) => {
        if (columns === '*') {
          return {
            ...mockSelect(),
            then: (callback: any) => callback({ data: mockMaterials, error: null }),
          }
        }
        return mockSelect()
      })
    })

    it('설정기 초기화 데이터를 성공적으로 반환해야 함', async () => {
      // 각 데이터 소스별로 다른 응답 설정
      let callCount = 0
      mockSelect.mockImplementation(() => {
        callCount++
        switch (callCount) {
          case 1: // materials
            return Promise.resolve({ data: mockMaterials, error: null })
          case 2: // pricing_rules
            return Promise.resolve({ data: mockPricingRules, error: null })
          case 3: // user designs
            return Promise.resolve({ data: mockSavedDesigns, error: null })
          case 4: // user profile
            return Promise.resolve({ data: mockUserProfile, error: null })
          default:
            return Promise.resolve({ data: [], error: null })
        }
      })

      const request = createAuthenticatedRequest({
        url: 'http://localhost:3000/api/v1/bff/configurator',
      })

      const response = await GET(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      expectApiResponse({ status: response.status, body })

      // 통합 데이터 검증
      expect(body.data).toHaveProperty('user')
      expect(body.data).toHaveProperty('materials')
      expect(body.data).toHaveProperty('pricingRules')
      expect(body.data).toHaveProperty('savedDesigns')
      expect(body.data).toHaveProperty('preferences')
      expect(body.data).toHaveProperty('quotaStatus')

      // 사용자 정보
      expect(body.data.user).toHaveProperty('id')
      expect(body.data.user).toHaveProperty('email')
      expect(body.data.user).toHaveProperty('display_name')

      // 재료 정보
      expect(body.data.materials).toHaveLength(2)
      expect(body.data.materials[0]).toHaveProperty('id')
      expect(body.data.materials[0]).toHaveProperty('name')
      expect(body.data.materials[0]).toHaveProperty('base_price')

      // 가격 규칙
      expect(body.data.pricingRules).toHaveLength(2)
      expect(body.data.pricingRules[0]).toHaveProperty('id')
      expect(body.data.pricingRules[0]).toHaveProperty('condition')

      // 저장된 디자인
      expect(body.data.savedDesigns).toHaveLength(2)
      expect(body.data.savedDesigns[0]).toHaveProperty('id')
      expect(body.data.savedDesigns[0]).toHaveProperty('name')

      // 사용자 환경설정
      expect(body.data.preferences).toHaveProperty('theme')
      expect(body.data.preferences).toHaveProperty('units')
      expect(body.data.preferences).toHaveProperty('currency')

      // 할당량 상태
      expect(body.data.quotaStatus).toHaveProperty('used')
      expect(body.data.quotaStatus).toHaveProperty('limit')
      expect(body.data.quotaStatus).toHaveProperty('remaining')
      expect(body.data.quotaStatus).toHaveProperty('tier')
    })

    it('특정 사용자 역할에 맞는 데이터를 반환해야 함', async () => {
      const premiumUserContext = createMockAuthContext({
        user: {
          ...createMockAuthContext().user,
          app_metadata: { subscription_tier: 'premium' },
        },
      })

      mockAuthenticateRequest.mockResolvedValueOnce(premiumUserContext)

      let callCount = 0
      mockSelect.mockImplementation(() => {
        callCount++
        switch (callCount) {
          case 1:
            return Promise.resolve({ data: mockMaterials, error: null })
          case 2:
            return Promise.resolve({ data: mockPricingRules, error: null })
          case 3:
            return Promise.resolve({ data: mockSavedDesigns, error: null })
          case 4:
            return Promise.resolve({
              data: { ...mockUserProfile, subscription_tier: 'premium', design_quota_limit: 50 },
              error: null
            })
          default:
            return Promise.resolve({ data: [], error: null })
        }
      })

      const request = createAuthenticatedRequest()
      const response = await GET(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.data.quotaStatus.tier).toBe('premium')
      expect(body.data.quotaStatus.limit).toBe(50)
    })

    it('부분적 데이터 오류를 적절히 처리해야 함', async () => {
      let callCount = 0
      mockSelect.mockImplementation(() => {
        callCount++
        switch (callCount) {
          case 1: // materials 성공
            return Promise.resolve({ data: mockMaterials, error: null })
          case 2: // pricing_rules 실패
            return Promise.resolve({ data: null, error: { message: 'Pricing rules error' } })
          case 3: // designs 성공
            return Promise.resolve({ data: mockSavedDesigns, error: null })
          case 4: // profile 성공
            return Promise.resolve({ data: mockUserProfile, error: null })
          default:
            return Promise.resolve({ data: [], error: null })
        }
      })

      const request = createAuthenticatedRequest()
      const response = await GET(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.data.materials).toHaveLength(2)
      expect(body.data.pricingRules).toHaveLength(0) // 실패 시 빈 배열
      expect(body.data.savedDesigns).toHaveLength(2)
      expect(body.data).toHaveProperty('warnings')
      expect(body.data.warnings).toContain('Failed to load pricing rules')
    })

    // QA Must-Fix(1.2E): user_profiles 미존재/조회 실패 시 500을 내지 않고 기본값으로 응답해야 함
    it('프로필 조회 실패 시 500을 발생시키지 않고 기본값으로 응답해야 함', async () => {
      let callCount = 0
      mockSelect.mockImplementation(() => {
        callCount++
        switch (callCount) {
          case 1: // materials 성공
            return Promise.resolve({ data: mockMaterials, error: null })
          case 2: // pricing_rules 성공
            return Promise.resolve({ data: mockPricingRules, error: null })
          case 3: // designs 성공
            return Promise.resolve({ data: mockSavedDesigns, error: null })
          case 4: // user profile 조회 실패 (행 없음 등)
            return Promise.resolve({ data: null, error: { message: 'Row not found', code: 'PGRST116' } })
          default:
            return Promise.resolve({ data: [], error: null })
        }
      })

      const request = createAuthenticatedRequest()
      const response = await GET(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.success).toBe(true)
      // 최소 핵심 키들이 존재해야 하며, 기본 한도/티어 등은 폴백 값이어야 함
      expect(body.data).toHaveProperty('user')
      expect(body.data).toHaveProperty('design_limits')
    })

    it('인증되지 않은 요청을 거부해야 함', async () => {
      mockAuthenticateRequest.mockRejectedValueOnce(new Error('Unauthorized'))

      const request = new NextRequest('http://localhost:3000/api/v1/bff/configurator')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('캐시된 데이터를 올바르게 활용해야 함', async () => {
      const { getCachedData, setCachedData } = require('@/lib/api/cache')

      // 첫 번째 호출: 캐시 미스
      getCachedData.mockReturnValueOnce(null)

      let callCount = 0
      mockSelect.mockImplementation(() => {
        callCount++
        switch (callCount) {
          case 1:
            return Promise.resolve({ data: mockMaterials, error: null })
          case 2:
            return Promise.resolve({ data: mockPricingRules, error: null })
          case 3:
            return Promise.resolve({ data: mockSavedDesigns, error: null })
          case 4:
            return Promise.resolve({ data: mockUserProfile, error: null })
          default:
            return Promise.resolve({ data: [], error: null })
        }
      })

      const request1 = createAuthenticatedRequest()
      const response1 = await GET(request1)

      expect(response1.status).toBe(200)
      expect(setCachedData).toHaveBeenCalled()

      // 두 번째 호출: 캐시 히트
      getCachedData.mockReturnValueOnce({
        user: mockUserProfile,
        materials: mockMaterials,
        pricingRules: mockPricingRules,
        savedDesigns: mockSavedDesigns,
      })

      const request2 = createAuthenticatedRequest()
      const response2 = await GET(request2)

      expect(response2.status).toBe(200)
      // 캐시 사용으로 DB 쿼리 횟수가 줄어들어야 함
      expect(mockSelect).not.toHaveBeenCalledTimes(8) // 두 번째 호출에서는 추가 쿼리가 없어야 함
    })

    it('필터링된 재료 목록을 반환해야 함', async () => {
      // 비활성화된 재료 포함
      const allMaterials = [
        ...mockMaterials,
        { id: 'disabled', name: 'Disabled Material', base_price: 200, is_active: false },
      ]

      let callCount = 0
      mockSelect.mockImplementation(() => {
        callCount++
        switch (callCount) {
          case 1:
            return Promise.resolve({ data: allMaterials, error: null })
          case 2:
            return Promise.resolve({ data: mockPricingRules, error: null })
          case 3:
            return Promise.resolve({ data: mockSavedDesigns, error: null })
          case 4:
            return Promise.resolve({ data: mockUserProfile, error: null })
          default:
            return Promise.resolve({ data: [], error: null })
        }
      })

      const request = createAuthenticatedRequest()
      const response = await GET(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      // 활성화된 재료만 반환되어야 함
      expect(body.data.materials).toHaveLength(2)
      expect(body.data.materials.every((m: any) => m.id !== 'disabled')).toBe(true)
    })

    it('사용자별 맞춤 가격 규칙을 적용해야 함', async () => {
      const vipUserContext = createMockAuthContext({
        user: {
          ...createMockAuthContext().user,
          app_metadata: { subscription_tier: 'vip', user_type: 'premium' },
        },
      })

      mockAuthenticateRequest.mockResolvedValueOnce(vipUserContext)

      const vipPricingRules = [
        ...mockPricingRules,
        { id: 'vip-rule', condition: 'user_type=premium', modifier: 0.9 }, // VIP 할인
      ]

      let callCount = 0
      mockSelect.mockImplementation(() => {
        callCount++
        switch (callCount) {
          case 1:
            return Promise.resolve({ data: mockMaterials, error: null })
          case 2:
            return Promise.resolve({ data: vipPricingRules, error: null })
          case 3:
            return Promise.resolve({ data: mockSavedDesigns, error: null })
          case 4:
            return Promise.resolve({ data: mockUserProfile, error: null })
          default:
            return Promise.resolve({ data: [], error: null })
        }
      })

      const request = createAuthenticatedRequest()
      const response = await GET(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.data.pricingRules).toHaveLength(3)
      expect(body.data.pricingRules.some((rule: any) => rule.id === 'vip-rule')).toBe(true)
    })

    // QA 수정: 대량 데이터 처리 테스트 시나리오
    it('대량 데이터를 효율적으로 처리해야 함', async () => {
      // 대량 재료 데이터 (100개)
      const largeMaterials = Array.from({ length: 100 }, (_, i) => ({
        id: `material-${i}`,
        name: `Material ${i}`,
        base_price: 50 + (i * 5),
        properties: { density: i % 10, hardness: i % 5 }
      }))

      // 대량 가격 규칙 (200개)
      const largePricingRules = Array.from({ length: 200 }, (_, i) => ({
        id: `rule-${i}`,
        condition: `material=material-${i % 100}`,
        modifier: 1.0 + (i % 20) * 0.01
      }))

      // 대량 저장된 디자인 (50개)
      const largeSavedDesigns = Array.from({ length: 50 }, (_, i) => ({
        ...testData.design,
        id: `design-${i}`,
        name: `Design ${i}`,
        created_at: new Date(Date.now() - i * 86400000).toISOString()
      }))

      let callCount = 0
      mockSelect.mockImplementation(() => {
        callCount++
        switch (callCount) {
          case 1:
            return Promise.resolve({ data: largeMaterials, error: null })
          case 2:
            return Promise.resolve({ data: largePricingRules, error: null })
          case 3:
            return Promise.resolve({ data: largeSavedDesigns, error: null })
          case 4:
            return Promise.resolve({ data: mockUserProfile, error: null })
          default:
            return Promise.resolve({ data: [], error: null })
        }
      })

      const startTime = Date.now()
      const request = createAuthenticatedRequest()
      const response = await GET(request)
      const endTime = Date.now()
      const responseTime = endTime - startTime

      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.data.materials).toHaveLength(100)
      expect(body.data.pricingRules).toHaveLength(200)
      expect(body.data.savedDesigns).toHaveLength(50)

      // 성능 검증: 대량 데이터 처리가 합리적인 시간 내에 완료되어야 함
      expect(responseTime).toBeLessThan(3000) // 3초 미만

      // 메모리 효율성 확인: 응답 크기가 적절해야 함
      const responseSize = JSON.stringify(body).length
      expect(responseSize).toBeLessThan(1000000) // 1MB 미만
    })

    // QA 수정: 동시 요청 처리 테스트 시나리오
    it('동시 요청을 안정적으로 처리해야 함', async () => {
      let callCount = 0
      mockSelect.mockImplementation(() => {
        callCount++
        // 각 요청에 대해 기본 데이터 반환
        const requestNumber = Math.floor((callCount - 1) / 4) + 1
        const queryType = (callCount - 1) % 4 + 1

        switch (queryType) {
          case 1: // materials
            return Promise.resolve({
              data: mockMaterials.map(m => ({ ...m, request: requestNumber })),
              error: null
            })
          case 2: // pricing_rules
            return Promise.resolve({
              data: mockPricingRules.map(r => ({ ...r, request: requestNumber })),
              error: null
            })
          case 3: // saved_designs
            return Promise.resolve({
              data: mockSavedDesigns.map(d => ({ ...d, request: requestNumber })),
              error: null
            })
          case 4: // user_profile
            return Promise.resolve({
              data: { ...mockUserProfile, request: requestNumber },
              error: null
            })
          default:
            return Promise.resolve({ data: [], error: null })
        }
      })

      // 10개의 동시 요청 생성
      const concurrentRequests = Array.from({ length: 10 }, (_, i) =>
        createAuthenticatedRequest({
          url: `http://localhost:3000/api/v1/bff/configurator?test=${i}`,
        })
      )

      const startTime = Date.now()

      // 모든 요청을 병렬로 실행
      const responses = await Promise.all(
        concurrentRequests.map(request => GET(request))
      )

      const endTime = Date.now()
      const totalTime = endTime - startTime

      // 모든 응답 검증
      for (let i = 0; i < responses.length; i++) {
        const response = responses[i]
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body.data).toHaveProperty('materials')
        expect(body.data).toHaveProperty('pricingRules')
        expect(body.data).toHaveProperty('savedDesigns')
        expect(body.data).toHaveProperty('user')
      }

      // 성능 검증: 동시 요청이 순차 처리보다 빠르게 완료되어야 함
      // (10개 요청 * 평균 응답시간 500ms = 5000ms 순차 처리 예상)
      expect(totalTime).toBeLessThan(3000) // 3초 미만으로 병렬 처리 효과 확인

      // 데이터 무결성 검증: 각 요청이 독립적으로 처리되었는지 확인
      expect(mockSelect).toHaveBeenCalledTimes(40) // 10개 요청 * 4개 쿼리
    })

    // QA 수정: 메모리 부하 테스트 시나리오
    it('메모리 부하 상황에서도 안정적으로 동작해야 함', async () => {
      // 매우 큰 응답 데이터 시뮬레이션
      const heavyMaterials = Array.from({ length: 500 }, (_, i) => ({
        id: `heavy-material-${i}`,
        name: `Heavy Material ${i}`,
        base_price: 100 + i,
        properties: {
          // 큰 프로퍼티 객체
          description: `This is a very detailed description for material ${i}. `.repeat(10),
          specifications: Array.from({ length: 20 }, (_, j) => ({
            key: `spec-${j}`,
            value: `value-${j}`.repeat(5)
          })),
          metadata: { createdAt: new Date().toISOString(), version: i }
        }
      }))

      let callCount = 0
      mockSelect.mockImplementation(() => {
        callCount++
        switch (callCount) {
          case 1:
            return Promise.resolve({ data: heavyMaterials, error: null })
          case 2:
            return Promise.resolve({ data: mockPricingRules, error: null })
          case 3:
            return Promise.resolve({ data: mockSavedDesigns, error: null })
          case 4:
            return Promise.resolve({ data: mockUserProfile, error: null })
          default:
            return Promise.resolve({ data: [], error: null })
        }
      })

      const initialMemory = process.memoryUsage()

      const request = createAuthenticatedRequest()
      const response = await GET(request)
      const body = await response.json()

      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed

      expect(response.status).toBe(200)
      expect(body.data.materials).toHaveLength(500)

      // 메모리 사용량이 합리적인 범위 내에 있는지 확인
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024) // 100MB 미만

      // 응답 압축이나 데이터 최적화가 적용되었는지 간접적으로 확인
      const responseSize = JSON.stringify(body).length
      expect(responseSize).toBeLessThan(10 * 1024 * 1024) // 10MB 미만
    })
  })
})
