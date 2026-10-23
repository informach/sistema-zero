import { writeFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import type {} from '../../../experiments/studio-python-runtime/providerHost'

test('capture cold and warm Python startup CPU and resource evidence', async ({
  page,
  browser,
  request,
}, testInfo) => {
  const cdp = await browser.newBrowserCDPSession()
  const distribution = await (await request.get('/distribution')).json()
  await page.goto('/provider')
  await page.waitForFunction(() => !!globalThis.providerProbe)
  const samples = []
  for (let index = 0; index < 2; index++) {
    const complete = new Promise<{ stream?: string }>((resolve) =>
      cdp.once('Tracing.tracingComplete', resolve),
    )
    await cdp.send('Tracing.start', {
      categories:
        'devtools.timeline,v8,blink.user_timing,disabled-by-default-v8.cpu_profiler,disabled-by-default-v8.cpu_profiler.hires',
      transferMode: 'ReturnAsStream',
    })
    const prepareMs = await page.evaluate(async () => {
      performance.mark('python-prepare-start')
      const begin = performance.now()
      await globalThis.providerProbe.prepare('profile', 'portable')
      performance.mark('python-prepare-finished')
      return performance.now() - begin
    })
    expect(await page.evaluate(() => globalThis.providerProbe.read('profile').status)).toBe('ready')
    await cdp.send('Tracing.end')
    const { stream } = await complete
    expect(stream).toBeTruthy()
    const chunks: string[] = []
    try {
      for (;;) {
        const chunk = await cdp.send('IO.read', { handle: stream!, size: 1024 * 1024 })
        chunks.push(chunk.base64Encoded ? Buffer.from(chunk.data, 'base64').toString() : chunk.data)
        if (chunk.eof) break
      }
    } finally {
      await cdp.send('IO.close', { handle: stream! })
    }
    const tracePath = testInfo.outputPath(`startup-${index}.json`)
    await writeFile(tracePath, chunks.join(''))
    await testInfo.attach(`startup-trace-${index}`, {
      path: tracePath,
      contentType: 'application/json',
    })
    await page.evaluate(() => globalThis.providerProbe.run('profile'))
    await page.waitForFunction(
      () => globalThis.providerProbe.read('profile').status === 'completed',
    )
    await page.evaluate(() =>
      globalThis.providerProbe.evaluate(
        'profile',
        'resources',
        "from js import performance\nimport json\njson.dumps([{'name': e.name, 'start': e.startTime, 'duration': e.duration, 'bytes': e.transferSize} for e in performance.getEntriesByType('resource')])",
      ),
    )
    await page.waitForFunction(() =>
      globalThis.providerProbe.read('profile').events.some((event) => event.type === 'repl-result'),
    )
    samples.push({
      index,
      prepareMs,
      resources: await page.evaluate(() =>
        globalThis.providerProbe
          .read('profile')
          .events.find((event) => event.type === 'repl-result'),
      ),
    })
    await page.evaluate(() => globalThis.providerProbe.dispose('profile'))
  }
  await testInfo.attach('startup-profile', {
    contentType: 'application/json',
    body: JSON.stringify({
      browser: browser.version(),
      distribution,
      samples,
      scope: 'Diagnostic with tracing overhead; no performance qualification claim',
    }),
  })
  await cdp.detach()
})
