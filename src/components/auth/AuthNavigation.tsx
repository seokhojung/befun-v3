'use client'

import { useAuthGuard, useLogout } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function AuthNavigation() {
  const { isAuthenticated, isLoading, user } = useAuthGuard()
  const { logout } = useLogout()
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-pulse h-8 w-20 bg-gray-200 rounded"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center space-x-4">
        <button
          onClick={() => router.push('/login')}
          className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors"
        >
          로그인
        </button>
        <button
          onClick={() => router.push('/register')}
          className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          회원가입
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* 데스크톱 메뉴 */}
      <div className="hidden md:flex items-center space-x-4">
        <span className="text-gray-700 text-sm">
          안녕하세요, {user?.email?.split('@')[0]}님!
        </span>
        <button
          onClick={() => router.push('/profile')}
          className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors"
        >
          마이페이지
        </button>
        <button
          onClick={() => logout()}
          className="text-gray-700 hover:text-red-600 px-3 py-2 text-sm font-medium transition-colors"
        >
          로그아웃
        </button>
      </div>

      {/* 모바일 메뉴 버튼 */}
      <div className="md:hidden">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="text-gray-700 hover:text-blue-600 p-2"
          aria-label="메뉴 열기"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* 모바일 드롭다운 메뉴 */}
      {isMenuOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 md:hidden z-50">
          <div className="py-1">
            <div className="px-4 py-2 text-sm text-gray-700 border-b">
              {user?.email?.split('@')[0]}님
            </div>
            <button
              onClick={() => {
                setIsMenuOpen(false)
                router.push('/profile')
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              마이페이지
            </button>
            <button
              onClick={() => {
                setIsMenuOpen(false)
                logout()
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              로그아웃
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// 간단한 네비게이션 바 컴포넌트
export function NavigationBar() {
  const router = useRouter()

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <button
              onClick={() => router.push('/')}
              className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors"
            >
              BeFun
            </button>
            <div className="hidden md:ml-10 md:flex md:space-x-8">
              <button
                onClick={() => router.push('/')}
                className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors"
              >
                홈
              </button>
              <button
                onClick={() => router.push('/configurator')}
                className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors"
              >
                3D 컨피규레이터
              </button>
            </div>
          </div>

          <AuthNavigation />
        </div>
      </div>
    </nav>
  )
}
