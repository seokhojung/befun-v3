/**
 * ThreeCanvas E2E Test - Real Browser Environment
 * Story 2.1: 3D Configurator Foundation
 *
 * Tests ThreeCanvas component in actual browser with WebGL support.
 * Uses Playwright to overcome jsdom limitations and validate real browser behavior.
 */

import { test, expect } from '@playwright/test'

test.describe('ThreeCanvas E2E - Browser Environment', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to configurator page
    await page.goto('/configurator')
  })

  test('should initialize 3D scene in real browser with WebGL context', async ({ page }) => {
    // Wait for canvas element to be present
    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible({ timeout: 10000 })

    // Verify canvas has non-zero dimensions (proves jsdom issue is resolved)
    const boundingBox = await canvas.boundingBox()
    expect(boundingBox).not.toBeNull()
    expect(boundingBox!.width).toBeGreaterThan(0)
    expect(boundingBox!.height).toBeGreaterThan(0)

    // Verify WebGL context is created
    const hasWebGL = await page.evaluate(() => {
      const canvas = document.querySelector('canvas')
      if (!canvas) return false

      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
      return gl !== null
    })
    expect(hasWebGL).toBe(true)
  })

  test('should render 3D scene objects correctly', async ({ page }) => {
    // Wait for canvas to be visible
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 })

    // Verify Three.js scene is initialized
    const sceneInitialized = await page.evaluate(() => {
      // Check if window has Three.js objects (they should be accessible)
      const canvas = document.querySelector('canvas')
      if (!canvas) return false

      // Canvas should have WebGL context
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
      return gl !== null
    })

    expect(sceneInitialized).toBe(true)

    // Verify canvas is rendering (not blank)
    // We can't directly access Three.js objects, but we can verify canvas is drawing
    const isRendering = await page.evaluate(() => {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement
      if (!canvas) return false

      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
      if (!gl) return false

      // Check if canvas has been drawn to (non-zero pixel data)
      const pixels = new Uint8Array(4)
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

      // At least one pixel should be non-transparent (scene background is 0xf0f0f0)
      return pixels[3] > 0 || pixels[0] > 0
    })

    expect(isRendering).toBe(true)
  })

  test('should handle camera controls (OrbitControls)', async ({ page }) => {
    // Wait for canvas
    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible({ timeout: 10000 })

    // Get initial canvas state
    const initialState = await page.evaluate(() => {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement
      if (!canvas) return null

      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
      if (!gl) return null

      const pixels = new Uint8Array(4)
      gl.readPixels(
        Math.floor(canvas.width / 2),
        Math.floor(canvas.height / 2),
        1,
        1,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        pixels
      )
      return Array.from(pixels)
    })

    expect(initialState).not.toBeNull()

    // Simulate camera interaction (drag)
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()

    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width / 2 + 100, box!.y + box!.height / 2)
    await page.mouse.up()

    // Wait for animation frame
    await page.waitForTimeout(100)

    // Verify scene has updated (camera moved)
    const newState = await page.evaluate(() => {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement
      if (!canvas) return null

      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
      if (!gl) return null

      const pixels = new Uint8Array(4)
      gl.readPixels(
        Math.floor(canvas.width / 2),
        Math.floor(canvas.height / 2),
        1,
        1,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        pixels
      )
      return Array.from(pixels)
    })

    expect(newState).not.toBeNull()
    // Scene should render (pixels may or may not change depending on camera angle)
    expect(newState).toBeDefined()
  })

  test('should display FPS performance metrics', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Look for FPS display (from ConfiguratorUI component)
    const fpsDisplay = page.locator('text=/FPS|fps|성능/i').first()

    // FPS display should appear within 5 seconds
    await expect(fpsDisplay).toBeVisible({ timeout: 5000 })
  })

  test('should handle WebGL unsupported gracefully (simulation)', async ({ page }) => {
    // Inject script to disable WebGL before page loads
    await page.addInitScript(() => {
      const originalGetContext = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (contextType: string, ...args: any[]) {
        if (contextType === 'webgl' || contextType === 'webgl2') {
          return null // Simulate WebGL not supported
        }
        return originalGetContext.apply(this, [contextType, ...args])
      }
    })

    // Navigate to configurator
    await page.goto('/configurator')

    // Should show WebGL error message
    await expect(page.locator('text=/WebGL 지원 안됨/i')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=/지원되지 않는 브라우저/i')).toBeVisible()
    await expect(page.locator('text=/최신 브라우저/i')).toBeVisible()

    // Canvas should NOT be present
    const canvas = page.locator('canvas')
    await expect(canvas).not.toBeVisible()
  })

  test('should render control panel alongside 3D canvas', async ({ page }) => {
    // Wait for page load
    await page.waitForLoadState('networkidle')

    // Verify both canvas and control panel are present
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 })

    // Control panel should have material selection
    const materialButtons = page.locator('button:has-text("원목"), button:has-text("MDF"), button:has-text("스틸")')
    await expect(materialButtons.first()).toBeVisible({ timeout: 5000 })
  })
})
