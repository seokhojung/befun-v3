import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "./label"
import { ErrorMessage } from "./error-message"

export interface FieldGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  label?: string
  error?: string
  required?: boolean
  description?: string
  htmlFor?: string
  inline?: boolean
}

const FieldGroup = React.forwardRef<HTMLDivElement, FieldGroupProps>(
  ({
    className,
    children,
    label,
    error,
    required,
    description,
    htmlFor,
    inline = false,
    ...props
  }, ref) => {
    const generatedId = React.useId()
    const fieldId = htmlFor || generatedId

    return (
      <div
        ref={ref}
        className={cn(
          "space-y-2",
          inline && "flex items-center space-y-0 space-x-4",
          className
        )}
        {...props}
      >
        {/* Label */}
        {label && (
          <Label
            htmlFor={fieldId}
            required={required}
            className={cn(
              inline && "mb-0 shrink-0"
            )}
          >
            {label}
          </Label>
        )}

        {/* Input/Content Container */}
        <div className={cn(
          "space-y-2",
          inline && "flex-1 space-y-1"
        )}>
          {/* Clone children and add id if it's an input element */}
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child) &&
                (child.type === 'input' ||
                 child.type === 'textarea' ||
                 child.type === 'select' ||
                 (typeof child.type === 'object' && 'displayName' in child.type))) {
              return React.cloneElement(child, {
                id: fieldId,
                'aria-invalid': error ? 'true' : 'false',
                'aria-describedby': error ? `${fieldId}-error` :
                                  description ? `${fieldId}-description` : undefined,
                ...child.props,
              } as any)
            }
            return child
          })}

          {/* Description */}
          {description && (
            <p
              id={`${fieldId}-description`}
              className="text-sm text-muted-foreground"
            >
              {description}
            </p>
          )}

          {/* Error Message */}
          {error && (
            <ErrorMessage
              id={`${fieldId}-error`}
              message={error}
            />
          )}
        </div>
      </div>
    )
  }
)
FieldGroup.displayName = "FieldGroup"

export { FieldGroup }