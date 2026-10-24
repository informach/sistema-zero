import { expect, type Page, test } from '@playwright/test'
import type {} from '../../../experiments/studio-python-runtime/providerHost'

function stdout(page: Page) {
  return page.evaluate(() =>
    globalThis.providerProbe
      .read('game')
      .events.flatMap((event) => (event.type === 'console' ? [event.text] : []))
      .join(''),
  )
}

test('Pygame Zero: actor, rotation, text, shapes, keyboard, mouse, clock and sound', async ({
  page,
}, testInfo) => {
  await page.goto('/provider')
  await page.waitForFunction(() => !!globalThis.providerProbe)
  await page.evaluate(() => globalThis.providerProbe.prepare('game', 'pgzeroGame'))
  const ready = await page.evaluate(() => globalThis.providerProbe.read('game'))
  expect(ready.status, JSON.stringify(ready)).toBe('ready')
  await page.locator('iframe').evaluate((frame) => {
    frame.style.cssText = 'width:640px;height:480px;border:0'
  })
  await page.evaluate(() => globalThis.providerProbe.run('game'))
  await expect.poll(() => stdout(page), { timeout: 40_000 }).toContain('quadros-30')
  const frame = page.frames().find((candidate) => candidate.url().includes('/frame.html'))!
  const canvas = frame.locator('canvas')
  await expect(canvas).toHaveCount(1)
  expect(await canvas.evaluate((node: HTMLCanvasElement) => [node.width, node.height])).toEqual([
    320, 240,
  ])
  // Pixels: blue fill, yellow rect and the orange actor at the centre.
  const pixels = await canvas.evaluate((node: HTMLCanvasElement) => {
    const context = node.getContext('2d')!
    const at = (x: number, y: number) => [...context.getImageData(x, y, 1, 1).data]
    return { fill: at(300, 200), rect: at(50, 195), actor: at(160, 120) }
  })
  await testInfo.attach('pixels', { body: JSON.stringify(pixels), contentType: 'application/json' })
  expect(pixels.fill.slice(0, 3)).toEqual([30, 60, 120])
  expect(pixels.rect.slice(0, 3)).toEqual([255, 255, 0])
  expect(pixels.actor[0]).toBeGreaterThan(200)
  await canvas.click({ position: { x: 160, y: 120 } })
  await canvas.press('Space')
  await expect.poll(() => stdout(page)).toContain('espaco 1')
  await expect.poll(() => stdout(page)).toContain('clique')
  await expect.poll(() => stdout(page)).toContain('relogio True')
  await testInfo.attach('stdout', { body: await stdout(page), contentType: 'text/plain' })
  await testInfo.attach('screen', {
    body: await canvas.screenshot({ path: testInfo.outputPath('screen.png') }),
    contentType: 'image/png',
  })
  const state = await page.evaluate(() => globalThis.providerProbe.read('game'))
  expect(state.status, JSON.stringify(state)).toBe('running')
  await page.evaluate(() => globalThis.providerProbe.dispose('game'))
})
