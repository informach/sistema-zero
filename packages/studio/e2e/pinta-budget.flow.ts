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
  await cdp.send('HeapProfiler.collectGarbage')
  const heapBefore = await cdp.send('Runtime.getHeapUsage')
  const report = await page.evaluate(() => window.runMapBudgetProbe())
  const heapAfterRun = await cdp.send('Runtime.getHeapUsage')
  await cdp.send('HeapProfiler.collectGarbage')
  const heapAfterGc = await cdp.send('Runtime.getHeapUsage')
  expect(report.cells).toBe(report.maxCells)
  expect(report.reopenedLayers).toBe(32)
  expect(report.cacheBytes).toBeLessThanOrEqual(32 * 1024 * 1024)
  expect(report.allocations).toBeLessThanOrEqual(4)
  expect(report.workingSetBytes).toBeGreaterThan(report.cacheBytes)
  expect(report.initialWrites.chunkPuts).toBe(2048)
  expect(report.initialWrites.chunkIndexBytes).toBe(4 * 1024 * 1024)
  expect(report.initialWrites.headerPuts).toBe(1)
  expect(report.initialWrites.mirrorPuts).toBe(1)
  expect(report.initialWrites.mirrorIndexBytes).toBe(4 * 1024 * 1024)
  expect(report.editWrites.chunkPuts).toBe(1)
  expect(report.editWrites.chunkIndexBytes).toBe(2048)
  expect(report.editWrites.headerPuts).toBe(1)
  expect(report.editWrites.mirrorPuts).toBe(1)
  expect(report.editWrites.mirrorIndexBytes).toBe(4 * 1024 * 1024)
  await testInfo.attach('orcamento', {
    body: Buffer.from(
      JSON.stringify(
        {
          ...report,
          cpuSlowdown,
          simulated: cpuSlowdown > 1 || testInfo.project.name === 'touch',
          heapBefore,
          heapAfterRun,
          heapAfterGc,
          memoryNote: 'V8 snapshots, not peak memory; canvas and index buffers reported separately',
          timingNote:
            'Writes include the IO observer; local elapsed times are not a hardware certification',
        },
        null,
        2,
      ),
    ),
    contentType: 'application/json',
  })
  await cdp.detach()
})
