import { envelope, UnauthorizedError } from '@sistemazero/core/http'
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
    // Sessão de PERFIL (kids) manda o perfil em x-auth-user-id e a CONTA em
    // x-auth-account-id — o vínculo do embaixador é SEMPRE pela conta (regra
    // da plataforma; sem o fallback, um perfil prenderia o e-mail da conta a
    // um uuid de perfil e o dono real cairia em 409 para sempre).
    const accountUserId = headers['x-auth-account-id'] ?? headers['x-auth-user-id']
    const email = headers['x-auth-user-email']
    if (!accountUserId || !email) throw new UnauthorizedError('Autenticação necessária')
    const name = decodeIdentityHeader(headers['x-auth-user-name']) ?? ''
    return { accountUserId, email, name }
  }

  async function bodyFor(view: AmbassadorView, ambassadorId: string) {
    const [stats, bonusCounts] = await Promise.all([
      deps.repo.getAmbassadorStats(ambassadorId),
      deps.repo.countConversionsForAmbassador(ambassadorId),
    ])
    return {
      enrolled: true as const,
      ambassador: {
        code: view.code,
        status: view.status,
        pageUrl: view.pageUrl,
        shareUrl: view.shareUrl,
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

  async function enrolledView(accountUserId: string) {
    const ambassador = await deps.repo.findAmbassadorByAccount(accountUserId)
    if (!ambassador) {
      return { enrolled: false as const, bonus: { amountCents: deps.bonusAmountCents } }
    }
    const body = await bodyFor(deps.ambassadors.viewOf(ambassador), ambassador.id)
    body.ambassador.pixKeySet = Boolean(ambassador.pixKey)
    return body
  }

  return new Elysia({ prefix: '/referrals/me' })
    .get('/ambassador', async ({ headers }) => {
      const id = identity(headers)
      return enrolledView(id.accountUserId)
    })
    .post('/ambassador', async ({ headers, set }) => {
      const id = identity(headers)
      const name = id.name.trim() || id.email.split('@')[0] || 'Responsável'
      const result = await deps.ambassadors.selfEnroll({
        accountUserId: id.accountUserId,
        email: id.email,
        name,
      })
      if (result.kind === 'email_conflict') {
        set.status = 409
        return envelope(
          'AMBASSADOR_EMAIL_CONFLICT',
          'Este e-mail já é embaixador em outra conta. Fale com a gente para ajustar.',
        )
      }
      if (result.created) set.status = 201
      // `created` diz ao app se o e-mail do link SAIU (só o create envia) —
      // vínculo/retomada não manda e-mail e o toast não pode prometer um.
      const view = await enrolledView(id.accountUserId)
      return { ...view, created: result.created }
    })
}
