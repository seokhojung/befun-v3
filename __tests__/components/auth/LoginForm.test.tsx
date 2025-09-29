import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import LoginForm from '@/components/auth/LoginForm'
import { useAuthActions } from '@/hooks/useAuth'

// Mock hooks
jest.mock('next/navigation')
jest.mock('@/hooks/useAuth')

const mockPush = jest.fn()
const mockSignIn = jest.fn()

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush
    })
    ;(useAuthActions as jest.Mock).mockReturnValue({
      signIn: mockSignIn
    })
  })

  describe('폼 렌더링', () => {
    it('로그인 폼이 올바르게 렌더링된다', () => {
      render(<LoginForm />)

      expect(screen.getByRole('heading', { name: '로그인' })).toBeInTheDocument()
      expect(screen.getByLabelText('이메일')).toBeInTheDocument()
      expect(screen.getByLabelText('비밀번호')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument()
      expect(screen.getByText('회원가입하기')).toBeInTheDocument()
    })

    it('적절한 입력 속성이 설정되어 있다', () => {
      render(<LoginForm />)

      const emailInput = screen.getByLabelText('이메일')
      const passwordInput = screen.getByLabelText('비밀번호')

      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('autoComplete', 'email')
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('autoComplete', 'current-password')
    })
  })

  describe('입력 검증', () => {
    it('빈 이메일로 제출 시 에러 메시지가 표시된다', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const submitButton = screen.getByRole('button', { name: '로그인' })
      await user.click(submitButton)

      expect(screen.getByText('이메일을 입력해주세요.')).toBeInTheDocument()
    })

    it('잘못된 이메일 형식으로 제출 시 에러 메시지가 표시된다', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const emailInput = screen.getByLabelText('이메일')
      const submitButton = screen.getByRole('button', { name: '로그인' })

      await user.type(emailInput, 'invalid-email')
      await user.click(submitButton)

      expect(screen.getByText('올바른 이메일 형식을 입력해주세요.')).toBeInTheDocument()
    })

    it('빈 비밀번호로 제출 시 에러 메시지가 표시된다', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const emailInput = screen.getByLabelText('이메일')
      const submitButton = screen.getByRole('button', { name: '로그인' })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      expect(screen.getByText('비밀번호를 입력해주세요.')).toBeInTheDocument()
    })

    it('짧은 비밀번호로 제출 시 에러 메시지가 표시된다', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const emailInput = screen.getByLabelText('이메일')
      const passwordInput = screen.getByLabelText('비밀번호')
      const submitButton = screen.getByRole('button', { name: '로그인' })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, '123')
      await user.click(submitButton)

      expect(screen.getByText('비밀번호는 최소 8자 이상이어야 합니다.')).toBeInTheDocument()
    })

    it('입력 시 에러 메시지가 제거된다', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const emailInput = screen.getByLabelText('이메일')
      const submitButton = screen.getByRole('button', { name: '로그인' })

      // 먼저 에러를 발생시킨다
      await user.click(submitButton)
      expect(screen.getByText('이메일을 입력해주세요.')).toBeInTheDocument()

      // 입력하면 에러가 사라진다
      await user.type(emailInput, 'test@example.com')
      expect(screen.queryByText('이메일을 입력해주세요.')).not.toBeInTheDocument()
    })
  })

  describe('로그인 처리', () => {
    it('성공적인 로그인 후 리다이렉트가 발생한다', async () => {
      const user = userEvent.setup()
      mockSignIn.mockResolvedValue({ success: true })

      render(<LoginForm redirectTo="/dashboard" />)

      const emailInput = screen.getByLabelText('이메일')
      const passwordInput = screen.getByLabelText('비밀번호')
      const submitButton = screen.getByRole('button', { name: '로그인' })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123')
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('로그인 실패 시 에러 메시지가 표시된다', async () => {
      const user = userEvent.setup()
      mockSignIn.mockResolvedValue({
        success: false,
        error: '이메일 또는 비밀번호가 올바르지 않습니다.'
      })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText('이메일')
      const passwordInput = screen.getByLabelText('비밀번호')
      const submitButton = screen.getByRole('button', { name: '로그인' })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('이메일 또는 비밀번호가 올바르지 않습니다.')).toBeInTheDocument()
      })
    })

    it('네트워크 에러 시 적절한 에러 메시지가 표시된다', async () => {
      const user = userEvent.setup()
      mockSignIn.mockRejectedValue(new Error('Network error'))

      render(<LoginForm />)

      const emailInput = screen.getByLabelText('이메일')
      const passwordInput = screen.getByLabelText('비밀번호')
      const submitButton = screen.getByRole('button', { name: '로그인' })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('네트워크 오류가 발생했습니다. 다시 시도해주세요.')).toBeInTheDocument()
      })
    })
  })

  describe('로딩 상태', () => {
    it('로그인 중 로딩 상태가 표시된다', async () => {
      const user = userEvent.setup()
      mockSignIn.mockImplementation(() => new Promise(resolve =>
        setTimeout(() => resolve({ success: true }), 100)
      ))

      render(<LoginForm />)

      const emailInput = screen.getByLabelText('이메일')
      const passwordInput = screen.getByLabelText('비밀번호')
      const submitButton = screen.getByRole('button', { name: '로그인' })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      // 로딩 상태 확인
      expect(screen.getByText('처리 중...')).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
      expect(emailInput).toBeDisabled()
      expect(passwordInput).toBeDisabled()

      // 로딩 완료 후
      await waitFor(() => {
        expect(screen.queryByText('처리 중...')).not.toBeInTheDocument()
      })
    })
  })

  describe('네비게이션', () => {
    it('회원가입 버튼 클릭시 회원가입 페이지로 이동한다', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const signUpButton = screen.getByText('회원가입하기')
      await user.click(signUpButton)

      expect(mockPush).toHaveBeenCalledWith('/register')
    })
  })

  describe('URL 리다이렉트', () => {
    it('URL의 redirect 파라미터가 있을 때 해당 페이지로 리다이렉트한다', async () => {
      const user = userEvent.setup()
      mockSignIn.mockResolvedValue({ success: true })

      // URL search params 모킹
      delete window.location
      window.location = { search: '?redirect=/profile' } as any

      render(<LoginForm />)

      const emailInput = screen.getByLabelText('이메일')
      const passwordInput = screen.getByLabelText('비밀번호')
      const submitButton = screen.getByRole('button', { name: '로그인' })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/profile')
      })
    })
  })

  describe('onSuccess 콜백', () => {
    it('로그인 성공시 onSuccess 콜백이 호출된다', async () => {
      const user = userEvent.setup()
      const mockOnSuccess = jest.fn()
      mockSignIn.mockResolvedValue({ success: true })

      render(<LoginForm onSuccess={mockOnSuccess} />)

      const emailInput = screen.getByLabelText('이메일')
      const passwordInput = screen.getByLabelText('비밀번호')
      const submitButton = screen.getByRole('button', { name: '로그인' })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })
  })
})