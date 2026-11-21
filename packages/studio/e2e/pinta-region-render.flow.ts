import { expect, test } from '@playwright/test'
import type { runRegionRenderProbe } from '../../pinta/scripts/region-render-probe'

declare global {
  interface Window {
    runRegionRenderProbe: typeof runRegionRenderProbe
  }
}

test('chunks assinados: pixels, animações, pressão e recorte do mundo esparso no canvas real', async ({
  page,
}, info) => {
  test.setTimeout(180000)
  await page.goto('/')
  await page.waitForFunction(() => !!window.runRegionRenderProbe)
  const cdp = await page.context().newCDPSession(page),
    rate = Number(info.project.metadata.cpuSlowdown ?? 1)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate })
  const result = await page.evaluate(() => window.runRegionRenderProbe())
  await info.attach('canvas-regioes', {
    body: Buffer.from(result.preview.split(',')[1]!, 'base64'),
    contentType: 'image/png',
  })
  await info.attach('comparacao-regioes', {
    body: JSON.stringify({
      ...result,
      preview: undefined,
      cpuSlowdown: rate,
      physicalPhones: false,
      browserVersion: page.context().browser()?.version(),
    }),
    contentType: 'application/json',
  })
  expect(result.cases).toHaveLength(32)
  for (const entry of result.cases) {
    expect(
      entry.actual,
      JSON.stringify({
        col: entry.col,
        row: entry.row,
        scale: entry.scale,
        time: entry.time,
        pressure: entry.pressure,
        difference: entry.difference,
      }),
    ).toBe(entry.reference)
    expect(entry.cacheBytes).toBeLessThanOrEqual(32 * 1024 * 1024)
    if (entry.pressure) {
      expect(entry.rebuilds).toBe(0)
      expect(entry.cacheBytes).toBe(0)
    }
  }
  expect(result.sparse.logicalCells).toBe(100000000)
  expect(result.sparse.indexBytes).toBe(4096)
  expect(result.sparse.wholeChunks).toEqual([
    { col: -2, row: -2 },
    { col: 281, row: 281 },
  ])
  expect(result.sparse.negativeChunks).toEqual([{ col: -2, row: -2 }])
  await cdp.detach()
})
