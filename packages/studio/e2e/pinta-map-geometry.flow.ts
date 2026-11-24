import { expect, test } from '@playwright/test'
import type {
  runMapGeometryLegacyProbe,
  runMapGeometryRegionProbe,
} from '../../pinta/scripts/map-geometry-probe'

declare global {
  interface Window {
    runMapGeometryLegacyProbe: typeof runMapGeometryLegacyProbe
    referenceMapGeometryLegacyProbe: typeof runMapGeometryLegacyProbe
    runMapGeometryRegionProbe: typeof runMapGeometryRegionProbe
  }
}
test('canvas da oficina: geometria assinada, recorte e conservação do produtor denso anterior', async ({
  page,
}, info) => {
  test.setTimeout(180000)
  const cdp = await page.context().newCDPSession(page),
    rate = Number(info.project.metadata.cpuSlowdown ?? 1),
    errors: string[] = []
  await cdp.send('Emulation.setCPUThrottlingRate', { rate })
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await page.waitForFunction(
    () => !!window.referenceMapGeometryLegacyProbe && !!window.runMapGeometryRegionProbe,
  )
  const before = await page.evaluate(() => window.referenceMapGeometryLegacyProbe()),
    after = await page.evaluate(() => window.runMapGeometryLegacyProbe()),
    regions = await page.evaluate(() => window.runMapGeometryRegionProbe())
  await info.attach('geometria', {
    body: JSON.stringify({
      before,
      after,
      regions: { ...regions, preview: undefined },
      cpuSlowdown: rate,
    }),
    contentType: 'application/json',
  })
  // Submitted offscreen grid commands are work diagnostics, not visual output.
  const semantic = (probe: typeof after) => ({
    ...probe,
    images: probe.images.map((row) => ({
      ...row,
      image: { ...row.image, gridMoves: undefined },
    })),
  })
  expect(semantic(after)).toEqual(semantic(before))
  expect(after.images).toHaveLength(32)
  expect(after.placements).toHaveLength(24)
  expect(regions.cases).toHaveLength(48)
  for (const item of regions.cases) {
    expect(item.actual, JSON.stringify(item)).toBe(item.expected)
    expect(item.painted).toBeGreaterThan(0)
    expect(item.cacheBytes).toBeLessThanOrEqual(32 * 1024 * 1024)
  }
  expect(regions.world.width).toBe(160)
  expect(regions.world.height).toBe(128)
  expect(regions.world.painted).toBeGreaterThan(0)
  expect(regions.world.logicalCells).toBe(100000000)
  expect(regions.world.allocatedCellBytes).toBe(4096)
  expect(errors).toEqual([])
  if (!regions.preview) throw Error('Prévia ausente')
  await info.attach('canvas-oficina-regioes', {
    body: Buffer.from(regions.preview.split(',')[1]!, 'base64'),
    contentType: 'image/png',
  })
  await cdp.detach()
})
