import { expect, test } from '@playwright/test'
import type {} from '../../../experiments/studio-python-runtime/controllerHost'

test.beforeEach(async ({ page }) => {
  await page.goto('/provider')
  await page.waitForFunction(() => !!globalThis.pythonControllerProbe)
})

for (const fixture of ['portable', 'classic-portable'])
  test(`${fixture}: shared controller runs, preserves old revision while editing and restarts cleanly`, async ({
    page,
  }) => {
    await page.evaluate(
      (fixture) => globalThis.pythonControllerProbe.create('game', fixture),
      fixture,
    )
    await page.evaluate(() => globalThis.pythonControllerProbe.run('game'))
    await page.waitForFunction(
      () => globalThis.pythonControllerProbe.read('game').status === 'completed',
    )
    const before = await page.evaluate(() => globalThis.pythonControllerProbe.read('game'))
    expect(before.current).toBe(true)
    expect(before.frames).toBe(1)
    expect(
      before.events.some((event) => event.type === 'console' && event.text.includes('ação 🐢')),
    ).toBe(true)
    await page.evaluate(() =>
      globalThis.pythonControllerProbe.source('game', 'print("segunda execução")\n'),
    )
    expect(await page.evaluate(() => globalThis.pythonControllerProbe.read('game').current)).toBe(
      false,
    )
    await page.evaluate(() => globalThis.pythonControllerProbe.run('game'))
    await page.waitForFunction(
      () => globalThis.pythonControllerProbe.read('game').status === 'completed',
    )
    const next = await page.evaluate(() => globalThis.pythonControllerProbe.read('game'))
    expect(next.identity!.runId).not.toBe(before.identity!.runId)
    expect(next.identity!.revision).not.toBe(before.identity!.revision)
    expect(next.frames).toBe(1)
    expect(next.current).toBe(true)
    expect(
      next.events
        .filter((event) => event.identity.runId === next.identity!.runId)
        .some((event) => event.type === 'console' && event.text.includes('segunda execução')),
    ).toBe(true)
    await page.evaluate(() => globalThis.pythonControllerProbe.dispose('game'))
    expect(await page.locator('iframe').count()).toBe(0)
  })

test('Stop during preparation prevents a late session from starting', async ({ page }) => {
  await page.evaluate(() => globalThis.pythonControllerProbe.create('game', 'turtleDrawing'))
  const starting = page.evaluate(() =>
    globalThis.pythonControllerProbe.run('game').then(
      () => 'started',
      () => 'cancelled',
    ),
  )
  await page.waitForFunction(() => globalThis.pythonControllerProbe.read('game').frames === 1)
  await page.evaluate(() => globalThis.pythonControllerProbe.stop('game'))
  expect(await starting).toBe('cancelled')
  const state = await page.evaluate(() => globalThis.pythonControllerProbe.read('game'))
  expect(state.status).toBe('stopped')
  expect(state.events).toEqual([])
  expect(state.frames).toBe(0)
})

test('input, capture and writer authority belong to the current controller generation', async ({
  page,
}) => {
  await page.evaluate(() => globalThis.pythonControllerProbe.create('game', 'waiting'))
  await page.evaluate(() => globalThis.pythonControllerProbe.writer('game', 1))
  await page.evaluate(() => globalThis.pythonControllerProbe.run('game'))
  await page.waitForFunction(
    () => globalThis.pythonControllerProbe.read('game').status === 'waiting-input',
  )
  const state = await page.evaluate(() => globalThis.pythonControllerProbe.read('game'))
  expect(state.input?.requestId).toBe('input-1')
  await page.evaluate(() =>
    globalThis.pythonControllerProbe.input('game', 'input-1', { kind: 'line', text: 'ok' }),
  )
  await page.waitForFunction(
    () => globalThis.pythonControllerProbe.read('game').status === 'completed',
  )
  await page.evaluate(() => globalThis.pythonControllerProbe.writer('game', 2))
  expect(
    await page.evaluate(() =>
      globalThis.pythonControllerProbe.capture('game').then(
        () => 'accepted',
        () => 'refused',
      ),
    ),
  ).toBe('refused')
  await page.evaluate(() => globalThis.pythonControllerProbe.fixture('game', 'turtleDrawing'))
  await page.evaluate(() => globalThis.pythonControllerProbe.run('game'))
  await page.waitForFunction(() =>
    globalThis.pythonControllerProbe
      .read('game')
      .events.some((event) => event.type === 'console' && event.text.includes('drawing-ready')),
  )
  const capture = await page.evaluate(() => globalThis.pythonControllerProbe.capture('game'))
  expect(capture!.identity.writerEpoch).toBe(2)
  expect(capture!.width).toBe(400)
  await page.evaluate(() => globalThis.pythonControllerProbe.stop('game'))
  expect(await page.evaluate(() => globalThis.pythonControllerProbe.read('game').frames)).toBe(0)
})
