import { expect, type Page, test } from '@playwright/test'
import type {} from '../../../experiments/studio-python-runtime/providerHost'

test.beforeEach(async ({ page, request }, testInfo) => {
  await testInfo.attach('runtime-distribution', {
    body: await (await request.get('/distribution')).body(),
    contentType: 'application/json',
  })
  await page.goto('/provider')
  await page.waitForFunction(() => !!globalThis.providerProbe)
})
async function prepare(page: Page, slot: string, fixture: string) {
  await page.evaluate(({ slot, fixture }) => globalThis.providerProbe.prepare(slot, fixture), {
    slot,
    fixture,
  })
  expect(await page.evaluate((slot) => globalThis.providerProbe.read(slot).status, slot)).toBe(
    'ready',
  )
}
async function completed(page: Page, slot: string) {
  await page.waitForFunction(
    (slot) => ['completed', 'failed'].includes(globalThis.providerProbe.read(slot).status),
    slot,
  )
  expect(await page.evaluate((slot) => globalThis.providerProbe.read(slot).status, slot)).toBe(
    'completed',
  )
}

for (const fixture of ['turtleDrawing', 'classic-turtleDrawing'])
  test(`${fixture}: captures presented pixels with the current revision and refuses capture after Stop`, async ({
    page,
  }, testInfo) => {
    await prepare(page, 'capture', fixture)
    expect(await page.evaluate(() => globalThis.providerProbe.capture('capture'))).toBeNull()
    await page.evaluate(() => globalThis.providerProbe.run('capture'))
    await page.waitForFunction(() =>
      globalThis.providerProbe
        .read('capture')
        .events.some((event) => event.type === 'console' && event.text.includes('drawing-ready')),
    )
    const snapshot = await page.evaluate(() => globalThis.providerProbe.capture('capture'))
    expect(snapshot).not.toBeNull()
    expect(snapshot!.identity).toEqual(
      await page.evaluate(() => globalThis.providerProbe.read('capture').events[0]!.identity),
    )
    expect(snapshot!.width).toBe(400)
    expect(snapshot!.height).toBe(300)
    expect(snapshot!.frameSequence).toBeGreaterThan(0)
    const pixel = await page.evaluate(async (dataUrl) => {
      const image = new Image()
      image.src = dataUrl
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(image, 0, 0)
      return [...ctx.getImageData(250, 150, 1, 1).data]
    }, snapshot!.dataUrl)
    expect(pixel).toEqual([255, 0, 0, 255])
    await testInfo.attach('captured-turtle', {
      body: Buffer.from(snapshot!.dataUrl.split(',')[1]!, 'base64'),
      contentType: 'image/png',
    })
    await page.evaluate(() => globalThis.providerProbe.stop('capture'))
    const stopped = await page.evaluate(async () => {
      try {
        await globalThis.providerProbe.capture('capture')
        return false
      } catch {
        return true
      }
    })
    expect(stopped).toBe(true)
    await prepare(page, 'capture', 'portable')
    await page.evaluate(() => globalThis.providerProbe.run('capture'))
    await completed(page, 'capture')
    expect(await page.evaluate(() => globalThis.providerProbe.capture('capture'))).toBeNull()
    await page.evaluate(() => globalThis.providerProbe.dispose('capture'))
  })
test('Stop cancels a capture while the browser is still encoding it', async ({ page }) => {
  await prepare(page, 'capture', 'turtleDrawing')
  await page.evaluate(() => globalThis.providerProbe.run('capture'))
  await page.waitForFunction(() =>
    globalThis.providerProbe
      .read('capture')
      .events.some((event) => event.type === 'console' && event.text.includes('drawing-ready')),
  )
  const frame = page.frames().find((candidate) => candidate.url().includes('/frame.html'))!
  await frame.evaluate(() => {
    const original = HTMLCanvasElement.prototype.toBlob
    HTMLCanvasElement.prototype.toBlob = function (callback, ...options) {
      performance.mark('encoding-started')
      // Delay only completion of a real native encode to make the lifecycle race deterministic.
      return original.call(this, (blob) => setTimeout(() => callback(blob), 500), ...options)
    }
  })
  const pending = page.evaluate(async () => {
    try {
      await globalThis.providerProbe.capture('capture')
      return 'accepted'
    } catch {
      return 'cancelled'
    }
  })
  await frame.waitForFunction(() => performance.getEntriesByName('encoding-started').length === 1)
  const elapsed = await page.evaluate(async () => {
    const start = performance.now()
    await globalThis.providerProbe.stop('capture')
    return performance.now() - start
  })
  expect(elapsed).toBeLessThanOrEqual(250)
  expect(await pending).toBe('cancelled')
  const events = await page.evaluate(() => globalThis.providerProbe.read('capture').events)
  expect(events.at(-1)).toMatchObject({ type: 'state', state: 'stopped' })
  await prepare(page, 'capture', 'portable')
  await page.evaluate(() => globalThis.providerProbe.run('capture'))
  await completed(page, 'capture')
  const next = await page.evaluate(() => globalThis.providerProbe.read('capture').events)
  expect(next.every((event) => event.identity.runId !== events[0]!.identity.runId)).toBe(true)
  await page.evaluate(() => globalThis.providerProbe.dispose('capture'))
})

test('the provider binds snapshots and runs independent sessions with separate REPL state', async ({
  page,
}) => {
  await prepare(page, 'first', 'portable')
  await prepare(page, 'second', 'portable')
  await page.evaluate(() =>
    Promise.all([globalThis.providerProbe.run('first'), globalThis.providerProbe.run('second')]),
  )
  await completed(page, 'first')
  await completed(page, 'second')
  await page.evaluate(() =>
    globalThis.providerProbe.evaluate('first', 'change', 'value = 99\ncurrent()'),
  )
  await page.waitForFunction(() =>
    globalThis.providerProbe.read('first').events.some((event) => event.type === 'repl-result'),
  )
  await page.evaluate(() => globalThis.providerProbe.evaluate('second', 'read', 'current()'))
  await page.waitForFunction(() =>
    globalThis.providerProbe.read('second').events.some((event) => event.type === 'repl-result'),
  )
  const [first, second] = await page.evaluate(() => [
    globalThis.providerProbe.read('first'),
    globalThis.providerProbe.read('second'),
  ])
  expect(first!.events.find((event) => event.type === 'repl-result')).toMatchObject({ text: '99' })
  expect(second!.events.find((event) => event.type === 'repl-result')).toMatchObject({ text: '7' })
  expect(first!.events[0]!.identity.runId).not.toBe(second!.events[0]!.identity.runId)
  expect(first!.events.map((event) => event.sequence)).toEqual(
    // Sequence belongs to the session, including ready before subscribe.
    first!.events.map((_, index) => index + first!.events[0]!.sequence),
  )
  await page.evaluate(() =>
    Promise.all([
      globalThis.providerProbe.dispose('first'),
      globalThis.providerProbe.dispose('second'),
    ]),
  )
})
test('stop revokes host events and restart creates a fresh generation', async ({ page }) => {
  await prepare(page, 'game', 'loop')
  await page.evaluate(() => globalThis.providerProbe.run('game'))
  await page.waitForFunction(() =>
    globalThis.providerProbe
      .read('game')
      .events.some((event) => event.type === 'console' && event.text === 'loop-started'),
  )
  const stopped = await page.evaluate(async () => {
    const start = performance.now()
    await Promise.all([
      globalThis.providerProbe.stop('game'),
      globalThis.providerProbe.stop('game'),
    ])
    return { ms: performance.now() - start, state: globalThis.providerProbe.read('game') }
  })
  expect(stopped.ms).toBeLessThanOrEqual(250)
  expect(stopped.state.events.at(-1)).toMatchObject({ type: 'state', state: 'stopped' })
  const oldRun = stopped.state.events[0]!.identity.runId
  await prepare(page, 'game', 'portable')
  await page.evaluate(() => globalThis.providerProbe.run('game'))
  await completed(page, 'game')
  const next = await page.evaluate(() => globalThis.providerProbe.read('game'))
  expect(next.events.every((event) => event.identity.runId !== oldRun)).toBe(true)
  await page.evaluate(() => globalThis.providerProbe.dispose('game'))
})
test('abort during prepare never returns a usable session', async ({ page }) => {
  await page.evaluate(() => {
    void globalThis.providerProbe.prepare('cancelled', 'portable')
  })
  await page.waitForFunction(() =>
    globalThis.providerProbe.read('cancelled').frameURL.includes('/v1/runtimes/'),
  )
  expect(await page.evaluate(() => globalThis.providerProbe.read('cancelled').status)).toBe(
    'loading',
  )
  await page.evaluate(() => globalThis.providerProbe.cancel('cancelled'))
  await page.waitForFunction(() => globalThis.providerProbe.read('cancelled').status === 'failed')
  expect(await page.evaluate(() => globalThis.providerProbe.read('cancelled').events)).toEqual([])
  await page.evaluate(() => globalThis.providerProbe.dispose('cancelled'))
})
test('provider rejects mismatched content before starting a frame', async ({ page }) => {
  await page.evaluate(() => globalThis.providerProbe.prepare('mismatch', 'portable', true))
  const state = await page.evaluate(() => globalThis.providerProbe.read('mismatch'))
  expect(state.status).toBe('failed')
  expect(state.error).toContain('mudou')
  expect(state.events).toEqual([])
  expect(state.frameURL).toBe('')
})
test('overlapping reuse of a frame is rejected without disturbing its owner', async ({ page }) => {
  await prepare(page, 'owner', 'portable')
  expect(await page.evaluate(() => globalThis.providerProbe.overlap('owner'))).toContain('Encerre')
  await page.evaluate(() => globalThis.providerProbe.run('owner'))
  await completed(page, 'owner')
  await page.evaluate(() => globalThis.providerProbe.dispose('owner'))
})
test('abort while waiting for input revokes the session immediately', async ({ page }) => {
  await prepare(page, 'waiting', 'waiting')
  await page.evaluate(() => globalThis.providerProbe.run('waiting'))
  await page.waitForFunction(
    () => globalThis.providerProbe.read('waiting').status === 'waiting-input',
  )
  await page.evaluate(() => globalThis.providerProbe.cancel('waiting'))
  expect(
    await page.evaluate(() => globalThis.providerProbe.read('waiting').events.at(-1)),
  ).toMatchObject({ type: 'state', state: 'stopped' })
  const result = await page.evaluate(async () => {
    try {
      await globalThis.providerProbe.input('waiting', 'input-1', { kind: 'line', text: 'late' })
      return 'accepted'
    } catch {
      return 'rejected'
    }
  })
  expect(result).toBe('rejected')
  await page.evaluate(() => globalThis.providerProbe.dispose('waiting'))
})
test('provider delivers lines and EOF without evaluating input as code', async ({ page }) => {
  await prepare(page, 'input', 'input')
  await page.evaluate(() => globalThis.providerProbe.run('input'))
  for (const [index, response] of [
    { kind: 'line' as const, text: "print('não executar')" },
    { kind: 'line' as const, text: '' },
    { kind: 'eof' as const },
  ].entries()) {
    const id = `input-${index + 1}`
    await page.waitForFunction(
      (id) =>
        globalThis.providerProbe
          .read('input')
          .events.some((event) => event.type === 'input-request' && event.requestId === id),
      id,
    )
    await page.evaluate(
      ({ id, response }) => globalThis.providerProbe.input('input', id, response),
      { id, response },
    )
  }
  await completed(page, 'input')
  expect(
    await page.evaluate(() =>
      globalThis.providerProbe
        .read('input')
        .events.flatMap((event) => (event.type === 'console' ? [event.text] : []))
        .join(''),
    ),
  ).toBe("Nome: primeiro: \"print('não executar')\"\nvazio: ''\nEOF\n")
})
