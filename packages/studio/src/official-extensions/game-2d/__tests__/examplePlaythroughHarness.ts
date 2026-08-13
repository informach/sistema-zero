/**
 * Harness que RODA um exemplo do Jogo 2D quadro a quadro.
 *
 * Nasceu dentro do `examplePlaythrough.test.ts` e foi extraído em 12/08 porque o
 * Reino Zero — a campanha carro-chefe, 32 fases — não tinha UM teste que jogasse:
 * ele aparecia só em dois arquivos, os dois estáticos (`JSON.stringify(ir).toContain`
 * e auditoria de grade). É a mesma classe que já custou caro aqui: *os testes
 * asseriam que a bala NASCEU, nunca que ACERTOU*.
 *
 * ⚠️ O `ctx` é um Proxy que devolve no-op para qualquer método: este harness prova
 * ORDEM e CONTAGEM de chamadas, nunca COR, composição alfa ou ordem de camada.
 * Para isso é preciso `getImageData` num Chrome de verdade.
 */
import type { ExtensionExample } from '#extensions'
import { generateJS } from '#generators'
import { gameTwoDRuntime } from '../runtime'
import type { GameTwoDLifecycleApi } from '../runtimeContract'

export type Listener = (event: Record<string, unknown>) => void

export interface CapturedSprite {
  x: number
  y: number
  w: number
  h: number
  hp?: number
  hpMax?: number
  blinkFrames?: number
  angle?: number
  anim?: unknown
  vx?: number
  vy?: number
  onGround?: boolean
  _shell?: boolean
  _shellMoving?: boolean
  _shellSpeed?: number
  dmg?: number
}

export interface CapturedEnemyType {
  items: CapturedSprite[]
  config?: Record<string, unknown>
  _stompMode?: string
}

export interface CapturedGroup {
  items: CapturedSprite[]
}

export interface CapturedStickPath {
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

export interface CapturedBalloonPath {
  dist: number
  meters: number
  w: number
  h: number
  trees: Array<{ x: number; th: number; color: string }>
}

export interface CapturedCity {
  holes: unknown[]
}

/**
 * Só o recorte que os testes leem. Os tipos capturados acima são substitutos
 * estruturais dos do runtime — por isso a API não é o `GameTwoDRuntimeApi` inteiro.
 */
export type RuntimeApi = Pick<GameTwoDLifecycleApi, 'sceneIs'> & {
  spawn(group: CapturedGroup, options: Record<string, unknown>): CapturedSprite | null
  cameraX(): number
  actionDown(action: string): boolean
  actionPressed(action: string): boolean
  countGroup(group: CapturedGroup | CapturedEnemyType): number
  clearGroup(group: CapturedGroup | CapturedEnemyType): void
  getHealth(sprite: CapturedSprite): number
  spriteX(sprite: CapturedSprite): number
  spriteY(sprite: CapturedSprite): number
  isPaused(): boolean
}

/** Um texto desenhado pela fonte de pixel neste quadro. */
export interface CapturedPixelText {
  text: string
  x: number
  y: number
  size: number
  color: string
  align: string
}

export function exampleHarness(example: ExtensionExample, random: () => number = Math.random) {
  const listeners = new Map<string, Listener[]>()
  const frames = new Map<number, (timestamp: number) => void>()
  const sprites: CapturedSprite[] = []
  const enemyTypes: CapturedEnemyType[] = []
  const groups: CapturedGroup[] = []
  const stickGames: CapturedStickPath[] = []
  const balloonGames: CapturedBalloonPath[] = []
  const cities: CapturedCity[] = []
  const throwers: CapturedSprite[] = []
  // ⚠️ Pode ser texto: o campo de fase do Reino Zero mostra "1-1", como no original.
  const scores: Record<string, number | string> = {}
  const pixelTexts: CapturedPixelText[] = []
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
    window.__capturedPixelTexts = [];
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
    // O Reino Zero escreve boa parte do que a criança lê pela fonte de PIXEL, que
    // não passa pelo drawScore: sem este embrulho o harness ficaria cego para as
    // telas de título, o placar e a mensagem de fim.
    // O placar do Reino Zero passou para a fonte de PIXEL (uma tipografia só no jogo),
    // então ele não passa mais pelo drawScore — sem este embrulho o harness ficaria
    // cego para pontos, moedas, fase, tempo e vidas.
    var originalDrawPixelScore = window.SZGame2D.drawPixelScore;
    window.SZGame2D.drawPixelScore = function (ctx, label, value, x, y, size, color) {
      window.__capturedScores[label] = value;
      return originalDrawPixelScore(ctx, label, value, x, y, size, color);
    };
    var originalDrawPixelText = window.SZGame2D.drawPixelText;
    window.SZGame2D.drawPixelText = function (ctx, text, x, y, size, color, align) {
      window.__capturedPixelTexts.push({
        text: String(text === undefined || text === null ? '' : text),
        x: x, y: y, size: size, color: color, align: align
      });
      return originalDrawPixelText(ctx, text, x, y, size, color, align);
    };
  `
  const executable = `with (window) { ${gameTwoDRuntime}\n${instrumentation}\n${generated} }`
  new Function('window', 'document', 'requestAnimationFrame', 'cancelAnimationFrame', executable)(
    windowObject,
    documentObject,
    requestAnimationFrame,
    cancelAnimationFrame,
  )
  const captured = <T>(key: string): T[] =>
    (windowObject as unknown as Record<string, T[]>)[key] as T[]

  sprites.push(...captured<CapturedSprite>('__capturedSprites'))
  enemyTypes.push(...captured<CapturedEnemyType>('__capturedEnemyTypes'))
  groups.push(...captured<CapturedGroup>('__capturedGroups'))
  stickGames.push(...captured<CapturedStickPath>('__capturedStickGames'))
  balloonGames.push(...captured<CapturedBalloonPath>('__capturedBalloonGames'))
  cities.push(...captured<CapturedCity>('__capturedCities'))
  throwers.push(...captured<CapturedSprite>('__capturedThrowers'))

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
    /** Textos da fonte de pixel desenhados no ÚLTIMO quadro (zerado a cada quadro). */
    pixelTexts,
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
    /** Dispara um evento avulso na janela (blur, visibilitychange…). */
    fireWindow(type: string, event: Record<string, unknown> = {}) {
      for (const listener of [...(listeners.get(type) ?? [])]) listener(event)
    },
    nextFrame() {
      timestamp += 17
      // Os textos de pixel são por QUADRO: acumular entre quadros faria uma
      // asserção de "o que está na tela agora" ler o que já saiu dela.
      ;(
        windowObject as unknown as { __capturedPixelTexts: CapturedPixelText[] }
      ).__capturedPixelTexts = []
      const batch = [...frames.entries()]
      frames.clear()
      for (const [, callback] of batch) callback(timestamp)
      sprites.splice(0, sprites.length, ...captured<CapturedSprite>('__capturedSprites'))
      enemyTypes.splice(
        0,
        enemyTypes.length,
        ...captured<CapturedEnemyType>('__capturedEnemyTypes'),
      )
      groups.splice(0, groups.length, ...captured<CapturedGroup>('__capturedGroups'))
      cities.splice(0, cities.length, ...captured<CapturedCity>('__capturedCities'))
      throwers.splice(0, throwers.length, ...captured<CapturedSprite>('__capturedThrowers'))
      stickGames.splice(
        0,
        stickGames.length,
        ...captured<CapturedStickPath>('__capturedStickGames'),
      )
      balloonGames.splice(
        0,
        balloonGames.length,
        ...captured<CapturedBalloonPath>('__capturedBalloonGames'),
      )
      pixelTexts.splice(
        0,
        pixelTexts.length,
        ...captured<CapturedPixelText>('__capturedPixelTexts'),
      )
      Object.assign(
        scores,
        (windowObject as unknown as { __capturedScores: Record<string, number | string> })
          .__capturedScores,
      )
      Object.assign(
        calls,
        (windowObject as unknown as { __capturedCalls: Record<string, number> }).__capturedCalls,
      )
    },
  }
}

export type ExampleHarness = ReturnType<typeof exampleHarness>
