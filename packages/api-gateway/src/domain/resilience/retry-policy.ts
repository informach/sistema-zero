import type { HttpMethod } from '../routing/route'

/**
 * Métodos idempotentes — só estes podem ser re-tentados automaticamente. NUNCA
 * re-tentar POST (pode duplicar criação de recurso).
 */
export const IDEMPOTENT_METHODS: ReadonlySet<HttpMethod> = new Set<HttpMethod>([
  'GET',
  'HEAD',
  'PUT',
  'DELETE',
])

export function isIdempotent(method: string): boolean {
  return IDEMPOTENT_METHODS.has(method.toUpperCase() as HttpMethod)
}
