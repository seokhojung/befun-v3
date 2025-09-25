interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'secondary' | 'white' | 'gray'
  message?: string
  className?: string
}

export default function LoadingSpinner({
  size = 'md',
  color = 'primary',
  message,
  className = ''
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }

  const colorClasses = {
    primary: 'border-blue-600',
    secondary: 'border-gray-600',
    white: 'border-white',
    gray: 'border-gray-400'
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`animate-spin rounded-full border-2 border-t-transparent ${sizeClasses[size]} ${colorClasses[color]}`}
        role="status"
        aria-label="로딩 중"
      >
        <span className="sr-only">로딩 중...</span>
      </div>
      {message && (
        <span className="ml-3 text-sm text-gray-600">{message}</span>
      )}
    </div>
  )
}

// 전체 페이지 로딩 컴포넌트
export function PageLoadingSpinner({ message = "페이지를 불러오는 중..." }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingSpinner size="lg" color="primary" />
        <p className="mt-4 text-gray-600">{message}</p>
      </div>
    </div>
  )
}

// 인라인 로딩 컴포넌트
export function InlineLoadingSpinner({ message, className }: { message?: string; className?: string }) {
  return (
    <div className={`flex items-center py-4 ${className}`}>
      <LoadingSpinner size="sm" color="gray" />
      {message && <span className="ml-2 text-sm text-gray-500">{message}</span>}
    </div>
  )
}