// API 버전 관리 시스템
import type { NextRequest, NextResponse } from 'next/server'
import { NotFoundError, ValidationError } from './errors'

// 지원하는 API 버전들
export const SUPPORTED_VERSIONS = ['v1'] as const
export type ApiVersion = typeof SUPPORTED_VERSIONS[number]

// 기본 API 버전
export const DEFAULT_VERSION: ApiVersion = 'v1'

// 버전별 지원 종료 날짜 (향후 사용)
export const VERSION_DEPRECATION: Record<ApiVersion, Date | null> = {
  v1: null, // 현재 지원 중
}

// 버전 파싱 및 검증
export function parseApiVersion(request: NextRequest): {
  version: ApiVersion
  isValid: boolean
  isDeprecated: boolean
} {
  const url = new URL(request.url)
  const pathSegments = url.pathname.split('/')

  // URL 경로에서 버전 추출 (/api/v1/...)
  let version: string | undefined
  const apiIndex = pathSegments.findIndex(segment => segment === 'api')
  if (apiIndex !== -1 && apiIndex + 1 < pathSegments.length) {
    const versionCandidate = pathSegments[apiIndex + 1]
    if (versionCandidate.startsWith('v')) {
      version = versionCandidate as ApiVersion
    }
  }

  // 헤더에서 버전 확인 (선택적)
  const headerVersion = request.headers.get('API-Version') || request.headers.get('X-API-Version')
  if (headerVersion && !version) {
    version = `v${headerVersion}` as ApiVersion
  }

  // 기본 버전 사용
  if (!version) {
    version = DEFAULT_VERSION
  }

  const typedVersion = version as ApiVersion
  const isValid = SUPPORTED_VERSIONS.includes(typedVersion)
  const isDeprecated = VERSION_DEPRECATION[typedVersion] !== null &&
    VERSION_DEPRECATION[typedVersion]! < new Date()

  return {
    version: typedVersion,
    isValid,
    isDeprecated,
  }
}

// 버전 검증 미들웨어
export function validateApiVersion(request: NextRequest, requestId?: string): ApiVersion {
  const { version, isValid, isDeprecated } = parseApiVersion(request)

  if (!isValid) {
    throw new NotFoundError(
      `지원되지 않는 API 버전입니다: ${version}. 지원되는 버전: ${SUPPORTED_VERSIONS.join(', ')}`,
      requestId
    )
  }

  if (isDeprecated) {
    // 경고 로그 (실제 차단은 하지 않음)
    console.warn(`Deprecated API version used: ${version} in request ${requestId}`)
  }

  return version
}

// 버전별 기능 호환성 체크
export interface ApiFeature {
  name: string
  introducedIn: ApiVersion
  deprecatedIn?: ApiVersion
  removedIn?: ApiVersion
}

// 지원되는 기능 목록
export const API_FEATURES: ApiFeature[] = [
  {
    name: 'basic-auth',
    introducedIn: 'v1',
  },
  {
    name: 'design-management',
    introducedIn: 'v1',
  },
  {
    name: 'pricing-calculator',
    introducedIn: 'v1',
  },
  {
    name: 'bff-endpoints',
    introducedIn: 'v1',
  },
  {
    name: 'checkout-integration',
    introducedIn: 'v1',
  },
  // 향후 추가될 기능들 예시
  // {
  //   name: 'advanced-auth',
  //   introducedIn: 'v2',
  // },
  // {
  //   name: 'real-time-updates',
  //   introducedIn: 'v2',
  // },
]

// 특정 버전에서 기능이 지원되는지 확인
export function isFeatureSupported(
  feature: string,
  version: ApiVersion
): boolean {
  const featureInfo = API_FEATURES.find(f => f.name === feature)
  if (!featureInfo) {
    return false
  }

  // 해당 버전에서 도입되었는지 확인
  const versionNumber = parseInt(version.substring(1))
  const introducedVersion = parseInt(featureInfo.introducedIn.substring(1))

  if (versionNumber < introducedVersion) {
    return false
  }

  // 해당 버전에서 제거되었는지 확인
  if (featureInfo.removedIn) {
    const removedVersion = parseInt(featureInfo.removedIn.substring(1))
    if (versionNumber >= removedVersion) {
      return false
    }
  }

  return true
}

// 기능 사용 가능 여부 확인 (에러 throw 버전)
export function requireFeature(
  feature: string,
  version: ApiVersion,
  requestId?: string
): void {
  if (!isFeatureSupported(feature, version)) {
    const featureInfo = API_FEATURES.find(f => f.name === feature)

    if (!featureInfo) {
      throw new NotFoundError(`알 수 없는 기능: ${feature}`, requestId)
    }

    const versionNumber = parseInt(version.substring(1))
    const introducedVersion = parseInt(featureInfo.introducedIn.substring(1))

    if (versionNumber < introducedVersion) {
      throw new ValidationError(
        `기능 '${feature}'는 ${featureInfo.introducedIn} 버전부터 지원됩니다. 현재 버전: ${version}`,
        { feature, currentVersion: version, requiredVersion: featureInfo.introducedIn },
        requestId
      )
    }

    if (featureInfo.removedIn) {
      const removedVersion = parseInt(featureInfo.removedIn.substring(1))
      if (versionNumber >= removedVersion) {
        throw new ValidationError(
          `기능 '${feature}'는 ${featureInfo.removedIn} 버전에서 제거되었습니다. 현재 버전: ${version}`,
          { feature, currentVersion: version, removedVersion: featureInfo.removedIn },
          requestId
        )
      }
    }
  }
}

// 버전 호환성 정보를 응답 헤더에 추가
export function addVersionHeaders(
  response: NextResponse,
  version: ApiVersion
): void {
  response.headers.set('API-Version', version)
  response.headers.set('Supported-Versions', SUPPORTED_VERSIONS.join(', '))

  const deprecationDate = VERSION_DEPRECATION[version]
  if (deprecationDate) {
    response.headers.set('Deprecation', deprecationDate.toISOString())
    response.headers.set(
      'Link',
      `<https://docs.example.com/api/migration>; rel="deprecation"; type="text/html"`
    )
  }
}

// 버전별 응답 형식 변환 (호환성을 위한 유틸리티)
export function transformResponseForVersion<T>(
  data: T,
  version: ApiVersion
): T {
  // 현재는 v1만 지원하므로 변환 로직 없음
  // 향후 버전 간 호환성을 위한 변환 로직이 여기에 추가될 예정

  switch (version) {
    case 'v1':
      return data
    default:
      return data
  }
}

// 요청별 버전 정보 추출 및 검증 통합 함수
export function processApiVersion(request: NextRequest, requestId?: string): {
  version: ApiVersion
  isDeprecated: boolean
  supportedFeatures: string[]
} {
  const version = validateApiVersion(request, requestId)
  const { isDeprecated } = parseApiVersion(request)

  const supportedFeatures = API_FEATURES
    .filter(feature => isFeatureSupported(feature.name, version))
    .map(feature => feature.name)

  return {
    version,
    isDeprecated,
    supportedFeatures,
  }
}

// 클라이언트 SDK 호환성 확인
export interface ClientCompatibility {
  clientName: string
  clientVersion: string
  supportedApiVersions: ApiVersion[]
}

// 알려진 클라이언트들의 호환성 정보
export const CLIENT_COMPATIBILITY: ClientCompatibility[] = [
  {
    clientName: 'befun-web-app',
    clientVersion: '1.0.0',
    supportedApiVersions: ['v1'],
  },
  // 향후 모바일 앱 등 추가 예정
]

// 클라이언트 호환성 확인
export function checkClientCompatibility(
  request: NextRequest,
  version: ApiVersion
): {
  isCompatible: boolean
  warnings: string[]
} {
  const userAgent = request.headers.get('user-agent') || ''
  const clientName = request.headers.get('x-client-name')
  const clientVersion = request.headers.get('x-client-version')

  const warnings: string[] = []
  let isCompatible = true

  if (clientName && clientVersion) {
    const clientInfo = CLIENT_COMPATIBILITY.find(
      c => c.clientName === clientName && c.clientVersion === clientVersion
    )

    if (clientInfo) {
      if (!clientInfo.supportedApiVersions.includes(version)) {
        isCompatible = false
        warnings.push(
          `클라이언트 ${clientName} v${clientVersion}는 API ${version}를 지원하지 않습니다.`
        )
      }
    } else {
      warnings.push(
        `알 수 없는 클라이언트: ${clientName} v${clientVersion}`
      )
    }
  }

  return {
    isCompatible,
    warnings,
  }
}

// API 버전 정보 엔드포인트용 데이터
export function getVersionInfo(): {
  current: ApiVersion
  supported: ApiVersion[]
  deprecated: Record<ApiVersion, string | null>
  features: ApiFeature[]
} {
  const deprecated: Record<ApiVersion, string | null> = { v1: null }

  SUPPORTED_VERSIONS.forEach(version => {
    const deprecationDate = VERSION_DEPRECATION[version]
    deprecated[version] = deprecationDate ? deprecationDate.toISOString() : null
  })

  return {
    current: DEFAULT_VERSION,
    supported: [...SUPPORTED_VERSIONS],
    deprecated,
    features: API_FEATURES,
  }
}
