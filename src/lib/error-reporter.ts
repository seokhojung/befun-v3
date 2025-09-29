// Error reporting and logging system

interface ErrorReport {
  message: string
  stack?: string
  url: string
  userAgent: string
  timestamp: string
  userId?: string
  sessionId?: string
  buildVersion?: string
  additionalContext?: Record<string, any>
}

interface ErrorLogEntry extends ErrorReport {
  id: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: 'ui' | 'api' | 'auth' | 'system' | 'unknown'
  resolved: boolean
}

class ErrorReporter {
  private errorQueue: ErrorReport[] = []
  private isOnline: boolean = true
  private maxQueueSize: number = 100
  private flushInterval: number = 30000 // 30 seconds
  private intervalId?: number

  constructor() {
    this.setupEventListeners()
    this.startPeriodicFlush()
  }

  private setupEventListeners() {
    // Global error handler
    if (typeof window !== 'undefined') {
      window.addEventListener('error', this.handleGlobalError.bind(this))
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this))
      window.addEventListener('online', () => this.setOnlineStatus(true))
      window.addEventListener('offline', () => this.setOnlineStatus(false))
    }
  }

  private handleGlobalError(event: ErrorEvent) {
    this.reportError({
      message: event.message,
      stack: event.error?.stack,
      url: event.filename,
      line: event.lineno,
      column: event.colno,
    })
  }

  private handleUnhandledRejection(event: PromiseRejectionEvent) {
    this.reportError({
      message: `Unhandled Promise Rejection: ${event.reason}`,
      stack: event.reason?.stack,
      type: 'unhandledrejection',
    })
  }

  private setOnlineStatus(online: boolean) {
    this.isOnline = online
    if (online && this.errorQueue.length > 0) {
      this.flushErrors()
    }
  }

  private generateErrorId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private categorizeError(error: Partial<ErrorReport>): ErrorLogEntry['category'] {
    const message = error.message?.toLowerCase() || ''

    if (message.includes('auth') || message.includes('login') || message.includes('permission')) {
      return 'auth'
    }
    if (message.includes('fetch') || message.includes('api') || message.includes('network')) {
      return 'api'
    }
    if (message.includes('render') || message.includes('component') || message.includes('ui')) {
      return 'ui'
    }
    if (message.includes('memory') || message.includes('quota') || message.includes('system')) {
      return 'system'
    }

    return 'unknown'
  }

  private assessSeverity(error: Partial<ErrorReport>): ErrorLogEntry['severity'] {
    const message = error.message?.toLowerCase() || ''

    if (message.includes('critical') || message.includes('fatal') || message.includes('crash')) {
      return 'critical'
    }
    if (message.includes('error') || message.includes('failed') || message.includes('exception')) {
      return 'high'
    }
    if (message.includes('warning') || message.includes('deprecated')) {
      return 'medium'
    }

    return 'low'
  }

  public reportError(error: Partial<ErrorReport & { line?: number; column?: number; type?: string }>) {
    try {
      const errorReport: ErrorReport = {
        message: error.message || 'Unknown error',
        stack: error.stack,
        url: error.url || (typeof window !== 'undefined' ? window.location.href : ''),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        timestamp: new Date().toISOString(),
        userId: this.getCurrentUserId(),
        sessionId: this.getSessionId(),
        buildVersion: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
        additionalContext: {
          line: error.line,
          column: error.column,
          type: error.type,
          pathname: typeof window !== 'undefined' ? window.location.pathname : '',
          ...error.additionalContext,
        },
      }

      // Add to queue
      this.errorQueue.push(errorReport)

      // Prevent memory leaks by limiting queue size
      if (this.errorQueue.length > this.maxQueueSize) {
        this.errorQueue = this.errorQueue.slice(-this.maxQueueSize / 2)
      }

      // Try immediate flush if online
      if (this.isOnline) {
        this.flushErrors()
      }

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error reported:', errorReport)
      }
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError)
    }
  }

  private async flushErrors() {
    if (this.errorQueue.length === 0 || !this.isOnline) {
      return
    }

    try {
      const errorsToSend = [...this.errorQueue]
      this.errorQueue = []

      // Convert to log entries
      const logEntries: ErrorLogEntry[] = errorsToSend.map(error => ({
        ...error,
        id: this.generateErrorId(),
        severity: this.assessSeverity(error),
        category: this.categorizeError(error),
        resolved: false,
      }))

      // Send to error service (implement based on your error service)
      await this.sendToErrorService(logEntries)

      // Store locally as backup
      this.storeErrorsLocally(logEntries)

    } catch (flushError) {
      console.error('Failed to flush errors:', flushError)
      // Put errors back in queue for retry
      this.errorQueue = [...this.errorQueue, ...this.errorQueue]
    }
  }

  private async sendToErrorService(errors: ErrorLogEntry[]) {
    // Implement your error service integration here
    // Examples: Sentry, LogRocket, Bugsnag, custom API

    if (process.env.NEXT_PUBLIC_ERROR_REPORTING_URL) {
      await fetch(process.env.NEXT_PUBLIC_ERROR_REPORTING_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          errors,
          meta: {
            timestamp: new Date().toISOString(),
            source: 'frontend',
            version: process.env.NEXT_PUBLIC_APP_VERSION,
          },
        }),
      })
    }
  }

  private storeErrorsLocally(errors: ErrorLogEntry[]) {
    try {
      if (typeof localStorage !== 'undefined') {
        const existing = localStorage.getItem('error-logs')
        const existingErrors: ErrorLogEntry[] = existing ? JSON.parse(existing) : []

        const combined = [...existingErrors, ...errors]
          .slice(-50) // Keep only last 50 errors

        localStorage.setItem('error-logs', JSON.stringify(combined))
      }
    } catch (storageError) {
      console.error('Failed to store errors locally:', storageError)
    }
  }

  private getCurrentUserId(): string | undefined {
    // Implement based on your auth system
    if (typeof window !== 'undefined') {
      return localStorage.getItem('user-id') || undefined
    }
    return undefined
  }

  private getSessionId(): string | undefined {
    // Generate or retrieve session ID
    if (typeof window !== 'undefined') {
      let sessionId = sessionStorage.getItem('session-id')
      if (!sessionId) {
        sessionId = this.generateErrorId()
        sessionStorage.setItem('session-id', sessionId)
      }
      return sessionId
    }
    return undefined
  }

  private startPeriodicFlush() {
    if (typeof window !== 'undefined') {
      this.intervalId = window.setInterval(() => {
        this.flushErrors()
      }, this.flushInterval)
    }
  }

  public destroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('error', this.handleGlobalError)
      window.removeEventListener('unhandledrejection', this.handleUnhandledRejection)
      window.removeEventListener('online', () => this.setOnlineStatus(true))
      window.removeEventListener('offline', () => this.setOnlineStatus(false))
    }
  }

  // Utility method to get stored errors for debugging
  public getStoredErrors(): ErrorLogEntry[] {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('error-logs')
        return stored ? JSON.parse(stored) : []
      }
    } catch {
      // Ignore storage errors
    }
    return []
  }
}

// Singleton instance
export const errorReporter = new ErrorReporter()

// Convenience functions
export function reportError(error: Error | string, context?: Record<string, any>) {
  if (typeof error === 'string') {
    errorReporter.reportError({
      message: error,
      additionalContext: context,
    })
  } else {
    errorReporter.reportError({
      message: error.message,
      stack: error.stack,
      additionalContext: context,
    })
  }
}

export function reportApiError(url: string, status: number, response?: any) {
  errorReporter.reportError({
    message: `API Error: ${status} at ${url}`,
    additionalContext: {
      url,
      status,
      response: typeof response === 'string' ? response : JSON.stringify(response),
      type: 'api-error',
    },
  })
}