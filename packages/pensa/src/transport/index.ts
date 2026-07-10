/**
 * Superfície do transport: os TIPOS vêm do core (contrato) e este módulo só
 * agrega o helper mínimo p/ hosts construírem o erro padrão a partir de uma
 * resposta HTTP com falha.
 */
import { PensaApiError } from '../core/types'

export type { PensaChatHandlers, PensaChatInput, PensaTransport } from '../core/types'
export { PensaApiError }

/**
 * Constrói o `PensaApiError` que o transport DEVE lançar quando o servidor
 * responde com erro. `code` é o código de domínio (ex.: 'PENSA_NOT_FOUND');
 * sem mensagem explícita, cai num texto neutro (a UI mostra copy gentil).
 * `scope` acompanha `AI_QUOTA_EXCEEDED` (teto diário/mensal de IA da conta).
 */
export function createFetchError(
  status: number,
  code: string,
  message?: string,
  scope?: 'day' | 'month',
): PensaApiError {
  return new PensaApiError(message ?? `Pedido falhou (${status}: ${code})`, status, code, scope)
}
