export interface BffMaterialItem {
  id: string
  name: string
  type: 'wood' | 'mdf' | 'steel' | 'metal' | 'glass' | 'fabric'
  is_active: boolean
  thumbnail_url?: string | null
}

export interface BffRules {
  base_price: number
  size_multiplier: number
  material_multipliers: Record<string, number>
  finish_multipliers: Record<string, number>
}

export interface BffConstraints {
  width_cm: { min: number; max: number; step: number }
  depth_cm: { min: number; max: number; step: number }
  height_cm: { min: number; max: number; step: number }
}

export interface ConfiguratorInitResponse {
  materials: BffMaterialItem[]
  rules: BffRules
  constraints: BffConstraints
  // 추가 필드는 하위 호환을 위해 허용
  [key: string]: any
}

