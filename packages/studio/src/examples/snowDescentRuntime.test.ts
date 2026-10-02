import { afterEach, expect, test } from 'bun:test'
import { assetManifest, assetMetaManifest } from '../core/project'
import { generateJS } from '../generators/js'
import type { SZIRV2 } from '../ir'
import { normalizeSZIR } from '../ir'
import { gameTwoDRuntime } from '../official-extensions/game-2d/runtime'
import type { GameTwoDRuntimeApi } from '../official-extensions/game-2d/runtimeContract'
import { gameKitRuntime } from '../official-extensions/game-2d-advanced/runtime'
import type {
  GameKitEntity,
  GameKitKnownApi,
  GameKitRuntimeApi,
} from '../official-extensions/game-2d-advanced/runtimeContract'
import type { SpriteSceneApi } from '../official-extensions/scene-2d/spriteContract'
import { parseJS } from '../parsers/js'
import { SNOW_IR as canvasIR } from './__gen_snowDescent_canvas'
import { SNOW_IR as basicIR } from './__gen_snowDescent_g2d'
import { SNOW_IR as advancedIR } from './__gen_snowDescent_gk'
import { SNOW_DESCENT_ASSETS } from './snowDescentAssets'
import { snowDescentSource } from './snowDescentSource'

const originalContext = HTMLCanvasElement.prototype.getContext

test('advanced: named animation remains idempotent in frame rules and switches on demand', async () => {
  const game = await boot(advancedIR, gameKitRuntime, 'game-2d-advanced')
  game.start()
  const api = game.win.SZGameKit as GameKitRuntimeApi
  api.createSpriteTrack('pista')
  const sprite = api.createCharacter({ w: 26, h: 42, speed: 0 })
  api.putTrackSprite('pista', sprite, 0, 0)
  let once = false
  api.onUpdate(() => api.sceneAnimation(sprite, 'neve-esquiador-animado', 'deslizar', once))
  game.imageFrames.length = 0
  for (let i = 0; i < 60; i++) game.frame()
  expect(new Set(game.imageFrames)).toEqual(new Set([0, 52]))
  once = true
  game.frame()
  expect(api.animEnded(sprite)).toBe(false)
  for (let i = 0; i < 60; i++) game.frame()
  expect(api.animEnded(sprite)).toBe(true)
  once = false
  game.imageFrames.length = 0
  for (let i = 0; i < 30; i++) game.frame()
  expect(new Set(game.imageFrames)).toEqual(new Set([0, 52]))
  expect(game.errors).toEqual([])
})

test('advanced: each track copy owns its state animation table', async () => {
  const game = await boot(advancedIR, gameKitRuntime, 'game-2d-advanced')
  game.start()
  const api = game.win.SZGameKit as GameKitRuntimeApi & {
    stateAnim(
      who: GameKitEntity,
      name: string,
      from: number,
      to: number,
      fps: number,
      once: boolean,
    ): void
  }
  api.createSpriteTrack('pista')
  api.defineMold('alvo', { w: 20, h: 20, speed: 0 })
  const source = api.spawnFromMold('alvo', 0, 0)
  api.stateAnim(source, 'andando', 0, 3, 8, false)
  api.putTrackSprite('pista', source, 0, 400)
  api.repeatTrackSprite('pista', source, 2, 300, 'line')
  const copies: GameKitEntity[] = []
  api.forEachTrackSprite(source, (copy) => {
    if (copy !== source) copies.push(copy)
  })
  expect(copies).toHaveLength(1)
  api.stateAnim(copies[0]!, 'andando', 4, 7, 8, false)
  const table = (who: GameKitEntity) =>
    (who as { _stateAnims?: Record<string, { from: number }> })._stateAnims
  expect(table(source)?.andando?.from).toBe(0)
  expect(table(copies[0]!)?.andando?.from).toBe(4)
  expect(game.errors).toEqual([])
})

test('advanced: native culling preserves visible and approaching track sprites, then releases passed copies before reuse', async () => {
  const game = await boot(advancedIR, gameKitRuntime, 'game-2d-advanced')
  game.start()
  const api = game.win.SZGameKit as GameKitRuntimeApi
  api.createSpriteTrack('alvos')
  api.defineMold('alvo', { w: 20, h: 20, speed: 0 })
  const source = api.spawnFromMold('alvo', 0, 0)
  api.putTrackSprite('alvos', source, 80, 400)
  api.repeatTrackSprite('alvos', source, 3, 500, 'line')
  const copies: GameKitEntity[] = []
  api.forEachTrackSprite(source, (copy) => copies.push(copy))
  const future = api.spawnFromMold('alvo', 0, 0)
  api.putTrackSprite('alvos', future, 0, 5000)
  api.trackSpriteVelocity(future, 0, -100)
  api.cullOffscreen('alvo', 0)
  const visible: GameKitEntity[] = []
  api.forEachActive('alvo', (copy: GameKitEntity) => visible.push(copy))
  expect(new Set(visible)).toEqual(new Set([...copies, future]))
  const passed = copies[1]!
  api.putTrackSprite('alvos', passed, 80, -300)
  api.cullOffscreen('alvo', 0)
  const ordinary = api.spawnFromMold('alvo', 200, 200)
  expect(ordinary).toBe(passed)
  const family: GameKitEntity[] = []
  api.forEachTrackSprite(source, (copy) => family.push(copy))
  expect(family).toEqual([source, copies[2]!])
  api.trackSpriteVelocity(source, 50, 0)
  game.frame()
  expect(ordinary.x).toBe(200)
  expect(ordinary.y).toBe(200)
  expect(game.errors).toEqual([])
})

test('advanced: recycling the last family member clears instance events before pool reuse', async () => {
  const game = await boot(advancedIR, gameKitRuntime, 'game-2d-advanced')
  game.start()
  const api = game.win.SZGameKit as GameKitRuntimeApi
  api.createSpriteTrack('ondas')
  const player = api.createCharacter({ w: 20, h: 20, speed: 0 })
  api.trackFollow('ondas', player)
  api.defineMold('alvo', { w: 20, h: 20, speed: 0 })
  const source = api.spawnFromMold('alvo', 0, 0)
  api.putTrackSprite('ondas', source, 0, 100)
  api.repeatTrackSprite('ondas', source, 2, 100, 'line')
  let oldHits = 0
  let moldHits = 0
  api.onTrackSpriteEncounter('ondas', source, (found) => {
    oldHits++
    api.recycle(found)
  })
  api.onTrackMoldEncounter('ondas', 'alvo', () => {
    moldHits++
  })
  api.recycle(source)
  api.trackSpriteVelocity(source, 0, -1000)
  for (let i = 0; i < 20; i++) game.frame()
  expect(oldHits).toBe(1)
  expect(moldHits).toBe(1)
  const reused = [api.spawnFromMold('alvo', 0, 0), api.spawnFromMold('alvo', 0, 0)]
  expect(reused).toContain(source)
  for (const sprite of reused) {
    api.putTrackSprite('ondas', sprite, 0, 1)
    api.trackSpriteVelocity(sprite, 0, -1000)
  }
  game.frame()
  expect(moldHits).toBe(3)
  expect(oldHits).toBe(1)
  expect(game.errors).toEqual([])
})

test('advanced: the native health bar is projected with its character in the world pass', async () => {
  const game = await boot(advancedIR, gameKitRuntime, 'game-2d-advanced')
  game.start()
  const api = game.win.SZGameKit as GameKitRuntimeApi
  api.createSpriteTrack('pista')
  const sprite = api.createCharacter({ w: 20, h: 20, speed: 0 })
  api.setHealth(sprite, 2)
  api.putTrackSprite('pista', sprite, 80, 400)
  const rectangles: number[][] = []
  api.onDraw((ctx) => {
    const original = ctx.fillRect
    ctx.fillRect = (...args) => {
      if (ctx.fillStyle === '#ff5f6d') rectangles.push(args)
      Reflect.apply(original, ctx, args)
    }
    api.drawHealthBar(sprite, 2)
  })
  game.frame()
  expect(rectangles).toHaveLength(1)
  expect(rectangles[0]![0]).toBeCloseTo(320 + (70 * 300) / 520)
  expect(rectangles[0]![2]).toBeCloseTo((20 * 300) / 520)
  expect(sprite.x).toBe(70)
  expect(sprite.y).toBe(400)
  expect(game.errors).toEqual([])
})

test('basic: named animation asked every frame keeps playing instead of restarting', async () => {
  const game = await boot(basicIR, gameTwoDRuntime, 'game-2d')
  game.start()
  const api = game.win.SZGame2D as GameTwoDRuntimeApi
  const sprite = api.createSprite({ w: 26, h: 42 })
  api.putTrackSprite('pista', sprite, 0, 0)
  const animOf = () => (sprite as { anim?: { start?: number } }).anim
  api.sceneAnimation(sprite, 'neve-esquiador-animado', 'deslizar', false)
  const anim = animOf()
  const start = anim?.start
  for (let i = 0; i < 30; i++) {
    game.frame()
    api.sceneAnimation(sprite, 'neve-esquiador-animado', 'deslizar', false)
  }
  expect(animOf()).toBe(anim)
  expect(animOf()?.start).toBe(start)
  let ended = false
  api.sceneAnimation(sprite, 'neve-esquiador-animado', 'deslizar', true)
  for (let i = 0; i < 120 && !ended; i++) {
    game.frame()
    ended = api.animationEnded(sprite)
    api.sceneAnimation(sprite, 'neve-esquiador-animado', 'deslizar', true)
  }
  expect(ended).toBe(true)
  expect(game.errors).toEqual([])
})

test('basic: pruning a group keeps the track sprites ahead and releases the passed ones', async () => {
  const game = await boot(basicIR, gameTwoDRuntime, 'game-2d')
  game.start()
  const api = game.win.SZGame2D as GameTwoDRuntimeApi
  const ctx = game.win.ctx as CanvasRenderingContext2D
  const group = api.createGroup()
  const ahead = api.createSprite({ w: 20, h: 20 })
  const passed = api.createSprite({ w: 20, h: 20 })
  api.putTrackSprite('pista', ahead, 0, 900)
  api.putTrackSprite('pista', passed, 0, -300)
  api.addToGroup(group, ahead)
  api.addToGroup(group, passed)
  game.frame()
  const left: unknown[] = []
  api.pruneOffscreen(ctx, group, 40, (sprite) => left.push(sprite))
  expect(left).toEqual([passed])
  expect(api.countGroup(group)).toBe(1)
  expect(game.errors).toEqual([])
})

test('basic: ready screens without the HUD block draw no lives bar and no pause button', async () => {
  const source = snowDescentSource('g2d').replace('SZGame2D.trackHud("pista", "Estrelas", 12);', '')
  const ir = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(source),
    extensions: [{ extensionId: 'game-2d' }],
  })
  const game = await boot(ir, gameTwoDRuntime, 'game-2d')
  game.frame()
  expect(game.draws).toContain('DESCIDA DA NEVE')
  expect(game.draws.some((text) => text.startsWith('VIDAS'))).toBe(false)
  expect(game.draws).not.toContain('II  P')
  // The track still has controls, so the footer keeps naming them.
  expect(game.draws).toContain('SETAS / A D para virar • Arraste na pista')
  expect(game.errors).toEqual([])
})

test('basic: HUD pause, resume and restart work without ready screens', async () => {
  const source = snowDescentSource('g2d').replace(
    'SZGame2D.sceneGameScreens("DESCIDA DA NEVE", "Pegue estrelas. Desvie das bandeiras.");',
    '',
  )
  const ir = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(source),
    extensions: [{ extensionId: 'game-2d' }],
  })
  const game = await boot(ir, gameTwoDRuntime, 'game-2d')
  const api = game.win.SZGame2D as GameTwoDRuntimeApi
  game.frame()
  expect(game.draws).toContain('II  P')
  game.pointer('pointerdown', 570, 45)
  game.pointer('pointerup', 570, 45)
  expect(api.isPaused()).toBe(true)
  const atPause = api.spriteTrackValue('pista', 'distance')
  for (let i = 0; i < 5; i++) game.frame()
  expect(api.spriteTrackValue('pista', 'distance')).toBe(atPause)
  game.key('p', true)
  game.key('p', false)
  expect(api.isPaused()).toBe(false)
  game.frame()
  expect(api.spriteTrackValue('pista', 'distance')).toBeGreaterThan(atPause)
  game.key('p', true)
  game.key('p', false)
  expect(api.isPaused()).toBe(true)
  game.pointer('pointerdown', 320, 430)
  game.pointer('pointerup', 320, 430)
  expect(api.isPaused()).toBe(false)
  game.restart()
  expect(api.spriteTrackValue('pista', 'distance')).toBe(0)
  expect(game.errors).toEqual([])
})
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
  const imageFrames: number[] = []
  const scales: number[][] = []
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
    return new Proxy(
      {
        canvas: this,
        globalAlpha: 1,
        fillText(text: string) {
          draws.push(text)
        },
        clearRect() {
          draws.push('clear')
        },
        measureText(text: string) {
          return { width: String(text).length * 10 }
        },
        drawImage(...args: unknown[]) {
          draws.push('image')
          if (
            args[0] instanceof ImageStub &&
            args[0].source === assetManifest(SNOW_DESCENT_ASSETS)['neve-ceu']
          )
            draws.push('backdrop')
          if (args.length === 9) imageFrames.push(Number(args[1]))
        },
        scale(x: number, y: number) {
          scales.push([x, y])
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
    source = ''
    width = 640
    height = 720
    naturalWidth = 640
    naturalHeight = 720
    onload: (() => void) | null = null
    listeners: (() => void)[] = []
    addEventListener(event: string, listener: () => void) {
      if (event === 'load') this.listeners.push(listener)
    }
    set src(value: string) {
      this.source = value
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
    __SZGAME_ASSET_META: assetMetaManifest(SNOW_DESCENT_ASSETS),
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
  const behavior: SZIRV2['behavior'] =
    target === 'game-2d'
      ? ir.behavior
      : {
          ...ir.behavior,
          start: [
            ...ir.behavior.start,
            {
              type: 'rawJS' as const,
              advanced: true,
              code:
                target === 'core'
                  ? 'window.snowProbe = { read: () => ({ estado, jogadorX, progresso, vidas, estrelas }), update: (dt) => atualizar(dt) };'
                  : 'window.snowValues = () => ({ vidas: SZGameKit.healthOf(jogador), estrelas });',
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
  const api = win[target === 'game-2d' ? 'SZGame2D' : 'SZGameKit'] as SpriteSceneApi & {
    getScene(): string
    state(): string
    isPaused(): boolean
  }
  const probe: Probe =
    target === 'core'
      ? (win.snowProbe as Probe)
      : {
          read: () => ({
            estado:
              target === 'game-2d'
                ? api.isPaused()
                  ? 'pausa'
                  : api.getScene()
                : api.state() === 'pausado'
                  ? 'pausa'
                  : ((
                      { menu: 'inicio', vitoria: 'venceu', fim: 'perdeu' } as Record<string, string>
                    )[api.state()] ?? api.state()),
            jogadorX:
              target === 'game-2d'
                ? api.spriteTrackValue('pista', 'lateral')
                : api.trackPosition('pista', 'lateral'),
            progresso:
              target === 'game-2d'
                ? api.spriteTrackValue('pista', 'distance')
                : api.trackPosition('pista', 'distance'),
            vidas:
              target === 'game-2d'
                ? api.spriteTrackValue('pista', 'lives')
                : (win.snowValues as () => Snapshot)().vidas,
            estrelas:
              target === 'game-2d'
                ? api.spriteTrackValue('pista', 'score')
                : (win.snowValues as () => Snapshot)().estrelas,
          }),
          update(dt) {
            for (let i = 0; i < Math.round(dt * 60); i++) frame()
          },
        }
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
  function start() {
    if (target === 'game-2d-advanced') {
      const button = document.querySelector<HTMLButtonElement>('.szgk-active button')
      if (!button) throw new Error('Missing native start/continue button')
      button.click()
    } else {
      key('Enter', true)
      probe.update(0)
      key('Enter', false)
    }
  }
  function restart() {
    if (target === 'game-2d-advanced') (win.SZGameKit as GameKitKnownApi).restartGame()
    else {
      key('r', true)
      probe.update(0)
      key('r', false)
    }
  }
  return {
    probe,
    errors,
    draws,
    imageFrames,
    scales,
    win,
    key,
    frame,
    input,
    pointer,
    start,
    restart,
  }
}

test('Avançado: background layers do not wipe a map the engine has already painted', async () => {
  const game = await boot(advancedIR, gameKitRuntime, 'game-2d-advanced')
  game.start()
  const api = game.win.SZGameKit as SpriteSceneApi & {
    rpgCreateMap(name: string, cols: number, rows: number, draw: () => void, has: boolean): void
    rpgGoMap(name: string): void
  }
  api.rpgCreateMap(
    'vila',
    10,
    8,
    () => {
      game.draws.push('map')
    },
    true,
  )
  api.rpgGoMap('vila')
  game.draws.length = 0
  game.frame()
  expect(game.draws.indexOf('image')).toBeLessThan(game.draws.indexOf('map'))
  expect(game.draws.lastIndexOf('image')).toBeGreaterThan(game.draws.indexOf('map'))
  expect(game.errors).toEqual([])
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
    game.start()
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
    test(`${name}: the pause button follows the HUD on a landscape stage`, async () => {
      const source = snowDescentSource(target === 'game-2d' ? 'g2d' : 'gk')
        .replace('640, 720', '640, 480')
        .replace('height: 720', 'height: 480')
      const landscape = normalizeSZIR({
        html: [],
        css: [],
        js: parseJS(source),
        extensions: [{ extensionId: target }],
      })
      const game = await boot(landscape, runtime, target)
      if (target === 'game-2d-advanced') game.start()
      else game.pointer('pointerdown', 320, 300)
      game.pointer('pointerup', 320, 300)
      expect(game.probe.read().estado).toBe('jogando')
      game.pointer('pointerdown', target === 'game-2d-advanced' ? 570 : 487, 30)
      expect(game.probe.read().estado).toBe('pausa')
      expect(game.errors).toEqual([])
    })
    test(`${name}: restart rebuilds the automatic scene and public API has no manual track objects`, async () => {
      const game = await boot(ir, runtime, target)
      const api = game.win[target === 'game-2d' ? 'SZGame2D' : 'SZGameKit'] as SpriteSceneApi & {
        restart(): void
        restartGame(): void
      }
      for (const method of `createSceneLayer transformSceneLayer motionSceneLayer orderSceneLayer
        showSceneLayer removeSceneLayer drawSceneLayers createTrack viewTrack cameraTrack advanceTrack
        placeTrackObject moveTrackObject removeTrackObject drawTrack trackValue projectTrack trackPassed trackTouching`.split(
        /\s+/,
      )) {
        expect(method in api, method).toBe(false)
      }
      if (target === 'game-2d') api.trackScore('pista', 8)
      if (target === 'game-2d') api.restart()
      else api.restartGame()
      for (let i = 0; i < 12; i++) await Promise.resolve()
      expect(game.probe.read()).toMatchObject({
        estrelas: 0,
        progresso: 0,
        vidas: 3,
        estado: target === 'game-2d' ? 'inicio' : 'jogando',
      })
      expect(game.errors).toEqual([])
    })
  }

  test(`${name}: touch starts, drags, pauses and resumes using screen coordinates`, async () => {
    const game = await boot(ir, runtime, target)
    if (target === 'game-2d-advanced') game.start()
    game.pointer('pointerdown', 320, 430)
    game.probe.update(0)
    expect(game.probe.read().estado).toBe('jogando')
    game.pointer('pointermove', 480, 500)
    game.probe.update(0.5)
    expect(game.probe.read().jogadorX).toBeCloseTo(70)
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
    if (target === 'game-2d-advanced') game.start()
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
    if (target === 'game-2d-advanced')
      expect(document.querySelector('.szgk-active')?.textContent).toContain('DESCIDA DA NEVE')
    else expect(game.draws).toContain('DESCIDA DA NEVE')
    game.start()
    game.probe.update(0)
    game.key('Enter', false)
    game.probe.update(0)
    expect(game.probe.read().estado).toBe('jogando')
    game.frame()
    game.frame()
    expect(game.draws).toContain('image')
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
    game.restart()
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
    game.start()
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

test('ordinary sprites retain named animation, flip, text, custom shapes and projected clicks on the track', async () => {
  const game = await boot(basicIR, gameTwoDRuntime, 'game-2d')
  const api = game.win.SZGame2D as GameTwoDRuntimeApi
  const sprite = api.createSprite({ x: 0, y: 0, w: 26, h: 42, image: 'neve-esquiador' })
  api.sceneAnimation(sprite, 'neve-esquiador-animado', 'deslizar', false)
  sprite.facing = -1
  sprite.opacity = 0.5
  api.trackPlayer('pista', sprite, 3)
  api.trackTravel('pista', 0, 0)
  const text = api.createTextSprite('Olá pista', 0, 0)
  api.putTrackSprite('pista', text, 35, 180)
  let shapes = 0
  api.defineShape('figura', () => {
    shapes++
  })
  const shape = api.createShapeSprite('figura', { w: 20, h: 20 })
  api.putTrackSprite('pista', shape, -35, 180)
  let clicks = 0
  api.onSpriteClick(
    sprite,
    () => {
      clicks++
    },
    'projected',
  )
  game.start()
  game.key('Enter', false)
  for (let i = 0; i < 25; i++) game.frame()
  expect(new Set(game.imageFrames).size).toBeGreaterThan(1)
  expect(sprite.anim).toMatchObject({ from: 0, to: 1, fps: 6 })
  expect(sprite).toMatchObject({ w: 26, h: 42, opacity: 0.5, facing: -1 })
  expect(game.scales).toContainEqual([-1, 1])
  expect(game.draws).toContain('Olá pista')
  expect(shapes).toBeGreaterThan(0)
  game.pointer('pointerdown', 320, 550)
  game.pointer('pointerup', 320, 550)
  expect(clicks).toBe(1)
  game.pointer('pointerdown', 20, 200)
  game.pointer('pointerup', 20, 200)
  expect(clicks).toBe(1)
  expect(game.errors).toEqual([])
})
for (const variant of ['basic', 'advanced'] as const) {
  const runtime = variant === 'basic' ? gameTwoDRuntime : gameKitRuntime
  const target = variant === 'basic' ? 'game-2d' : 'game-2d-advanced'
  test(`${variant}: normal frame hooks wait for ready screen to start`, async () => {
    const game = await boot(variant === 'basic' ? basicIR : advancedIR, runtime, target)
    const api = game.win[variant === 'basic' ? 'SZGame2D' : 'SZGameKit'] as GameTwoDRuntimeApi &
      GameKitKnownApi
    let updates = 0
    if (variant === 'basic') api.gameLoop(() => updates++)
    else api.onUpdate(() => updates++)
    expect(game.probe.read().estado).toBe('inicio')
    game.frame()
    game.frame()
    game.frame()
    expect(updates).toBe(0)
  })
  test(`${variant}: scene callback failures do not escape the animation driver`, async () => {
    const game = await boot(variant === 'basic' ? basicIR : advancedIR, runtime, target)
    const api = game.win[variant === 'basic' ? 'SZGame2D' : 'SZGameKit'] as GameTwoDRuntimeApi &
      GameKitKnownApi
    game.start()
    let reachedSecond = false
    api.onTrackFinish('pista', () => {
      throw new Error('child event failure')
    })
    api.onTrackFinish('pista', () => {
      reachedSecond = true
    })
    if (variant === 'basic') api.trackTravel('pista', 320, 10)
    else api.trackFinishLine('pista', 10)
    expect(() => {
      for (let i = 0; i < 10; i++) game.frame()
    }).not.toThrow()
    expect(reachedSecond).toBe(true)
    expect(String(game.errors)).toContain('child event failure')
  })
}

for (const variant of ['basic', 'advanced'] as const) {
  test(`${variant}: one broken encounter must not suppress other encounter blocks`, async () => {
    const game = await boot(
      variant === 'basic' ? basicIR : advancedIR,
      variant === 'basic' ? gameTwoDRuntime : gameKitRuntime,
      variant === 'basic' ? 'game-2d' : 'game-2d-advanced',
    )
    const api = game.win[variant === 'basic' ? 'SZGame2D' : 'SZGameKit'] as GameTwoDRuntimeApi &
      GameKitKnownApi
    game.start()
    const item =
      variant === 'basic'
        ? api.createSprite({ x: 0, y: 0, w: 20, h: 20 })
        : api.createCharacter({ w: 20, h: 20, speed: 0 })
    api.putTrackSprite('pista', item, 0, 10)
    const onEncounter = variant === 'basic' ? api.onTrackEncounter : api.onTrackSpriteEncounter
    onEncounter('pista', item, () => {
      throw new Error('first encounter failed')
    })
    let reachedSecond = false
    onEncounter('pista', item, () => {
      reachedSecond = true
    })
    for (let i = 0; i < 10; i++) game.frame()
    expect(reachedSecond).toBe(true)
    expect(String(game.errors)).toContain('first encounter failed')
  })
}

test('basic: automatic backdrops survive the ordinary clear block', async () => {
  const game = await boot(basicIR, gameTwoDRuntime, 'game-2d')
  const api = game.win.SZGame2D as GameTwoDRuntimeApi
  api.gameLoop(() => api.clear())
  game.start()
  game.draws.length = 0
  game.frame()
  expect(game.draws.lastIndexOf('backdrop')).toBeGreaterThan(game.draws.lastIndexOf('clear'))
})

test('advanced: pooled waves keep native appearance, lifetime and family identity after collecting their source', async () => {
  const game = await boot(advancedIR, gameKitRuntime, 'game-2d-advanced')
  game.start()
  const api = game.win.SZGameKit as GameKitRuntimeApi
  api.createSpriteTrack('alvos')
  api.defineMold('alvo', { w: 20, h: 20, health: 2, speed: 0 })
  const source = api.spawnFromMold('alvo', 0, 0)
  api.putTrackSprite('alvos', source, 0, 400)
  api.repeatTrackSprite('alvos', source, 3, 100, 'line')
  api.recycle(source)
  const nextWave = api.spawnFromMold('alvo', 0, 0)
  expect(nextWave).not.toBe(source)
  api.putTrackSprite('alvos', nextWave, 80, 800)
  api.sceneAnimation(source, 'neve-esquiador-animado', 'deslizar', false)
  api.trackSpriteVelocity(source, 10, -100)
  const copies: GameKitEntity[] = []
  api.forEachTrackSprite(source, (copy) => {
    api.setHealth(copy, 4)
    copies.push(copy)
  })
  expect(copies).toHaveLength(2)
  expect(
    copies.every((copy) => copy._sheetImg === 'neve-esquiador-animado' && api.healthOf(copy) === 4),
  ).toBe(true)
  const y = copies[0]!.y
  for (let i = 0; i < 30; i++) game.frame()
  expect(copies[0]!.y).toBeLessThan(y)
  expect(nextWave.y).toBe(800)
  const native: GameKitEntity[] = []
  api.forEachActive('alvo', (copy: GameKitEntity) => native.push(copy))
  expect(new Set(native)).toEqual(new Set([...copies, nextWave]))
  api.forEachTrackSprite(source, (copy) => api.recycle(copy))
  let count = 0
  api.forEachTrackSprite(source, () => count++)
  expect(count).toBe(0)
  const remaining: GameKitEntity[] = []
  api.forEachActive('alvo', (copy: GameKitEntity) => remaining.push(copy))
  expect(remaining).toEqual([nextWave])
  for (const method of [
    'trackPlayer',
    'trackControls',
    'trackTravel',
    'trackHud',
    'trackHurt',
    'trackScore',
    'sceneGameScreens',
    'sceneResult',
  ])
    expect(method in api).toBe(false)
  expect(game.errors).toEqual([])
})

test('advanced: a timer spawns moving waves without a player on their track', async () => {
  const game = await boot(advancedIR, gameKitRuntime, 'game-2d-advanced')
  game.start()
  const api = game.win.SZGameKit as GameKitRuntimeApi
  api.createSpriteTrack('asteroides')
  api.defineMold('asteroide', { w: 20, h: 20, speed: 0 })
  let waves = 0
  const born: GameKitEntity[] = []
  api.onUpdate(() => {
    if (api.everySeconds('nova-onda', 0.2) && waves < 3) {
      const asteroid = api.spawnFromMold('asteroide', 0, 0)
      api.putTrackSprite('asteroides', asteroid, 80, 900)
      api.repeatTrackSprite('asteroides', asteroid, 3, 120, 'alternate')
      api.trackSpriteVelocity(asteroid, 0, -200)
      born.push(asteroid)
      waves++
    }
  })
  for (let i = 0; i < 50; i++) game.frame()
  expect(waves).toBe(3)
  expect(born.every((sprite) => sprite.y < 900)).toBe(true)
  let alive = 0
  api.forEachActive('asteroide', () => alive++)
  expect(alive).toBe(9)
  expect(game.errors).toEqual([])
})

test('advanced: mold encounter rules reach every new wave and its copies', async () => {
  const source = `${snowDescentSource('gk')}
SZGameKit.createSpriteTrack("asteroides");
const nave = SZGameKit.createCharacter({w:20,h:20,speed:0});
SZGameKit.trackFollow("asteroides", nave);
SZGameKit.defineMold("asteroide", {w:20,h:20,speed:0});
let ondas = 0;
let acertos = 0;
SZGameKit.onTrackMoldEncounter("asteroides", "asteroide", function (encontrado) {
  SZGameKit.setHealth(encontrado, 3);
  acertos = acertos + 1;
  SZGameKit.collectTrackItem();
});
if (SZGameKit.everySeconds("onda-interativa", 0.2)) {
 if (ondas < 3) {
  const alvo = SZGameKit.spawnFromMold("asteroide", 0, 0);
  SZGameKit.putTrackSprite("asteroides", alvo, 0, 100);
  SZGameKit.repeatTrackSprite("asteroides", alvo, 3, 120, "line");
  SZGameKit.trackSpriteVelocity(alvo, 0, -200);
  ondas = ondas + 1;
 }
}
window.waveResult = function () { return acertos; };`
  const ir = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(source),
    extensions: [{ extensionId: 'game-2d-advanced' }],
  })
  const game = await boot(ir, gameKitRuntime, 'game-2d-advanced')
  game.start()
  for (let i = 0; i < 180; i++) game.frame()
  expect((game.win.waveResult as () => number)()).toBe(9)
  let remaining = 0
  const api = game.win.SZGameKit as GameKitRuntimeApi
  api.forEachActive('asteroide', () => remaining++)
  expect(remaining).toBe(0)
  expect(game.errors).toEqual([])
})

test('basic: repeated sprites belong to their native group and collection preserves its remaining copies', async () => {
  const game = await boot(basicIR, gameTwoDRuntime, 'game-2d')
  const api = game.win.SZGame2D as GameTwoDRuntimeApi
  const group = api.createGroup()
  const source = api.createSprite({ x: 0, y: 0, w: 20, h: 20 })
  api.addToGroup(group, source)
  api.putTrackSprite('pista', source, 0, 10)
  api.repeatTrackSprite('pista', source, 3, 500, 'line')
  const before: unknown[] = []
  api.forEachInGroup(group, (copy) => before.push(copy))
  expect(before).toHaveLength(3)
  api.onTrackEncounter('pista', source, () => api.collectTrackItem())
  game.start()
  for (let i = 0; i < 10; i++) game.frame()
  const after: unknown[] = []
  api.forEachInGroup(group, (copy) => {
    api.sceneAnimation(copy, 'neve-esquiador-animado', 'deslizar', false)
    after.push(copy)
  })
  expect(after).toHaveLength(2)
  expect(after).not.toContain(source)
  expect(game.errors).toEqual([])
})

for (const result of ['won', 'lost'] as const) {
  test(`basic: ordinary game rules stop on the ${result} screen`, async () => {
    const game = await boot(basicIR, gameTwoDRuntime, 'game-2d')
    const api = game.win.SZGame2D as GameTwoDRuntimeApi
    let updates = 0
    api.gameLoop(() => updates++)
    game.start()
    game.frame()
    expect(updates).toBeGreaterThan(0)
    api.sceneResult(result)
    const stopped = updates
    game.frame()
    game.frame()
    expect(updates).toBe(stopped)
    expect(game.errors).toEqual([])
  })
}
