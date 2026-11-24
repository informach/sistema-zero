import { expect, test } from '@playwright/test'
import type { runLegacyBackupProbe } from '../../pinta/scripts/backup-legacy-probe'
import type { runRegionBackupProbe } from '../../pinta/scripts/backup-regions-probe'

declare global {
  interface Window {
    backupLegacyCurrent: typeof runLegacyBackupProbe
    backupLegacyPrevious: typeof runLegacyBackupProbe
    backupRegionCurrent: typeof runRegionBackupProbe
  }
}

test('backup interno: JSON exato, restauro regional integral e bytes legados conservados', async ({
  page,
  context,
}, info) => {
  const cdp = await context.newCDPSession(page),
    cpu = Number(info.project.metadata.cpuSlowdown ?? 1),
    errors: string[] = []
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu })
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await page.waitForFunction(
    () =>
      !!window.backupLegacyCurrent && !!window.backupLegacyPrevious && !!window.backupRegionCurrent,
  )
  const before = await page.evaluate(() => window.backupLegacyPrevious()),
    after = await page.evaluate(() => window.backupLegacyCurrent()),
    regions = await page.evaluate(() => window.backupRegionCurrent())
  await info.attach('backup', {
    body: JSON.stringify({ cpu, before, after, regions }),
    contentType: 'application/json',
  })
  expect(after).toEqual(before)
  expect(after.map((item) => item.version)).toEqual([1, 1, 2, 3, 4, 5, 6, 7])
  expect(after.every((item) => item.warnings.length === 0)).toBe(true)
  expect(regions.sparse).toMatchObject({
    roundTrip: true,
    warnings: [],
    logicalCells: 100_000_000,
    bitmapRLE: true,
  })
  expect(regions.sparse.bytes).toBe(regions.sparse.exactBytes)
  expect(regions.set.roundTrip).toBe(true)
  expect(regions.full.roundTrip).toBe(true)
  expect(regions.full.bytes).toBeLessThan(6 * 1024 * 1024)
  expect(regions.oldReaderRejected).toBe(true)
  expect(regions.futureBitmapRejected).toBe(true)
  expect(regions.malformedRejected).toBe(true)
  expect(regions.escapedRejected).toBe(true)
  expect(regions.expansion).toEqual({ refused: true, decodes: 0 })
  expect(regions.sizes).toHaveLength(64)
  expect(regions.public8).toBe(false)
  expect(errors).toEqual([])
  await cdp.detach()
})
