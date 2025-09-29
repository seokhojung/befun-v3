"use client"

import * as React from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "./button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card"

interface ErrorInfo {
  componentStack: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  retryCount: number
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{
    error?: Error
    resetError: () => void
    retryCount: number
  }>
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  maxRetries?: number
  resetKeys?: Array<string | number | boolean | null | undefined>
}

// Default fallback component
const DefaultErrorFallback: React.FC<{
  error?: Error
  resetError: () => void
  retryCount: number
}> = ({ error, resetError, retryCount }) => (
  <Card className="w-full max-w-md mx-auto">
    <CardHeader>
      <div className="flex items-center space-x-2">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <CardTitle>오류가 발생했습니다</CardTitle>
      </div>
      <CardDescription>
        예상치 못한 오류가 발생했습니다. 다시 시도하거나 페이지를 새로고침해 주세요.
      </CardDescription>
    </CardHeader>

    {error && process.env.NODE_ENV === "development" && (
      <CardContent>
        <details className="space-y-2">
          <summary className="cursor-pointer font-medium text-sm">
            개발자 정보 보기
          </summary>
          <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
            {error.message}
            {error.stack}
          </pre>
        </details>
      </CardContent>
    )}

    <CardFooter className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">
        재시도 {retryCount}회
      </span>
      <Button
        onClick={resetError}
        variant="outline"
        size="sm"
        className="flex items-center space-x-2"
      >
        <RefreshCw className="h-4 w-4" />
        <span>다시 시도</span>
      </Button>
    </CardFooter>
  </Card>
)

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null

  constructor(props: ErrorBoundaryProps) {
    super(props)

    this.state = {
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: 0,
    }

    this.resetError = this.resetError.bind(this)
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      errorInfo,
    })

    // Call onError callback if provided
    this.props.onError?.(error, errorInfo)

    // Log error to external service in production
    if (process.env.NODE_ENV === "production") {
      console.error("Error Boundary caught an error:", error, errorInfo)
      // Here you could send to error reporting service like Sentry
      // logErrorToService(error, errorInfo)
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { hasError } = this.state
    const { resetKeys } = this.props

    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys?.some((key, idx) => key !== prevProps.resetKeys?.[idx])) {
        this.resetError()
      }
    }
  }

  resetError() {
    const maxRetries = this.props.maxRetries || 3

    if (this.state.retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: prevState.retryCount + 1,
      }))

      // Auto-reset after failed retry
      if (this.resetTimeoutId) {
        window.clearTimeout(this.resetTimeoutId)
      }

      this.resetTimeoutId = window.setTimeout(() => {
        if (this.state.hasError) {
          this.setState(prevState => ({
            retryCount: Math.max(0, prevState.retryCount - 1),
          }))
        }
      }, 5000) // Reset retry count after 5 seconds
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      window.clearTimeout(this.resetTimeoutId)
    }
  }

  render() {
    const { hasError, error, retryCount } = this.state
    const { children, fallback: Fallback = DefaultErrorFallback } = this.props

    if (hasError) {
      return (
        <Fallback
          error={error}
          resetError={this.resetError}
          retryCount={retryCount}
        />
      )
    }

    return children
  }
}

// Hook for functional components to handle errors
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null)

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  const captureError = React.useCallback((error: Error) => {
    setError(error)
  }, [])

  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  return { captureError, resetError }
}

// Higher-order component wrapper
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}

export { ErrorBoundary }