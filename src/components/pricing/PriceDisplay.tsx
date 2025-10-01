'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import PriceErrorBoundary from './PriceErrorBoundary'
import {
  TrendingUp,
  TrendingDown,
  Calculator,
  Info,
  Eye,
  EyeOff
} from 'lucide-react'
import { PriceUtils } from '@/lib/pricing'
import type { PriceCalculationResponse } from '@/types/pricing'

interface PriceDisplayProps {
  priceData: PriceCalculationResponse | null
  loading?: boolean
  error?: string | null
  showBreakdown?: boolean
  showTaxToggle?: boolean
  className?: string
  onToggleBreakdown?: () => void
  fallbackPrice?: number | null
  isUsingFallback?: boolean
  retryCount?: number
  onRetry?: () => void
}

interface PriceAnimationProps {
  currentPrice: number
  previousPrice?: number
  duration?: number
}

// 가격 변경 애니메이션 컴포넌트
const PriceAnimation: React.FC<PriceAnimationProps> = ({
  currentPrice,
  previousPrice,
  duration = 0.5
}) => {
  const [displayPrice, setDisplayPrice] = useState(previousPrice || currentPrice)

  useEffect(() => {
    if (previousPrice !== undefined && previousPrice !== currentPrice) {
      // 가격 변경 애니메이션
      const startTime = Date.now()
      const difference = currentPrice - previousPrice

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / (duration * 1000), 1)

        const easeOut = 1 - Math.pow(1 - progress, 3)
        const animatedPrice = previousPrice + (difference * easeOut)

        setDisplayPrice(Math.round(animatedPrice))

        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }

      requestAnimationFrame(animate)
    } else {
      setDisplayPrice(currentPrice)
    }
  }, [currentPrice, previousPrice, duration])

  const priceChange = previousPrice !== undefined ?
    PriceUtils.calculatePriceChange(currentPrice, previousPrice) : null

  return (
    <div className="flex items-baseline gap-2">
      <motion.span
        key={displayPrice}
        initial={{ scale: 1.1, color: '#3b82f6' }}
        animate={{ scale: 1, color: '#000000' }}
        transition={{ duration: 0.3 }}
        className="text-3xl font-bold"
      >
        {PriceUtils.formatKRW(displayPrice)}
      </motion.span>

      {priceChange && priceChange.type !== 'same' && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          className={`flex items-center gap-1 text-sm font-medium ${
            priceChange.type === 'increase'
              ? 'text-red-600'
              : 'text-green-600'
          }`}
        >
          {priceChange.type === 'increase' ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          <span>
            {PriceUtils.formatKRW(priceChange.amount)}
            {priceChange.percentage > 0 && (
              <span className="ml-1">
                ({priceChange.percentage.toFixed(1)}%)
              </span>
            )}
          </span>
        </motion.div>
      )}
    </div>
  )
}

// 가격 세부 내역 컴포넌트
const PriceBreakdown: React.FC<{ breakdown: PriceCalculationResponse['breakdown'] }> = ({
  breakdown
}) => {
  const items = [
    {
      label: '기본 제작비',
      amount: breakdown.base_cost,
      description: '기본 가구 제작 비용'
    },
    {
      label: '재료비',
      amount: breakdown.material_cost,
      description: `${breakdown.material_info.type} (×${breakdown.material_info.modifier})`
    },
    {
      label: '배송비',
      amount: breakdown.shipping_cost,
      description: '전국 무료배송'
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-3"
    >
      {items.map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex justify-between items-center py-2"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700">{item.label}</span>
            <span className="text-xs text-gray-500">({item.description})</span>
          </div>
          <span className="font-semibold">{PriceUtils.formatKRW(item.amount)}</span>
        </motion.div>
      ))}

      <Separator className="my-3" />

      <div className="flex justify-between items-center py-2">
        <span className="font-medium text-gray-700">소계</span>
        <span className="font-semibold">{PriceUtils.formatKRW(breakdown.subtotal)}</span>
      </div>

      <div className="flex justify-between items-center py-2">
        <span className="font-medium text-gray-700">부가세 (10%)</span>
        <span className="font-semibold">{PriceUtils.formatKRW(breakdown.tax)}</span>
      </div>
    </motion.div>
  )
}

// 메인 가격 표시 컴포넌트
export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  priceData,
  loading = false,
  error = null,
  showBreakdown = false,
  showTaxToggle = true,
  className = '',
  onToggleBreakdown,
  fallbackPrice = null,
  isUsingFallback = false,
  retryCount = 0,
  onRetry
}) => {
  const [includeTax, setIncludeTax] = useState(true)
  const [previousPrice, setPreviousPrice] = useState<number>()
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(showBreakdown)

  // 가격이 변경되면 이전 가격을 저장
  useEffect(() => {
    if (priceData && priceData.total !== previousPrice) {
      setPreviousPrice(priceData.total)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceData?.total])

  const handleToggleBreakdown = () => {
    setIsBreakdownOpen(!isBreakdownOpen)
    onToggleBreakdown?.()
  }

  const displayPrice = priceData ?
    (includeTax ? priceData.total : priceData.subtotal) : 0

  const volume = priceData?.volume_m3 || 0

  return (
    <Card className={`w-full ${className}`}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* 헤더 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold">실시간 가격</h3>
            </div>

            {priceData && (
              <Badge variant="secondary" className="text-xs">
                {PriceUtils.formatVolume(volume)}
              </Badge>
            )}
          </div>

          {/* 로딩 상태 */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"
              />
            </div>
          )}

          {/* 에러 상태 */}
          {error && (
            <PriceErrorBoundary
              error={error}
              onRetry={onRetry}
              onDismiss={() => {
                // 에러 클리어 로직은 부모 컴포넌트에서 처리
              }}
              fallbackPrice={fallbackPrice}
              showFallback={!!fallbackPrice}
              retryCount={retryCount}
              maxRetries={3}
            />
          )}

          {/* 가격 표시 */}
          {priceData && !loading && !error && (
            <>
              <div className="space-y-3">
                <PriceAnimation
                  currentPrice={displayPrice}
                  previousPrice={previousPrice}
                />

                {/* 재료 정보 */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>{priceData.material_info.type}</span>
                  <span>•</span>
                  <span>배수: {priceData.material_info.modifier}x</span>
                  <span>•</span>
                  <span>{priceData.calculated_at.split('T')[0]}</span>
                </div>

                {/* 부가세 토글 */}
                {showTaxToggle && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">부가세 포함</span>
                    <Switch
                      checked={includeTax}
                      onCheckedChange={setIncludeTax}
                    />
                  </div>
                )}
              </div>

              <Separator />

              {/* 세부 내역 토글 버튼 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleBreakdown}
                className="w-full flex items-center justify-center gap-2"
              >
                {isBreakdownOpen ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    세부 내역 숨기기
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    세부 내역 보기
                  </>
                )}
              </Button>

              {/* 가격 세부 내역 */}
              <AnimatePresence>
                {isBreakdownOpen && (
                  <PriceBreakdown breakdown={priceData.breakdown} />
                )}
              </AnimatePresence>
            </>
          )}

          {/* 빈 상태 */}
          {!priceData && !loading && !error && (
            <div className="text-center py-8 text-gray-500">
              <Info className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>치수와 재료를 선택하면</p>
              <p>실시간 가격이 표시됩니다</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default PriceDisplay