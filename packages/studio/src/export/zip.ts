import type { ExportFileMap } from './fileMap'

/**
 * Zipa o mapa de arquivos com `fflate` (pure JS, ~8KB), carregado sob demanda.
 * Chaves com `/` viram pastas aninhadas no ZIP. `zipSync` é puro/testável; só
 * trocar por `zip()` async/worker se um projeto muito grande travar a thread.
 */
export async function zipFiles(map: ExportFileMap): Promise<Uint8Array> {
  const { zipSync, strToU8 } = await import('fflate')
  const flat: Record<string, Uint8Array> = {}
  for (const [path, content] of Object.entries(map)) {
    flat[path] = typeof content === 'string' ? strToU8(content) : content
  }
  return zipSync(flat, { level: 6 })
}
