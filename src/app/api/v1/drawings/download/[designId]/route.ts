/**
 * GET /api/v1/drawings/download/{designId} - Drawing Download API
 * Story 4.1: Drawing Generation and Design Management
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validatePathParams } from '@/lib/api/validation'
import { handleApiError, UnauthorizedError, NotFoundError } from '@/lib/api/errors'
import { supabase } from '@/lib/supabase'

// Path params validation schema
const pathParamsSchema = z.object({
  designId: z.string().uuid('Invalid design ID format'),
})

/**
 * GET /api/v1/drawings/download/{designId}
 * Download drawing PDF for a design
 */
export async function GET(request: NextRequest, { params }: { params: { designId: string } }) {
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

    // Validate path params
    const { designId } = validatePathParams(params, pathParamsSchema, requestId)

    // Get design with drawing file URL
    const { data: design, error: designError } = await supabase
      .from('saved_design')
      .select('id, user_id, drawing_file_url, design_name')
      .eq('id', designId)
      .single()

    if (designError || !design) {
      throw new NotFoundError('Design not found', undefined, requestId)
    }

    // Verify ownership
    if (design.user_id !== user.id) {
      throw new UnauthorizedError('You do not have permission to download this drawing', undefined, requestId)
    }

    // Check if drawing exists
    if (!design.drawing_file_url) {
      return NextResponse.json(
        {
          success: false,
          error: 'Drawing not generated yet. Please generate the drawing first.',
          requestId,
        },
        { status: 404 }
      )
    }

    // Redirect to signed URL (already signed from storage)
    return NextResponse.redirect(design.drawing_file_url, 302)
  } catch (error) {
    return handleApiError(error, requestId)
  }
}