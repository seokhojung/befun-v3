/**
 * GET /api/v1/drawings/status/{jobId} - Drawing Job Status API
 * Story 4.1: Drawing Generation and Design Management
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validatePathParams } from '@/lib/api/validation'
import { handleApiError, UnauthorizedError, NotFoundError } from '@/lib/api/errors'
import { supabase } from '@/lib/supabase'
import { getDrawingJob } from '@/lib/drawing/drawing-service'

// Path params validation schema
const pathParamsSchema = z.object({
  jobId: z.string().uuid('Invalid job ID format'),
})

/**
 * GET /api/v1/drawings/status/{jobId}
 * Get drawing job status
 */
export async function GET(request: NextRequest, { params }: { params: { jobId: string } }) {
  const requestId = crypto.randomUUID()

  try {
    // Authentication check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new UnauthorizedError('Authentication required', requestId)
    }

    // Validate path params
    const { jobId } = validatePathParams(params, pathParamsSchema, requestId)

    // Get job
    const job = await getDrawingJob(jobId)

    if (!job) {
      throw new NotFoundError('Drawing job not found', requestId)
    }

    // Verify ownership
    if (job.user_id !== user.id) {
      throw new UnauthorizedError('You do not have permission to view this job', requestId)
    }

    // Return job status
    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      fileUrl: job.file_url || undefined,
      errorMessage: job.error_message || undefined,
      createdAt: job.created_at,
      completedAt: job.completed_at || undefined,
      requestId,
    })
  } catch (error) {
    return handleApiError(error, requestId)
  }
}
