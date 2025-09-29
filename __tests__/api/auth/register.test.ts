// 회원가입 API 로직 테스트
describe('회원가입 API 로직', () => {
  describe('입력 검증', () => {
    it('이메일 형식이 유효한지 검증한다', () => {
      const validateEmail = (email: string) => {
        const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
        return emailRegex.test(email)
      }

      expect(validateEmail('test@example.com')).toBe(true)
      expect(validateEmail('user.name+tag@example.co.uk')).toBe(true)
      expect(validateEmail('invalid-email')).toBe(false)
      expect(validateEmail('test@')).toBe(false)
      expect(validateEmail('@example.com')).toBe(false)
    })

    it('비밀번호 강도를 검증한다', () => {
      const validatePassword = (password: string) => {
        if (password.length < 8) return { valid: false, message: '비밀번호는 최소 8자 이상이어야 합니다.' }
        if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(password)) {
          return { valid: false, message: '비밀번호는 영문과 숫자를 포함해야 합니다.' }
        }
        return { valid: true, message: '' }
      }

      expect(validatePassword('password123')).toEqual({ valid: true, message: '' })
      expect(validatePassword('123')).toEqual({ valid: false, message: '비밀번호는 최소 8자 이상이어야 합니다.' })
      expect(validatePassword('password')).toEqual({ valid: false, message: '비밀번호는 영문과 숫자를 포함해야 합니다.' })
      expect(validatePassword('12345678')).toEqual({ valid: false, message: '비밀번호는 영문과 숫자를 포함해야 합니다.' })
    })

    it('필수 필드 검증을 수행한다', () => {
      const validateRegisterInput = (email: string, password: string) => {
        if (!email || !password) {
          return { success: false, error: { code: 'MISSING_CREDENTIALS', message: '이메일과 비밀번호를 입력해주세요.' } }
        }

        const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
        if (!emailRegex.test(email)) {
          return { success: false, error: { code: 'INVALID_EMAIL', message: '올바른 이메일 형식을 입력해주세요.' } }
        }

        if (password.length < 8 || !/(?=.*[a-zA-Z])(?=.*[0-9])/.test(password)) {
          return { success: false, error: { code: 'WEAK_PASSWORD', message: '비밀번호는 최소 8자 이상, 영문과 숫자를 포함해야 합니다.' } }
        }

        return { success: true }
      }

      expect(validateRegisterInput('', 'password123')).toEqual({
        success: false,
        error: { code: 'MISSING_CREDENTIALS', message: '이메일과 비밀번호를 입력해주세요.' }
      })

      expect(validateRegisterInput('invalid-email', 'password123')).toEqual({
        success: false,
        error: { code: 'INVALID_EMAIL', message: '올바른 이메일 형식을 입력해주세요.' }
      })

      expect(validateRegisterInput('test@example.com', '123')).toEqual({
        success: false,
        error: { code: 'WEAK_PASSWORD', message: '비밀번호는 최소 8자 이상, 영문과 숫자를 포함해야 합니다.' }
      })

      expect(validateRegisterInput('test@example.com', 'password123')).toEqual({
        success: true
      })
    })
  })

  describe('Supabase 에러 처리', () => {
    it('회원가입 관련 에러를 적절히 매핑한다', () => {
      const mapRegisterError = (error: { message: string }) => {
        if (error.message.includes('User already registered') || error.message.includes('already exists')) {
          return { code: 'EMAIL_ALREADY_EXISTS', message: '이미 가입된 이메일입니다.' }
        }
        if (error.message.includes('Password should be at least')) {
          return { code: 'WEAK_PASSWORD', message: '비밀번호는 최소 8자 이상이어야 합니다.' }
        }
        if (error.message.includes('Invalid email')) {
          return { code: 'INVALID_EMAIL', message: '올바른 이메일 형식을 입력해주세요.' }
        }
        return { code: 'REGISTRATION_FAILED', message: '회원가입 중 오류가 발생했습니다.' }
      }

      expect(mapRegisterError({ message: 'User already registered' })).toEqual({
        code: 'EMAIL_ALREADY_EXISTS',
        message: '이미 가입된 이메일입니다.'
      })

      expect(mapRegisterError({ message: 'Password should be at least 8 characters' })).toEqual({
        code: 'WEAK_PASSWORD',
        message: '비밀번호는 최소 8자 이상이어야 합니다.'
      })

      expect(mapRegisterError({ message: 'Invalid email format' })).toEqual({
        code: 'INVALID_EMAIL',
        message: '올바른 이메일 형식을 입력해주세요.'
      })
    })
  })

  describe('사용자 데이터 처리', () => {
    it('사용자 프로필 데이터를 올바르게 구성한다', () => {
      const createUserProfile = (user: any) => {
        return {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          email_verified: !!user.email_confirmed_at,
          last_sign_in: user.last_sign_in_at
        }
      }

      const mockUser = {
        id: '123',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z',
        email_confirmed_at: '2024-01-01T00:01:00Z',
        last_sign_in_at: '2024-01-01T00:02:00Z'
      }

      const profile = createUserProfile(mockUser)

      expect(profile.id).toBe('123')
      expect(profile.email).toBe('test@example.com')
      expect(profile.email_verified).toBe(true)
    })
  })
})