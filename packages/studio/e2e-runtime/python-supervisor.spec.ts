import { expect, type Page, test } from '@playwright/test'
import type {} from '../../../experiments/studio-python-runtime/host'

test.beforeEach(async ({ request }, testInfo) => {
  const response = await request.get('/distribution')
  await testInfo.attach('runtime-distribution', {
    body: await response.body(),
    contentType: 'application/json',
  })
})
async function prepare(page: Page, fixture: string) {
  await page.goto('/supervisor')
  await page.waitForFunction(() => !!globalThis.supervisorProbe)
  await page.evaluate((name) => globalThis.supervisorProbe.prepare(name), fixture)
  await page.waitForFunction(() =>
    globalThis.supervisorProbe.events.some(
      (message) =>
        message.type === 'prepared' ||
        (message.type === 'event' && message.event.type === 'failed'),
    ),
  )
  expect(
    await page.evaluate(() =>
      globalThis.supervisorProbe.events.filter(
        (message) => message.type === 'event' && message.event.type === 'failed',
      ),
    ),
  ).toEqual([])
}
async function completed(page: Page) {
  await page.waitForFunction(() =>
    globalThis.supervisorProbe.events.some(
      (message) =>
        message.type === 'event' &&
        (message.event.type === 'failed' ||
          (message.event.type === 'state' && message.event.state === 'completed')),
    ),
  )
  expect(
    await page.evaluate(() =>
      globalThis.supervisorProbe.events.filter(
        (message) => message.type === 'event' && message.event.type === 'failed',
      ),
    ),
  ).toEqual([])
}
test('product frame executes through its private port with bound identity and ordered messages', async ({
  page,
}) => {
  await prepare(page, 'portable')
  await page.evaluate(() => globalThis.supervisorProbe.send({ type: 'run' }))
  await completed(page)
  const events = await page.evaluate(() => globalThis.supervisorProbe.events)
  expect(new Set(events.map((message) => JSON.stringify(message.identity))).size).toBe(1)
  expect(events.map((message) => message.sequence)).toEqual(events.map((_, index) => index + 1))
  expect(
    events
      .flatMap((message) =>
        message.type === 'event' && message.event.type === 'console' ? [message.event.text] : [],
      )
      .join(''),
  ).toBe('ação 🐢 42\n')
  await page.evaluate(() =>
    globalThis.supervisorProbe.send({
      type: 'evaluate',
      requestId: 'repl',
      source: 'value = 11\ncurrent()',
    }),
  )
  await page.waitForFunction(() =>
    globalThis.supervisorProbe.events.some(
      (message) => message.type === 'event' && message.event.type === 'repl-result',
    ),
  )
  expect(
    await page.evaluate(() =>
      globalThis.supervisorProbe.events.find(
        (message) => message.type === 'event' && message.event.type === 'repl-result',
      ),
    ),
  ).toMatchObject({ event: { text: '11', status: 'completed' } })
})
test('stop acknowledges a busy Python worker and reclaims its native target', async ({
  page,
  browser,
}, testInfo) => {
  const cdp = await browser.newBrowserCDPSession()
  const destroyed = new Map<string, number>()
  cdp.on('Target.targetDestroyed', ({ targetId }) => destroyed.set(targetId, performance.now()))
  await cdp.send('Target.setDiscoverTargets', { discover: true })
  try {
    await prepare(page, 'loop')
    await page.evaluate(() => globalThis.supervisorProbe.send({ type: 'run' }))
    await page.waitForFunction(() =>
      globalThis.supervisorProbe.events.some(
        (message) => message.type === 'ack' && message.commandId === 1 && message.ok,
      ),
    )
    await page.waitForFunction(() =>
      globalThis.supervisorProbe.events.some(
        (message) =>
          message.type === 'event' &&
          message.event.type === 'console' &&
          message.event.text === 'loop-started',
      ),
    )
    const targets = (await cdp.send('Target.getTargets')).targetInfos.filter(
      (target) => target.type === 'worker',
    )
    expect(targets).toHaveLength(1)
    const before = await cdp.send('SystemInfo.getProcessInfo')
    const began = performance.now()
    const timing = await page.evaluate(async () => {
      const start = performance.now()
      const id = globalThis.supervisorProbe.send({ type: 'stop' })
      await new Promise<void>((resolve, reject) => {
        const timer = setInterval(() => {
          if (
            globalThis.supervisorProbe.events.some(
              (message) => message.type === 'ack' && message.commandId === id,
            )
          ) {
            clearInterval(timer)
            resolve()
          } else if (performance.now() - start > 1000) {
            clearInterval(timer)
            reject(new Error('stop timeout'))
          }
        }, 1)
      })
      return performance.now() - start
    })
    expect(timing).toBeLessThanOrEqual(250)
    const events = await page.evaluate(() => globalThis.supervisorProbe.events)
    expect(events.at(-1)).toMatchObject({ type: 'ack', commandId: 2, ok: true })
    expect(events.at(-2)).toMatchObject({
      type: 'event',
      event: { type: 'state', state: 'stopped' },
    })
    await expect
      .poll(() => targets.every((target) => destroyed.has(target.targetId)), {
        timeout: 4000,
        intervals: [10, 25, 50],
      })
      .toBe(true)
    const physicalMs = Math.max(...targets.map((target) => destroyed.get(target.targetId)! - began))
    const after = await cdp.send('SystemInfo.getProcessInfo')
    await testInfo.attach('native-stop-evidence', {
      contentType: 'application/json',
      body: JSON.stringify({
        browser: browser.version(),
        ackMs: timing,
        physicalMs,
        targets: targets.map((target) => target.targetId),
        rendererCpuSeconds: before.processInfo
          .filter((process) => process.type === 'renderer')
          .map((process) => ({
            id: process.id,
            delta:
              (after.processInfo.find((item) => item.id === process.id)?.cpuTime ??
                process.cpuTime) - process.cpuTime,
          })),
      }),
    })
    expect(physicalMs).toBeLessThanOrEqual(3000)
    expect(await page.evaluate(() => globalThis.supervisorProbe.events)).toEqual(events)
  } finally {
    await cdp.detach()
  }
})
test('a mismatched execution identity closes the private channel', async ({ page }) => {
  await prepare(page, 'portable')
  await page.evaluate(() =>
    globalThis.supervisorProbe.send({ type: 'run' }, { runId: 'another-run' }),
  )
  await page.waitForFunction(() =>
    globalThis.supervisorProbe.events.some(
      (message) => message.type === 'event' && message.event.type === 'failed',
    ),
  )
  expect(
    await page.evaluate(() =>
      globalThis.supervisorProbe.events.some(
        (message) => message.type === 'event' && message.event.type === 'console',
      ),
    ),
  ).toBe(false)
})
test('FFI flood is rejected at the supervisor boundary', async ({ page }) => {
  await prepare(page, 'ffiFlood')
  await page.evaluate(() => globalThis.supervisorProbe.send({ type: 'run' }))
  await page.waitForFunction(() =>
    globalThis.supervisorProbe.events.some(
      (message) => message.type === 'event' && message.event.type === 'failed',
    ),
  )
  expect(await page.evaluate(() => globalThis.supervisorProbe.events.length)).toBeLessThan(12)
})
test('the product bootstrap blocks descendant workers and policy replacement', async ({ page }) => {
  await prepare(page, 'childWorker')
  await page.evaluate(() => globalThis.supervisorProbe.send({ type: 'run' }))
  await completed(page)
  expect(
    await page.evaluate(() =>
      globalThis.supervisorProbe.events
        .flatMap((message) =>
          message.type === 'event' && message.event.type === 'console' ? [message.event.text] : [],
        )
        .join(''),
    ),
  ).toBe('child blocked\npolicy blocked\n')
})
