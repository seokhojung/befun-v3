'use client'

import { Suspense } from 'react'
import LoginForm from '@/components/auth/LoginForm'
import { PageLoadingSpinner } from '@/components/auth/LoadingSpinner'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
            BeFun에 오신 것을 환영합니다
          </h1>
          <p className="text-gray-600">
            3D 책상 디자인을 시작하려면 로그인하세요
          </p>
        </div>

        <Suspense fallback={<PageLoadingSpinner message="로그인 페이지를 불러오는 중..." />}>
          <LoginForm
            onSuccess={() => {
              console.log('로그인 성공!')
            }}
            className="mt-8"
          />
        </Suspense>
      </div>
    </div>
  )
}