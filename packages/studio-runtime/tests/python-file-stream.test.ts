import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { verifiedPythonFileStream } from '../src/python-file-stream'

const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
test('stream preserves original binary bytes and validates empty and nonempty content', async () => {
  for (const bytes of [new Uint8Array(0), new Uint8Array([239, 187, 191, 0, 255, 42])]) {
    const transfer = verifiedPythonFileStream({
      body: new Blob([bytes]).stream(),
      bytes: bytes.byteLength,
      sha256: digest(bytes),
      signal: new AbortController().signal,
    })
    expect(new Uint8Array(await new Response(transfer.stream).arrayBuffer())).toEqual(bytes)
    await transfer.complete
  }
})
test('short, excessive and modified streams reject completion and never become accepted files', async () => {
  const bytes = new Uint8Array([1, 2, 3])
  for (const [length, sha256] of [
    [2, digest(bytes)],
    [4, digest(bytes)],
    [3, 'f'.repeat(64)],
  ] as const) {
    const transfer = verifiedPythonFileStream({
      body: new Blob([bytes]).stream(),
      bytes: length,
      sha256,
      signal: new AbortController().signal,
    })
    await expect(new Response(transfer.stream).arrayBuffer()).rejects.toThrow()
    await expect(transfer.complete).rejects.toThrow()
  }
})
test('backpressure consumes a 32MiB input incrementally rather than producing it before the sink', async () => {
  const chunk = new Uint8Array(64 * 1024).fill(42)
  const hash = createHash('sha256')
  for (let index = 0; index < 512; index++) hash.update(chunk)
  let produced = 0
  const body = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        if (produced === 512) controller.close()
        else {
          produced++
          controller.enqueue(chunk)
        }
      },
    },
    { highWaterMark: 0 },
  )
  const transfer = verifiedPythonFileStream({
    body,
    bytes: 32 * 1024 * 1024,
    sha256: hash.digest('hex'),
    signal: new AbortController().signal,
  })
  expect(produced).toBe(0)
  const reader = transfer.stream.getReader()
  let consumed = 0
  for (;;) {
    const next = await reader.read()
    if (next.done) break
    consumed++
    expect(produced - consumed).toBeLessThanOrEqual(1)
    expect(next.value.byteLength).toBe(64 * 1024)
  }
  reader.releaseLock()
  await transfer.complete
  expect(consumed).toBe(512)
})
test('abort cancels a pending producer and rejects both consumer and verification', async () => {
  let cancelled = 0
  const controller = new AbortController()
  const body = new ReadableStream<Uint8Array>(
    {
      pull() {
        return new Promise(() => {})
      },
      cancel() {
        cancelled++
      },
    },
    { highWaterMark: 0 },
  )
  const transfer = verifiedPythonFileStream({
    body,
    bytes: 1,
    sha256: 'f'.repeat(64),
    signal: controller.signal,
  })
  const pending = new Response(transfer.stream).arrayBuffer()
  controller.abort(new Error('retired'))
  await expect(pending).rejects.toThrow('retired')
  await expect(transfer.complete).rejects.toThrow('retired')
  expect(cancelled).toBe(1)
})
