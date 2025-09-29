"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, X } from "lucide-react"

export interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  side?: 'left' | 'right'
  collapsible?: boolean
  defaultCollapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  overlay?: boolean
  onClose?: () => void
  title?: string
}

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({
    className,
    children,
    side = 'left',
    collapsible = true,
    defaultCollapsed = false,
    onCollapsedChange,
    overlay = false,
    onClose,
    title,
    ...props
  }, ref) => {
    const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed)

    const handleToggleCollapse = () => {
      const newCollapsed = !isCollapsed
      setIsCollapsed(newCollapsed)
      onCollapsedChange?.(newCollapsed)
    }

    const sidebarClasses = cn(
      "relative flex flex-col border-r bg-background",
      side === 'right' && "border-r-0 border-l",
      overlay && [
        "fixed inset-y-0 z-50",
        side === 'left' ? "left-0" : "right-0",
        "w-80 sm:w-96"
      ],
      !overlay && [
        "h-full transition-all duration-300 ease-in-out",
        isCollapsed ? "w-16" : "w-80",
        "min-w-0"
      ],
      className
    )

    return (
      <>
        {/* Overlay backdrop for mobile */}
        {overlay && (
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
        )}

        <div
          ref={ref}
          className={sidebarClasses}
          {...props}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            {!isCollapsed && title && (
              <h2 className="text-lg font-semibold">{title}</h2>
            )}

            <div className="flex items-center space-x-1">
              {/* Collapse button */}
              {collapsible && !overlay && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleToggleCollapse}
                  aria-label={isCollapsed ? "사이드바 펼치기" : "사이드바 접기"}
                >
                  {side === 'left' ? (
                    isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />
                  ) : (
                    isCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              )}

              {/* Close button for overlay */}
              {overlay && onClose && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  aria-label="사이드바 닫기"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            <div className={cn(
              "p-4",
              isCollapsed && !overlay && "hidden"
            )}>
              {children}
            </div>
          </div>

          {/* Collapsed state indicator */}
          {isCollapsed && !overlay && (
            <div className="p-2 border-t">
              <div className="w-full h-2 bg-accent rounded-full" />
            </div>
          )}
        </div>
      </>
    )
  }
)
Sidebar.displayName = "Sidebar"

export { Sidebar }

// Sidebar content helpers for 3D Configurator
export interface SidebarSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  children: React.ReactNode
  collapsible?: boolean
  defaultExpanded?: boolean
}

export const SidebarSection = React.forwardRef<HTMLDivElement, SidebarSectionProps>(
  ({ className, title, children, collapsible = true, defaultExpanded = true, ...props }, ref) => {
    const [isExpanded, setIsExpanded] = React.useState(defaultExpanded)

    return (
      <div
        ref={ref}
        className={cn("border-b last:border-b-0", className)}
        {...props}
      >
        <button
          onClick={() => collapsible && setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-accent/50 transition-colors"
          disabled={!collapsible}
        >
          <h3 className="font-medium">{title}</h3>
          {collapsible && (
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform",
                isExpanded && "rotate-90"
              )}
            />
          )}
        </button>
        {isExpanded && (
          <div className="px-4 pb-4">
            {children}
          </div>
        )}
      </div>
    )
  }
)
SidebarSection.displayName = "SidebarSection"