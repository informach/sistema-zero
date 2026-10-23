/** The count applies to streamed bytes, not an untrusted Content-Length header. */
export async function readPythonWebBytes(response: Response, maximum: number, signal: AbortSignal) {
  return readBytes(response, maximum, signal, false)
}

/** A verified manifest supplies the exact decoded size, never a response header. */
export async function readPythonWebBytesExact(
  response: Response,
  expected: number,
  signal: AbortSignal,
) {
  return readBytes(response, expected, signal, true)
}

async function readBytes(response: Response, maximum: number, signal: AbortSignal, exact: boolean) {
  signal.throwIfAborted()
  if (!response.ok || response.redirected) {
    void response.body?.cancel().catch(() => {})
    throw new Error('Não foi possível obter um arquivo do pacote Python.')
  }
  const declared = response.headers.get('content-length')
  // Fetch exposes decoded body bytes; Content-Length describes wire bytes.
  // Cross-origin CORS may expose Length but hide Encoding, so it cannot be a logical-size gate.
  if (declared && !/^\d+$/.test(declared)) {
    void response.body?.cancel().catch(() => {})
    throw new Error('O arquivo excede o limite do pacote Python.')
  }
  if (!response.body) {
    if (exact && maximum !== 0) throw new Error('Tamanho inesperado do arquivo Python.')
    return new Uint8Array()
  }
  if (exact) {
    let byob: ReadableStreamBYOBReader | undefined
    try {
      byob = response.body.getReader({ mode: 'byob' })
    } catch (error) {
      // Custom streams may not be byte streams. Only reader capability detection
      // may fall back; a locked stream or a later read/integrity error must fail.
      if (!(error instanceof TypeError) || response.body.locked) throw error
    }
    if (byob) return readExactInto(byob, maximum, signal)
  }
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  const destination = exact ? new Uint8Array(maximum) : undefined
  let length = 0
  const abort = () => {
    void reader.cancel(signal.reason).catch(() => {})
  }
  signal.addEventListener('abort', abort, { once: true })
  try {
    while (true) {
      signal.throwIfAborted()
      const next = await reader.read()
      signal.throwIfAborted()
      if (next.done) break
      length += next.value.byteLength
      if (length > maximum) throw new Error('O arquivo excede o limite do pacote Python.')
      if (destination) destination.set(next.value, length - next.value.byteLength)
      else chunks.push(next.value)
    }
    if (destination) {
      if (length !== maximum) throw new Error('Tamanho inesperado do arquivo Python.')
      return destination
    }
    const bytes = new Uint8Array(length)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.byteLength
    }
    return bytes
  } finally {
    signal.removeEventListener('abort', abort)
    // Validation/withdrawal must propagate even when a producer never acknowledges cancellation.
    // No read is pending here; request retirement and release the lock without gating the error.
    void reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}

async function readExactInto(
  reader: ReadableStreamBYOBReader,
  expected: number,
  signal: AbortSignal,
) {
  let bytes = new Uint8Array(expected)
  let length = 0
  const abort = () => {
    void reader.cancel(signal.reason).catch(() => {})
  }
  signal.addEventListener('abort', abort, { once: true })
  try {
    while (true) {
      signal.throwIfAborted()
      // Reading transfers this buffer to the stream; the returned view gives
      // ownership back. A separate one-byte probe proves EOF at the exact limit.
      const atLimit = length === expected
      const next = await reader.read(atLimit ? new Uint8Array(1) : bytes.subarray(length))
      signal.throwIfAborted()
      if (next.value) {
        if (atLimit) {
          if (next.value.byteLength) throw new Error('O arquivo excede o limite do pacote Python.')
        } else {
          bytes = new Uint8Array(next.value.buffer)
          length += next.value.byteLength
        }
      }
      if (next.done) break
    }
    if (length !== expected) throw new Error('Tamanho inesperado do arquivo Python.')
    return bytes
  } finally {
    signal.removeEventListener('abort', abort)
    void reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}

export async function pythonWebBytesSha256(bytes: Uint8Array<ArrayBuffer>) {
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** No project URL is accepted here: the caller owns the directory, the schema owns the path. */
export async function fetchPythonWebBytes(url: URL, maximum: number, signal: AbortSignal) {
  const retire = (response: Response) => {
    void response.body?.cancel(signal.reason).catch(() => {})
  }
  return awaitWithSignal(async () => {
    const response = await awaitWithSignal(
      () =>
        fetch(url, {
          signal,
          redirect: 'error',
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
        }),
      signal,
      retire,
    )
    if (signal.aborted) {
      retire(response)
      signal.throwIfAborted()
    }
    return readPythonWebBytes(response, maximum, signal)
  }, signal)
}

import { awaitWithSignal } from '@sistemazero/core/http'
