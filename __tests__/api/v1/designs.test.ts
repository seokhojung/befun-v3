// 디자인 API 엔드포인트 테스트
import { NextRequest } from 'next/server'
import { GET, POST, PUT, DELETE } from '@/app/api/v1/designs/route'
import { createAuthenticatedRequest, createMockAuthContext, expectApiResponse, expectPaginatedResponse, testData, mockSupabase } from '../../helpers/test-utils'
import * as authModule from '@/lib/api/auth'
import { createClient } from '@supabase/supabase-js'

// Supabase 모의
jest.mock('@supabase/supabase-js')
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

// 인증 모의
jest.mock('@/lib/api/auth')
const mockValidateAuth = authModule.validateAuth as jest.MockedFunction<typeof authModule.validateAuth>

describe('/api/v1/designs', () => {
  const { mockSupabaseClient, mockFrom, mockSelect, mockInsert, mockUpdate, mockDelete, mockSingle } = mockSupabase()

  beforeEach(() => {
    mockCreateClient.mockReturnValue(mockSupabaseClient as any)
    mockValidateAuth.mockResolvedValue(createMockAuthContext())
  })

  describe('GET /api/v1/designs', () => {
    it('사용자의 디자인 목록을 성공적으로 반환해야 함', async () => {
      const mockDesigns = [
        { ...testData.design, id: 'design-1' },
        { ...testData.design, id: 'design-2' },
      ]

      mockSelect.mockResolvedValueOnce({
        data: mockDesigns,
        error: null,
        count: 2,
      })

      const request = createAuthenticatedRequest({
        url: 'http://localhost:3000/api/v1/designs?page=1&limit=10',
      })

      const response = await GET(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      expectPaginatedResponse({ status: response.status, body }, 2)
      expect(body.data.items).toHaveLength(2)
      expect(mockFrom).toHaveBeenCalledWith('designs')
      expect(mockSelect).toHaveBeenCalledWith('*, likes_count, views_count')
    })

    it('필터링이 올바르게 작동해야 함', async () => {
      mockSelect.mockResolvedValueOnce({
        data: [testData.design],
        error: null,
        count: 1,
      })

      const request = createAuthenticatedRequest({
        url: 'http://localhost:3000/api/v1/designs?material=wood&status=completed&tags=modern',
      })

      await GET(request)

      expect(mockFrom).toHaveBeenCalledWith('designs')
      expect(mockSelect).toHaveBeenCalled()
    })

    it('정렬이 올바르게 작동해야 함', async () => {
      mockSelect.mockResolvedValueOnce({
        data: [testData.design],
        error: null,
        count: 1,
      })

      const request = createAuthenticatedRequest({
        url: 'http://localhost:3000/api/v1/designs?sort=created_at&order=desc',
      })

      await GET(request)

      expect(mockSelect).toHaveBeenCalled()
    })

    it('인증되지 않은 요청을 거부해야 함', async () => {
      mockValidateAuth.mockRejectedValueOnce(new Error('Unauthorized'))

      const request = new NextRequest('http://localhost:3000/api/v1/designs')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('데이터베이스 오류를 적절히 처리해야 함', async () => {
      mockSelect.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      })

      const request = createAuthenticatedRequest()
      const response = await GET(request)
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('DATABASE_ERROR')
    })
  })

  describe('POST /api/v1/designs', () => {
    const validDesignData = {
      name: 'New Design',
      description: 'A new test design',
      width_cm: 100,
      depth_cm: 50,
      height_cm: 75,
      material: 'wood',
      color: '#8B4513',
      finish: 'matte',
      tags: ['modern'],
      is_public: false,
    }

    it('새 디자인을 성공적으로 생성해야 함', async () => {
      const mockCreatedDesign = { ...testData.design, ...validDesignData }

      mockInsert.mockResolvedValueOnce({
        data: mockCreatedDesign,
        error: null,
      })

      const request = createAuthenticatedRequest({
        method: 'POST',
        body: validDesignData,
      })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(201)
      expectApiResponse({ status: response.status, body }, 201)
      expect(body.data).toMatchObject(validDesignData)
      expect(mockFrom).toHaveBeenCalledWith('designs')
      expect(mockInsert).toHaveBeenCalled()
    })

    it('잘못된 데이터로 요청 시 검증 오류를 반환해야 함', async () => {
      const invalidData = {
        name: '', // 빈 이름
        width_cm: -10, // 음수 크기
      }

      const request = createAuthenticatedRequest({
        method: 'POST',
        body: invalidData,
      })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('VALIDATION_FAILED')
    })

    it('사용자 할당량 초과 시 오류를 반환해야 함', async () => {
      const mockAuthContext = createMockAuthContext({
        user: {
          ...createMockAuthContext().user,
          app_metadata: { subscription_tier: 'free' },
        },
      })

      mockValidateAuth.mockResolvedValueOnce(mockAuthContext)

      // 사용자가 이미 5개의 디자인을 가지고 있다고 가정
      mockSelect.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 5,
      })

      const request = createAuthenticatedRequest({
        method: 'POST',
        body: validDesignData,
      })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(403)
      expect(body.error.code).toBe('QUOTA_EXCEEDED')
    })

    it('데이터베이스 삽입 오류를 적절히 처리해야 함', async () => {
      mockInsert.mockResolvedValueOnce({
        data: null,
        error: { message: 'Insert failed' },
      })

      const request = createAuthenticatedRequest({
        method: 'POST',
        body: validDesignData,
      })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('DATABASE_ERROR')
    })
  })

  describe('PUT /api/v1/designs/[id]', () => {
    const designId = 'design-123'
    const updateData = {
      name: 'Updated Design',
      description: 'Updated description',
      tags: ['modern', 'updated'],
    }

    it('디자인을 성공적으로 업데이트해야 함', async () => {
      const mockUpdatedDesign = { ...testData.design, ...updateData }

      mockUpdate.mockResolvedValueOnce({
        data: mockUpdatedDesign,
        error: null,
      })

      const request = createAuthenticatedRequest({
        method: 'PUT',
        url: `http://localhost:3000/api/v1/designs/${designId}`,
        body: updateData,
      })

      // Mock request params
      const mockRequest = {
        ...request,
        nextUrl: {
          ...request.nextUrl,
          searchParams: new URLSearchParams(),
        },
      }

      Object.defineProperty(mockRequest, 'params', {
        value: { id: designId },
        writable: false,
      })

      const response = await PUT(mockRequest as any)
      const body = await response.json()

      expect(response.status).toBe(200)
      expectApiResponse({ status: response.status, body })
      expect(body.data).toMatchObject(updateData)
      expect(mockUpdate).toHaveBeenCalled()
    })

    it('존재하지 않는 디자인 업데이트 시 404 오류를 반환해야 함', async () => {
      mockUpdate.mockResolvedValueOnce({
        data: null,
        error: { message: 'No rows updated' },
      })

      const request = createAuthenticatedRequest({
        method: 'PUT',
        url: `http://localhost:3000/api/v1/designs/nonexistent-id`,
        body: updateData,
      })

      const mockRequest = {
        ...request,
        params: { id: 'nonexistent-id' },
      }

      const response = await PUT(mockRequest as any)
      const body = await response.json()

      expect(response.status).toBe(404)
      expect(body.error.code).toBe('DESIGN_NOT_FOUND')
    })

    it('다른 사용자의 디자인 업데이트 시 403 오류를 반환해야 함', async () => {
      const mockAuthContext = createMockAuthContext({
        user: { ...createMockAuthContext().user, id: 'different-user-id' },
      })

      mockValidateAuth.mockResolvedValueOnce(mockAuthContext)

      const request = createAuthenticatedRequest({
        method: 'PUT',
        url: `http://localhost:3000/api/v1/designs/${designId}`,
        body: updateData,
      })

      const mockRequest = {
        ...request,
        params: { id: designId },
      }

      const response = await PUT(mockRequest as any)
      const body = await response.json()

      expect(response.status).toBe(403)
      expect(body.error.code).toBe('FORBIDDEN')
    })
  })

  describe('DELETE /api/v1/designs/[id]', () => {
    const designId = 'design-123'

    it('디자인을 성공적으로 삭제해야 함', async () => {
      mockDelete.mockResolvedValueOnce({
        data: null,
        error: null,
      })

      const request = createAuthenticatedRequest({
        method: 'DELETE',
        url: `http://localhost:3000/api/v1/designs/${designId}`,
      })

      const mockRequest = {
        ...request,
        params: { id: designId },
      }

      const response = await DELETE(mockRequest as any)

      expect(response.status).toBe(204)
      expect(mockDelete).toHaveBeenCalled()
    })

    it('존재하지 않는 디자인 삭제 시 404 오류를 반환해야 함', async () => {
      mockDelete.mockResolvedValueOnce({
        data: null,
        error: { message: 'No rows deleted' },
      })

      const request = createAuthenticatedRequest({
        method: 'DELETE',
        url: `http://localhost:3000/api/v1/designs/nonexistent-id`,
      })

      const mockRequest = {
        ...request,
        params: { id: 'nonexistent-id' },
      }

      const response = await DELETE(mockRequest as any)
      const body = await response.json()

      expect(response.status).toBe(404)
      expect(body.error.code).toBe('DESIGN_NOT_FOUND')
    })

    it('다른 사용자의 디자인 삭제 시 403 오류를 반환해야 함', async () => {
      const mockAuthContext = createMockAuthContext({
        user: { ...createMockAuthContext().user, id: 'different-user-id' },
      })

      mockValidateAuth.mockResolvedValueOnce(mockAuthContext)

      const request = createAuthenticatedRequest({
        method: 'DELETE',
        url: `http://localhost:3000/api/v1/designs/${designId}`,
      })

      const mockRequest = {
        ...request,
        params: { id: designId },
      }

      const response = await DELETE(mockRequest as any)
      const body = await response.json()

      expect(response.status).toBe(403)
      expect(body.error.code).toBe('FORBIDDEN')
    })
  })
})