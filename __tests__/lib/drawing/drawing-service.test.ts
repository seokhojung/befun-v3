/**
 * Drawing Service Tests
 * Story 4.1: Drawing Generation and Design Management
 */

import { createDrawingJob, getDrawingJob, updateJobStatus } from '@/lib/drawing/drawing-service'

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn((table: string) => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() =>
            Promise.resolve({
              data: {
                id: 'job-123',
                user_id: 'user-123',
                design_id: 'design-123',
                status: 'pending',
                progress: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              error: null,
            })
          ),
        })),
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() =>
            Promise.resolve({
              data: {
                id: 'job-123',
                user_id: 'user-123',
                design_id: 'design-123',
                status: 'processing',
                progress: 50,
                file_url: null,
                error_message: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                completed_at: null,
              },
              error: null,
            })
          ),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() =>
          Promise.resolve({
            error: null,
          })
        ),
      })),
    })),
  })),
}))

describe('Drawing Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createDrawingJob', () => {
    test('should create a new drawing job', async () => {
      const job = await createDrawingJob('user-123', 'design-123')

      expect(job).toBeDefined()
      expect(job.id).toBe('job-123')
      expect(job.status).toBe('pending')
      expect(job.progress).toBe(0)
    })
  })

  describe('getDrawingJob', () => {
    test('should get drawing job by ID', async () => {
      const job = await getDrawingJob('job-123')

      expect(job).toBeDefined()
      expect(job?.id).toBe('job-123')
      expect(job?.status).toBe('processing')
      expect(job?.progress).toBe(50)
    })
  })

  describe('updateJobStatus', () => {
    test('should update job status to processing', async () => {
      await expect(updateJobStatus('job-123', 'processing', 50)).resolves.not.toThrow()
    })

    test('should update job status to completed with file URL', async () => {
      await expect(updateJobStatus('job-123', 'completed', 100, 'https://example.com/file.pdf')).resolves.not.toThrow()
    })

    test('should update job status to failed with error message', async () => {
      await expect(updateJobStatus('job-123', 'failed', 0, null, 'PDF generation failed')).resolves.not.toThrow()
    })
  })
})