import { calculateStandardPriceSync } from '@/lib/pricing/standard-calculator'
import { PriceCalculationRequestV2 } from '@/types/pricing'

describe('Standard calculator example from story', () => {
  it('computes unit and total for 120x60x75 wood/matte premium qty 2', () => {
    const req: PriceCalculationRequestV2 = {
      width_cm: 120,
      depth_cm: 60,
      height_cm: 75,
      material: 'wood',
      finish: 'matte',
      tier: 'premium',
      quantity: 2,
    }
    const res = calculateStandardPriceSync(req)
    expect(res.unit_price).toBe(48013)
    expect(res.line_total).toBe(96026)
    expect(res.currency).toBe('KRW')
  })
})

