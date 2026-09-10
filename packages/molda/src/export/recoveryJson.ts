import { bytesToBase64 } from '../core/skinCodec'

/**
 * Unknown JSON fields remain untouched. Native byte skins use the same base64 wire
 * representation as assetToJson, without calling a sanitizer or a versioned writer.
 * Refuse values outside that contract instead of emitting a silently incomplete backup.
 */
export function recoveryJson(raw: unknown): string {
  const ancestors = new Set<object>()
  function toWire(value: unknown, depth: number): unknown {
    if (depth > 128) throw new Error('Documento profundo demais para copiar com segurança.')
    if (value instanceof Uint8Array) return bytesToBase64(value)
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value !== 'object' || !value)
      throw new Error('O arquivo precisa de um leitor mais novo.')
    if (ancestors.has(value)) throw new Error('O arquivo tem referências circulares.')
    ancestors.add(value)
    try {
      if (Array.isArray(value)) return value.map((entry) => toWire(entry, depth + 1))
      if (
        Object.getPrototypeOf(value) !== Object.prototype &&
        Object.getPrototypeOf(value) !== null
      ) {
        throw new Error('O arquivo precisa de um leitor mais novo.')
      }
      return Object.fromEntries(
        Object.entries(value)
          .filter(([, entry]) => entry !== undefined)
          .map(([key, entry]) => [key, toWire(entry, depth + 1)]),
      )
    } finally {
      ancestors.delete(value)
    }
  }
  return JSON.stringify(toWire(raw, 0))
}
