import { expect, test } from 'bun:test'
import { mapTwoDBootstrap } from '../bootstrap'
import type { MapTwoDApi } from '../contract'
import { mapTwoDRegionBootstrap } from '../regionBootstrap'

import { admit, image, pngWorld, regional } from './regionFixture'

type Target = 'g2d' | 'gk'
function boot(target: Target, source: string) {
  const queue: Array<(ms: number) => void> = []
  const images: string[] = []
  const win: Record<string, unknown> = {
    addEventListener() {},
    performance: { now: () => 0 },
    devicePixelRatio: 1,
  }
  class Image {
    set src(url: string) {
      images.push(url)
    }
  }
  new Function('window', 'requestAnimationFrame', 'Image', source)(
    win,
    (callback: (ms: number) => void) => queue.push(callback),
    Image,
  )
  return {
    api: win[target === 'g2d' ? 'SZGame2D' : 'SZGameKit'] as MapTwoDApi & {
      moveByVelocity(sprite: unknown, dt: number): void
    },
    images,
    frame() {
      for (const callback of queue.splice(0)) callback(16)
    },
  }
}

function body(x: number, from: number, to: number, w = 4) {
  return { x, y: to, w, h: 4, vx: 0, vy: to - from, _prevX: x, _prevY: from, onGround: false }
}

for (const target of ['g2d', 'gk'] as const) {
  test(`${target} uses signed sparse tiles, known worlds and explicit physics in the actual engine`, async () => {
    for (const mode of ['legacy', 'precise'] as const) {
      const source = await mapTwoDRegionBootstrap(target, admit(regional(mode)), 'desenho')
      expect(source.length).toBeLessThan(target === 'g2d' ? 445_000 : 485_000)
      expect(source).not.toContain('</script>')
      const { api, images, frame } = boot(target, source)
      expect(images).toEqual([])
      api.createMapScene('mapa', 'desenho')
      expect(images).toEqual([image])
      expect(api.mapSize('mapa', 'width')).toBe(160_000)
      expect(api.mapSize('mapa', 'height')).toBe(160_000)
      expect(api.mapSpawn('mapa', 'x')).toBe(-508)
      expect(api.mapLayerProperty('mapa', 'floor', 'descricao')).toBe('mundo grande')
      expect(api.mapTileProperty('mapa', 'chao', 0, 'vida')).toBe(0)
      expect(api.mapResourceImage('mapa', 'frente')).toBe(image)
      expect(api.mapResourceImage('mapa', '__proto__')).toBeNull()
      expect(api.mapObjectProperty(api.mapObjectById('mapa', 'area'), 'texto')).toBe(
        '</script><script>/**',
      )
      const marker = api.mapObjectById('mapa', 'mini/pin')!
      expect(marker.x).toBe(-463)
      expect(marker.y).toBe(-480)
      expect(api.mapObjectProperty(marker, 'linked')).toBe('mini/pin')
      const falling = body(-508, -474, -465)
      api.collideMapScene(falling, 'mapa')
      expect(falling.y).toBeCloseTo(-468, 6)
      const oneWay = body(-478, -488, target === 'gk' ? -488 : -477)
      if (target === 'gk') {
        oneWay.vy = 11
        api.moveByVelocity(oneWay, 1)
      }
      api.collideMapScene(oneWay, 'mapa')
      expect(oneWay.y).toBeCloseTo(-484, 6)
      const rising = body(-478, -473, -489)
      api.collideMapScene(rising, 'mapa')
      expect(rising.y).toBe(-489)
      // The old center-cell raster cannot classify this tiny platform. The authored
      // surface is available only when precise physics is explicitly selected.
      const tiny = body(-464, -490, -476, 2)
      api.collideMapScene(tiny, 'mapa')
      expect(tiny.y).toBeCloseTo(mode === 'legacy' ? -476 : -484.25, 6)
      const go = body(-480, -504, -504)
      go._prevX = -456
      go.vx = -24
      api.collideMapScene(go, 'mapa')
      expect(go.x).toBe(-480)
      if (mode === 'precise') {
        const wall = body(-435, -503, -503)
        wall._prevX = -454
        wall.vx = 19
        api.collideMapScene(wall, 'mapa')
        expect(wall.x).toBeCloseTo(-446.5, 6)
      }
      const visits: string[] = []
      api.mapArea('mapa', falling, 'trigger', (area) => visits.push(area.name))
      falling.x = -506
      falling.y = -506
      frame()
      frame()
      expect(visits).toEqual(['Área'])
      falling.x = -450
      frame()
      falling.x = -506
      frame()
      expect(visits).toEqual(['Área', 'Área'])
    }
  })

  test(`${target} opens a CRC-admitted PNG 5 world, uses native coordinates and switches doors by ID`, async () => {
    const admitted = await pngWorld()
    expect(admitted.maps.get('cabana')?.data.scale).toBe(2)
    expect(admitted.images.size).toBe(1)
    const { api, images } = boot(target, await mapTwoDRegionBootstrap(target, admitted, 'desenho'))
    api.createMapScene('mapa', 'desenho')
    expect(api.mapSpawn('mapa', 'x')).toBe(-508)
    const actor = body(-478, -510, -510)
    actor._prevX = 6000
    actor.vx = -6000
    api.useMapDoor('mapa', actor, api.mapObjectById('mapa', 'door'))
    expect(actor.x).toBe(-474)
    expect(actor.y).toBe(-508)
    expect(api.mapSize('mapa', 'width')).toBe(160_000)
    expect(images).toHaveLength(1)
    api.collideMapScene(actor, 'mapa')
    expect(actor.x).toBe(-474)
    const tiny = body(-464, -490, -476, 2)
    api.collideMapScene(tiny, 'mapa')
    expect(tiny.y).toBeCloseTo(-484.25, 6)
  })
}

test('only the private composition carries the regional factory and requires explicit physics throughout', async () => {
  const world = admit(regional('legacy'))
  const scene = world.maps.get(world.rootId)!.data.scene
  const invalid = { ...scene, id: 'incomplete', physics: undefined }
  const both = {
    ...world,
    maps: new Map([...world.maps, [invalid.id, { data: { scene: invalid } }]]),
  }
  await expect(mapTwoDRegionBootstrap('g2d', both)).rejects.toThrow('modo de física explícito')
  for (const target of ['g2d', 'gk'] as const)
    expect(await mapTwoDBootstrap(target)).not.toContain('_pintaRegionFactory')
})
