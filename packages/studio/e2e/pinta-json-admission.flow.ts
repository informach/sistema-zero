import { expect, test } from '@playwright/test'
import type { runJsonAdmissionProbe } from '../../pinta/scripts/json-admission-probe'

declare global {
  interface Window {
    jsonAdmissionCurrent: typeof runJsonAdmissionProbe
    jsonAdmissionPrevious: typeof runJsonAdmissionProbe
  }
}

test('JSON: admissão antes de host/histórico/autosave e reuso dos chunks imutáveis', async ({
  page,
  context,
}, info) => {
  const cdp = await context.newCDPSession(page),
    cpu = Number(info.project.metadata.cpuSlowdown ?? 1),
    errors: string[] = []
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu })
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await page.waitForFunction(() => !!window.jsonAdmissionCurrent && !!window.jsonAdmissionPrevious)
  const before = await page.evaluate(() => window.jsonAdmissionPrevious(false)),
    after = await page.evaluate(() => window.jsonAdmissionCurrent(true))
  await info.attach('json-admission', {
    body: JSON.stringify({ cpu, before, after }),
    contentType: 'application/json',
  })
  for (const key of ['json', 'linked', 'buffers', 'timestamp'] as const) {
    expect(before[key].accepted).toBe(true)
    expect(before[key].writes).toBe(1)
    expect(after[key]).toEqual({
      accepted: false,
      unchanged: true,
      undo: false,
      dirty: false,
      hostCalls: 0,
      writes: 0,
    })
  }
  expect(after.positive).toEqual({ good: true, undoToSource: true, writes: 1, restorable: true })
  expect(after.positive).toEqual(before.positive)
  expect(before.kernel).toBeNull()
  expect(after.kernel?.changedChunkEncodes).toBe(1)
  expect(after.kernel?.sizes).toHaveLength(64)
  expect(after.public8).toBe(false)
  expect(errors).toEqual([])
  await cdp.detach()
})
