/**
 * Infinite Loop Fix Verification Test
 * Story 1.2C: React Infinite Loop Debugging
 *
 * Verifies BLOCKER-002 fix - ConfiguratorUI infinite loop resolved
 */

import { test, expect } from '@playwright/test'

test.describe('ConfiguratorUI - Infinite Loop Fix (BLOCKER-002)', () => {
  test('should not trigger infinite loop on /configurator page', async ({ page }) => {
    // Collect console errors
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // Collect page errors
    const pageErrors: Error[] = []
    page.on('pageerror', (error) => {
      pageErrors.push(error)
    })

    // Navigate to configurator
    await page.goto('/configurator', { waitUntil: 'networkidle' })

    // Wait for initial render (5 seconds should be enough if no infinite loop)
    await page.waitForTimeout(5000)

    // Verify canvas is rendered (proves component mounted successfully)
    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible({ timeout: 10000 })

    // Check for infinite loop error pattern
    const hasInfiniteLoopError = consoleErrors.some(
      (error) =>
        error.includes('Maximum update depth exceeded') ||
        error.includes('Too many re-renders')
    )

    const hasPageError = pageErrors.some(
      (error) =>
        error.message.includes('Maximum update depth exceeded') ||
        error.message.includes('Too many re-renders')
    )

    // Assert no infinite loop errors
    expect(hasInfiniteLoopError).toBe(false)
    expect(hasPageError).toBe(false)

    // Verify page is interactive (not frozen)
    const controlPanel = page.locator('text=/책상 컨피규레이터/i')
    await expect(controlPanel).toBeVisible()

    // Verify material selection is interactive
    const materialButtons = page.locator('button').filter({ hasText: /원목|MDF|스틸/ })
    const firstButton = materialButtons.first()
    await expect(firstButton).toBeVisible()

    // Click material button to trigger settings change
    await firstButton.click()

    // Wait for any potential render cycle
    await page.waitForTimeout(2000)

    // Verify no new errors after interaction
    const newErrors = consoleErrors.filter(
      (error) =>
        error.includes('Maximum update depth exceeded') ||
        error.includes('Too many re-renders')
    )
    expect(newErrors.length).toBe(0)

    // Log all collected errors for debugging
    if (consoleErrors.length > 0) {
      console.log('Console errors (non-infinite-loop):', consoleErrors)
    }
    if (pageErrors.length > 0) {
      console.log('Page errors:', pageErrors.map((e) => e.message))
    }
  })

  test('should handle dimension changes without infinite loop', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('/configurator', { waitUntil: 'networkidle' })

    // Wait for canvas
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 })

    // Find and interact with dimension sliders (if present)
    const widthSlider = page.locator('input[type="range"]').first()
    if (await widthSlider.isVisible()) {
      // Change dimension value
      await widthSlider.fill('150')
      await page.waitForTimeout(2000)

      // Verify no infinite loop
      const hasError = consoleErrors.some(
        (error) =>
          error.includes('Maximum update depth exceeded') ||
          error.includes('Too many re-renders')
      )
      expect(hasError).toBe(false)
    }
  })

  test('should not cause infinite re-renders when calculating price', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('/configurator', { waitUntil: 'networkidle' })

    // Wait for price display to appear
    const priceDisplay = page.locator('text=/₩|원/i').first()
    await expect(priceDisplay).toBeVisible({ timeout: 10000 })

    // Wait to ensure price calculation completes
    await page.waitForTimeout(3000)

    // Verify no infinite loop during price calculation
    const hasError = consoleErrors.some(
      (error) =>
        error.includes('Maximum update depth exceeded') ||
        error.includes('Too many re-renders')
    )
    expect(hasError).toBe(false)
  })
})
