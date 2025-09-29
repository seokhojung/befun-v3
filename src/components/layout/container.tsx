import * as React from "react"
import { cn } from "@/lib/utils"

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  centered?: boolean
}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, children, maxWidth = 'xl', centered = true, ...props }, ref) => {
    const maxWidthClasses = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-7xl',
      '2xl': 'max-w-2xl',
      full: 'max-w-full'
    }

    return (
      <div
        ref={ref}
        className={cn(
          "w-full px-4 sm:px-6 lg:px-8",
          maxWidthClasses[maxWidth],
          centered && "mx-auto",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Container.displayName = "Container"

export { Container }