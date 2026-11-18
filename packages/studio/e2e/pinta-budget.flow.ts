import { expect, test } from '@playwright/test'
import type { runMapBudgetProbe } from '../../pinta/scripts/map-budget-probe'

declare global {
  interface Window {
    runMapBudgetProbe: typeof runMapBudgetProbe
  }
}

test('256 × 256, 32 camadas e 256 peças: cache limitado e salvar/reabrir sem perda', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000)
  await page.goto('/')
  await page.waitForFunction(() => typeof window.runMapBudgetProbe === 'function')
  const cpuSlowdown = Number(testInfo.project.metadata.cpuSlowdown ?? 1)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuSlowdown })
  const report = await page.evaluate(() => window.runMapBudgetProbe())
  expect(report.cells).toBe(report.maxCells)
  expect(report.reopenedLayers).toBe(32)
  expect(report.cacheBytes).toBeLessThanOrEqual(32 * 1024 * 1024)
  expect(report.allocations).toBeLessThanOrEqual(4)
  expect(report.workingSetBytes).toBeGreaterThan(report.cacheBytes)
  await testInfo.attach('orcamento', {
    body: Buffer.from(
      JSON.stringify(
        { ...report, cpuSlowdown, simulated: cpuSlowdown > 1 || testInfo.project.name === 'touch' },
        null,
        2,
      ),
    ),
    contentType: 'application/json',
  })
  await cdp.detach()
})
