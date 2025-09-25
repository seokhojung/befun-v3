'use client'

import { Suspense } from 'react'
import UserProfile from '@/components/auth/UserProfile'
import { PageLoadingSpinner } from '@/components/auth/LoadingSpinner'
import { ClientAuthGuard } from '@/components/auth/AuthGuard'

export default function ProfilePage() {
  return (
    <ClientAuthGuard
      fallback={<PageLoadingSpinner message="인증 확인 중..." />}
      redirectTo="/login"
    >
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">마이페이지</h1>
            <p className="mt-2 text-gray-600">
              계정 정보를 관리하고 설정을 변경할 수 있습니다.
            </p>
          </div>

          <Suspense fallback={<PageLoadingSpinner message="프로필을 불러오는 중..." />}>
            <UserProfile className="mb-8" />
          </Suspense>

          {/* 향후 추가될 기능들을 위한 섹션 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">저장된 디자인</h3>
              <p className="text-gray-600 mb-4">
                3D 책상 컨피규레이터에서 제작한 디자인들을 확인할 수 있습니다.
              </p>
              <button
                disabled
                className="px-4 py-2 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed"
              >
                곧 출시 예정
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">활동 히스토리</h3>
              <p className="text-gray-600 mb-4">
                로그인 기록과 계정 활동 내역을 확인할 수 있습니다.
              </p>
              <button
                disabled
                className="px-4 py-2 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed"
              >
                곧 출시 예정
              </button>
            </div>
          </div>
        </div>
      </div>
    </ClientAuthGuard>
  )
}