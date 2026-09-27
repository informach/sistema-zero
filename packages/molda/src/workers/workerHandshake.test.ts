import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { isWorkerLoadedMessage, ownWorker, WORKER_LOADED_MESSAGE } from './workerHandshake'
import type { TaskWorker } from './workerTask'

class FakeWorker extends EventTarget implements TaskWorker {
  stopped = 0
  postMessage(): void {}
  terminate(): void {
    this.stopped += 1
  }
}

const hello = () => new MessageEvent('message', { data: WORKER_LOADED_MESSAGE })
const workerFiles = readdirSync(import.meta.dir)
  .filter((name) => name.endsWith('.worker.ts'))
  .sort()

describe('worker handshake', () => {
  test('the hello is exactly { type: "loaded" }', () => {
    expect(isWorkerLoadedMessage(WORKER_LOADED_MESSAGE)).toBe(true)
    expect(isWorkerLoadedMessage({ type: 'loaded' })).toBe(true)
    expect(isWorkerLoadedMessage({ type: 'loaded', extra: 1 })).toBe(false)
    expect(isWorkerLoadedMessage({ type: 'ready' })).toBe(false)
    expect(isWorkerLoadedMessage('loaded')).toBe(false)
    expect(isWorkerLoadedMessage(null)).toBe(false)
  })

  test('release before the first sign of life waits for it; after it, the stop is immediate', () => {
    const loading = new FakeWorker()
    const owned = ownWorker(loading)
    owned.release()
    owned.release()
    expect(loading.stopped).toBe(0)
    loading.dispatchEvent(hello())
    expect(loading.stopped).toBe(1)
    loading.dispatchEvent(new MessageEvent('message', { data: 42 }))
    expect(loading.stopped).toBe(1)

    const alive = new FakeWorker()
    const owner = ownWorker(alive)
    alive.dispatchEvent(hello())
    expect(alive.stopped).toBe(0)
    owner.release()
    owner.release()
    expect(alive.stopped).toBe(1)
  })

  test.each([
    'error',
    'messageerror',
  ] as const)('a native %s counts as the first sign of life of a released worker and is not left uncaught', (type) => {
    const worker = new FakeWorker()
    ownWorker(worker).release()
    const event =
      type === 'error'
        ? new ErrorEvent('error', { message: 'Unavailable', cancelable: true })
        : new MessageEvent('messageerror', { cancelable: true })
    worker.dispatchEvent(event)
    expect(worker.stopped).toBe(1)
    expect(event.defaultPrevented).toBe(type === 'error')
  })

  test('while still owned, an error is left to its owner and the stop still waits for release', () => {
    const worker = new FakeWorker()
    const owned = ownWorker(worker)
    const event = new ErrorEvent('error', { message: 'Unavailable', cancelable: true })
    worker.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
    expect(worker.stopped).toBe(0)
    owned.release()
    expect(worker.stopped).toBe(1)
  })

  // ⚠️ Real workers, on purpose: this is the message that keeps `terminate()` away from a module
  // that is still loading (see workerHandshake.ts). A worker that forgets it would only fail on
  // the CI runner, as a segmentation fault of the whole test process.
  test.each(workerFiles)('%s says hello before anything else', async (file) => {
    const worker = new Worker(new URL(`./${file}`, import.meta.url), { type: 'module' })
    try {
      const first = await new Promise<unknown>((resolve, reject) => {
        worker.addEventListener('message', (event) => resolve(event.data), { once: true })
        worker.addEventListener(
          'error',
          (event) => {
            event.preventDefault()
            reject(new Error(`${file}: ${event.message}`))
          },
          { once: true },
        )
      })
      expect(first).toEqual(WORKER_LOADED_MESSAGE)
    } finally {
      worker.terminate()
    }
  })

  test('every worker file ends with the hello, so a new worker cannot forget it', () => {
    expect(workerFiles.length).toBeGreaterThanOrEqual(12)
    const silent = workerFiles.filter((file) => {
      const source = readFileSync(resolve(import.meta.dir, file), 'utf8')
      return (
        !source.includes("import { announceWorkerLoaded } from './workerHandshake'") ||
        !source.trimEnd().endsWith('announceWorkerLoaded()')
      )
    })
    expect(silent).toEqual([])
  })

  test('nobody terminates a worker directly: only ownWorker() may, after the hello', () => {
    const root = resolve(import.meta.dir, '..')
    const offenders: string[] = []
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry)
        if (statSync(path).isDirectory()) walk(path)
        else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
          if (readFileSync(path, 'utf8').includes('.terminate()'))
            offenders.push(relative(root, path).split(sep).join('/'))
        }
      }
    }
    walk(root)
    // export/zip.ts terminates fflate's own zip stream, not a Worker of ours.
    expect(offenders.sort()).toEqual(['export/zip.ts', 'workers/workerHandshake.ts'])
  })
})
