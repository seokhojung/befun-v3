/**
 * DrawingProgressModal Component Tests
 * Story 4.1: Drawing Generation and Design Management
 * Tests for drawing progress modal UI component
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { DrawingProgressModal } from '@/components/drawing/DrawingProgressModal'
import { DrawingJobStatusResponse } from '@/types/drawing'

// Mock fetch globally
global.fetch = jest.fn()

describe('DrawingProgressModal', () => {
  const mockOnClose = jest.fn()
  const mockOnDownload = jest.fn()
  const mockJobId = 'test-job-id-123'

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('should not render when isOpen is false', () => {
    render(<DrawingProgressModal isOpen={false} jobId={mockJobId} onClose={mockOnClose} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('should render with loading state initially', () => {
    render(<DrawingProgressModal isOpen={true} jobId={mockJobId} onClose={mockOnClose} />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('도면 생성 준비 중...')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '도면 생성 준비 중...' })).toBeInTheDocument()
  })

  it('should poll job status every 2 seconds', async () => {
    const mockResponse: DrawingJobStatusResponse = {
      jobId: mockJobId,
      status: 'processing',
      progress: 50,
      createdAt: new Date().toISOString(),
    }

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    })

    render(<DrawingProgressModal isOpen={true} jobId={mockJobId} onClose={mockOnClose} />)

    // Fast-forward 2 seconds to trigger first poll
    jest.advanceTimersByTime(2000)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(`/api/v1/drawings/status/${mockJobId}`)
    })

    expect(global.fetch).toHaveBeenCalledTimes(1)

    // Fast-forward another 2 seconds
    jest.advanceTimersByTime(2000)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })
  })

  it('should display processing status with progress bar', async () => {
    const mockResponse: DrawingJobStatusResponse = {
      jobId: mockJobId,
      status: 'processing',
      progress: 75,
      createdAt: new Date().toISOString(),
    }

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    })

    render(<DrawingProgressModal isOpen={true} jobId={mockJobId} onClose={mockOnClose} />)

    jest.advanceTimersByTime(2000)

    await waitFor(() => {
      expect(screen.getByText('도면 생성 중...')).toBeInTheDocument()
      expect(screen.getByText('75%')).toBeInTheDocument()
    })

    // Progress bar should have correct width
    const progressBar = screen.getByText('75%').previousElementSibling?.querySelector('div')
    expect(progressBar).toHaveStyle({ width: '75%' })
  })

  it('should display completed status with download button', async () => {
    const mockResponse: DrawingJobStatusResponse = {
      jobId: mockJobId,
      status: 'completed',
      progress: 100,
      fileUrl: 'https://example.com/drawing.pdf',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    }

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    })

    render(<DrawingProgressModal isOpen={true} jobId={mockJobId} onClose={mockOnClose} onDownload={mockOnDownload} />)

    jest.advanceTimersByTime(2000)

    await waitFor(() => {
      expect(screen.getByText('도면 생성 완료!')).toBeInTheDocument()
    })

    // Should show download and close buttons
    const downloadButton = screen.getByText('다운로드')
    const closeButton = screen.getByText('닫기')

    expect(downloadButton).toBeInTheDocument()
    expect(closeButton).toBeInTheDocument()

    // Should not show progress bar
    expect(screen.queryByText('100%')).not.toBeInTheDocument()
  })

  it('should call onDownload when download button is clicked', async () => {
    const fileUrl = 'https://example.com/drawing.pdf'
    const mockResponse: DrawingJobStatusResponse = {
      jobId: mockJobId,
      status: 'completed',
      progress: 100,
      fileUrl,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    }

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    })

    render(<DrawingProgressModal isOpen={true} jobId={mockJobId} onClose={mockOnClose} onDownload={mockOnDownload} />)

    jest.advanceTimersByTime(2000)

    await waitFor(() => {
      expect(screen.getByText('다운로드')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('다운로드'))

    expect(mockOnDownload).toHaveBeenCalledWith(fileUrl)
    expect(mockOnDownload).toHaveBeenCalledTimes(1)
  })

  it('should display failed status with error message', async () => {
    const errorMessage = 'PDF generation failed due to invalid design data'
    const mockResponse: DrawingJobStatusResponse = {
      jobId: mockJobId,
      status: 'failed',
      progress: 0,
      errorMessage,
      createdAt: new Date().toISOString(),
    }

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    })

    render(<DrawingProgressModal isOpen={true} jobId={mockJobId} onClose={mockOnClose} />)

    jest.advanceTimersByTime(2000)

    await waitFor(() => {
      expect(screen.getByText('도면 생성 실패')).toBeInTheDocument()
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })

    // Should show only close button
    expect(screen.getByText('닫기')).toBeInTheDocument()
    expect(screen.queryByText('다운로드')).not.toBeInTheDocument()
  })

  it('should stop polling when job is completed', async () => {
    const mockResponse: DrawingJobStatusResponse = {
      jobId: mockJobId,
      status: 'completed',
      progress: 100,
      fileUrl: 'https://example.com/drawing.pdf',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    }

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    })

    render(<DrawingProgressModal isOpen={true} jobId={mockJobId} onClose={mockOnClose} />)

    jest.advanceTimersByTime(2000)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    // Advance more time - should not poll again
    jest.advanceTimersByTime(4000)

    expect(global.fetch).toHaveBeenCalledTimes(1) // Still only called once
  })

  it('should stop polling when job fails', async () => {
    const mockResponse: DrawingJobStatusResponse = {
      jobId: mockJobId,
      status: 'failed',
      progress: 0,
      errorMessage: 'Test error',
      createdAt: new Date().toISOString(),
    }

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    })

    render(<DrawingProgressModal isOpen={true} jobId={mockJobId} onClose={mockOnClose} />)

    jest.advanceTimersByTime(2000)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    // Advance more time - should not poll again
    jest.advanceTimersByTime(4000)

    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('should call onClose when close button is clicked', async () => {
    const mockResponse: DrawingJobStatusResponse = {
      jobId: mockJobId,
      status: 'completed',
      progress: 100,
      fileUrl: 'https://example.com/drawing.pdf',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    }

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    })

    render(<DrawingProgressModal isOpen={true} jobId={mockJobId} onClose={mockOnClose} onDownload={mockOnDownload} />)

    jest.advanceTimersByTime(2000)

    await waitFor(() => {
      expect(screen.getByText('닫기')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('닫기'))

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('should call onClose when backdrop is clicked (only when completed or failed)', async () => {
    const mockResponse: DrawingJobStatusResponse = {
      jobId: mockJobId,
      status: 'completed',
      progress: 100,
      fileUrl: 'https://example.com/drawing.pdf',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    }

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    })

    render(<DrawingProgressModal isOpen={true} jobId={mockJobId} onClose={mockOnClose} />)

    jest.advanceTimersByTime(2000)

    await waitFor(() => {
      expect(screen.getByText('도면 생성 완료!')).toBeInTheDocument()
    })

    // Click on backdrop (dialog element)
    const backdrop = screen.getByRole('dialog')
    fireEvent.click(backdrop)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('should not close when modal content is clicked', async () => {
    const mockResponse: DrawingJobStatusResponse = {
      jobId: mockJobId,
      status: 'completed',
      progress: 100,
      fileUrl: 'https://example.com/drawing.pdf',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    }

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    })

    render(<DrawingProgressModal isOpen={true} jobId={mockJobId} onClose={mockOnClose} />)

    jest.advanceTimersByTime(2000)

    await waitFor(() => {
      expect(screen.getByText('도면 생성 완료!')).toBeInTheDocument()
    })

    // Click on modal content (should not close)
    const modalContent = screen.getByText('도면 생성 완료!').closest('div')
    if (modalContent) {
      fireEvent.click(modalContent)
    }

    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('should handle fetch errors gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

    render(<DrawingProgressModal isOpen={true} jobId={mockJobId} onClose={mockOnClose} />)

    jest.advanceTimersByTime(2000)

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error polling job status:', expect.any(Error))
    })

    consoleErrorSpy.mockRestore()
  })

  it('should cleanup interval on unmount', async () => {
    const { unmount } = render(<DrawingProgressModal isOpen={true} jobId={mockJobId} onClose={mockOnClose} />)

    const clearIntervalSpy = jest.spyOn(global, 'clearInterval')

    unmount()

    expect(clearIntervalSpy).toHaveBeenCalled()

    clearIntervalSpy.mockRestore()
  })

  it('should reset state when modal is closed and reopened', async () => {
    const { rerender } = render(<DrawingProgressModal isOpen={true} jobId={mockJobId} onClose={mockOnClose} />)

    // Close modal
    rerender(<DrawingProgressModal isOpen={false} jobId={mockJobId} onClose={mockOnClose} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    // Reopen modal
    rerender(<DrawingProgressModal isOpen={true} jobId={mockJobId} onClose={mockOnClose} />)

    expect(screen.getByText('도면 생성 준비 중...')).toBeInTheDocument()
  })

  it('should have proper accessibility attributes', () => {
    render(<DrawingProgressModal isOpen={true} jobId={mockJobId} onClose={mockOnClose} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'drawing-progress-title')
  })

  it('should display info text while polling', () => {
    render(<DrawingProgressModal isOpen={true} jobId={mockJobId} onClose={mockOnClose} />)

    expect(screen.getByText(/도면 생성에는 약 30초 정도 소요됩니다/)).toBeInTheDocument()
    expect(screen.getByText(/잠시만 기다려 주세요.../)).toBeInTheDocument()
  })
})