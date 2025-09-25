import Link from 'next/link'

interface ErrorMessageProps {
  title?: string
  message: string
  type?: 'error' | 'warning' | 'info'
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
}

export default function ErrorMessage({
  title = '오류가 발생했습니다',
  message,
  type = 'error',
  onRetry,
  onDismiss,
  className = ''
}: ErrorMessageProps) {
  const typeStyles = {
    error: {
      container: 'bg-red-50 border-red-200',
      icon: 'text-red-400',
      title: 'text-red-800',
      message: 'text-red-700',
      button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-200',
      icon: 'text-yellow-400',
      title: 'text-yellow-800',
      message: 'text-yellow-700',
      button: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
    },
    info: {
      container: 'bg-blue-50 border-blue-200',
      icon: 'text-blue-400',
      title: 'text-blue-800',
      message: 'text-blue-700',
      button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
    }
  }

  const styles = typeStyles[type]

  const getIcon = () => {
    switch (type) {
      case 'error':
        return (
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
        )
      case 'warning':
        return (
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        )
      case 'info':
        return (
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div className={`rounded-md border p-4 ${styles.container} ${className}`}>
      <div className="flex">
        <div className={`flex-shrink-0 ${styles.icon}`}>
          {getIcon()}
        </div>
        <div className="ml-3">
          <h3 className={`text-sm font-medium ${styles.title}`}>
            {title}
          </h3>
          <div className={`mt-2 text-sm ${styles.message}`}>
            <p>{message}</p>
          </div>
          {(onRetry || onDismiss) && (
            <div className="mt-4">
              <div className="-mx-2 -my-1.5 flex">
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className={`rounded-md px-2 py-1.5 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${styles.button}`}
                  >
                    다시 시도
                  </button>
                )}
                {onDismiss && (
                  <button
                    type="button"
                    onClick={onDismiss}
                    className={`ml-3 rounded-md px-2 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${styles.title} bg-transparent hover:bg-opacity-10 hover:bg-current`}
                  >
                    닫기
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 페이지 전체 에러 컴포넌트
export function PageErrorMessage({
  title = '페이지를 불러올 수 없습니다',
  message,
  onRetry,
  showHomeLink = true
}: {
  title?: string
  message: string
  onRetry?: () => void
  showHomeLink?: boolean
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full">
        <ErrorMessage
          title={title}
          message={message}
          onRetry={onRetry}
          className="shadow-lg"
        />
        {showHomeLink && (
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm text-blue-600 hover:text-blue-500 focus:outline-none focus:underline"
            >
              홈페이지로 돌아가기
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

// 폼 에러 컴포넌트
export function FormErrorMessage({ message, className }: { message: string; className?: string }) {
  return (
    <div className={`text-sm text-red-600 mt-1 ${className}`}>
      {message}
    </div>
  )
}

// 토스트 형태의 에러 메시지
export function ToastErrorMessage({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full">
      <div className="bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{message}</p>
          <button
            onClick={onDismiss}
            className="ml-4 text-white hover:text-gray-200 focus:outline-none"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}