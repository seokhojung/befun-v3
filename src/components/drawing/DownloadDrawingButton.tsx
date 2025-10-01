'use client'

/**
 * Download Drawing Button Component
 * Story 4.1: Drawing Generation and Design Management
 */

import { Download } from 'lucide-react'

interface DownloadDrawingButtonProps {
  designId: string
  onDownload: (designId: string) => void
  disabled?: boolean
}

export function DownloadDrawingButton({ designId, onDownload, disabled }: DownloadDrawingButtonProps) {
  return (
    <button
      onClick={() => onDownload(designId)}
      disabled={disabled}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label="도면 다운로드"
    >
      <Download className="w-5 h-5" />
      도면 다운로드
    </button>
  )
}