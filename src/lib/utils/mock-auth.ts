// Mock Authentication Service for Development
// 더미 Supabase 환경에서 인증 기능을 시뮬레이션

import type { User } from '@supabase/supabase-js'

// 메모리 기반 Mock 사용자 저장소
const mockUsers = new Map<string, { email: string; password: string; id: string; created_at: string }>()

// 개발 환경 테스트 사용자 자동 생성 (HMR 대응)
if (process.env.NODE_ENV === 'development' && mockUsers.size === 0) {
  const testUser = {
    id: 'dev-test-user-1',
    email: 'seokho@uable.co.kr',
    password: 'seokho1234',
    created_at: new Date().toISOString()
  }

  mockUsers.set(testUser.id, testUser)

  console.info('✅ 개발용 테스트 사용자 자동 생성 완료')
  console.info('   📧 seokho@uable.co.kr (비밀번호: seokho1234)')
  console.info('   🔄 서버 재시작/HMR 시에도 자동 재생성됩니다')
}

/**
 * Mock 사용자 생성
 */
export async function mockCreateUser(email: string, password: string): Promise<{
  data: { user: User | null }
  error: { message: string } | null
}> {
  console.info(`🔍 Mock 회원가입 시도: ${email}, 비밀번호 길이: ${password.length}`)

  // 이미 존재하는 이메일 확인
  for (const user of mockUsers.values()) {
    if (user.email === email) {
      console.warn(`⚠️ Mock 회원가입 실패: 이미 등록된 이메일 (${email})`)
      return {
        data: { user: null },
        error: { message: 'User already registered' }
      }
    }
  }

  // 새 사용자 생성
  const userId = `mock-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const createdAt = new Date().toISOString()

  mockUsers.set(userId, {
    email,
    password, // 실제 환경에서는 절대 평문 저장 금지! Mock이므로 허용
    id: userId,
    created_at: createdAt
  })

  const mockUser: User = {
    id: userId,
    email,
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: createdAt,
    role: 'authenticated',
    updated_at: createdAt
  }

  console.info(`✅ Mock 사용자 생성 성공: ${email} (ID: ${userId})`)
  console.info(`🔍 현재 Mock 저장소 사용자 수: ${mockUsers.size}`)

  return {
    data: { user: mockUser },
    error: null
  }
}

/**
 * Mock 사용자 로그인
 */
export async function mockSignIn(email: string, password: string): Promise<{
  data: { user: User | null; session: { access_token: string } | null }
  error: { message: string } | null
}> {
  // 디버깅: Mock 저장소 상태 확인
  console.info(`🔍 Mock 로그인 시도: ${email}`)
  console.info(`🔍 Mock 저장소 사용자 수: ${mockUsers.size}`)
  console.info(`🔍 저장된 이메일 목록:`, Array.from(mockUsers.values()).map(u => u.email))

  // 사용자 찾기
  let foundUser: { email: string; password: string; id: string; created_at: string } | null = null

  for (const user of mockUsers.values()) {
    if (user.email === email) {
      foundUser = user
      break
    }
  }

  // 사용자 없음
  if (!foundUser) {
    console.error(`❌ Mock 로그인 실패: 사용자를 찾을 수 없음 (${email})`)
    return {
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' }
    }
  }

  // 비밀번호 불일치
  if (foundUser.password !== password) {
    console.error(`❌ Mock 로그인 실패: 비밀번호 불일치 (이메일: ${email})`)
    console.info(`🔍 저장된 비밀번호 길이: ${foundUser.password.length}, 입력된 비밀번호 길이: ${password.length}`)
    return {
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' }
    }
  }

  // 로그인 성공
  const mockUser: User = {
    id: foundUser.id,
    email: foundUser.email,
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: foundUser.created_at,
    role: 'authenticated',
    updated_at: foundUser.created_at
  }

  const mockSession = {
    access_token: `mock-token-${foundUser.id}-${Date.now()}`
  }

  console.info(`✅ Mock 로그인 성공: ${email}`)

  return {
    data: { user: mockUser, session: mockSession },
    error: null
  }
}

/**
 * Mock 사용자 조회 (토큰 기반)
 */
export async function mockGetUser(token: string): Promise<{
  data: { user: User | null }
  error: { message: string } | null
}> {
  // mock-token-{userId}-{timestamp} 형식에서 userId 추출
  const match = token.match(/^mock-token-(.+?)-\d+$/)

  if (!match) {
    return {
      data: { user: null },
      error: { message: 'Invalid token' }
    }
  }

  const userId = match[1]
  const foundUser = mockUsers.get(userId)

  if (!foundUser) {
    return {
      data: { user: null },
      error: { message: 'User not found' }
    }
  }

  const mockUser: User = {
    id: foundUser.id,
    email: foundUser.email,
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: foundUser.created_at,
    role: 'authenticated',
    updated_at: foundUser.created_at
  }

  return {
    data: { user: mockUser },
    error: null
  }
}

/**
 * Mock 데이터 초기화 (테스트용)
 */
export function clearMockUsers(): void {
  mockUsers.clear()
  console.info('🧹 Mock 사용자 데이터 초기화 완료')
}