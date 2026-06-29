import type { FunnelRepo, Lead } from '../db/repo'
import type { GatewayClient, SendMessageInput } from '../lib/gateway-client'
import { splitName } from './fulfillment'

export interface WelcomeEmailDeps {
  gateway: GatewayClient
  /** Base do app do aluno ADULTO (link de definir senha) — funil `pro/*`. */
  communityUrl: string
  /** Base do app KIDS — funil `kids/*`. Ausente → cai no `communityUrl` (compat). */
  kidsCommunityUrl?: string
  /** One-shot atômico do welcome (claim) + liberação quando NADA foi emitido. */
  repo: Pick<FunnelRepo, 'claimWelcome' | 'releaseWelcome'>
  log?: (msg: string, meta?: Record<string, unknown>) => void
}

/**
 * Boas-vindas pós-compra com o link de DEFINIR a senha (1º acesso ao app
 * community), por E-MAIL e WHATSAPP (template `welcome` existe nos dois canais;
 * mesmo token/link nos dois — single-use: o primeiro clique vale, tanto faz o
 * canal). Roda após fulfill+grant, SÓ para comprador NOVO (`buyerIsNew` —
 * recém-criado no IdP; o recorrente já tem credenciais, mandar um link de
 * redefinição seria confuso). BEST-EFFORT deliberado: qualquer falha é logada e
 * NUNCA lança — as mensagens não são críticas para a concessão do acesso (o
 * aluno tem o "esqueci minha senha" como fallback), então não força reentrega
 * do webhook. Cada canal é INDEPENDENTE: a falha de um não impede o outro.
 * Idempotente no replay: `Idempotency-Key` POR CANAL (`welcome-<leadId>` /
 * `welcome-wa-<leadId>` — o messaging deduplica por consumer+chave; reusar a
 * mesma chave devolveria a mensagem do 1º canal em vez de enfileirar o 2º).
 *
 * ⚠️ ONE-SHOT ATÔMICO (`claimWelcome`, full review 06/2026): o welcome roda em
 * DOIS caminhos (webhook E síncrono cartão/polling) e o auth CONSOME os tokens
 * pendentes ao emitir um novo (1 vivo/usuário) — sem o claim, a 2ª execução
 * emitia um token novo (invalidando o do e-mail JÁ entregue) e o messaging
 * deduplicava o reenvio: o comprador clicava num LINK MORTO. Só a execução que
 * vence o claim emite token/envia; o claim só é liberado se NADA foi emitido
 * (falha na emissão do token) — depois de emitido, nunca (re-emitir mataria o
 * link entregue).
 */
export function makeSendWelcome(deps: WelcomeEmailDeps): (lead: Lead) => Promise<void> {
  return async (lead: Lead) => {
    if (!lead.buyerIsNew || !lead.email) return
    // Repetição barata (lead fresco do chamador) — a corrida real é do claim.
    if (lead.welcomeSentAt) return
    try {
      if (!(await deps.repo.claimWelcome(lead.id, new Date()))) return
      const tokenRes = await deps.gateway.createPasswordToken(lead.email)
      const token = readToken(tokenRes.body)
      if (tokenRes.status !== 201 || !token) {
        deps.log?.('welcome.token_failed', { leadId: lead.id, status: tokenRes.status })
        // Sem token emitido NADA saiu → libera o claim p/ um caminho futuro
        // (reentrega do webhook / próximo poll) tentar de novo.
        await deps.repo.releaseWelcome(lead.id)
        return
      }

      const { firstName } = splitName(lead.nome)
      // Funil kids → app KIDS; senão o adulto. A chave do lead é `audience/produto`.
      const baseUrl = lead.funnel?.startsWith('kids/')
        ? (deps.kidsCommunityUrl ?? deps.communityUrl)
        : deps.communityUrl
      const link = `${baseUrl}/redefinir-senha?token=${encodeURIComponent(token)}`
      const variables = { nome: firstName, link }

      await sendOne(
        deps,
        lead.id,
        {
          channel: 'email',
          templateKey: 'welcome',
          recipient: { name: firstName, email: lead.email },
          variables,
        },
        `welcome-${lead.id}`,
      )

      const phone = toWhatsAppPhone(lead.telefone)
      if (phone) {
        await sendOne(
          deps,
          lead.id,
          {
            channel: 'whatsapp',
            templateKey: 'welcome',
            recipient: { name: firstName, phone },
            variables,
          },
          `welcome-wa-${lead.id}`,
        )
      }
    } catch (err) {
      deps.log?.('welcome.error', {
        leadId: lead.id,
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }
}

/** Um envio por canal — best-effort: loga sucesso/falha e NUNCA lança. */
async function sendOne(
  deps: WelcomeEmailDeps,
  leadId: string,
  input: SendMessageInput,
  idempotencyKey: string,
): Promise<void> {
  try {
    const res = await deps.gateway.sendMessage(input, idempotencyKey)
    if (res.status !== 202 && res.status !== 200) {
      deps.log?.('welcome.send_failed', { leadId, channel: input.channel, status: res.status })
      return
    }
    deps.log?.('welcome.sent', { leadId, channel: input.channel })
  } catch (err) {
    deps.log?.('welcome.send_failed', {
      leadId,
      channel: input.channel,
      message: err instanceof Error ? err.message : String(err),
    })
  }
}

/**
 * Telefone do lead (BR: DDD+número, 10–11 dígitos — `ContactSchema`) no formato
 * internacional que a Evolution espera (`55` + DDD + número, só dígitos). Já com
 * DDI 55 → mantém; qualquer outra forma → `null` (sem WhatsApp; o e-mail segue
 * como canal primário).
 */
export function toWhatsAppPhone(tel: string | null): string | null {
  const digits = (tel ?? '').replace(/\D/g, '')
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) return digits
  return null
}

function readToken(body: unknown): string | null {
  if (body && typeof body === 'object' && 'token' in body) {
    const token = (body as { token?: unknown }).token
    if (typeof token === 'string' && token.length > 0) return token
  }
  return null
}
