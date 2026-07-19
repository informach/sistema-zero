import { describe, expect, it } from 'bun:test'
import { generateJS } from '#generators'
import { enemyPlatformerExample, pongExample } from '../examples'
import { gameTwoDRuntime } from '../runtime'
import type { GameTwoDLifecycleApi } from '../runtimeContract'

type Listener = (event: Record<string, unknown>) => void

interface CapturedSprite {
  x: number
  y: number
  w: number
  h: number
  hp?: number
}

interface CapturedEnemyType {
  items: CapturedSprite[]
}

type RuntimeApi = Pick<GameTwoDLifecycleApi, 'sceneIs'>

function exampleHarness(example: typeof pongExample) {
  const listeners = new Map<string, Listener[]>()
  const frames = new Map<number, (timestamp: number) => void>()
  const sprites: CapturedSprite[] = []
  const enemyTypes: CapturedEnemyType[] = []
  const scores: Record<string, number> = {}
  const errors: string[] = []
  let nextFrameId = 1
  let canvas: Record<string, unknown> | null = null

  const contextTarget: Record<string, unknown> = {
    canvas: null,
    measureText: (text: string) => ({ width: text.length * 8 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
  }
  const context = new Proxy(contextTarget, {
    get(target, property) {
      if (property in target) return target[property as string]
      return () => undefined
    },
  })

  const documentObject = {
    hidden: false,
    addEventListener() {},
    removeEventListener() {},
    body: {
      style: {},
      appendChild(node: Record<string, unknown>) {
        canvas = node
      },
    },
    querySelector(selector: string) {
      return selector === 'canvas' ? canvas : null
    },
    createElement(tag: string) {
      if (tag !== 'canvas') return { style: {} }
      const created = {
        width: 320,
        height: 480,
        style: {},
        id: '',
        tabIndex: -1,
        hasAttribute: () => false,
        addEventListener() {},
        removeEventListener() {},
        focus() {},
        remove() {
          if (canvas === created) canvas = null
        },
        getContext: () => context,
        getBoundingClientRect() {
          return { left: 0, top: 0, width: created.width, height: created.height }
        },
      }
      contextTarget.canvas = created
      canvas = created
      return created
    },
  }

  const windowObject = {
    document: documentObject,
    devicePixelRatio: 1,
    innerWidth: 800,
    innerHeight: 600,
    performance: { now: () => 0 },
    location: { reload() {} },
    console: {
      warn() {},
      error(message: unknown) {
        errors.push(String(message))
      },
    },
    addEventListener(name: string, listener: Listener) {
      const group = listeners.get(name) ?? []
      group.push(listener)
      listeners.set(name, group)
    },
    removeEventListener() {},
    SZGame2D: undefined as RuntimeApi | undefined,
  }

  const requestAnimationFrame = (callback: (timestamp: number) => void) => {
    const id = nextFrameId++
    frames.set(id, callback)
    return id
  }
  const cancelAnimationFrame = (id: number) => frames.delete(id)
  const generated = generateJS({
    behavior: example.ir.behavior,
    lifecycle: 'game-2d',
  })
  const instrumentation = `
    window.__capturedSprites = [];
    window.__capturedEnemyTypes = [];
    window.__capturedScores = {};
    var originalCreateSprite = window.SZGame2D.createSprite;
    window.SZGame2D.createSprite = function (options) {
      var sprite = originalCreateSprite(options);
      window.__capturedSprites.push(sprite);
      return sprite;
    };
    var originalCreateEnemyType = window.SZGame2D.createEnemyType;
    window.SZGame2D.createEnemyType = function (options) {
      var type = originalCreateEnemyType(options);
      window.__capturedEnemyTypes.push(type);
      return type;
    };
    var originalDrawScore = window.SZGame2D.drawScore;
    window.SZGame2D.drawScore = function (ctx, label, value, x, y, color, size) {
      window.__capturedScores[label] = value;
      return originalDrawScore(ctx, label, value, x, y, color, size);
    };
  `
  const executable = `with (window) { ${gameTwoDRuntime}\n${instrumentation}\n${generated} }`
  new Function('window', 'document', 'requestAnimationFrame', 'cancelAnimationFrame', executable)(
    windowObject,
    documentObject,
    requestAnimationFrame,
    cancelAnimationFrame,
  )
  sprites.push(
    ...(windowObject as unknown as { __capturedSprites: CapturedSprite[] }).__capturedSprites,
  )
  enemyTypes.push(
    ...(windowObject as unknown as { __capturedEnemyTypes: CapturedEnemyType[] })
      .__capturedEnemyTypes,
  )

  let timestamp = 0
  return {
    api: windowObject.SZGame2D as RuntimeApi,
    sprites,
    enemyTypes,
    errors,
    scores,
    fireKey(key: string, type: 'keydown' | 'keyup' = 'keydown') {
      for (const listener of [...(listeners.get(type) ?? [])]) listener({ key, repeat: false })
    },
    nextFrame() {
      timestamp += 17
      const batch = [...frames.entries()]
      frames.clear()
      for (const [, callback] of batch) callback(timestamp)
      const latestSprites = (windowObject as unknown as { __capturedSprites: CapturedSprite[] })
        .__capturedSprites
      const latestTypes = (windowObject as unknown as { __capturedEnemyTypes: CapturedEnemyType[] })
        .__capturedEnemyTypes
      sprites.splice(0, sprites.length, ...latestSprites)
      enemyTypes.splice(0, enemyTypes.length, ...latestTypes)
      Object.assign(
        scores,
        (windowObject as unknown as { __capturedScores: Record<string, number> }).__capturedScores,
      )
    },
  }
}

describe('playthrough dos exemplos exatos do Jogo 2D', () => {
  it('Pong percorre início, vitória, derrota e novo jogo limpo', () => {
    const game = exampleHarness(pongExample)
    expect(game.api.sceneIs('inicio')).toBe(true)
    game.fireKey('Enter')
    expect(game.api.sceneIs('jogando')).toBe(true)

    const firstBall = game.sprites[2]
    expect(firstBall).toBeDefined()
    for (let point = 0; point < 8 && !game.api.sceneIs('vitoria'); point += 1) {
      if (firstBall) firstBall.x = 405
      game.nextFrame()
    }
    expect(game.scores['Você:']).toBe(5)
    expect(game.api.sceneIs('vitoria')).toBe(true)

    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('inicio')).toBe(true)
    expect(game.sprites.length).toBe(6)
    expect(game.sprites[5]).not.toBe(firstBall)

    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    const secondBall = game.sprites[5]
    for (let point = 0; point < 5; point += 1) {
      if (secondBall) secondBall.x = -20
      game.nextFrame()
    }
    expect(game.api.sceneIs('derrota')).toBe(true)
    expect(game.errors).toEqual([])
  })

  it('Plataforma com inimigos conclui pelos três tipos, perde vida e reinicia', () => {
    const game = exampleHarness(enemyPlatformerExample)
    expect(game.api.sceneIs('inicio')).toBe(true)
    expect(game.enemyTypes.map((type) => type.items.length)).toEqual([2, 1, 1])
    game.fireKey('Enter')

    for (const type of game.enemyTypes) {
      for (const enemy of type.items) enemy.hp = 0
    }
    game.nextFrame()
    expect(game.api.sceneIs('vitoria')).toBe(true)

    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('inicio')).toBe(true)
    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    const restartedHero = game.sprites[1]
    expect(restartedHero).toBeDefined()
    if (restartedHero) restartedHero.hp = 0
    game.nextFrame()
    expect(game.api.sceneIs('derrota')).toBe(true)
    expect(game.errors).toEqual([])
  })
})
