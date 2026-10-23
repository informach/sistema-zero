import { createHash } from 'node:crypto'
import { expect, type Response, test } from '@playwright/test'
import { StudioPythonDistributionSchema } from '@sistemazero/core/studio/python-runtime-distribution'
import type {} from '../../../experiments/studio-python-runtime/providerHost'
import { PYTHON_BOOT_RESOURCE_NAMES } from '../src/runtime/python/bootResourceContract'

test('three real interpreter generations reuse verified bytes and retain no learner globals or files', async ({
  page,
  request,
}, testInfo) => {
  const distribution = await (await request.get('/distribution')).json()
  const manifest = StudioPythonDistributionSchema.parse(distribution.manifest)
  const configuration = await (await request.get('/configuration')).json()
  const directory = new URL('./', configuration.providerFrameURL).href
  const responses: Response[] = []
  page.on('response', (response) => {
    if (PYTHON_BOOT_RESOURCE_NAMES.some((name) => response.url() === directory + name))
      responses.push(response)
  })
  await page.goto('/provider')
  await page.waitForFunction(() => !!globalThis.providerProbe)
  expect(
    await page.evaluate(async () =>
      (await caches.keys()).filter((name) => name.startsWith('sz-python-boot-v1:')),
    ),
  ).toEqual([])
  const baseline = await (await request.get('/boot-resources')).json()
  const samples: { cycle: number; requests: Record<string, number>; runId: string }[] = []
  try {
    for (let cycle = 0; cycle < 3; cycle++) {
      await page.evaluate(() => globalThis.providerProbe.prepare('boot-reuse', 'portable'))
      expect(await page.evaluate(() => globalThis.providerProbe.read('boot-reuse').status)).toBe(
        'ready',
      )
      await page.evaluate(() => globalThis.providerProbe.run('boot-reuse'))
      await page.waitForFunction(() =>
        ['completed', 'failed'].includes(globalThis.providerProbe.read('boot-reuse').status),
      )
      expect(await page.evaluate(() => globalThis.providerProbe.read('boot-reuse').status)).toBe(
        'completed',
      )
      const requestId = `boot-isolation-${cycle}`
      await page.evaluate(
        ({ requestId }) =>
          globalThis.providerProbe.evaluate(
            'boot-reuse',
            requestId,
            `
from pathlib import Path
assert 'boot_marker' not in globals()
assert not Path('boot-marker.bin').exists()
boot_marker = 1
Path('boot-marker.bin').write_bytes(b'owned')
print('isolation-ok')
`,
          ),
        { requestId },
      )
      await page.waitForFunction(
        (requestId) =>
          globalThis.providerProbe
            .read('boot-reuse')
            .events.some((event) => event.type === 'repl-result' && event.requestId === requestId),
        requestId,
      )
      const state = await page.evaluate(() => globalThis.providerProbe.read('boot-reuse'))
      expect(
        state.events.find((event) => event.type === 'repl-result' && event.requestId === requestId),
      ).toMatchObject({ status: 'completed' })
      expect(state.events.some((event) => event.type === 'failed')).toBe(false)
      const runId = state.events[0]?.identity.runId
      if (!runId) throw new Error('Missing actual interpreter generation identity')
      const requests = await (await request.get('/boot-resources')).json()
      samples.push({ cycle, requests, runId })
      for (const name of PYTHON_BOOT_RESOURCE_NAMES) expect(requests[name] - baseline[name]).toBe(1)
      await page.evaluate(() => globalThis.providerProbe.stop('boot-reuse'))
      expect(await page.evaluate(() => globalThis.providerProbe.read('boot-reuse').status)).toBe(
        'stopped',
      )
    }
    expect(new Set(samples.map((sample) => sample.runId)).size).toBe(3)
    expect(responses).toHaveLength(3)
    const downloads = []
    for (const response of responses) {
      expect(response.status()).toBe(200)
      const name = response.url().slice(directory.length)
      const expected = manifest.files.find((file) => file.path === name)
      if (!expected) throw new Error('Unexpected interpreter resource')
      const bytes = await response.body()
      const sha256 = createHash('sha256').update(bytes).digest('hex')
      expect(bytes.length).toBe(expected.bytes)
      expect(sha256).toBe(expected.sha256)
      downloads.push({ name, bytes: bytes.length, sha256 })
    }
    await testInfo.attach('boot-reuse-evidence', {
      body: JSON.stringify({ distribution, baseline, samples, downloads }, null, 2),
      contentType: 'application/json',
    })
  } finally {
    await page.evaluate(() => globalThis.providerProbe.dispose('boot-reuse'))
  }
})
