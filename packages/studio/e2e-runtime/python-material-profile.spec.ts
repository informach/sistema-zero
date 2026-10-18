import { writeFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import type {} from '../../../experiments/studio-python-runtime/providerHost'

test('material decoder retains native browser whitespace, padding and rejection behavior', async ({
  page,
}) => {
  await page.goto('/provider')
  await page.waitForFunction(() => !!globalThis.providerProbe)
  const result = await page.evaluate(() => {
    const invalid = ['a', 'a===', 'YQ===', 'YQ==x', '%%%%', '😀', 'AA-_']
    return {
      valid: ['YQ==', 'YQ', ' \nYQ==\t'].map((raw) => [
        ...globalThis.providerProbe.decodeMaterial(`data:image/png;base64,${raw}`).bytes,
      ]),
      invalid: invalid.map((raw) => {
        try {
          globalThis.providerProbe.decodeMaterial(`data:image/png;base64,${raw}`)
          return false
        } catch (error) {
          return error instanceof DOMException && error.name === 'InvalidCharacterError'
        }
      }),
    }
  })
  expect(result.valid).toEqual([[97], [97], [97]])
  expect(result.invalid).toEqual(Array(7).fill(true))
})

test('benchmark material conversion with three warmups and ten measurements', async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000)
  await page.goto('/provider')
  await page.waitForFunction(() => !!globalThis.providerProbe)
  const result = await page.evaluate(() =>
    globalThis.providerProbe.measureMaterials('spaceArenaOriginal'),
  )
  const sorted = [...result.samples].sort((a, b) => a - b)
  expect(result.golden.reduce((bytes, entry) => bytes + entry.bytes, 0)).toBe(24_971_993)
  await testInfo.attach('material-benchmark', {
    body: JSON.stringify({ ...result, p50Ms: sorted[4], p95Ms: sorted[9], p99Ms: sorted[9] }),
    contentType: 'application/json',
  })
})

test('profile actual Space Arena material preparation before choosing an optimization', async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(90_000)
  await page.goto('/provider')
  await page.waitForFunction(() => !!globalThis.providerProbe)
  const cdp = await context.newCDPSession(page)
  await cdp.send('Profiler.enable')
  await cdp.send('Profiler.start')
  const elapsed = await page.evaluate(async () => {
    const start = performance.now()
    await globalThis.providerProbe.prepare('profile', 'spaceArenaOriginal')
    return performance.now() - start
  })
  const { profile } = await cdp.send('Profiler.stop')
  const state = await page.evaluate(() => globalThis.providerProbe.read('profile'))
  expect(state.status, JSON.stringify(state)).toBe('ready')
  const output = testInfo.outputPath('material-preparation.cpuprofile')
  await writeFile(output, JSON.stringify(profile))
  await testInfo.attach('cpu', { path: output, contentType: 'application/json' })
  await testInfo.attach('measurement', {
    body: JSON.stringify({
      elapsedMs: elapsed,
      scope: 'one diagnostic sample with profiling overhead, no qualification claim',
    }),
    contentType: 'application/json',
  })
  await page.evaluate(() => globalThis.providerProbe.dispose('profile'))
  await cdp.detach()
})
