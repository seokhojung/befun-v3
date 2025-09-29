import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, HTMLAttributes } from 'react'
import { VariantProps } from 'class-variance-authority'

// Button Component Types
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<any> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  children: ReactNode
}

// Input Component Types
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label?: string
}

// Card Component Types
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

// Badge Component Types
export interface BadgeProps extends HTMLAttributes<HTMLDivElement>, VariantProps<any> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  children: ReactNode
}

// Toast Component Types
export interface ToastProps {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
  duration?: number
  onClose?: () => void
}

// Layout Component Types
export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
}

// Form Component Types
export interface FormWrapperProps extends HTMLAttributes<HTMLFormElement> {
  children: ReactNode
  onSubmit: (e: React.FormEvent) => void
  csrfToken?: string
}

export interface LabelProps extends HTMLAttributes<HTMLLabelElement> {
  children: ReactNode
  htmlFor?: string
  required?: boolean
}

export interface ErrorMessageProps extends HTMLAttributes<HTMLDivElement> {
  message?: string
  children?: ReactNode
}

export interface FieldGroupProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  label?: string
  error?: string
  required?: boolean
}