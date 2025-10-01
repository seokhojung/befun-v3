/**
 * Specifications Page Rendering
 * Story 4.1: Drawing Generation and Design Management
 */

import PDFDocument from 'pdfkit'
import { DrawingDesignData } from '@/types/drawing'

const MARGIN = 50
const TITLE_FONT_SIZE = 16
const LABEL_FONT_SIZE = 12
const VALUE_FONT_SIZE = 11
const LINE_HEIGHT = 25

/**
 * Draw specifications page
 * Shows all design details and pricing
 */
export function drawSpecifications(doc: typeof PDFDocument, design: DrawingDesignData): void {
  let currentY = MARGIN

  // Title
  doc
    .fontSize(TITLE_FONT_SIZE)
    .font('Helvetica-Bold')
    .text('사양 정보 (Specifications)', MARGIN, currentY)

  currentY += 40

  // Design name (if available)
  if (design.design_name) {
    drawSpecRow(doc, '디자인 명:', design.design_name, currentY)
    currentY += LINE_HEIGHT
  }

  // Dimensions
  drawSpecRow(doc, '가로 (Width):', `${design.width_cm * 10} mm`, currentY)
  currentY += LINE_HEIGHT

  drawSpecRow(doc, '깊이 (Depth):', `${design.depth_cm * 10} mm`, currentY)
  currentY += LINE_HEIGHT

  drawSpecRow(doc, '높이 (Height):', `${design.height_cm * 10} mm`, currentY)
  currentY += LINE_HEIGHT

  // Material
  drawSpecRow(doc, '재료 (Material):', getMaterialKorean(design.material), currentY)
  currentY += LINE_HEIGHT

  // Volume
  const volumeM3 = (design.width_cm * design.depth_cm * design.height_cm) / 1000000
  drawSpecRow(doc, '부피 (Volume):', `${volumeM3.toFixed(4)} m³`, currentY)
  currentY += LINE_HEIGHT

  currentY += 10

  // Draw separator line
  doc
    .moveTo(MARGIN, currentY)
    .lineTo(doc.page.width - MARGIN, currentY)
    .stroke()

  currentY += 20

  // Price
  doc
    .fontSize(LABEL_FONT_SIZE)
    .font('Helvetica-Bold')
    .text('예상 가격 (Estimated Price):', MARGIN, currentY)

  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .fillColor('#2563eb')
    .text(`₩${design.calculated_price.toLocaleString('ko-KR')}`, MARGIN + 200, currentY)
    .fillColor('#000000')

  currentY += 40

  // Creation date
  const createdDate = new Date(design.created_at).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
  drawSpecRow(doc, '생성일 (Created):', createdDate, currentY)
  currentY += LINE_HEIGHT

  // Design ID
  drawSpecRow(doc, '디자인 ID:', design.id, currentY)
  currentY += LINE_HEIGHT * 2

  // Footer
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#6b7280')
    .text(
      'BeFun 3D Desk Configurator - 본 도면은 참고용이며, 실제 제작 시 차이가 있을 수 있습니다.',
      MARGIN,
      doc.page.height - 80,
      { width: doc.page.width - MARGIN * 2, align: 'center' }
    )
    .fillColor('#000000')

  // QR code placeholder (optional future enhancement)
  // drawQRCode(doc, design.id, currentY)
}

/**
 * Draw a specification row with label and value
 */
function drawSpecRow(doc: typeof PDFDocument, label: string, value: string, y: number): void {
  doc
    .fontSize(LABEL_FONT_SIZE)
    .font('Helvetica-Bold')
    .text(label, MARGIN, y, { continued: false })

  doc
    .fontSize(VALUE_FONT_SIZE)
    .font('Helvetica')
    .text(value, MARGIN + 180, y)
}

/**
 * Get Korean material name
 */
function getMaterialKorean(material: string): string {
  const materialMap: Record<string, string> = {
    wood: '원목 (Wood)',
    mdf: 'MDF',
    steel: '스틸 (Steel)',
    metal: '메탈 (Metal)',
    glass: '유리 (Glass)',
    fabric: '패브릭 (Fabric)',
  }
  return materialMap[material] || material
}