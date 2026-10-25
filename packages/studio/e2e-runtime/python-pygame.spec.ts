import { expect, test } from '@playwright/test'
import type {} from '../../../experiments/studio-python-runtime/providerHost'
import { PYGAME_GAMES } from '../src/examples/python/pygameGames.manifest'

test('Pygame-ce update(None) keeps the displayed pixels until a real refresh', async ({
  page,
}, testInfo) => {
  await page.goto('/provider')
  await page.waitForFunction(() => !!globalThis.providerProbe)
  await page.evaluate(() => globalThis.providerProbe.prepare('game', 'pygame-update-none'))
  expect((await page.evaluate(() => globalThis.providerProbe.read('game'))).status).toBe('ready')
  await page.evaluate(() => globalThis.providerProbe.run('game'))
  const output = () =>
    page.evaluate(() =>
      globalThis.providerProbe
        .read('game')
        .events.flatMap((event) => (event.type === 'console' ? [event.text] : []))
        .join(''),
    )
  await expect.poll(output).toContain('update-none-ready')
  const frame = page.frames().find((candidate) => candidate.url().includes('/frame.html'))!
  const canvas = frame.locator('canvas')
  const pixel = () =>
    canvas.evaluate((node: HTMLCanvasElement) => [
      ...node.getContext('2d')!.getImageData(20, 20, 1, 1).data,
    ])
  expect(await pixel()).toEqual([0, 0, 255, 255])
  await canvas.press('r')
  await expect.poll(output).toContain('update-all-ready')
  expect(await pixel()).toEqual([255, 0, 0, 255])
  await testInfo.attach('updated-screen', {
    body: await canvas.screenshot({ path: testInfo.outputPath('update-all.png') }),
    contentType: 'image/png',
  })
  await page.evaluate(() => globalThis.providerProbe.dispose('game'))
})

for (const { key } of PYGAME_GAMES)
  test(`Pygame-ce gallery game ${key} runs with assets and input`, async ({ page }, testInfo) => {
    await page.goto('/provider')
    await page.waitForFunction(() => !!globalThis.providerProbe)
    await page.evaluate(
      (name) => globalThis.providerProbe.prepare('game', name),
      `pygame-example-${key}`,
    )
    const ready = await page.evaluate(() => globalThis.providerProbe.read('game'))
    expect(ready.status, JSON.stringify(ready)).toBe('ready')
    await page.locator('iframe').evaluate((frame) => {
      frame.style.cssText = 'width:1000px;height:700px;border:0'
    })
    await page.evaluate(() => globalThis.providerProbe.run('game'))
    const frame = page.frames().find((candidate) => candidate.url().includes('/frame.html'))!
    const canvas = frame.locator('canvas')
    await expect(canvas).toHaveCount(1, { timeout: 30_000 })
    await canvas.press('Enter')
    await canvas.press('ArrowRight')
    await canvas.press('Space')
    await expect
      .poll(() => page.evaluate(() => globalThis.providerProbe.read('game').status), {
        timeout: 10_000,
      })
      .toBe('running')
    const colours = () =>
      canvas.evaluate((node: HTMLCanvasElement) => {
        const pixels = node.getContext('2d')!.getImageData(0, 0, node.width, node.height).data
        const seen = new Set<number>()
        for (let index = 0; index < pixels.length; index += 4 * 97)
          seen.add((pixels[index]! << 16) | (pixels[index + 1]! << 8) | pixels[index + 2]!)
        return seen.size
      })
    await expect.poll(colours).toBeGreaterThan(3)
    await testInfo.attach('screen', {
      body: await canvas.screenshot({ path: testInfo.outputPath(`${key}.png`) }),
      contentType: 'image/png',
    })
    const state = await page.evaluate(() => globalThis.providerProbe.read('game'))
    const output = state.events
      .flatMap((event) => (event.type === 'console' ? [event.text] : []))
      .join('')
    await testInfo.attach('stdout', { body: output, contentType: 'text/plain' })
    expect(state.status, `${JSON.stringify(state.events.at(-1))}\n${output}`).toBe('running')
    await page.evaluate(() => globalThis.providerProbe.dispose('game'))
  })
