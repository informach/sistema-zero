import { strToU8, zipSync } from 'fflate'
import type { ExportFileMap } from './fileMap'

self.onmessage = (event: MessageEvent<ExportFileMap>) => {
  try {
    const flat: Record<string, Uint8Array> = {}
    for (const [path, content] of Object.entries(event.data))
      flat[path] = typeof content === 'string' ? strToU8(content) : content
    const bytes = zipSync(flat, { level: 6 })
    self.postMessage({ bytes }, { transfer: [bytes.buffer] })
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : String(error) })
  }
}
