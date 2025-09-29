// 디자인 데이터 → 쇼핑몰 API 형식 변환기
// Story 3.1: 장바구니 및 결제 연동

import { type CartItemData, type ExternalCartItem } from '@/types/cart'

/**
 * 재료 표시명 매핑
 */
const MATERIAL_DISPLAY_NAMES: Record<string, string> = {
  wood: '원목',
  mdf: 'MDF',
  steel: '스틸',
  metal: '메탈',
  glass: '유리',
  fabric: '패브릭'
}

/**
 * 재료 설명 매핑
 */
const MATERIAL_DESCRIPTIONS: Record<string, string> = {
  wood: '자연스러운 원목 소재로 내구성이 뛰어남',
  mdf: '경제적이고 가공이 용이한 중밀도 섬유판',
  steel: '견고하고 모던한 스틸 프레임',
  metal: '고급스러운 메탈 마감재',
  glass: '투명하고 세련된 강화유리',
  fabric: '부드럽고 따뜻한 원단 소재'
}

/**
 * 디자인 데이터를 외부 쇼핑몰 API 형식으로 변환
 */
export class DataTransformer {
  /**
   * 장바구니 아이템 데이터를 외부 API 형식으로 변환
   */
  static transformToExternalCartItem(cartData: CartItemData): ExternalCartItem {
    const { customizations, quantity = 1 } = cartData

    // 치수 문자열 생성
    const dimensions = `${customizations.width_cm}cm × ${customizations.depth_cm}cm × ${customizations.height_cm}cm`

    // 재료 표시명
    const materialName = MATERIAL_DISPLAY_NAMES[customizations.material] || customizations.material

    // 부피 계산
    const volume_m3 = (customizations.width_cm * customizations.depth_cm * customizations.height_cm) / 1_000_000

    // 상세 사양 생성
    const specifications = this.generateSpecifications({
      dimensions: {
        width: customizations.width_cm,
        depth: customizations.depth_cm,
        height: customizations.height_cm,
        volume_m3
      },
      material: {
        type: customizations.material,
        name: materialName,
        description: MATERIAL_DESCRIPTIONS[customizations.material]
      },
      price: customizations.price_breakdown,
      color: customizations.color
    })

    return {
      product_id: 'custom_desk',
      product_name: customizations.name,
      quantity,
      unit_price: customizations.calculated_price,
      custom_options: {
        dimensions,
        material: materialName,
        specifications
      },
      total_price: quantity * customizations.calculated_price
    }
  }

  /**
   * 상세 사양 문자열 생성
   */
  private static generateSpecifications(data: {
    dimensions: {
      width: number
      depth: number
      height: number
      volume_m3: number
    }
    material: {
      type: string
      name: string
      description?: string
    }
    price: any
    color?: string
  }): string {
    const specs = []

    // 치수 정보
    specs.push(`[치수]`)
    specs.push(`가로: ${data.dimensions.width}cm`)
    specs.push(`세로: ${data.dimensions.depth}cm`)
    specs.push(`높이: ${data.dimensions.height}cm`)
    specs.push(`부피: ${data.dimensions.volume_m3.toFixed(3)}m³`)

    // 재료 정보
    specs.push(`\n[재료]`)
    specs.push(`종류: ${data.material.name} (${data.material.type})`)
    if (data.material.description) {
      specs.push(`특성: ${data.material.description}`)
    }

    // 색상 정보 (있는 경우)
    if (data.color) {
      specs.push(`색상: ${data.color}`)
    }

    // 가격 정보
    specs.push(`\n[가격]`)
    specs.push(`단가: ${data.price.total?.toLocaleString() || 0}원`)
    if (data.price.material_modifier !== 1.0) {
      specs.push(`재료 배수: ${data.price.material_modifier}`)
    }

    return specs.join('\n')
  }

  /**
   * 민감한 정보 필터링 (보안)
   */
  static sanitizeForExternalAPI(data: any): any {
    const sensitiveFields = [
      'user_id',
      'internal_id',
      'auth_token',
      'session_id',
      'private_key',
      'secret'
    ]

    return this.deepOmit(data, sensitiveFields)
  }

  /**
   * 객체에서 특정 필드들을 제거하는 헬퍼 함수
   */
  private static deepOmit(obj: any, keysToOmit: string[]): any {
    if (obj === null || typeof obj !== 'object') {
      return obj
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepOmit(item, keysToOmit))
    }

    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (!keysToOmit.includes(key)) {
        result[key] = this.deepOmit(value, keysToOmit)
      }
    }

    return result
  }

  /**
   * 가격 데이터 검증
   */
  static validatePriceData(priceData: any): boolean {
    if (!priceData || typeof priceData !== 'object') {
      return false
    }

    const requiredFields = ['base_price', 'material_modifier', 'volume_m3', 'total']
    return requiredFields.every(field =>
      field in priceData && typeof priceData[field] === 'number'
    )
  }

  /**
   * 치수 데이터 검증
   */
  static validateDimensions(dimensions: {
    width_cm: number
    depth_cm: number
    height_cm: number
  }): boolean {
    const { width_cm, depth_cm, height_cm } = dimensions

    // 범위 검증
    const isWidthValid = width_cm >= 60 && width_cm <= 300
    const isDepthValid = depth_cm >= 40 && depth_cm <= 200
    const isHeightValid = height_cm >= 60 && height_cm <= 120

    return isWidthValid && isDepthValid && isHeightValid
  }

  /**
   * 재료 유효성 검증
   */
  static validateMaterial(material: string): boolean {
    const validMaterials = ['wood', 'mdf', 'steel', 'metal', 'glass', 'fabric']
    return validMaterials.includes(material)
  }

  /**
   * 완전한 장바구니 데이터 검증
   */
  static validateCartItemData(data: CartItemData): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    // 기본 필드 검증
    if (!data.designId || typeof data.designId !== 'string') {
      errors.push('유효한 디자인 ID가 필요합니다')
    }

    if (data.quantity && (data.quantity < 1 || data.quantity > 10)) {
      errors.push('수량은 1-10 사이여야 합니다')
    }

    if (!data.customizations) {
      errors.push('커스터마이징 정보가 필요합니다')
      return { isValid: false, errors }
    }

    // 치수 검증
    if (!this.validateDimensions(data.customizations)) {
      errors.push('치수가 유효 범위를 벗어났습니다')
    }

    // 재료 검증
    if (!this.validateMaterial(data.customizations.material)) {
      errors.push('지원되지 않는 재료입니다')
    }

    // 가격 검증
    if (!this.validatePriceData(data.customizations.price_breakdown)) {
      errors.push('가격 정보가 올바르지 않습니다')
    }

    // 이름 검증
    if (!data.customizations.name || data.customizations.name.trim().length === 0) {
      errors.push('디자인 이름이 필요합니다')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * 외부 API 응답 파싱
   */
  static parseExternalApiResponse(response: any): {
    success: boolean
    cartId?: string
    redirectUrl?: string
    error?: string
  } {
    try {
      if (!response) {
        return { success: false, error: 'Empty response' }
      }

      // 다양한 응답 형식 지원
      if (response.success === true || response.status === 'success') {
        return {
          success: true,
          cartId: response.cart_id || response.cartId || response.id,
          redirectUrl: response.redirect_url || response.redirectUrl || response.checkout_url
        }
      }

      return {
        success: false,
        error: response.error || response.message || response.error_message || 'Unknown error'
      }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to parse response'
      }
    }
  }
}