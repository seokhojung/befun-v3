import {
  calculateStandardPriceSync,
} from '@/lib/pricing'
import {
  PriceCalculationRequestV2,
} from '@/types/pricing'

describe('Standard Pricing Calculator (Story 2.3A.2)', () => {
  const makeReq = (overrides: Partial<PriceCalculationRequestV2> = {}): PriceCalculationRequestV2 => ({
    width_cm: 120,
    depth_cm: 60,
    height_cm: 75,
    material: 'wood',
    finish: 'matte',
    tier: 'premium',
    quantity: 2,
    ...overrides,
  })

  it('computes example scenario and matches expected rounding', () => {
    const req = makeReq()
    const res = calculateStandardPriceSync(req)
    // From story example: volume_m3=0.54, base 50,000, size 540, tier 0.95, unit ~ 48,013, total 96,026
    expect(res.volume_m3).toBeCloseTo(0.54, 6)
    expect(res.unit_price).toBe(48013)
    expect(res.line_total).toBe(96026)
    expect(res.currency).toBe('KRW')
  })

  it('applies material/finish/tier multipliers', () => {
    const a = calculateStandardPriceSync(makeReq({ material: 'glass', finish: 'glossy', tier: 'vip', quantity: 1 }))
    const b = calculateStandardPriceSync(makeReq({ material: 'wood', finish: 'matte', tier: 'free', quantity: 1 }))
    expect(a.unit_price).toBeGreaterThan(b.unit_price)
  })

  it('handles quantity and rounding correctly', () => {
    const res = calculateStandardPriceSync(makeReq({ quantity: 3 }))
    expect(res.line_total).toBe(res.unit_price * 3)
  })

  it('returns components with required keys', () => {
    const res = calculateStandardPriceSync(makeReq())
    expect(res.components).toHaveProperty('base')
    expect(res.components).toHaveProperty('size')
    expect(res.components).toHaveProperty('material')
    expect(res.components).toHaveProperty('finish')
    expect(res.components).toHaveProperty('tier')
  })
})

