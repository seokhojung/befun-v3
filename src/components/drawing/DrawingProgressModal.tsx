'use client'

/**
 * Drawing Progress Modal Component
 * Story 4.1: Drawing Generation and Design Management
 */

import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2, XCircle, Download } from 'lucide-react'
import { DrawingJobStatusResponse } from '@/types/drawing'

interface DrawingProgressModalProps {
  isOpen: boolean
  jobId: string | null
  onClose: () => void
  onDownload?: (fileUrl: string) => void
}

export function DrawingProgressModal({ isOpen, jobId, onClose, onDownload }: DrawingProgressModalProps) {
  const [jobStatus, setJobStatus] = useState<DrawingJobStatusResponse | null>(null)
  const [polling, setPolling] = useState(false)

  useEffect(() => {
    if (!isOpen || !jobId) {
      setJobStatus(null)
      setPolling(false)
      return
    }

    setPolling(true)
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/v1/drawings/status/${jobId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch job status')
        }

        const data: DrawingJobStatusResponse = await response.json()
        setJobStatus(data)

        // Stop polling if completed or failed
        if (data.status === 'completed' || data.status === 'failed') {
          setPolling(false)
          clearInterval(pollInterval)
        }
      } catch (error) {
        console.error('Error polling job status:', error)
      }
    }, 2000) // Poll every 2 seconds

    return () => {
      clearInterval(pollInterval)
    }
  }, [isOpen, jobId])

  if (!isOpen) return null

  const getStatusIcon = () => {
    if (!jobStatus) return <Loader2 className="w-12 h-12 animate-spin text-blue-600" />

    switch (jobStatus.status) {
      case 'completed':
        return <CheckCircle2 className="w-12 h-12 text-green-600" />
      case 'failed':
        return <XCircle className="w-12 h-12 text-red-600" />
      default:
        return <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
    }
  }

  const getStatusText = () => {
    if (!jobStatus) return '도면 생성 준비 중...'

    switch (jobStatus.status) {
      case 'pending':
        return '대기 중...'
      case 'processing':
        return '도면 생성 중...'
      case 'completed':
        return '도면 생성 완료!'
      case 'failed':
        return '도면 생성 실패'
      default:
        return '처리 중...'
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={jobStatus?.status === 'completed' || jobStatus?.status === 'failed' ? onClose : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawing-progress-title"
    >
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* Status Icon */}
        <div className="flex items-center justify-center mb-4">{getStatusIcon()}</div>

        {/* Title */}
        <h2 id="drawing-progress-title" className="text-xl font-bold text-center mb-4">
          {getStatusText()}
        </h2>

        {/* Progress Bar */}
        {jobStatus && jobStatus.status !== 'completed' && jobStatus.status !== 'failed' && (
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-blue-600 h-2.5 transition-all duration-300 ease-out"
                style={{ width: `${jobStatus.progress}%` }}
              />
            </div>
            <p className="text-center text-sm text-gray-600 mt-2">{jobStatus.progress}%</p>
          </div>
        )}

        {/* Error Message */}
        {jobStatus?.status === 'failed' && jobStatus.errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{jobStatus.errorMessage}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {jobStatus?.status === 'completed' && jobStatus.fileUrl && onDownload ? (
            <>
              <button
                onClick={() => onDownload(jobStatus.fileUrl!)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                다운로드
              </button>
              <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                닫기
              </button>
            </>
          ) : jobStatus?.status === 'failed' ? (
            <button onClick={onClose} className="w-full px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
              닫기
            </button>
          ) : null}
        </div>

        {/* Info Text */}
        {polling && (
          <p className="text-xs text-gray-500 text-center mt-4">
            도면 생성에는 약 30초 정도 소요됩니다.
            <br />
            잠시만 기다려 주세요...
          </p>
        )}
      </div>
    </div>
  )
}