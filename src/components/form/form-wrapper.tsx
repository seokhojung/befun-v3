"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { csrfClient } from "@/lib/csrf"

export interface FormWrapperProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void | Promise<void>
  csrfToken?: string
  loading?: boolean
  validateOnSubmit?: boolean
}

const FormWrapper = React.forwardRef<HTMLFormElement, FormWrapperProps>(
  ({
    className,
    children,
    onSubmit,
    csrfToken,
    loading = false,
    validateOnSubmit = true,
    ...props
  }, ref) => {
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    // Set CSRF token on component mount
    React.useEffect(() => {
      if (csrfToken) {
        csrfClient.setToken(csrfToken)
      }
    }, [csrfToken])

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()

      if (isSubmitting || loading) {
        return
      }

      try {
        setIsSubmitting(true)

        // Get form data
        const formData = new FormData(e.currentTarget)

        // Add CSRF token to form data
        const tokenizedFormData = csrfClient.addToFormData(formData)

        // Basic form validation
        if (validateOnSubmit) {
          const requiredFields = e.currentTarget.querySelectorAll('[required]')
          let isValid = true

          requiredFields.forEach((field) => {
            const input = field as HTMLInputElement
            if (!input.value.trim()) {
              isValid = false
              input.focus()

              // Trigger validation display
              const event = new Event('invalid', { bubbles: true })
              input.dispatchEvent(event)
            }
          })

          if (!isValid) {
            setIsSubmitting(false)
            return
          }
        }

        // Create a modified event with tokenized form data
        const modifiedEvent = {
          ...e,
          currentTarget: {
            ...e.currentTarget,
            formData: tokenizedFormData
          }
        }

        await onSubmit(modifiedEvent as any)
      } catch (error) {
        console.error('Form submission error:', error)
      } finally {
        setIsSubmitting(false)
      }
    }

    return (
      <form
        ref={ref}
        className={cn(
          "space-y-6",
          (isSubmitting || loading) && "opacity-50 pointer-events-none",
          className
        )}
        onSubmit={handleSubmit}
        noValidate={validateOnSubmit}
        {...props}
      >
        {/* Hidden CSRF token field */}
        {csrfToken && (
          <input
            type="hidden"
            name="csrf-token"
            value={csrfToken}
          />
        )}

        {children}

        {/* Loading indicator overlay */}
        {(isSubmitting || loading) && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-md">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
      </form>
    )
  }
)
FormWrapper.displayName = "FormWrapper"

export { FormWrapper }