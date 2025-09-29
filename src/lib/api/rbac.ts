// RBAC (Role-Based Access Control) 시스템
import type { NextRequest } from 'next/server'
import type { RbacResult } from '@/types/api'
import type { UserRole, Permission } from './auth'
import { AuthorizationError } from './errors'
import { logger } from './logger'

// 리소스 타입 정의
export type ResourceType = 'design' | 'profile' | 'pricing' | 'checkout' | 'admin' | 'system'

// 액션 타입 정의
export type ActionType = 'create' | 'read' | 'update' | 'delete' | 'list' | 'execute'

// 권한 매트릭스 (역할 × 리소스 × 액션)
const PERMISSION_MATRIX: Record<UserRole, Record<ResourceType, ActionType[]>> = {
  user: {
    design: ['create', 'read', 'update', 'delete', 'list'],
    profile: ['read', 'update'],
    pricing: ['read', 'execute'],
    checkout: ['create', 'read'],
    admin: [],
    system: [],
  },
  premium: {
    design: ['create', 'read', 'update', 'delete', 'list'],
    profile: ['read', 'update'],
    pricing: ['read', 'execute'],
    checkout: ['create', 'read'],
    admin: [],
    system: [],
  },
  admin: {
    design: ['create', 'read', 'update', 'delete', 'list'],
    profile: ['read', 'update', 'list'],
    pricing: ['read', 'execute'],
    checkout: ['create', 'read', 'list'],
    admin: ['read', 'execute'],
    system: [],
  },
  superadmin: {
    design: ['create', 'read', 'update', 'delete', 'list'],
    profile: ['create', 'read', 'update', 'delete', 'list'],
    pricing: ['read', 'execute'],
    checkout: ['create', 'read', 'update', 'delete', 'list'],
    admin: ['create', 'read', 'update', 'delete', 'list', 'execute'],
    system: ['create', 'read', 'update', 'delete', 'list', 'execute'],
  },
}

// 특수 권한 규칙
interface SpecialRule {
  resource: ResourceType
  action: ActionType
  condition: (context: RbacContext) => boolean
  description: string
}

// RBAC 컨텍스트
export interface RbacContext {
  userId: string
  userRole: UserRole
  resourceId?: string
  resourceOwnerId?: string
  requestIp?: string
  userAgent?: string
  requestId: string
}

// 특수 권한 규칙들
const SPECIAL_RULES: SpecialRule[] = [
  // 사용자는 자신의 프로필만 수정 가능
  {
    resource: 'profile',
    action: 'update',
    condition: (context) => context.userId === context.resourceId,
    description: '사용자는 자신의 프로필만 수정할 수 있습니다',
  },
  // 사용자는 자신의 디자인만 수정/삭제 가능
  {
    resource: 'design',
    action: 'update',
    condition: (context) => context.userId === context.resourceOwnerId,
    description: '사용자는 자신이 생성한 디자인만 수정할 수 있습니다',
  },
  {
    resource: 'design',
    action: 'delete',
    condition: (context) => context.userId === context.resourceOwnerId,
    description: '사용자는 자신이 생성한 디자인만 삭제할 수 있습니다',
  },
  // Premium 사용자는 추가 디자인 슬롯 사용 가능
  {
    resource: 'design',
    action: 'create',
    condition: (context) => {
      // 여기서 실제로는 사용자의 디자인 개수를 확인해야 함
      // 현재는 간단히 Premium 이상 사용자는 무제한으로 가정
      return ['premium', 'admin', 'superadmin'].includes(context.userRole)
    },
    description: 'Premium 사용자는 무제한 디자인을 생성할 수 있습니다',
  },
]

// 시간 기반 접근 제어 (업무 시간 제한 등)
interface TimeBasedRule {
  roles: UserRole[]
  resources: ResourceType[]
  actions: ActionType[]
  allowedHours: number[] // 0-23 시간
  timezone: string
  description: string
}

const TIME_BASED_RULES: TimeBasedRule[] = [
  // 관리자 기능은 업무 시간에만 허용 (예시)
  {
    roles: ['admin', 'superadmin'],
    resources: ['admin', 'system'],
    actions: ['create', 'update', 'delete'],
    allowedHours: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18], // 9AM-6PM
    timezone: 'Asia/Seoul',
    description: '관리자 작업은 업무 시간(9AM-6PM)에만 허용됩니다',
  },
]

// IP 기반 접근 제어
interface IpBasedRule {
  roles: UserRole[]
  resources: ResourceType[]
  actions: ActionType[]
  allowedIps: string[]
  description: string
}

const IP_BASED_RULES: IpBasedRule[] = [
  // 시스템 관리는 특정 IP에서만 허용 (예시)
  {
    roles: ['superadmin'],
    resources: ['system'],
    actions: ['create', 'update', 'delete'],
    allowedIps: process.env.ADMIN_ALLOWED_IPS?.split(',') || [],
    description: '시스템 관리는 허용된 IP에서만 가능합니다',
  },
]

// 기본 권한 확인
export function hasBasicPermission(
  userRole: UserRole,
  resource: ResourceType,
  action: ActionType
): boolean {
  const rolePermissions = PERMISSION_MATRIX[userRole]
  const resourcePermissions = rolePermissions[resource]
  return resourcePermissions.includes(action)
}

// 특수 규칙 확인
export function checkSpecialRules(
  context: RbacContext,
  resource: ResourceType,
  action: ActionType
): { allowed: boolean; reason?: string } {
  const applicableRules = SPECIAL_RULES.filter(
    rule => rule.resource === resource && rule.action === action
  )

  for (const rule of applicableRules) {
    if (!rule.condition(context)) {
      return {
        allowed: false,
        reason: rule.description,
      }
    }
  }

  return { allowed: true }
}

// 시간 기반 규칙 확인
export function checkTimeBasedRules(
  context: RbacContext,
  resource: ResourceType,
  action: ActionType
): { allowed: boolean; reason?: string } {
  const now = new Date()
  const currentHour = now.getHours()

  const applicableRules = TIME_BASED_RULES.filter(
    rule =>
      rule.roles.includes(context.userRole) &&
      rule.resources.includes(resource) &&
      rule.actions.includes(action)
  )

  for (const rule of applicableRules) {
    if (!rule.allowedHours.includes(currentHour)) {
      return {
        allowed: false,
        reason: rule.description,
      }
    }
  }

  return { allowed: true }
}

// IP 기반 규칙 확인
export function checkIpBasedRules(
  context: RbacContext,
  resource: ResourceType,
  action: ActionType
): { allowed: boolean; reason?: string } {
  const applicableRules = IP_BASED_RULES.filter(
    rule =>
      rule.roles.includes(context.userRole) &&
      rule.resources.includes(resource) &&
      rule.actions.includes(action)
  )

  for (const rule of applicableRules) {
    if (rule.allowedIps.length > 0 && context.requestIp) {
      if (!rule.allowedIps.includes(context.requestIp)) {
        return {
          allowed: false,
          reason: rule.description,
        }
      }
    }
  }

  return { allowed: true }
}

// 통합 권한 확인
export function checkPermission(
  context: RbacContext,
  resource: ResourceType,
  action: ActionType
): RbacResult {
  // 1. 기본 권한 확인
  const hasBasic = hasBasicPermission(context.userRole, resource, action)
  if (!hasBasic) {
    return {
      allowed: false,
      reason: `역할 '${context.userRole}'은 ${resource}에 대한 ${action} 권한이 없습니다`,
      requiredRoles: Object.keys(PERMISSION_MATRIX).filter(role =>
        hasBasicPermission(role as UserRole, resource, action)
      ),
    }
  }

  // 2. 특수 규칙 확인
  const specialCheck = checkSpecialRules(context, resource, action)
  if (!specialCheck.allowed) {
    return {
      allowed: false,
      reason: specialCheck.reason,
    }
  }

  // 3. 시간 기반 규칙 확인
  const timeCheck = checkTimeBasedRules(context, resource, action)
  if (!timeCheck.allowed) {
    return {
      allowed: false,
      reason: timeCheck.reason,
    }
  }

  // 4. IP 기반 규칙 확인
  const ipCheck = checkIpBasedRules(context, resource, action)
  if (!ipCheck.allowed) {
    return {
      allowed: false,
      reason: ipCheck.reason,
    }
  }

  return { allowed: true }
}

// 권한 확인 미들웨어
export function enforcePermission(
  context: RbacContext,
  resource: ResourceType,
  action: ActionType
): void {
  const result = checkPermission(context, resource, action)

  if (!result.allowed) {
    logger.logAuthEvent(
      'rbac_permission_denied',
      context.userId,
      context.requestId,
      {
        userRole: context.userRole,
        resource,
        action,
        reason: result.reason,
        requiredRoles: result.requiredRoles,
      }
    )

    throw new AuthorizationError(
      result.reason || '이 작업을 수행할 권한이 없습니다'
    )
  }

  logger.logAuthEvent(
    'rbac_permission_granted',
    context.userId,
    context.requestId,
    {
      userRole: context.userRole,
      resource,
      action,
    }
  )
}

// 다중 권한 확인 (AND 조건)
export function checkMultiplePermissions(
  context: RbacContext,
  permissions: Array<{ resource: ResourceType; action: ActionType }>
): RbacResult {
  for (const permission of permissions) {
    const result = checkPermission(context, permission.resource, permission.action)
    if (!result.allowed) {
      return result
    }
  }

  return { allowed: true }
}

// 다중 권한 확인 (OR 조건)
export function checkAnyPermission(
  context: RbacContext,
  permissions: Array<{ resource: ResourceType; action: ActionType }>
): RbacResult {
  const errors: string[] = []

  for (const permission of permissions) {
    const result = checkPermission(context, permission.resource, permission.action)
    if (result.allowed) {
      return { allowed: true }
    }
    if (result.reason) {
      errors.push(result.reason)
    }
  }

  return {
    allowed: false,
    reason: `다음 중 하나의 권한이 필요합니다: ${errors.join(', ')}`,
  }
}

// 권한 스코프 확인 (특정 리소스에 대한 접근 권한)
export async function checkResourceScope(
  context: RbacContext,
  resource: ResourceType,
  action: ActionType,
  resourceId: string
): Promise<RbacResult> {
  // 리소스 소유자 확인 로직이 필요한 경우
  if (resource === 'design' && ['update', 'delete'].includes(action)) {
    // 실제 구현에서는 데이터베이스에서 리소스 소유자 확인
    // 현재는 context에서 제공된 정보 사용
    const updatedContext = { ...context, resourceId }
    return checkPermission(updatedContext, resource, action)
  }

  // 프로필의 경우
  if (resource === 'profile') {
    const updatedContext = { ...context, resourceId }
    return checkPermission(updatedContext, resource, action)
  }

  // 기본 권한 확인
  return checkPermission(context, resource, action)
}

// 사용자 권한 정보 조회 (현재 사용자가 수행할 수 있는 모든 작업)
export function getUserCapabilities(userRole: UserRole): Record<ResourceType, ActionType[]> {
  return { ...PERMISSION_MATRIX[userRole] }
}

// 리소스별 사용자 권한 확인
export function getResourcePermissions(
  userRole: UserRole,
  resource: ResourceType
): ActionType[] {
  return PERMISSION_MATRIX[userRole][resource] || []
}

// 권한 상속 (상위 역할이 하위 역할의 권한을 포함)
const ROLE_HIERARCHY: Record<UserRole, UserRole[]> = {
  user: ['user'],
  premium: ['user', 'premium'],
  admin: ['user', 'premium', 'admin'],
  superadmin: ['user', 'premium', 'admin', 'superadmin'],
}

export function hasInheritedPermission(
  userRole: UserRole,
  targetRole: UserRole
): boolean {
  return ROLE_HIERARCHY[userRole].includes(targetRole)
}

// 조건부 권한 확인 (비즈니스 로직 기반)
export interface ConditionalRule {
  condition: string
  check: (context: RbacContext) => Promise<boolean>
  description: string
}

const CONDITIONAL_RULES: Record<string, ConditionalRule> = {
  'max_designs_limit': {
    condition: 'max_designs_limit',
    check: async (context: RbacContext) => {
      // 실제로는 데이터베이스에서 사용자의 디자인 수를 확인
      // 현재는 Premium 사용자는 무제한으로 가정
      return ['premium', 'admin', 'superadmin'].includes(context.userRole)
    },
    description: '디자인 생성 한도를 초과했습니다',
  },
  'active_subscription': {
    condition: 'active_subscription',
    check: async (context: RbacContext) => {
      // 실제로는 사용자의 구독 상태 확인
      // 현재는 Premium 이상 사용자는 활성 구독으로 가정
      return ['premium', 'admin', 'superadmin'].includes(context.userRole)
    },
    description: '활성 구독이 필요합니다',
  },
}

export async function checkConditionalPermission(
  context: RbacContext,
  condition: string
): Promise<{ allowed: boolean; reason?: string }> {
  const rule = CONDITIONAL_RULES[condition]
  if (!rule) {
    return { allowed: true } // 알 수 없는 조건은 통과
  }

  try {
    const allowed = await rule.check(context)
    return {
      allowed,
      reason: allowed ? undefined : rule.description,
    }
  } catch (error) {
    logger.error(
      'Conditional permission check failed',
      context.requestId,
      { condition, error }
    )
    return {
      allowed: false,
      reason: '권한 확인 중 오류가 발생했습니다',
    }
  }
}

// RBAC 감사 로그
export function auditPermissionCheck(
  context: RbacContext,
  resource: ResourceType,
  action: ActionType,
  result: RbacResult
): void {
  logger.info(
    'RBAC permission check',
    context.requestId,
    {
      userId: context.userId,
      userRole: context.userRole,
      resource,
      action,
      allowed: result.allowed,
      reason: result.reason,
      resourceId: context.resourceId,
      ip: context.requestIp,
    }
  )
}