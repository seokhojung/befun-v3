export interface DeskModelSpec {
  width_cm: { min: number; max: number; step: number }
  depth_cm: { min: number; max: number; step: number }
  height_cm: { min: number; max: number; step: number }
  materials: readonly string[]
  finishes: readonly string[]
}

export interface DeskOptions {
  width_cm: number
  depth_cm: number
  height_cm: number
  material: 'wood' | 'mdf' | 'steel' | 'metal' | 'glass' | 'fabric'
  finish?: 'matte' | 'glossy' | 'satin'
  color: string
}

export const DESK_MODEL_SPEC: DeskModelSpec = {
  width_cm: { min: 30, max: 300, step: 1 },
  depth_cm: { min: 30, max: 300, step: 1 },
  height_cm: { min: 40, max: 120, step: 1 },
  materials: ['wood', 'mdf', 'steel', 'metal', 'glass', 'fabric'] as const,
  finishes: ['matte', 'glossy', 'satin'] as const,
}

