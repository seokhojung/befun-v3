import { BaseProps } from '@/types'
import { cn } from '@/utils'

interface TestButtonProps extends BaseProps {
  variant?: 'primary' | 'secondary'
  onClick?: () => void
}

export default function TestButton({
  children,
  className,
  variant = 'primary',
  onClick
}: TestButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2 rounded-lg font-medium transition-colors',
        variant === 'primary'
          ? 'bg-primary-500 hover:bg-primary-600 text-white'
          : 'bg-gray-200 hover:bg-gray-300 text-gray-800',
        className
      )}
    >
      {children}
    </button>
  )
}