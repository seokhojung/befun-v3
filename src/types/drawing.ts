/**
 * Drawing System Types
 * Story 4.1: Drawing Generation and Design Management
 */

/**
 * Drawing job status
 */
export type DrawingJobStatus = 'pending' | 'processing' | 'completed' | 'failed'

/**
 * Drawing view types
 */
export type DrawingView = 'front' | 'side' | 'top'

/**
 * PDF page format
 */
export type PdfFormat = 'A4' | 'A3'

/**
 * Drawing job record from database
 */
export interface DrawingJob {
  id: string
  user_id: string
  design_id: string
  status: DrawingJobStatus
  progress: number // 0-100
  file_url: string | null
  error_message: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

/**
 * Drawing generation request payload
 */
export interface GenerateDrawingRequest {
  designId: string
  includeViews?: DrawingView[] // Default: ['front', 'side', 'top']
  format?: PdfFormat // Default: 'A4'
}

/**
 * Drawing generation response
 */
export interface GenerateDrawingResponse {
  success: boolean
  jobId: string
  message: string
  estimatedTime: number // seconds
}

/**
 * Drawing job status response
 */
export interface DrawingJobStatusResponse {
  jobId: string
  status: DrawingJobStatus
  progress: number
  fileUrl?: string
  errorMessage?: string
  createdAt: string
  completedAt?: string
}

/**
 * Design data for PDF generation
 */
export interface DrawingDesignData {
  id: string
  user_id: string
  width_cm: number
  depth_cm: number
  height_cm: number
  material: string
  calculated_price: number
  design_name?: string
  custom_specs?: Record<string, unknown>
  created_at: string
}

/**
 * PDF drawing metadata
 */
export interface DrawingMetadata {
  title: string
  author: string
  subject: string
  keywords: string[]
  createdAt: Date
}

/**
 * Drawing view dimensions for rendering
 */
export interface DrawingViewDimensions {
  width: number // in mm
  height: number // in mm
  depth: number // in mm
}

/**
 * PDF generation options
 */
export interface PdfGenerationOptions {
  format: PdfFormat
  includeViews: DrawingView[]
  metadata?: Partial<DrawingMetadata>
}

/**
 * Drawing file info
 */
export interface DrawingFileInfo {
  fileName: string
  fileSize: number // bytes
  mimeType: string
  url: string
  expiresAt?: string
}