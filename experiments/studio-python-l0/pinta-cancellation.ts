import assert from 'node:assert/strict'
import type { Browser, Page } from '@playwright/test'
import { deadline } from './checks.ts'

interface CancellationWorker {
  targetId: string
  destructionUpperBoundMs: number | null
  inspectionElapsedMs: number
}

export async function attachPintaCancellationProbe(page: Page, browser: Browser) {
  const cdp = await browser.newBrowserCDPSession()
  const created: string[] = []
  const destroyed = new Map<string, number>()
  const samples: CancellationWorker[] = []
  cdp.on('Target.targetCreated', ({ targetInfo }) => {
    // targetCreated can precede the script URL becoming available. This
    // browser is owned by the probe and has no unrelated pages or workers.
    if (targetInfo.type === 'worker') created.push(targetInfo.targetId)
  })
  cdp.on('Target.targetDestroyed', ({ targetId }) => destroyed.set(targetId, performance.now()))
  await cdp.send('Target.setDiscoverTargets', { discover: true })
  let active: { began: number; cursor: number } | undefined
  await page.exposeFunction('pintaL0CancellationBoundary', async (phase: unknown) => {
    if (phase === 'start') {
      assert.equal(active, undefined)
      // Native event timestamp starts BEFORE this conversion and therefore
      // gives a conservative upper bound from cancellation, without mixing
      // the browser and Node clocks or delaying a subsequent operation.
      active = { began: performance.now(), cursor: created.length }
      return
    }
    assert.equal(phase, 'end')
    assert.ok(active)
    const { began, cursor } = active
    assert.equal(created.length, cursor + 1, 'Exactly one converter must belong to each operation')
    const targetId = created[cursor]
    assert.ok(targetId)
    const sample: CancellationWorker = {
      targetId,
      destructionUpperBoundMs: null,
      inspectionElapsedMs: performance.now() - began,
    }
    samples.push(sample)
    while (!destroyed.has(targetId)) {
      sample.inspectionElapsedMs = performance.now() - began
      assert.ok(performance.now() - began < 1000, 'Converter survived the per-operation deadline')
      await new Promise((done) => setTimeout(done, 10))
    }
    const ended = destroyed.get(targetId)
    assert.notEqual(ended, undefined)
    const destructionUpperBoundMs = (ended ?? Number.NaN) - began
    sample.destructionUpperBoundMs = destructionUpperBoundMs
    assert.ok(destructionUpperBoundMs >= 0 && destructionUpperBoundMs <= 1000)
    const targets = await deadline(
      cdp.send('Target.getTargets'),
      1000,
      'Cancelled converter inspection',
    )
    assert.ok(!targets.targetInfos.some((target) => target.targetId === targetId))
    active = undefined
  })
  return samples
}
