import { createPythonNativeSha256 } from './python-native-sha256'

/** Deterministic byte/identity rejection, distinct from a transient upstream storage error. */
export class PythonFileVerificationError extends Error {}

/** Bounded binary transfer. Verification finishes before the caller may execute the job. */
export function verifiedPythonFileStream(options: {
  body: ReadableStream<Uint8Array>
  bytes: number
  sha256: string
  signal: AbortSignal
}) {
  const { body, bytes: expected, sha256, signal } = options
  if (!Number.isSafeInteger(expected) || expected < 0 || !/^[a-f0-9]{64}$/.test(sha256))
    throw new PythonFileVerificationError('Identidade do arquivo Python inválida.')
  signal.throwIfAborted()
  const reader = body.getReader()
  const hash = createPythonNativeSha256()
  let received = 0,
    closed = false
  let reject!: (error: unknown) => void, resolve!: () => void
  const complete = new Promise<void>((yes, no) => {
    resolve = yes
    reject = no
  })
  void complete.catch(() => {})
  let controller: ReadableStreamDefaultController<Uint8Array>
  function detach() {
    signal.removeEventListener('abort', abort)
  }
  async function cancelReader(reason: unknown) {
    try {
      await reader.cancel(reason)
    } finally {
      reader.releaseLock()
    }
  }
  function fail(error: unknown) {
    if (closed) return
    closed = true
    detach()
    reject(error)
    controller.error(error)
    void cancelReader(error).catch(() => {})
  }
  const abort = () => fail(signal.reason)
  const stream = new ReadableStream<Uint8Array>(
    {
      start(value) {
        controller = value
        signal.addEventListener('abort', abort, { once: true })
        if (signal.aborted) abort()
      },
      async pull(value) {
        try {
          const next = await reader.read()
          if (closed) return
          signal.throwIfAborted()
          if (next.done) {
            if (received !== expected || hash.digestHex() !== sha256)
              throw new PythonFileVerificationError(
                'O tamanho ou hash do arquivo Python não corresponde ao input.',
              )
            closed = true
            detach()
            reader.releaseLock()
            value.close()
            resolve()
            return
          }
          if (!(next.value instanceof Uint8Array) || next.value.byteLength > expected - received)
            throw new PythonFileVerificationError('O arquivo Python excede o tamanho registrado.')
          const chunk = new Uint8Array(next.value)
          received += chunk.byteLength
          hash.update(chunk)
          value.enqueue(chunk)
        } catch (error) {
          fail(error)
        }
      },
      async cancel(reason) {
        if (closed) return
        closed = true
        detach()
        reject(reason ?? new Error('Transferência Python cancelada.'))
        await cancelReader(reason)
      },
    },
    { highWaterMark: 0 },
  )
  return { stream, complete, cancel: (reason: unknown) => fail(reason) }
}
