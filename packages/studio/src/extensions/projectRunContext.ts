import type { ProjectRunContext, ProjectRunScheduler } from './types'

export interface ProjectRunClock {
  requestFrame(callback: FrameRequestCallback): number
  cancelFrame(id: number): void
}

export interface ManagedProjectRun extends ProjectRunContext {
  dispose(): void
}

function browserClock(): ProjectRunClock {
  return {
    requestFrame: (callback) => requestAnimationFrame(callback),
    cancelFrame: (id) => cancelAnimationFrame(id),
  }
}

/**
 * Contexto descartável de uma execução. Um único RAF alimenta todos os loops;
 * pausa não acumula delta e dispose cancela callbacks e recursos em ordem LIFO.
 */
export function createProjectRunContext(options: {
  requestRestart: () => void
  clock?: ProjectRunClock
}): ManagedProjectRun {
  const clock = options.clock ?? browserClock()
  const controller = new AbortController()
  const frameCallbacks = new Set<(deltaSeconds: number) => void>()
  const resources: Array<() => void> = []
  let frameId: number | null = null
  let previousTime: number | null = null
  let paused = false
  let schedulerDisposed = false
  let disposed = false

  const schedule = (): void => {
    if (disposed || schedulerDisposed || paused || frameId !== null || frameCallbacks.size === 0)
      return
    frameId = clock.requestFrame(tick)
  }

  const tick = (time: number): void => {
    frameId = null
    if (disposed || schedulerDisposed || paused) return
    const deltaSeconds = previousTime === null ? 0 : Math.max(0, (time - previousTime) / 1_000)
    previousTime = time
    for (const callback of [...frameCallbacks]) callback(deltaSeconds)
    schedule()
  }

  const scheduler: ProjectRunScheduler = {
    onFrame(callback) {
      if (disposed || schedulerDisposed) return () => undefined
      frameCallbacks.add(callback)
      schedule()
      return () => {
        frameCallbacks.delete(callback)
        if (frameCallbacks.size === 0 && frameId !== null) {
          clock.cancelFrame(frameId)
          frameId = null
        }
      }
    },
    everyFrames(frames, callback) {
      const interval = Math.max(1, Math.floor(frames))
      let count = 0
      return scheduler.onFrame(() => {
        count += 1
        if (count < interval) return
        count = 0
        callback()
      })
    },
    everySeconds(seconds, callback) {
      const interval = Math.max(0.001, seconds)
      let elapsed = 0
      return scheduler.onFrame((deltaSeconds) => {
        elapsed += deltaSeconds
        while (elapsed >= interval) {
          elapsed -= interval
          callback()
        }
      })
    },
    pause() {
      if (disposed || schedulerDisposed || paused) return
      paused = true
      previousTime = null
      if (frameId !== null) clock.cancelFrame(frameId)
      frameId = null
    },
    resume() {
      if (disposed || schedulerDisposed || !paused) return
      paused = false
      previousTime = null
      schedule()
    },
    dispose() {
      if (schedulerDisposed) return
      schedulerDisposed = true
      if (frameId !== null) clock.cancelFrame(frameId)
      frameId = null
      frameCallbacks.clear()
    },
  }

  return {
    signal: controller.signal,
    scheduler,
    registerResource(dispose) {
      if (disposed) {
        dispose()
        return
      }
      resources.push(dispose)
    },
    requestRestart() {
      if (!disposed) options.requestRestart()
    },
    dispose() {
      if (disposed) return
      disposed = true
      scheduler.dispose()
      controller.abort()
      for (const dispose of resources.reverse()) {
        try {
          dispose()
        } catch {
          // Um recurso defeituoso não impede a limpeza dos demais.
        }
      }
      resources.length = 0
    },
  }
}
