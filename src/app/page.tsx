'use client'

import { useAuthGuard } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

export default function Home() {
  const { isAuthenticated, user, isLoading } = useAuthGuard()
  const router = useRouter()

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">로딩 중...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            BeFun v3
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8">
            3D 책상 컨피규레이터 플랫폼
          </p>
          <p className="text-lg text-gray-500 mb-12 max-w-3xl mx-auto">
            나만의 완벽한 작업 공간을 설계해보세요.
            {isAuthenticated ? (
              <span className="text-blue-600 font-medium"> 안녕하세요, {user?.email?.split('@')[0]}님!</span>
            ) : (
              ' 지금 가입하고 시작해보세요.'
            )}
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-6 justify-center items-center mb-16">
          {!isAuthenticated ? (
            <>
              <button
                onClick={() => router.push('/register')}
                className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
              >
                무료로 시작하기
              </button>
              <button
                onClick={() => router.push('/login')}
                className="bg-white text-blue-600 border-2 border-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-50 transition-colors shadow-lg"
              >
                로그인
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => router.push('/configurator')}
                className="bg-green-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-green-700 transition-colors shadow-lg"
              >
                3D 컨피규레이터 시작하기
              </button>
              <button
                onClick={() => router.push('/profile')}
                className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
              >
                마이페이지
              </button>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-xl p-8 shadow-lg">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h6m-6 4h6m-6 4h6" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">3D 시각화</h3>
            <p className="text-gray-600">
              실시간 3D 렌더링으로 책상 디자인을 시각적으로 확인하고 조정할 수 있습니다.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-lg">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">맞춤 설정</h3>
            <p className="text-gray-600">
              크기, 재질, 색상 등 다양한 옵션을 조합하여 나만의 책상을 디자인할 수 있습니다.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-lg">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">저장 및 공유</h3>
            <p className="text-gray-600">
              완성된 디자인을 저장하고, 친구들과 공유하거나 주문할 수 있습니다.
            </p>
          </div>
        </div>

        {/* 인증 상태 표시 */}
        <div className="text-center bg-white rounded-xl p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {isAuthenticated ? '인증 시스템 테스트 완료' : '시작하려면 계정이 필요합니다'}
          </h2>
          <p className="text-gray-600 mb-6">
            {isAuthenticated
              ? `현재 ${user?.email} 계정으로 로그인되어 있습니다. 사용자 인증 시스템이 정상적으로 작동하고 있습니다.`
              : '회원가입을 통해 개인화된 3D 책상 디자인 서비스를 이용해보세요.'
            }
          </p>
          {!isAuthenticated && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push('/register')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                지금 가입하기
              </button>
              <button
                onClick={() => router.push('/login')}
                className="text-blue-600 border border-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors"
              >
                기존 계정으로 로그인
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}