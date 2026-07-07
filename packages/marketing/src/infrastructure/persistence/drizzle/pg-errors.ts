/**
 * Helpers de mapeamento de erro do Postgres, compartilhados pelos repositórios.
 */

/**
 * 23505 = unique_violation. O drizzle-orm (≥ 0.44) ENVELOPA o erro do driver em
 * `DrizzleQueryError`, com o `PostgresError` original em `cause` — checar `code`
 * só no topo NUNCA casa. Caminha a cadeia de `cause` (com teto). Mesmo padrão de
 * auth/members/catalog/hub.
 */
export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error
  for (let depth = 0; depth < 5 && typeof current === 'object' && current !== null; depth++) {
    if ((current as { code?: unknown }).code === '23505') return true
    current = (current as { cause?: unknown }).cause
  }
  return false
}

/**
 * Escapa os curingas do LIKE (`\`, `%`, `_`) para que buscas `q` das listagens
 * sejam LITERAIS — "100%" não vira padrão (wildcard injection no ILIKE).
 */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}
