'use client'

import { useState, useEffect } from 'react'
import { useProfile, useLogout } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

interface UserProfileProps {
  className?: string
}

interface ProfileData {
  full_name?: string
  avatar_url?: string
  website?: string
  bio?: string
  settings?: {
    theme: 'light' | 'dark' | 'system'
    language: 'ko' | 'en'
    notifications_enabled: boolean
    email_notifications: boolean
  }
}

export default function UserProfile({ className = '' }: UserProfileProps) {
  const { user, updateProfile } = useProfile()
  const { confirmLogout } = useLogout()

  const [profileData, setProfileData] = useState<ProfileData>({
    full_name: '',
    avatar_url: '',
    website: '',
    bio: '',
    settings: {
      theme: 'light',
      language: 'ko',
      notifications_enabled: true,
      email_notifications: true
    }
  })

  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // 프로필 정보 로드
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return

      setIsLoading(true)
      try {
        // 세션에서 토큰 가져오기
        const { data: { session } } = await supabase.auth.getSession()

        const response = await fetch('/api/auth/profile', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
          },
        })

        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            setProfileData({
              full_name: result.data.full_name || '',
              avatar_url: result.data.avatar_url || '',
              website: result.data.website || '',
              bio: result.data.bio || '',
              settings: result.data.settings || {
                theme: 'light',
                language: 'ko',
                notifications_enabled: true,
                email_notifications: true
              }
            })
          }
        }
      } catch (error) {
        console.error('Failed to load profile:', error)
        setMessage({ type: 'error', text: '프로필 정보를 불러올 수 없습니다.' })
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [user])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target

    if (name.startsWith('settings.')) {
      const settingKey = name.split('.')[1] as keyof ProfileData['settings']
      setProfileData(prev => ({
        ...prev,
        settings: {
          ...prev.settings!,
          [settingKey]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }
      }))
    } else {
      setProfileData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setIsSaving(true)
    setMessage(null)

    try {
      // 직접 API 호출로 변경
      const { data: { session } } = await supabase.auth.getSession()

      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(profileData),
      })

      const result = await response.json()

      if (result.success) {
        setMessage({ type: 'success', text: '프로필이 성공적으로 업데이트되었습니다.' })
        setIsEditing(false)
      } else {
        setMessage({ type: 'error', text: result.error?.message || '프로필 업데이트에 실패했습니다.' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '프로필 업데이트 중 오류가 발생했습니다.' })
    } finally {
      setIsSaving(false)
    }
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '정보 없음'
    return new Date(dateString).toLocaleDateString('ko-KR')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span className="ml-2">프로필 정보를 불러오는 중...</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">사용자 정보를 찾을 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div className={`max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6 ${className}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">내 프로필</h2>
        <div className="space-x-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              수정하기
            </button>
          ) : (
            <div className="space-x-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                disabled={isSaving}
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={isSaving}
              >
                {isSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 메시지 */}
      {message && (
        <div className={`mb-4 p-4 rounded-md ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 기본 정보 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              이메일
            </label>
            <input
              type="email"
              value={user.email || ''}
              disabled
              className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              이름
            </label>
            <input
              type="text"
              name="full_name"
              value={profileData.full_name}
              onChange={handleInputChange}
              disabled={!isEditing}
              className={`w-full px-3 py-2 border rounded-md ${
                isEditing ? 'border-gray-300 focus:ring-2 focus:ring-blue-500' : 'bg-gray-50 border-gray-200'
              }`}
              placeholder="이름을 입력하세요"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            웹사이트
          </label>
          <input
            type="url"
            name="website"
            value={profileData.website}
            onChange={handleInputChange}
            disabled={!isEditing}
            className={`w-full px-3 py-2 border rounded-md ${
              isEditing ? 'border-gray-300 focus:ring-2 focus:ring-blue-500' : 'bg-gray-50 border-gray-200'
            }`}
            placeholder="https://"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            소개
          </label>
          <textarea
            name="bio"
            value={profileData.bio}
            onChange={handleInputChange}
            disabled={!isEditing}
            rows={3}
            className={`w-full px-3 py-2 border rounded-md ${
              isEditing ? 'border-gray-300 focus:ring-2 focus:ring-blue-500' : 'bg-gray-50 border-gray-200'
            }`}
            placeholder="자신에 대해 간단히 소개해보세요"
            maxLength={500}
          />
        </div>

        {/* 계정 정보 */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">계정 정보</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="block text-sm font-medium text-gray-700">가입일</span>
              <span className="text-sm text-gray-600">{formatDate(user.created_at)}</span>
            </div>
            <div>
              <span className="block text-sm font-medium text-gray-700">마지막 로그인</span>
              <span className="text-sm text-gray-600">{formatDate(user.last_sign_in_at)}</span>
            </div>
          </div>
        </div>

        {/* 설정 */}
        {isEditing && profileData.settings && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">설정</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  테마
                </label>
                <select
                  name="settings.theme"
                  value={profileData.settings.theme}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="light">라이트</option>
                  <option value="dark">다크</option>
                  <option value="system">시스템 설정</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  언어
                </label>
                <select
                  name="settings.language"
                  value={profileData.settings.language}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ko">한국어</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="settings.notifications_enabled"
                    checked={profileData.settings.notifications_enabled}
                    onChange={handleInputChange}
                    className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">알림 받기</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="settings.email_notifications"
                    checked={profileData.settings.email_notifications}
                    onChange={handleInputChange}
                    className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">이메일 알림 받기</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* 계정 관리 */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">계정 관리</h3>
          <button
            type="button"
            onClick={() => confirmLogout()}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            로그아웃
          </button>
        </div>
      </form>
    </div>
  )
}