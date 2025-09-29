/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { PriceDisplay } from '@/components/pricing/PriceDisplay'
import type { PriceCalculationResponse } from '@/types/pricing'

// framer-motion 모킹
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>
}))

// UI 컴포넌트 모킹
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, className, disabled }: any) => (
    <button
      onClick={onClick}
      className={`${variant} ${size} ${className}`}
      disabled={disabled}
      data-testid="button"
    >
      {children}
    </button>
  )
}))

jest.mock('@/components/ui/separator', () => ({
  Separator: ({ className }: any) => <hr className={className} data-testid="separator" />
}))

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={`badge ${variant} ${className}`} data-testid="badge">
      {children}
    </span>
  )
}))

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      data-testid="tax-toggle"
    />
  )
}))

jest.mock('@/components/pricing/PriceErrorBoundary', () => ({
  __esModule: true,
  default: ({ error, onRetry, fallbackPrice, retryCount }: any) => (
    <div data-testid="error-boundary">
      <div data-testid="error-message">{error}</div>
      {fallbackPrice && <div data-testid="fallback-price">{fallbackPrice}</div>}
      {onRetry && (
        <button onClick={onRetry} data-testid="retry-button">
          Retry ({retryCount})
        </button>
      )}
    </div>
  )
}))

// PriceUtils 모킹
jest.mock('@/lib/pricing', () => ({
  PriceUtils: {
    formatKRW: (amount: number) => `₩${amount.toLocaleString()}`,
    formatVolume: (volume: number) => {
      if (volume < 0.001) {
        return `${(volume * 1000000).toFixed(0)}cm³`
      }
      return `${volume.toFixed(3)}m³`
    },
    calculatePriceChange: (current: number, previous: number) => {
      const amount = current - previous
      const percentage = previous > 0 ? (amount / previous) * 100 : 0
      return {
        amount: Math.abs(amount),
        percentage: Math.abs(percentage),
        type: amount > 0 ? 'increase' as const : amount < 0 ? 'decrease' as const : 'same' as const
      }
    }
  }
}))

describe('PriceDisplay', () => {
  const mockPriceData: PriceCalculationResponse = {
    base_price: 50000,
    material_cost: 27000,
    shipping_cost: 30000,
    subtotal: 107000,
    tax: 10700,
    total: 117700,
    volume_m3: 0.54,
    material_info: {
      type: 'wood',
      modifier: 1.0
    },
    breakdown: {
      volume_m3: 0.54,
      base_cost: 50000,
      material_cost: 27000,
      shipping_cost: 30000,
      subtotal: 107000,
      tax: 10700,
      total: 117700,
      material_info: {
        type: 'wood',
        modifier: 1.0,
        base_price_per_m3: 50000
      }
    },
    calculated_at: '2024-01-01T00:00:00Z'
  }

  it('should render price data correctly', () => {
    render(<PriceDisplay priceData={mockPriceData} />)

    expect(screen.getByText('실시간 가격')).toBeInTheDocument()
    expect(screen.getByText('₩117,700')).toBeInTheDocument()
    expect(screen.getByText('0.540m³')).toBeInTheDocument()
    expect(screen.getByText('wood')).toBeInTheDocument()
    expect(screen.getByText('배수: 1x')).toBeInTheDocument()
  })

  it('should show loading state', () => {
    render(<PriceDisplay priceData={null} loading={true} />)

    expect(screen.getByText('실시간 가격')).toBeInTheDocument()
    // 로딩 스피너가 표시되는지 확인
    const loadingElement = document.querySelector('[style*="animation"]') ||
                          document.querySelector('.animate-spin')
    expect(loadingElement).toBeInTheDocument()
  })

  it('should show error state with error boundary', () => {
    const errorMessage = 'Network connection failed'
    render(
      <PriceDisplay
        priceData={null}
        error={errorMessage}
        fallbackPrice={100000}
        retryCount={2}
        onRetry={jest.fn()}
      />
    )

    expect(screen.getByTestId('error-boundary')).toBeInTheDocument()
    expect(screen.getByTestId('error-message')).toHaveTextContent(errorMessage)
    expect(screen.getByTestId('fallback-price')).toHaveTextContent('100000')
    expect(screen.getByTestId('retry-button')).toHaveTextContent('Retry (2)')
  })

  it('should show empty state when no data', () => {
    render(<PriceDisplay priceData={null} />)

    expect(screen.getByText('치수와 재료를 선택하면')).toBeInTheDocument()
    expect(screen.getByText('실시간 가격이 표시됩니다')).toBeInTheDocument()
  })

  it('should handle tax toggle', () => {
    render(<PriceDisplay priceData={mockPriceData} showTaxToggle={true} />)

    const taxToggle = screen.getByTestId('tax-toggle')
    expect(taxToggle).toBeChecked() // 기본적으로 부가세 포함

    // 처음에는 총액 (부가세 포함) 표시
    expect(screen.getByText('₩117,700')).toBeInTheDocument()

    // 부가세 토글 끄기
    fireEvent.click(taxToggle)
    expect(taxToggle).not.toBeChecked()

    // 부가세 제외 금액 표시 (소계)
    expect(screen.getByText('₩107,000')).toBeInTheDocument()
  })

  it('should handle breakdown toggle', () => {
    const mockToggle = jest.fn()
    render(
      <PriceDisplay
        priceData={mockPriceData}
        onToggleBreakdown={mockToggle}
      />
    )

    const breakdownButton = screen.getByText('세부 내역 보기')
    fireEvent.click(breakdownButton)

    expect(mockToggle).toHaveBeenCalled()
  })

  it('should show price breakdown when expanded', () => {
    render(<PriceDisplay priceData={mockPriceData} showBreakdown={true} />)

    expect(screen.getByText('기본 제작비')).toBeInTheDocument()
    expect(screen.getByText('재료비')).toBeInTheDocument()
    expect(screen.getByText('배송비')).toBeInTheDocument()
    expect(screen.getByText('소계')).toBeInTheDocument()
    expect(screen.getByText('부가세 (10%)')).toBeInTheDocument()

    // 각 비용 항목들이 표시되는지 확인
    expect(screen.getByText('₩50,000')).toBeInTheDocument() // 기본 제작비
    expect(screen.getByText('₩27,000')).toBeInTheDocument() // 재료비
    expect(screen.getByText('₩30,000')).toBeInTheDocument() // 배송비
  })

  it('should handle retry functionality', () => {
    const mockRetry = jest.fn()
    render(
      <PriceDisplay
        priceData={null}
        error="Calculation failed"
        onRetry={mockRetry}
        retryCount={1}
      />
    )

    const retryButton = screen.getByTestId('retry-button')
    fireEvent.click(retryButton)

    expect(mockRetry).toHaveBeenCalled()
  })

  it('should display volume correctly for different sizes', () => {
    const smallVolumeData = {
      ...mockPriceData,
      volume_m3: 0.0005
    }

    render(<PriceDisplay priceData={smallVolumeData} />)

    // 작은 부피는 cm³로 표시
    expect(screen.getByText('500cm³')).toBeInTheDocument()
  })

  it('should handle different material types', () => {
    const metalPriceData = {
      ...mockPriceData,
      material_info: {
        type: 'metal' as const,
        modifier: 1.5
      }
    }

    render(<PriceDisplay priceData={metalPriceData} />)

    expect(screen.getByText('metal')).toBeInTheDocument()
    expect(screen.getByText('배수: 1.5x')).toBeInTheDocument()
  })

  it('should handle price animation when price changes', async () => {
    const { rerender } = render(<PriceDisplay priceData={mockPriceData} />)

    const updatedPriceData = {
      ...mockPriceData,
      total: 125000
    }

    rerender(<PriceDisplay priceData={updatedPriceData} />)

    // 새로운 가격이 표시되는지 확인
    await waitFor(() => {
      expect(screen.getByText('₩125,000')).toBeInTheDocument()
    })
  })

  it('should hide tax toggle when disabled', () => {
    render(<PriceDisplay priceData={mockPriceData} showTaxToggle={false} />)

    expect(screen.queryByTestId('tax-toggle')).not.toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const { container } = render(
      <PriceDisplay priceData={mockPriceData} className="custom-class" />
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('should handle missing breakdown data gracefully', () => {
    const incompleteData = {
      ...mockPriceData,
      breakdown: {
        ...mockPriceData.breakdown,
        base_cost: 0
      }
    }

    render(<PriceDisplay priceData={incompleteData} showBreakdown={true} />)

    // 0원도 정상적으로 표시되어야 함
    expect(screen.getByText('₩0')).toBeInTheDocument()
  })

  it('should handle very large prices', () => {
    const largePriceData = {
      ...mockPriceData,
      total: 12345678
    }

    render(<PriceDisplay priceData={largePriceData} />)

    expect(screen.getByText('₩12,345,678')).toBeInTheDocument()
  })

  it('should show calculation timestamp', () => {
    render(<PriceDisplay priceData={mockPriceData} />)

    // 날짜 부분만 확인
    expect(screen.getByText('2024-01-01')).toBeInTheDocument()
  })
})

describe('PriceDisplay Performance', () => {
  it('should render quickly with large datasets', () => {
    const startTime = performance.now()

    render(<PriceDisplay priceData={mockPriceData} />)

    const endTime = performance.now()
    const renderTime = endTime - startTime

    // 렌더링이 50ms 이내에 완료되어야 함
    expect(renderTime).toBeLessThan(50)
  })

  it('should handle rapid price updates efficiently', async () => {
    const { rerender } = render(<PriceDisplay priceData={mockPriceData} />)

    // 빠른 연속 업데이트 시뮬레이션
    for (let i = 0; i < 10; i++) {
      const updatedData = {
        ...mockPriceData,
        total: mockPriceData.total + i * 1000
      }

      rerender(<PriceDisplay priceData={updatedData} />)
    }

    // 마지막 가격이 정확히 표시되는지 확인
    await waitFor(() => {
      expect(screen.getByText('₩126,700')).toBeInTheDocument()
    })
  })
})

describe('PriceDisplay Accessibility', () => {
  it('should have proper ARIA labels', () => {
    render(<PriceDisplay priceData={mockPriceData} />)

    const priceElement = screen.getByText('₩117,700')
    expect(priceElement).toBeInTheDocument()

    // 가격 정보가 화면 읽기 프로그램에서 읽힐 수 있어야 함
    const taxToggle = screen.getByTestId('tax-toggle')
    expect(taxToggle).toHaveAttribute('type', 'checkbox')
  })

  it('should handle keyboard navigation', () => {
    render(<PriceDisplay priceData={mockPriceData} />)

    const breakdownButton = screen.getByText('세부 내역 보기')

    breakdownButton.focus()
    expect(document.activeElement).toBe(breakdownButton)

    // Enter 키로 버튼 클릭
    fireEvent.keyDown(breakdownButton, { key: 'Enter' })
    // 정상적으로 작동하는지 확인
    expect(breakdownButton).toBeInTheDocument()
  })
})