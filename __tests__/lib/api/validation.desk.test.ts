import { BusinessSchemas } from '@/lib/api/validation'
import { transformZodError } from '@/lib/api/errors'

describe('BusinessSchemas.deskOptions', () => {
  const schema = BusinessSchemas.deskOptions

  it('accepts valid desk options', () => {
    const input = {
      width_cm: 120,
      depth_cm: 60,
      height_cm: 75,
      material: 'wood',
      finish: 'matte',
      color: '#8B4513',
    }
    const parsed = schema.parse(input)
    expect(parsed).toEqual(input)
  })

  it('rejects non-integer snaps (strict)', () => {
    const input = {
      width_cm: 120.4,
      depth_cm: 60,
      height_cm: 75,
      material: 'wood',
      finish: 'matte',
      color: '#8B4513',
    }
    expect(() => schema.parse(input)).toThrow()
  })

  it('enforces min/max bounds', () => {
    expect(() => schema.parse({
      width_cm: 29,
      depth_cm: 60,
      height_cm: 75,
      material: 'wood',
      color: '#8B4513',
    } as any)).toThrow()

    expect(() => schema.parse({
      width_cm: 120,
      depth_cm: 301,
      height_cm: 75,
      material: 'wood',
      color: '#8B4513',
    } as any)).toThrow()

    expect(() => schema.parse({
      width_cm: 120,
      depth_cm: 60,
      height_cm: 121,
      material: 'wood',
      color: '#8B4513',
    } as any)).toThrow()
  })

  it('rejects unsupported material/finish', () => {
    expect(() => schema.parse({
      width_cm: 120,
      depth_cm: 60,
      height_cm: 75,
      material: 'plastic',
      color: '#8B4513',
    } as any)).toThrow()

    expect(() => schema.parse({
      width_cm: 120,
      depth_cm: 60,
      height_cm: 75,
      material: 'wood',
      finish: 'ultra',
      color: '#8B4513',
    } as any)).toThrow()
  })

  it('rejects invalid color', () => {
    expect(() => schema.parse({
      width_cm: 120,
      depth_cm: 60,
      height_cm: 75,
      material: 'wood',
      color: 'brown',
    } as any)).toThrow()
  })

  it('accepts boundary min/max values', () => {
    const minInput = {
      width_cm: 30,
      depth_cm: 30,
      height_cm: 40,
      material: 'wood',
      color: '#AABBCC',
    }
    const maxInput = {
      width_cm: 300,
      depth_cm: 300,
      height_cm: 120,
      material: 'mdf',
      color: '#00FF00',
    }
    expect(schema.parse(minInput)).toEqual(minInput)
    expect(schema.parse(maxInput)).toEqual(maxInput)
  })

  it('allows lowercase hex color', () => {
    const input = {
      width_cm: 120,
      depth_cm: 60,
      height_cm: 75,
      material: 'steel',
      color: '#a1b2c3',
    }
    expect(schema.parse(input)).toEqual(input)
  })

  it('allows optional finish to be omitted', () => {
    const input = {
      width_cm: 100,
      depth_cm: 50,
      height_cm: 75,
      material: 'glass',
      color: '#123456',
    }
    expect(schema.parse(input)).toEqual(input)
  })

  it('formats error message per standard when transformed', () => {
    const bad = {
      width_cm: 15, // too small
      depth_cm: 60,
      height_cm: 75,
      material: 'wood',
      color: '#112233',
    } as any
    try {
      schema.parse(bad)
      fail('expected zod error')
    } catch (e: any) {
      const ve = transformZodError(e)
      expect(ve.message).toMatch(/^입력값이 올바르지 않습니다: width_cm - /)
    }
  })
})
