import { describe, expect, test } from 'bun:test'
import { WORKER_LOADED_MESSAGE } from './workerHandshake'
import { runWorkerTask, type TaskReply, type TaskWorker } from './workerTask'

class ControlledWorker extends EventTarget implements TaskWorker {
  requests: unknown[] = []
  stopped = 0
  failPosting = false
  postMessage(value: unknown): void {
    if (this.failPosting) throw new Error('clone failed')
    this.requests.push(structuredClone(value))
  }
  terminate(): void {
    this.stopped += 1
  }
  reply(value: unknown): void {
    this.dispatchEvent(new MessageEvent('message', { data: value }))
  }
}

const readReply = (value: unknown): TaskReply<number, number> | null => {
  if (typeof value !== 'number') return null
  return value < 1 ? { type: 'progress', progress: value } : { type: 'result', result: value }
}

describe('owned worker task', () => {
  test('clones input, reports progress, terminates on success and ignores late replies', async () => {
    const worker = new ControlledWorker()
    const input = new Uint8Array([1, 2, 3])
    const progress: number[] = []
    const promise = runWorkerTask({
      createWorker: () => worker,
      request: input,
      readReply,
      onProgress: (value) => progress.push(value),
    })
    input[0] = 9
    expect(worker.requests[0]).toEqual(new Uint8Array([1, 2, 3]))
    expect(input.byteLength).toBe(3)
    worker.reply(0.5)
    worker.reply(42)
    expect(await promise).toBe(42)
    worker.reply(0.75)
    expect(progress).toEqual([0.5])
    expect(worker.stopped).toBe(1)
  })

  test('abort after the hello is immediate, stops CPU work and cannot later resolve', async () => {
    const worker = new ControlledWorker()
    const controller = new AbortController()
    const promise = runWorkerTask({
      createWorker: () => worker,
      request: null,
      readReply,
      signal: controller.signal,
    })
    // The hello is the handshake's, never a reply: readReply would have rejected it.
    worker.reply(WORKER_LOADED_MESSAGE)
    controller.abort()
    expect(worker.stopped).toBe(1)
    worker.reply(42)
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
  })

  test('abort while the worker is still loading settles at once but stops it only at its hello', async () => {
    const worker = new ControlledWorker()
    const controller = new AbortController()
    const promise = runWorkerTask({
      createWorker: () => worker,
      request: null,
      readReply,
      signal: controller.signal,
    })
    controller.abort()
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
    expect(worker.stopped).toBe(0)
    worker.reply(WORKER_LOADED_MESSAGE)
    expect(worker.stopped).toBe(1)
    worker.reply(42)
    expect(worker.stopped).toBe(1)
  })

  test('already aborted tasks never construct a worker', async () => {
    const controller = new AbortController()
    controller.abort()
    let created = false
    await expect(
      runWorkerTask({
        createWorker: () => {
          created = true
          return new ControlledWorker()
        },
        request: null,
        readReply,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(created).toBe(false)
  })

  test.each([
    'invalid-reply',
    'decode-error',
    'worker-error',
    'post-error',
  ])('%s rejects and releases its worker', async (reason) => {
    const worker = new ControlledWorker()
    worker.failPosting = reason === 'post-error'
    const promise = runWorkerTask({ createWorker: () => worker, request: null, readReply })
    if (reason === 'invalid-reply') worker.reply('invalid')
    if (reason === 'decode-error') worker.dispatchEvent(new MessageEvent('messageerror'))
    if (reason === 'worker-error')
      worker.dispatchEvent(new ErrorEvent('error', { message: 'crash' }))
    await expect(promise).rejects.toBeInstanceOf(Error)
    if (reason === 'post-error') {
      // Nothing came back from the worker yet, so it is released only at its hello.
      expect(worker.stopped).toBe(0)
      worker.reply(WORKER_LOADED_MESSAGE)
    }
    expect(worker.stopped).toBe(1)
  })

  test('startup and consumer callback failures reject instead of leaving a task pending', async () => {
    await expect(
      runWorkerTask({
        createWorker: () => {
          throw new Error('blocked by CSP')
        },
        request: null,
        readReply,
      }),
    ).rejects.toThrow('blocked by CSP')
    const worker = new ControlledWorker()
    const promise = runWorkerTask({
      createWorker: () => worker,
      request: null,
      readReply,
      onProgress: () => {
        throw new Error('consumer failed')
      },
    })
    worker.reply(0.5)
    await expect(promise).rejects.toThrow('consumer failed')
    expect(worker.stopped).toBe(1)
  })
})
