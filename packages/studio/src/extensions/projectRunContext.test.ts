import { describe, expect, it } from 'bun:test'
import {
  buildProjectRunContextRuntime,
  createProjectRunContext,
  type ManagedProjectRun,
  type ProjectRunClock,
  type ProjectRunTimers,
} from './projectRunContext'
import type { ProjectRunIntervalHandle, ProjectRunTimeoutHandle } from './types'

function fakeClock() {
  let nextId = 1
  const callbacks = new Map<number, FrameRequestCallback>()
  const clock: ProjectRunClock = {
    requestFrame(callback) {
      const id = nextId
      nextId += 1
      callbacks.set(id, callback)
      return id
    },
    cancelFrame(id) {
      callbacks.delete(id)
    },
  }
  return {
    clock,
    tick(time: number) {
      const pending = [...callbacks.values()]
      callbacks.clear()
      for (const callback of pending) callback(time)
    },
    pending: () => callbacks.size,
  }
}

function fakeTimers() {
  let nextId = 1
  const timeouts = new Map<ProjectRunTimeoutHandle, () => void>()
  const intervals = new Map<ProjectRunIntervalHandle, () => void>()
  const timers: ProjectRunTimers = {
    setTimeout(callback) {
      const id = nextId++
      timeouts.set(id, callback)
      return id
    },
    clearTimeout(id) {
      timeouts.delete(id)
    },
    setInterval(callback) {
      const id = nextId++
      intervals.set(id, callback)
      return id
    },
    clearInterval(id) {
      intervals.delete(id)
    },
  }
  return {
    timers,
    fireTimeout(id: ProjectRunTimeoutHandle) {
      const callback = timeouts.get(id)
      timeouts.delete(id)
      callback?.()
    },
    fireInterval(id: ProjectRunIntervalHandle) {
      intervals.get(id)?.()
    },
    pending: () => ({ timeouts: timeouts.size, intervals: intervals.size }),
  }
}

describe('ProjectRunContext', () => {
  it('compõe quadro, cadências, pausa e retomada num único RAF', () => {
    const time = fakeClock()
    const run = createProjectRunContext({ requestRestart: () => undefined, clock: time.clock })
    let frames = 0
    let everyTwo = 0
    let everySecond = 0
    run.scheduler.onFrame(() => {
      frames += 1
    })
    run.scheduler.everyFrames(2, () => {
      everyTwo += 1
    })
    run.scheduler.everySeconds(1, () => {
      everySecond += 1
    })

    expect(time.pending()).toBe(1)
    time.tick(0)
    time.tick(500)
    time.tick(1_000)
    expect({ frames, everyTwo, everySecond }).toEqual({ frames: 3, everyTwo: 1, everySecond: 1 })

    run.scheduler.pause()
    expect(time.pending()).toBe(0)
    run.scheduler.resume()
    time.tick(10_000)
    expect(everySecond).toBe(1)
  })

  it('aborta e descarta todos os recursos em LIFO uma única vez', () => {
    const time = fakeClock()
    let restarts = 0
    const disposed: string[] = []
    const run = createProjectRunContext({
      requestRestart: () => {
        restarts += 1
      },
      clock: time.clock,
    })
    run.registerResource(() => disposed.push('primeiro'))
    run.registerResource(() => disposed.push('segundo'))
    run.requestRestart()
    run.dispose()
    run.dispose()
    run.requestRestart()

    expect(restarts).toBe(1)
    expect(run.signal.aborted).toBe(true)
    expect(disposed).toEqual(['segundo', 'primeiro'])
    expect(time.pending()).toBe(0)
  })

  it('acompanha timers e RAFs avulsos e remove os que já terminaram', () => {
    const time = fakeClock()
    const timer = fakeTimers()
    const calls: string[] = []
    const run = createProjectRunContext({
      requestRestart: () => undefined,
      clock: time.clock,
      timers: timer.timers,
    })
    const timeoutId = run.setTimeout(() => calls.push('timeout'), 10)
    const intervalId = run.setInterval(() => calls.push('intervalo'), 10)
    run.requestFrame(() => calls.push('quadro'))

    expect(timer.pending()).toEqual({ timeouts: 1, intervals: 1 })
    expect(time.pending()).toBe(1)
    timer.fireTimeout(timeoutId)
    time.tick(16)
    expect(calls).toEqual(['timeout', 'quadro'])

    run.dispose()
    timer.fireInterval(intervalId)
    expect(timer.pending()).toEqual({ timeouts: 0, intervals: 0 })
    expect(time.pending()).toBe(0)
    expect(calls).toEqual(['timeout', 'quadro'])
  })

  it('executa no iframe a mesma factory e descarta a execução anterior no begin', () => {
    class RuntimeWindow extends EventTarget {
      __SZProjectLifecycle?: {
        begin(requestRestart?: () => void): ManagedProjectRun
        dispose(): void
      }
    }

    const runtimeWindow = new RuntimeWindow()
    const time = fakeClock()
    new Function(
      'window',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'AbortController',
      'console',
      buildProjectRunContextRuntime(),
    )(runtimeWindow, time.clock.requestFrame, time.clock.cancelFrame, AbortController, console)
    const lifecycle = runtimeWindow.__SZProjectLifecycle
    if (!lifecycle) throw new Error('runtime não publicou o manager de execução')

    const disposed: string[] = []
    const first = lifecycle.begin()
    first.registerResource(() => disposed.push('primeira'))
    const second = lifecycle.begin()

    expect(first.signal.aborted).toBe(true)
    expect(second.signal.aborted).toBe(false)
    expect(disposed).toEqual(['primeira'])

    runtimeWindow.dispatchEvent(new Event('pagehide'))
    expect(second.signal.aborted).toBe(true)
  })
})
