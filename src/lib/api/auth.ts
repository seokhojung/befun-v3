// API 인증 미들웨어
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { User, Session } from '@/types/auth'
import type { AuthenticatedContext } from '@/types/api'
import { AuthenticationError, AuthorizationError } from './errors'
import { logger } from './logger'

// Supabase 클라이언트 생성
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// 사용자 권한 타입
export type UserRole = 'user' | 'premium' | 'admin' | 'superadmin'
export type Permission =
  | 'design:read' | 'design:write' | 'design:delete'
  | 'pricing:read' | 'pricing:calculate'
  | 'checkout:create' | 'checkout:read'
  | 'profile:read' | 'profile:write'
  | 'admin:users' | 'admin:system'

// 역할별 권한 매핑
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  user: [
    'design:read', 'design:write', 'design:delete',
    'pricing:read', 'pricing:calculate',
    'checkout:create', 'checkout:read',
    'profile:read', 'profile:write'
  ],
  premium: [
    'design:read', 'design:write', 'design:delete',
    'pricing:read', 'pricing:calculate',
    'checkout:create', 'checkout:read',
    'profile:read', 'profile:write'
  ],
  admin: [
    'design:read', 'design:write', 'design:delete',
    'pricing:read', 'pricing:calculate',
    'checkout:create', 'checkout:read',
    'profile:read', 'profile:write',
    'admin:users'
  ],
  superadmin: [
    'design:read', 'design:write', 'design:delete',
    'pricing:read', 'pricing:calculate',
    'checkout:create', 'checkout:read',
    'profile:read', 'profile:write',
    'admin:users', 'admin:system'
  ],
}

// JWT 토큰에서 사용자 정보 추출
export async function extractUserFromToken(token: string): Promise<{
  user: User
  session: Session
}> {
  try {
    const { data, error } = await supabase.auth.getUser(token)

    if (error || !data.user) {
      throw new AuthenticationError('유효하지 않은 토큰입니다')
    }

    // 세션 정보 생성 (기본값)
    const session: Session = {
      access_token: token,
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: '',
      user: data.user,
    }

    return {
      user: data.user as User,
      session,
    }
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error
    }
    throw new AuthenticationError('토큰 검증 중 오류가 발생했습니다')
  }
}

// 요청에서 토큰 추출
export function extractTokenFromRequest(request: NextRequest): string | null {
  // Authorization 헤더 확인
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // 쿠키에서 토큰 확인
  const cookieToken = request.cookies.get('supabase-auth-token')?.value
  if (cookieToken) {
    return cookieToken
  }

  return null
}

// 사용자 역할 가져오기 (데이터베이스에서)
export async function getUserRole(userId: string): Promise<UserRole> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (error || !data) {
      // 기본 역할 반환
      return 'user'
    }

    return (data.role as UserRole) || 'user'
  } catch (error) {
    // 에러 발생 시 기본 역할 반환
    console.warn(`Failed to get user role for ${userId}:`, error)
    return 'user'
  }
}

// 사용자 권한 확인
export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[userRole] || []
  return permissions.includes(permission)
}

// 여러 권한 중 하나라도 가지고 있는지 확인
export function hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(userRole, permission))
}

// 모든 권한을 가지고 있는지 확인
export function hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(userRole, permission))
}

// 인증 컨텍스트 생성
export async function createAuthContext(
  user: User,
  session: Session,
  requestId: string
): Promise<AuthenticatedContext> {
  return {
    user,
    session,
    requestId,
  }
}

// 인증 미들웨어 - 토큰 검증만
export async function authenticateRequest(
  request: NextRequest,
  requestId: string
): Promise<AuthenticatedContext> {
  const token = extractTokenFromRequest(request)

  if (!token) {
    logger.logAuthEvent('auth_token_missing', undefined, requestId)
    throw new AuthenticationError('인증 토큰이 필요합니다')
  }

  try {
    const { user, session } = await extractUserFromToken(token)

    logger.logAuthEvent('auth_success', user.id, requestId, {
      userEmail: user.email,
    })

    return await createAuthContext(user, session, requestId)
  } catch (error) {
    logger.logAuthEvent('auth_failed', undefined, requestId, {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    if (error instanceof AuthenticationError) {
      throw error
    }
    throw new AuthenticationError('인증에 실패했습니다')
  }
}

// 권한 확인 미들웨어
export async function authorizeRequest(
  context: AuthenticatedContext,
  requiredPermissions: Permission[]
): Promise<void> {
  try {
    const userRole = await getUserRole(context.user.id)

    // 모든 권한을 가지고 있는지 확인
    const hasRequiredPermissions = hasAllPermissions(userRole, requiredPermissions)

    if (!hasRequiredPermissions) {
      logger.logAuthEvent('authorization_failed', context.user.id, context.requestId, {
        userRole,
        requiredPermissions,
        userPermissions: ROLE_PERMISSIONS[userRole],
      })

      throw new AuthorizationError(
        `이 작업을 수행할 권한이 없습니다. 필요한 권한: ${requiredPermissions.join(', ')}`
      )
    }

    logger.logAuthEvent('authorization_success', context.user.id, context.requestId, {
      userRole,
      requiredPermissions,
    })
  } catch (error) {
    if (error instanceof AuthorizationError) {
      throw error
    }
    throw new AuthorizationError('권한 확인 중 오류가 발생했습니다')
  }
}

// 리소스 소유권 확인
export async function checkResourceOwnership(
  userId: string,
  resourceType: 'design' | 'profile',
  resourceId: string,
  requestId: string
): Promise<boolean> {
  try {
    let query

    switch (resourceType) {
      case 'design':
        query = supabase
          .from('saved_designs')
          .select('user_id')
          .eq('id', resourceId)
          .single()
        break

      case 'profile':
        return userId === resourceId // 프로필은 자기 자신만 소유 가능

      default:
        return false
    }

    const { data, error } = await query

    if (error || !data) {
      return false
    }

    const isOwner = data.user_id === userId

    logger.logBusinessEvent('resource_ownership_check', requestId, {
      userId,
      resourceType,
      resourceId,
      isOwner,
    })

    return isOwner
  } catch (error) {
    logger.error('Resource ownership check failed', requestId, { error })
    return false
  }
}

// 리소스 소유권 확인 미들웨어
export async function authorizeResourceAccess(
  context: AuthenticatedContext,
  resourceType: 'design' | 'profile',
  resourceId: string,
  permission: Permission
): Promise<void> {
  // 관리자는 모든 리소스에 접근 가능
  const userRole = await getUserRole(context.user.id)
  if (userRole === 'admin' || userRole === 'superadmin') {
    return
  }

  // 일반 사용자는 자신의 리소스만 접근 가능
  const isOwner = await checkResourceOwnership(
    context.user.id,
    resourceType,
    resourceId,
    context.requestId
  )

  if (!isOwner) {
    logger.logAuthEvent('resource_access_denied', context.user.id, context.requestId, {
      resourceType,
      resourceId,
      permission,
    })

    throw new AuthorizationError('해당 리소스에 접근할 권한이 없습니다')
  }

  // 권한도 확인
  if (!hasPermission(userRole, permission)) {
    throw new AuthorizationError(
      `이 작업을 수행할 권한이 없습니다. 필요한 권한: ${permission}`
    )
  }
}

// 통합 인증/권한 확인 미들웨어
export async function authenticateAndAuthorize(
  request: NextRequest,
  requestId: string,
  options: {
    requiredPermissions?: Permission[]
    resourceType?: 'design' | 'profile'
    resourceId?: string
  } = {}
): Promise<AuthenticatedContext> {
  // 1. 인증 확인
  const context = await authenticateRequest(request, requestId)

  // 2. 권한 확인
  if (options.requiredPermissions) {
    await authorizeRequest(context, options.requiredPermissions)
  }

  // 3. 리소스 소유권 확인
  if (options.resourceType && options.resourceId && options.requiredPermissions) {
    await authorizeResourceAccess(
      context,
      options.resourceType,
      options.resourceId,
      options.requiredPermissions[0] // 첫 번째 권한으로 확인
    )
  }

  return context
}

// 선택적 인증 (토큰이 있으면 검증하고, 없으면 null 반환)
export async function optionalAuthentication(
  request: NextRequest,
  requestId: string
): Promise<AuthenticatedContext | null> {
  const token = extractTokenFromRequest(request)

  if (!token) {
    return null
  }

  try {
    return await authenticateRequest(request, requestId)
  } catch (error) {
    // 선택적 인증에서는 에러를 throw하지 않고 null 반환
    logger.logAuthEvent('optional_auth_failed', undefined, requestId, {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return null
  }
}

// API Key 인증 (서비스 간 통신용)
export function authenticateApiKey(request: NextRequest, requestId: string): void {
  const apiKey = request.headers.get('X-API-Key')
  const expectedApiKey = process.env.API_SECRET_KEY

  if (!expectedApiKey) {
    logger.error('API_SECRET_KEY not configured', requestId)
    throw new AuthenticationError('서버 설정 오류')
  }

  if (!apiKey || apiKey !== expectedApiKey) {
    logger.logAuthEvent('api_key_auth_failed', undefined, requestId, {
      providedKeyLength: apiKey?.length,
    })
    throw new AuthenticationError('유효하지 않은 API 키입니다')
  }

  logger.logAuthEvent('api_key_auth_success', undefined, requestId)
}

// 사용자 활동 로그
export async function logUserActivity(
  userId: string,
  action: string,
  requestId: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await supabase
      .from('user_activity_logs')
      .insert({
        user_id: userId,
        action,
        details: metadata || {},
        ip_address: metadata?.ip,
        user_agent: metadata?.userAgent,
      })

    logger.logBusinessEvent('user_activity_logged', requestId, {
      userId,
      action,
      metadata,
    })
  } catch (error) {
    logger.error('Failed to log user activity', requestId, { error, userId, action })
  }
}