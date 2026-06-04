import type { Lead } from '../db/repo'
import type { GatewayClient } from '../lib/gateway-client'
import { splitName } from './fulfillment'

export interface WelcomeEmailDeps {
  gateway: GatewayClient
  /** Base do app do aluno (link de definir senha): `${communityUrl}/redefinir-senha?token=...`. */
  communityUrl: string
  log?: (msg: string, meta?: Record<string, unknown>) => void
}

/**
 * E-mail de boas-vindas pós-compra com o link de DEFINIR a senha (1º acesso ao
 * app community). Roda após fulfill+grant, SÓ para comprador NOVO (`buyerIsNew` —
 * recém-criado no IdP; o recorrente já tem credenciais, mandar um link de
 * redefinição seria confuso). BEST-EFFORT deliberado: qualquer falha é logada e
 * NUNCA lança — o e-mail não é crítico para a concessão do acesso (o aluno tem o
 * "esqueci minha senha" como fallback), então não força reentrega do webhook.
 * Idempotente no replay: `Idempotency-Key: welcome-<leadId>` (o messaging deduplica).
 */
export function makeSendWelcome(deps: WelcomeEmailDeps): (lead: Lead) => Promise<void> {
  return async (lead: Lead) => {
    if (!lead.buyerIsNew || !lead.email) return
    try {
      const tokenRes = await deps.gateway.createPasswordToken(lead.email)
      const token = readToken(tokenRes.body)
      if (tokenRes.status !== 201 || !token) {
        deps.log?.('welcome.token_failed', { leadId: lead.id, status: tokenRes.status })
        return
      }

      const { firstName } = splitName(lead.nome)
      const link = `${deps.communityUrl}/redefinir-senha?token=${encodeURIComponent(token)}`
      const sendRes = await deps.gateway.sendMessage(
        {
          channel: 'email',
          templateKey: 'welcome',
          recipient: { name: firstName, email: lead.email },
          variables: { nome: firstName, link },
        },
        `welcome-${lead.id}`,
      )
      if (sendRes.status !== 202 && sendRes.status !== 200) {
        deps.log?.('welcome.send_failed', { leadId: lead.id, status: sendRes.status })
        return
      }
      deps.log?.('welcome.sent', { leadId: lead.id })
    } catch (err) {
      deps.log?.('welcome.error', {
        leadId: lead.id,
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }
}

function readToken(body: unknown): string | null {
  if (body && typeof body === 'object' && 'token' in body) {
    const token = (body as { token?: unknown }).token
    if (typeof token === 'string' && token.length > 0) return token
  }
  return null
}
