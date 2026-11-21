import { expect, test } from '@playwright/test'
import type { runQueriesRegionsProbe } from '../../pinta/scripts/queries-regions-probe'

declare global {
  interface Window {
    queriesCurrent: typeof runQueriesRegionsProbe
    queriesPrevious: typeof runQueriesRegionsProbe
  }
}
test('consultas: origem regional, janelas limitadas e equivalência densa', async ({
  page,
  context,
}, info) => {
  const cdp = await context.newCDPSession(page),
    cpu = Number(info.project.metadata.cpuSlowdown ?? 1),
    errors: string[] = []
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu })
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await page.waitForFunction(() => !!window.queriesCurrent && !!window.queriesPrevious)
  const before = await page.evaluate(() => window.queriesPrevious()),
    after = await page.evaluate(() => window.queriesCurrent())
  await info.attach('consultas', {
    body: JSON.stringify({ cpu, before, after, public8: false }),
    contentType: 'application/json',
  })
  expect(before.regions).toEqual({
    first: null,
    far: null,
    flat: [-1, -1],
    sources: [0, 0],
    front: false,
    oversizedRefused: false,
  })
  expect(after.regions).toEqual({
    first: 1,
    far: 1,
    flat: [1, 2],
    sources: [0, 1],
    front: true,
    oversizedRefused: true,
  })
  expect(after.legacy).toHaveLength(64)
  expect(after.legacy).toEqual(before.legacy)
  expect(after.window).toEqual({
    bounds: { col: -101, row: -101, cols: 3, rows: 3 },
    tiles: [-1, -1, -1, -1, 0, -1, -1, -1, -1],
    bytes: 27,
  })
  expect(errors).toEqual([])
  await cdp.detach()
})
