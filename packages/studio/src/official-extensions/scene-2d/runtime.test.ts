import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { SceneTwoDApi } from './contract'
import { sceneTwoDRuntime } from './runtime'

interface ImageStub {
  width: number
  height: number
  name: string
}

function scene(sizes: Record<string, [number, number]> = {}, host: Record<string, unknown> = {}) {
  const draws: unknown[][] = []
  const warnings: string[] = []
  const ctx = {
    globalAlpha: 1,
    save() {
      draws.push(['save'])
    },
    restore() {
      draws.push(['restore'])
    },
    drawImage(...args: unknown[]) {
      draws.push(args)
    },
  }
  const camera = { x: 40, y: 20 }
  const api = new Function('host', `${sceneTwoDRuntime}; return createScene2D(host);`)({
    context: () => ctx,
    width: () => 640,
    height: () => 720,
    image: (name: string): ImageStub => {
      const [width, height] = sizes[name] ?? (name === 'tiny' ? [1, 1] : [100, 100])
      return { width, height, name }
    },
    camera: () => camera,
    screen() {},
    warn: (message: string) => warnings.push(message),
    ...host,
  }) as SceneTwoDApi & { reset(): void }
  const images = () => draws.filter((draw) => typeof draw[0] === 'object')
  return { api, draws, warnings, images, camera }
}

describe('shared perspective and layers', () => {
  test('layers keep their order, transparency and smoothing across replacements and reset', () => {
    const smoothing: unknown[][] = []
    const { api, draws, images } = scene(
      {},
      {
        smoothing: (_ctx: unknown, image: ImageStub, width: number) =>
          smoothing.push([image.name, width]),
      },
    )
    api.createSceneLayer('a', 'mountains', 'back')
    api.createSceneLayer('b', 'mountains', 'back')
    api.transformSceneLayer('b', 120, 50, 2, 1)
    api.orderSceneLayer('b', -1)
    api.drawSceneLayers('back')
    expect(images().map((draw) => draw.slice(1))).toEqual([
      [120, 50, 200, 200],
      [0, 0, 100, 100],
    ])
    expect(smoothing).toEqual([
      ['mountains', 200],
      ['mountains', 100],
    ])
    api.transformSceneLayer('b', 120, 50, 2, -0.1)
    draws.length = 0
    api.drawSceneLayers('back')
    expect(images()).toHaveLength(1)
    api.createSceneLayer('a', 'glow', 'front')
    draws.length = 0
    api.drawSceneLayers('back')
    expect(images()).toHaveLength(0)
    api.drawSceneLayers('front')
    expect(images().map((draw) => (draw[0] as ImageStub).name)).toEqual(['glow'])
    api.reset()
    draws.length = 0
    api.drawSceneLayers('front')
    expect(images()).toHaveLength(0)
  })

  test('tiling a tiny image has a finite draw budget and reports the problem once', () => {
    const { api, images, warnings } = scene()
    api.createSceneLayer('tiny', 'tiny', 'back')
    api.motionSceneLayer('tiny', 'screen', 0, 0, 'both')
    api.drawSceneLayers('back')
    api.drawSceneLayers('back')
    expect(images()).toHaveLength(0)
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('4096')
  })
  test('parallax overflow never sends non-finite positions to the canvas', () => {
    const { api, images } = scene()
    api.createSceneLayer('cloud', 'cloud', 'back')
    api.motionSceneLayer('cloud', 'parallax', Number.MAX_VALUE, 1, 'none')
    api.drawSceneLayers('back')
    expect(images()).toEqual([])
  })

  test('projects in logical pixels with clipping, near/far and an anchored ground point', () => {
    const { api } = scene()
    api.createTrack('snow', 25, 240, 100, 80)
    api.viewTrack('snow', 20, 900)
    api.cameraTrack('snow', 20, 1000)
    expect(api.projectTrack('snow', 120, 1400, 'scale')).toBe(0.5)
    expect(api.projectTrack('snow', 120, 1400, 'x')).toBe(370)
    expect(api.projectTrack('snow', 120, 1400, 'y')).toBe(230)
    expect(api.projectTrack('snow', 0, 919, 'visible')).toBe(0)
    expect(api.projectTrack('snow', 0, 2000, 'visible')).toBe(0)
    expect(api.projectTrack('snow', 0, Number.NaN, 'visible')).toBe(0)
    api.cameraTrack('snow', -Number.MAX_VALUE, 1000)
    expect(api.projectTrack('snow', Number.MAX_VALUE, 1400, 'visible')).toBe(0)
  })

  test('a name with spaces around it is the same name', () => {
    const { api, warnings, images } = scene()
    api.createSceneLayer('ceu ', 'sky', 'back')
    api.transformSceneLayer(' ceu', 10, 20, 1, 1)
    api.drawSceneLayers('back')
    expect(warnings).toEqual([])
    expect(images()[0]?.slice(1, 3)).toEqual([10, 20])
  })

  test('a strip repeats sideways without stacking, and an aligned copy is painted once', () => {
    const { api, draws, images, camera } = scene({ hills: [640, 200] })
    camera.x = 0
    camera.y = 0
    const painted = () => {
      draws.length = 0
      api.drawSceneLayers('back')
      return images().map((d) => d.slice(1))
    }
    api.createSceneLayer('hills', 'hills', 'back')
    api.transformSceneLayer('hills', 0, 300, 1, 1)
    api.motionSceneLayer('hills', 'parallax', 0.5, 0, 'x')
    // Aligned with the screen: one copy covers it; no extra copy off-screen.
    expect(painted()).toEqual([[0, 300, 640, 200]])
    // Shifted by the camera: two copies side by side, both in the same row.
    camera.x = 100
    expect(painted()).toEqual([
      [-50, 300, 640, 200],
      [590, 300, 640, 200],
    ])
    // Anti-vacuum: repeating on every side does stack the strip down the screen.
    api.motionSceneLayer('hills', 'parallax', 0.5, 0, 'both')
    const rows = new Set(painted().map((d) => d[1]))
    expect([...rows].sort((a, b) => Number(a) - Number(b))).toEqual([-100, 100, 300, 500, 700])
    // Vertical only: one column.
    api.motionSceneLayer('hills', 'parallax', 0.5, 0, 'y')
    expect(new Set(painted().map((d) => d[0]))).toEqual(new Set([-50]))
    // Changing repeat modes takes effect immediately; an invalid mode preserves it.
    api.motionSceneLayer('hills', 'screen', 0, 0, 'none')
    expect(painted()).toHaveLength(1)
    api.motionSceneLayer('hills', 'screen', 0, 0, 'both')
    const everySide = painted().length
    expect(everySide).toBeGreaterThan(1)
    api.motionSceneLayer('hills', 'screen', 0, 0, 'none')
    expect(painted()).toHaveLength(1)
    api.motionSceneLayer('hills', 'screen', 0, 0, 'both')
    api.motionSceneLayer('hills', 'screen', 0, 0, 'diagonal' as unknown as 'both')
    expect(painted()).toHaveLength(everySide)
  })

  test('the modules a server package reaches carry no browser types', () => {
    // Members reaches the block catalog, and from it the contract, without the DOM lib.
    for (const file of [
      'contract.ts',
      'spriteContract.ts',
      'spriteCatalog.ts',
      'catalog.ts',
      'ir.ts',
      'blocks.ts',
    ]) {
      const source = readFileSync(join(import.meta.dir, file), 'utf8')
      expect(source, file).not.toMatch(/\b(CanvasRenderingContext2D|HTML[A-Z]\w*Element|Window)\b/)
      expect(source, file).not.toContain("from './host'")
    }
    expect(readFileSync(join(import.meta.dir, 'host.ts'), 'utf8')).toContain(
      'CanvasRenderingContext2D',
    )
  })
})
