import type { TaskWorker } from './workerTask'

/**
 * The first message every owned worker posts, before any reply: its entry module finished
 * loading and evaluating. Owners never `terminate()` a worker before this (or an error) arrives.
 *
 * ⚠️ Bun 1.3.x frees a worker's VM the moment `terminate()` interrupts the module load, while a
 * transpiler job for that module graph is still running on the thread pool and writing into the
 * VM (`SavedSourceMap.putValue` → "Segmentation fault at address 0xFFFFFFFFFFFFFFF8";
 * oven-sh/bun#33936, fixed upstream in 1.4.0). A cold transpiler cache and two CPUs — the CI
 * runner — widen that window to milliseconds, which is exactly how long StrictMode and a
 * cancelled preview keep a worker. Browsers survive the same terminate, so the handshake costs
 * them one tiny message; the test runner needs it to stay alive.
 */
export const WORKER_LOADED_MESSAGE = { type: 'loaded' } as const

export function isWorkerLoadedMessage(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const keys = Object.keys(value)
  return keys.length === 1 && keys[0] === 'type' && (value as { type: unknown }).type === 'loaded'
}

declare const self: Pick<Worker, 'postMessage'>
/** Last statement of every `*.worker.ts`: imports resolved, handlers installed, now say hello. */
export function announceWorkerLoaded(): void {
  self.postMessage(WORKER_LOADED_MESSAGE)
}

/**
 * Owns the lifetime of one worker. `release()` terminates it at once when it has already
 * reported in (any message or error event) and otherwise on its first sign of life — never while
 * the module is still loading. Idempotent; call it before installing the protocol listeners so
 * the first event is seen here first.
 */
export function ownWorker(worker: TaskWorker): { release(): void } {
  let reportedIn = false
  let released = false
  let terminated = false
  function terminate() {
    if (terminated) return
    terminated = true
    worker.terminate()
  }
  function onFirstSign(event: Event) {
    if (reportedIn) return
    reportedIn = true
    worker.removeEventListener('message', onFirstSign)
    worker.removeEventListener('error', onFirstSign)
    worker.removeEventListener('messageerror', onFirstSign)
    if (!released) return
    // Nobody owns this worker any more: its load error is not an uncaught error of the page.
    if (event.type === 'error') event.preventDefault()
    terminate()
  }
  worker.addEventListener('message', onFirstSign)
  worker.addEventListener('error', onFirstSign)
  worker.addEventListener('messageerror', onFirstSign)
  return {
    release() {
      if (released) return
      released = true
      if (reportedIn) terminate()
    },
  }
}
