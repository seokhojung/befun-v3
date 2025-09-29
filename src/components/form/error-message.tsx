import * as React from "react"
import { cn } from "@/lib/utils"
import { AlertCircle } from "lucide-react"

export interface ErrorMessageProps extends React.HTMLAttributes<HTMLDivElement> {
  message?: string
  children?: React.ReactNode
  showIcon?: boolean
}

const ErrorMessage = React.forwardRef<HTMLDivElement, ErrorMessageProps>(
  ({ className, message, children, showIcon = true, ...props }, ref) => {
    const errorContent = message || children

    if (!errorContent) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center space-x-2 text-sm text-destructive",
          className
        )}
        role="alert"
        {...props}
      >
        {showIcon && (
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
        )}
        <span>{errorContent}</span>
      </div>
    )
  }
)
ErrorMessage.displayName = "ErrorMessage"

export { ErrorMessage }