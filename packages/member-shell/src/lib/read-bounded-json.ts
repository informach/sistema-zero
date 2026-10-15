export class RequestBodyTooLargeError extends Error {}

/** Lê o stream com memória limitada; o schema continua responsável pela semântica. */
export async function readBoundedJson(req: Request, maxBytes: number): Promise<unknown> {
  const declared = Number(req.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > maxBytes) throw new RequestBodyTooLargeError()
  if (!req.body) return JSON.parse('')

  let bytes = new Uint8Array(
    Number.isFinite(declared) && declared > 0 ? declared : Math.min(64 * 1024, maxBytes),
  )
  const reader = req.body.getReader()
  let length = 0
  try {
    while (true) {
      const next = await reader.read()
      if (next.done) break
      if (length + next.value.byteLength > maxBytes) {
        await reader.cancel().catch(() => undefined)
        throw new RequestBodyTooLargeError()
      }
      if (length + next.value.byteLength > bytes.byteLength) {
        const expanded = new Uint8Array(
          Math.min(maxBytes, Math.max(length + next.value.byteLength, bytes.byteLength * 2)),
        )
        expanded.set(bytes)
        bytes = expanded
      }
      bytes.set(next.value, length)
      length += next.value.byteLength
    }
  } finally {
    reader.releaseLock()
  }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, length)))
}
