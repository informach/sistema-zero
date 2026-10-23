import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PYTHON_BOOT_LIMITS } from '../bootResourceContract'
import { PYTHON_BOOT_RESOURCE_NAMES } from '../bootResourceManifest'
import { createPythonBootResourceReader } from '../bootResourceReader'
import { readPythonWebBytesExact } from '../webFiles'

function byteStream(chunks: number[][]) {
  let index = 0
  return new ReadableStream({
    type: 'bytes',
    pull(stream) {
      const chunk = chunks[index++]
      if (chunk) stream.enqueue(new Uint8Array(chunk))
      else {
        stream.close()
        stream.byobRequest?.respond(0)
      }
    },
  })
}

/** The parent invokes these unchanged native contracts in Node24, never Bun's stream engine. */
export async function runNativePythonBootCases(suite: string) {
  if (suite === 'web-files') {
    await test('native byte stream returns the complete owned buffer across short reads and an EOF probe', {
      timeout: 5000,
    }, async () => {
      const bytes = await readPythonWebBytesExact(
        new Response(byteStream([[1], [2, 3], [4, 5]])),
        5,
        new AbortController().signal,
      )
      assert.deepEqual(bytes, new Uint8Array([1, 2, 3, 4, 5]))
      assert.equal(bytes.byteOffset, 0)
      assert.equal(bytes.buffer.byteLength, 5)
      assert.deepEqual(
        await readPythonWebBytesExact(
          new Response(byteStream([])),
          0,
          new AbortController().signal,
        ),
        new Uint8Array(),
      )
    })
    await test('native byte stream rejects extra bytes beyond the manifest and truncated input', {
      timeout: 5000,
    }, async () => {
      await assert.rejects(
        readPythonWebBytesExact(
          new Response(byteStream([[1, 2], [3]])),
          2,
          new AbortController().signal,
        ),
        /limite/,
      )
      await assert.rejects(
        readPythonWebBytesExact(new Response(byteStream([[1]])), 2, new AbortController().signal),
        /Tamanho/,
      )
    })
    await test('native byte stream withdrawal does not wait for producer cancellation acknowledgement', {
      timeout: 5000,
    }, async () => {
      let reading!: () => void
      const started = new Promise<void>((resolve) => {
        reading = resolve
      })
      let cancelled = false
      const body = new ReadableStream({
        type: 'bytes',
        pull() {
          reading()
        },
        cancel() {
          cancelled = true
          return new Promise<void>(() => {})
        },
      })
      const owner = new AbortController()
      const pending = readPythonWebBytesExact(new Response(body), 3, owner.signal)
      await started
      owner.abort(new Error('owner withdrawn'))
      await assert.rejects(pending, /owner withdrawn/)
      assert.equal(cancelled, true)
    })
    return
  }
  assert.equal(suite, 'reader-ownership', 'Unknown native Python boot suite')
  await test('reader hands the received buffer to the native response without retaining a second copy', {
    timeout: 5000,
  }, async () => {
    const channel = new MessageChannel()
    let received: ArrayBuffer | undefined
    channel.port2.addEventListener('message', (event) => {
      if (event.data.type === 'resource') received = event.data.bytes
    })
    const reader = createPythonBootResourceReader({
      port: channel.port2,
      directory: new URL('https://runtime.test/pinned/'),
    })
    try {
      const request = new Promise<void>((resolve) => {
        channel.port1.addEventListener('message', () => resolve(), { once: true })
        channel.port1.start()
      })
      const pending = reader.fetch('https://runtime.test/pinned/pyodide.asm.wasm')
      await request
      const bytes = new Uint8Array([1, 2, 3, 4]).buffer
      channel.port1.postMessage(
        { protocol: 1, type: 'resource', id: 1, name: 'pyodide.asm.wasm', bytes },
        [bytes],
      )
      const response = await pending
      assert.equal(bytes.byteLength, 0)
      assert.equal(received?.byteLength, 0)
      assert.equal(response.headers.get('content-length'), '4')
      assert.deepEqual(new Uint8Array(await response.arrayBuffer()), new Uint8Array([1, 2, 3, 4]))
    } finally {
      reader.dispose()
      channel.port1.close()
    }
  })
  await test('reader counts transferred bytes toward the total limit after response consumption', {
    timeout: 5000,
  }, async () => {
    const channel = new MessageChannel()
    const reader = createPythonBootResourceReader({
      port: channel.port2,
      directory: new URL('https://runtime.test/pinned/'),
    })
    try {
      for (const [index, name] of PYTHON_BOOT_RESOURCE_NAMES.entries()) {
        const request = new Promise<void>((resolve) => {
          channel.port1.addEventListener('message', () => resolve(), { once: true })
          channel.port1.start()
        })
        const pending = reader.fetch(`https://runtime.test/pinned/${name}`)
        await request
        const bytes = new ArrayBuffer(index < 2 ? PYTHON_BOOT_LIMITS.fileBytes : 1)
        channel.port1.postMessage({ protocol: 1, type: 'resource', id: index + 1, name, bytes }, [
          bytes,
        ])
        if (index < 2) {
          const response = await pending
          assert.equal(response.headers.get('content-length'), String(PYTHON_BOOT_LIMITS.fileBytes))
          await response.body!.cancel()
        } else {
          await assert.rejects(pending, /inválida/)
          assert.equal(reader.closed, true)
        }
      }
    } finally {
      reader.dispose()
      channel.port1.close()
    }
  })
}
