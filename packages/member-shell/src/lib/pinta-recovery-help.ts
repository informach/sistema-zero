import type { PintaHostChromeHelp } from '@sistemazero/pinta'
import { sessionFetch } from './session-fetch'

export const PINTA_RECOVERY_HELP_ENDPOINT = '/api/pinta/recovery-help'
/** Onde a resposta da equipe aparece, na frase do Pinta depois do envio. */
export const PINTA_RECOVERY_HELP_WHERE = 'nos seus recados'

/**
 * O canal de recados que o host liga no Pinta (23/11/2026): o "Preciso de ajuda" do aviso de
 * recuperação manda o pedido pelo BFF e devolve a conversa onde a resposta aparece. Só existe com
 * a conta do Pinta deste aluno (`usePintaAccount`); sem ela (pais, visitante, outra conta) o botão
 * não aparece. Quem decide de verdade é o servidor.
 */
export function pintaRecoveryHelpFor(
  accountId: string | null,
  send: (input: string, init: RequestInit) => Promise<Response> = sessionFetch,
): PintaHostChromeHelp | null {
  if (!accountId) return null
  return {
    async send(report) {
      const response = await send(PINTA_RECOVERY_HELP_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(report),
      })
      if (!response.ok) throw new Error(`O pedido de ajuda falhou (${response.status}).`)
      const body = (await response.json().catch(() => null)) as { threadId?: unknown } | null
      if (typeof body?.threadId !== 'string' || !body.threadId)
        throw new Error('O pedido de ajuda voltou sem a conversa.')
      return {
        label: PINTA_RECOVERY_HELP_WHERE,
        href: `/recados/${encodeURIComponent(body.threadId)}`,
      }
    },
  }
}
