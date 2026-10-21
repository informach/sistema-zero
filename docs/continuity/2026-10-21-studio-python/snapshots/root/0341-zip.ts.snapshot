import type { ExportFileMap } from './fileMap'

/** One short-lived worker per large export, never one worker per project file. */
export async function zipFiles(
  map: ExportFileMap,
  options: { signal?: AbortSignal } = {},
): Promise<Uint8Array> {
  options.signal?.throwIfAborted()
  // UTF-16 length is a conservative scheduling estimate (not an export size limit).
  const estimate = Object.values(map).reduce(
    (sum, value) => sum + (typeof value === 'string' ? value.length * 3 : value.byteLength),
    0,
  )
  if (estimate >= 64_000 && typeof Worker !== 'undefined') {
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL('./zip.worker.ts', import.meta.url), { type: 'module' })
      const finish = () => {
        options.signal?.removeEventListener('abort', abort)
        worker.terminate()
      }
      const abort = () => {
        finish()
        reject(options.signal?.reason ?? new DOMException('Exportação cancelada.', 'AbortError'))
      }
      worker.onmessage = (event: MessageEvent<{ bytes?: Uint8Array; error?: string }>) => {
        finish()
        if (event.data.bytes instanceof Uint8Array) resolve(event.data.bytes)
        else reject(new Error(event.data.error ?? 'Não foi possível gerar o ZIP.'))
      }
      worker.onerror = (event) => {
        finish()
        reject(new Error(event.message || 'Não foi possível gerar o ZIP.'))
      }
      worker.onmessageerror = () => {
        finish()
        reject(new Error('Não foi possível receber o ZIP.'))
      }
      options.signal?.addEventListener('abort', abort, { once: true })
      try {
        // Structured clone retains ownership of canonical asset buffers in the editor.
        worker.postMessage(map)
      } catch (error) {
        finish()
        reject(error)
      }
    })
  }
  const { zipSync, zip, strToU8 } = await import('fflate')
  options.signal?.throwIfAborted()
  const flat: Record<string, Uint8Array> = {}
  for (const [path, content] of Object.entries(map)) {
    flat[path] = typeof content === 'string' ? strToU8(content) : content
  }
  if (estimate < 64_000) return zipSync(flat, { level: 6 })
  // CLI/server consumers have no browser Worker. Keep the library's Node path.
  return new Promise((resolve, reject) => {
    const abort = () => {
      terminate()
      reject(options.signal?.reason ?? new DOMException('Exportação cancelada.', 'AbortError'))
    }
    const terminate = zip(flat, { level: 6, consume: false }, (error, bytes) => {
      options.signal?.removeEventListener('abort', abort)
      if (error) reject(error)
      else resolve(bytes)
    })
    options.signal?.addEventListener('abort', abort, { once: true })
  })
}
