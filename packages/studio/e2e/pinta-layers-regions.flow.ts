import { expect, test } from '@playwright/test'
import type { runLayerRegionsProbe } from '../../pinta/scripts/layers-regions-probe'

declare global {
  interface Window {
    layersCurrent: typeof runLayerRegionsProbe
    layersPrevious: typeof runLayerRegionsProbe
  }
}

test('camadas: documento regional sem perda e bytes densos conservados', async ({ page }, info) => {
  const cpu = Number(info.project.metadata.cpuSlowdown ?? 1),
    cdp = await page.context().newCDPSession(page),
    errors: string[] = []
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu })
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/')
  await page.waitForFunction(() => !!window.layersCurrent && !!window.layersPrevious)
  const before = await page.evaluate(() => window.layersPrevious()),
    after = await page.evaluate(() => window.layersCurrent())
  await info.attach('camadas', {
    body: JSON.stringify({ cpu, before, after, native8Public: false }),
    contentType: 'application/json',
  })
  expect(before.regions.metadataPreserved).toBe(false)
  expect(before.regions.invalidRefused).toBe(false)
  expect(before.regions.emptyLayer).toBe(false)
  expect(before.regions.layers).toBe(1)
  expect(after.regions).toEqual({
    metadataPreserved: true,
    noOpShared: true,
    invalidRefused: true,
    cellStorageShared: true,
    emptyLayer: true,
    explicitBinding: true,
    layers: 32,
    limitRefused: true,
    roundTrip: true,
  })
  expect(after.legacy).toHaveLength(13)
  expect(after.legacy).toEqual(before.legacy)
  expect(errors).toEqual([])
  await cdp.detach()
})
