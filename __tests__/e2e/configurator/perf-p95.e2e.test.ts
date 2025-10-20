import { test, expect } from '@playwright/test'

// 계산 유틸: p95
function percentile95(values: number[]) {
  const arr = [...values].sort((a, b) => a - b)
  const idx = Math.ceil(0.95 * arr.length) - 1
  return arr[Math.max(0, Math.min(arr.length - 1, idx))]
}

async function resetPerf(page: any) {
  await page.evaluate(() => {
    performance.clearMeasures('ux:price-update-latency')
    performance.clearMarks('ux:ui-change')
    performance.clearMarks('ux:ui-applied')
  })
}

async function getLatencySamples(page: any) {
  return await page.evaluate(() => {
    // @ts-ignore
    const entries = performance.getEntriesByName('ux:price-update-latency', 'measure') as PerformanceEntry[]
    return entries.map((e: any) => e.duration as number)
  })
}

test.describe('Configurator Realtime UX p95 performance', () => {
  test.setTimeout(180_000)

  test.beforeEach(async ({ page }) => {
    await page.goto('/configurator')
    await expect(page.getByText('책상 컨피규레이터')).toBeVisible()
  })

  test('keyboard path: p95 ≤ 500ms with 50 samples', async ({ page }) => {
    await resetPerf(page)
    const numberInputs = page.locator('input[type="number"]').first()
    await numberInputs.focus()

    // 50 샘플 수집 (디바운스 500ms 고려하여 650ms 대기)
    for (let i = 0; i < 50; i++) {
      await numberInputs.press('ArrowUp')
      await page.waitForTimeout(650)
    }

    const samples = await getLatencySamples(page)
    expect(samples.length).toBeGreaterThanOrEqual(50)
    const p95 = percentile95(samples)
    expect(p95).toBeLessThanOrEqual(500)
  })

  test('number input path: p95 ≤ 500ms with 50 samples', async ({ page }) => {
    await resetPerf(page)
    const numberInputs = page.locator('input[type="number"]').first()
    await expect(numberInputs).toBeVisible()

    // 현재 값을 읽고 1씩 증가
    const base = parseInt(await numberInputs.inputValue()) || 100
    for (let i = 1; i <= 50; i++) {
      await numberInputs.fill(String(base + i))
      await page.waitForTimeout(650)
    }

    const samples = await getLatencySamples(page)
    expect(samples.length).toBeGreaterThanOrEqual(50)
    const p95 = percentile95(samples)
    expect(p95).toBeLessThanOrEqual(500)
  })

  test('slider path: p95 ≤ 500ms with 50 samples', async ({ page }) => {
    await resetPerf(page)
    const slider = page.locator('#width-slider')
    await expect(slider).toBeVisible()
    await slider.focus()

    // Radix Slider는 ArrowRight/ArrowUp으로 1 step 증가
    for (let i = 0; i < 50; i++) {
      await slider.press('ArrowRight')
      await page.waitForTimeout(650)
    }

    const samples = await getLatencySamples(page)
    expect(samples.length).toBeGreaterThanOrEqual(50)
    const p95 = percentile95(samples)
    expect(p95).toBeLessThanOrEqual(500)
  })
})

