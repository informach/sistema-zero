import type {
  ProjectRunContext,
  ProjectRunIntervalHandle,
  ProjectRunScheduler,
  ProjectRunTimeoutHandle,
} from './types'

export interface ProjectRunClock {
  requestFrame(callback: FrameRequestCallback): number
  cancelFrame(id: number): void
}

export interface ProjectRunTimers {
  setTimeout(callback: () => void, delayMs: number): ProjectRunTimeoutHandle
  clearTimeout(id: ProjectRunTimeoutHandle): void
  setInterval(callback: () => void, delayMs: number): ProjectRunIntervalHandle
  clearInterval(id: ProjectRunIntervalHandle): void
}

export interface ManagedProjectRun extends ProjectRunContext {
  dispose(): void
}

export const PROJECT_RUN_LIFECYCLE_GLOBAL = '__SZProjectLifecycle'

/**
 * Contexto descartável de uma execução. O scheduler opcional usa um único RAF;
 * recursos registrados pelo gerador são descartados em ordem LIFO.
 */
export function createProjectRunContext(options: {
  requestRestart: () => void
  runCallback?: <T>(callback: () => T) => T | undefined
  isControlSignal?: (error: unknown) => boolean
  clock?: ProjectRunClock
  timers?: ProjectRunTimers
}): ManagedProjectRun {
  // Esta função é autocontida porque o preview serializa a implementação abaixo
  // para dentro do iframe. Não mova o clock padrão para um helper externo.
  const clock = options.clock ?? {
    requestFrame: (callback: FrameRequestCallback) => requestAnimationFrame(callback),
    cancelFrame: (id: number) => cancelAnimationFrame(id),
  }
  const timers: ProjectRunTimers = options.timers ?? {
    setTimeout: (callback: () => void, delayMs: number) => setTimeout(callback, delayMs),
    clearTimeout: (id: ProjectRunTimeoutHandle) =>
      clearTimeout(id as ReturnType<typeof setTimeout>),
    setInterval: (callback: () => void, delayMs: number) => setInterval(callback, delayMs),
    clearInterval: (id: ProjectRunIntervalHandle) =>
      clearInterval(id as ReturnType<typeof setInterval>),
  }
  const controller = new AbortController()
  const frameCallbacks = new Set<(deltaSeconds: number) => void>()
  const pendingFrames = new Set<number>()
  const pendingTimeouts = new Set<ProjectRunTimeoutHandle>()
  const activeIntervals = new Set<ProjectRunIntervalHandle>()
  const resources: Array<() => void> = []
  let frameId: number | null = null
  let previousTime: number | null = null
  let paused = false
  let schedulerDisposed = false
  let disposed = false

  const runCallback = <T>(callback: () => T): T | undefined => {
    if (disposed) return undefined
    return options.runCallback ? options.runCallback(callback) : callback()
  }

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
    for (const callback of [...frameCallbacks]) {
      runCallback(() => callback(deltaSeconds))
      if (disposed) break
    }
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
    run: runCallback,
    isControlSignal(error) {
      return options.isControlSignal?.(error) ?? false
    },
    setTimeout(callback, delayMs) {
      if (disposed) return -1
      let id: ProjectRunTimeoutHandle = -1
      id = timers.setTimeout(() => {
        pendingTimeouts.delete(id)
        if (!disposed) runCallback(callback)
      }, delayMs)
      pendingTimeouts.add(id)
      return id
    },
    setInterval(callback, delayMs) {
      if (disposed) return -1
      const id = timers.setInterval(() => {
        if (!disposed) runCallback(callback)
      }, delayMs)
      activeIntervals.add(id)
      return id
    },
    requestFrame(callback) {
      if (disposed) return -1
      let id = -1
      id = clock.requestFrame((time) => {
        pendingFrames.delete(id)
        if (!disposed) runCallback(() => callback(time))
      })
      pendingFrames.add(id)
      return id
    },
    setEventHandler(target, property, callback) {
      if (disposed || !target) return
      const managedHandler = (event: Event): unknown =>
        runCallback(() => callback.call(target, event))
      Reflect.set(target, property, managedHandler)
      resources.push(() => {
        if (Reflect.get(target, property) === managedHandler) {
          Reflect.set(target, property, null)
        }
      })
    },
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
      for (const id of pendingFrames) clock.cancelFrame(id)
      pendingFrames.clear()
      for (const id of pendingTimeouts) timers.clearTimeout(id)
      pendingTimeouts.clear()
      for (const id of activeIntervals) timers.clearInterval(id)
      activeIntervals.clear()
      for (const dispose of resources.reverse()) {
        try {
          dispose()
        } catch (error) {
          // Um recurso defeituoso não impede a limpeza dos demais, mas a falha
          // continua visível no console para não mascarar o defeito original.
          console.error('Falha ao descartar um recurso da execução do projeto.', error)
        }
      }
      resources.length = 0
    },
  }
}

/**
 * Runtime compartilhado pelo preview e pelo site exportado. A factory do projeto
 * chama `begin()` em toda execução; o manager encerra a execução anterior antes
 * de entregar o novo contexto.
 *
 * `createProjectRunContext` é a fonte única da implementação. Como ela é
 * autocontida, sua representação JavaScript pode ser executada dentro do iframe
 * sem manter uma segunda cópia do algoritmo em uma template string.
 */
export function buildProjectRunContextRuntime(): string {
  const createRunSource = createProjectRunContext.toString()
  return `(function () {
  const createProjectRunContext = ${createRunSource};
  let currentRun;
  let activeCallbacks = 0;
  const controlSignal = Object.freeze({ kind: 'sz-project-restart' });

  function isControlSignal(error) {
    return error === controlSignal;
  }

  function run(callback, thisArg, args) {
    if (typeof callback !== 'function') return;
    const isRootCallback = activeCallbacks === 0;
    activeCallbacks++;
    try {
      return callback.apply(thisArg, args || []);
    } catch (error) {
      if (isRootCallback && isControlSignal(error)) return;
      throw error;
    } finally {
      activeCallbacks--;
    }
  }

  function endCallback() {
    if (activeCallbacks > 0) throw controlSignal;
  }

  function disposeCurrentRun() {
    if (!currentRun) return;
    currentRun.dispose();
    currentRun = undefined;
  }

  function begin(requestRestart) {
    disposeCurrentRun();
    currentRun = createProjectRunContext({
      requestRestart: typeof requestRestart === 'function' ? requestRestart : function () {},
      runCallback: run,
      isControlSignal: isControlSignal,
    });
    return currentRun;
  }

  window.addEventListener('pagehide', disposeCurrentRun, { once: true });
  window[${JSON.stringify(PROJECT_RUN_LIFECYCLE_GLOBAL)}] = Object.freeze({
    begin: begin,
    dispose: disposeCurrentRun,
    run: run,
    endCallback: endCallback,
    isControlSignal: isControlSignal,
  });
})();`
}
