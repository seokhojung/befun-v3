/**
 * PDF Drawing Generator
 * Story 4.1: Drawing Generation and Design Management
 */

import PDFDocument from 'pdfkit'
import { DrawingDesignData, PdfGenerationOptions, DrawingMetadata } from '@/types/drawing'
import { drawFrontView } from './views/front-view'
import { drawSideView } from './views/side-view'
import { drawTopView } from './views/top-view'
import { drawSpecifications } from './views/specifications'

const DEFAULT_OPTIONS: PdfGenerationOptions = {
  format: 'A4',
  includeViews: ['front', 'side', 'top'],
}

/**
 * Generate PDF drawing from design data
 * @param design - Design data from database
 * @param options - PDF generation options
 * @returns PDF Buffer
 */
export async function generateDrawingPDF(
  design: DrawingDesignData,
  options: Partial<PdfGenerationOptions> = {}
): Promise<Buffer> {
  // Validate design data
  validateDesignData(design)

  // Merge options with defaults
  const pdfOptions: PdfGenerationOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
  }

  // Create PDF document
  const doc = new PDFDocument({
    size: pdfOptions.format,
    margin: 50,
    info: createPdfMetadata(design, pdfOptions.metadata),
  })

  const buffers: Buffer[] = []
  doc.on('data', (chunk) => buffers.push(chunk))

  // Draw header
  drawHeader(doc, design)

  // Draw views based on options
  const views = pdfOptions.includeViews

  if (views.includes('front')) {
    const nextY = drawFrontView(doc, design, 120)
    if (views.length > 1) {
      doc.addPage()
    }
  }

  if (views.includes('side')) {
    const nextY = drawSideView(doc, design, 120)
    if (views.indexOf('side') < views.length - 1) {
      doc.addPage()
    }
  }

  if (views.includes('top')) {
    const nextY = drawTopView(doc, design, 120)
    doc.addPage()
  }

  // Draw specifications page
  drawSpecifications(doc, design)

  // Finalize PDF
  doc.end()

  // Return PDF buffer
  return new Promise((resolve, reject) => {
    doc.on('end', () => {
      resolve(Buffer.concat(buffers))
    })
    doc.on('error', reject)
  })
}

/**
 * Draw PDF header with title and timestamp
 */
function drawHeader(doc: typeof PDFDocument, design: DrawingDesignData): void {
  const pageWidth = doc.page.width
  const margin = 50

  // Main title
  doc
    .fontSize(20)
    .font('Helvetica-Bold')
    .text('BeFun 3D Desk Configurator', margin, margin, { align: 'center' })

  // Subtitle
  doc
    .fontSize(14)
    .font('Helvetica')
    .text('기술 도면 (Technical Drawing)', margin, margin + 25, { align: 'center' })

  // Design name (if available)
  if (design.design_name) {
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#2563eb')
      .text(`"${design.design_name}"`, margin, margin + 50, { align: 'center' })
      .fillColor('#000000')
  }

  // Timestamp
  const timestamp = new Date().toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor('#6b7280')
    .text(`생성일: ${timestamp}`, pageWidth - 150, margin, { width: 100 })
    .fillColor('#000000')

  // Separator line
  doc
    .moveTo(margin, margin + 80)
    .lineTo(pageWidth - margin, margin + 80)
    .stroke()
}

/**
 * Create PDF metadata
 */
function createPdfMetadata(design: DrawingDesignData, metadata?: Partial<DrawingMetadata>): Record<string, unknown> {
  const defaultMetadata: DrawingMetadata = {
    title: `Desk Design - ${design.id}`,
    author: 'BeFun 3D Desk Configurator',
    subject: 'Technical Drawing',
    keywords: ['desk', 'design', 'technical drawing', design.material],
    createdAt: new Date(),
  }

  const merged = { ...defaultMetadata, ...metadata }

  return {
    Title: merged.title,
    Author: merged.author,
    Subject: merged.subject,
    Keywords: merged.keywords.join(', '),
    Creator: 'BeFun 3D Desk Configurator',
    Producer: 'PDFKit',
    CreationDate: merged.createdAt,
  }
}

/**
 * Validate design data before PDF generation
 */
function validateDesignData(design: DrawingDesignData): void {
  if (!design || typeof design !== 'object') {
    throw new Error('Invalid design data: design object is required')
  }

  const requiredFields = ['id', 'width_cm', 'depth_cm', 'height_cm', 'material', 'calculated_price']
  const missingFields = requiredFields.filter((field) => !(field in design))

  if (missingFields.length > 0) {
    throw new Error(`Invalid design data: missing fields ${missingFields.join(', ')}`)
  }

  // Validate dimensions
  if (design.width_cm < 60 || design.width_cm > 300) {
    throw new Error('Invalid design data: width_cm must be between 60 and 300')
  }
  if (design.depth_cm < 40 || design.depth_cm > 200) {
    throw new Error('Invalid design data: depth_cm must be between 40 and 200')
  }
  if (design.height_cm < 60 || design.height_cm > 120) {
    throw new Error('Invalid design data: height_cm must be between 60 and 120')
  }

  // Validate material
  const validMaterials = ['wood', 'mdf', 'steel', 'metal', 'glass', 'fabric']
  if (!validMaterials.includes(design.material)) {
    throw new Error(`Invalid design data: material must be one of ${validMaterials.join(', ')}`)
  }
}