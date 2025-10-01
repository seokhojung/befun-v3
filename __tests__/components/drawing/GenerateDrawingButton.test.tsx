/**
 * GenerateDrawingButton Component Tests
 * Story 4.1: Drawing Generation and Design Management
 * Tests for drawing generation button component
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { GenerateDrawingButton } from '@/components/drawing/GenerateDrawingButton'

describe('GenerateDrawingButton', () => {
  const mockOnGenerate = jest.fn()
  const mockDesignId = 'test-design-id-123'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render button with default text', () => {
    render(<GenerateDrawingButton designId={mockDesignId} onGenerate={mockOnGenerate} />)

    expect(screen.getByRole('button')).toBeInTheDocument()
    expect(screen.getByText('도면 생성')).toBeInTheDocument()
  })

  it('should call onGenerate with designId when clicked', () => {
    render(<GenerateDrawingButton designId={mockDesignId} onGenerate={mockOnGenerate} />)

    const button = screen.getByRole('button')
    fireEvent.click(button)

    expect(mockOnGenerate).toHaveBeenCalledWith(mockDesignId)
    expect(mockOnGenerate).toHaveBeenCalledTimes(1)
  })

  it('should display "생성 중..." when isGenerating is true', () => {
    render(<GenerateDrawingButton designId={mockDesignId} onGenerate={mockOnGenerate} isGenerating={true} />)

    expect(screen.getByText('생성 중...')).toBeInTheDocument()
    expect(screen.queryByText('도면 생성')).not.toBeInTheDocument()
  })

  it('should be disabled when isGenerating is true', () => {
    render(<GenerateDrawingButton designId={mockDesignId} onGenerate={mockOnGenerate} isGenerating={true} />)

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()

    fireEvent.click(button)
    expect(mockOnGenerate).not.toHaveBeenCalled()
  })

  it('should be disabled when disabled prop is true', () => {
    render(<GenerateDrawingButton designId={mockDesignId} onGenerate={mockOnGenerate} disabled={true} />)

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()

    fireEvent.click(button)
    expect(mockOnGenerate).not.toHaveBeenCalled()
  })

  it('should be disabled when both isGenerating and disabled are true', () => {
    render(<GenerateDrawingButton designId={mockDesignId} onGenerate={mockOnGenerate} isGenerating={true} disabled={true} />)

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()

    fireEvent.click(button)
    expect(mockOnGenerate).not.toHaveBeenCalled()
  })

  it('should have proper accessibility label', () => {
    render(<GenerateDrawingButton designId={mockDesignId} onGenerate={mockOnGenerate} />)

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-label', '도면 생성')
  })

  it('should render FileText icon', () => {
    const { container } = render(<GenerateDrawingButton designId={mockDesignId} onGenerate={mockOnGenerate} />)

    // lucide-react icons are rendered as <svg> with specific class
    const svgIcon = container.querySelector('svg')
    expect(svgIcon).toBeInTheDocument()
  })

  it('should have correct CSS classes', () => {
    render(<GenerateDrawingButton designId={mockDesignId} onGenerate={mockOnGenerate} />)

    const button = screen.getByRole('button')
    expect(button).toHaveClass(
      'flex',
      'items-center',
      'gap-2',
      'px-4',
      'py-2',
      'bg-green-600',
      'text-white',
      'rounded-lg',
      'hover:bg-green-700',
      'transition-colors'
    )
  })

  it('should have disabled cursor style when disabled', () => {
    render(<GenerateDrawingButton designId={mockDesignId} onGenerate={mockOnGenerate} disabled={true} />)

    const button = screen.getByRole('button')
    expect(button).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed')
  })

  it('should handle rapid clicks gracefully', () => {
    render(<GenerateDrawingButton designId={mockDesignId} onGenerate={mockOnGenerate} />)

    const button = screen.getByRole('button')

    // Rapid clicks
    fireEvent.click(button)
    fireEvent.click(button)
    fireEvent.click(button)

    // All clicks should be registered (no debouncing in component)
    expect(mockOnGenerate).toHaveBeenCalledTimes(3)
    expect(mockOnGenerate).toHaveBeenCalledWith(mockDesignId)
  })

  it('should work with different designIds', () => {
    const designId1 = 'design-1'
    const designId2 = 'design-2'

    const { rerender } = render(<GenerateDrawingButton designId={designId1} onGenerate={mockOnGenerate} />)

    fireEvent.click(screen.getByRole('button'))
    expect(mockOnGenerate).toHaveBeenCalledWith(designId1)

    rerender(<GenerateDrawingButton designId={designId2} onGenerate={mockOnGenerate} />)

    fireEvent.click(screen.getByRole('button'))
    expect(mockOnGenerate).toHaveBeenCalledWith(designId2)
    expect(mockOnGenerate).toHaveBeenCalledTimes(2)
  })

  it('should update text when isGenerating changes', () => {
    const { rerender } = render(<GenerateDrawingButton designId={mockDesignId} onGenerate={mockOnGenerate} isGenerating={false} />)

    expect(screen.getByText('도면 생성')).toBeInTheDocument()

    rerender(<GenerateDrawingButton designId={mockDesignId} onGenerate={mockOnGenerate} isGenerating={true} />)

    expect(screen.getByText('생성 중...')).toBeInTheDocument()
    expect(screen.queryByText('도면 생성')).not.toBeInTheDocument()
  })
})