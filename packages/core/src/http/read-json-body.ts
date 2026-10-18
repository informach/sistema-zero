export class RequestBodyTooLargeError extends Error {
  constructor(readonly maxBytes: number) {
    super(`O corpo da requisição ultrapassou ${maxBytes} bytes.`)
    this.name = 'RequestBodyTooLargeError'
  }
}

export class InvalidJsonBodyError extends Error {
  constructor() {
    super('O corpo da requisição não contém um JSON válido.')
    this.name = 'InvalidJsonBodyError'
  }
}

/**
 * Lê JSON contando bytes do stream. O Content-Length só permite falhar cedo:
 * requests podem omiti-lo ou fornecê-lo incorretamente.
 */
export async function readJsonBodyWithLimit(
  request: Pick<Request, 'headers' | 'body'>,
  maxBytes: number,
  signal?: AbortSignal,
): Promise<unknown> {
  signal?.throwIfAborted()
  const declaredLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new RequestBodyTooLargeError(maxBytes)
  }
  if (!request.body) throw new InvalidJsonBodyError()

  const reader = request.body.getReader()
  let rejectAbort!: (reason: unknown) => void
  const aborted = new Promise<never>((_resolve, reject) => {
    rejectAbort = reject
  })
  void aborted.catch(() => {})
  const abort = () => {
    rejectAbort(signal?.reason)
    void reader.cancel(signal?.reason).catch(() => {})
  }
  signal?.addEventListener('abort', abort, { once: true })
  if (signal?.aborted) abort()
  const chunks: Uint8Array[] = []
  let receivedBytes = 0
  try {
    while (true) {
      const { done, value } = await (signal
        ? Promise.race([reader.read(), aborted])
        : reader.read())
      signal?.throwIfAborted()
      if (done) break
      receivedBytes += value.byteLength
      if (receivedBytes > maxBytes) {
        if (signal) void reader.cancel().catch(() => {})
        else await reader.cancel()
        throw new RequestBodyTooLargeError(maxBytes)
      }
      chunks.push(value)
    }
  } finally {
    signal?.removeEventListener('abort', abort)
    reader.releaseLock()
  }

  const bytes = new Uint8Array(receivedBytes)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    throw new InvalidJsonBodyError()
  }
}
