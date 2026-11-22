import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(new URL('../../../studio/package.json', import.meta.url))
const { chromium } = require('@playwright/test')
const [url, fixture] = process.argv.slice(2)
const expected = JSON.parse(fixture)
const browser = await chromium.launch({ channel: 'chromium', headless: true, timeout: 7_500 })
try {
  const page = await browser.newPage({ viewport: { width: 920, height: 720 }, hasTouch: true })
  page.setDefaultTimeout(5_000)
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  try {
    await page.waitForFunction(
      () => window.pintaGame?.surface.context.getImageData(320, 240, 1, 1).data[3] === 255,
    )
  } catch (error) {
    const status = await page.locator('#pinta-status').textContent()
    throw new Error(`Phaser did not boot: ${status}. ${errors.join(' ')}`, { cause: error })
  }
  const before = await page.evaluate(() => ({
    version: window.Phaser.VERSION,
    origin: window.pintaGame.player.scene.origin,
    position: window.pintaGame.player.position,
    layers: window.pintaGame.player.scene.layers.length,
    front: Array.from(window.pintaGame.surface.context.getImageData(320, 240, 1, 1).data),
    friction: window.pintaGame.maps.mapTileProperty('mapa', 'vila-pecas', 0, 'atrito'),
    projection: window.pintaGame.player.scene.projection?.kind ?? null,
  }))
  assert.equal(before.version, '3.90.0')
  assert.deepEqual(before.origin, expected.origin)
  assert.deepEqual(before.position, { x: -8, y: -8 })
  assert.equal(before.projection, expected.projection)
  assert.equal(before.layers, 18)
  assert.equal(before.friction, 0.8)
  // The exact orthogonal pixels belong to the square Vila; a projected Vila draws elsewhere.
  if (!expected.projection) assert.deepEqual(before.front, [201, 181, 122, 255])
  await page.keyboard.down('ArrowRight')
  try {
    await page.waitForFunction((id) => window.pintaGame.player.scene.id === id, expected.linked)
  } catch (error) {
    const last = await page.evaluate(() => ({
      scene: window.pintaGame.player.scene.name,
      at: window.pintaGame.player.position,
    }))
    throw new Error(`Door not reached: ${JSON.stringify(last)}. ${errors.join(' ')}`, {
      cause: error,
    })
  } finally {
    await page.keyboard.up('ArrowRight')
  }
  const destinationProjection = await page.evaluate(
    () => window.pintaGame.player.scene.projection?.kind ?? null,
  )
  assert.equal(destinationProjection, expected.destinationProjection)
  let cabinPixel = null
  let painted = null
  if (expected.projection) {
    painted = await page.evaluate(() =>
      window.pintaGame.surface.context
        .getImageData(0, 0, 640, 480)
        .data.some((value, index) => index % 4 === 0 && value !== 232),
    )
    assert.equal(painted, true)
  } else {
    cabinPixel = await page.evaluate(() => {
      const { player, surface } = window.pintaGame
      const { x, y } = player.position
      return Array.from(
        surface.context.getImageData(Math.round(330 - x), Math.round(250 - y), 1, 1).data,
      )
    })
    assert.deepEqual(cabinPixel, [161, 135, 82, 255])
  }
  await page.goto(new URL('edit/', url).href, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => window.pintaGame?.surface.context.getImageData(320, 240, 1, 1).data[3] === 255,
  )
  const newFront = await page.evaluate(() =>
    Array.from(window.pintaGame.surface.context.getImageData(320, 240, 1, 1).data),
  )
  if (!expected.projection) assert.deepEqual(newFront, [216, 148, 105, 255])
  for (const [path, error] of [
    ['bad/', 'PNG'],
    ['bad-raster/', 'pixels'],
  ]) {
    await page.goto(new URL(path, url).href, { waitUntil: 'domcontentloaded' })
    try {
      await page.waitForFunction(
        (message) => document.querySelector('#pinta-status').textContent.includes(message),
        error,
      )
    } catch (cause) {
      const status = await page.locator('#pinta-status').textContent()
      const canvasCount = await page.locator('canvas').count()
      throw new Error(`${path}: ${status}. Canvas count: ${canvasCount}.`, { cause })
    }
    assert.equal(await page.locator('canvas').count(), 0)
    assert.equal(await page.evaluate(() => !!window.pintaGame), false)
  }
  assert.deepEqual(errors, [])
  console.log(
    JSON.stringify({
      browser: browser.version(),
      phaser: before.version,
      signedStart: before.position,
      projection: before.projection,
      destinationProjection,
      door: true,
      front: before.front,
      cabin: cabinPixel,
      canvas: painted,
      updated: newFront,
      corruptLinkedImage: ['header', 'CRC valid but invalid raster'],
      mainBytes: expected.mainBytes,
      errors,
    }),
  )
} finally {
  await browser.close()
}
