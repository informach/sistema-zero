import { envelope, UnauthorizedError } from '@sistemazero/core/http'
import { Elysia, t } from 'elysia'
import { campaignState } from '../../domain/campaign'
import { assertInternalCaller } from './auth'
import type { InternalRoutesDeps } from './internal.routes'

/** Somente o BFF member-shell, autenticado por HMAC no gateway, fornece esta identidade. */
export function memberGiftRoutes(
  deps: Pick<InternalRoutesDeps, 'repo' | 'redeem' | 'campaigns' | 'internalToken'>,
) {
  return new Elysia().post(
    '/referrals/internal/member-gifts',
    async ({ headers, body, set }) => {
      if (!deps.internalToken) throw new UnauthorizedError('Integração do presente indisponível')
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      const code = await deps.repo.findCodeByCode(body.code)
      if (code?.status !== 'active') {
        set.status = 404
        return envelope('GIFT_UNAVAILABLE', 'Presente não encontrado.')
      }
      const campaign = code.campaignId ? await deps.campaigns?.repo.findById(code.campaignId) : null
      const audience = campaign?.audience ?? code.audience
      if (audience !== body.account.audience || (code.ownerKind === 'campaign' && !campaign)) {
        set.status = 404
        return envelope('GIFT_UNAVAILABLE', 'Presente não encontrado.')
      }
      if (body.action === 'inspect') {
        const own = await deps.redeem.inspectAccountGift(
          campaign ?? null,
          audience,
          code.ownerKind,
          body.account,
        )
        if (own) return { ...own, state: campaign ? campaignState(campaign) : 'active' }
        const plan = await deps.redeem.publicGift(campaign ?? null, audience)
        if (plan.availability !== 'available') {
          set.status = plan.availability === 'upstream_error' ? 503 : 410
          return envelope('GIFT_UNAVAILABLE', 'Não foi possível consultar este presente agora.')
        }
        return {
          gift: plan.gift,
          redemption: null,
          state: campaign ? campaignState(campaign) : 'active',
        }
      }
      const result = await deps.redeem.execute(
        {
          code: body.code,
          email: body.account.email,
          name: body.account.name,
          phone: body.account.phone,
          attribution: {
            utmSource: 'platform',
            utmMedium: body.originKind,
            utmCampaign: body.originId,
            utmContent: body.blockId ?? null,
          },
        },
        { userId: body.account.userId, audience },
      )
      if (
        result.kind === 'completed' ||
        result.kind === 'already_redeemed' ||
        result.kind === 'processing'
      )
        return result
      set.status =
        result.kind === 'upstream_error'
          ? 503
          : result.kind === 'campaign_unavailable' || result.kind === 'gift_unavailable'
            ? 410
            : 409
      return envelope(
        'GIFT_UNAVAILABLE',
        result.kind === 'campaign_unavailable'
          ? 'Esta campanha não está disponível para novas ativações.'
          : 'Não foi possível ativar o presente. Tente novamente ou fale com o atendimento.',
      )
    },
    {
      body: t.Object({
        action: t.Union([t.Literal('inspect'), t.Literal('redeem')]),
        code: t.String({ pattern: '^[a-z0-9-]{4,32}$' }),
        account: t.Object({
          userId: t.String({ format: 'uuid' }),
          email: t.String({ format: 'email' }),
          name: t.String({ minLength: 1, maxLength: 120 }),
          phone: t.Optional(t.String({ maxLength: 20 })),
          audience: t.Union([t.Literal('kids'), t.Literal('adult')]),
        }),
        originKind: t.String({ maxLength: 20 }),
        originId: t.String({ maxLength: 100 }),
        blockId: t.Optional(t.String({ maxLength: 100 })),
      }),
    },
  )
}
