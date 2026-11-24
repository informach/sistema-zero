import { expect, test } from '@playwright/test'
import type { GameTwoDRuntimeApi } from '../src/official-extensions/game-2d/runtimeContract'
import type { GameKitRuntimeApi } from '../src/official-extensions/game-2d-advanced/runtimeContract'
import { pngWorld } from '../src/official-extensions/map-2d/__tests__/regionFixture'
import type { MapTwoDApi } from '../src/official-extensions/map-2d/contract'
import { mapTwoDRegionBootstrap } from '../src/official-extensions/map-2d/regionBootstrap'

declare const window: Window & {
  SZGame2D?: GameTwoDRuntimeApi & MapTwoDApi
  SZGameKit?: GameKitRuntimeApi & MapTwoDApi
  regionClock?: number
}

for (const engine of ['g2d', 'gk'] as const) {
  test(`${engine}: PNG regional no motor real com pixels, câmera assinada e porta`, async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.setContent(
      '<!doctype html><html><head><title>Pinta</title></head><body></body></html>',
    )
    await page.evaluate(() => {
      window.regionClock = 0
      const now = () => window.regionClock ?? 0
      Date.now = now
      Object.defineProperty(performance, 'now', { value: now })
    })
    await page.addScriptTag({
      content: await mapTwoDRegionBootstrap(engine, await pngWorld(), 'desenho'),
    })
    const result = await page.evaluate(async (engine) => {
      const api = engine === 'g2d' ? window.SZGame2D : window.SZGameKit
      if (!api || window.regionClock === undefined) throw new Error('Motor regional indisponível')
      if ('setupStage' in api) api.setupStage(64, 64, '#000')
      else {
        api.setup({ width: 64, height: 64 })
        api.start()
      }
      api.createMapScene('mapa', 'desenho')
      const x = api.mapSpawn('mapa', 'x'),
        y = api.mapSpawn('mapa', 'y')
      const w = api.mapSize('mapa', 'width'),
        h = api.mapSize('mapa', 'height')
      if ('setupStage' in api) api.cameraFollow(api.createSprite({ x, y, w: 4, h: 4 }), w, h)
      else {
        const character = api.createCharacter({ w: 4, h: 4 })
        api.placeCharacter(character, x, y)
        api.cameraFollow(character, w, h)
      }
      const ready = new Image()
      ready.src = api.mapResourceImage('mapa', 'chao')!
      await ready.decode()
      const canvas = document.querySelector<HTMLCanvasElement>(
        engine === 'g2d' ? 'canvas' : '#szgk-canvas',
      )!
      const ctx = canvas.getContext('2d')!
      let calls = 0
      const draw = ctx.drawImage
      ctx.drawImage = new Proxy(draw, {
        apply(fn, target, args) {
          calls++
          return Reflect.apply(fn, target, args)
        },
      })
      const pixel = (x: number, y: number) =>
        Array.from(
          ctx.getImageData(
            Math.floor((x * canvas.width) / 64),
            Math.floor((y * canvas.height) / 64),
            1,
            1,
          ).data,
        )
      api.drawMapScene('mapa', 'back')
      const first = pixel(4, 4)
      const drawnBack = calls
      const beforeFront = pixel(20, 4)
      api.drawMapScene('mapa', 'front')
      const front = pixel(20, 4)
      const drawnFront = calls - drawnBack
      window.regionClock = 120
      api.drawMapScene('mapa', 'back')
      const animated = pixel(4, 4)
      const fall = { x: -508, y: -465, w: 4, h: 4, vx: 0, vy: 9, _prevX: -508, _prevY: -474 }
      api.collideMapScene(fall, 'mapa')
      const travel = { x: -478, y: -510, w: 4, h: 4 }
      api.useMapDoor('mapa', travel, api.mapObjectById('mapa', 'door'))
      return {
        x,
        y,
        first,
        beforeFront,
        front,
        animated,
        drawnBack,
        drawnFront,
        floor: fall.y,
        travel,
      }
    }, engine)
    expect(errors).toEqual([])
    expect(result.x).toBe(-508)
    expect(result.y).toBe(-508)
    expect(result.first).toEqual([38, 88, 232, 255])
    expect(result.front).toEqual([255, 232, 23, 255])
    expect(result.beforeFront).not.toEqual(result.front)
    expect(result.animated).toEqual([255, 232, 23, 255])
    expect(result.drawnBack).toBe(5)
    expect(result.drawnFront).toBe(1)
    expect(result.floor).toBe(-468)
    expect(result.travel).toMatchObject({ x: -474, y: -508 })
  })
}
