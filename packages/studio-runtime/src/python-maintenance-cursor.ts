import { sha256 } from './artifacts'
import { verifiedPythonFileStream } from './python-file-stream'
import type { PythonInputBucket } from './python-inputs'
import { inputAwait } from './python-inputs'

/** Private service checkpoint. Callers use a distinct key for each independently collected namespace. */
export function createPythonMaintenanceCursor(
  bucket: Pick<PythonInputBucket, 'get'> & {
    put(key: string, bytes: Uint8Array, options: { sha256: string }): Promise<unknown>
  },
  key: string,
  signal: AbortSignal,
) {
  return {
    async load() {
      const object = await inputAwait(bucket.get(key), signal, (object) => {
        void object?.body.cancel(signal.reason).catch(() => {})
      })
      if (!object) return undefined
      let transfer: ReturnType<typeof verifiedPythonFileStream> | undefined
      try {
        signal.throwIfAborted()
        if (!object.checksums?.sha256 || object.size > 4096)
          throw new Error('Checkpoint da limpeza Python inválido.')
        transfer = verifiedPythonFileStream({
          body: object.body,
          bytes: object.size,
          sha256: Buffer.from(object.checksums.sha256).toString('hex'),
          signal,
        })
        const raw: unknown = JSON.parse(await new Response(transfer.stream).text())
        await transfer.complete
        if (
          !raw ||
          typeof raw !== 'object' ||
          Array.isArray(raw) ||
          Object.keys(raw).some((key) => key !== 'cursor') ||
          ('cursor' in raw && (typeof raw.cursor !== 'string' || raw.cursor.length > 2048))
        )
          throw new Error('Checkpoint da limpeza Python inválido.')
        return 'cursor' in raw && typeof raw.cursor === 'string' ? raw.cursor : undefined
      } catch (error) {
        if (transfer) transfer.cancel(error)
        else void object.body.cancel(error).catch(() => {})
        throw error
      }
    },
    async save(cursor?: string) {
      signal.throwIfAborted()
      const bytes = new TextEncoder().encode(JSON.stringify({ cursor }))
      await inputAwait(bucket.put(key, bytes, { sha256: await sha256(bytes) }), signal)
      signal.throwIfAborted()
    },
  }
}
