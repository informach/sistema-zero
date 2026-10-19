import { afterEach, expect, spyOn, test } from 'bun:test'
import {
  NATIVE_PYTHON_BOOT_TIMEOUT_MS,
  runNativePythonBootCases,
} from '../../__tests__/nativePythonBootCases'
import { fetchPythonWebBytes, readPythonWebBytesExact } from './webFiles'

let restore: (() => void) | undefined
afterEach(() => {
  restore?.()
  restore = undefined
})

// Bun1.3.11 does not settle a pending BYOB read when cancel() never acknowledges.
// Keep native BYOB/ownership semantics in actual Node24, also invoked by plain bun test.
test(
  'native Node24 byte-stream contracts',
  async () => {
    await runNativePythonBootCases('web-files')
  },
  NATIVE_PYTHON_BOOT_TIMEOUT_MS,
)

test('manifest-sized reading preserves bytes across chunk boundaries and ignores wire length', async () => {
  const body = new ReadableStream<Uint8Array>({
    start(stream) {
      stream.enqueue(new Uint8Array([1, 2]))
      stream.enqueue(new Uint8Array(0))
      stream.enqueue(new Uint8Array([3, 4, 5]))
      stream.close()
    },
  })
  expect(
    await readPythonWebBytesExact(
      new Response(body, { headers: { 'content-length': '2', 'content-encoding': 'gzip' } }),
      5,
      new AbortController().signal,
    ),
  ).toEqual(new Uint8Array([1, 2, 3, 4, 5]))
})

test('manifest-sized reading rejects short and oversized bodies without returning partial bytes', async () => {
  await expect(
    readPythonWebBytesExact(new Response(new Uint8Array(2)), 3, new AbortController().signal),
  ).rejects.toThrow('Tamanho')
  let cancelled = false
  const body = new ReadableStream<Uint8Array>({
    start(stream) {
      stream.enqueue(new Uint8Array(4))
    },
    cancel() {
      cancelled = true
    },
  })
  await expect(
    readPythonWebBytesExact(new Response(body), 3, new AbortController().signal),
  ).rejects.toThrow('limite')
  expect(cancelled).toBe(true)
})

test('manifest-sized reading respects withdrawal while waiting for remaining bytes', async () => {
  let reading!: () => void
  const started = new Promise<void>((resolve) => {
    reading = resolve
  })
  let cancelled = false
  const body = new ReadableStream<Uint8Array>(
    {
      pull() {
        reading()
      },
      cancel() {
        cancelled = true
      },
    },
    { highWaterMark: 0 },
  )
  const owner = new AbortController()
  const pending = readPythonWebBytesExact(new Response(body), 3, owner.signal)
  await started
  owner.abort(new Error('owner withdrawn'))
  await expect(pending).rejects.toThrow('owner withdrawn')
  expect(cancelled).toBe(true)
})

test('withdrawal settles even when stream cancellation never acknowledges', async () => {
  let reading!: () => void
  const started = new Promise<void>((resolve) => {
    reading = resolve
  })
  let cancelled = false
  const body = new ReadableStream<Uint8Array>(
    {
      pull() {
        reading()
      },
      cancel() {
        cancelled = true
        return new Promise<void>(() => {})
      },
    },
    { highWaterMark: 0 },
  )
  const request = spyOn(globalThis, 'fetch')
  restore = () => request.mockRestore()
  request.mockResolvedValue(new Response(body))
  const owner = new AbortController()
  const failure = fetchPythonWebBytes(
    new URL('https://runtime.test/turtle.py'),
    1024,
    owner.signal,
  ).catch((error: unknown) => error)
  await started
  const reason = new Error('owner withdrawn')
  owner.abort(reason)
  expect(await failure).toBe(reason)
  expect(cancelled).toBe(true)
})
