import { expect, test } from '@playwright/test'
import type { runMapRenderProbe } from '../../pinta/scripts/map-render-probe'

declare global {
  interface Window {
    runMapRenderProbe: typeof runMapRenderProbe
    referenceMapRenderProbe: typeof runMapRenderProbe
  }
}

test('mapa sob pressão conserva todos os pixels do renderer publicado', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000)
  await page.goto('/')
  await page.waitForFunction(() => !!window.runMapRenderProbe && !!window.referenceMapRenderProbe)
  const cdp = await page.context().newCDPSession(page)
  const rate = Number(testInfo.project.metadata.cpuSlowdown ?? 1)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate })
  const reference = await page.evaluate(() => window.referenceMapRenderProbe())
  const current = await page.evaluate(() => window.runMapRenderProbe())
  expect(current.cases).toHaveLength(24)
  expect(current.cases.map(({ sha256 }) => sha256)).toEqual(
    reference.cases.map(({ sha256 }) => sha256),
  )
  for (const entry of current.cases) {
    expect(entry.cacheBytes).toBeLessThanOrEqual(32 * 1024 * 1024)
    if (
      entry.pressureBytes > 32 * 1024 * 1024 &&
      (!entry.transformed || Number.isInteger(entry.scale))
    ) {
      expect(entry.rebuilds).toBe(0)
      expect(entry.cacheBytes).toBe(0)
    }
  }
  expect(new Set(current.cases.map((entry) => entry.sha256)).size).toBeGreaterThan(8)
  for (const [name, data] of [
    ['anterior', reference],
    ['atual', current],
  ] as const) {
    await testInfo.attach(`renderer-${name}`, {
      body: Buffer.from(data.preview.split(',')[1]!, 'base64'),
      contentType: 'image/png',
    })
  }
  await testInfo.attach('comparacao-render', {
    body: Buffer.from(
      JSON.stringify(
        {
          reference: '0ebb89a63c4dc0d2e078023dbcaa3cb6a42a336d',
          cpuSlowdown: rate,
          simulated: rate > 1 || testInfo.project.name === 'touch',
          before: reference.cases,
          after: current.cases,
        },
        null,
        2,
      ),
    ),
    contentType: 'application/json',
  })
  await cdp.detach()
})
