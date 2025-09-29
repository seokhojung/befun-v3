import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { Input } from '@/components/ui/input'

describe('Input Component', () => {
  it('renders input element correctly', () => {
    render(<Input placeholder="Enter text" />)
    const input = screen.getByPlaceholderText('Enter text')
    expect(input).toBeInTheDocument()
    // Default type is implicitly 'text' but might not be explicitly set
    expect(input.tagName).toBe('INPUT')
  })

  it('applies correct default classes', () => {
    render(<Input />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass(
      'flex',
      'h-9',
      'w-full',
      'rounded-md',
      'border',
      'border-input',
      'bg-transparent',
      'px-3',
      'py-1',
      'text-sm'
    )
  })

  it('handles different input types', () => {
    const { rerender } = render(<Input type="email" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email')

    rerender(<Input type="password" />)
    expect(screen.getByDisplayValue('')).toHaveAttribute('type', 'password')

    rerender(<Input type="number" />)
    expect(screen.getByRole('spinbutton')).toHaveAttribute('type', 'number')
  })

  it('shows error message when error prop is provided', () => {
    render(<Input error="This field is required" />)

    const errorMessage = screen.getByText('This field is required')
    expect(errorMessage).toBeInTheDocument()
    expect(errorMessage).toHaveAttribute('role', 'alert')
    expect(errorMessage).toHaveClass('text-destructive')

    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('border-destructive', 'focus-visible:ring-destructive')
  })

  it('handles user input correctly', async () => {
    const user = userEvent.setup()
    render(<Input placeholder="Type here" />)

    const input = screen.getByPlaceholderText('Type here')
    await user.type(input, 'Hello World')

    expect(input).toHaveValue('Hello World')
  })

  it('handles input correctly without sanitization', async () => {
    const user = userEvent.setup()
    const handleChange = jest.fn()
    render(<Input onChange={handleChange} type="text" />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'Hello World')

    // Check that the onChange was called
    expect(handleChange).toHaveBeenCalled()
    const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1]
    expect(lastCall[0].target.value).toBe('Hello World')
  })

  it('does not sanitize password input', async () => {
    const user = userEvent.setup()
    const handleChange = jest.fn()
    render(<Input type="password" onChange={handleChange} />)

    const input = screen.getByDisplayValue('')
    await user.type(input, '<script>alert("xss")</script>')

    expect(handleChange).toHaveBeenCalled()
    const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1]
    expect(lastCall[0].target.value).toBe('<script>alert("xss")</script>')
  })

  it('supports disabled state', () => {
    render(<Input disabled />)
    const input = screen.getByRole('textbox')

    expect(input).toBeDisabled()
    expect(input).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50')
  })

  it('applies custom className', () => {
    render(<Input className="custom-input" />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('custom-input')
  })

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLInputElement>()
    render(<Input ref={ref} />)

    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })

  it('handles focus and blur events', async () => {
    const user = userEvent.setup()
    const handleFocus = jest.fn()
    const handleBlur = jest.fn()

    render(<Input onFocus={handleFocus} onBlur={handleBlur} />)
    const input = screen.getByRole('textbox')

    await user.click(input)
    expect(handleFocus).toHaveBeenCalledTimes(1)

    await user.tab()
    expect(handleBlur).toHaveBeenCalledTimes(1)
  })

  it('shows correct focus styles', () => {
    render(<Input />)
    const input = screen.getByRole('textbox')

    expect(input).toHaveClass(
      'focus-visible:outline-none',
      'focus-visible:ring-1',
      'focus-visible:ring-ring'
    )
  })

  it('maintains error state styling with custom className', () => {
    render(<Input error="Error message" className="custom-class" />)
    const input = screen.getByRole('textbox')

    expect(input).toHaveClass('custom-class', 'border-destructive')
  })

  it('shows file input styling correctly', () => {
    render(<Input type="file" />)
    const input = screen.getByDisplayValue('')

    expect(input).toHaveClass(
      'file:border-0',
      'file:bg-transparent',
      'file:text-sm',
      'file:font-medium'
    )
  })

  it('shows placeholder styling correctly', () => {
    render(<Input placeholder="Placeholder text" />)
    const input = screen.getByPlaceholderText('Placeholder text')

    expect(input).toHaveClass('placeholder:text-muted-foreground')
  })
})