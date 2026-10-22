import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { type CDPSession, expect, test } from '@playwright/test'
import type {} from '../../../experiments/studio-python-runtime/providerHost'

async function nativeMemory(cdp: CDPSession) {
  const { processInfo } = await cdp.send('SystemInfo.getProcessInfo')
  const ids = processInfo.map((item) => item.id)
  expect(ids.length).toBeGreaterThan(0)
  expect(ids.every((id) => Number.isSafeInteger(id) && id > 0)).toBe(true)
  const { stdout } = await promisify(execFile)(
    // Same script and 10 s budget; hosts whose Windows PowerShell 5.1 starts too slowly can
    // point this at PowerShell 7 (pwsh.exe) without changing what is measured.
    process.env.SZ_NATIVE_POWERSHELL ?? 'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-File',
      fileURLToPath(
        new URL('../../../experiments/studio-python-l0/native-memory.ps1', import.meta.url),
      ),
      '-ProcessIds',
      ids.join(','),
    ],
    { windowsHide: true, timeout: 10_000 },
  )
  const rows: { id: number; exited: boolean; privateBytes?: number; workingSetBytes?: number }[] =
    JSON.parse(stdout)
  expect(rows).toHaveLength(ids.length)
  let privateBytes = 0
  let workingSetBytes = 0
  for (const row of rows) {
    expect(ids.includes(row.id)).toBe(true)
    if (row.exited) continue
    expect(Number.isSafeInteger(row.privateBytes) && row.privateBytes! >= 0).toBe(true)
    expect(Number.isSafeInteger(row.workingSetBytes) && row.workingSetBytes! >= 0).toBe(true)
    privateBytes += row.privateBytes!
    workingSetBytes += row.workingSetBytes!
  }
  expect(privateBytes).toBeGreaterThan(0)
  // Preserve process attribution from this owned browser's CDP session. Totals and
  // acceptance budgets remain unchanged; renderer/GPU/browser growth can now be distinguished.
  const processes = rows.map((row) => ({
    ...row,
    type: processInfo.find((process) => process.id === row.id)?.type ?? 'unknown',
  }))
  return { privateBytes, workingSetBytes, processes }
}

test('30 provider cycles release native workers and stabilize retained process memory', async ({
  page,
  browser,
  request,
}, testInfo) => {
  test.skip(
    process.platform !== 'win32',
    'Native collector is Windows-specific; no substituted JS-heap metric',
  )
  test.setTimeout(240_000)
  const cdp = await browser.newBrowserCDPSession()
  const samples: Record<string, unknown>[] = []
  const evidence: Record<string, unknown> = {
    browser: browser.version(),
    createdAt: new Date().toISOString(),
    samples,
    scope:
      'Python Pro console provider via distribution service; no Turtle/editor/parser/video; sampled native process memory, not instantaneous peak',
    forcedGc: false,
    distribution: await (await request.get('/distribution')).json(),
  }
  let failure: unknown
  try {
    await page.goto('/provider')
    await page.waitForFunction(() => !!globalThis.providerProbe)
    const baseline = await nativeMemory(cdp)
    evidence.baseline = baseline
    const active: number[] = []
    const idle: number[] = []
    const prepareTimes: number[] = []
    const stopTimes: number[] = []
    for (let cycle = 0; cycle < 30; cycle++) {
      const sample: Record<string, unknown> = { cycle }
      samples.push(sample)
      const prepareMs = await page.evaluate(async () => {
        const begin = performance.now()
        await globalThis.providerProbe.prepare('cycle', 'portable')
        return performance.now() - begin
      })
      sample.prepareMs = prepareMs
      prepareTimes.push(prepareMs)
      expect(await page.evaluate(() => globalThis.providerProbe.read('cycle').status)).toBe('ready')
      await page.evaluate(() => globalThis.providerProbe.run('cycle'))
      await page.waitForFunction(() =>
        ['completed', 'failed'].includes(globalThis.providerProbe.read('cycle').status),
      )
      expect(await page.evaluate(() => globalThis.providerProbe.read('cycle').status)).toBe(
        'completed',
      )
      expect(
        await page.evaluate(() =>
          globalThis.providerProbe
            .read('cycle')
            .events.flatMap((event) => (event.type === 'console' ? [event.text] : []))
            .join(''),
        ),
      ).toBe('ação 🐢 42\n')
      expect(
        (await cdp.send('Target.getTargets')).targetInfos.filter(
          (target) => target.type === 'worker',
        ),
      ).toHaveLength(1)
      const running = await nativeMemory(cdp)
      sample.active = running
      active.push(running.privateBytes)
      const start = performance.now()
      const ackMs = await page.evaluate(async () => {
        const begin = performance.now()
        await globalThis.providerProbe.dispose('cycle')
        return performance.now() - begin
      })
      stopTimes.push(ackMs)
      sample.ackMs = ackMs
      await expect
        .poll(
          async () =>
            (await cdp.send('Target.getTargets')).targetInfos.filter(
              (target) => target.type === 'worker',
            ).length,
          { timeout: 3500, intervals: [10, 25, 50] },
        )
        .toBe(0)
      sample.workersGoneMs = performance.now() - start
      expect(sample.workersGoneMs).toBeLessThanOrEqual(3000)
      expect(await page.locator('iframe').count()).toBe(0)
      const retained = await nativeMemory(cdp)
      sample.idle = retained
      idle.push(retained.privateBytes)
      console.log(
        JSON.stringify({
          cycle,
          prepareMs,
          ackMs,
          activeMiB: running.privateBytes / 1048576,
          idleMiB: retained.privateBytes / 1048576,
        }),
      )
    }
    const average = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length
    const percentile = (values: number[], fraction: number) =>
      [...values].sort((a, b) => a - b)[Math.ceil(values.length * fraction) - 1]!
    const warmIdle = average(idle.slice(5, 10))
    const finalIdle = average(idle.slice(25, 30))
    const summary = {
      maximumActiveIncrementBytes: Math.max(...active) - baseline.privateBytes,
      warmIdle,
      finalIdle,
      retainedGrowthFraction: finalIdle / warmIdle - 1,
      coldPrepareMs: prepareTimes[0],
      warmPrepareP95Ms: percentile(prepareTimes.slice(1), 0.95),
      stopP95Ms: percentile(stopTimes, 0.95),
      stopMaxMs: Math.max(...stopTimes),
    }
    evidence.summary = summary
    expect(summary.maximumActiveIncrementBytes).toBeLessThanOrEqual(256 * 1048576)
    expect(summary.retainedGrowthFraction).toBeLessThanOrEqual(0.1)
    expect(summary.stopMaxMs).toBeLessThanOrEqual(250)
    // Local diagnostic only; entry-PC, video and full editor benchmarks remain separate gates.
    expect(summary.warmPrepareP95Ms).toBeLessThanOrEqual(3000)
    evidence.qualification = 'local-console-lifecycle-passed'
  } catch (error) {
    evidence.failure = String(error)
    failure = error
  } finally {
    try {
      await cdp.detach()
    } catch (error) {
      evidence.cleanupFailure = String(error)
      failure ??= error
    }
    if (failure) delete evidence.qualification
    await testInfo.attach('native-lifecycle-evidence', {
      contentType: 'application/json',
      body: JSON.stringify(evidence),
    })
  }
  if (failure) throw failure
})
