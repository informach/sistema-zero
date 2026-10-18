import { expect, test } from '@playwright/test'
import type {} from '../../../experiments/studio-python-runtime/providerHost'

for (let sample = 0; sample < 30; sample++) {
  test(`cold console startup with aggregate 20 Mbps server shaping, sample ${sample + 1}`, async ({
    page,
    request,
  }, testInfo) => {
    const before = await (await request.get('/network')).json()
    expect(before).toMatchObject({ bytesPerSecond: 2_500_000, responseDelayMs: 80 })
    const distribution = await (await request.get('/distribution')).json()
    // Playwright gives each sample a new isolated context, including its HTTP cache.
    await page.goto('/provider')
    await page.waitForFunction(() => !!globalThis.providerProbe)
    const elapsedMs = await page.evaluate(async () => {
      const start = performance.now()
      await globalThis.providerProbe.prepare('network', 'portable')
      if (globalThis.providerProbe.read('network').status !== 'ready')
        throw new Error(globalThis.providerProbe.read('network').error)
      await globalThis.providerProbe.run('network')
      await new Promise<void>((resolve, reject) => {
        const timer = setInterval(() => {
          const state = globalThis.providerProbe.read('network')
          if (state.status === 'completed' || state.status === 'failed') {
            clearInterval(timer)
            state.status === 'completed' ? resolve() : reject(new Error(state.error))
          }
        }, 10)
      })
      return performance.now() - start
    })
    const after = await (await request.get('/network')).json()
    const bytes = after.deliveredBytes - before.deliveredBytes
    await testInfo.attach('cold-network-evidence', {
      contentType: 'application/json',
      body: JSON.stringify({
        sample,
        elapsedMs,
        bytes,
        profile: before,
        distribution,
        scope:
          'Server response shaping; local CPU, no video/editor; not physical entry-PC/network qualification',
      }),
    })
    const bootPaths = new Set([
      'frame.html',
      'frame.mjs',
      'worker.mjs',
      'pyodide.mjs',
      'pyodide.asm.mjs',
      'pyodide.asm.wasm',
      'python_stdlib.zip',
    ])
    const bootBytes = distribution.manifest.files
      .filter((file: { path: string }) => bootPaths.has(file.path))
      .reduce((sum: number, file: { bytes: number }) => sum + file.bytes, 0)
    expect(bootBytes).toBeGreaterThan(0)
    expect(bytes).toBeGreaterThanOrEqual(bootBytes)
    expect(elapsedMs).toBeGreaterThanOrEqual((bytes / 2_500_000) * 1000)
    expect(elapsedMs).toBeLessThanOrEqual(12_000)
    expect(
      await page.evaluate(() =>
        globalThis.providerProbe
          .read('network')
          .events.flatMap((event) => (event.type === 'console' ? [event.text] : []))
          .join(''),
      ),
    ).toBe('ação 🐢 42\n')
    await page.evaluate(() => globalThis.providerProbe.dispose('network'))
  })
}
