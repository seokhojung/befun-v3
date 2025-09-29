'use client'

import { useState, useCallback, useEffect } from 'react'
import ThreeCanvas from '@/components/three/ThreeCanvas'
import DeskModel from '@/components/three/DeskModel'
import ControlPanel from './ControlPanel'
import PriceDisplay from '@/components/pricing/PriceDisplay'
import { PurchaseSection } from '@/components/cart/PurchaseFlow'
import { SceneObjects, ConfiguratorSettings, Material } from '@/types/configurator'
import { DEFAULT_DIMENSIONS } from '@/lib/three/geometry'
import { getDefaultMaterial, MATERIAL_CONFIGS } from '@/lib/three/materials'
import { usePricing } from '@/hooks/use-pricing'
import type { MaterialType } from '@/types/pricing'
import type { CartItemData } from '@/types/cart'

const DEFAULT_SETTINGS: ConfiguratorSettings = {
  material: getDefaultMaterial().id,
  dimensions: DEFAULT_DIMENSIONS
}

// BFF API 응답 타입
interface ConfiguratorData {
  materials: Array<{
    id: string
    name: string
    type: 'wood' | 'metal' | 'glass' | 'fabric'
    price_per_unit: number
    availability: boolean
    thumbnail_url?: string
  }>
  design_limits: {
    max_dimensions: {
      width_cm: number
      depth_cm: number
      height_cm: number
    }
    available_materials: string[]
    available_finishes: string[]
  }
  user: {
    id: string
    email: string
    subscription_tier: 'free' | 'premium'
    design_quota: {
      used: number
      limit: number
    }
  }
}

export default function ConfiguratorUI() {
  const [sceneObjects, setSceneObjects] = useState<SceneObjects | null>(null)
  const [settings, setSettings] = useState<ConfiguratorSettings>(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)
  const [apiData, setApiData] = useState<ConfiguratorData | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [availableMaterials, setAvailableMaterials] = useState<Material[]>(MATERIAL_CONFIGS)
  const [performanceMetrics, setPerformanceMetrics] = useState<{
    fps: number
    frameTime: number
    memoryUsage?: number
  } | null>(null)

  // 실시간 가격 계산 훅
  const {
    priceData,
    loading: priceLoading,
    error: priceError,
    calculatePrice,
    clearError: clearPriceError,
    previousPrice,
    retryCount,
    fallbackPrice,
    isUsingFallback,
    networkStatus
  } = usePricing({
    debounceMs: 500,
    cacheEnabled: true,
    estimateOnly: false,
    onPriceChange: (newPrice, oldPrice) => {
      console.log('Price updated:', { newPrice: newPrice.total, oldPrice: oldPrice?.total })
    },
    onError: (error) => {
      console.error('Pricing error:', error)
    }
  })

  // BFF API 데이터 로드
  useEffect(() => {
    const loadConfiguratorData = async () => {
      try {
        const response = await fetch('/api/v1/bff/configurator?include_materials=true', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': '1',
          },
        })

        if (!response.ok) {
          throw new Error(`API 호출 실패: ${response.status}`)
        }

        const result = await response.json()
        setApiData(result.data)

        // API에서 재료 데이터를 받으면 변환하여 활용
        if (result.data.materials && result.data.materials.length > 0) {
          const convertedMaterials: Material[] = result.data.materials.map((apiMaterial: any) => ({
            id: apiMaterial.id,
            name: apiMaterial.name,
            color: getColorByType(apiMaterial.type),
            properties: {
              type: apiMaterial.type,
              metalness: apiMaterial.type === 'metal' ? 0.8 : 0.0,
              roughness: apiMaterial.type === 'metal' ? 0.2 : 0.8
            }
          }))
          setAvailableMaterials(convertedMaterials)
        }

        setApiError(null)
      } catch (error) {
        console.error('BFF API 로드 실패:', error)
        setApiError(error instanceof Error ? error.message : '알 수 없는 오류')
        // API 실패 시 기본 재료 설정 유지
        setAvailableMaterials(MATERIAL_CONFIGS)
      }
    }

    loadConfiguratorData()
  }, [])

  // 초기 가격 계산
  useEffect(() => {
    if (availableMaterials.length > 0 && settings) {
      const currentMaterial = availableMaterials.find(m => m.id === settings.material)
      if (currentMaterial?.properties.type) {
        calculatePrice({
          width_cm: settings.dimensions.width,
          depth_cm: settings.dimensions.depth,
          height_cm: settings.dimensions.height,
          material: currentMaterial.properties.type as MaterialType,
          use_cache: true,
          estimate_only: false
        })
      }
    }
  }, [availableMaterials, settings, calculatePrice])

  // API 재료 타입에 따른 색상 매핑
  const getColorByType = (type: string): string => {
    switch (type) {
      case 'wood': return '#D2691E'
      case 'metal': return '#708090'
      case 'glass': return '#E0F7FA'
      case 'fabric': return '#8D6E63'
      default: return '#D2691E'
    }
  }

  const handleSceneReady = useCallback((objects: SceneObjects) => {
    setSceneObjects(objects)
    setIsLoading(false)
  }, [])

  const handleSettingsChange = useCallback((newSettings: ConfiguratorSettings) => {
    setSettings(newSettings)

    // 재료 타입 매핑 (3D 시스템 → 가격 시스템)
    const materialTypeMapping: Record<string, MaterialType> = {
      'wood': 'wood',
      'mdf': 'mdf',
      'steel': 'steel',
      'metal': 'metal',
      'glass': 'glass',
      'fabric': 'fabric'
    }

    // 현재 선택된 재료 찾기
    const currentMaterial = availableMaterials.find(m => m.id === newSettings.material)
    const materialType = currentMaterial?.properties.type as MaterialType

    // 가격 계산 요청 (매핑된 재료 타입이 있을 때만)
    if (materialType && materialTypeMapping[materialType]) {
      calculatePrice({
        width_cm: newSettings.dimensions.width,
        depth_cm: newSettings.dimensions.depth,
        height_cm: newSettings.dimensions.height,
        material: materialTypeMapping[materialType],
        use_cache: true,
        estimate_only: false
      })
    }
  }, [availableMaterials, calculatePrice])

  const handlePerformanceUpdate = useCallback((metrics: { fps: number; frameTime: number; memoryUsage?: number }) => {
    setPerformanceMetrics(metrics)
  }, [])

  // 컨피규레이터 상태를 장바구니 데이터로 변환
  const convertToCartData = useCallback((designName?: string): CartItemData | null => {
    if (!priceData || !settings) {
      return null
    }

    const currentMaterial = availableMaterials.find(m => m.id === settings.material)
    const materialType = currentMaterial?.properties.type as MaterialType

    if (!materialType) {
      return null
    }

    // 재료 타입 매핑 (3D 시스템 → 가격 시스템)
    const materialTypeMapping: Record<string, string> = {
      'wood': 'wood',
      'mdf': 'mdf',
      'steel': 'steel',
      'metal': 'metal',
      'glass': 'glass',
      'fabric': 'fabric'
    }

    const mappedMaterial = materialTypeMapping[materialType]
    if (!mappedMaterial) {
      return null
    }

    return {
      designId: '', // 실제로는 저장된 디자인 ID 사용
      quantity: 1,
      customizations: {
        width_cm: settings.dimensions.width,
        depth_cm: settings.dimensions.depth,
        height_cm: settings.dimensions.height,
        material: mappedMaterial,
        calculated_price: priceData.total,
        price_breakdown: {
          base_price: priceData.base_price,
          material_modifier: priceData.material_modifier,
          volume_m3: priceData.volume_m3,
          subtotal: priceData.subtotal,
          tax: priceData.tax,
          total: priceData.total,
          currency: priceData.currency
        },
        color: currentMaterial?.color,
        name: designName || `맞춤 책상 (${settings.dimensions.width}×${settings.dimensions.depth}×${settings.dimensions.height}cm)`
      }
    }
  }, [priceData, settings, availableMaterials])

  // 로그인 핸들러
  const handleLogin = useCallback(() => {
    // 현재 설정을 세션에 저장하고 로그인 페이지로 이동
    const currentState = {
      settings,
      priceData
    }
    sessionStorage.setItem('configurator_state', JSON.stringify(currentState))
    window.location.href = '/login?returnTo=/configurator'
  }, [settings, priceData])

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-50">
      {/* 3D 뷰포트 */}
      <div className="flex-1 min-h-0 relative">
        <ThreeCanvas
          onSceneReady={handleSceneReady}
          onPerformanceUpdate={handlePerformanceUpdate}
          className="w-full h-full"
        />

        {/* 3D 모델 컨트롤러 */}
        {sceneObjects && (
          <DeskModel
            sceneObjects={sceneObjects}
            settings={settings}
            onSettingsChange={handleSettingsChange}
          />
        )}

        {/* 성능 모니터링 UI */}
        {performanceMetrics && (
          <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white text-xs p-2 rounded font-mono">
            <div>FPS: {Math.round(performanceMetrics.fps)}</div>
            <div>Frame: {performanceMetrics.frameTime.toFixed(1)}ms</div>
            {performanceMetrics.memoryUsage && (
              <div>RAM: {Math.round(performanceMetrics.memoryUsage)}MB</div>
            )}
          </div>
        )}

        {/* 로딩 오버레이 */}
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">3D 컨피규레이터 로딩 중...</p>
            </div>
          </div>
        )}
      </div>

      {/* 컨트롤 패널 */}
      <div className="w-full lg:w-96 bg-white border-l border-gray-200 overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
          <h1 className="text-xl font-semibold text-gray-900">책상 컨피규레이터</h1>
          <p className="text-sm text-gray-600 mt-1">재료와 크기를 선택하여 맞춤형 책상을 디자인하세요</p>
        </div>

        <div className="p-4 space-y-4">
          {/* 실시간 가격 표시 */}
          <PriceDisplay
            priceData={priceData}
            loading={priceLoading}
            error={priceError}
            showBreakdown={false}
            showTaxToggle={true}
            fallbackPrice={fallbackPrice}
            isUsingFallback={isUsingFallback}
            retryCount={retryCount}
            onToggleBreakdown={() => {
              console.log('Price breakdown toggled')
            }}
            onRetry={async () => {
              // 현재 설정으로 재시도
              if (settings) {
                const currentMaterial = availableMaterials.find(m => m.id === settings.material)
                const materialType = currentMaterial?.properties.type as MaterialType

                if (materialType) {
                  await calculatePrice({
                    width_cm: settings.dimensions.width,
                    depth_cm: settings.dimensions.depth,
                    height_cm: settings.dimensions.height,
                    material: materialType,
                    use_cache: false, // 재시도 시 캐시 무시
                    estimate_only: false
                  })
                }
              }
            }}
          />

          {/* 구매 섹션 */}
          {priceData && !priceLoading && !priceError && (
            <div className="border-t pt-4">
              <PurchaseSection
                cartData={convertToCartData() as CartItemData}
                isAuthenticated={apiData?.user?.id ? true : false}
                onLogin={handleLogin}
                showPriceCard={false}
                className="space-y-3"
              />
            </div>
          )}

          {/* 장바구니 추가 불가능한 경우 안내 */}
          {(!priceData || priceLoading || priceError) && (
            <div className="border-t pt-4">
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-600">
                  {priceLoading ? '가격 계산 중...' :
                   priceError ? '가격 계산 오류 - 재시도해주세요' :
                   '가격을 확인한 후 장바구니에 추가할 수 있습니다'}
                </p>
              </div>
            </div>
          )}

          {/* 컨트롤 패널 */}
          <ControlPanel
            settings={settings}
            onSettingsChange={handleSettingsChange}
            isLoading={isLoading}
            availableMaterials={availableMaterials}
            apiData={apiData}
            apiError={apiError}
          />
        </div>
      </div>
    </div>
  )
}