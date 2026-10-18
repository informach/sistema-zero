import { afterEach, expect, spyOn, test } from 'bun:test'
import { fetchPythonWebBytes } from './webFiles'

let restore: (() => void) | undefined
afterEach(() => {
  restore?.()
  restore = undefined
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
