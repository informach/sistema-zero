import { describe, expect, it } from 'bun:test'
import {
  createProjectRunContext,
  type ManagedProjectRun,
  type ProjectLifecycleTarget,
  type ProjectRunClock,
} from '#extensions'
import type { BehaviorIR } from '#ir'
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

describe('recursos genéricos da execução do projeto', () => {
  it('descarta listener e RAF anteriores ao reiniciar Jogo 2D', () => {
    runRestartScenario('game-2d', 'restart')
  })

  it('descarta listener e RAF anteriores ao reiniciar Jogo 2D Avançado', () => {
    runRestartScenario('game-2d-advanced', 'restartGame')
  })
})
