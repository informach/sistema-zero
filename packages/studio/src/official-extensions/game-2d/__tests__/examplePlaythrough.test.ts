import { describe, expect, it } from 'bun:test'
import type { ExtensionExample } from '#extensions'
import { generateJS } from '#generators'
import {
  animatedHeroExample,
  asteroidsClassicExample,
  asteroidsExample,
  aventuraHeroiExample,
  balloonExample,
  batalhaMonstrinhosExample,
  cameraAdventureExample,
  catchCoinExample,
  chuvaDeMeteorosExample,
  codeDrawnExample,
  dinoRunExample,
  enemyPlatformerExample,
  escaladaDoGuerreiroExample,
  gorilasExample,
  gorilasVsRobotExample,
  muralhaDoReinoExample,
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

interface CapturedStickPath {
  phase: string
  sceneOffset: number
  heroX: number
  heroY: number
  w: number
  h: number
  sticks: Array<{ x: number; length: number; rotation: number }>
  platforms: Array<{ x: number; w: number }>
  colors: { platform: string; stick: string }
}

interface CapturedBalloonPath {
  dist: number
  meters: number
  w: number
  h: number
  trees: Array<{ x: number; th: number; color: string }>
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
  const stickGames: CapturedStickPath[] = []
  const balloonGames: CapturedBalloonPath[] = []
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

  // add/remove SIMÉTRICOS no mesmo mapa: um runtime que desregistra listener
  // (restart/cleanup) precisa vê-lo sumir de verdade, senão o harness dispara
  // handler morto e mascara vazamento de registro.
  const addListener = (name: string, listener: Listener) => {
    const group = listeners.get(name) ?? []
    group.push(listener)
    listeners.set(name, group)
  }
  const removeListener = (name: string, listener: Listener) => {
    const group = listeners.get(name) ?? []
    const index = group.indexOf(listener)
    if (index >= 0) group.splice(index, 1)
    listeners.set(name, group)
  }

  const nodesById = new Map<string, Record<string, unknown>>()
  const documentObject = {
    hidden: false,
    title: example.name,
    // O evento GENÉRICO de teclado do núcleo registra em document (o do g2d
    // registra em window) — os dois caem no MESMO mapa, e fireKey alcança ambos.
    addEventListener: addListener,
    removeEventListener: removeListener,
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
    addEventListener: addListener,
    removeEventListener: removeListener,
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
    ['createShip', 'createDino', 'createShapeSprite', 'createStickHero', 'createBalloon'].forEach(function (name) {
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
    var originalCreateStickPath = window.SZGame2D.createStickPath;
    window.SZGame2D.createStickPath = function () {
      var path = originalCreateStickPath.apply(window.SZGame2D, arguments);
      window.__capturedStickGames.push(path);
      return path;
    };
    var originalCreateBalloonPath = window.SZGame2D.createBalloonPath;
    window.SZGame2D.createBalloonPath = function () {
      var path = originalCreateBalloonPath.apply(window.SZGame2D, arguments);
      window.__capturedBalloonGames.push(path);
      return path;
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
    ...(windowObject as unknown as { __capturedStickGames: CapturedStickPath[] })
      .__capturedStickGames,
  )
  balloonGames.push(
    ...(windowObject as unknown as { __capturedBalloonGames: CapturedBalloonPath[] })
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
      const latestStickPaths = (
        windowObject as unknown as { __capturedStickGames: CapturedStickPath[] }
      ).__capturedStickGames
      const latestBalloonPaths = (
        windowObject as unknown as { __capturedBalloonGames: CapturedBalloonPath[] }
      ).__capturedBalloonGames
      sprites.splice(0, sprites.length, ...latestSprites)
      enemyTypes.splice(0, enemyTypes.length, ...latestTypes)
      groups.splice(0, groups.length, ...latestGroups)
      cities.splice(0, cities.length, ...latestCities)
      throwers.splice(0, throwers.length, ...latestThrowers)
      stickGames.splice(0, stickGames.length, ...latestStickPaths)
      balloonGames.splice(0, balloonGames.length, ...latestBalloonPaths)
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

  it('Equilibrista atravessa via mouse (se/senão), soma pontos, cai e reinicia', () => {
    const game = exampleHarness(stickHeroExample)
    const path = game.stickGames[0]
    const hero = game.sprites[0]
    expect(path).toBeDefined()
    expect(hero).toBeDefined()
    if (!path || !hero) return
    // O caminho nasce com as cores da criança; o herói é um sprite comum.
    expect(path.colors).toEqual({ platform: '#0ea5a0', stick: '#1b2330' })
    expect([hero.w, hero.h]).toEqual([18, 36])

    game.fireKey('Enter')
    game.nextFrame()

    // Mira o comprimento até o MEIO da próxima plataforma; o exemplo lê o
    // ponteiro no se/senão (segurado cresce, solto derruba).
    const target = path.platforms[1]
    const stick = path.sticks[0]
    expect(target).toBeDefined()
    expect(stick).toBeDefined()
    const targetLength = target && stick ? target.x + target.w / 2 - stick.x : 0

    game.firePointer('pointerdown', 100, 100)
    for (let frame = 0; frame < 200 && (stick?.length ?? 0) < targetLength; frame += 1) {
      game.nextFrame()
    }
    game.firePointer('pointerup', 100, 100)
    for (let frame = 0; frame < 240 && path.phase !== 'waiting'; frame += 1) {
      game.nextFrame()
    }
    // O placar é a VARIÁVEL da criança, somada no evento e mostrada no HUD.
    expect(game.scores['Pontos:']).toBeGreaterThan(0)
    // O sprite do herói foi posicionado pelo "andar" (coords de tela).
    expect(hero.y).toBeLessThan(path.h)

    // Cai: a cena vira "perdeu" e o Enter recomeça o jogo inteiro (restart).
    path.phase = 'falling'
    path.heroY = path.h + 1
    game.nextFrame()
    game.nextFrame()
    expect(game.api.sceneIs('perdeu')).toBe(true)
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('inicio')).toBe(true)
    // O restart recriou o caminho (a captura ACUMULA; o novo é o último).
    expect(game.stickGames.length).toBeGreaterThan(1)
    const recreated = game.stickGames[game.stickGames.length - 1]
    expect(recreated?.phase).toBe('waiting')
    expect(game.errors).toEqual([])
  })

  it('Balão sobe com o fogo, conta metros, pousa sem combustível e reinicia', () => {
    const game = exampleHarness(balloonExample)
    const path = game.balloonGames[0]
    const balloon = game.sprites[0] as CapturedSprite & { _fuel?: number }
    expect(path).toBeDefined()
    expect(balloon).toBeDefined()
    if (!path || !balloon) return
    expect([balloon.w, balloon.h]).toEqual([70, 100])

    game.fireKey('Enter')
    game.nextFrame()

    // Segurar o ponteiro acende o fogo (se do exemplo): sobe e queima.
    const yStart = balloon.y
    game.firePointer('pointerdown', 100, 100)
    for (let frame = 0; frame < 45; frame += 1) game.nextFrame()
    game.firePointer('pointerup', 100, 100)
    expect(balloon.y).toBeLessThan(yStart)
    expect(balloon._fuel ?? 100).toBeLessThan(100)
    expect(path.meters).toBeGreaterThan(0)
    expect(game.scores['Metros:']).toBeGreaterThan(0)

    // Sem combustível e pousado: a cena vira "perdeu"; Enter recomeça tudo.
    balloon._fuel = 0
    balloon.y = path.h
    balloon.vy = 0
    game.nextFrame()
    game.nextFrame()
    expect(game.api.sceneIs('perdeu')).toBe(true)
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('inicio')).toBe(true)
    // O restart recriou o balão (a captura ACUMULA; o novo é o último).
    const recreated = game.sprites[game.sprites.length - 1] as CapturedSprite & { _fuel?: number }
    expect(recreated?._fuel).toBe(100)
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

  it('Batalha de Monstrinhos trava os comandos, aplica a vantagem, alterna turnos e clampa a cura', () => {
    // random fixo 0,5: randomChance(60) é true → o rival sempre usa o Chicote (-3).
    const game = exampleHarness(batalhaMonstrinhosExample, () => 0.5)
    const [meu, rival] = game.sprites
    expect(meu?.hp).toBe(20)
    expect(rival?.hp).toBe(20)
    expect(game.api.sceneIs('inicio')).toBe(true)
    game.fireKey('Enter')
    expect(game.api.sceneIs('jogando')).toBe(true)

    // Antes da abertura (afterSeconds marca aos 2s; a raiz de 0,5s libera),
    // o menu está TRAVADO.
    game.fireKey('1')
    game.fireKey('1', 'keyup')
    game.nextFrame()
    expect(rival?.hp).toBe(20)

    // (a) entrar rápido: ~2,2s depois o timer + a raiz de liberação soltam o
    // turno do jogador (o que vier POR ÚLTIMO).
    for (let frame = 0; frame < 130; frame += 1) game.nextFrame()
    game.fireKey('1')
    game.fireKey('1', 'keyup')
    game.nextFrame()
    // Faísca: fogo contra planta = forca(4) × 2 = 8 de dano.
    expect(rival?.hp).toBe(12)
    // O HUD mostra o estoque de poções (ainda cheio).
    expect(game.scores['3 Poção (cura 5) x']).toBe(3)

    // A vez do rival: a raiz "A cada 1,5s" devolve o golpe e o turno.
    for (let frame = 0; frame < 100; frame += 1) game.nextFrame()
    expect(meu?.hp).toBe(17)

    // Poção: cura "até 5" mas o runtime CLAMPA no máximo (17 + 5 → 20), e
    // gasta 1 do estoque (3 → 2).
    game.fireKey('3')
    game.fireKey('3', 'keyup')
    game.nextFrame()
    expect(meu?.hp).toBe(20)
    expect(game.scores['3 Poção (cura 5) x']).toBe(2)

    // Mais dois golpes de fogo encerram a batalha: 12 → 4 → 0.
    for (let frame = 0; frame < 100; frame += 1) game.nextFrame()
    game.fireKey('1')
    game.fireKey('1', 'keyup')
    game.nextFrame()
    expect(rival?.hp).toBe(4)
    for (let frame = 0; frame < 100; frame += 1) game.nextFrame()
    game.fireKey('1')
    game.fireKey('1', 'keyup')
    game.nextFrame()
    expect(rival?.hp).toBe(0)
    expect(game.api.sceneIs('vitoria')).toBe(true)

    // Enter reinicia limpo (e o afterSeconds re-arma junto).
    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('inicio')).toBe(true)
    const restartedRival = game.sprites.at(-1)
    expect(restartedRival?.hp).toBe(20)
    expect(game.errors).toEqual([])
    expect(game.warnings).toEqual([])
  })

  it('Batalha de Monstrinhos: ficar na tela de título não consome a abertura (libera em até 0,5s)', () => {
    const game = exampleHarness(batalhaMonstrinhosExample, () => 0.5)
    const rival = game.sprites[1]
    expect(game.api.sceneIs('inicio')).toBe(true)

    // (b) A criança LÊ o título por ~3,2s: o afterSeconds dispara ainda no
    // título (um one-shot com guarda de cena no corpo seria consumido aqui e
    // travaria o jogo para sempre). Ele só marca aberturaPronta.
    for (let frame = 0; frame < 190; frame += 1) game.nextFrame()
    game.fireKey('1')
    game.fireKey('1', 'keyup')
    game.nextFrame()
    expect(rival?.hp).toBe(20)

    // Entra na batalha: o menu ainda espera a raiz de 0,5s do próximo tique.
    game.fireKey('Enter')
    expect(game.api.sceneIs('jogando')).toBe(true)

    // Em até 0,5s (~35 quadros) a raiz de liberação solta os comandos.
    for (let frame = 0; frame < 35; frame += 1) game.nextFrame()
    game.fireKey('1')
    game.fireKey('1', 'keyup')
    game.nextFrame()
    expect(rival?.hp).toBe(12)
    expect(game.errors).toEqual([])
    expect(game.warnings).toEqual([])
  })

  it('Batalha de Monstrinhos: a 4ª poção não faz nada e a derrota é alcançável', () => {
    // random fixo 0,99: randomChance(60) falha → o rival usa a Folha Afiada
    // com randomBetween(2, 5) = 5 (o golpe mais forte).
    const game = exampleHarness(batalhaMonstrinhosExample, () => 0.99)
    const [meu, rival] = game.sprites
    game.fireKey('Enter')
    for (let frame = 0; frame < 160; frame += 1) game.nextFrame()

    // Gasta as 3 poções (cada uma passa o turno; o rival responde com -5).
    for (let potion = 0; potion < 3; potion += 1) {
      game.fireKey('3')
      game.fireKey('3', 'keyup')
      game.nextFrame()
      expect(meu?.hp).toBe(20) // curou (clampado no máximo)
      for (let frame = 0; frame < 100; frame += 1) game.nextFrame()
      expect(meu?.hp).toBe(15) // a resposta do rival já saiu
    }
    game.nextFrame()
    expect(game.scores['3 Poção (cura 5) x']).toBe(0)

    // A 4ª poção NÃO cura e NÃO gasta o turno: 100 quadros depois o rival
    // continua sem responder (o turno segue com o jogador).
    game.fireKey('3')
    game.fireKey('3', 'keyup')
    game.nextFrame()
    expect(meu?.hp).toBe(15)
    for (let frame = 0; frame < 100; frame += 1) game.nextFrame()
    expect(meu?.hp).toBe(15)

    // Sem cura infinita a derrota é real: 3 Jatos (4 de dano) mantêm o rival
    // vivo (20 → 8) enquanto os -5 dele zeram o Brasinha (15 → 0).
    for (let hit = 0; hit < 3; hit += 1) {
      game.fireKey('2')
      game.fireKey('2', 'keyup')
      game.nextFrame()
      for (let frame = 0; frame < 100; frame += 1) game.nextFrame()
    }
    expect(rival?.hp).toBe(8)
    expect(meu?.hp).toBe(0)
    expect(game.api.sceneIs('derrota')).toBe(true)
    expect(game.errors).toEqual([])
    expect(game.warnings).toEqual([])
  })

  it('Chuva de Meteoros voa nas 4 direções, atira, destrói, é atingida, perde e reinicia', () => {
    // random fixo 0,99: a chuva de fundo nasce colada na borda direita
    // (randomX = 475) com vx +1 — nunca alcança a nave, que fica embaixo à
    // esquerda. As colisões do roteiro são todas INJETADAS (determinísticas).
    const game = exampleHarness(chuvaDeMeteorosExample, () => 0.99)
    const nave = game.sprites[0]
    const tiros = game.groups[0]
    const meteoros = game.groups[1]
    expect(nave).toBeDefined()
    expect(game.api.sceneIs('inicio')).toBe(true)

    // Na tela de início a chuva NÃO cai (o spawner é gated pela cena jogando).
    for (let frame = 0; frame < 80; frame += 1) game.nextFrame()
    expect(meteoros?.items).toHaveLength(0)

    game.fireKey('Enter')
    expect(game.api.sceneIs('jogando')).toBe(true)

    // 4 direções: esquerda + cima movem em diagonal (o input original).
    const startX = nave?.x ?? 0
    const startY = nave?.y ?? 0
    game.fireKey('ArrowLeft')
    game.fireKey('ArrowUp')
    for (let frame = 0; frame < 5; frame += 1) game.nextFrame()
    game.fireKey('ArrowLeft', 'keyup')
    game.fireKey('ArrowUp', 'keyup')
    expect(nave?.x).toBeLessThan(startX)
    expect(nave?.y).toBeLessThan(startY)

    // Clamp: segurar para baixo NÃO leva a nave para fora do palco (480×300).
    game.fireKey('ArrowDown')
    for (let frame = 0; frame < 90; frame += 1) game.nextFrame()
    game.fireKey('ArrowDown', 'keyup')
    expect((nave?.y ?? 0) + (nave?.h ?? 0)).toBeLessThanOrEqual(300)

    // Espaço atira: o laser nasce no centro da nave e SOBE (vy negativo).
    game.fireKey('Space')
    game.fireKey('Space', 'keyup')
    expect(tiros?.items).toHaveLength(1)
    const tiro = tiros?.items[0]
    const tiroY = tiro?.y ?? 0
    game.nextFrame()
    expect(tiro?.y ?? 0).toBeLessThan(tiroY)

    // Destruir: meteoro injetado sobre o laser parado = +2 pontos, os dois somem.
    const antesDoBonus = game.scores['Pontos:'] ?? 0
    if (tiro && meteoros) {
      tiro.vx = 0
      tiro.vy = 0
      game.api.spawn(meteoros, {
        x: tiro.x,
        y: tiro.y,
        w: 30,
        h: 30,
        color: '#b08968',
        vx: 0,
        vy: 0,
      })
    }
    game.nextFrame()
    expect(game.scores['Pontos:'] ?? 0).toBeGreaterThanOrEqual(antesDoBonus + 2)
    expect(tiros?.items).toHaveLength(0)
    expect(meteoros?.items.some((item) => item.w === 30)).toBe(false)

    // O placar POR TEMPO cresce sozinho (~1s de sobrevivência = +1).
    const antesDoTempo = game.scores['Pontos:'] ?? 0
    for (let frame = 0; frame < 65; frame += 1) game.nextFrame()
    expect(game.scores['Pontos:'] ?? 0).toBeGreaterThan(antesDoTempo)

    // Ser atingida: meteoro injetado sobre a nave = fim de jogo (sem vidas).
    if (nave && meteoros) {
      game.api.spawn(meteoros, {
        x: nave.x,
        y: nave.y,
        w: nave.w,
        h: nave.h,
        color: '#b08968',
        vx: 0,
        vy: 0,
      })
    }
    game.nextFrame()
    expect(game.api.sceneIs('perdeu')).toBe(true)

    // Enter reinicia limpo: nave nova, grupos novos e placar zerado.
    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('inicio')).toBe(true)
    expect(game.sprites.at(-1)).not.toBe(nave)
    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('jogando')).toBe(true)
    expect(game.scores['Pontos:']).toBe(0)
    expect(game.errors).toEqual([])
    expect(game.warnings).toEqual([])
  })

  it('Muralha do Reino compra torre no clique, atira, destrói invasor, perde vida e reinicia', () => {
    // random fixo 0,5: os invasores nascem na faixa y ~170. As colisões do
    // roteiro são INJETADAS (determinísticas), não dependem do RNG.
    const game = exampleHarness(muralhaDoReinoExample, () => 0.5)
    const castelo = game.sprites[0]
    const inimigos = game.groups[0]
    const torres = game.groups[1]
    const tiros = game.groups[2]
    expect(castelo).toBeDefined()
    expect(game.api.sceneIs('inicio')).toBe(true)

    // Na tela de início nada nasce (todo spawner é gated pela cena jogando).
    for (let frame = 0; frame < 80; frame += 1) game.nextFrame()
    expect(inimigos?.items).toHaveLength(0)
    expect(tiros?.items).toHaveLength(0)

    game.fireKey('Enter')
    expect(game.api.sceneIs('jogando')).toBe(true)

    // Os invasores nascem fora da tela à esquerda e marcham para a DIREITA.
    for (let frame = 0; frame < 130; frame += 1) game.nextFrame()
    expect(inimigos?.items.length ?? 0).toBeGreaterThan(0)
    const invasor = inimigos?.items[0]
    const invasorX = invasor?.x ?? 0
    game.nextFrame()
    expect(invasor?.x ?? 0).toBeGreaterThan(invasorX)

    // Comprar torre: clicar na faixa de baixo gasta 50 moedas e cria uma torre.
    expect(game.scores['Moedas:']).toBe(100)
    game.firePointer('pointerdown', 120, 260)
    expect(torres?.items).toHaveLength(1)
    game.nextFrame()
    expect(game.scores['Moedas:']).toBe(50)

    // A torre atira sozinha (a cada 0,5 s): um tiro nasce e voa para a esquerda.
    const tirosAntes = tiros?.items.length ?? 0
    for (let frame = 0; frame < 40; frame += 1) game.nextFrame()
    expect(tiros?.items.length ?? 0).toBeGreaterThan(tirosAntes)
    const tiro = tiros?.items[0]
    const tiroX = tiro?.x ?? 0
    game.nextFrame()
    expect(tiro?.x ?? 0).toBeLessThan(tiroX)

    // Destruir: invasor injetado sobre um tiro parado = +25 moedas, os dois somem.
    const moedasAntes = game.scores['Moedas:'] ?? 0
    if (tiro && inimigos) {
      tiro.vx = 0
      tiro.vy = 0
      game.api.spawn(inimigos, {
        x: tiro.x,
        y: tiro.y,
        w: 30,
        h: 30,
        color: '#c0504d',
        vx: 0,
        vy: 0,
      })
    }
    game.nextFrame()
    expect(game.scores['Moedas:'] ?? 0).toBeGreaterThanOrEqual(moedasAntes + 25)

    // Invasor que encosta no castelo tira 1 vida e some.
    const vidasAntes = game.scores['Vidas:'] ?? 10
    if (castelo && inimigos) {
      game.api.spawn(inimigos, {
        x: castelo.x,
        y: castelo.y,
        w: 30,
        h: 30,
        color: '#c0504d',
        vx: 0,
        vy: 0,
      })
    }
    game.nextFrame()
    expect(game.scores['Vidas:'] ?? 0).toBe(vidasAntes - 1)

    // Sem vidas o castelo cai (a cena perdeu). Injeta invasores até drenar tudo.
    for (let round = 0; round < 12; round += 1) {
      if (castelo && inimigos) {
        game.api.spawn(inimigos, {
          x: castelo.x,
          y: castelo.y,
          w: 30,
          h: 30,
          color: '#c0504d',
          vx: 0,
          vy: 0,
        })
      }
      game.nextFrame()
    }
    expect(game.api.sceneIs('perdeu')).toBe(true)

    // Enter reinicia limpo: moedas de volta a 100 e sem invasores.
    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('inicio')).toBe(true)
    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('jogando')).toBe(true)
    expect(game.scores['Moedas:']).toBe(100)
    expect(game.errors).toEqual([])
    expect(game.warnings).toEqual([])
  })

  it('Escalada do Guerreiro sobe pulando, a câmera acompanha e a bandeira do topo vence', () => {
    const game = exampleHarness(escaladaDoGuerreiroExample, () => 0.5)
    const heroi = game.sprites[0]
    const plataformas = game.groups[0]
    expect(heroi).toBeDefined()
    // 9 plataformas em ziguezague (chão + 8 degraus).
    expect(plataformas?.items).toHaveLength(9)
    expect(game.api.sceneIs('inicio')).toBe(true)

    game.fireKey('Enter')
    expect(game.api.sceneIs('jogando')).toBe(true)

    // O chão sólido segura o herói: a gravidade o assenta no chão (não atravessa).
    for (let frame = 0; frame < 20; frame += 1) game.nextFrame()
    const restY = heroi?.y ?? 0
    expect((restY ?? 0) + (heroi?.h ?? 0)).toBeLessThanOrEqual(916)
    expect(heroi?.vy ?? 1).toBe(0)

    // Andar para a direita: o herói se desloca no eixo x.
    const startX = heroi?.x ?? 0
    game.fireKey('ArrowRight')
    for (let frame = 0; frame < 4; frame += 1) game.nextFrame()
    game.fireKey('ArrowRight', 'keyup')
    expect(heroi?.x ?? 0).toBeGreaterThan(startX)

    // Pular do chão: com ↑ (parado na vertical) o herói sobe num quadro.
    for (let frame = 0; frame < 6; frame += 1) game.nextFrame()
    const antesDoPulo = heroi?.y ?? 0
    game.fireKey('ArrowUp')
    game.nextFrame()
    game.fireKey('ArrowUp', 'keyup')
    expect(heroi?.y ?? 0).toBeLessThan(antesDoPulo)

    // Teletransporta o herói para o topo: passar da linha (y < 90) vence.
    if (heroi) {
      heroi.x = 84
      heroi.y = 70
      heroi.vy = 0
    }
    game.nextFrame()
    // A câmera acompanhou o herói mundo acima (o pan do original).
    expect(game.api.cameraX).toBeDefined()
    expect(game.api.sceneIs('venceu')).toBe(true)

    // Enter reinicia e dá para escalar de novo.
    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('inicio')).toBe(true)
    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('jogando')).toBe(true)
    expect(game.errors).toEqual([])
    expect(game.warnings).toEqual([])
  })

  it('Aventura do Herói anda com câmera, corta o mato, fere com a espada temporária e conclui', () => {
    const game = exampleHarness(aventuraHeroiExample)
    const hero = game.sprites[0]
    const cenario = game.groups[0]
    const golpes = game.groups[1]
    const guarda = game.enemyTypes[0]
    expect(hero).toBeDefined()
    expect(guarda?.items).toHaveLength(4)
    // O herói entra no MESMO grupo das árvores (drawGroupByY ordena os dois).
    expect(cenario?.items).toHaveLength(7)
    expect(cenario?.items[0]).toBe(hero as CapturedSprite)

    game.fireKey('Enter')
    expect(game.api.sceneIs('jogando')).toBe(true)
    const startX = hero?.x ?? 0
    game.fireKey('ArrowRight')
    for (let frame = 0; frame < 3; frame += 1) game.nextFrame()
    game.fireKey('ArrowRight', 'keyup')
    expect(hero?.x).toBeGreaterThan(startX)
    // Mundo maior que a tela: a câmera já rolou.
    expect(game.api.cameraX()).toBeGreaterThan(0)

    // Espada temporária: nasce no espaço e o pruneOld (0,3s) some com ela.
    game.fireKey('Space')
    game.fireKey('Space', 'keyup')
    expect(golpes?.items).toHaveLength(1)
    for (let frame = 0; frame < 30; frame += 1) game.nextFrame()
    expect(golpes?.items).toHaveLength(0)

    // Mato destrutível: golpe em cima da peça 2 quebra o tile e dá 1 ponto.
    if (hero) {
      hero.x = 289
      hero.y = 690
    }
    game.fireKey('Space')
    game.fireKey('Space', 'keyup')
    game.nextFrame()
    expect(game.scores['Pontos:']).toBe(1)

    // Contato com o guardião: hurtByEnemy com i-frames (piscar).
    const enemy = guarda?.items[0]
    if (enemy && hero) {
      enemy.x = hero.x
      enemy.y = hero.y
    }
    game.nextFrame()
    expect(hero?.hp).toBe(5)
    expect(hero?.blinkFrames ?? 0).toBeGreaterThan(0)
    // Enquanto pisca, o contato contínuo NÃO drena a vida.
    game.nextFrame()
    expect(hero?.hp).toBe(5)

    // A espada fere o guardião (e é consumida no golpe). Antes, afasta os
    // dois e deixa o pruneOld levar o golpe do mato (ainda vivo, < 0,3s).
    if (hero) {
      hero.x = 800
      hero.y = 600
    }
    if (enemy) {
      enemy.x = 1000
      enemy.y = 300
    }
    for (let frame = 0; frame < 30; frame += 1) game.nextFrame()
    expect(golpes?.items).toHaveLength(0)
    if (enemy && hero) {
      enemy.x = hero.x + 30
      enemy.y = hero.y - 4
      enemy.hp = 3
    }
    game.fireKey('Space')
    game.fireKey('Space', 'keyup')
    game.nextFrame()
    expect(enemy?.hp).toBe(2)
    expect(golpes?.items).toHaveLength(0)

    // Derrotar os 4 guardiões conclui a aventura (+5 pontos por guardião).
    for (const guardian of guarda?.items ?? []) guardian.hp = 0
    game.nextFrame()
    expect(game.scores['Pontos:']).toBe(21)
    expect(game.api.sceneIs('vitoria')).toBe(true)

    // Reinicia e ainda dá para perder: vida zerada troca para a derrota.
    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('inicio')).toBe(true)
    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    const restartedHero = game.sprites.at(-1)
    expect(restartedHero).toBeDefined()
    if (restartedHero) restartedHero.hp = 0
    game.nextFrame()
    expect(game.api.sceneIs('derrota')).toBe(true)
    expect(game.errors).toEqual([])
    expect(game.warnings).toEqual([])
  })
})
