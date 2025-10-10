'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
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
  useEffect(() => {
    console.debug('[Configurator] component mounted')
  }, [])
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

  // useRef 패턴: availableMaterials와 calculatePrice의 최신 참조 유지 (무한 루프 방지)
  const availableMaterialsRef = useRef(availableMaterials)
  const calculatePriceRef = useRef(calculatePrice)

  useEffect(() => {
    availableMaterialsRef.current = availableMaterials
  }, [availableMaterials])

  useEffect(() => {
    calculatePriceRef.current = calculatePrice
  }, [calculatePrice])

  // BFF API 데이터 로드
  useEffect(() => {
    let isMounted = true // 컴포넌트 마운트 상태 추적
    let hasAttempted = false // 중복 호출 방지

    const loadConfiguratorData = async () => {
      // 중복 호출 방지 (무한 루프 연쇄 방지)
      if (hasAttempted) {
        console.warn('BFF API already attempted, skipping duplicate call')
        return
      }
      hasAttempted = true

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

        // 컴포넌트가 여전히 마운트되어 있을 때만 state 업데이트
        if (isMounted) {
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
        }
      } catch (error) {
        console.error('BFF API 로드 실패:', error)

        // 컴포넌트가 여전히 마운트되어 있을 때만 state 업데이트
        if (isMounted) {
          setApiError(error instanceof Error ? error.message : '알 수 없는 오류')
          // API 실패 시 기본 재료 설정 유지 (무한 루프 방지)
          setAvailableMaterials(MATERIAL_CONFIGS)
        }

        // 에러 발생 시 재시도하지 않음 (무한 루프 방지)
        console.warn('BFF API failed, falling back to default materials. Will NOT retry.')
      }
    }

    loadConfiguratorData()

    // Cleanup 함수: 컴포넌트 언마운트 시 isMounted = false
    return () => {
      isMounted = false
    }
  }, [])

  // 초기 가격 계산 (ref 사용으로 무한 루프 방지)
  useEffect(() => {
    if (availableMaterialsRef.current.length > 0 && settings) {
      const currentMaterial = availableMaterialsRef.current.find(m => m.id === settings.material)
      if (currentMaterial?.properties.type) {
        calculatePriceRef.current({
          width_cm: settings.dimensions.width * 100,
          depth_cm: settings.dimensions.depth * 100,
          height_cm: settings.dimensions.height * 100,
          material: currentMaterial.properties.type as MaterialType,
          use_cache: true,
          estimate_only: false
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    settings.material,
    settings.dimensions.width,
    settings.dimensions.depth,
    settings.dimensions.height
  ])

  // 로딩 상태 변화 로깅
  useEffect(() => {
    console.debug('[Configurator] isLoading:', isLoading)
  }, [isLoading])

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
    console.debug('[Configurator] onSceneReady received')
    setSceneObjects(objects)
    setIsLoading(false)
  }, [])

  const handleSceneError = useCallback((message: string) => {
    console.warn('[Configurator] Scene init error:', message)
    // 씬 초기화 실패 시에도 UI가 전면 블록되지 않도록 로딩 해제
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

    // 현재 선택된 재료 찾기 (ref 사용 - 무한 루프 방지)
    const currentMaterial = availableMaterialsRef.current.find(m => m.id === newSettings.material)
    const materialType = currentMaterial?.properties.type as MaterialType

    // 가격 계산 요청 (ref 사용 - 무한 루프 방지)
    if (materialType && materialTypeMapping[materialType]) {
      calculatePriceRef.current({
        width_cm: newSettings.dimensions.width * 100,
        depth_cm: newSettings.dimensions.depth * 100,
        height_cm: newSettings.dimensions.height * 100,
        material: materialTypeMapping[materialType],
        use_cache: true,
        estimate_only: false
      })
    }
  }, []) // 빈 의존성 배열 - 무한 루프 방지!

  const handlePerformanceUpdate = useCallback((metrics: { fps: number; frameTime: number; memoryUsage?: number }) => {
    setPerformanceMetrics(metrics)
  }, [])

  // 초기화 워치독: onSceneReady 미도달로 로딩이 지속될 경우 방어적으로 해제
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn('[Configurator] Init watchdog: forcing loading overlay off after timeout')
        setIsLoading(false)
      }
    }, 5000)
    return () => clearTimeout(timeout)
  }, [isLoading])

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
          onInitError={handleSceneError}
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
                    width_cm: settings.dimensions.width * 100,
                    depth_cm: settings.dimensions.depth * 100,
                    height_cm: settings.dimensions.height * 100,
                    material: materialType,
                    use_cache: false, // 재시도 시 캐시 무시
                    estimate_only: false
                  })
                }
              }
            }}
          />

          {/* 구매 섹션 */}
          {priceData && !priceLoading && !priceError && (() => {
            const cartData = convertToCartData()
            if (!cartData) return null
            return (
              <div className="border-t pt-4">
                <PurchaseSection
                  cartData={cartData as CartItemData}
                  isAuthenticated={apiData?.user?.id ? true : false}
                  onLogin={handleLogin}
                  showPriceCard={false}
                  className="space-y-3"
                />
              </div>
            )
          })()}

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

