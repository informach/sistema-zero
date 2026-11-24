import { expect, test } from '@playwright/test'
import type { runMemoryRegionsProbe } from '../../pinta/scripts/memory-regions-probe'

declare global {
  interface Window {
    memoryCurrent: typeof runMemoryRegionsProbe
    memoryPrevious: typeof runMemoryRegionsProbe
  }
}

test('núcleo regional: memória finita, buffers compartilhados e orçamento real do histórico', async ({
  page,
}, info) => {
  test.setTimeout(120000)
  const cdp = await page.context().newCDPSession(page),
    cpu = Number(info.project.metadata.cpuSlowdown ?? 1)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu })
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/')
  await page.waitForFunction(() => !!window.memoryCurrent && !!window.memoryPrevious)
  const before = await page.evaluate(() => window.memoryPrevious()),
    after = await page.evaluate(() => window.memoryCurrent())
  await info.attach('memoria', {
    body: JSON.stringify({ cpu, before, after, native8Public: false }),
    contentType: 'application/json',
  })
  expect(before.sparse.finite).toBe(false)
  expect(before.full.finite).toBe(false)
  expect(before.full.parts).toBe(32)
  expect(before.sparse.history.undone).toBe(10)
  expect(after.sparse).toEqual({
    finite: true,
    parts: 2,
    payloadBytes: 4096,
    logicalCells: 100000000,
    roundTrip: true,
    history: { undone: 5, redone: 5, returnedToBase: false, returnedToNewest: true },
  })
  expect(after.full).toEqual({
    finite: true,
    parts: 2048,
    payloadBytes: 4194304,
    history: { undone: 50, redone: 50, returnedToBase: true, returnedToNewest: true },
  })
  expect(errors).toEqual([])
  await cdp.detach()
})
