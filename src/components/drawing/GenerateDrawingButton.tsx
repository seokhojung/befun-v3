'use client'

/**
 * Generate Drawing Button Component
 * Story 4.1: Drawing Generation and Design Management
 */

import { FileText } from 'lucide-react'

interface GenerateDrawingButtonProps {
  designId: string
  onGenerate: (designId: string) => void
  isGenerating?: boolean
  disabled?: boolean
}

export function GenerateDrawingButton({ designId, onGenerate, isGenerating, disabled }: GenerateDrawingButtonProps) {
  return (
    <button
      onClick={() => onGenerate(designId)}
      disabled={disabled || isGenerating}
      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label="도면 생성"
    >
      <FileText className="w-5 h-5" />
      {isGenerating ? '생성 중...' : '도면 생성'}
    </button>
  )
}