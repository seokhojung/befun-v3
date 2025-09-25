'use client'

import { useState } from 'react'
import { useAuthActions } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import type { RegisterFormData, PasswordValidation } from '@/types/auth'

interface RegisterFormProps {
  onSuccess?: () => void
  redirectTo?: string
  className?: string
}

export default function RegisterForm({ onSuccess, redirectTo = '/login', className = '' }: RegisterFormProps) {
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState<Partial<RegisterFormData>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [generalError, setGeneralError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const { signUp } = useAuthActions()
  const router = useRouter()

  // 비밀번호 강도 검증
  const validatePassword = (password: string): PasswordValidation => {
    return {
      minLength: password.length >= 8,
      hasLetter: /[A-Za-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[^A-Za-z0-9]/.test(password)
    }
  }

  const passwordValidation = formData.password ? validatePassword(formData.password) : null

  const validateForm = (): boolean => {
    const newErrors: Partial<RegisterFormData> = {}

    // 이메일 검증
    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요.'
    } else if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식을 입력해주세요.'
    }

    // 비밀번호 검증
    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요.'
    } else {
      const validation = validatePassword(formData.password)
      if (!validation.minLength) {
        newErrors.password = '비밀번호는 최소 8자 이상이어야 합니다.'
      } else if (!validation.hasLetter || !validation.hasNumber) {
        newErrors.password = '비밀번호는 영문과 숫자를 포함해야 합니다.'
      }
    }

    // 비밀번호 확인 검증
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호 확인을 입력해주세요.'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setGeneralError('')
    setSuccessMessage('')

    try {
      const result = await signUp(formData.email, formData.password)

      if (result.success) {
        setSuccessMessage('회원가입이 완료되었습니다! 로그인 페이지로 이동합니다.')
        onSuccess?.()

        // 3초 후 로그인 페이지로 리다이렉트
        setTimeout(() => {
          router.push(redirectTo)
        }, 3000)
      } else {
        setGeneralError(result.error || '회원가입 중 오류가 발생했습니다.')
      }
    } catch (error) {
      setGeneralError('네트워크 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // 입력 시 해당 필드 에러 제거
    if (errors[name as keyof RegisterFormData]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  // 비밀번호 강도 표시
  const PasswordStrengthIndicator = ({ validation }: { validation: PasswordValidation }) => {
    const checks = [
      { key: 'minLength', label: '8자 이상', valid: validation.minLength },
      { key: 'hasLetter', label: '영문 포함', valid: validation.hasLetter },
      { key: 'hasNumber', label: '숫자 포함', valid: validation.hasNumber },
      { key: 'hasSpecialChar', label: '특수문자 포함 (권장)', valid: validation.hasSpecialChar }
    ]

    return (
      <div className="mt-2 space-y-1">
        {checks.map(({ key, label, valid }) => (
          <div key={key} className="flex items-center text-sm">
            <div className={`mr-2 h-2 w-2 rounded-full ${valid ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className={valid ? 'text-green-600' : 'text-gray-500'}>
              {label}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            회원가입
          </h2>
        </div>

        {/* 성공 메시지 */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
            <div className="flex">
              <div className="ml-3">
                <div className="text-sm text-green-800">
                  {successMessage}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 일반 에러 메시지 */}
        {generalError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <div className="flex">
              <div className="ml-3">
                <div className="text-sm text-red-800">
                  {generalError}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 이메일 필드 */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            이메일
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.email ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="이메일을 입력하세요"
            disabled={isLoading}
            autoComplete="email"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        {/* 비밀번호 필드 */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            비밀번호
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.password ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="비밀번호를 입력하세요"
            disabled={isLoading}
            autoComplete="new-password"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
          )}

          {/* 비밀번호 강도 표시 */}
          {formData.password && passwordValidation && (
            <PasswordStrengthIndicator validation={passwordValidation} />
          )}
        </div>

        {/* 비밀번호 확인 필드 */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
            비밀번호 확인
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="비밀번호를 다시 입력하세요"
            disabled={isLoading}
            autoComplete="new-password"
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
          )}
        </div>

        {/* 회원가입 버튼 */}
        <div>
          <button
            type="submit"
            disabled={isLoading || !!successMessage}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              isLoading || !!successMessage
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                처리 중...
              </div>
            ) : (
              '회원가입'
            )}
          </button>
        </div>

        {/* 로그인 링크 */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            이미 계정이 있으신가요?{' '}
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:underline"
              disabled={isLoading}
            >
              로그인하기
            </button>
          </p>
        </div>
      </form>
    </div>
  )
}