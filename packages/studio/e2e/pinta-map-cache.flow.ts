import { expect, test } from '@playwright/test'
import type { Probe } from './pinta-map-grid.flow'

declare global {
  interface Window {
    mapGridCurrent: Probe
    mapGridReference: Probe
  }
}
test('o cache compartilha composições idênticas sem mudar os pixels do renderer anterior', async ({
  page,
}, info) => {
  test.setTimeout(180000)
  const cdp = await page.context().newCDPSession(page),
    rate = Number(info.project.metadata.cpuSlowdown ?? 1),
    errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await cdp.send('Emulation.setCPUThrottlingRate', { rate })
  await page.goto('/')
  await page.waitForFunction(() => !!window.mapGridCurrent && !!window.mapGridReference)
  const before = await page.evaluate(async () => ({
      legacy: await window.mapGridReference.runMapGeometryLegacyProbe(),
      regions: await window.mapGridReference.runMapGeometryRegionProbe(),
      edges: await window.mapGridReference.runGridEdgeProbe(),
    })),
    after = await page.evaluate(async () => ({
      legacy: await window.mapGridCurrent.runMapGeometryLegacyProbe(),
      regions: await window.mapGridCurrent.runMapGeometryRegionProbe(),
      edges: await window.mapGridCurrent.runGridEdgeProbe(),
    }))
  const images = (value: typeof before.legacy) => ({
    ...value,
    images: value.images.map((row) => ({ ...row, image: { ...row.image, cacheBytes: undefined } })),
  })
  expect(images(after.legacy)).toEqual(images(before.legacy))
  expect(after.regions.cases.map(({ cacheBytes, ...row }) => row)).toEqual(
    before.regions.cases.map(({ cacheBytes, ...row }) => row),
  )
  expect({ ...after.regions.world, cacheBytes: undefined }).toEqual({
    ...before.regions.world,
    cacheBytes: undefined,
  })
  expect(after.edges).toEqual(before.edges)
  for (const row of after.legacy.images)
    expect(row.image.cacheBytes).toBeLessThanOrEqual(32 * 1024 * 1024)
  for (const row of after.regions.cases)
    expect(row.cacheBytes).toBeLessThanOrEqual(32 * 1024 * 1024)
  const dense = await page.evaluate(async () => {
    const results = []
    for (const kind of ['dense', 'dense-unique'] as const)
      for (const api of [window.mapGridReference, window.mapGridCurrent]) {
        const metadata = api.prepareGridBench(kind)
        api.sampleGridFrames(1)
        const cold = { pixels: await api.gridPixels(), cache: api.gridCacheStatus() }
        api.sampleGridFrames(1)
        const warm = { pixels: await api.gridPixels(), cache: api.gridCacheStatus() }
        results.push({ metadata, cold, warm })
        api.disposeGridBench()
      }
    return results
  })
  expect(dense).toHaveLength(4)
  for (const offset of [0, 2]) {
    expect(dense[offset + 1]!.metadata).toEqual(dense[offset]!.metadata)
    expect(dense[offset + 1]!.cold.pixels).toEqual(dense[offset]!.cold.pixels)
    expect(dense[offset + 1]!.warm.pixels).toEqual(dense[offset]!.warm.pixels)
    expect(dense[offset + 1]!.warm.cache.bytes).toBeLessThanOrEqual(32 * 1024 * 1024)
  }
  expect(dense[1]!.cold.cache.rebuilds).toBeLessThan(dense[0]!.cold.cache.rebuilds)
  expect(dense[1]!.warm.cache.rebuilds).toBe(dense[1]!.cold.cache.rebuilds)
  expect(dense[3]!.warm.cache.rebuilds).toBe(dense[2]!.warm.cache.rebuilds)
  expect(errors).toEqual([])
  await info.attach('cache', {
    body: JSON.stringify({ cpuSlowdown: rate, before, after, dense }),
    contentType: 'application/json',
  })
  if (!after.regions.preview) throw Error('Imagem ausente')
  await info.attach('canvas', {
    body: Buffer.from(after.regions.preview.split(',')[1]!, 'base64'),
    contentType: 'image/png',
  })
  await cdp.detach()
})
