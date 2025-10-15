import { snapAndValidate, formatValidationMessage } from '@/lib/three/desk-validation'

describe('snapAndValidate', () => {
  it('snaps meters to integer cm and validates within range', () => {
    const res = snapAndValidate({ width: 1.204, depth: 0.603, height: 0.751 })
    expect(res.snappedCm).toEqual({ width_cm: 120, depth_cm: 60, height_cm: 75 })
    expect(res.invalidField).toBeNull()
  })

  it('flags out-of-range width and formats message', () => {
    const res = snapAndValidate({ width: 0.10, depth: 0.60, height: 0.75 }) // 10cm width
    expect(res.invalidField).toBe('width_cm')
    expect(formatValidationMessage('width_cm')).toMatch(/^입력값이 올바르지 않습니다: width_cm - 허용 범위 /)
  })
})

