'use client'

import { Suspense } from 'react'
import RegisterForm from '@/components/auth/RegisterForm'
import { PageLoadingSpinner } from '@/components/auth/LoadingSpinner'

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
            BeFun 계정 만들기
          </h1>
          <p className="text-gray-600">
            3D 책상 디자인 플랫폼에 가입하고 나만의 작업 공간을 설계해보세요
          </p>
        </div>

        <Suspense fallback={<PageLoadingSpinner message="회원가입 페이지를 불러오는 중..." />}>
          <RegisterForm
            onSuccess={() => {
              console.log('회원가입 성공!')
            }}
            className="mt-8"
          />
        </Suspense>
      </div>
    </div>
  )
}