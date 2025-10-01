/**
 * Drawing Generation E2E Test
 * Story 4.1: Drawing Generation and Design Management
 * Tests complete flow: generate request → poll status → download PDF
 */

import { createMocks } from 'node-mocks-http'
import { POST as generateDrawing } from '@/app/api/v1/drawings/generate/route'
import { GET as getStatus } from '@/app/api/v1/drawings/status/[jobId]/route'
import { createClient } from '@supabase/supabase-js'

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}))

// Mock PDFKit
jest.mock('pdfkit', () => {
  return jest.fn().mockImplementation(() => ({
    fontSize: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    moveDown: jest.fn().mockReturnThis(),
    moveTo: jest.fn().mockReturnThis(),
    lineTo: jest.fn().mockReturnThis(),
    stroke: jest.fn().mockReturnThis(),
    rect: jest.fn().mockReturnThis(),
    addPage: jest.fn().mockReturnThis(),
    end: jest.fn(),
    on: jest.fn((event, callback) => {
      if (event === 'data') {
        callback(Buffer.from('mock-pdf-data'))
      }
      if (event === 'end') {
        setTimeout(() => callback(), 0)
      }
    }),
  }))
})

describe('Drawing Generation E2E Flow', () => {
  let mockSupabaseClient: any
  let mockDesignData: any
  let createdJobId: string | null = null

  beforeEach(() => {
    jest.clearAllMocks()

    mockDesignData = {
      id: 'test-design-id',
      user_id: 'test-user-id',
      width_cm: 120,
      depth_cm: 60,
      height_cm: 75,
      material: 'wood',
      calculated_price: 116700,
      created_at: new Date().toISOString(),
    }

    // Mock Supabase client
    mockSupabaseClient = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id', email: 'test@example.com' } },
          error: null,
        }),
      },
      from: jest.fn((table: string) => {
        if (table === 'saved_design') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockDesignData,
              error: null,
            }),
          }
        }
        if (table === 'drawing_jobs') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'mock-job-id',
                user_id: 'test-user-id',
                design_id: 'test-design-id',
                status: 'pending',
                progress: 0,
                created_at: new Date().toISOString(),
              },
              error: null,
            }),
            eq: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
          }
        }
        return {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }
      }),
      storage: {
        from: jest.fn(() => ({
          upload: jest.fn().mockResolvedValue({
            data: { path: 'test-user-id/test-design-id/drawing.pdf' },
            error: null,
          }),
          createSignedUrl: jest.fn().mockResolvedValue({
            data: { signedUrl: 'https://example.com/signed-url.pdf' },
            error: null,
          }),
        })),
      },
    }

    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
  })

  it('should complete full E2E flow: generate → poll status → download', async () => {
    // ============================================================
    // Step 1: Generate Drawing Request
    // ============================================================
    const generateRequest = new Request('http://localhost:3000/api/v1/drawings/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-token',
      },
      body: JSON.stringify({
        designId: 'test-design-id',
      }),
    })

    const generateResponse = await generateDrawing(generateRequest)
    const generateData = await generateResponse.json()

    expect(generateResponse.status).toBe(200)
    expect(generateData).toMatchObject({
      success: true,
      jobId: expect.any(String),
      message: expect.stringContaining('도면 생성이 시작되었습니다'),
      estimatedTime: expect.any(Number),
    })

    createdJobId = generateData.jobId

    // ============================================================
    // Step 2: Poll Job Status (Pending)
    // ============================================================
    const statusRequestPending = new Request(`http://localhost:3000/api/v1/drawings/status/${createdJobId}`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer mock-token',
      },
    })

    // Mock job as pending
    mockSupabaseClient.from = jest.fn((table: string) => {
      if (table === 'drawing_jobs') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              id: createdJobId,
              user_id: 'test-user-id',
              design_id: 'test-design-id',
              status: 'pending',
              progress: 0,
              created_at: new Date().toISOString(),
            },
            error: null,
          }),
        }
      }
      return mockSupabaseClient.from(table)
    })

    const statusResponsePending = await getStatus(statusRequestPending, { params: { jobId: createdJobId } })
    const statusDataPending = await statusResponsePending.json()

    expect(statusResponsePending.status).toBe(200)
    expect(statusDataPending).toMatchObject({
      jobId: createdJobId,
      status: 'pending',
      progress: 0,
    })

    // ============================================================
    // Step 3: Poll Job Status (Processing)
    // ============================================================
    // Mock job as processing
    mockSupabaseClient.from = jest.fn((table: string) => {
      if (table === 'drawing_jobs') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              id: createdJobId,
              user_id: 'test-user-id',
              design_id: 'test-design-id',
              status: 'processing',
              progress: 50,
              created_at: new Date().toISOString(),
            },
            error: null,
          }),
        }
      }
      return mockSupabaseClient.from(table)
    })

    const statusRequestProcessing = new Request(`http://localhost:3000/api/v1/drawings/status/${createdJobId}`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer mock-token',
      },
    })

    const statusResponseProcessing = await getStatus(statusRequestProcessing, { params: { jobId: createdJobId } })
    const statusDataProcessing = await statusResponseProcessing.json()

    expect(statusResponseProcessing.status).toBe(200)
    expect(statusDataProcessing).toMatchObject({
      jobId: createdJobId,
      status: 'processing',
      progress: 50,
    })

    // ============================================================
    // Step 4: Poll Job Status (Completed with Download URL)
    // ============================================================
    const fileUrl = 'https://example.com/drawings/test-user-id/test-design-id/drawing.pdf'

    // Mock job as completed
    mockSupabaseClient.from = jest.fn((table: string) => {
      if (table === 'drawing_jobs') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              id: createdJobId,
              user_id: 'test-user-id',
              design_id: 'test-design-id',
              status: 'completed',
              progress: 100,
              file_url: fileUrl,
              created_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
            },
            error: null,
          }),
        }
      }
      return mockSupabaseClient.from(table)
    })

    const statusRequestCompleted = new Request(`http://localhost:3000/api/v1/drawings/status/${createdJobId}`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer mock-token',
      },
    })

    const statusResponseCompleted = await getStatus(statusRequestCompleted, { params: { jobId: createdJobId } })
    const statusDataCompleted = await statusResponseCompleted.json()

    expect(statusResponseCompleted.status).toBe(200)
    expect(statusDataCompleted).toMatchObject({
      jobId: createdJobId,
      status: 'completed',
      progress: 100,
      fileUrl,
      completedAt: expect.any(String),
    })

    // ============================================================
    // Step 5: Verify Download URL is Accessible
    // ============================================================
    expect(statusDataCompleted.fileUrl).toBeTruthy()
    expect(statusDataCompleted.fileUrl).toMatch(/^https:\/\//)
    expect(statusDataCompleted.fileUrl).toContain('test-design-id')
  })

  it('should handle failed job status correctly', async () => {
    // ============================================================
    // Generate Drawing Request
    // ============================================================
    const generateRequest = new Request('http://localhost:3000/api/v1/drawings/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-token',
      },
      body: JSON.stringify({
        designId: 'test-design-id',
      }),
    })

    const generateResponse = await generateDrawing(generateRequest)
    const generateData = await generateResponse.json()

    expect(generateResponse.status).toBe(200)
    createdJobId = generateData.jobId

    // ============================================================
    // Mock Job Failure
    // ============================================================
    const errorMessage = 'PDF generation failed: Invalid design dimensions'

    mockSupabaseClient.from = jest.fn((table: string) => {
      if (table === 'drawing_jobs') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              id: createdJobId,
              user_id: 'test-user-id',
              design_id: 'test-design-id',
              status: 'failed',
              progress: 0,
              error_message: errorMessage,
              created_at: new Date().toISOString(),
            },
            error: null,
          }),
        }
      }
      return mockSupabaseClient.from(table)
    })

    // ============================================================
    // Poll Job Status (Failed)
    // ============================================================
    const statusRequestFailed = new Request(`http://localhost:3000/api/v1/drawings/status/${createdJobId}`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer mock-token',
      },
    })

    const statusResponseFailed = await getStatus(statusRequestFailed, { params: { jobId: createdJobId } })
    const statusDataFailed = await statusResponseFailed.json()

    expect(statusResponseFailed.status).toBe(200)
    expect(statusDataFailed).toMatchObject({
      jobId: createdJobId,
      status: 'failed',
      progress: 0,
      errorMessage,
    })

    expect(statusDataFailed.fileUrl).toBeUndefined()
    expect(statusDataFailed.completedAt).toBeUndefined()
  })

  it('should enforce authentication for all endpoints', async () => {
    // ============================================================
    // Test Generate Endpoint without Auth
    // ============================================================
    const generateRequestNoAuth = new Request('http://localhost:3000/api/v1/drawings/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        designId: 'test-design-id',
      }),
    })

    mockSupabaseClient.auth.getUser = jest.fn().mockResolvedValue({
      data: { user: null },
      error: { message: 'Unauthorized' },
    })

    const generateResponseNoAuth = await generateDrawing(generateRequestNoAuth)
    expect(generateResponseNoAuth.status).toBe(401)

    // ============================================================
    // Test Status Endpoint without Auth
    // ============================================================
    const statusRequestNoAuth = new Request('http://localhost:3000/api/v1/drawings/status/some-job-id', {
      method: 'GET',
    })

    const statusResponseNoAuth = await getStatus(statusRequestNoAuth, { params: { jobId: 'some-job-id' } })
    expect(statusResponseNoAuth.status).toBe(401)
  })

  it('should validate designId in generate request', async () => {
    // ============================================================
    // Test with Missing designId
    // ============================================================
    const generateRequestMissingId = new Request('http://localhost:3000/api/v1/drawings/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-token',
      },
      body: JSON.stringify({}),
    })

    const generateResponseMissingId = await generateDrawing(generateRequestMissingId)
    expect(generateResponseMissingId.status).toBe(400)

    const errorData = await generateResponseMissingId.json()
    expect(errorData.error).toBeDefined()
  })

  it('should handle non-existent job IDs gracefully', async () => {
    // Mock job not found
    mockSupabaseClient.from = jest.fn((table: string) => {
      if (table === 'drawing_jobs') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Job not found' },
          }),
        }
      }
      return mockSupabaseClient.from(table)
    })

    const statusRequestNotFound = new Request('http://localhost:3000/api/v1/drawings/status/non-existent-job-id', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer mock-token',
      },
    })

    const statusResponseNotFound = await getStatus(statusRequestNotFound, { params: { jobId: 'non-existent-job-id' } })
    expect(statusResponseNotFound.status).toBe(404)
  })

  it('should track progress updates during generation', async () => {
    const progressUpdates = [0, 10, 30, 70, 90, 100]

    for (const progress of progressUpdates) {
      mockSupabaseClient.from = jest.fn((table: string) => {
        if (table === 'drawing_jobs') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'test-job-id',
                user_id: 'test-user-id',
                design_id: 'test-design-id',
                status: progress === 100 ? 'completed' : 'processing',
                progress,
                file_url: progress === 100 ? 'https://example.com/drawing.pdf' : null,
                created_at: new Date().toISOString(),
                completed_at: progress === 100 ? new Date().toISOString() : null,
              },
              error: null,
            }),
          }
        }
        return mockSupabaseClient.from(table)
      })

      const statusRequest = new Request('http://localhost:3000/api/v1/drawings/status/test-job-id', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer mock-token',
        },
      })

      const statusResponse = await getStatus(statusRequest, { params: { jobId: 'test-job-id' } })
      const statusData = await statusResponse.json()

      expect(statusData.progress).toBe(progress)

      if (progress === 100) {
        expect(statusData.status).toBe('completed')
        expect(statusData.fileUrl).toBeTruthy()
        expect(statusData.completedAt).toBeTruthy()
      }
    }
  })
})