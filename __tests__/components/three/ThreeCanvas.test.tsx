/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, waitFor } from '@testing-library/react'

// Mock Three.js core with minimal API to avoid real WebGL dependency
jest.mock('three', () => {
  class Scene {
    background: any
    add() {}
  }
  class Color {
    constructor(_hex: number) {}
  }
  class WebGLRenderer {
    domElement: HTMLCanvasElement
    shadowMap: any
    constructor(_opts: any) {
      this.domElement = document.createElement('canvas')
      this.shadowMap = { enabled: false, type: 0 }
    }
    setSize() {}
    setPixelRatio() {}
    render() {}
    dispose() {}
  }
  class DirectionalLight {
    position = { set: (_x: number, _y: number, _z: number) => {} }
    castShadow = false
    shadow = { mapSize: { width: 0, height: 0 } }
    constructor(_color: number, _intensity: number) {}
  }
  class AmbientLight {
    constructor(_color: number, _intensity: number) {}
  }
  class BoxGeometry { dispose() {} }
  class MeshPhongMaterial { constructor(_opts: any) {} dispose() {} }
  class Mesh {
    constructor(_geo: any, _mat: any) {}
  }
  const PCFSoftShadowMap = 1
  return {
    Scene,
    Color,
    WebGLRenderer,
    DirectionalLight,
    AmbientLight,
    BoxGeometry,
    MeshPhongMaterial,
    Mesh,
    PCFSoftShadowMap,
  }
})

// Provide a basic WebGL context mock
beforeAll(() => {
  // Ensure RAF exists
  // Make RAF run immediately
  ;(global as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(performance.now()), 0) as unknown as number
  }
})

// Mock three helpers with minimal implementations
jest.mock('@/lib/three/controls', () => ({
  createOrbitControls: () => ({ update: () => {}, dispose: () => {} }),
  createPerspectiveCamera: () => ({ aspect: 1, updateProjectionMatrix: () => {} }),
}))

// Mock performance monitor to emit fps >= 30
jest.mock('@/lib/three/performance', () => ({
  PerformanceMonitor: class {
    update() { return { fps: 60, frameTime: 16.6 } }
  }
}))

describe('ThreeCanvas performance callbacks (2.1)', () => {
  it('calls onSceneReady quickly and emits performance updates', async () => {
    const onSceneReady = jest.fn()
    const onPerformanceUpdate = jest.fn()
    const { default: ThreeCanvas } = await import('@/components/three/ThreeCanvas')

    render(<ThreeCanvas onSceneReady={onSceneReady} onPerformanceUpdate={onPerformanceUpdate} />)

    await waitFor(() => {
      expect(onSceneReady).toHaveBeenCalled()
    })

    // performance updates should arrive with fps >= 30 (mocked 60)
    await waitFor(() => {
      expect(onPerformanceUpdate).toHaveBeenCalled()
      const calls = (onPerformanceUpdate as any).mock.calls
      expect(calls[calls.length - 1][0]?.fps).toBeGreaterThanOrEqual(30)
    })
  })
})
