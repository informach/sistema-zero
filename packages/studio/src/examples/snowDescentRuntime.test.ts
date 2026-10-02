import { afterEach, expect, test } from 'bun:test'
import { assetManifest } from '../core/project'
import { generateJS } from '../generators/js'
import type { SZIRV2 } from '../ir'
import { gameTwoDRuntime } from '../official-extensions/game-2d/runtime'
import type { GameTwoDRuntimeApi } from '../official-extensions/game-2d/runtimeContract'
import { gameKitRuntime } from '../official-extensions/game-2d-advanced/runtime'
import type { SceneTwoDApi } from '../official-extensions/scene-2d/contract'
import { SNOW_IR as canvasIR } from './__gen_snowDescent_canvas'
import { SNOW_IR as basicIR } from './__gen_snowDescent_g2d'
import { SNOW_IR as advancedIR } from './__gen_snowDescent_gk'
import { SNOW_DESCENT_ASSETS } from './snowDescentAssets'

const originalContext = HTMLCanvasElement.prototype.getContext
afterEach(() => {
  HTMLCanvasElement.prototype.getContext = originalContext
  document.body.innerHTML = ''
})
interface Snapshot {
  estado: string
  jogadorX: number
  progresso: number
  vidas: number
  estrelas: number
}
interface Probe {
  read(): Snapshot
  update(dt: number): void
}

async function boot(ir: SZIRV2, runtime: string, target: 'core' | 'game-2d' | 'game-2d-advanced') {
  document.body.innerHTML =
    target === 'core' ? '<canvas id="neve" width="640" height="720"></canvas>' : ''
  const draws: string[] = []
  const errors: unknown[][] = []
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
    return new Proxy(
      {
        canvas: this,
        globalAlpha: 1,
        fillText(text: string) {
          draws.push(text)
        },
        measureText(text: string) {
          return { width: String(text).length * 10 }
        },
        drawImage() {
          draws.push('image')
        },
      },
      {
        get(object, key) {
          return key in object ? Reflect.get(object, key) : () => {}
        },
      },
    ) as unknown as CanvasRenderingContext2D
  } as unknown as typeof originalContext
  class ImageStub {
    width = 640
    height = 720
    naturalWidth = 640
    naturalHeight = 720
    onload: (() => void) | null = null
    listeners: (() => void)[] = []
    addEventListener(event: string, listener: () => void) {
      if (event === 'load') this.listeners.push(listener)
    }
    set src(_value: string) {
      queueMicrotask(() => {
        this.onload?.()
        for (const listener of this.listeners) listener()
      })
    }
  }
  const listeners = new Map<string, ((event: object) => void)[]>()
  const queue = new Map<number, FrameRequestCallback>()
  let id = 0,
    now = 0
  const keys = new Set<string>()
  const input = { x: 320, y: 500, down: false, key: (name: string) => keys.has(name) }
  const win: Record<string, unknown> = {
    addEventListener(name: string, fn: (event: object) => void) {
      listeners.set(name, [...(listeners.get(name) ?? []), fn])
    },
    removeEventListener() {},
    performance: { now: () => now },
    innerWidth: 640,
    innerHeight: 720,
    devicePixelRatio: 1,
    __SZGAME_ASSETS: assetManifest(SNOW_DESCENT_ASSETS),
  }
  const raf = (fn: FrameRequestCallback) => {
    queue.set(++id, fn)
    return id
  }
  const caf = (id: number) => {
    queue.delete(id)
  }
  const silentConsole = {
    warn: (...args: unknown[]) => errors.push(args),
    error: (...args: unknown[]) => errors.push(args),
    log() {},
  }
  new Function(
    'window',
    'Image',
    'requestAnimationFrame',
    'cancelAnimationFrame',
    'console',
    runtime,
  )(win, ImageStub, raf, caf, silentConsole)
  const ctx = target === 'game-2d' ? win.ctx : null
  const behavior: SZIRV2['behavior'] = {
    ...ir.behavior,
    start: [
      ...ir.behavior.start,
      {
        type: 'rawJS' as const,
        advanced: true,
        code: 'window.snowProbe = { read: () => ({ estado, jogadorX, progresso, vidas, estrelas }), update: (dt) => atualizar(dt) };',
      },
    ],
  }
  const source = generateJS({ behavior, lifecycle: target })
  new Function(
    'window',
    'Image',
    'requestAnimationFrame',
    'cancelAnimationFrame',
    'SZGame2D',
    'SZGameKit',
    'ctx',
    '__szInput',
    'console',
    source,
  )(win, ImageStub, raf, caf, win.SZGame2D, win.SZGameKit, ctx, input, silentConsole)
  for (let i = 0; i < 12; i++) await Promise.resolve()
  const probe = win.snowProbe as Probe
  if (!probe) throw new Error(`Game did not start: ${JSON.stringify(errors)}`)
  function key(name: string, down: boolean) {
    if (down) keys.add(name)
    else keys.delete(name)
    for (const fn of listeners.get(down ? 'keydown' : 'keyup') ?? [])
      fn({
        key: name,
        code: name.length === 1 ? `Key${name.toUpperCase()}` : name,
        repeat: false,
        preventDefault() {},
      })
  }
  function frame() {
    now += 1000 / 60
    const pending = [...queue.values()]
    queue.clear()
    for (const callback of pending) callback(now)
  }
  function pointer(type: 'pointerdown' | 'pointermove' | 'pointerup', x: number, y: number) {
    if (target === 'core') {
      input.x = x
      input.y = y
      if (type !== 'pointermove') input.down = type === 'pointerdown'
    } else {
      const canvas = document.querySelector('canvas')
      if (!canvas) throw new Error('Missing game canvas')
      const event = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true })
      canvas.dispatchEvent(event)
      for (const listener of listeners.get(type) ?? []) listener(event)
    }
  }
  return { probe, errors, draws, win, key, frame, input, pointer }
}

test('background layers invalidate click targets from the previous frame', async () => {
  const game = await boot(basicIR, gameTwoDRuntime, 'game-2d')
  const api = game.win.SZGame2D as GameTwoDRuntimeApi
  const sprite = api.createSprite({ x: 100, y: 100, w: 40, h: 40, color: '#ffffff' })
  let clicks = 0
  api.onSpriteClick(
    sprite,
    () => {
      clicks++
    },
    'review-click',
  )
  api.clear()
  api.drawSprite(game.win.ctx as CanvasRenderingContext2D, sprite)
  game.pointer('pointerdown', 110, 110)
  game.pointer('pointerup', 110, 110)
  expect(clicks).toBe(1)
  api.drawSceneLayers('back')
  game.pointer('pointerdown', 110, 110)
  game.pointer('pointerup', 110, 110)
  expect(clicks).toBe(1)
})

test('Jogo 2D: a scene drawn once, with no frame loop, appears when its images arrive', async () => {
  // The child drags "Criar camada" and "Desenhar camadas" into Ao iniciar and runs:
  // the images are still loading at that instant and nobody would paint them later.
  const still = (loop: boolean): SZIRV2 => ({
    ...basicIR,
    behavior: {
      start: [
        {
          type: 'rawJS' as const,
          advanced: true,
          code: `SZGame2D.createSceneLayer("ceu", "neve-ceu", "back");
SZGame2D.createSceneLayer("brilho", "neve-brilho", "front");
${loop ? 'SZGame2D.gameLoop(function () {}, "parado");' : ''}
SZGame2D.drawSceneLayers("back");
SZGame2D.drawSceneLayers("front");`,
        },
      ],
      events: [],
      loops: [],
    },
  })
  const game = await boot(still(false), gameTwoDRuntime, 'game-2d')
  // The sky lands first and is painted alone; then the glow lands and the whole
  // picture is repeated in order (back, then front): three images in all.
  expect(game.draws.filter((draw) => draw === 'image')).toHaveLength(3)
  expect(game.errors).toEqual([])
  // Anti-vacuum: a game with a frame loop repaints by itself, so the arrival of an
  // image paints nothing on its own.
  const looped = await boot(still(true), gameTwoDRuntime, 'game-2d')
  expect(looped.draws.filter((draw) => draw === 'image')).toEqual([])
})

test('Avançado: background layers do not wipe a map the engine has already painted', async () => {
  const game = await boot(advancedIR, gameKitRuntime, 'game-2d-advanced')
  const api = game.win.SZGameKit as SceneTwoDApi & {
    rpgCreateMap(name: string, cols: number, rows: number, draw: () => void, has: boolean): void
    rpgGoMap(name: string): void
  }
  // No map: the pass clears as always, and says nothing.
  api.drawSceneLayers('back')
  expect(game.errors).toEqual([])
  api.rpgCreateMap('vila', 10, 8, () => {}, true)
  api.rpgGoMap('vila')
  api.drawSceneLayers('back')
  api.drawSceneLayers('back')
  expect(game.errors).toHaveLength(1)
  expect(String(game.errors[0])).toContain('as camadas do fundo não limpam a tela aqui')
})

test('Avançado: a drag made of scripted events plays without a pointer-capture warning', async () => {
  // A browser refuses to capture a pointer that is not really down, and it throws.
  // The gallery check drives every game with scripted events and accepts no warning:
  // this is the first advanced example played by dragging, so it was the first to trip.
  const captured: number[] = []
  const prototype = HTMLCanvasElement.prototype as unknown as {
    setPointerCapture?: (pointerId: number) => void
  }
  const original = prototype.setPointerCapture
  prototype.setPointerCapture = (pointerId) => {
    captured.push(pointerId)
    throw new Error('NotFoundError')
  }
  try {
    const game = await boot(advancedIR, gameKitRuntime, 'game-2d-advanced')
    const canvas = document.querySelector('canvas')
    if (!canvas) throw new Error('Missing game canvas')
    const scripted = (type: string, x: number, y: number) => {
      const event = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true })
      Object.defineProperty(event, 'pointerId', { value: 0 })
      // The DOM stand-in marks every event as trusted; a browser marks these as not.
      Object.defineProperty(event, 'isTrusted', { value: false })
      canvas.dispatchEvent(event)
    }
    scripted('pointerdown', 320, 430)
    game.probe.update(0)
    expect(game.probe.read().estado).toBe('jogando')
    expect(captured).toEqual([])
    expect(game.errors).toEqual([])
    // Anti-vacuum: a real pointer is still captured, and a real failure still speaks.
    const real = new MouseEvent('pointerdown', { clientX: 320, clientY: 430, bubbles: true })
    Object.defineProperty(real, 'pointerId', { value: 7 })
    Object.defineProperty(real, 'isTrusted', { value: true })
    canvas.dispatchEvent(real)
    expect(captured).toEqual([7])
    expect(String(game.errors[0])).toContain('não consegui capturar o ponteiro')
  } finally {
    if (original) prototype.setPointerCapture = original
    else delete prototype.setPointerCapture
  }
})

for (const [name, ir, runtime, target] of [
  ['Canvas', canvasIR, '', 'core'],
  ['Jogo 2D', basicIR, gameTwoDRuntime, 'game-2d'],
  ['Avançado', advancedIR, gameKitRuntime, 'game-2d-advanced'],
] as const) {
  if (target !== 'core') {
    test(`${name}: engine restart clears old tracks and layers before rebuilding the project`, async () => {
      const game = await boot(ir, runtime, target)
      const api = game.win[target === 'game-2d' ? 'SZGame2D' : 'SZGameKit'] as SceneTwoDApi & {
        restart(): void
        restartGame(): void
      }
      api.createTrack('partida-anterior', 28, 300, 160, 120)
      api.advanceTrack('partida-anterior', 100)
      api.createSceneLayer('antiga', 'neve-brilho', 'front')
      game.draws.length = 0
      api.drawSceneLayers('front')
      expect(game.draws.filter((draw) => draw === 'image')).toHaveLength(2)
      if (target === 'game-2d') api.restart()
      else api.restartGame()
      for (let i = 0; i < 12; i++) await Promise.resolve()
      game.draws.length = 0
      api.drawSceneLayers('front')
      expect(game.draws.filter((draw) => draw === 'image')).toHaveLength(1)
      expect(api.trackValue('pista', 'distance')).toBe(0)
      expect(api.trackValue('partida-anterior', 'distance')).toBe(0)
      expect(game.errors).toHaveLength(1)
      expect(String(game.errors[0])).toContain('A pista “partida-anterior” ainda não existe')
    })
  }

  test(`${name}: touch starts, drags, pauses and resumes using screen coordinates`, async () => {
    const game = await boot(ir, runtime, target)
    game.pointer('pointerdown', 320, 430)
    game.probe.update(0)
    expect(game.probe.read().estado).toBe('jogando')
    game.pointer('pointermove', 480, 500)
    game.probe.update(0.5)
    expect(game.probe.read().jogadorX).toBe(70)
    game.pointer('pointerup', 480, 500)
    game.probe.update(0)
    game.pointer('pointerdown', 570, 45)
    game.probe.update(0)
    expect(game.probe.read().estado).toBe('pausa')
    const distance = game.probe.read().progresso
    game.probe.update(1)
    expect(game.probe.read().progresso).toBe(distance)
    game.pointer('pointerup', 570, 45)
    game.probe.update(0)
    game.pointer('pointerdown', 320, 430)
    game.probe.update(0)
    expect(game.probe.read().estado).toBe('jogando')
    expect(game.errors).toEqual([])
  })

  test(`${name}: real engine starts, renders, pauses, collects, wins, loses and restarts`, async () => {
    const game = await boot(ir, runtime, target)
    expect(game.probe.read().estado).toBe('inicio')
    game.frame()
    game.frame()
    expect(game.draws).toContain('DESCIDA DA NEVE')
    expect(game.draws).toContain('image')
    game.key('Enter', true)
    game.probe.update(0)
    game.key('Enter', false)
    game.probe.update(0)
    expect(game.probe.read().estado).toBe('jogando')
    game.frame()
    game.frame()
    expect(game.probe.read().progresso).toBeGreaterThan(0)
    game.key('p', true)
    game.probe.update(0)
    game.key('p', false)
    const pausedAt = game.probe.read().progresso
    game.probe.update(1)
    expect(game.probe.read().estado).toBe('pausa')
    expect(game.probe.read().progresso).toBe(pausedAt)
    game.key('p', true)
    game.probe.update(0)
    game.key('p', false)
    game.probe.update(0)
    // The center lane is safe and passes six stars; all versions use the same route.
    for (let i = 0; i < 1400; i++) game.probe.update(1 / 60)
    expect(game.probe.read()).toMatchObject({ estado: 'venceu', vidas: 3, estrelas: 6 })
    game.key('r', true)
    game.probe.update(0)
    game.key('r', false)
    game.probe.update(0)
    expect(game.probe.read()).toMatchObject({
      estado: 'jogando',
      vidas: 3,
      estrelas: 0,
      progresso: 0,
    })
    // Move into the right-hand flags, then use a large step to verify swept collisions.
    game.key('ArrowRight', true)
    game.probe.update(0.55)
    game.key('ArrowRight', false)
    expect(game.probe.read().jogadorX).toBeCloseTo(77)
    game.probe.update(10)
    expect(game.probe.read().estado).toBe('perdeu')
    game.key('Enter', true)
    game.probe.update(0)
    game.key('Enter', false)
    expect(game.probe.read()).toMatchObject({
      estado: 'jogando',
      estrelas: 0,
      vidas: 3,
      progresso: 0,
    })
    expect(game.errors).toEqual([])
  })
}
