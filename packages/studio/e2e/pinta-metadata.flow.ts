import { expect, test } from '@playwright/test'
import type { runMetadataRegionsProbe } from '../../pinta/scripts/metadata-regions-probe'

declare global {
  interface Window {
    metadataCurrent: typeof runMetadataRegionsProbe
    metadataPrevious: typeof runMetadataRegionsProbe
  }
}

test('metadados: recusa global antes de histórico, host, autosave e decodificação', async ({
  page,
  context,
}, info) => {
  const cdp = await context.newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', {
    rate: Number(info.project.metadata.cpuSlowdown ?? 1),
  })
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await page.waitForFunction(() => !!window.metadataCurrent && !!window.metadataPrevious)
  const before = await page.evaluate(() => window.metadataPrevious())
  const after = await page.evaluate(() => window.metadataCurrent())
  await info.attach('admissao', {
    body: JSON.stringify({ before, after }),
    contentType: 'application/json',
  })
  expect(before.rejected.accepted).toBe(true)
  expect(before.linked.accepted).toBe(true)
  expect(before.writes).toBe(2)
  expect(before.setRefused).toBe(false)
  expect(before.decodes).toBeGreaterThan(0)
  expect(after.rejected).toEqual({
    accepted: false,
    unchanged: true,
    undo: false,
    dirty: false,
    hostCalls: 0,
  })
  expect(after.linked).toEqual({ accepted: false, unchanged: true, undo: false })
  expect(after.writes).toBe(0)
  expect(after.setRefused).toBe(true)
  expect(after.decodes).toBe(0)
  expect(after.positive).toEqual({
    goodAccepted: true,
    undoToSource: true,
    savedName: 'outra vila',
  })
  expect(after.positive).toEqual(before.positive)
  expect(after.public8).toBe(false)
  expect(errors).toEqual([])
  await cdp.detach()
})
