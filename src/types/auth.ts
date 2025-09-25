// Supabase에서 가져온 타입과 호환되도록 수정
import type { User as SupabaseUser, Session as SupabaseSession } from '@supabase/supabase-js'

// 사용자 인증 관련 TypeScript 타입 정의 (Supabase 타입 확장)
export interface User extends SupabaseUser {
  // Supabase User 타입을 기본으로 사용하되, 필요한 경우 추가 속성 정의
}

export interface Session extends SupabaseSession {
  // Supabase Session 타입을 기본으로 사용하되, 필요한 경우 추가 속성 정의
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
}

// 인증 관련 API 요청/응답 타입
export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error?: AuthError;
}

export interface AuthError {
  message: string;
  status?: number;
  details?: string;
}

// 폼 검증을 위한 타입
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword?: string;
}

// 사용자 프로필 타입
export interface UserProfile {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
  email_verified: boolean;
}

// 인증 컨텍스트 타입
export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  signUp: (email: string, password: string) => Promise<AuthResponse>;
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<AuthResponse>;
}

// 인증 상태 열거형
export const AuthStatus = {
  LOADING: 'loading',
  AUTHENTICATED: 'authenticated',
  UNAUTHENTICATED: 'unauthenticated',
  ERROR: 'error'
} as const

export type AuthStatus = typeof AuthStatus[keyof typeof AuthStatus]

// 에러 타입 상수
export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  WEAK_PASSWORD: 'WEAK_PASSWORD',
  NETWORK_ERROR: 'NETWORK_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  EMAIL_NOT_CONFIRMED: 'EMAIL_NOT_CONFIRMED',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
} as const;

export type AuthErrorType = typeof AUTH_ERRORS[keyof typeof AUTH_ERRORS];

// 비밀번호 검증 규칙
export interface PasswordValidation {
  minLength: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
  hasSpecialChar?: boolean;
}

// API 라우트 응답 타입
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

// 인증 미들웨어를 위한 타입
export interface AuthMiddlewareConfig {
  redirectTo?: string;
  allowUnauthenticated?: boolean;
}