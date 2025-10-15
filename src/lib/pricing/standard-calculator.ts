import {
  BASE_PRICE_KRW,
  SIZE_MULTIPLIER,
  MATERIAL_MULTIPLIERS,
  FINISH_MULTIPLIERS,
  TIER_MULTIPLIERS,
  PriceCalculationRequestV2,
  PriceCalculationResponseV2,
} from '@/types/pricing'

function roundHalfUp(n: number): number {
  // 모든 금액은 양수 기준. Math.round는 half up과 동일하게 동작
  return Math.round(n)
}

export function calculateStandardPriceSync(req: PriceCalculationRequestV2): PriceCalculationResponseV2 {
  const { width_cm, depth_cm, height_cm, material, finish, tier, quantity } = req

  // volume in m3
  const volume_m3 = (width_cm * depth_cm * height_cm) / 1_000_000

  const base = BASE_PRICE_KRW
  const size = volume_m3 * SIZE_MULTIPLIER
  const materialMul = MATERIAL_MULTIPLIERS[material]
  const finishMul = FINISH_MULTIPLIERS[finish]
  const tierMul = TIER_MULTIPLIERS[tier]

  const unit_price_raw = (base + size) * materialMul * finishMul * tierMul
  const unit_price = roundHalfUp(unit_price_raw)
  const line_total = roundHalfUp(unit_price * quantity)

  return {
    volume_m3: Number(volume_m3.toFixed(6)),
    components: {
      base,
      size: roundHalfUp(size),
      material: materialMul,
      finish: finishMul,
      tier: tierMul,
    },
    unit_price,
    quantity,
    line_total,
    currency: 'KRW',
  }
}

export async function calculateStandardPrice(req: PriceCalculationRequestV2): Promise<PriceCalculationResponseV2> {
  return calculateStandardPriceSync(req)
}

