import type { PensaChatMessage } from './pensa'

export interface TrimConversationOptions {
  /** Máximo de mensagens mantidas (as ÚLTIMAS). */
  maxMessages: number
  /** Máximo de chars SOMADOS dos `content` mantidos. */
  maxChars: number
}

/**
 * Trim da conversa (cap do contrato: últimas 80 mensagens E ≤ 262_144 chars
 * somados) — corta do INÍCIO, preservando a ordem. A mensagem MAIS RECENTE
 * sempre fica (mesmo que sozinha estoure o teto de chars — conversa nunca
 * volta vazia de um turno válido). Puro; o `message_count` TOTAL histórico é
 * preservado pelo caller (não encolhe no trim).
 */
export function trimConversation(
  messages: readonly PensaChatMessage[],
  opts: TrimConversationOptions,
): PensaChatMessage[] {
  const kept: PensaChatMessage[] = []
  let chars = 0
  // Varre da mais RECENTE para a mais antiga, acumulando enquanto couber.
  for (const message of [...messages].reverse()) {
    if (kept.length >= opts.maxMessages) break
    if (kept.length > 0 && chars + message.content.length > opts.maxChars) break
    kept.push(message)
    chars += message.content.length
  }
  return kept.reverse()
}
