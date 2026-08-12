export const JSON_DATA_MAX_BYTES = 256 * 1024

export interface NormalizedJsonData {
  canonical: string
  summary: string
  value: unknown
}

function describeJson(value: unknown): string {
  if (Array.isArray(value)) return `lista com ${value.length} item${value.length === 1 ? '' : 's'}`
  if (value !== null && typeof value === 'object') {
    const count = Object.keys(value).length
    return `objeto com ${count} campo${count === 1 ? '' : 's'}`
  }
  if (value === null) return 'valor nulo'
  if (typeof value === 'string')
    return `texto com ${value.length} caractere${value.length === 1 ? '' : 's'}`
  if (typeof value === 'boolean') return value ? 'verdadeiro' : 'falso'
  return 'número'
}

/**
 * Valida e canonicaliza JSON usado por blocos de dados. A restrição de tamanho
 * protege tanto a serialização do workspace quanto a geração de código.
 */
export function normalizeJsonData(source: string): NormalizedJsonData | null {
  const trimmed = source.trim()
  if (!trimmed || new TextEncoder().encode(trimmed).byteLength > JSON_DATA_MAX_BYTES) return null
  try {
    const value: unknown = JSON.parse(trimmed)
    const canonical = JSON.stringify(value)
    if (canonical === undefined) return null
    return { canonical, summary: describeJson(value), value }
  } catch {
    return null
  }
}
