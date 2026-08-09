import { describe, expect, it, spyOn } from 'bun:test'
import { gameTwoDRuntime } from '../runtime'

interface ReviewSprite {
  x: number
  y: number
  w: number
  h: number
}

interface ReviewGroup {
  items: ReviewSprite[]
  _revision?: number
}

interface ReviewApi {
  createSprite(options: Partial<ReviewSprite>): ReviewSprite
  createGroup(): ReviewGroup
  addToGroup(group: ReviewGroup, sprite: ReviewSprite): void
  overlapGroups(
    first: ReviewGroup,
    second: ReviewGroup,
    callback: (first: ReviewSprite, second: ReviewSprite) => void,
  ): void
  loadSound(name: string, asset: string): void
  playClip(name: string): void
  playTrack(name: string): void
  onStart(callback: () => void): void
  restart(): void
}

type Listener = (event: unknown) => void

interface ReviewWindow {
  SZGame2D: ReviewApi | undefined
  __SZGAME_SOUNDS: Record<string, string>
  performance: { now(): number }
  devicePixelRatio: number
  addEventListener(name: string, listener: Listener): void
}

class ReviewAudio {
  paused = true
  pauseCalls = 0
  currentTime = 0
  loop = false
  volume = 1
  preload = ''
  src = ''
  onerror: (() => void) | null = null

  play(): Promise<void> {
    this.paused = false
    return Promise.resolve()
  }

  pause(): void {
    this.paused = true
    this.pauseCalls += 1
  }
}

function loadReviewRuntime(): {
  api: ReviewApi
  listeners: Record<string, Listener[]>
  audios: ReviewAudio[]
} {
  const listeners: Record<string, Listener[]> = Object.create(null)
  const audios: ReviewAudio[] = []
  class TrackedAudio extends ReviewAudio {
    constructor() {
      super()
      audios.push(this)
    }
  }
  const win: ReviewWindow = {
    SZGame2D: undefined,
    __SZGAME_SOUNDS: { clip: 'data:audio/wav;base64,AA==' },
    performance: { now: () => 0 },
    devicePixelRatio: 1,
    addEventListener(name, listener) {
      listeners[name] ??= []
      listeners[name].push(listener)
    },
  }
  const context = {
    canvas: undefined as unknown,
    clearRect() {},
    setTransform() {},
  }
  const canvas = {
    id: 'tela',
    width: 320,
    height: 480,
    style: {} as Record<string, string>,
    tabIndex: 0,
    setAttribute() {},
    hasAttribute() {
      return true
    },
    getContext() {
      return context
    },
  }
  context.canvas = canvas
  const document = {
    hidden: false,
    addEventListener() {},
    removeEventListener() {},
    querySelector(selector: string) {
      return selector === 'canvas' ? canvas : null
    },
  }
  const location = { reload() {} }
  const requestAnimationFrame = () => 0
  const cancelAnimationFrame = () => {}

  new Function(
    'window',
    'document',
    'Audio',
    'location',
    'requestAnimationFrame',
    'cancelAnimationFrame',
    gameTwoDRuntime,
  )(win, document, TrackedAudio, location, requestAnimationFrame, cancelAnimationFrame)

  if (!win.SZGame2D) throw new Error('O runtime não publicou window.SZGame2D')
  return { api: win.SZGame2D, listeners, audios }
}

describe('regressões do full review de game-2d', () => {
  it('nomes herdados são apelidos de áudio comuns e o restart para a trilha', async () => {
    const { api, listeners, audios } = loadReviewRuntime()
    const warning = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      api.playClip('constructor')
      expect(warning.mock.calls.some((args) => String(args[0]).includes('constructor'))).toBe(true)

      api.loadSound('__proto__', 'clip')
      for (const listener of listeners.pointerdown ?? []) listener({})
      api.playTrack('__proto__')
      await Promise.resolve()

      expect(audios).toHaveLength(1)
      expect(audios[0]?.paused).toBe(false)
      api.onStart(() => {})
      api.restart()
      expect(audios[0]?.paused).toBe(true)
      expect(audios[0]?.pauseCalls).toBeGreaterThan(0)
    } finally {
      warning.mockRestore()
    }
  })

  it('não cria colisão do sprite com ele mesmo entre dois grupos', () => {
    const { api } = loadReviewRuntime()
    const sprite = api.createSprite({ x: 0, y: 0, w: 10, h: 10 })
    const first = api.createGroup()
    const second = api.createGroup()
    api.addToGroup(first, sprite)
    api.addToGroup(second, sprite)

    let collisions = 0
    api.overlapGroups(first, second, () => {
      collisions += 1
    })

    expect(collisions).toBe(0)
  })

  it('aplica o teto de 400 também às mutações públicas de items', () => {
    const { api } = loadReviewRuntime()
    const sprite = api.createSprite({})
    const group = api.createGroup()

    group.items.push(...Array.from({ length: 401 }, () => sprite))
    expect(group.items).toHaveLength(400)

    group.items = Array.from({ length: 401 }, () => sprite)
    expect(group.items).toHaveLength(400)

    group.items.length = 0
    group.items[400] = sprite
    expect(group.items).toHaveLength(0)
  })

  it('leituras herdadas do array não alteram a revisão do grupo', () => {
    const { api } = loadReviewRuntime()
    const group = api.createGroup()
    api.addToGroup(group, api.createSprite({}))
    const before = group._revision

    String(group.items)
    group.items.valueOf()
    Object.hasOwn(group.items, 'length')

    expect(group._revision).toBe(before)
  })
})
