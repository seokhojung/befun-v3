import { MATERIAL_MULTIPLIERS, FINISH_MULTIPLIERS, TIER_MULTIPLIERS, BASE_PRICE_KRW, SIZE_MULTIPLIER } from '@/types/pricing'

describe('Pricing constants alignment (Story 2.3A.2/2.3A.3)', () => {
  it('has expected base/size defaults', () => {
    expect(BASE_PRICE_KRW).toBe(50_000)
    expect(SIZE_MULTIPLIER).toBe(1_000)
  })

  it('material multipliers match spec', () => {
    expect(MATERIAL_MULTIPLIERS).toMatchObject({
      wood: 1.0,
      mdf: 0.8,
      steel: 1.15,
      metal: 1.5,
      glass: 2.0,
      fabric: 0.8,
    })
  })

  it('finish and tier multipliers present', () => {
    expect(FINISH_MULTIPLIERS).toMatchObject({ matte: 1.0, glossy: 1.2, satin: 1.1 })
    expect(TIER_MULTIPLIERS).toMatchObject({ free: 1.0, premium: 0.95, vip: 0.90 })
  })
})

