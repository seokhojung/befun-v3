/**
 * Drawing Generation API Tests
 * Story 4.1: Drawing Generation and Design Management
 */

import { POST } from '@/app/api/v1/drawings/generate/route'
import { NextRequest } from 'next/server'

// Mock dependencies
jest.mock('@/lib/supabase/server')
jest.mock('@/lib/api/rate-limiting')
jest.mock('@/lib/drawing/drawing-service')

describe('POST /api/v1/drawings/generate', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock Supabase auth
    const { createClient } = require('@/lib/supabase/server')
    createClient.mockReturnValue({
      auth: {
        getUser: jest.fn(() =>
          Promise.resolve({
            data: { user: mockUser },
            error: null,
          })
        ),
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() =>
              Promise.resolve({
                data: {
                  id: 'design-123',
                  user_id: 'user-123',
                },
                error: null,
              })
            ),
          })),
        })),
      })),
    })

    // Mock rate limiter
    const { rateLimiter } = require('@/lib/api/rate-limiting')
    rateLimiter.check = jest.fn(() =>
      Promise.resolve({
        allowed: true,
        remaining: 9,
        limit: 10,
      })
    )

    // Mock drawing service
    const drawingService = require('@/lib/drawing/drawing-service')
    drawingService.createDrawingJob = jest.fn(() =>
      Promise.resolve({
        id: 'job-123',
        user_id: 'user-123',
        design_id: 'design-123',
        status: 'pending',
        progress: 0,
      })
    )
    drawingService.processDrawingJob = jest.fn(() => Promise.resolve())
  })

  test('should create drawing job successfully', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/drawings/generate', {
      method: 'POST',
      body: JSON.stringify({
        designId: 'design-123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(202)
    expect(data.success).toBe(true)
    expect(data.jobId).toBe('job-123')
    expect(data.message).toContain('도면 생성이 시작되었습니다')
  })

  test('should return 401 if user not authenticated', async () => {
    const { createClient } = require('@/lib/supabase/server')
    createClient.mockReturnValueOnce({
      auth: {
        getUser: jest.fn(() =>
          Promise.resolve({
            data: { user: null },
            error: new Error('Not authenticated'),
          })
        ),
      },
    })

    const request = new NextRequest('http://localhost:3000/api/v1/drawings/generate', {
      method: 'POST',
      body: JSON.stringify({
        designId: 'design-123',
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(401)
  })

  test('should return 429 if rate limit exceeded', async () => {
    const { rateLimiter } = require('@/lib/api/rate-limiting')
    rateLimiter.check.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      limit: 10,
      retryAfter: 30,
    })

    const request = new NextRequest('http://localhost:3000/api/v1/drawings/generate', {
      method: 'POST',
      body: JSON.stringify({
        designId: 'design-123',
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(429)
  })

  test('should return 404 if design not found', async () => {
    const { createClient } = require('@/lib/supabase/server')
    createClient.mockReturnValueOnce({
      auth: {
        getUser: jest.fn(() =>
          Promise.resolve({
            data: { user: mockUser },
            error: null,
          })
        ),
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() =>
              Promise.resolve({
                data: null,
                error: { message: 'Not found' },
              })
            ),
          })),
        })),
      })),
    })

    const request = new NextRequest('http://localhost:3000/api/v1/drawings/generate', {
      method: 'POST',
      body: JSON.stringify({
        designId: 'non-existent',
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(404)
  })

  test('should return 401 if user does not own design', async () => {
    const { createClient } = require('@/lib/supabase/server')
    createClient.mockReturnValueOnce({
      auth: {
        getUser: jest.fn(() =>
          Promise.resolve({
            data: { user: mockUser },
            error: null,
          })
        ),
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() =>
              Promise.resolve({
                data: {
                  id: 'design-123',
                  user_id: 'different-user',
                },
                error: null,
              })
            ),
          })),
        })),
      })),
    })

    const request = new NextRequest('http://localhost:3000/api/v1/drawings/generate', {
      method: 'POST',
      body: JSON.stringify({
        designId: 'design-123',
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(401)
  })
})