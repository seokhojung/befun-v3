// 기본 응답 타입
export interface ApiResponse<T = any> {
  status: 'success' | 'error' | 'healthy'
  message?: string
  data?: T
  timestamp?: string
}

// 사용자 관련 타입 (향후 확장용)
export interface User {
  id: string
  email: string
  name?: string
  createdAt: string
  updatedAt: string
}

// 컴포넌트 Props 기본 타입
export interface BaseProps {
  className?: string
  children?: React.ReactNode
}