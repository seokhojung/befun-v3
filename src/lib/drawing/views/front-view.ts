/**
 * Front View Rendering
 * Story 4.1: Drawing Generation and Design Management
 */

import PDFDocument from 'pdfkit'
import { DrawingDesignData } from '@/types/drawing'
import { getMaterialKorean } from '@/lib/utils/material'

const SCALE_FACTOR = 2 // 1mm = 2 points for better visibility
const MARGIN = 50
const VIEW_TITLE_FONT_SIZE = 14
const DIMENSION_FONT_SIZE = 10

/**
 * Draw front view of the desk
 * Shows: width (horizontal) x height (vertical)
 */
export function drawFrontView(doc: typeof PDFDocument, design: DrawingDesignData, startY: number): number {
  const widthMm = design.width_cm * 10
  const heightMm = design.height_cm * 10

  // Scale dimensions for PDF
  const widthPt = widthMm * SCALE_FACTOR
  const heightPt = heightMm * SCALE_FACTOR

  // Calculate center position
  const pageWidth = doc.page.width
  const centerX = pageWidth / 2
  const rectX = centerX - widthPt / 2
  const rectY = startY + 60

  // Draw title
  doc
    .fontSize(VIEW_TITLE_FONT_SIZE)
    .font('Helvetica-Bold')
    .text('정면도 (Front View)', MARGIN, startY, { align: 'left' })

  // Draw rectangle (desk front view)
  doc
    .rect(rectX, rectY, widthPt, heightPt)
    .stroke()

  // Draw horizontal dimension (width)
  drawHorizontalDimension(doc, rectX, rectY - 30, widthPt, widthMm)

  // Draw vertical dimension (height)
  drawVerticalDimension(doc, rectX + widthPt + 30, rectY, heightPt, heightMm)

  // Add material label
  doc
    .fontSize(DIMENSION_FONT_SIZE)
    .font('Helvetica')
    .text(`재료: ${getMaterialKorean(design.material)}`, rectX, rectY + heightPt + 20, { width: widthPt, align: 'center' })

  return rectY + heightPt + 50
}

/**
 * Draw horizontal dimension line with arrows and text
 */
function drawHorizontalDimension(doc: typeof PDFDocument, x: number, y: number, length: number, valueMm: number) {
  // Draw dimension line
  doc.moveTo(x, y).lineTo(x + length, y).stroke()

  // Draw arrows
  doc
    .moveTo(x, y)
    .lineTo(x + 5, y - 3)
    .moveTo(x, y)
    .lineTo(x + 5, y + 3)
    .stroke()

  doc
    .moveTo(x + length, y)
    .lineTo(x + length - 5, y - 3)
    .moveTo(x + length, y)
    .lineTo(x + length - 5, y + 3)
    .stroke()

  // Draw dimension text
  doc
    .fontSize(DIMENSION_FONT_SIZE)
    .font('Helvetica')
    .text(`${valueMm} mm`, x, y - 20, { width: length, align: 'center' })
}

/**
 * Draw vertical dimension line with arrows and text
 */
function drawVerticalDimension(doc: typeof PDFDocument, x: number, y: number, length: number, valueMm: number) {
  // Draw dimension line
  doc.moveTo(x, y).lineTo(x, y + length).stroke()

  // Draw arrows
  doc
    .moveTo(x, y)
    .lineTo(x - 3, y + 5)
    .moveTo(x, y)
    .lineTo(x + 3, y + 5)
    .stroke()

  doc
    .moveTo(x, y + length)
    .lineTo(x - 3, y + length - 5)
    .moveTo(x, y + length)
    .lineTo(x + 3, y + length - 5)
    .stroke()

  // Draw dimension text (rotated)
  doc
    .save()
    .translate(x + 15, y + length / 2)
    .rotate(-90)
    .fontSize(DIMENSION_FONT_SIZE)
    .font('Helvetica')
    .text(`${valueMm} mm`, 0, 0, { width: length, align: 'center' })
    .restore()
}

