/**
 * Ids dos assets/animações. Charset `[a-z0-9-]` (UUID) — sem `:`, que é o
 * separador das chaves do IndexedDB (mesma regra de charset do studio).
 */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback defensivo (ambientes sem WebCrypto): timestamp + aleatório base36.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
