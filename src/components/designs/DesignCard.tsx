'use client'

/**
 * Design Card Component
 * Story 4.1: Drawing Generation and Design Management
 */

import { DesignListItem } from '@/types/design'
import { Trash2, Download, Edit } from 'lucide-react'
import { getMaterialKorean } from '@/lib/utils/material'
import Image from 'next/image'

interface DesignCardProps {
  design: DesignListItem
  onLoad?: (id: string) => void
  onDelete?: (id: string) => void
  onDownloadDrawing?: (id: string) => void
}

export function DesignCard({ design, onLoad, onDelete, onDownloadDrawing }: DesignCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }


  return (
    <div className="border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-white">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gray-100 rounded-t-lg overflow-hidden">
        {design.thumbnail_url ? (
          <Image
            src={design.thumbnail_url}
            alt={design.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2 truncate">{design.name}</h3>

        {/* Specs */}
        <div className="space-y-1 text-sm text-gray-600 mb-3">
          <p>
            치수: {design.width_cm} × {design.depth_cm} × {design.height_cm} cm
          </p>
          <p>재료: {getMaterialKorean(design.material)}</p>
          <p className="font-semibold text-blue-600">{formatPrice(design.calculated_price)}</p>
        </div>

        {/* Meta */}
        <div className="text-xs text-gray-500 mb-3">생성일: {formatDate(design.created_at)}</div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onLoad?.(design.id)}
            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm flex items-center justify-center gap-1"
            aria-label="디자인 불러오기"
          >
            <Edit className="w-4 h-4" />
            불러오기
          </button>

          {design.drawing_file_url && onDownloadDrawing && (
            <button
              onClick={() => onDownloadDrawing(design.id)}
              className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
              aria-label="도면 다운로드"
              title="도면 다운로드"
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => onDelete?.(design.id)}
            className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
            aria-label="디자인 삭제"
            title="삭제"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}