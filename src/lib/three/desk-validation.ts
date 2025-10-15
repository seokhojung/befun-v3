import { DESK_MODEL_SPEC } from '@/types/desk'

export type InvalidField = 'width_cm' | 'depth_cm' | 'height_cm' | null

export interface SnapValidateResult {
  snappedMeters: { width: number; depth: number; height: number }
  snappedCm: { width_cm: number; depth_cm: number; height_cm: number }
  invalidField: InvalidField
}

export function snapAndValidate(dimensionsMeters: { width: number; depth: number; height: number }): SnapValidateResult {
  // snap to integer cm
  const width_cm = Math.round(dimensionsMeters.width * 100)
  const depth_cm = Math.round(dimensionsMeters.depth * 100)
  const height_cm = Math.round(dimensionsMeters.height * 100)

  const snappedMeters = { width: width_cm / 100, depth: depth_cm / 100, height: height_cm / 100 }

  let invalidField: InvalidField = null
  const spec = DESK_MODEL_SPEC
  if (width_cm < spec.width_cm.min || width_cm > spec.width_cm.max) invalidField = 'width_cm'
  else if (depth_cm < spec.depth_cm.min || depth_cm > spec.depth_cm.max) invalidField = 'depth_cm'
  else if (height_cm < spec.height_cm.min || height_cm > spec.height_cm.max) invalidField = 'height_cm'

  return {
    snappedMeters,
    snappedCm: { width_cm, depth_cm, height_cm },
    invalidField,
  }
}

export function formatValidationMessage(field: Exclude<InvalidField, null>): string {
  const spec = DESK_MODEL_SPEC
  const range = field === 'width_cm' ? spec.width_cm : field === 'depth_cm' ? spec.depth_cm : spec.height_cm
  return `입력값이 올바르지 않습니다: ${field} - 허용 범위 ${range.min}–${range.max}`
}

