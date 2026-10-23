/** Node side of profile-workshop.ts; receives the exact documents and CPU results. */
import { readFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const requests = JSON.parse(readFileSync(0, 'utf8'))
const browser = await chromium.launch()
try {
  for (const request of requests) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    try {
      console.error(`${request.result.variant}, ${request.result.parts} parts: browser frames`)
      const page = await context.newPage()
      await page.goto(request.url)
      await page.locator('input[name="molda-backup"]').setInputFiles({
        name: 'perfil.molda.json',
        mimeType: 'application/json',
        buffer: Buffer.from(request.native),
      })
      await page.getByRole('button', { name: `Modelo ${request.name}`, exact: true }).click()
      await page.getByRole('button', { name: 'Mover', exact: true }).waitFor()
      await page.evaluate(() => document.fonts.ready)
      const canvas = page.locator(`canvas[aria-label="${request.viewportLabel}"]`)
      const box = await canvas.boundingBox()
      if (!box) throw new Error('Missing canvas')
      const renderer = await canvas.evaluate((element) => {
        const gl = element.getContext('webgl2')
        const extension = gl?.getExtension('WEBGL_debug_renderer_info')
        return extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : 'unavailable'
      })
      const x = box.x + box.width * 0.1,
        y = box.y + box.height * 0.3
      await page.mouse.move(x, y)
      await page.mouse.down({ button: 'right' })
      await page.mouse.move(x + 80, y + 30, { steps: 30 })
      await page.mouse.up({ button: 'right' })
      const before = await canvas.screenshot()
      await page.evaluate(() => {
        const trace = { values: [], last: 0, id: 0 }
        globalThis.moldaFrameTrace = trace
        const tick = (now) => {
          if (trace.last) trace.values.push(now - trace.last)
          trace.last = now
          trace.id = requestAnimationFrame(tick)
        }
        trace.id = requestAnimationFrame(tick)
      })
      for (let i = 0; i < 4; i++) {
        await page.mouse.move(x, y)
        await page.mouse.down({ button: 'right' })
        await page.mouse.move(x + 240, y + (i % 2 ? -50 : 50), { steps: 80 })
        await page.mouse.up({ button: 'right' })
      }
      const frames = await page.evaluate(() => {
        cancelAnimationFrame(globalThis.moldaFrameTrace.id)
        return globalThis.moldaFrameTrace.values
      })
      if (frames.length < 30) throw new Error('Not enough rendered frames')
      if (before.equals(await canvas.screenshot()))
        throw new Error('Camera did not change the view')
      frames.sort((a, b) => a - b)
      console.log(
        JSON.stringify({
          ...request.result,
          browser: browser.version(),
          renderer,
          frameIntervalMs: {
            samples: frames.length,
            p50: +frames[Math.ceil(frames.length * 0.5) - 1].toFixed(3),
            p95: +frames[Math.ceil(frames.length * 0.95) - 1].toFixed(3),
          },
        }),
      )
    } finally {
      await context.close()
    }
  }
} finally {
  await browser.close()
}
