import { afterEach, describe, expect, setSystemTime, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { SCENE_METHODS } from './catalog'
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
    clear() {
      draws.push(['clear'])
    },
    warn: (message: string) => warnings.push(message),
    ...host,
  }) as SceneTwoDApi & { reset(): void }
  const images = () => draws.filter((draw) => typeof draw[0] === 'object')
  return { api, draws, warnings, images, camera }
}

afterEach(() => {
  setSystemTime()
})

describe('shared perspective and layers', () => {
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

  test('encounters use swept progress, lateral width and never teleport or remote overlap', () => {
    const { api } = scene()
    api.createTrack('snow', 25, 240, 100, 80)
    api.placeTrackObject('snow', 'flag', 'red', 100, 500, 40, 80)
    expect(api.trackTouching('snow', 'flag', 100, 20)).toBe(false)
    api.advanceTrack('snow', 700)
    expect(api.trackPassed('snow', 'flag')).toBe(true)
    expect(api.trackTouching('snow', 'flag', 100, 20)).toBe(true)
    expect(api.trackTouching('snow', 'flag', 131, 20)).toBe(false)
    api.advanceTrack('snow', 0)
    expect(api.trackPassed('snow', 'flag')).toBe(false)
    api.advanceTrack('snow', -300)
    expect(api.trackPassed('snow', 'flag')).toBe(true)
    api.cameraTrack('snow', 0, 600)
    expect(api.trackPassed('snow', 'flag')).toBe(false)
    api.removeTrackObject('snow', 'flag')
    api.advanceTrack('snow', -200)
    expect(api.trackPassed('snow', 'flag')).toBe(false)
  })

  test('paints far to near, keeps equal-depth order, removes and resets', () => {
    const { api, draws, images, warnings } = scene()
    api.createTrack('snow', 25, 240, 100, 80)
    api.placeTrackObject('snow', 'near', 'near', 0, 100, 20, 40)
    api.placeTrackObject('snow', 'far', 'far', 0, 400, 20, 40)
    api.placeTrackObject('snow', 'equal', 'equal', 0, 400, 20, 40)
    api.drawTrack('snow')
    expect(images().map((d) => (d[0] as ImageStub).name)).toEqual(['far', 'equal', 'near'])
    expect(images()[0]?.slice(1)).toEqual([315, 210, 10, 20])
    api.reset()
    draws.length = 0
    api.drawTrack('snow')
    expect(draws).toEqual([])
    expect(warnings).toEqual(['A pista “snow” ainda não existe. Use antes o bloco “Criar pista”.'])
  })

  test('only what is between near and far is sorted and painted', () => {
    const { api, draws, images } = scene()
    api.createTrack('snow', 25, 240, 100, 80)
    api.viewTrack('snow', 20, 900)
    for (let index = 0; index < 400; index++)
      api.placeTrackObject('snow', `tree${index}`, 'tree', 0, 300 + index * 50, 20, 40)
    api.drawTrack('snow')
    // Distance = z + 80 must stay within 20..900: z from 300 to 820, eleven trees.
    expect(images()).toHaveLength(11)
    expect(draws.filter((d) => d[0] === 'save')).toHaveLength(1)
    // With nothing in view the canvas is not touched at all.
    api.cameraTrack('snow', 0, 1_000_000)
    draws.length = 0
    api.drawTrack('snow')
    expect(draws).toEqual([])
  })

  test('a loop counter is a valid object name, and text and number name the same object', () => {
    const { api, images, warnings } = scene()
    api.createTrack('snow', 25, 240, 100, 80)
    api.placeTrackObject('snow', 7 as unknown as string, 'star', 0, 300, 20, 20)
    api.advanceTrack('snow', 400)
    expect(api.trackPassed('snow', '7')).toBe(true)
    expect(api.trackTouching('snow', 7 as unknown as string, 0, 20)).toBe(true)
    api.cameraTrack('snow', 0, 0)
    api.moveTrackObject('snow', '7', 0, 500)
    api.drawTrack('snow')
    expect(images()).toHaveLength(1)
    api.removeTrackObject('snow', 7 as unknown as string)
    api.advanceTrack('snow', 600)
    expect(api.trackPassed('snow', '7')).toBe(false)
    // Anti-vacuum: what is not a name is still refused, with a message that names the block.
    api.placeTrackObject('snow', {} as unknown as string, 'star', 0, 300, 20, 20)
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('“Na pista … objeto”')
    // The second refusal repeats the message (shown once), so it is checked by what
    // it did not create: the camera crosses z 300 and finds no object called "NaN".
    api.placeTrackObject('snow', Number.NaN as unknown as string, 'star', 0, 300, 20, 20)
    api.cameraTrack('snow', 0, 0)
    api.advanceTrack('snow', 600)
    expect(api.trackPassed('snow', 'NaN')).toBe(false)
    expect(warnings).toHaveLength(1)
  })

  test('the camera may be placed after advancing without erasing the step', () => {
    const { api } = scene()
    api.createTrack('snow', 25, 240, 100, 80)
    api.placeTrackObject('snow', 'flag', 'red', 100, 500, 40, 80)
    api.advanceTrack('snow', 700)
    // Same distance, new lateral position: the natural order "advance, then camera".
    api.cameraTrack('snow', 30, 700)
    expect(api.trackValue('snow', 'x')).toBe(30)
    expect(api.trackPassed('snow', 'flag')).toBe(true)
    // Anti-vacuum: a different distance is a jump, and a jump crosses nothing.
    api.cameraTrack('snow', 30, 701)
    expect(api.trackPassed('snow', 'flag')).toBe(false)
  })

  test('a name with spaces around it is the same name', () => {
    const { api, warnings, images } = scene()
    api.createSceneLayer('ceu ', 'sky', 'back')
    api.transformSceneLayer(' ceu', 10, 20, 1, 1)
    api.drawSceneLayers('back')
    expect(warnings).toEqual([])
    expect(images()[0]?.slice(1, 3)).toEqual([10, 20])
  })

  test('opacity past the ends is clamped; other invalid numbers are reported by block', () => {
    const { api, warnings, images, draws } = scene()
    api.createSceneLayer('sky', 'sky', 'back')
    // A fade counting in steps overshoots by a hair: position must still apply.
    api.transformSceneLayer('sky', 150, 0, 1, 1.0000000001)
    api.drawSceneLayers('back')
    expect(images()[0]?.[1]).toBe(150)
    api.transformSceneLayer('sky', 150, 0, 1, -0.5)
    draws.length = 0
    api.drawSceneLayers('back')
    expect(images()).toEqual([])
    expect(warnings).toEqual([])
    api.createTrack('snow', 25, 240, 100, 80)
    api.placeTrackObject('snow', 'flag', 'red', 0, 500, 40, 80)
    api.orderSceneLayer('sky', Number.NaN)
    api.cameraTrack('snow', Number.NaN, 0)
    api.advanceTrack('snow', Number.NaN)
    api.moveTrackObject('snow', 'flag', 0, Number.NaN)
    expect(api.trackTouching('snow', 'flag', Number.NaN, 20)).toBe(false)
    expect(warnings.map((message) => message.match(/“([^”]+)”/)?.[1])).toEqual([
      'Ordem da camada',
      'Câmera da pista',
      'Avançar na pista',
      'Na pista … mover objeto',
      'Na pista … encontrou objeto',
    ])
    // Nothing moved: the camera, the progress and the object are where they were.
    expect(api.trackValue('snow', 'distance')).toBe(0)
    expect(api.trackValue('snow', 'x')).toBe(0)
    // An object that is gone is asked about every frame by a correct game: silence.
    api.removeTrackObject('snow', 'flag')
    api.moveTrackObject('snow', 'flag', 0, 10)
    expect(api.trackTouching('snow', 'flag', 0, 20)).toBe(false)
    expect(warnings).toHaveLength(5)
  })

  test('the engine chooses the smoothing of each image, layer and object', () => {
    const asked: unknown[][] = []
    const { api, images } = scene(
      {},
      {
        smoothing: (_ctx: unknown, img: ImageStub, width: number) => asked.push([img.name, width]),
      },
    )
    api.createSceneLayer('sky', 'sky', 'back')
    api.transformSceneLayer('sky', 0, 0, 4, 1)
    api.createTrack('snow', 25, 240, 100, 80)
    api.placeTrackObject('snow', 'flag', 'red', 0, 160, 20, 40)
    api.drawSceneLayers('back')
    api.drawTrack('snow')
    expect(images()).toHaveLength(2)
    expect(asked).toEqual([
      ['sky', 400],
      ['red', 20],
    ])
  })

  test('without a frame loop, a late image repaints the picture once, in order', () => {
    const ready = new Set<string>()
    const waiting: { name: string; redraw: () => void }[] = []
    const { api, draws, images } = scene(
      {},
      {
        image: (name: string) => (ready.has(name) ? { width: 100, height: 100, name } : null),
        late: (name: string, redraw: () => void) => waiting.push({ name, redraw }),
      },
    )
    api.createSceneLayer('sky', 'sky', 'back')
    api.createSceneLayer('glow', 'glow', 'front')
    api.createTrack('snow', 25, 240, 100, 80)
    api.placeTrackObject('snow', 'flag', 'red', 0, 160, 20, 40)
    api.drawSceneLayers('back')
    api.drawTrack('snow')
    api.drawSceneLayers('front')
    expect(images()).toEqual([])
    expect(waiting.map((entry) => entry.name)).toEqual(['sky', 'red', 'glow'])
    // The front image lands first: the whole picture is repeated, so the background
    // pass (which clears) can never run after the front one and erase it.
    ready.add('glow').add('sky').add('red')
    draws.length = 0
    waiting[2]?.redraw()
    expect(draws.filter((d) => d[0] === 'clear')).toHaveLength(1)
    expect(images().map((d) => (d[0] as ImageStub).name)).toEqual(['sky', 'red', 'glow'])
    // Repeating is not drawing again: the list does not grow with each repaint.
    draws.length = 0
    waiting[0]?.redraw()
    expect(images().map((d) => (d[0] as ImageStub).name)).toEqual(['sky', 'red', 'glow'])
    // A new background pass starts the picture over.
    api.drawSceneLayers('back')
    draws.length = 0
    waiting[0]?.redraw()
    expect(images().map((d) => (d[0] as ImageStub).name)).toEqual(['sky'])
  })

  test('two layers may reuse an image, sort stably, hide and clear only the background pass', () => {
    const { api, draws, images } = scene()
    api.createSceneLayer('first', 'mountains', 'back')
    api.createSceneLayer('second', 'mountains', 'back')
    api.transformSceneLayer('second', 120, 50, 2, 1)
    api.orderSceneLayer('second', -1)
    api.drawSceneLayers('back')
    expect(images().map((d) => d.slice(1))).toEqual([
      [120, 50, 200, 200],
      [0, 0, 100, 100],
    ])
    expect(draws.filter((d) => d[0] === 'clear')).toHaveLength(1)
    api.showSceneLayer('second', false)
    draws.length = 0
    api.drawSceneLayers('back')
    expect(images()).toHaveLength(1)
    api.createSceneLayer('overlay', 'glass', 'front')
    draws.length = 0
    api.drawSceneLayers('front')
    expect(draws.some((d) => d[0] === 'clear')).toBe(false)
    expect(draws.filter((d) => d[0] === 'save')).toHaveLength(
      draws.filter((d) => d[0] === 'restore').length,
    )
  })

  test('the cached draw order follows every change to the set of layers', () => {
    const { api, draws, images } = scene()
    const painted = () => {
      draws.length = 0
      api.drawSceneLayers('back')
      return images().map((d) => (d[0] as ImageStub).name)
    }
    api.createSceneLayer('a', 'a', 'back')
    api.createSceneLayer('b', 'b', 'back')
    expect(painted()).toEqual(['a', 'b'])
    api.orderSceneLayer('a', 5)
    expect(painted()).toEqual(['b', 'a'])
    api.createSceneLayer('c', 'c', 'back')
    expect(painted()).toEqual(['b', 'c', 'a'])
    api.removeSceneLayer('b')
    expect(painted()).toEqual(['c', 'a'])
    // Creating again keeps the place in line and returns the layer to its defaults.
    api.createSceneLayer('a', 'a2', 'front')
    expect(painted()).toEqual(['c'])
    api.reset()
    expect(painted()).toEqual([])
  })

  test('parallax applies camera once and repetition has a finite budget', () => {
    const { api, draws, images, warnings } = scene()
    api.createSceneLayer('cloud', 'cloud', 'back')
    api.motionSceneLayer('cloud', 'parallax', 0.5, 0.25, 'none')
    api.drawSceneLayers('back')
    expect(images()[0]?.slice(1)).toEqual([-20, -5, 100, 100])
    api.removeSceneLayer('cloud')
    api.createSceneLayer('tiny', 'tiny', 'back')
    api.motionSceneLayer('tiny', 'screen', 0, 0, 'both')
    draws.length = 0
    api.drawSceneLayers('back')
    api.drawSceneLayers('back')
    expect(images()).toHaveLength(0)
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('4096')
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
    // Code written by hand may still pass a boolean; anything else is refused.
    api.motionSceneLayer('hills', 'screen', 0, 0, 'none')
    expect(painted()).toHaveLength(1)
    api.motionSceneLayer('hills', 'screen', 0, 0, true as unknown as 'both')
    const everySide = painted().length
    expect(everySide).toBeGreaterThan(1)
    api.motionSceneLayer('hills', 'screen', 0, 0, false as unknown as 'none')
    expect(painted()).toHaveLength(1)
    api.motionSceneLayer('hills', 'screen', 0, 0, true as unknown as 'both')
    api.motionSceneLayer('hills', 'screen', 0, 0, 'diagonal' as unknown as 'both')
    expect(painted()).toHaveLength(everySide)
  })

  test('removing the last background layer clears its previous pixels', () => {
    const { api, draws } = scene()
    api.createSceneLayer('last', 'cloud', 'back')
    api.drawSceneLayers('back')
    api.removeSceneLayer('last')
    draws.length = 0
    api.drawSceneLayers('back')
    expect(draws).toEqual([['save'], ['clear'], ['restore']])
  })

  test('a creator running every frame is reported once; a restart now and then is not', () => {
    const start = Date.UTC(2026, 9, 1)
    const frames = scene()
    for (let frame = 0; frame < 120; frame++) {
      setSystemTime(new Date(start + frame * 16))
      frames.api.createTrack('snow', 25, 240, 100, 80)
      frames.api.createSceneLayer('sky', 'sky', 'back')
    }
    expect(frames.warnings).toHaveLength(2)
    expect(frames.warnings.join('\n')).toContain('“Criar pista” está rodando a cada quadro')
    expect(frames.warnings.join('\n')).toContain('“Criar camada” está rodando a cada quadro')
    // The same number of creations, a second apart: a child restarting the game.
    const restarts = scene()
    for (let match = 0; match < 120; match++) {
      setSystemTime(new Date(start + match * 1000))
      restarts.api.createTrack('snow', 25, 240, 100, 80)
      restarts.api.createSceneLayer('sky', 'sky', 'back')
    }
    expect(restarts.warnings).toEqual([])
    // A restart key held for half a second rebuilds thirty frames in a row: not a loop.
    const held = scene()
    for (let frame = 0; frame < 40; frame++) {
      setSystemTime(new Date(start + frame * 16))
      held.api.createTrack('snow', 25, 240, 100, 80)
    }
    expect(held.warnings).toEqual([])
    // Sixty-four mistyped names spend the common budget; this warning has its own.
    const noisy = scene()
    for (let index = 0; index < 70; index++) noisy.api.removeTrackObject(`pista${index}`, 'x')
    expect(noisy.warnings).toHaveLength(64)
    for (let frame = 0; frame < 120; frame++) {
      setSystemTime(new Date(start + frame * 16))
      noisy.api.createTrack('snow', 25, 240, 100, 80)
    }
    expect(noisy.warnings).toHaveLength(65)
    expect(noisy.warnings[64]).toContain('“Criar pista” está rodando a cada quadro')
  })

  test('every block named in a warning exists with that face', () => {
    const faces = SCENE_METHODS.map((entry) => entry.message.replace(/%\d+/g, '…'))
    const quoted = [...sceneTwoDRuntime.matchAll(/“([^”]+)”/g)]
      .map((match) => match[1] ?? '')
      // Interpolated names and the project area are not block faces.
      .filter((text) => !text.includes("'") && text !== 'Ao iniciar')
    expect(quoted.length).toBeGreaterThan(8)
    for (const text of new Set(quoted)) {
      expect(
        faces.some((face) => face.startsWith(text)),
        text,
      ).toBe(true)
    }
    // The rule bites: a face that no block has is refused.
    expect(faces.some((face) => face.startsWith('Apagar camada'))).toBe(false)
  })

  test('the modules a server package reaches carry no browser types', () => {
    // Members reaches the block catalog, and from it the contract, without the DOM lib.
    for (const file of ['contract.ts', 'catalog.ts', 'ir.ts', 'blocks.ts']) {
      const source = readFileSync(join(import.meta.dir, file), 'utf8')
      expect(source, file).not.toMatch(/\b(CanvasRenderingContext2D|HTML[A-Z]\w*Element|Window)\b/)
      expect(source, file).not.toContain("from './host'")
    }
    expect(readFileSync(join(import.meta.dir, 'host.ts'), 'utf8')).toContain(
      'CanvasRenderingContext2D',
    )
  })
})
