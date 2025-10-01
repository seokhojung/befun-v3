/**
 * Design Management Types
 * Story 4.1: Drawing Generation and Design Management
 */

/**
 * Design record from database (saved_design table)
 */
export interface Design {
  id: string
  user_id: string
  width_cm: number
  depth_cm: number
  height_cm: number
  material: string
  calculated_price: number
  design_name: string | null
  thumbnail_url: string | null
  drawing_file_url: string | null
  drawing_generated_at: string | null
  custom_specs: Record<string, unknown> | null
  cart_status: string | null
  external_order_id: string | null
  created_at: string
  updated_at: string
}

/**
 * Design list item for UI display
 */
export interface DesignListItem {
  id: string
  name: string
  width_cm: number
  depth_cm: number
  height_cm: number
  material: string
  calculated_price: number
  thumbnail_url?: string
  drawing_file_url?: string
  created_at: string
  updated_at: string
}

/**
 * Design update payload
 */
export interface UpdateDesignRequest {
  name?: string
  custom_specs?: {
    width_cm?: number
    depth_cm?: number
    height_cm?: number
    material?: string
  }
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * Design list response
 */
export interface DesignListResponse {
  designs: DesignListItem[]
  pagination: PaginationMeta
}

/**
 * Design query parameters
 */
export interface DesignQueryParams {
  page?: number
  limit?: number
  sortBy?: 'created_at' | 'updated_at' | 'design_name'
  order?: 'asc' | 'desc'
}

/**
 * Design delete response
 */
export interface DeleteDesignResponse {
  success: boolean
  message: string
}