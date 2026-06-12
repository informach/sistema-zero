/**
 * 23505 = unique_violation. O drizzle-orm (≥ 0.44) ENVELOPA o erro do driver em
 * `DrizzleQueryError`, com o `PostgresError` original em `cause` — checar `code`
 * só no topo NUNCA casa. Caminha a cadeia de `cause` (com teto). Mesmo padrão do
 * catalog/auth/members/messaging.
 */
export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error
  for (let depth = 0; depth < 5 && typeof current === 'object' && current !== null; depth++) {
    if ((current as { code?: unknown }).code === '23505') return true
    current = (current as { cause?: unknown }).cause
  }
  return false
}

/** Escapa curingas do LIKE p/ busca literal nas listagens admin. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}
