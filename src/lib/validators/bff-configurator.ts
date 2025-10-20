import { z } from 'zod'

export const BffMaterialItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['wood', 'mdf', 'steel', 'metal', 'glass', 'fabric']),
  is_active: z.boolean(),
  thumbnail_url: z.string().url().or(z.null()).optional(),
})

export const BffRulesSchema = z.object({
  base_price: z.number(),
  size_multiplier: z.number(),
  material_multipliers: z.record(z.string(), z.number()),
  finish_multipliers: z.record(z.string(), z.number()),
})

export const BffConstraintsSchema = z.object({
  width_cm: z.object({ min: z.number(), max: z.number(), step: z.number() }),
  depth_cm: z.object({ min: z.number(), max: z.number(), step: z.number() }),
  height_cm: z.object({ min: z.number(), max: z.number(), step: z.number() }),
})

export const ConfiguratorInitResponseSchema = z.object({
  materials: z.array(BffMaterialItemSchema),
  rules: BffRulesSchema,
  constraints: BffConstraintsSchema,
  // 계약 키 존재 보장 (camelCase)
  pricingRules: z.array(z.any()).optional().default([]),
  savedDesigns: z.array(z.any()).optional().default([]),
  preferences: z.object({
    theme: z.enum(['light', 'dark']).optional(),
    units: z.enum(['cm', 'inch']).optional(),
    currency: z.enum(['KRW', 'USD']).optional(),
  }).optional(),
  quotaStatus: z.object({
    used: z.number().nonnegative(),
    limit: z.number().nonnegative(),
    tier: z.enum(['free', 'premium']).optional(),
  }).optional(),
}).passthrough()

export type ConfiguratorInitResponse = z.infer<typeof ConfiguratorInitResponseSchema>
