import { describe, expect, it } from 'bun:test'
import {
  createProjectRunContext,
  type ManagedProjectRun,
  type ProjectLifecycleTarget,
  type ProjectRunClock,
  type ProjectRunIntervalHandle,
  type ProjectRunTimeoutHandle,
  type ProjectRunTimers,
} from '#extensions'
import type { BehaviorIR } from '#ir'
import { parseProjectFilesFromParts } from '#parsers'
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
  loops: [{ type: 'animationLoop', body: [] }],
}

class TestWindow extends EventTarget {
  readonly __SZProjectLifecycle: { begin(): ManagedProjectRun }

  constructor(begin: () => ManagedProjectRun) {
    super()
    this.__SZProjectLifecycle = { begin }
  }
}

function runRestartScenario(
  target: ProjectLifecycleTarget,
  restartMethod: 'restart' | 'restartGame',
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
  }

  const code = generateJS({ behavior: BEHAVIOR, lifecycle: target })
  new Function(
    'SZGame2D',
    'SZGameKit',
    'window',
    'document',
    'requestAnimationFrame',
    'cancelAnimationFrame',
    'console',
    code,
  )(engine, engine, testWindow, documentTarget, requestFrame, cancelFrame, {
    log: (value: unknown) => logs.push(value),
  })

  documentTarget.dispatchEvent(new Event('click'))
  expect(logs).toEqual(['clique'])
  expect(frames.size).toBe(1)

  engine[restartMethod]()
  documentTarget.dispatchEvent(new Event('click'))

  expect(logs).toEqual(['clique', 'clique'])
  expect(frames.size).toBe(1)
}

function runAllManagedResourcesScenario(
  target: ProjectLifecycleTarget,
  restartMethod: 'restart' | 'restartGame',
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
  }

  const code = generateJS({ behavior: ALL_MANAGED_RESOURCES_BEHAVIOR, lifecycle: target })
  new Function(
    'SZGame2D',
    'SZGameKit',
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

  engine[restartMethod]()
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
  it('descarta listener e RAF anteriores ao reiniciar Jogo 2D', () => {
    runRestartScenario('game-2d', 'restart')
  })

  it('descarta listener e RAF anteriores ao reiniciar Jogo 2D Avançado', () => {
    runRestartScenario('game-2d-advanced', 'restartGame')
  })

  it('descarta listeners nomeados, timers e RAFs avulsos ao reiniciar Jogo 2D', () => {
    runAllManagedResourcesScenario('game-2d', 'restart')
  })

  it('descarta listeners nomeados, timers e RAFs avulsos ao reiniciar Jogo 2D Avançado', () => {
    runAllManagedResourcesScenario('game-2d-advanced', 'restartGame')
  })

  it.each([
    'game-2d',
    'game-2d-advanced',
  ] as const)('remove somente a infraestrutura gerada no round-trip de %s', (target) => {
    const code = generateJS({ behavior: ALL_MANAGED_RESOURCES_BEHAVIOR, lifecycle: target })
    const reparsed = parseProjectFilesFromParts({
      html: [],
      cssSource: '',
      jsSource: code,
    }).ir.behavior

    expect(reparsed).toEqual(ALL_MANAGED_RESOURCES_BEHAVIOR)
  })
})
