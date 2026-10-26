import { expect, test } from '@playwright/test'
import type {} from '../../../experiments/studio-python-runtime/providerHost'

// Real pygame-ce in the protected worker: the screen of each frame crosses to the canvas as
// pixels. This probe draws the load of the biggest gallery maps and records the frame rate.
test('Pygame-ce keeps a playable frame rate with a full tile map, alpha sprites and text', async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000)
  await page.goto('/provider')
  await page.waitForFunction(() => !!globalThis.providerProbe)
  await page.evaluate(() => globalThis.providerProbe.prepare('game', 'pygame-benchmark'))
  expect((await page.evaluate(() => globalThis.providerProbe.read('game'))).status).toBe('ready')
  await page.locator('iframe').evaluate((frame) => {
    frame.style.cssText = 'width:1280px;height:720px;border:0'
  })
  await page.evaluate(() => globalThis.providerProbe.run('game'))
  const samples = async () => {
    const state = await page.evaluate(() => globalThis.providerProbe.read('game'))
    const output = state.events
      .flatMap((event) => (event.type === 'console' ? [event.text] : []))
      .join('')
    return [...output.matchAll(/fps ([\d.]+)/g)].map((match) => Number(match[1]))
  }
  await expect
    .poll(async () => (await samples()).length, { timeout: 60_000 })
    .toBeGreaterThanOrEqual(8)
  const measured = await samples()
  await testInfo.attach('fps', { body: JSON.stringify(measured), contentType: 'application/json' })
  // The first seconds include the first frames (fonts, wheel import); judge the steady part.
  const steady = measured.slice(3)
  const average = steady.reduce((total, value) => total + value, 0) / steady.length
  console.log(`pygame-ce no navegador: ${average.toFixed(1)} fps (${steady.join(', ')})`)
  expect(average).toBeGreaterThanOrEqual(45)
  await page.evaluate(() => globalThis.providerProbe.dispose('game'))
})
