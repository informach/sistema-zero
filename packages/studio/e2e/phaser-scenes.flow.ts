import { expect, test } from '@playwright/test'
import type { PintaScene } from '@sistemazero/core/studio/pinta-scene'

type Game = {
  surface: { context: CanvasRenderingContext2D }
  hero: { x: number; y: number; body: { reset(x: number, y: number): void } }
  maps: {
    mapSize(name: string, axis: string): number
    mapObjects(name: string, type: string): Array<{ name: string }>
  }
}
declare global {
  interface Window {
    pintaGame: Game
  }
}

test('Phaser portátil renderiza o mapa real, anda, colide e atravessa portas', async ({
  page,
  request,
}, testInfo) => {
  const errors: string[] = []
  const external: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('request', (req) => {
    if (new URL(req.url()).origin !== 'http://127.0.0.1:5293') external.push(req.url())
  })
  const response = await request.get('http://127.0.0.1:5293/maps.json')
  const scenes = (await response.json()) as Record<string, PintaScene>
  const vila = scenes['vila-e-floresta']!
  expect(vila.layers).toHaveLength(18)
  expect(vila.tilesets).toHaveLength(2)
  expect(vila.layers.some((l) => l.kind === 'tiles' && l.front)).toBe(true)
  await page.goto('http://127.0.0.1:5293/')
  await expect.poll(() => page.evaluate(() => !!window.pintaGame)).toBe(true)
  await expect(page.locator('canvas')).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(() =>
        Array.from(window.pintaGame.surface.context.getImageData(33, 33, 1, 1).data),
      ),
    )
    .toEqual([74, 222, 128, 255])
  const water = () =>
    page.evaluate(() =>
      Array.from(window.pintaGame.surface.context.getImageData(28 * 16, 14 * 16, 16, 16).data).join(
        ',',
      ),
    )
  const firstWater = await water()
  await expect.poll(water).not.toBe(firstWater)
  expect(
    await page.evaluate(() => window.pintaGame.maps.mapObjects('mapa', 'door').map((o) => o.name)),
  ).toContain('Porta da cabana')
  const start = await page.evaluate(() => window.pintaGame.hero.y)
  await page.keyboard.down('ArrowDown')
  await expect.poll(() => page.evaluate(() => window.pintaGame.hero.y)).toBeGreaterThan(start + 10)
  await page.keyboard.up('ArrowDown')
  // A frente cobre o personagem sob o telhado, no canvas real do Phaser.
  await page.evaluate(async () => {
    window.pintaGame.hero.body.reset(88, 40)
    await new Promise<void>((done) =>
      requestAnimationFrame(() => requestAnimationFrame(() => done())),
    )
  })
  await expect
    .poll(() =>
      page.evaluate(() =>
        Array.from(window.pintaGame.surface.context.getImageData(89, 41, 1, 1).data),
      ),
    )
    .not.toEqual([74, 222, 128, 255])
  // Exercita a física real contra a parede da casa em x=80 (não uma grade mockada).
  await page.evaluate(() => window.pintaGame.hero.body.reset(64, 68))
  await page.keyboard.down('ArrowRight')
  await page.waitForTimeout(350)
  await page.keyboard.up('ArrowRight')
  expect(await page.evaluate(() => window.pintaGame.hero.x)).toBeLessThanOrEqual(68.1)
  await page.evaluate(() => window.pintaGame.hero.body.reset(96, 96))
  await expect
    .poll(() => page.evaluate(() => window.pintaGame.maps.mapSize('mapa', 'width')))
    .toBe(scenes.cabana!.cols * scenes.cabana!.tileSize)
  await page.evaluate(() => window.pintaGame.hero.body.reset(80, 32))
  await expect
    .poll(() => page.evaluate(() => window.pintaGame.maps.mapSize('mapa', 'width')))
    .toBe(vila.cols * vila.tileSize)
  expect(errors).toEqual([])
  expect(external).toEqual([])
  await testInfo.attach('phaser-vila', { body: await page.screenshot(), contentType: 'image/png' })
})
