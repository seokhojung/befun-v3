// 가격 정책 관리 모듈
import { supabase } from '@/lib/supabase'
import {
  PricingPolicy,
  MaterialType,
  MATERIAL_DEFAULTS,
  PriceCalculationError
} from '@/types/pricing'

export class PricingPolicyManager {
  private static instance: PricingPolicyManager
  private cache: Map<MaterialType, PricingPolicy> = new Map()
  private cacheExpiry: number = 0
  private readonly CACHE_TTL = 60 * 60 * 1000 // 1시간

  static getInstance(): PricingPolicyManager {
    if (!PricingPolicyManager.instance) {
      PricingPolicyManager.instance = new PricingPolicyManager()
    }
    return PricingPolicyManager.instance
  }

  /**
   * 모든 활성 가격 정책 조회 (캐시 적용)
   */
  async getPricingPolicies(): Promise<PricingPolicy[]> {
    if (this.isCacheValid()) {
      return Array.from(this.cache.values())
    }

    try {
      const { data, error } = await supabase
        .from('pricing_policies')
        .select('*')
        .eq('is_active', true)
        .order('material_type')

      if (error) {
        throw new PriceCalculationError(
          'Failed to fetch pricing policies',
          'CALCULATION_FAILED',
          error
        )
      }

      // 캐시 업데이트
      this.updateCache(data || [])

      return data || []
    } catch (error) {
      console.error('Error fetching pricing policies:', error)

      // 캐시에 데이터가 있으면 반환, 없으면 기본값 사용
      if (this.cache.size > 0) {
        return Array.from(this.cache.values())
      }

      return this.getDefaultPolicies()
    }
  }

  /**
   * 특정 재료의 가격 정책 조회
   */
  async getPolicyByMaterial(material: MaterialType): Promise<PricingPolicy> {
    const policies = await this.getPricingPolicies()
    const policy = policies.find(p => p.material_type === material)

    if (!policy) {
      // 기본 정책 반환
      return this.createDefaultPolicy(material)
    }

    return policy
  }

  /**
   * 가격 정책 업데이트
   */
  async updatePricingPolicy(
    policyUpdate: Partial<PricingPolicy> & Pick<PricingPolicy, 'id'>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('pricing_policies')
        .update({
          ...policyUpdate,
          updated_at: new Date().toISOString()
        })
        .eq('id', policyUpdate.id)

      if (error) {
        throw new PriceCalculationError(
          'Failed to update pricing policy',
          'CALCULATION_FAILED',
          error
        )
      }

      // 캐시 무효화
      this.invalidateCache()
    } catch (error) {
      console.error('Error updating pricing policy:', error)
      throw error
    }
  }

  /**
   * 새 가격 정책 생성
   */
  async createPricingPolicy(policy: Omit<PricingPolicy, 'id' | 'created_at' | 'updated_at'>): Promise<PricingPolicy> {
    try {
      const { data, error } = await supabase
        .from('pricing_policies')
        .insert({
          ...policy,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw new PriceCalculationError(
          'Failed to create pricing policy',
          'CALCULATION_FAILED',
          error
        )
      }

      // 캐시 무효화
      this.invalidateCache()

      return data
    } catch (error) {
      console.error('Error creating pricing policy:', error)
      throw error
    }
  }

  /**
   * 기본 가격 정책들 초기화 (데이터베이스에 삽입)
   */
  async initializeDefaultPolicies(): Promise<void> {
    const defaultPolicies = this.getDefaultPolicies()

    for (const policy of defaultPolicies) {
      try {
        // 이미 존재하는지 확인
        const { data: existing } = await supabase
          .from('pricing_policies')
          .select('id')
          .eq('material_type', policy.material_type)
          .single()

        if (!existing) {
          await this.createPricingPolicy(policy)
        }
      } catch (error) {
        console.error(`Error initializing policy for ${policy.material_type}:`, error)
      }
    }
  }

  /**
   * 캐시 관리
   */
  private updateCache(policies: PricingPolicy[]): void {
    this.cache.clear()
    policies.forEach(policy => {
      this.cache.set(policy.material_type, policy)
    })
    this.cacheExpiry = Date.now() + this.CACHE_TTL
  }

  private isCacheValid(): boolean {
    return this.cache.size > 0 && Date.now() < this.cacheExpiry
  }

  private invalidateCache(): void {
    this.cache.clear()
    this.cacheExpiry = 0
  }

  /**
   * 기본 정책 생성
   */
  private getDefaultPolicies(): PricingPolicy[] {
    return Object.entries(MATERIAL_DEFAULTS).map(([material, config]) =>
      this.createDefaultPolicy(material as MaterialType)
    )
  }

  private createDefaultPolicy(material: MaterialType): PricingPolicy {
    const config = MATERIAL_DEFAULTS[material]

    return {
      id: `default-${material}`,
      material_type: material,
      base_price_per_m3: config.basePrice,
      price_modifier: config.modifier,
      is_active: true,
      legacy_material: config.legacy,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }
}

// 싱글톤 인스턴스 내보내기
export const pricingPolicyManager = PricingPolicyManager.getInstance()