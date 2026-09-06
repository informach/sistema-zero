/**
 * 23505 = unique_violation. O drizzle-orm (≥ 0.44) ENVELOPA o erro do driver em
 * `DrizzleQueryError`, com o `PostgresError` original em `cause` — checar `code`
 * só no topo NUNCA casa. Caminha a cadeia de `cause` (com teto). Mesmo padrão do
 * catalog/auth/members/messaging/fiscal.
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
 * Nome da constraint de um 23505 (mesma caminhada de `cause` do
 * isUniqueViolation) — distingue qual UNIQUE venceu quando a tabela tem várias.
 */
export function uniqueConstraintName(error: unknown): string | null {
  let current: unknown = error
  for (let depth = 0; depth < 5 && typeof current === 'object' && current !== null; depth++) {
    const c = current as { code?: unknown; constraint_name?: unknown; constraint?: unknown }
    if (c.code === '23505') {
      const name = c.constraint_name ?? c.constraint
      return typeof name === 'string' ? name : null
    }
    current = (current as { cause?: unknown }).cause
  }
  return null
}

/** Escapa curingas do LIKE p/ busca literal nas listagens admin. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}
