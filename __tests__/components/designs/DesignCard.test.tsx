/**
 * DesignCard Component Tests
 * Story 4.1: Drawing Generation and Design Management
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DesignCard } from '@/components/designs/DesignCard'
import { DesignListItem } from '@/types/design'

describe('DesignCard', () => {
  const mockDesign: DesignListItem = {
    id: 'design-123',
    name: 'Test Desk',
    width_cm: 120,
    depth_cm: 60,
    height_cm: 75,
    material: 'wood',
    calculated_price: 116700,
    thumbnail_url: 'https://example.com/thumbnail.jpg',
    drawing_file_url: 'https://example.com/drawing.pdf',
    created_at: '2025-09-30T00:00:00.000Z',
    updated_at: '2025-09-30T00:00:00.000Z',
  }

  const mockOnLoad = jest.fn()
  const mockOnDelete = jest.fn()
  const mockOnDownloadDrawing = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders design card with correct information', () => {
    render(<DesignCard design={mockDesign} onLoad={mockOnLoad} onDelete={mockOnDelete} onDownloadDrawing={mockOnDownloadDrawing} />)

    expect(screen.getByText('Test Desk')).toBeInTheDocument()
    expect(screen.getByText(/120 × 60 × 75 cm/)).toBeInTheDocument()
    expect(screen.getByText(/원목/)).toBeInTheDocument()
    expect(screen.getByText(/₩116,700/)).toBeInTheDocument()
  })

  test('displays thumbnail image if available', () => {
    render(<DesignCard design={mockDesign} onLoad={mockOnLoad} onDelete={mockOnDelete} />)

    const img = screen.getByAlt('Test Desk')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://example.com/thumbnail.jpg')
  })

  test('displays placeholder if thumbnail not available', () => {
    const designWithoutThumbnail = { ...mockDesign, thumbnail_url: undefined }
    render(<DesignCard design={designWithoutThumbnail} onLoad={mockOnLoad} onDelete={mockOnDelete} />)

    // Check for placeholder SVG
    const placeholder = screen.getByRole('img', { hidden: true })
    expect(placeholder).toBeInTheDocument()
  })

  test('calls onLoad when load button clicked', () => {
    render(<DesignCard design={mockDesign} onLoad={mockOnLoad} onDelete={mockOnDelete} />)

    const loadButton = screen.getByRole('button', { name: /불러오기/i })
    fireEvent.click(loadButton)

    expect(mockOnLoad).toHaveBeenCalledWith('design-123')
  })

  test('calls onDelete when delete button clicked', () => {
    render(<DesignCard design={mockDesign} onLoad={mockOnLoad} onDelete={mockOnDelete} />)

    const deleteButton = screen.getByRole('button', { name: /삭제/i })
    fireEvent.click(deleteButton)

    expect(mockOnDelete).toHaveBeenCalledWith('design-123')
  })

  test('shows download button only if drawing file exists', () => {
    const { rerender } = render(
      <DesignCard design={mockDesign} onLoad={mockOnLoad} onDelete={mockOnDelete} onDownloadDrawing={mockOnDownloadDrawing} />
    )

    expect(screen.getByRole('button', { name: /도면 다운로드/i })).toBeInTheDocument()

    const designWithoutDrawing = { ...mockDesign, drawing_file_url: undefined }
    rerender(<DesignCard design={designWithoutDrawing} onLoad={mockOnLoad} onDelete={mockOnDelete} onDownloadDrawing={mockOnDownloadDrawing} />)

    expect(screen.queryByRole('button', { name: /도면 다운로드/i })).not.toBeInTheDocument()
  })

  test('calls onDownloadDrawing when download button clicked', () => {
    render(<DesignCard design={mockDesign} onLoad={mockOnLoad} onDelete={mockOnDelete} onDownloadDrawing={mockOnDownloadDrawing} />)

    const downloadButton = screen.getByRole('button', { name: /도면 다운로드/i })
    fireEvent.click(downloadButton)

    expect(mockOnDownloadDrawing).toHaveBeenCalledWith('design-123')
  })

  test('formats price in Korean currency format', () => {
    render(<DesignCard design={mockDesign} onLoad={mockOnLoad} onDelete={mockOnDelete} />)

    expect(screen.getByText(/₩116,700/)).toBeInTheDocument()
  })

  test('formats date in Korean date format', () => {
    render(<DesignCard design={mockDesign} onLoad={mockOnLoad} onDelete={mockOnDelete} />)

    expect(screen.getByText(/생성일: 2025\. 09\. 30\./)).toBeInTheDocument()
  })
})