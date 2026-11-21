import { expect, test } from '@playwright/test'
import type {
  runMapGeometryLegacyProbe,
  runMapGeometryRegionProbe,
} from '../../pinta/scripts/map-geometry-probe'
import type { runGridEdgeProbe } from '../../pinta/scripts/map-grid-edge-probe'

export type Probe = {
  runGridEdgeProbe: typeof runGridEdgeProbe
  runMapGeometryLegacyProbe: typeof runMapGeometryLegacyProbe
  runMapGeometryRegionProbe: typeof runMapGeometryRegionProbe
} & typeof import('../../pinta/scripts/map-grid-probe')
declare global {
  interface Window {
    mapGridCurrent: Probe
    mapGridReference: Probe
  }
}
test('a grade recortada conserva pixels da fonte anterior, inclusive nas bordas fracionárias', async ({
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
    images: value.images.map((row) => ({ ...row, image: { ...row.image, gridMoves: undefined } })),
  })
  expect(images(after.legacy)).toEqual(images(before.legacy))
  expect(after.regions.cases).toEqual(before.regions.cases)
  expect({ ...after.regions.world, gridMoves: undefined }).toEqual({
    ...before.regions.world,
    gridMoves: undefined,
  })
  expect(after.edges.map(({ moves, ...row }) => row)).toEqual(
    before.edges.map(({ moves, ...row }) => row),
  )
  expect(after.edges).toHaveLength(120)
  for (const row of after.edges)
    expect(row.moves).toBeLessThanOrEqual(
      Math.ceil((row.width + 2) / row.cellPx) + Math.ceil((row.height + 2) / row.cellPx) + 2,
    )
  expect(after.regions.world.gridMoves).toBeLessThanOrEqual(22)
  expect(before.regions.world.gridMoves).toBe(20002)
  expect(errors).toEqual([])
  await info.attach('grade', {
    body: JSON.stringify({ cpuSlowdown: rate, before, after }),
    contentType: 'application/json',
  })
  if (!after.regions.preview) throw Error('Imagem ausente')
  await info.attach('canvas', {
    body: Buffer.from(after.regions.preview.split(',')[1]!, 'base64'),
    contentType: 'image/png',
  })
  await cdp.detach()
})
