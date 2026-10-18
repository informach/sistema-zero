import { expect, type Page, test } from '@playwright/test'
import type {} from '../../../experiments/studio-python-runtime/providerHost'

async function output(page: Page) {
  return page.evaluate(() =>
    globalThis.providerProbe
      .read('classic')
      .events.flatMap((event) => (event.type === 'console' ? [event.text] : []))
      .join(''),
  )
}
async function run(page: Page, fixture: string) {
  await page.evaluate((fixture) => globalThis.providerProbe.prepare('classic', fixture), fixture)
  const state = await page.evaluate(() => globalThis.providerProbe.read('classic'))
  expect(state.status, state.error).toBe('ready')
  await page.locator('iframe').evaluate((frame) => {
    frame.style.cssText = 'width:640px;height:480px;border:0'
  })
  await page.evaluate(() => globalThis.providerProbe.run('classic'))
}
test.beforeEach(async ({ page }) => {
  await page.goto('/provider')
  await page.waitForFunction(() => !!globalThis.providerProbe)
})
test.afterEach(async ({ page }) => {
  await page.evaluate(() => globalThis.providerProbe.dispose('classic'))
})

test('Classic executes authoritative source with console input and EOF through the same provider as Pro', async ({
  page,
  request,
}) => {
  const document = await (await request.get('/project/classic-input')).json()
  expect(document).toMatchObject({ kind: 'classic', programmingLanguage: 'python', mode: 'bridge' })
  expect(document.ir.untrustedDerivedCache).toContain('must never execute')
  await run(page, 'classic-input')
  for (const [index, response] of [
    { kind: 'line' as const, text: 'ação 🐢' },
    { kind: 'line' as const, text: '' },
    { kind: 'eof' as const },
  ].entries()) {
    const id = `input-${index + 1}`
    await page.waitForFunction(
      (id) =>
        globalThis.providerProbe
          .read('classic')
          .events.some((event) => event.type === 'input-request' && event.requestId === id),
      id,
    )
    await page.evaluate(
      ({ id, response }) => globalThis.providerProbe.input('classic', id, response),
      { id, response },
    )
  }
  await expect
    .poll(() => page.evaluate(() => globalThis.providerProbe.read('classic').status))
    .toBe('completed')
  expect(await output(page)).toBe("Nome: primeiro: 'ação 🐢'\nvazio: ''\nEOF\n")
})

test('Classic Turtle keeps pixels, keyboard, click, media and restart across independent generations', async ({
  page,
}) => {
  await run(page, 'classic-turtleDrawing')
  await expect.poll(() => output(page)).toContain('drawing-ready (100.00,80.00) 90.0')
  const firstRun = await page.evaluate(
    () => globalThis.providerProbe.read('classic').events[0]!.identity.runId,
  )
  let frame = page.frames().find((frame) => frame.url().includes('/frame.html'))!
  expect(
    await frame.evaluate(() => {
      const context = document.querySelector('canvas')!.getContext('2d')!
      return [...context.getImageData(250, 150, 1, 1).data]
    }),
  ).toEqual([255, 0, 0, 255])
  await run(page, 'classic-turtleEvents')
  await expect.poll(() => output(page)).toContain('events-ready')
  frame = page.frames().find((frame) => frame.url().includes('/frame.html'))!
  await frame.locator('canvas').press('ArrowRight')
  await expect.poll(() => output(page)).toContain('key 10.0')
  await frame.locator('canvas').click({ position: { x: 210, y: 150 } })
  await expect.poll(() => output(page)).toContain('turtle-click 10 0\nscreen-click 10 0\n')
  await page.evaluate(() => globalThis.providerProbe.stop('classic'))
  expect(await page.evaluate(() => globalThis.providerProbe.read('classic').status)).toBe('stopped')
  await run(page, 'classic-turtleImage')
  await expect.poll(() => output(page)).toContain('image-ready (20.00,30.00) 270.0')
  expect(
    await page.evaluate(
      (firstRun) =>
        globalThis.providerProbe
          .read('classic')
          .events.every((event) => event.identity.runId !== firstRun),
      firstRun,
    ),
  ).toBe(true)
})
