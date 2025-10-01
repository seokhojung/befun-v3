/**
 * Side View Rendering
 * Story 4.1: Drawing Generation and Design Management
 */

import PDFDocument from 'pdfkit'
import { DrawingDesignData } from '@/types/drawing'

const SCALE_FACTOR = 2 // 1mm = 2 points for better visibility
const MARGIN = 50
const VIEW_TITLE_FONT_SIZE = 14
const DIMENSION_FONT_SIZE = 10

/**
 * Draw side view of the desk
 * Shows: depth (horizontal) x height (vertical)
 */
export function drawSideView(doc: typeof PDFDocument, design: DrawingDesignData, startY: number): number {
  const depthMm = design.depth_cm * 10
  const heightMm = design.height_cm * 10

  // Scale dimensions for PDF
  const depthPt = depthMm * SCALE_FACTOR
  const heightPt = heightMm * SCALE_FACTOR

  // Calculate center position
  const pageWidth = doc.page.width
  const centerX = pageWidth / 2
  const rectX = centerX - depthPt / 2
  const rectY = startY + 60

  // Draw title
  doc
    .fontSize(VIEW_TITLE_FONT_SIZE)
    .font('Helvetica-Bold')
    .text('측면도 (Side View)', MARGIN, startY, { align: 'left' })

  // Draw rectangle (desk side view)
  doc
    .rect(rectX, rectY, depthPt, heightPt)
    .stroke()

  // Draw horizontal dimension (depth)
  drawHorizontalDimension(doc, rectX, rectY - 30, depthPt, depthMm)

  // Draw vertical dimension (height)
  drawVerticalDimension(doc, rectX + depthPt + 30, rectY, heightPt, heightMm)

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