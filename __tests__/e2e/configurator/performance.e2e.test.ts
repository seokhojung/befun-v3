import { test, expect } from '@playwright/test'

test.describe('Configurator performance + stability (2.1)', () => {
  test('measures init time, FPS, console, memory', async ({ page, browserName }) => {
    const errors: string[] = []
    const warnings: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text())
      if (msg.type() === 'warning') warnings.push(msg.text())
    })

    const url = process.env.E2E_URL ?? '/configurator'
    const t0 = Date.now()
    await page.goto(url, { waitUntil: 'domcontentloaded' })

    // 초기화 완료 기준: 첫 canvas 노출
    const canvas = page.locator('canvas')
    await canvas.first().waitFor({ timeout: 15000 })
    const initMs = Date.now() - t0

    // FPS 측정(10초)
    const fps = await page.evaluate(async () => {
      let frames = 0
      const start = performance.now()
      await new Promise<void>(resolve => {
        function step(now: number) {
          frames++
          if (now - start < 10000) requestAnimationFrame(step)
          else resolve()
        }
        requestAnimationFrame(step)
      })
      const sec = (performance.now() - start) / 1000
      return frames / sec
    })
    const frameMs = 1000 / fps

    // 메모리(Chromium에서만 동작)
    const memMB = await page.evaluate(() => {
      const m = (performance as any).memory
      return m ? (m.usedJSHeapSize / 1024 / 1024) : null
    })

    // 단언: 콘솔 무에러/무경고
    expect(errors, 'console errors').toHaveLength(0)
    expect(warnings, 'console warnings').toHaveLength(0)

    // 기준 단언
    expect(initMs, 'init time ≤ 3000ms').toBeLessThanOrEqual(3000)
    expect(fps, 'FPS ≥ 30').toBeGreaterThanOrEqual(30)

    // 선택 단언: 메모리 기준
    if (memMB !== null) {
      expect(memMB, 'JS Heap ≤ 100MB').toBeLessThanOrEqual(100)
    }

    // 결과 로그 출력(JSON)
    // CI 아티팩트/리뷰 참고용
    /* eslint-disable no-console */
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      browser: browserName,
      url,
      initMs,
      fps: Number(fps.toFixed(1)),
      frameMs: Number(frameMs.toFixed(1)),
      memMB: memMB !== null ? Number(memMB.toFixed(1)) : 'N/A',
      errors,
      warnings,
    }, null, 2))
  })
})

