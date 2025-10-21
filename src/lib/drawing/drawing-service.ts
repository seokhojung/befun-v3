/**
 * Drawing Service - Business logic for drawing generation
 * Story 4.1: Drawing Generation and Design Management
 */

import { supabaseAdmin } from '@/lib/supabase-admin'
import { DrawingJob, DrawingDesignData, DrawingJobStatus } from '@/types/drawing'
import { generateDrawingPDF } from './pdf-generator'

/**
 * Create a new drawing job
 */
export async function createDrawingJob(userId: string, designId: string): Promise<DrawingJob> {
  const supabase = supabaseAdmin

  // Insert job record
  const { data, error } = await supabase
    .from('drawing_jobs')
    .insert({
      user_id: userId,
      design_id: designId,
      status: 'pending',
      progress: 0,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create drawing job: ${error.message}`)
  }

  return data as DrawingJob
}

/**
 * Get drawing job by ID
 */
export async function getDrawingJob(jobId: string): Promise<DrawingJob | null> {
  const supabase = supabaseAdmin

  const { data, error } = await supabase.from('drawing_jobs').select('*').eq('id', jobId).single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to get drawing job: ${error.message}`)
  }

  return data as DrawingJob
}

/**
 * Update drawing job status
 */
export async function updateJobStatus(
  jobId: string,
  status: DrawingJobStatus,
  progress: number,
  fileUrl?: string | null,
  errorMessage?: string | null
): Promise<void> {
  const supabase = supabaseAdmin

  const updateData: Record<string, unknown> = {
    status,
    progress,
  }

  if (fileUrl !== undefined) {
    updateData.file_url = fileUrl
  }

  if (errorMessage !== undefined) {
    updateData.error_message = errorMessage
  }

  if (status === 'completed' || status === 'failed') {
    updateData.completed_at = new Date().toISOString()
  }

  const { error } = await supabase.from('drawing_jobs').update(updateData).eq('id', jobId)

  if (error) {
    throw new Error(`Failed to update job status: ${error.message}`)
  }
}

/**
 * Get design data for PDF generation
 */
export async function getDesignData(designId: string): Promise<DrawingDesignData> {
  const supabase = supabaseAdmin

  const { data, error } = await supabase.from('saved_design').select('*').eq('id', designId).single()

  if (error) {
    throw new Error(`Failed to get design data: ${error.message}`)
  }

  return data as DrawingDesignData
}

/**
 * Upload PDF to Supabase Storage
 */
export async function uploadPdfToStorage(pdfBuffer: Buffer, userId: string, designId: string): Promise<string> {
  const supabase = supabaseAdmin

  const timestamp = Date.now()
  const fileName = `desk-design-${designId}-${timestamp}.pdf`
  const filePath = `${userId}/${designId}/${fileName}`

  const { data, error } = await supabase.storage.from('drawings').upload(filePath, pdfBuffer, {
    contentType: 'application/pdf',
    upsert: false,
  })

  if (error) {
    throw new Error(`Failed to upload PDF: ${error.message}`)
  }

  // Get public URL (signed URL for private bucket)
  const { data: urlData } = await supabase.storage.from('drawings').createSignedUrl(filePath, 31536000) // 1 year

  if (!urlData || !urlData.signedUrl) {
    throw new Error('Failed to get signed URL for uploaded PDF')
  }

  return urlData.signedUrl
}

/**
 * Update saved_design with drawing file URL
 */
export async function updateDesignDrawingUrl(designId: string, fileUrl: string): Promise<void> {
  const supabase = supabaseAdmin

  const { error } = await supabase
    .from('saved_design')
    .update({
      drawing_file_url: fileUrl,
      drawing_generated_at: new Date().toISOString(),
    })
    .eq('id', designId)

  if (error) {
    throw new Error(`Failed to update design drawing URL: ${error.message}`)
  }
}

/**
 * Process drawing job (main async worker function)
 * This runs after the initial API response
 */
export async function processDrawingJob(jobId: string): Promise<void> {
  const startTime = performance.now()
  try {
    // Update status to processing
    await updateJobStatus(jobId, 'processing', 10)

    // Get job details
    const job = await getDrawingJob(jobId)
    if (!job) {
      throw new Error('Job not found')
    }

    // Get design data
    const design = await getDesignData(job.design_id)
    await updateJobStatus(jobId, 'processing', 30)

    // Generate PDF (measure performance)
    const pdfStartTime = performance.now()
    const pdfBuffer = await generateDrawingPDF(design)
    const pdfDuration = performance.now() - pdfStartTime
    console.log(`[Performance] PDF generation completed in ${pdfDuration.toFixed(2)}ms for design ${job.design_id}`)
    await updateJobStatus(jobId, 'processing', 70)

    // Upload to storage
    const fileUrl = await uploadPdfToStorage(pdfBuffer, job.user_id, job.design_id)
    await updateJobStatus(jobId, 'processing', 90)

    // Update saved_design table
    await updateDesignDrawingUrl(job.design_id, fileUrl)

    // Mark as completed
    const totalDuration = performance.now() - startTime
    console.log(`[Performance] Total drawing job completed in ${totalDuration.toFixed(2)}ms for job ${jobId}`)
    await updateJobStatus(jobId, 'completed', 100, fileUrl)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const failureDuration = performance.now() - startTime
    console.error(`Drawing job ${jobId} failed after ${failureDuration.toFixed(2)}ms:`, errorMessage)
    await updateJobStatus(jobId, 'failed', 0, null, errorMessage)
  }
}
