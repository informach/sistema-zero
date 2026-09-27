import { newId } from '../core/id'
import type { SceneMeshGeometry } from '../scene/document'
import { SceneValidationError } from '../scene/validation'
import {
  readSceneSurfaceEnvelope,
  readSceneSurfaceReply,
  type SceneSurfaceApply,
  type SceneSurfaceInit,
} from './sceneSurfaceProtocol'
import { isWorkerLoadedMessage, ownWorker } from './workerHandshake'
import type { TaskWorker } from './workerTask'

// CPU baseline: 900 quads is a small synchronous operation; large regions need an interruptible owner.
export const SURFACE_WORKER_FACE_THRESHOLD = 1024

/** One worker per preview, one in-flight request and one replaceable latest value. No input backlog. */
export function createSceneSurfaceSession(options: {
  source: Omit<SceneSurfaceInit, 'type' | 'idSeed'>
  onResult(mesh: SceneMeshGeometry, amount: number): void
  onBusy(busy: boolean): void
  onError(error: unknown): void
  createWorker?: () => TaskWorker
}) {
  const worker =
    options.createWorker?.() ??
    new Worker(new URL('./sceneSurface.worker.ts', import.meta.url), { type: 'module' })
  // Before the protocol listeners: disposal waits for the worker's first sign of life.
  const owned = ownWorker(worker)
  let ready = false
  let disposed = false
  let nextId = 0
  let latest: SceneSurfaceApply | null = null
  let inFlight: SceneSurfaceApply | null = null
  function dispose() {
    if (disposed) return
    disposed = true
    latest = inFlight = null
    worker.removeEventListener('message', onMessage)
    worker.removeEventListener('error', onError)
    worker.removeEventListener('messageerror', onMessageError)
    owned.release()
  }
  function fail(error: unknown) {
    if (disposed) return
    dispose()
    options.onError(error)
  }
  function sendNext() {
    if (disposed || !ready || inFlight || !latest) return
    inFlight = latest
    try {
      worker.postMessage(inFlight)
    } catch (error) {
      fail(error)
    }
  }
  function onMessage(event: MessageEvent<unknown>) {
    if (disposed || isWorkerLoadedMessage(event.data)) return
    try {
      const reply = readSceneSurfaceEnvelope(event.data, options.source)
      if (reply.type === 'ready') {
        if (ready) throw new Error('Repeated worker initialization')
        ready = true
        sendNext()
        if (!latest) options.onBusy(false)
        return
      }
      if (reply.type === 'error' && reply.requestId === 0)
        throw new SceneValidationError('worker', reply.message)
      const request = inFlight
      if (!request || reply.requestId !== request.requestId)
        throw new Error('Unexpected worker request ID')
      inFlight = null
      if (latest?.requestId === request.requestId) {
        latest = null
        if (reply.type === 'error') throw new SceneValidationError('worker', reply.message)
        const result = readSceneSurfaceReply(reply, options.source)
        if (result.type !== 'result' || result.mesh.id !== options.source.mesh.id)
          throw new Error('Worker changed geometry identity')
        options.onResult(result.mesh, request.amount)
      }
      if (disposed) return
      sendNext()
      if (!latest) options.onBusy(false)
    } catch (error) {
      fail(error)
    }
  }
  function onError(event: ErrorEvent) {
    event.preventDefault()
    fail(new Error(event.message || 'Worker failed'))
  }
  function onMessageError() {
    fail(new Error('Worker response could not be read'))
  }
  worker.addEventListener('message', onMessage)
  worker.addEventListener('error', onError)
  worker.addEventListener('messageerror', onMessageError)
  try {
    options.onBusy(true)
    worker.postMessage({
      ...options.source,
      type: 'init',
      idSeed: newId(),
    } satisfies SceneSurfaceInit)
  } catch (error) {
    dispose()
    throw error
  }
  return {
    update(amount: number): boolean {
      if (disposed) return false
      if (!Number.isFinite(amount)) {
        fail(new RangeError('Invalid preview amount'))
        return false
      }
      latest = { type: 'apply', requestId: ++nextId, amount }
      options.onBusy(true)
      sendNext()
      return !disposed
    },
    get pending() {
      return !disposed && (!ready || latest !== null)
    },
    dispose,
  }
}
