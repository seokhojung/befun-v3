import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'

describe('Card Components', () => {
  describe('Card', () => {
    it('renders correctly with default classes', () => {
      render(<Card data-testid="card">Card content</Card>)
      const card = screen.getByTestId('card')

      expect(card).toBeInTheDocument()
      expect(card).toHaveClass(
        'rounded-xl',
        'border',
        'bg-card',
        'text-card-foreground',
        'shadow'
      )
    })

    it('applies custom className', () => {
      render(<Card className="custom-card" data-testid="card">Content</Card>)
      const card = screen.getByTestId('card')

      expect(card).toHaveClass('custom-card', 'rounded-xl')
    })

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(<Card ref={ref}>Card with ref</Card>)

      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('CardHeader', () => {
    it('renders with correct default classes', () => {
      render(<CardHeader data-testid="card-header">Header content</CardHeader>)
      const header = screen.getByTestId('card-header')

      expect(header).toHaveClass(
        'flex',
        'flex-col',
        'space-y-1.5',
        'p-6'
      )
    })

    it('applies custom className', () => {
      render(<CardHeader className="custom-header" data-testid="card-header">Header</CardHeader>)
      const header = screen.getByTestId('card-header')

      expect(header).toHaveClass('custom-header', 'flex', 'flex-col')
    })
  })

  describe('CardTitle', () => {
    it('renders as h3 element with correct classes', () => {
      render(<CardTitle>Card Title</CardTitle>)
      const title = screen.getByRole('heading', { level: 3 })

      expect(title).toHaveTextContent('Card Title')
      expect(title).toHaveClass(
        'font-semibold',
        'leading-none',
        'tracking-tight'
      )
    })

    it('applies custom className', () => {
      render(<CardTitle className="custom-title">Title</CardTitle>)
      const title = screen.getByRole('heading', { level: 3 })

      expect(title).toHaveClass('custom-title', 'font-semibold')
    })
  })

  describe('CardDescription', () => {
    it('renders as p element with correct classes', () => {
      render(<CardDescription>Card description text</CardDescription>)
      const description = screen.getByText('Card description text')

      expect(description.tagName).toBe('P')
      expect(description).toHaveClass(
        'text-sm',
        'text-muted-foreground'
      )
    })

    it('applies custom className', () => {
      render(<CardDescription className="custom-desc">Description</CardDescription>)
      const description = screen.getByText('Description')

      expect(description).toHaveClass('custom-desc', 'text-sm')
    })
  })

  describe('CardContent', () => {
    it('renders with correct padding classes', () => {
      render(<CardContent data-testid="card-content">Content area</CardContent>)
      const content = screen.getByTestId('card-content')

      expect(content).toHaveClass('p-6', 'pt-0')
    })

    it('applies custom className', () => {
      render(<CardContent className="custom-content" data-testid="card-content">Content</CardContent>)
      const content = screen.getByTestId('card-content')

      expect(content).toHaveClass('custom-content', 'p-6')
    })
  })

  describe('CardFooter', () => {
    it('renders with correct layout classes', () => {
      render(<CardFooter data-testid="card-footer">Footer content</CardFooter>)
      const footer = screen.getByTestId('card-footer')

      expect(footer).toHaveClass(
        'flex',
        'items-center',
        'p-6',
        'pt-0'
      )
    })

    it('applies custom className', () => {
      render(<CardFooter className="custom-footer" data-testid="card-footer">Footer</CardFooter>)
      const footer = screen.getByTestId('card-footer')

      expect(footer).toHaveClass('custom-footer', 'flex', 'items-center')
    })
  })

  describe('Complete Card Structure', () => {
    it('renders a complete card with all components', () => {
      render(
        <Card data-testid="complete-card">
          <CardHeader>
            <CardTitle>Test Card</CardTitle>
            <CardDescription>This is a test card description</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Main card content goes here</p>
          </CardContent>
          <CardFooter>
            <button>Action Button</button>
          </CardFooter>
        </Card>
      )

      expect(screen.getByTestId('complete-card')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Test Card' })).toBeInTheDocument()
      expect(screen.getByText('This is a test card description')).toBeInTheDocument()
      expect(screen.getByText('Main card content goes here')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Action Button' })).toBeInTheDocument()
    })

    it('maintains proper semantic structure', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Accessible Card</CardTitle>
          </CardHeader>
          <CardContent>
            Content with proper hierarchy
          </CardContent>
        </Card>
      )

      const heading = screen.getByRole('heading', { level: 3 })
      expect(heading).toHaveTextContent('Accessible Card')
    })

    it('supports nested content properly', () => {
      render(
        <Card>
          <CardContent>
            <div>
              <span>Nested content</span>
              <ul>
                <li>List item 1</li>
                <li>List item 2</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )

      expect(screen.getByText('Nested content')).toBeInTheDocument()
      expect(screen.getByText('List item 1')).toBeInTheDocument()
      expect(screen.getByText('List item 2')).toBeInTheDocument()
    })
  })
})