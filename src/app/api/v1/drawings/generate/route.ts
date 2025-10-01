/**
 * POST /api/v1/drawings/generate - Drawing Generation API
 * Story 4.1: Drawing Generation and Design Management
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/api/validation'
import { handleApiError, UnauthorizedError } from '@/lib/api/errors'
import { rateLimiter } from '@/lib/api/rate-limiter'
import { supabase } from '@/lib/supabase'
import { createDrawingJob, processDrawingJob } from '@/lib/drawing/drawing-service'

// Request validation schema
const generateDrawingSchema = z.object({
  designId: z.string().uuid('Invalid design ID format'),
  includeViews: z.array(z.enum(['front', 'side', 'top'])).optional().default(['front', 'side', 'top']),
  format: z.enum(['A4', 'A3']).optional().default('A4'),
})

type GenerateDrawingRequest = z.infer<typeof generateDrawingSchema>

/**
 * POST /api/v1/drawings/generate
 * Create drawing generation job
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()

  try {
    // Authentication check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new UnauthorizedError('Authentication required', undefined, requestId)
    }

    // Rate limiting: 10 requests per minute per user
    const rateLimitKey = `drawing-generation:${user.id}`
    const rateLimitResult = await rateLimiter.check(rateLimitKey, 10, 60)

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429 }
      )
    }

    // Validate request body
    const { designId, includeViews, format } = await validateRequestBody(request, generateDrawingSchema, requestId)

    // Verify design ownership
    const { data: design, error: designError } = await supabase
      .from('saved_design')
      .select('id, user_id')
      .eq('id', designId)
      .single()

    if (designError || !design) {
      return NextResponse.json(
        {
          success: false,
          error: 'Design not found',
          requestId,
        },
        { status: 404 }
      )
    }

    if (design.user_id !== user.id) {
      throw new UnauthorizedError('You do not have permission to generate drawing for this design', undefined, requestId)
    }

    // Create drawing job
    const job = await createDrawingJob(user.id, designId)

    // Start async processing (fire-and-forget)
    // Vercel serverless functions continue execution after response is sent
    processDrawingJob(job.id).catch((error) => {
      console.error(`Drawing job ${job.id} failed:`, error)
    })

    // Return immediate response
    return NextResponse.json(
      {
        success: true,
        jobId: job.id,
        message: '도면 생성이 시작되었습니다',
        estimatedTime: 30, // seconds
        requestId,
      },
      { status: 202 } // Accepted
    )
  } catch (error) {
    return handleApiError(error, requestId)
  }
}