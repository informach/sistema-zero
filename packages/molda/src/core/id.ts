/**
 * Ids das criações e das peças. Charset `[a-z0-9-]` (UUID) — sem `:`, que é o
 * separador das chaves do IndexedDB, e dentro do `^[A-Za-z0-9_-]{1,64}$` que a
 * borda das creations do members aceita como `itemId`.
 */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback defensivo (ambientes sem WebCrypto): timestamp + aleatório base36.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
