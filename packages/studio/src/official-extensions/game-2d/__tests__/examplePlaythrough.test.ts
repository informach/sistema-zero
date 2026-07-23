import { describe, expect, it } from 'bun:test'
import type { ExtensionExample } from '#extensions'
import { generateJS } from '#generators'
import {
  animatedHeroExample,
  asteroidsClassicExample,
  asteroidsExample,
  balloonExample,
  cameraAdventureExample,
  catchCoinExample,
  codeDrawnExample,
  dinoRunExample,
  enemyPlatformerExample,
  gorilasExample,
  gorilasVsRobotExample,
  platformerExample,
  pongExample,
  stickHeroExample,
  tilemapExample,
} from '../examples'
import { gameTwoDRuntime } from '../runtime'
import type { GameTwoDLifecycleApi } from '../runtimeContract'

type Listener = (event: Record<string, unknown>) => void

interface CapturedSprite {
  x: number
  y: number
  w: number
  h: number
  hp?: number
  blinkFrames?: number
  angle?: number
  anim?: unknown
  vx?: number
  vy?: number
}

interface CapturedEnemyType {
  items: CapturedSprite[]
}

interface CapturedGroup {
  items: CapturedSprite[]
}

interface CapturedStickGame {
  phase: string
  score: number
  heroY: number
  h: number
  sticks: Array<{ x: number; length: number }>
  platforms: Array<{ x: number; w: number }>
}

interface CapturedBalloonGame {
  over: boolean
  fuel: number
  meters: number
  by: number
  groundY: number
  vVel: number
}

interface CapturedCity {
  holes: unknown[]
}

type RuntimeApi = Pick<GameTwoDLifecycleApi, 'sceneIs'> & {
  spawn(group: CapturedGroup, options: Record<string, unknown>): CapturedSprite | null
  cameraX(): number
}

function exampleHarness(example: ExtensionExample, random: () => number = Math.random) {
  const listeners = new Map<string, Listener[]>()
  const frames = new Map<number, (timestamp: number) => void>()
  const sprites: CapturedSprite[] = []
  const enemyTypes: CapturedEnemyType[] = []
  const groups: CapturedGroup[] = []
  const stickGames: CapturedStickGame[] = []
  const balloonGames: CapturedBalloonGame[] = []
  const cities: CapturedCity[] = []
  const throwers: CapturedSprite[] = []
  const scores: Record<string, number> = {}
  const errors: string[] = []
  const warnings: string[] = []
  const calls: Record<string, number> = {}
  let nextFrameId = 1
  let timestamp = 0
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

  const nodesById = new Map<string, Record<string, unknown>>()
  const documentObject = {
    hidden: false,
    title: example.name,
    addEventListener() {},
    removeEventListener() {},
    getElementById(id: string) {
      return nodesById.get(id) ?? null
    },
    body: {
      style: {},
      appendChild(node: Record<string, unknown>) {
        const id = typeof node.id === 'string' ? node.id : ''
        if (id) nodesById.set(id, node)
        if (node.tagName === 'CANVAS') canvas = node
      },
    },
    querySelector(selector: string) {
      return selector === 'canvas' ? canvas : null
    },
    createElement(tag: string) {
      if (tag !== 'canvas') {
        const attributes = new Map<string, string>()
        return {
          tagName: tag.toUpperCase(),
          id: '',
          style: {},
          textContent: '',
          setAttribute(name: string, value: string) {
            attributes.set(name, value)
          },
          getAttribute(name: string) {
            return attributes.get(name) ?? null
          },
        }
      }
      const attributes = new Map<string, string>()
      const created = {
        tagName: 'CANVAS',
        width: 320,
        height: 480,
        style: {},
        id: '',
        tabIndex: -1,
        hasAttribute: () => false,
        setAttribute(name: string, value: string) {
          attributes.set(name, value)
        },
        getAttribute(name: string) {
          return attributes.get(name) ?? null
        },
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

  class HarnessImage {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    naturalWidth = 64
    width = 64
    set src(_value: string) {
      this.onload?.()
    }
    addEventListener(name: string, listener: () => void) {
      if (name === 'load') listener()
    }
  }

  const storage = new Map<string, string>()
  const localStorage = {
    getItem(key: string) {
      return storage.get(key) ?? null
    },
    setItem(key: string, value: string) {
      storage.set(key, String(value))
    },
  }

  const assetMap = Object.fromEntries(
    (example.assets ?? []).map((asset) => [asset.name, asset.dataUrl]),
  )

  const harnessMath = Object.create(Math) as Math
  harnessMath.random = random

  const windowObject = {
    document: documentObject,
    devicePixelRatio: 1,
    innerWidth: 800,
    innerHeight: 600,
    performance: { now: () => timestamp },
    location: { reload() {} },
    localStorage,
    Math: harnessMath,
    Image: HarnessImage,
    __SZGAME_ASSETS: assetMap,
    console: {
      warn(message: unknown) {
        warnings.push(String(message))
      },
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
    window.__capturedGroups = [];
    window.__capturedStickGames = [];
    window.__capturedBalloonGames = [];
    window.__capturedCities = [];
    window.__capturedThrowers = [];
    window.__capturedScores = {};
    window.__capturedCalls = {};
    var originalCreateSprite = window.SZGame2D.createSprite;
    window.SZGame2D.createSprite = function (options) {
      var sprite = originalCreateSprite(options);
      window.__capturedSprites.push(sprite);
      return sprite;
    };
    ['createShip', 'createDino', 'createShapeSprite'].forEach(function (name) {
      var original = window.SZGame2D[name];
      window.SZGame2D[name] = function () {
        var sprite = original.apply(window.SZGame2D, arguments);
        window.__capturedSprites.push(sprite);
        return sprite;
      };
    });
    var originalCreateGroup = window.SZGame2D.createGroup;
    window.SZGame2D.createGroup = function () {
      var group = originalCreateGroup();
      window.__capturedGroups.push(group);
      return group;
    };
    var originalCreateEnemyType = window.SZGame2D.createEnemyType;
    window.SZGame2D.createEnemyType = function (options) {
      var type = originalCreateEnemyType(options);
      window.__capturedEnemyTypes.push(type);
      return type;
    };
    var originalCreateStickHero = window.SZGame2D.createStickHero;
    window.SZGame2D.createStickHero = function () {
      var game = originalCreateStickHero.apply(window.SZGame2D, arguments);
      window.__capturedStickGames.push(game);
      return game;
    };
    var originalCreateBalloon = window.SZGame2D.createBalloon;
    window.SZGame2D.createBalloon = function () {
      var game = originalCreateBalloon.apply(window.SZGame2D, arguments);
      window.__capturedBalloonGames.push(game);
      return game;
    };
    var originalCreateCity = window.SZGame2D.createCity;
    window.SZGame2D.createCity = function () {
      var city = originalCreateCity.apply(window.SZGame2D, arguments);
      window.__capturedCities.push(city);
      return city;
    };
    var originalPlaceThrower = window.SZGame2D.placeThrower;
    window.SZGame2D.placeThrower = function () {
      var thrower = originalPlaceThrower.apply(window.SZGame2D, arguments);
      window.__capturedThrowers.push(thrower);
      window.__capturedSprites.push(thrower);
      return thrower;
    };
    var originalComputerTurn = window.SZGame2D.computerTurn;
    window.SZGame2D.computerTurn = function () {
      window.__capturedCalls.computerTurn = (window.__capturedCalls.computerTurn || 0) + 1;
      return originalComputerTurn.apply(window.SZGame2D, arguments);
    };
    var originalDrawScore = window.SZGame2D.drawScore;
    window.SZGame2D.drawScore = function (ctx, label, value, x, y, color, size) {
      window.__capturedScores[label] = value;
      return originalDrawScore(ctx, label, value, x, y, color, size);
    };
    var originalDrawHearts = window.SZGame2D.drawHearts;
    window.SZGame2D.drawHearts = function (ctx, value) {
      window.__capturedScores['Vidas:'] = value;
      return originalDrawHearts.apply(window.SZGame2D, arguments);
    };
    var originalDrawSpriteHealth = window.SZGame2D.drawSpriteHealth;
    window.SZGame2D.drawSpriteHealth = function (ctx, sprite) {
      window.__capturedScores['Vidas:'] = window.SZGame2D.getHealth(sprite);
      return originalDrawSpriteHealth.apply(window.SZGame2D, arguments);
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
  groups.push(
    ...(windowObject as unknown as { __capturedGroups: CapturedGroup[] }).__capturedGroups,
  )
  stickGames.push(
    ...(windowObject as unknown as { __capturedStickGames: CapturedStickGame[] })
      .__capturedStickGames,
  )
  balloonGames.push(
    ...(windowObject as unknown as { __capturedBalloonGames: CapturedBalloonGame[] })
      .__capturedBalloonGames,
  )
  cities.push(...(windowObject as unknown as { __capturedCities: CapturedCity[] }).__capturedCities)
  throwers.push(
    ...(windowObject as unknown as { __capturedThrowers: CapturedSprite[] }).__capturedThrowers,
  )

  return {
    api: windowObject.SZGame2D as RuntimeApi,
    sprites,
    enemyTypes,
    groups,
    stickGames,
    balloonGames,
    cities,
    throwers,
    errors,
    warnings,
    calls,
    scores,
    fireKey(key: string, type: 'keydown' | 'keyup' = 'keydown') {
      const code = key === ' ' || key === 'Space' ? 'Space' : key
      const normalizedKey = key === 'Space' ? ' ' : key
      for (const listener of [...(listeners.get(type) ?? [])]) {
        listener({ key: normalizedKey, code, repeat: false })
      }
    },
    firePointer(type: 'pointerdown' | 'pointermove' | 'pointerup', x: number, y: number) {
      for (const listener of [...(listeners.get(type) ?? [])]) {
        listener({ clientX: x, clientY: y, pointerId: 1, target: canvas })
      }
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
      const latestGroups = (windowObject as unknown as { __capturedGroups: CapturedGroup[] })
        .__capturedGroups
      const latestCities = (windowObject as unknown as { __capturedCities: CapturedCity[] })
        .__capturedCities
      const latestThrowers = (windowObject as unknown as { __capturedThrowers: CapturedSprite[] })
        .__capturedThrowers
      sprites.splice(0, sprites.length, ...latestSprites)
      enemyTypes.splice(0, enemyTypes.length, ...latestTypes)
      groups.splice(0, groups.length, ...latestGroups)
      cities.splice(0, cities.length, ...latestCities)
      throwers.splice(0, throwers.length, ...latestThrowers)
      Object.assign(
        scores,
        (windowObject as unknown as { __capturedScores: Record<string, number> }).__capturedScores,
      )
      Object.assign(
        calls,
        (windowObject as unknown as { __capturedCalls: Record<string, number> }).__capturedCalls,
      )
    },
  }
}

describe('playthrough dos exemplos exatos do Jogo 2D', () => {
  it('Pegue a moeda coleta cinco vezes, vence e reinicia a partida limpa', () => {
    const game = exampleHarness(catchCoinExample, () => 0.5)
    expect(game.api.sceneIs('inicio')).toBe(true)
    game.fireKey('Enter')
    expect(game.api.sceneIs('jogando')).toBe(true)
    const [firstHero, firstCoin] = game.sprites
    expect(firstHero).toBeDefined()
    expect(firstCoin).toBeDefined()

    for (let point = 1; point <= 5; point += 1) {
      if (firstHero && firstCoin) {
        firstCoin.x = firstHero.x
        firstCoin.y = firstHero.y
      }
      game.nextFrame()
      expect(game.scores['Moedas:']).toBe(point)
    }
    expect(game.api.sceneIs('vitoria')).toBe(true)

    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('inicio')).toBe(true)
    expect(game.sprites).toHaveLength(4)
    expect(game.sprites[2]).not.toBe(firstHero)
    expect(game.sprites[3]).not.toBe(firstCoin)

    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('jogando')).toBe(true)
    expect(game.scores['Moedas:']).toBe(0)
    expect(game.errors).toEqual([])
    expect(game.warnings).toEqual([])
  })

  it('Herói que anda move e mantém a animação prometida', () => {
    const game = exampleHarness(animatedHeroExample)
    const hero = game.sprites[0]
    expect(hero?.anim).toBeDefined()
    const startX = hero?.x ?? 0
    game.fireKey('ArrowRight')
    game.nextFrame()
    game.fireKey('ArrowRight', 'keyup')
    expect(hero?.x).toBeGreaterThan(startX)
    expect(game.errors).toEqual([])
    expect(game.warnings).toEqual([])
  })

  it('Mini plataforma responde às setas, gravidade e limites do palco', () => {
    const game = exampleHarness(platformerExample)
    const hero = game.sprites[0]
    const startX = hero?.x ?? 0
    game.fireKey('ArrowRight')
    for (let frame = 0; frame < 5; frame += 1) game.nextFrame()
    game.fireKey('ArrowRight', 'keyup')
    expect(hero?.x).toBeGreaterThan(startX)
    expect(hero?.x).toBeLessThanOrEqual(320 - (hero?.w ?? 0))
    expect(hero?.y).toBeLessThanOrEqual(200 - (hero?.h ?? 0))
    expect(game.errors).toEqual([])
  })

  it('Sala com paredes deixa andar, mas bloqueia o herói no tile sólido', () => {
    const game = exampleHarness(tilemapExample)
    const hero = game.sprites[0]
    game.fireKey('ArrowLeft')
    for (let frame = 0; frame < 30; frame += 1) game.nextFrame()
    game.fireKey('ArrowLeft', 'keyup')
    expect(hero?.x).toBeGreaterThanOrEqual(32)
    game.fireKey('ArrowDown')
    game.nextFrame()
    game.fireKey('ArrowDown', 'keyup')
    expect(hero?.y).toBeGreaterThan(48)
    expect(game.errors).toEqual([])
    expect(game.warnings).toEqual([])
  })

  it('Jogo desenhado por código coleta a moeda com as figuras reais', () => {
    const game = exampleHarness(codeDrawnExample)
    const [hero, coin] = game.sprites
    expect(hero).toBeDefined()
    expect(coin).toBeDefined()
    if (hero && coin) {
      coin.x = hero.x
      coin.y = hero.y
    }
    game.nextFrame()
    expect(game.scores['Moedas:']).toBe(1)
    expect(coin?.x === hero?.x && coin?.y === hero?.y).toBe(false)
    expect(game.errors).toEqual([])
  })

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

  it('Nave contra Asteroides atira, alcança a vitória, reinicia e também pode perder', () => {
    const game = exampleHarness(asteroidsExample)
    const asteroidsBeforeStart = game.groups[1]
    expect(asteroidsBeforeStart).toBeDefined()
    for (let frame = 0; frame < 80; frame += 1) game.nextFrame()
    expect(asteroidsBeforeStart?.items).toHaveLength(0)

    game.fireKey('Enter')
    expect(game.api.sceneIs('jogando')).toBe(true)
    const shots = game.groups[0]
    const asteroids = game.groups[1]
    expect(shots).toBeDefined()
    expect(asteroids).toBeDefined()

    for (let point = 0; point < 25; point += 1) {
      game.fireKey('Space')
      const shot = shots?.items.at(-1)
      expect(shot).toBeDefined()
      if (shot && asteroids) {
        shot.vx = 0
        shot.vy = 0
        game.api.spawn(asteroids, {
          x: shot.x,
          y: shot.y,
          w: 30,
          h: 30,
          color: '#888888',
          vx: 0,
          vy: 0,
        })
      }
      game.nextFrame()
    }
    expect(game.scores['Pontos:']).toBe(25)
    expect(game.api.sceneIs('ganhou')).toBe(true)

    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('inicio')).toBe(true)
    const waitingAsteroids = game.groups.at(-1)
    for (let frame = 0; frame < 80; frame += 1) game.nextFrame()
    expect(waitingAsteroids?.items).toHaveLength(0)

    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    const restartedShip = game.sprites.at(-1)
    const restartedAsteroids = game.groups.at(-1)
    for (let impact = 0; impact < 6 && !game.api.sceneIs('perdeu'); impact += 1) {
      if (restartedShip && restartedAsteroids) {
        restartedShip.blinkFrames = 0
        game.api.spawn(restartedAsteroids, {
          x: restartedShip.x,
          y: restartedShip.y,
          w: restartedShip.w,
          h: restartedShip.h,
          color: '#888888',
          vx: 0,
          vy: 0,
        })
      }
      game.nextFrame()
    }
    expect(game.scores['Vidas:']).toBeLessThanOrEqual(0)
    expect(game.api.sceneIs('perdeu')).toBe(true)
    expect(game.errors).toEqual([])
  })

  it('Asteroides clássico gira, atira, pontua, colide e recomeça', () => {
    const game = exampleHarness(asteroidsClassicExample)
    const ship = game.sprites[0]
    game.fireKey('Enter')
    game.fireKey('ArrowRight')
    game.nextFrame()
    game.fireKey('ArrowRight', 'keyup')
    expect(Math.abs(ship?.angle ?? 0)).toBeGreaterThan(0)

    game.fireKey('Space')
    const shots = game.groups[0]
    const asteroids = game.groups[1]
    const shot = shots?.items.at(-1)
    if (shot && asteroids) {
      shot.vx = 0
      shot.vy = 0
      game.api.spawn(asteroids, {
        x: shot.x,
        y: shot.y,
        w: 30,
        h: 30,
        color: '#888888',
        vx: 0,
        vy: 0,
      })
    }
    game.nextFrame()
    expect(game.scores['Pontos:']).toBe(1)

    if (ship && asteroids) {
      game.api.spawn(asteroids, {
        x: ship.x,
        y: ship.y,
        w: ship.w,
        h: ship.h,
        color: '#888888',
        vx: 0,
        vy: 0,
      })
    }
    game.nextFrame()
    expect(game.api.sceneIs('perdeu')).toBe(true)
    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('inicio')).toBe(true)
    expect(game.errors).toEqual([])
  })

  it('Dino Run coleta ovo, perde as três vidas, salva o resultado e reinicia', () => {
    const game = exampleHarness(dinoRunExample)
    const dino = game.sprites[0]
    const obstacles = game.groups[0]
    const eggs = game.groups[1]
    game.fireKey('Enter')

    if (dino && eggs) {
      game.api.spawn(eggs, {
        x: dino.x,
        y: dino.y,
        w: 24,
        h: 30,
        color: '#ffd54a',
        vx: 0,
        vy: 0,
      })
    }
    game.nextFrame()
    expect(game.scores['Pontos:']).toBeGreaterThanOrEqual(10)

    for (let life = 0; life < 3; life += 1) {
      if (dino && obstacles) {
        dino.blinkFrames = 0
        game.api.spawn(obstacles, {
          x: dino.x,
          y: dino.y,
          w: 36,
          h: 36,
          color: '#5f8c3a',
          vx: 0,
          vy: 0,
        })
      }
      game.nextFrame()
    }
    expect(game.api.sceneIs('perdeu')).toBe(true)
    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('inicio')).toBe(true)
    expect(game.groups.length).toBe(4)
    expect(game.errors).toEqual([])
  })

  it('Guerra de Gorilas permite mirar, acertar, vencer e começar uma cidade nova', () => {
    const game = exampleHarness(gorilasExample)
    game.fireKey('Enter')
    const [playerOne, playerTwo] = game.throwers
    expect(playerOne).toBeDefined()
    expect(playerTwo).toBeDefined()
    if (playerOne && playerTwo) {
      playerTwo.x = playerOne.x
      playerTwo.y = playerOne.y
      game.firePointer('pointerdown', playerOne.x + playerOne.w / 2, playerOne.y + 18)
      game.nextFrame()
      game.firePointer('pointerup', playerOne.x + playerOne.w / 2, playerOne.y + 18)
      game.nextFrame()
    }
    expect(game.api.sceneIs('ganhou1')).toBe(true)
    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('inicio')).toBe(true)
    expect(game.cities).toHaveLength(2)
    expect(game.errors).toEqual([])
  })

  it('Guerra de Gorilas vs Robô troca o turno e o robô realmente mira e joga', () => {
    const game = exampleHarness(gorilasVsRobotExample, () => 0)
    game.fireKey('Enter')
    const [human, robot] = game.throwers
    expect(human).toBeDefined()
    expect(robot).toBeDefined()

    if (human) {
      game.firePointer('pointerdown', human.x + human.w / 2, human.y + 18)
      game.nextFrame()
      game.firePointer('pointerup', human.x + human.w / 2, human.y + 18)
    }
    for (let frame = 0; frame < 120 && game.scores['Vez:'] !== 2; frame += 1) {
      game.nextFrame()
    }
    expect(game.scores['Vez:']).toBe(2)

    if (human && robot) {
      human.x = robot.x
      human.y = robot.y
    }
    for (let frame = 0; frame < 70 && !game.api.sceneIs('ganhou2'); frame += 1) {
      game.nextFrame()
    }
    expect(game.calls.computerTurn).toBeGreaterThanOrEqual(49)
    expect(game.api.sceneIs('ganhou2')).toBe(true)
    expect(game.errors).toEqual([])
  })

  it('Equilibrista atravessa uma plataforma, cai e reinicia o kit por completo', () => {
    const game = exampleHarness(stickHeroExample)
    const stickGame = game.stickGames[0]
    expect(stickGame).toBeDefined()
    if (!stickGame) return
    const target = stickGame.platforms[1]
    const stick = stickGame.sticks[0]
    expect(target).toBeDefined()
    expect(stick).toBeDefined()
    const targetLength = target && stick ? target.x + target.w / 2 - stick.x : 0

    game.firePointer('pointerdown', 100, 100)
    for (let frame = 0; frame < 200 && (stick?.length ?? 0) < targetLength; frame += 1) {
      game.nextFrame()
    }
    game.firePointer('pointerup', 100, 100)
    for (let frame = 0; frame < 240 && stickGame.phase !== 'waiting'; frame += 1) {
      game.nextFrame()
    }
    expect(stickGame.score).toBeGreaterThan(0)

    stickGame.phase = 'falling'
    stickGame.heroY = stickGame.h + 1
    game.nextFrame()
    expect(stickGame.phase).toBe('over')
    game.fireKey('Enter')
    expect(stickGame.phase).toBe('waiting')
    expect(stickGame.score).toBe(0)
    expect(game.errors).toEqual([])
  })

  it('Balão sobe, consome combustível, avança, termina e reinicia', () => {
    const game = exampleHarness(balloonExample)
    const balloon = game.balloonGames[0]
    expect(balloon).toBeDefined()
    if (!balloon) return
    game.firePointer('pointerdown', 100, 100)
    for (let frame = 0; frame < 35; frame += 1) game.nextFrame()
    game.firePointer('pointerup', 100, 100)
    expect(balloon.by).toBeLessThan(balloon.groundY)
    expect(balloon.fuel).toBeLessThan(100)
    expect(balloon.meters).toBeGreaterThan(0)

    balloon.fuel = 0
    balloon.by = balloon.groundY
    balloon.vVel = 0
    game.nextFrame()
    expect(balloon.over).toBe(true)
    game.fireKey('Enter')
    expect(balloon.over).toBe(false)
    expect(balloon.fuel).toBe(100)
    expect(game.errors).toEqual([])
  })

  it('Aventura com câmera percorre o mundo, coleta as 4 moedas e conclui a exploração', () => {
    const game = exampleHarness(cameraAdventureExample)
    const hero = game.sprites[0]
    const scenery = game.groups[0]
    const coins = game.groups[1]
    expect(scenery?.items).toHaveLength(6)
    expect(coins?.items).toHaveLength(4)
    for (let found = 0; found < 4; found += 1) {
      const coin = coins?.items[0]
      expect(coin).toBeDefined()
      if (hero && coin) {
        hero.x = coin.x
        hero.y = coin.y
      }
      game.nextFrame()
    }
    expect(coins?.items).toHaveLength(0)
    expect(game.scores['Moedas:']).toBe(4)
    expect(game.api.cameraX()).toBeGreaterThan(0)
    expect(game.errors).toEqual([])
    expect(game.warnings).toEqual([])
  })
})
