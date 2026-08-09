import { describe, expect, it } from 'bun:test'
import {
  buildProjectRunContextRuntime,
  createProjectRunContext,
  type ManagedProjectRun,
  type ProjectLifecycleTarget,
  type ProjectRunClock,
  type ProjectRunIntervalHandle,
  type ProjectRunTimeoutHandle,
  type ProjectRunTimers,
} from '#extensions'
import type { BehaviorIR, JSStatement } from '#ir'
import { parseProjectFilesFromParts } from '#parsers'
import { gameTwoDRuntime } from '../../official-extensions/game-2d/runtime'
import type { GameTwoDRuntimeApi } from '../../official-extensions/game-2d/runtimeContract'
import { generateJS } from '../js'

const BEHAVIOR: BehaviorIR = {
  start: [],
  events: [
    {
      type: 'event',
      target: 'document',
      targetKind: 'document',
      event: 'click',
      body: [{ type: 'consoleLog', value: { type: 'str', value: 'clique' } }],
    },
  ],
  loops: [{ type: 'animationLoop', body: [] }],
}

const ALL_MANAGED_RESOURCES_BEHAVIOR: BehaviorIR = {
  start: [
    {
      type: 'funcDecl',
      name: 'registrarClique',
      params: [],
      body: [{ type: 'consoleLog', value: { type: 'str', value: 'clique nomeado' } }],
    },
    {
      type: 'funcDecl',
      name: 'proximoQuadro',
      params: [],
      body: [
        { type: 'consoleLog', value: { type: 'str', value: 'quadro nomeado' } },
        { type: 'requestFrame', fn: 'proximoQuadro' },
      ],
    },
    {
      type: 'funcDecl',
      name: 'depois',
      params: [],
      body: [{ type: 'consoleLog', value: { type: 'str', value: 'timeout nomeado' } }],
    },
    { type: 'setTimeoutCall', fn: 'depois', delay: { type: 'num', value: 10 } },
    {
      type: 'setTimeout',
      delay: { type: 'num', value: 10 },
      body: [{ type: 'consoleLog', value: { type: 'str', value: 'timeout inline' } }],
    },
    {
      type: 'setTimeoutSeconds',
      delay: { type: 'num', value: 0.01 },
      body: [{ type: 'consoleLog', value: { type: 'str', value: 'timeout segundos' } }],
    },
    { type: 'requestFrame', fn: 'proximoQuadro' },
    {
      type: 'requestFrameDo',
      param: 'tempo',
      body: [{ type: 'consoleLog', value: { type: 'str', value: 'quadro inline' } }],
    },
  ],
  events: [
    {
      type: 'eventHandler',
      target: 'document',
      targetKind: 'document',
      event: 'click',
      handlerName: 'registrarClique',
    },
  ],
  loops: [
    {
      type: 'setInterval',
      delay: { type: 'num', value: 10 },
      body: [{ type: 'consoleLog', value: { type: 'str', value: 'intervalo inline' } }],
    },
    {
      type: 'setIntervalSeconds',
      delay: { type: 'num', value: 0.01 },
      body: [{ type: 'consoleLog', value: { type: 'str', value: 'intervalo segundos' } }],
    },
    { type: 'animationLoop', body: [] },
  ],
}

const DEFERRED_CALLBACKS_BEHAVIOR: BehaviorIR = {
  // O import é MOLDE: traz a biblioteca e não faz nada por si só.
  molds: [{ type: 'importStar', name: 'THREE', module: 'three' }],
  start: [
    {
      type: 'newInstance',
      varName: 'carregador',
      className: 'GLTFLoader',
      args: [],
      namespace: 'THREE',
    },
    {
      type: 'fetchJson',
      url: { type: 'str', value: '/dados.json' },
      okName: 'dados',
      body: [{ type: 'consoleLog', value: { type: 'var', name: 'dados' } }],
      catchName: 'erroFetch',
      catchBody: [{ type: 'consoleLog', value: { type: 'var', name: 'erroFetch' } }],
    },
    {
      type: 'loaderLoad',
      resourceKind: 'model',
      loaderVar: 'carregador',
      url: { type: 'str', value: 'modelo.glb' },
      param: 'modelo',
      body: [{ type: 'consoleLog', value: { type: 'var', name: 'modelo' } }],
      errorParam: 'erroModelo',
      errorBody: [{ type: 'consoleLog', value: { type: 'var', name: 'erroModelo' } }],
    },
  ],
  events: [
    {
      type: 'onClickAssign',
      target: { type: 'var', name: 'botao' },
      body: [{ type: 'consoleLog', value: { type: 'str', value: 'clique' } }],
    },
    {
      type: 'imageOnLoad',
      target: { type: 'var', name: 'imagem' },
      body: [{ type: 'consoleLog', value: { type: 'str', value: 'carregou' } }],
    },
    {
      type: 'imageOnError',
      target: { type: 'var', name: 'imagem' },
      body: [{ type: 'consoleLog', value: { type: 'str', value: 'falhou' } }],
    },
    {
      type: 'physicsLiteCollisionEvent',
      world: 'fisica',
      bodyParam: 'corpo',
      colliderParam: 'outro',
      body: [{ type: 'consoleLog', value: { type: 'var', name: 'outro' } }],
    },
    {
      type: 'physicsLiteTriggerEvent',
      world: 'fisica',
      bodyParam: 'corpo',
      triggerParam: 'gatilho',
      enteringParam: 'entrou',
      body: [{ type: 'consoleLog', value: { type: 'var', name: 'entrou' } }],
    },
  ],
  loops: [
    { type: 'animationLoop', body: [] },
    {
      type: 'animationLoop',
      handle: 'quadroCancelavel',
      body: [{ type: 'consoleLog', value: { type: 'str', value: 'cancelável' } }],
    },
    {
      type: 'animationLoop',
      timeVar: 'tempo',
      deltaVar: 'delta',
      body: [{ type: 'consoleLog', value: { type: 'var', name: 'delta' } }],
    },
    {
      type: 'animationLoop',
      handle: 'quadroComTempo',
      timeVar: 'tempoComHandle',
      deltaVar: 'deltaComHandle',
      body: [{ type: 'consoleLog', value: { type: 'var', name: 'tempoComHandle' } }],
    },
  ],
}

class TestWindow extends EventTarget {
  readonly __SZProjectLifecycle: { begin(): ManagedProjectRun }

  constructor(begin: () => ManagedProjectRun) {
    super()
    this.__SZProjectLifecycle = { begin }
  }
}

function runGeneratedGameTwoDEvent(body: JSStatement[]): unknown[] {
  class RuntimeWindow extends EventTarget {
    SZGame2D?: Record<string, unknown>
    performance = { now: () => 0 }
    devicePixelRatio = 1
  }

  const runtimeWindow = new RuntimeWindow()
  const documentTarget = new EventTarget()
  const logs: unknown[] = []
  const requestFrame = () => 1
  const cancelFrame = () => undefined

  new Function(
    'window',
    'requestAnimationFrame',
    'cancelAnimationFrame',
    'AbortController',
    'console',
    buildProjectRunContextRuntime(),
  )(runtimeWindow, requestFrame, cancelFrame, AbortController, console)
  new Function('window', 'requestAnimationFrame', 'cancelAnimationFrame', gameTwoDRuntime)(
    runtimeWindow,
    requestFrame,
    cancelFrame,
  )

  const behavior: BehaviorIR = {
    start: [{ type: 'consoleLog', value: { type: 'str', value: 'inicio' } }],
    events: [
      {
        type: 'event',
        target: 'document',
        targetKind: 'document',
        event: 'click',
        body,
      },
    ],
    loops: [],
  }
  const code = generateJS({ behavior, lifecycle: 'game-2d' })
  new Function('SZGame2D', 'window', 'document', 'console', code)(
    runtimeWindow.SZGame2D,
    runtimeWindow,
    documentTarget,
    { log: (value: unknown) => logs.push(value) },
  )
  documentTarget.dispatchEvent(new Event('click'))
  return logs
}

interface GeneratedProjectLifecycle {
  dispose(): void
}

class ManagedRuntimeWindow extends EventTarget {
  SZGame2D?: GameTwoDRuntimeApi
  __SZProjectLifecycle?: GeneratedProjectLifecycle
  performance = { now: () => 0 }
  devicePixelRatio = 1
}

function createManagedGameTwoDRuntime() {
  let nextFrameId = 1
  const frames = new Map<number, FrameRequestCallback>()
  const requestFrame = (callback: FrameRequestCallback): number => {
    const id = nextFrameId++
    frames.set(id, callback)
    return id
  }
  const cancelFrame = (id: number): void => {
    frames.delete(id)
  }
  const runtimeWindow = new ManagedRuntimeWindow()
  new Function('window', 'requestAnimationFrame', 'cancelAnimationFrame', gameTwoDRuntime)(
    runtimeWindow,
    requestFrame,
    cancelFrame,
  )
  if (!runtimeWindow.SZGame2D || !runtimeWindow.__SZProjectLifecycle) {
    throw new Error('runtime Jogo 2D não instalou a API e o lifecycle gerenciado')
  }
  return {
    api: runtimeWindow.SZGame2D,
    lifecycle: runtimeWindow.__SZProjectLifecycle,
    runtimeWindow,
    frames,
    requestFrame,
    cancelFrame,
  }
}

function runNextFrame(frames: Map<number, FrameRequestCallback>, time = 16): void {
  const next = frames.entries().next()
  if (next.done) throw new Error('nenhum requestAnimationFrame pendente')
  const [id, callback] = next.value
  frames.delete(id)
  callback(time)
}

function runAnimationRestartInsideFrameScenario(): { logs: unknown[]; pendingFrames: number } {
  const harness = createManagedGameTwoDRuntime()
  const documentTarget = new EventTarget()
  const logs: unknown[] = []
  const behavior: BehaviorIR = {
    start: [
      { type: 'var', name: 'armado', value: { type: 'bool', value: false } },
      { type: 'consoleLog', value: { type: 'str', value: 'inicio' } },
    ],
    events: [
      {
        type: 'event',
        target: 'document',
        targetKind: 'document',
        event: 'click',
        body: [{ type: 'assign', name: 'armado', value: { type: 'bool', value: true } }],
      },
    ],
    loops: [
      {
        type: 'animationLoop',
        body: [
          {
            type: 'if',
            cond: { type: 'var', name: 'armado' },
            then: [
              { type: 'g2d:restart' },
              { type: 'consoleLog', value: { type: 'str', value: 'continuação antiga' } },
            ],
          },
        ],
      },
    ],
  }
  const code = generateJS({ behavior, lifecycle: 'game-2d' })
  new Function(
    'SZGame2D',
    'window',
    'document',
    'requestAnimationFrame',
    'cancelAnimationFrame',
    'console',
    code,
  )(harness.api, harness.runtimeWindow, documentTarget, harness.requestFrame, harness.cancelFrame, {
    log: (value: unknown) => logs.push(value),
  })

  documentTarget.dispatchEvent(new Event('click'))
  runNextFrame(harness.frames)
  return { logs, pendingFrames: harness.frames.size }
}

interface Deferred<T> {
  promise: Promise<T>
  resolve(value: T): void
}

function deferred<T>(): Deferred<T> {
  let resolver: ((value: T) => void) | undefined
  const promise = new Promise<T>((resolve) => {
    resolver = resolve
  })
  return {
    promise,
    resolve(value) {
      if (!resolver) throw new Error('promessa diferida ainda não foi inicializada')
      resolver(value)
    },
  }
}

async function runFetchRestartScenario(): Promise<unknown[]> {
  const harness = createManagedGameTwoDRuntime()
  const logs: unknown[] = []
  const requests: Array<Deferred<Response>> = []
  const fakeFetch = (): Promise<Response> => {
    const request = deferred<Response>()
    requests.push(request)
    return request.promise
  }
  const behavior: BehaviorIR = {
    start: [
      { type: 'consoleLog', value: { type: 'str', value: 'inicio' } },
      {
        type: 'fetchJson',
        url: { type: 'str', value: 'https://example.test/dados' },
        okName: 'dados',
        body: [{ type: 'consoleLog', value: { type: 'var', name: 'dados' } }],
        catchName: 'erro',
        catchBody: [],
      },
    ],
    events: [],
    loops: [],
  }
  const code = generateJS({ behavior, lifecycle: 'game-2d' })
  new Function('SZGame2D', 'window', 'fetch', 'console', code)(
    harness.api,
    harness.runtimeWindow,
    fakeFetch,
    { log: (value: unknown) => logs.push(value) },
  )
  harness.api.restart()
  expect(requests).toHaveLength(2)

  const jsonRequested = deferred<void>()
  const jsonResult = deferred<unknown>()
  class DeferredJsonResponse extends Response {
    override json(): Promise<unknown> {
      jsonRequested.resolve()
      return jsonResult.promise
    }
  }
  const firstRequest = requests[0]
  if (!firstRequest) throw new Error('a primeira partida não iniciou o fetch esperado')
  firstRequest.resolve(new DeferredJsonResponse(null, { status: 200 }))
  await jsonRequested.promise
  await Promise.resolve()
  jsonResult.resolve({ run: 'antiga' })
  await jsonResult.promise
  await Promise.resolve()
  return logs
}

type PropertyEventHandler = (event: Event) => unknown

class PropertyEventTarget {
  onclick: PropertyEventHandler | null = null
  onload: PropertyEventHandler | null = null
  onerror: PropertyEventHandler | null = null
}

function runPropertyEventRestartScenario(): {
  logs: unknown[]
  targetAfterDispose: PropertyEventTarget
} {
  const harness = createManagedGameTwoDRuntime()
  const target = new PropertyEventTarget()
  const logs: unknown[] = []
  const documentTarget = {
    getElementById(id: string): PropertyEventTarget | null {
      return id === 'alvo' ? target : null
    },
  }
  const targetExpr = { type: 'getElement', id: 'alvo' } as const
  const behavior: BehaviorIR = {
    start: [{ type: 'consoleLog', value: { type: 'str', value: 'inicio' } }],
    events: [
      {
        type: 'onClickAssign',
        target: targetExpr,
        body: [{ type: 'consoleLog', value: { type: 'str', value: 'clique antigo' } }],
      },
      {
        type: 'imageOnLoad',
        target: targetExpr,
        body: [{ type: 'consoleLog', value: { type: 'str', value: 'imagem antiga' } }],
      },
      {
        type: 'imageOnError',
        target: targetExpr,
        body: [{ type: 'consoleLog', value: { type: 'str', value: 'erro antigo' } }],
      },
    ],
    loops: [],
  }
  const code = generateJS({ behavior, lifecycle: 'game-2d' })
  new Function('SZGame2D', 'window', 'document', 'console', code)(
    harness.api,
    harness.runtimeWindow,
    documentTarget,
    { log: (value: unknown) => logs.push(value) },
  )
  const oldHandlers = [target.onclick, target.onload, target.onerror]
  if (oldHandlers.some((handler) => typeof handler !== 'function')) {
    throw new Error('os três callbacks de propriedade deveriam ter sido registrados')
  }

  harness.api.restart()
  for (const handler of oldHandlers) handler?.(new Event('teste'))
  harness.lifecycle.dispose()
  return { logs, targetAfterDispose: target }
}

function runRestartScenario(
  target: ProjectLifecycleTarget,
  restartMethod: 'restart' | 'restartGame' | 'setStatePlaying',
) {
  let nextFrameId = 1
  const frames = new Map<number, FrameRequestCallback>()
  const requestFrame = (callback: FrameRequestCallback): number => {
    const id = nextFrameId
    nextFrameId += 1
    frames.set(id, callback)
    return id
  }
  const cancelFrame = (id: number): void => {
    frames.delete(id)
  }
  const clock: ProjectRunClock = { requestFrame, cancelFrame }
  let currentRun: ManagedProjectRun | undefined
  const testWindow = new TestWindow(() => {
    currentRun?.dispose()
    currentRun = createProjectRunContext({ requestRestart: () => undefined, clock })
    return currentRun
  })
  const documentTarget = new EventTarget()
  const logs: unknown[] = []
  let projectFactory: (() => void) | undefined
  const engine = {
    onStart(factory: () => void): void {
      projectFactory = factory
      factory()
    },
    runProject(factory: () => void): void {
      projectFactory = factory
      factory()
    },
    start(): void {},
    restart(): void {
      projectFactory?.()
    },
    restartGame(): void {
      projectFactory?.()
    },
    setState(state: string): void {
      if (state === 'jogando') projectFactory?.()
    },
  }

  const code = generateJS({ behavior: BEHAVIOR, lifecycle: target })
  new Function(
    'SZGame2D',
    'SZGameKit',
    'SZGameKit3D',
    'window',
    'document',
    'requestAnimationFrame',
    'cancelAnimationFrame',
    'console',
    code,
  )(engine, engine, engine, testWindow, documentTarget, requestFrame, cancelFrame, {
    log: (value: unknown) => logs.push(value),
  })

  documentTarget.dispatchEvent(new Event('click'))
  expect(logs).toEqual(['clique'])
  expect(frames.size).toBe(1)

  if (restartMethod === 'setStatePlaying') engine.setState('jogando')
  else engine[restartMethod]()
  documentTarget.dispatchEvent(new Event('click'))

  expect(logs).toEqual(['clique', 'clique'])
  expect(frames.size).toBe(1)
}

function runAllManagedResourcesScenario(
  target: ProjectLifecycleTarget,
  restartMethod: 'restart' | 'restartGame' | 'setStatePlaying',
): void {
  let nextId = 1
  const frames = new Map<number, FrameRequestCallback>()
  type TimerHandle = ProjectRunTimeoutHandle | ProjectRunIntervalHandle
  const timers = new Map<TimerHandle, { callback: () => void; repeat: boolean }>()
  const requestFrame = (callback: FrameRequestCallback): number => {
    const id = nextId++
    frames.set(id, callback)
    return id
  }
  const cancelFrame = (id: number): void => {
    frames.delete(id)
  }
  const setTimer = (callback: () => void, repeat: boolean): number => {
    const id = nextId++
    timers.set(id, { callback, repeat })
    return id
  }
  const clearTimer = (id: TimerHandle): void => {
    timers.delete(id)
  }
  const clock: ProjectRunClock = { requestFrame, cancelFrame }
  const runTimers: ProjectRunTimers = {
    setTimeout: (callback) => setTimer(callback, false),
    clearTimeout: clearTimer,
    setInterval: (callback) => setTimer(callback, true),
    clearInterval: clearTimer,
  }
  let currentRun: ManagedProjectRun | undefined
  const testWindow = new TestWindow(() => {
    currentRun?.dispose()
    currentRun = createProjectRunContext({
      requestRestart: () => undefined,
      clock,
      timers: runTimers,
    })
    return currentRun
  })
  const documentTarget = new EventTarget()
  const logs: unknown[] = []
  let projectFactory: (() => void) | undefined
  const engine = {
    onStart(factory: () => void): void {
      projectFactory = factory
      factory()
    },
    runProject(factory: () => void): void {
      projectFactory = factory
      factory()
    },
    start(): void {},
    restart(): void {
      projectFactory?.()
    },
    restartGame(): void {
      projectFactory?.()
    },
    setState(state: string): void {
      if (state === 'jogando') projectFactory?.()
    },
  }

  const code = generateJS({ behavior: ALL_MANAGED_RESOURCES_BEHAVIOR, lifecycle: target })
  new Function(
    'SZGame2D',
    'SZGameKit',
    'SZGameKit3D',
    'window',
    'document',
    'requestAnimationFrame',
    'cancelAnimationFrame',
    'setTimeout',
    'clearTimeout',
    'setInterval',
    'clearInterval',
    'console',
    code,
  )(
    engine,
    engine,
    engine,
    testWindow,
    documentTarget,
    requestFrame,
    cancelFrame,
    (callback: () => void) => setTimer(callback, false),
    clearTimer,
    (callback: () => void) => setTimer(callback, true),
    clearTimer,
    { log: (value: unknown) => logs.push(value) },
  )

  documentTarget.dispatchEvent(new Event('click'))
  expect(logs).toEqual(['clique nomeado'])
  expect(timers.size).toBe(5)
  expect(frames.size).toBe(3)

  if (restartMethod === 'setStatePlaying') engine.setState('jogando')
  else engine[restartMethod]()
  documentTarget.dispatchEvent(new Event('click'))

  expect({ logs, timers: timers.size, frames: frames.size }).toEqual({
    logs: ['clique nomeado', 'clique nomeado'],
    timers: 5,
    frames: 3,
  })

  const pendingTimers = [...timers]
  for (const [id, timer] of pendingTimers) {
    if (!timer.repeat) timers.delete(id)
    timer.callback()
  }
  const pendingFrames = [...frames]
  frames.clear()
  for (const [, callback] of pendingFrames) callback(16)

  expect(logs.filter((value) => value === 'intervalo inline')).toHaveLength(1)
  expect(logs.filter((value) => value === 'intervalo segundos')).toHaveLength(1)
  expect(logs.filter((value) => value === 'quadro nomeado')).toHaveLength(1)
  expect(logs.filter((value) => value === 'quadro inline')).toHaveLength(1)
}

describe('recursos genéricos da execução do projeto', () => {
  it('reinício num evento DOM encerra a pilha antiga antes do próximo bloco', () => {
    expect(
      runGeneratedGameTwoDEvent([
        { type: 'g2d:restart' },
        { type: 'consoleLog', value: { type: 'str', value: 'continuação antiga' } },
      ]),
    ).toEqual(['inicio', 'inicio'])
  })

  it('o bloco tentar não captura a fronteira interna de reinício', () => {
    expect(
      runGeneratedGameTwoDEvent([
        {
          type: 'tryCatch',
          errorName: 'erro',
          body: [{ type: 'g2d:restart' }],
          handler: [{ type: 'consoleLog', value: { type: 'str', value: 'reinício capturado' } }],
        },
        { type: 'consoleLog', value: { type: 'str', value: 'continuação antiga' } },
      ]),
    ).toEqual(['inicio', 'inicio'])
  })

  it('reinício dentro do próprio quadro encerra a continuação e não cria RAF zumbi', () => {
    expect(runAnimationRestartInsideFrameScenario()).toEqual({
      logs: ['inicio', 'inicio'],
      pendingFrames: 1,
    })
  })

  it('resposta de fetch iniciada pela partida anterior não atravessa o reinício', async () => {
    expect(await runFetchRestartScenario()).toEqual(['inicio', 'inicio'])
  })

  it('callbacks de clique e imagem antigos ficam inertes e são desregistrados', () => {
    const result = runPropertyEventRestartScenario()
    expect(result.logs).toEqual(['inicio', 'inicio'])
    expect(result.targetAfterDispose).toMatchObject({ onclick: null, onload: null, onerror: null })
  })

  it('descarta listener e RAF anteriores ao reiniciar Jogo 2D', () => {
    runRestartScenario('game-2d', 'restart')
  })

  it('descarta listener e RAF anteriores ao reiniciar Jogo 2D Avançado', () => {
    runRestartScenario('game-2d-advanced', 'restartGame')
  })

  it('descarta listener e RAF anteriores ao reiniciar Jogo 3D Avançado', () => {
    runRestartScenario('game-3d-advanced', 'setStatePlaying')
  })

  it('descarta listeners nomeados, timers e RAFs avulsos ao reiniciar Jogo 2D', () => {
    runAllManagedResourcesScenario('game-2d', 'restart')
  })

  it('descarta listeners nomeados, timers e RAFs avulsos ao reiniciar Jogo 2D Avançado', () => {
    runAllManagedResourcesScenario('game-2d-advanced', 'restartGame')
  })

  it('descarta listeners nomeados, timers e RAFs avulsos ao reiniciar Jogo 3D Avançado', () => {
    runAllManagedResourcesScenario('game-3d-advanced', 'setStatePlaying')
  })

  it.each([
    'game-2d',
    'game-2d-advanced',
    'game-3d-advanced',
  ] as const)('remove somente a infraestrutura gerada no round-trip de %s', (target) => {
    const code = generateJS({ behavior: ALL_MANAGED_RESOURCES_BEHAVIOR, lifecycle: target })
    const reparsed = parseProjectFilesFromParts({
      html: [],
      cssSource: '',
      jsSource: code,
    }).ir.behavior

    expect(reparsed).toEqual(ALL_MANAGED_RESOURCES_BEHAVIOR)
  })

  it('preserva todos os callbacks adiados gerenciados no round-trip', () => {
    const code = generateJS({ behavior: DEFERRED_CALLBACKS_BEHAVIOR, lifecycle: 'game-2d' })
    const reparsed = parseProjectFilesFromParts({
      html: [],
      cssSource: '',
      jsSource: code,
    }).ir.behavior

    expect(reparsed).toEqual(DEFERRED_CALLBACKS_BEHAVIOR)
    expect(code).toContain('.setEventHandler(')
    expect(code).toContain('.run(() => {')
  })
})
