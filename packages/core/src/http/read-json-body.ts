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
export async function readJsonBodyWithLimit(request: Request, maxBytes: number): Promise<unknown> {
  const declaredLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new RequestBodyTooLargeError(maxBytes)
  }
  if (!request.body) throw new InvalidJsonBodyError()

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let receivedBytes = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      receivedBytes += value.byteLength
      if (receivedBytes > maxBytes) {
        await reader.cancel()
        throw new RequestBodyTooLargeError(maxBytes)
      }
      chunks.push(value)
    }
  } finally {
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
