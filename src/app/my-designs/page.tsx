'use client'

/**
 * My Designs Page
 * Story 4.1: Drawing Generation and Design Management
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DesignCard } from '@/components/designs/DesignCard'
import { DeleteConfirmModal } from '@/components/designs/DeleteConfirmModal'
import { DesignListResponse, DesignListItem } from '@/types/design'
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'

export default function MyDesignsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [designs, setDesigns] = useState<DesignListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; designId: string | null; designName: string }>({
    isOpen: false,
    designId: null,
    designName: '',
  })
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchDesigns = async (pageNum: number) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/v1/designs?page=${pageNum}&limit=12&sortBy=created_at&order=desc`)

      if (!response.ok) {
        throw new Error('Failed to fetch designs')
      }

      const data: DesignListResponse = await response.json()
      setDesigns(data.designs)
      setTotalPages(data.pagination.totalPages)
    } catch (err) {
      console.error('Error fetching designs:', err)
      setError('디자인을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDesigns(page)
  }, [page])

  const handleLoadDesign = (designId: string) => {
    // Navigate to configurator with design ID
    router.push(`/configurator?designId=${designId}`)
  }

  const handleDeleteDesign = (designId: string) => {
    const design = designs.find((d) => d.id === designId)
    if (design) {
      setDeleteModal({
        isOpen: true,
        designId,
        designName: design.name,
      })
    }
  }

  const confirmDelete = async () => {
    if (!deleteModal.designId) return

    try {
      setIsDeleting(true)

      const response = await fetch(`/api/v1/designs/${deleteModal.designId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete design')
      }

      // Refresh the list
      await fetchDesigns(page)

      // Close modal
      setDeleteModal({ isOpen: false, designId: null, designName: '' })

      // Show success toast
      toast({
        title: '디자인 삭제 완료',
        description: '디자인이 성공적으로 삭제되었습니다.',
        variant: 'success',
      })
    } catch (err) {
      console.error('Error deleting design:', err)
      toast({
        title: '삭제 실패',
        description: '디자인 삭제에 실패했습니다. 다시 시도해주세요.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const cancelDelete = () => {
    setDeleteModal({ isOpen: false, designId: null, designName: '' })
  }

  const handleDownloadDrawing = async (designId: string) => {
    try {
      // Redirect to download endpoint
      window.open(`/api/v1/drawings/download/${designId}`, '_blank')
    } catch (err) {
      console.error('Error downloading drawing:', err)
      toast({
        title: '다운로드 실패',
        description: '도면 다운로드에 실패했습니다. 다시 시도해주세요.',
        variant: 'destructive',
      })
    }
  }

  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1)
    }
  }

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">내 디자인 관리</h1>
          <p className="text-gray-600 mt-2">저장한 책상 디자인을 확인하고 관리하세요</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">불러오는 중...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600">{error}</p>
            <button onClick={() => fetchDesigns(page)} className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
              다시 시도
            </button>
          </div>
        ) : designs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-600 text-lg mb-4">아직 저장된 디자인이 없습니다.</p>
            <button
              onClick={() => router.push('/configurator')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              새 디자인 만들기
            </button>
          </div>
        ) : (
          <>
            {/* Design Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {designs.map((design) => (
                <DesignCard
                  key={design.id}
                  design={design}
                  onLoad={handleLoadDesign}
                  onDelete={handleDeleteDesign}
                  onDownloadDrawing={handleDownloadDrawing}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <button
                  onClick={handlePrevPage}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="이전 페이지"
                >
                  <ChevronLeft className="w-4 h-4" />
                  이전
                </button>

                <span className="text-gray-600">
                  페이지 {page} / {totalPages}
                </span>

                <button
                  onClick={handleNextPage}
                  disabled={page === totalPages}
                  className="flex items-center gap-1 px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="다음 페이지"
                >
                  다음
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        designName={deleteModal.designName}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        isDeleting={isDeleting}
      />

      {/* Toast Notifications */}
      <Toaster />
    </div>
  )
}