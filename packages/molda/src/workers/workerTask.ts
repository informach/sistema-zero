import { isWorkerLoadedMessage, ownWorker } from './workerHandshake'

/** One owned worker per task: cancel stops the CPU work, not only its promise. */
export type TaskWorker = Pick<
  Worker,
  'postMessage' | 'terminate' | 'addEventListener' | 'removeEventListener'
>

export type TaskReply<Result, Progress> =
  | { type: 'result'; result: Result }
  | { type: 'progress'; progress: Progress }
  | { type: 'error'; message: string }

export function runWorkerTask<Result, Progress>(options: {
  createWorker: () => TaskWorker
  request: unknown
  readReply: (value: unknown) => TaskReply<Result, Progress> | null
  signal?: AbortSignal
  onProgress?: (progress: Progress) => void
}): Promise<Result> {
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(new DOMException('Task cancelled', 'AbortError'))
      return
    }
    let worker: TaskWorker
    try {
      worker = options.createWorker()
    } catch (error) {
      reject(error)
      return
    }
    // Before the protocol listeners: the stop waits for the worker's first sign of life.
    const owned = ownWorker(worker)
    let settled = false
    const cleanup = (): boolean => {
      if (settled) return false
      settled = true
      options.signal?.removeEventListener('abort', onAbort)
      worker.removeEventListener('message', onMessage)
      worker.removeEventListener('error', onError)
      worker.removeEventListener('messageerror', onMessageError)
      owned.release()
      return true
    }
    const fail = (error: unknown): void => {
      if (cleanup()) reject(error)
    }
    const onAbort = (): void => fail(new DOMException('Task cancelled', 'AbortError'))
    const onError = (event: ErrorEvent): void => {
      event.preventDefault()
      fail(new Error(event.message || 'Worker failed'))
    }
    const onMessageError = (): void => fail(new Error('Worker response could not be read'))
    const onMessage = (event: MessageEvent<unknown>): void => {
      if (settled || isWorkerLoadedMessage(event.data)) return
      try {
        const reply = options.readReply(event.data)
        if (!reply) throw new Error('Unexpected worker response')
        if (reply.type === 'error') fail(new Error(reply.message))
        else if (reply.type === 'progress') options.onProgress?.(reply.progress)
        else if (cleanup()) resolve(reply.result)
      } catch (error) {
        fail(error)
      }
    }
    worker.addEventListener('message', onMessage)
    worker.addEventListener('error', onError)
    worker.addEventListener('messageerror', onMessageError)
    options.signal?.addEventListener('abort', onAbort, { once: true })
    // A caller-supplied factory may have cancelled during construction.
    if (options.signal?.aborted) {
      onAbort()
      return
    }
    try {
      // Structured clone only. Never detach buffers owned by the live document.
      worker.postMessage(options.request)
    } catch (error) {
      fail(error)
    }
  })
}
