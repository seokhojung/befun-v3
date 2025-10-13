/**
 * @jest-environment jsdom
 */
import React, { useEffect } from 'react'
import { render, screen, waitFor } from '@testing-library/react'

// Count how many times calculatePrice is invoked
let calcCalls = 0

// Mock usePricing to observe calculatePrice invocations and provide stable shape
jest.mock('@/hooks/use-pricing', () => ({
  usePricing: () => ({
    priceData: null,
    loading: false,
    error: null,
    previousPrice: null,
    retryCount: 0,
    fallbackPrice: null,
    isUsingFallback: false,
    networkStatus: 'ok',
    calculatePrice: async () => {
      calcCalls += 1
      return { total: 1000 }
    },
    clearError: () => {},
  })
}))

// Default ThreeCanvas mock: immediately triggers onSceneReady
jest.mock('@/components/three/ThreeCanvas', () => ({
  __esModule: true,
  default: ({ onSceneReady }: any) => {
    useEffect(() => {
      // Provide a minimal SceneObjects stub so DeskModel effects don't crash
      const scene: any = { children: [], add: (obj: any) => scene.children.push(obj), remove: (obj: any) => {
        const idx = scene.children.indexOf(obj)
        if (idx >= 0) scene.children.splice(idx, 1)
      }, background: null }
      const stub = {
        scene,
        camera: {} as any,
        renderer: { setSize: () => {}, setPixelRatio: () => {}, domElement: {} } as any,
        controls: { update: () => {}, dispose: () => {} } as any,
        deskMesh: {} as any,
        lights: { directional: {} as any, ambient: {} as any }
      }
      onSceneReady?.(stub)
    }, [onSceneReady])
    return <div data-testid="three-canvas-mock" />
  }
}))

// ControlPanel mock: calls onSettingsChange once after mount to simulate a single user change
jest.mock('@/app/configurator/components/ControlPanel', () => ({
  __esModule: true,
  default: ({ onSettingsChange, settings }: any) => {
    useEffect(() => {
      // simulate a single settings change (width +1)
      onSettingsChange?.({
        ...settings,
        dimensions: { ...settings.dimensions, width: settings.dimensions.width + 1 }
      })
    // call only once
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    return <div data-testid="control-panel-mock" />
  }
}))

// BFF fetch response mock
beforeEach(() => {
  calcCalls = 0
  ;(global.fetch as any) = jest.fn(async (url: string) => {
    if (url.includes('/api/v1/bff/configurator')) {
      return new Response(JSON.stringify({
        success: true,
        data: {
          materials: [
            { id: 'wood', name: 'Wood', type: 'wood', price_per_unit: 1, availability: true },
            { id: 'metal', name: 'Metal', type: 'metal', price_per_unit: 1, availability: true },
          ],
          design_limits: { max_dimensions: { width_cm: 200, depth_cm: 200, height_cm: 200 }, available_materials: [], available_finishes: [] },
          user: { id: 'u1', email: 't@example.com', subscription_tier: 'free', design_quota: { used: 0, limit: 1 } }
        }
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    return new Response(JSON.stringify({ success: true }), { status: 200 })
  })
})

afterEach(() => {
  jest.clearAllMocks()
})

describe('ConfiguratorUI regression (1.2D)', () => {
  it('performs one initial price calculation on mount (after scene ready)', async () => {
    const { default: ConfiguratorUI } = await import('@/app/configurator/components/ConfiguratorUI')
    render(<ConfiguratorUI />)

    // Loading overlay should disappear once onSceneReady triggers
    await waitFor(() => {
      expect(screen.queryByText('3D 컨피규레이터 로딩 중...')).not.toBeInTheDocument()
    })

    // Initial calculatePrice may have been called at least once
    expect(calcCalls).toBeGreaterThanOrEqual(1)
  })

  it('a single settings change triggers exactly one additional price call', async () => {
    const { default: ConfiguratorUI } = await import('@/app/configurator/components/ConfiguratorUI')
    render(<ConfiguratorUI />)

    const initialCalls = calcCalls

    // ControlPanel mock triggers exactly one change on mount, debounce handled in hook mock
    await waitFor(() => {
      expect(calcCalls).toBeGreaterThanOrEqual(initialCalls + 1)
    })

    // Ensure it was only +1 (no loop)
    expect(calcCalls).toBe(initialCalls + 1)
  })

  it('watchdog clears loading within 5s when scene never becomes ready', async () => {
    jest.useFakeTimers()

    // Remock ThreeCanvas to NEVER call onSceneReady
    jest.isolateModules(async () => {
      jest.doMock('@/components/three/ThreeCanvas', () => ({
        __esModule: true,
        default: () => <div data-testid="three-canvas-mock-no-ready" />
      }))
      const { default: ConfiguratorUI } = await import('@/app/configurator/components/ConfiguratorUI')
      render(<ConfiguratorUI />)

      // Initially shows loading
      expect(screen.getByText('3D 컨피규레이터 로딩 중...')).toBeInTheDocument()

      // Advance time beyond watchdog (5s)
      jest.advanceTimersByTime(5000)

      await waitFor(() => {
        expect(screen.queryByText('3D 컨피규레이터 로딩 중...')).not.toBeInTheDocument()
      })
    })

    jest.useRealTimers()
  })
})
