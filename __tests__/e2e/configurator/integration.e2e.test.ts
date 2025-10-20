import { test, expect } from '@playwright/test'

test.describe('Configurator Realtime UX', () => {
  test('keyboard nudge updates width with 1cm snap and logs latency', async ({ page }) => {
    await page.goto('/configurator')

    await expect(page.getByText('책상 컨피규레이터')).toBeVisible()

    // focus first number input (width)
    const numberInputs = page.locator('input[type="number"]')
    await expect(numberInputs.first()).toBeVisible()
    const beforeText = await page.getByText('현재 설정').locator('..').locator('div').nth(1).textContent()

    await numberInputs.first().focus()
    // ArrowUp for +1cm
    await numberInputs.first().press('ArrowUp')

    // Wait for debounce (500ms) and UI apply
    await page.waitForTimeout(700)

    const afterText = await page.getByText('현재 설정').locator('..').locator('div').nth(1).textContent()
    expect(beforeText).not.toEqual(afterText)

    // Check perf entries for ux:price-update-latency
    const perfCount = await page.evaluate(() => {
      // @ts-ignore
      const entries = performance.getEntriesByName('ux:price-update-latency', 'measure')
      return entries.length
    })
    expect(perfCount).toBeGreaterThan(0)
  })
})

