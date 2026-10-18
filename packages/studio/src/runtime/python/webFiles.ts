/** The count applies to streamed bytes, not an untrusted Content-Length header. */
export async function readPythonWebBytes(response: Response, maximum: number, signal: AbortSignal) {
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
  if (!response.body) return new Uint8Array()
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
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
      chunks.push(next.value)
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
