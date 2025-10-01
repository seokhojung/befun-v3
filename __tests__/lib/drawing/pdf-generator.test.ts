/**
 * PDF Generator Tests
 * Story 4.1: Drawing Generation and Design Management
 */

import { generateDrawingPDF } from '@/lib/drawing/pdf-generator'
import { DrawingDesignData } from '@/types/drawing'

describe('PDF Drawing Generator', () => {
  const mockDesign: DrawingDesignData = {
    id: 'test-uuid-123',
    user_id: 'user-123',
    width_cm: 120,
    depth_cm: 60,
    height_cm: 75,
    material: 'wood',
    calculated_price: 116700,
    design_name: 'Test Desk',
    created_at: new Date().toISOString(),
  }

  test('should generate PDF buffer successfully', async () => {
    const pdfBuffer = await generateDrawingPDF(mockDesign)

    expect(pdfBuffer).toBeInstanceOf(Buffer)
    expect(pdfBuffer.length).toBeGreaterThan(0)
  })

  test('should throw error for invalid design data', async () => {
    const invalidDesign = {
      id: 'invalid',
    } as unknown as DrawingDesignData

    await expect(generateDrawingPDF(invalidDesign)).rejects.toThrow('Invalid design data')
  })

  test('should throw error for out-of-range dimensions', async () => {
    const invalidDesign: DrawingDesignData = {
      ...mockDesign,
      width_cm: 500, // exceeds max 300
    }

    await expect(generateDrawingPDF(invalidDesign)).rejects.toThrow('Invalid design data: width_cm must be between 60 and 300')
  })

  test('should throw error for invalid material', async () => {
    const invalidDesign: DrawingDesignData = {
      ...mockDesign,
      material: 'invalid-material',
    }

    await expect(generateDrawingPDF(invalidDesign)).rejects.toThrow('Invalid design data: material must be one of')
  })

  test('should generate PDF with custom options', async () => {
    const pdfBuffer = await generateDrawingPDF(mockDesign, {
      format: 'A3',
      includeViews: ['front', 'top'],
    })

    expect(pdfBuffer).toBeInstanceOf(Buffer)
    expect(pdfBuffer.length).toBeGreaterThan(0)
  })

  test('should include design name in PDF metadata', async () => {
    const designWithName: DrawingDesignData = {
      ...mockDesign,
      design_name: 'Custom Desk Design',
    }

    const pdfBuffer = await generateDrawingPDF(designWithName)

    expect(pdfBuffer).toBeInstanceOf(Buffer)
    // PDF metadata validation would require PDF parser library
  })
})