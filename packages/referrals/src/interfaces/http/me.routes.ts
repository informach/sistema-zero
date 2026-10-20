import { ForbiddenError, UnauthorizedError } from '@sistemazero/core/http'
import { Elysia } from 'elysia'
import type {
  AmbassadorAdminService,
  AmbassadorView,
} from '../../application/ambassadors/ambassador-admin.service'
import type { ReferralRepository } from '../../domain/ports/referral-repository.port'
import { assertInternalCaller, decodeIdentityHeader } from './auth'

export interface MeRoutesDeps {
  ambassadors: AmbassadorAdminService
  repo: ReferralRepository
  /** Snapshot da env BONUS_AMOUNT_CENTS — o app NUNCA hardcoda o valor na copy. */
  bonusAmountCents: number
  internalToken?: string
}

/**
 * Rotas "me" do embaixador-PAI (auto-cadastro na área dos pais). Chegam via
 * gateway com JWT (conta ativa) — a identidade vem dos headers `x-auth-user-*`
 * injetados, confiáveis pela prova de origem `x-internal-token`.
 */
export function meRoutes(deps: MeRoutesDeps) {
  function identity(headers: Record<string, string | undefined>) {
    assertInternalCaller(headers['x-internal-token'], deps.internalToken)
    // ⚠️ `x-auth-account-id` presente = sessão de PERFIL (criança). Embaixador é
    // assunto da ÁREA DOS PAIS: a criança é recusada aqui, como o auth já faz
    // nas mutações de conta. Defesa em profundidade — o shim do kids também
    // gateia com requireParentGateAccountOnly, mas o serviço não depende disso
    // (um consumidor novo herdaria o furo).
    if (headers['x-auth-account-id']) {
      throw new ForbiddenError('Esta área é do responsável, não do perfil da criança')
    }
    const accountUserId = headers['x-auth-user-id']
    const email = headers['x-auth-user-email']
    if (!accountUserId || !email) throw new UnauthorizedError('Autenticação necessária')
    const name = decodeIdentityHeader(headers['x-auth-user-name']) ?? ''
    // Sessão de SUPORTE (o gateway injeta o ator em `x-auth-impersonator-id`): a equipe vê o
    // estado do cadastro, mas nunca os links. O `pageUrl` é a capability que troca a chave Pix.
    const impersonated = Boolean(headers['x-auth-impersonator-id']?.trim())
    return { accountUserId, email, name, impersonated }
  }

  async function bodyFor(
    view: AmbassadorView,
    ambassador: Parameters<AmbassadorAdminService['shareUrls']>[0],
    redactLinks: boolean,
  ) {
    const [stats, bonusCounts, shareUrls] = await Promise.all([
      deps.repo.getAmbassadorStats(ambassador.id),
      deps.repo.countConversionsForAmbassador(ambassador.id),
      // Suporte: sem links e sem criar o código adulto (um GET da equipe não muda nada).
      redactLinks
        ? Promise.resolve({ kids: null, adult: null })
        : deps.ambassadors.shareUrls(ambassador),
    ])
    return {
      enrolled: true as const,
      ambassador: {
        code: redactLinks ? null : view.code,
        status: view.status,
        pageUrl: redactLinks ? null : view.pageUrl,
        // `shareUrl` é o link Kids (compatível); `shareUrls` traz um link por público.
        shareUrl: redactLinks ? null : view.shareUrl,
        shareUrls,
        pixKeySet: false, // sobrescrito abaixo quando o record está em mãos
      },
      stats,
      bonus: {
        pendingCount: bonusCounts.pending ?? 0,
        eligibleCount: bonusCounts.eligible ?? 0,
        paidCount: bonusCounts.paid ?? 0,
        amountCents: deps.bonusAmountCents,
      },
    }
  }

  async function enrolledView(accountUserId: string, redactLinks = false) {
    const ambassador = await deps.repo.findAmbassadorByAccount(accountUserId)
    if (!ambassador) {
      return { enrolled: false as const, bonus: { amountCents: deps.bonusAmountCents } }
    }
    const body = await bodyFor(deps.ambassadors.viewOf(ambassador), ambassador, redactLinks)
    body.ambassador.pixKeySet = Boolean(ambassador.pixKey)
    return body
  }

  return new Elysia({ prefix: '/referrals/me' })
    .get('/ambassador', async ({ headers }) => {
      const id = identity(headers)
      return enrolledView(id.accountUserId, id.impersonated)
    })
    .post('/ambassador', async ({ headers, set }) => {
      const id = identity(headers)
      // Cadastro (e o e-mail com o link da página) é decisão da própria pessoa, nunca do suporte.
      if (id.impersonated)
        throw new ForbiddenError('Sessão de suporte não cadastra embaixador nem recebe os links')
      const name = id.name.trim() || id.email.split('@')[0] || 'Responsável'
      const result = await deps.ambassadors.selfEnroll({
        accountUserId: id.accountUserId,
        email: id.email,
        name,
      })
      if (result.kind === 'email_pending') {
        // Já existe embaixador com este e-mail e a plataforma NÃO verifica
        // e-mail: em vez de vincular (sequestro), o link vai para a caixa do
        // dono. O app avisa e não mostra links.
        return {
          enrolled: false as const,
          emailPending: true as const,
          linkEmailSent: result.emailSent,
          bonus: { amountCents: deps.bonusAmountCents },
        }
      }
      if (result.created) set.status = 201
      // Criar o cadastro e aceitar o e-mail são resultados diferentes.
      const view = await enrolledView(id.accountUserId)
      return {
        ...view,
        created: result.created,
        ...(result.created ? { linkEmailSent: result.emailSent === true } : {}),
      }
    })
}
