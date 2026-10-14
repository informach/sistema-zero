import { canonicalJson } from '@sistemazero/core/creations'
import { LiveRequestError } from './client'

/**
 * O MESMO projeto, independente da ordem das chaves. O Postgres guarda o projeto em `jsonb`, que
 * REORDENA as chaves; comparar por `JSON.stringify` acusava diferença em toda primeira abertura e
 * a criança caía no aviso de rascunho, com a edição travada (full review de 14/10/2026).
 */
export function sameLiveProject(a: unknown, b: unknown): boolean {
  return canonicalJson(a) === canonicalJson(b)
}
/**
 * Falha de rede, tempo esgotado ou servidor fora: vale tentar de novo. Recusa do servidor
 * (conflito, autoria trocada, acesso) não: é aí que o rascunho precisa ser recuperado.
 */
export function isTransientLiveFailure(cause: unknown): boolean {
  if (cause instanceof LiveRequestError)
    return cause.status === 0 || cause.status >= 500 || cause.status === 429 || cause.status === 408
  return true
}
