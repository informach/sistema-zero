/**
 * Serializa um erro desconhecido para um objeto logável (nome + mensagem + stack).
 * Use **aninhado** no contexto (`{ error: serializeError(e) }`) — NUNCA espalhado no
 * top-level, pois o campo `message` colidiria com o `message` do evento de log.
 */
export function serializeError(err: unknown): { name?: string; message: string; stack?: string } {
  if (err instanceof Error) return { name: err.name, message: err.message, stack: err.stack }
  return { message: String(err) }
}
