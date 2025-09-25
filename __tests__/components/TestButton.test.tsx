import { render, screen } from '@testing-library/react'
import TestButton from '@/components/TestButton'

describe('TestButton 컴포넌트', () => {
  it('기본 버튼이 렌더링된다', () => {
    render(<TestButton>테스트 버튼</TestButton>)
    const button = screen.getByRole('button', { name: '테스트 버튼' })
    expect(button).toBeInTheDocument()
  })

  it('primary variant 클래스가 적용된다', () => {
    render(<TestButton variant="primary">Primary 버튼</TestButton>)
    const button = screen.getByRole('button', { name: 'Primary 버튼' })
    expect(button).toHaveClass('bg-primary-500')
  })

  it('secondary variant 클래스가 적용된다', () => {
    render(<TestButton variant="secondary">Secondary 버튼</TestButton>)
    const button = screen.getByRole('button', { name: 'Secondary 버튼' })
    expect(button).toHaveClass('bg-gray-200')
  })

  it('커스텀 className이 적용된다', () => {
    render(<TestButton className="custom-class">커스텀 버튼</TestButton>)
    const button = screen.getByRole('button', { name: '커스텀 버튼' })
    expect(button).toHaveClass('custom-class')
  })
})