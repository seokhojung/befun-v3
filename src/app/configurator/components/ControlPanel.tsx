'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfiguratorSettings, Material } from '@/types/configurator'
import { MATERIAL_CONFIGS } from '@/lib/three/materials'
import { DIMENSION_LIMITS } from '@/lib/three/geometry'

interface ControlPanelProps {
  settings: ConfiguratorSettings
  onSettingsChange: (settings: ConfiguratorSettings) => void
  isLoading?: boolean
  availableMaterials?: Material[]
  apiData?: any
  apiError?: string | null
}

export default function ControlPanel({
  settings,
  onSettingsChange,
  isLoading = false,
  availableMaterials = MATERIAL_CONFIGS,
  apiData,
  apiError
}: ControlPanelProps) {
  // Controlled component 패턴: local state로 즉시 UI 업데이트
  const [localDimensions, setLocalDimensions] = useState(settings.dimensions)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const settingsRef = useRef(settings)

  // settings가 외부에서 변경되면 localDimensions 동기화
  useEffect(() => {
    setLocalDimensions(settings.dimensions)
  }, [settings.dimensions])

  // settingsRef를 항상 최신 상태로 유지 (stale closure 방지)
  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  const handleMaterialChange = (materialId: string) => {
    onSettingsChange({
      ...settings,
      material: materialId
    })
  }

  const handleDimensionChange = (
    dimension: 'width' | 'depth' | 'height',
    value: number
  ) => {
    const newDims = { ...localDimensions, [dimension]: value }
    setLocalDimensions(newDims) // 즉시 UI 업데이트

    // 기존 debounce 타이머 취소
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // 500ms 디바운싱 후 onSettingsChange 호출 (가격 업데이트 가이드 준수)
    debounceTimerRef.current = setTimeout(() => {
      onSettingsChange({
        ...settingsRef.current, // 최신 settings 사용 (stale closure 방지)
        dimensions: newDims
      })
    }, 500)
  }

  // Cleanup: 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const cmToM = (cm: number) => cm / 100
  const mToCm = (m: number) => Math.round(m * 100)

  return (
    <div className="w-full max-w-md space-y-6 p-4">
      {/* API 에러 표시 */}
      {apiError && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-orange-400 rounded-full"></div>
              <div>
                <p className="text-sm font-medium text-orange-800">API 연결 실패</p>
                <p className="text-xs text-orange-600">기본 재료 옵션을 사용합니다</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 재료 선택 */}
      <Card>
        <CardHeader>
          <CardTitle>재료 선택</CardTitle>
          {apiData && (
            <p className="text-xs text-green-600">✓ BFF API 연동됨</p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-2">
            {availableMaterials.map((material) => (
              <Button
                key={material.id}
                variant={settings.material === material.id ? 'default' : 'outline'}
                className="justify-start h-12"
                onClick={() => handleMaterialChange(material.id)}
                disabled={isLoading}
                data-testid={`material-${material.id}`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-6 h-6 rounded border border-gray-300"
                    style={{ backgroundColor: material.color }}
                  />
                  <span>{material.name}</span>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 치수 조절 */}
      <Card>
        <CardHeader>
          <CardTitle>치수 조절 (cm)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 가로 */}
          <div className="space-y-3">
            <Label htmlFor="width-slider">가로: {mToCm(localDimensions.width)}cm</Label>
            <Slider
              id="width-slider"
              min={mToCm(DIMENSION_LIMITS.width.min)}
              max={mToCm(DIMENSION_LIMITS.width.max)}
              step={1}
              value={[mToCm(localDimensions.width)]}
              onValueChange={(value) => handleDimensionChange('width', cmToM(value[0]))}
              disabled={isLoading}
              className="w-full"
            />
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                min={mToCm(DIMENSION_LIMITS.width.min)}
                max={mToCm(DIMENSION_LIMITS.width.max)}
                step={1}
                value={mToCm(localDimensions.width)}
                onChange={(e) => {
                  const value = parseInt(e.target.value)
                  if (!isNaN(value)) {
                    handleDimensionChange('width', cmToM(value))
                  }
                }}
                disabled={isLoading}
                className="w-20 text-sm"
              />
              <span className="text-sm text-gray-500">cm</span>
            </div>
          </div>

          {/* 세로 (깊이) */}
          <div className="space-y-3">
            <Label htmlFor="depth-slider">세로: {mToCm(localDimensions.depth)}cm</Label>
            <Slider
              id="depth-slider"
              min={mToCm(DIMENSION_LIMITS.depth.min)}
              max={mToCm(DIMENSION_LIMITS.depth.max)}
              step={1}
              value={[mToCm(localDimensions.depth)]}
              onValueChange={(value) => handleDimensionChange('depth', cmToM(value[0]))}
              disabled={isLoading}
              className="w-full"
            />
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                min={mToCm(DIMENSION_LIMITS.depth.min)}
                max={mToCm(DIMENSION_LIMITS.depth.max)}
                step={1}
                value={mToCm(localDimensions.depth)}
                onChange={(e) => {
                  const value = parseInt(e.target.value)
                  if (!isNaN(value)) {
                    handleDimensionChange('depth', cmToM(value))
                  }
                }}
                disabled={isLoading}
                className="w-20 text-sm"
              />
              <span className="text-sm text-gray-500">cm</span>
            </div>
          </div>

          {/* 높이 */}
          <div className="space-y-3">
            <Label htmlFor="height-slider">높이: {mToCm(localDimensions.height)}cm</Label>
            <Slider
              id="height-slider"
              min={mToCm(DIMENSION_LIMITS.height.min)}
              max={mToCm(DIMENSION_LIMITS.height.max)}
              step={1}
              value={[mToCm(localDimensions.height)]}
              onValueChange={(value) => handleDimensionChange('height', cmToM(value[0]))}
              disabled={isLoading}
              className="w-full"
            />
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                min={mToCm(DIMENSION_LIMITS.height.min)}
                max={mToCm(DIMENSION_LIMITS.height.max)}
                step={1}
                value={mToCm(localDimensions.height)}
                onChange={(e) => {
                  const value = parseInt(e.target.value)
                  if (!isNaN(value)) {
                    handleDimensionChange('height', cmToM(value))
                  }
                }}
                disabled={isLoading}
                className="w-20 text-sm"
              />
              <span className="text-sm text-gray-500">cm</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 현재 설정 요약 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">현재 설정</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <div>재료: {availableMaterials.find(m => m.id === settings.material)?.name}</div>
          <div>크기: {mToCm(settings.dimensions.width)} × {mToCm(settings.dimensions.depth)} × {mToCm(settings.dimensions.height)}cm</div>
        </CardContent>
      </Card>
    </div>
  )
}
