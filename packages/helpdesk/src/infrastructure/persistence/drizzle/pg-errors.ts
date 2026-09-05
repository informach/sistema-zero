/**
 * Escapa os curingas do LIKE (`\`, `%`, `_`) para que buscas `q` das listagens
 * sejam LITERAIS — "100%" não vira padrão (wildcard injection no ILIKE).
 */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}
