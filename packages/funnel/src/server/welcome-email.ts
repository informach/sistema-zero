import type { FunnelRepo, Lead } from '../db/repo'
import {
  computeFixedAccessExpiry,
  fixedAccessFromSnapshot,
  formatSaoPauloDateTime,
} from '../lib/access-period'
import type { GatewayClient, SendMessageInput } from '../lib/gateway-client'
import { splitName } from './fulfillment'
import { parsePurchasedOfferSnapshot } from './purchased-offer-snapshot'

export interface WelcomeEmailDeps {
  gateway: GatewayClient
  /** Base do app do aluno ADULTO (link de definir senha) — funil `pro/*`. */
  communityUrl: string
  /** Base do app KIDS — funil `kids/*`. Ausente → cai no `communityUrl` (compat). */
  kidsCommunityUrl?: string
  /** One-shot atômico do welcome (claim) + liberação quando NADA foi emitido. */
  repo: Pick<FunnelRepo, 'claimWelcome' | 'releaseWelcome' | 'paymentContext'>
  log?: (msg: string, meta?: Record<string, unknown>) => void
}

/**
 * Notificação pós-compra por E-MAIL e WHATSAPP, RAMIFICADA pelo tipo de comprador
 * (`buyerIsNew`, vindo do `created` do `ensure-buyer`). Roda após fulfill+grant.
 * - **NOVO** (`buyerIsNew === true`): boas-vindas com o link de DEFINIR a senha
 *   (1º acesso) — template `welcome`, link `…/redefinir-senha?token=` (token
 *   single-use; mesmo nos dois canais).
 * - **RECORRENTE** (`buyerIsNew === false`): já tem credenciais — NÃO recebe link
 *   de senha (seria confuso). Recebe um aviso de "novo acesso liberado" — template
 *   `new-access`, link `…/cursos` (sem token).
 * `buyerIsNew` nulo = comprador ainda não registrado no IdP → nada a notificar.
 *
 * BEST-EFFORT deliberado: qualquer falha é logada e NUNCA lança — as mensagens não
 * são críticas para a concessão do acesso (o aluno tem "esqueci minha senha" como
 * fallback), então não força reentrega do webhook. Cada canal é INDEPENDENTE: a
 * falha de um não impede o outro. Idempotente no replay: `Idempotency-Key` POR
 * CANAL + tipo (`welcome-<leadId>` / `new-access-<leadId>` e os `-wa-` — o messaging
 * deduplica por consumer+chave; reusar a mesma chave devolveria a mensagem do 1º
 * canal em vez de enfileirar o 2º).
 *
 * ⚠️ ONE-SHOT ATÔMICO (`claimWelcome` → `welcome_sent_at`, full review 06/2026): a
 * notificação roda em DOIS caminhos (webhook E síncrono cartão/polling). No caso
 * NOVO, o auth CONSOME os tokens pendentes ao emitir um novo (1 vivo/usuário) — sem
 * o claim, a 2ª execução emitia um token novo (invalidando o do e-mail JÁ entregue)
 * e o messaging deduplicava o reenvio: o comprador clicava num LINK MORTO. Só a
 * execução que vence o claim envia; o claim só é liberado (`releaseWelcome`) se NADA
 * saiu (falha na emissão do token, caso NOVO) — depois de enviado, nunca. Cada
 * compra é um `lead` distinto, então o claim por-lead serve aos dois casos. (A
 * coluna/método mantêm o nome `welcome*` por compat do wiring, mas cobrem os dois.)
 */
export function makeSendWelcome(deps: WelcomeEmailDeps): (lead: Lead) => Promise<void> {
  return async (lead: Lead) => {
    // Sem e-mail não há canal primário; `buyerIsNew` nulo = ainda não registrado.
    if (!lead.email || lead.buyerIsNew == null) return
    // Repetição barata (lead fresco do chamador) — a corrida real é do claim.
    if (lead.welcomeSentAt) return
    try {
      if (!(await deps.repo.claimWelcome(lead.id, new Date()))) return

      const { firstName } = splitName(lead.nome)
      // Funil kids → app KIDS; senão o adulto. A chave do lead é `audience/produto`.
      const baseUrl = lead.funnel?.startsWith('kids/')
        ? (deps.kidsCommunityUrl ?? deps.communityUrl)
        : deps.communityUrl
      let challengeAccess: { expiresAtLabel: string } | null = null
      try {
        challengeAccess = await resolveChallengeAccess(deps.repo, lead)
      } catch (error) {
        // O snapshot especializa a copy, mas não pode impedir a mensagem
        // genérica nem prender o claim se a leitura do histórico oscilar.
        deps.log?.('welcome.access_snapshot_failed', {
          leadId: lead.id,
          message: error instanceof Error ? error.message : String(error),
        })
      }

      // Resolve o conteúdo por tipo de comprador. No NOVO, emite o token de senha
      // (e libera o claim se falhar — nada saiu). No RECORRENTE, não há token.
      let templateKey: string
      let link: string
      let keyPrefix: string
      let action: string
      let guidance: string
      if (lead.buyerIsNew) {
        const tokenRes = await deps.gateway.createPasswordToken(lead.email)
        const token = readToken(tokenRes.body)
        if (tokenRes.status !== 201 || !token) {
          deps.log?.('welcome.token_failed', { leadId: lead.id, status: tokenRes.status })
          // Sem token emitido NADA saiu → libera o claim p/ um caminho futuro tentar.
          await deps.repo.releaseWelcome(lead.id)
          return
        }
        templateKey = 'welcome'
        link = `${baseUrl}/redefinir-senha?token=${encodeURIComponent(token)}`
        keyPrefix = 'welcome'
        action = 'Criar acesso e abrir a primeira etapa'
        guidance =
          'Crie sua senha pelo botão abaixo, cadastre o perfil da criança e abram juntos a primeira etapa.'
      } else {
        templateKey = 'new-access'
        link = `${baseUrl}/cursos`
        keyPrefix = 'new-access'
        action = 'Abrir a primeira etapa'
        guidance = 'Entre com seu e-mail e sua senha de sempre e abra a primeira etapa do Desafio.'
      }

      const variables: Record<string, string> = { nome: firstName, link }
      if (challengeAccess) {
        templateKey = 'challenge-access-approved'
        keyPrefix = 'challenge-access-approved'
        variables.expira_em = challengeAccess.expiresAtLabel
        variables.acao = action
        variables.orientacao = guidance
      }

      await sendOne(
        deps,
        lead.id,
        {
          channel: 'email',
          templateKey,
          recipient: { name: firstName, email: lead.email },
          variables,
        },
        `${keyPrefix}-${lead.id}`,
      )

      const phone = toWhatsAppPhone(lead.telefone)
      if (phone) {
        await sendOne(
          deps,
          lead.id,
          {
            channel: 'whatsapp',
            templateKey,
            recipient: { name: firstName, phone },
            variables,
          },
          `${keyPrefix}-wa-${lead.id}`,
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

async function resolveChallengeAccess(
  repo: Pick<FunnelRepo, 'paymentContext'>,
  lead: Lead,
): Promise<{ expiresAtLabel: string } | null> {
  if (lead.funnel !== 'kids/desafio-primeiro-jogo' || !lead.paymentId || !lead.paidAt) {
    return null
  }
  const context = await repo.paymentContext(lead.paymentId)
  const snapshot = parsePurchasedOfferSnapshot(context?.offerSnapshot)
  const access = fixedAccessFromSnapshot(snapshot)
  if (!access) return null

  const expiresAt = computeFixedAccessExpiry(lead.paidAt, access)
  return {
    expiresAtLabel: formatSaoPauloDateTime(expiresAt),
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
