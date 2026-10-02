import { envelope } from '@sistemazero/core/http'
import { type GiftSource, sanitizeGiftAttribution } from '@sistemazero/core/referrals'
import { Elysia, t } from 'elysia'
import type { CampaignAdminService } from '../../application/campaigns/campaign-admin.service'
import type { CreateInviteService } from '../../application/invites/create-invite.service'
import type { RedeemScholarshipService } from '../../application/redeem-scholarship/redeem-scholarship.service'
import { campaignSource, campaignState } from '../../domain/campaign'
import { EMAIL_PATTERN, isValidCode, normalizeCode } from '../../domain/codes'
import type { ReferralRepository } from '../../domain/ports/referral-repository.port'
import { assertInternalCaller } from './auth'

const TOKEN_PATTERN = '^[A-Za-z0-9_-]{16,64}$'

export interface InternalRoutesDeps {
  repo: ReferralRepository
  redeem: RedeemScholarshipService
  invite: CreateInviteService
  funnelPublicUrl: string
  campaigns?: CampaignAdminService
  bonusAmountCents?: number
  internalToken?: string
}

/**
 * Rotas S2S consumidas pelo FUNIL (landings /bolsa e /embaixador) via gateway
 * (auth = HMAC de borda lá; aqui a prova de origem `x-internal-token`).
 * 404 UNIFORME para código/token inexistente OU desativado — não vazar qual.
 */
export function internalRoutes(deps: InternalRoutesDeps) {
  const guard = (headers: Record<string, string | undefined>) =>
    assertInternalCaller(headers['x-internal-token'], deps.internalToken)
  const base = deps.funnelPublicUrl.replace(/\/$/, '')

  return new Elysia({ prefix: '/referrals/internal' })
    .onTransform(({ headers }) => guard(headers))
    .get(
      '/codes/:code',
      async ({ params, headers, set }) => {
        guard(headers)
        const code = normalizeCode(params.code)
        if (!isValidCode(code)) {
          set.status = 404
          return envelope('CODE_NOT_FOUND', 'Código não encontrado')
        }
        const record = await deps.repo.findCodeByCode(code)
        if (record?.status !== 'active') {
          set.status = 404
          return envelope('CODE_NOT_FOUND', 'Código não encontrado')
        }
        const campaign =
          record.ownerKind === 'campaign' && record.campaignId
            ? await deps.campaigns?.repo.findById(record.campaignId)
            : null
        if (record.ownerKind === 'campaign' && (!campaign || campaignState(campaign) === 'draft')) {
          set.status = 404
          return envelope('CODE_NOT_FOUND', 'Código não encontrado')
        }
        const state = campaign ? campaignState(campaign) : 'active'
        const source: GiftSource = campaign
          ? campaignSource(campaign)
          : { kind: record.ownerKind, name: record.displayName }
        const availability =
          state === 'active' ? await deps.redeem.giftAvailability() : 'unavailable'
        if (availability === 'upstream_error') {
          set.status = 502
          return envelope('UPSTREAM_ERROR', 'Não foi possível consultar o presente agora')
        }
        return {
          code: record.code,
          ownerKind: record.ownerKind,
          displayName: record.displayName,
          source,
          state,
          startsAt: campaign?.startsAt.toISOString() ?? null,
          endsAt: campaign?.endsAt.toISOString() ?? null,
          giftAvailable: availability === 'available',
        }
      },
      { params: t.Object({ code: t.String({ minLength: 1, maxLength: 64 }) }) },
    )
    .get(
      '/ambassadors/by-token/:token',
      async ({ params, headers, set }) => {
        guard(headers)
        const ambassador = await deps.repo.findAmbassadorByToken(params.token)
        if (ambassador?.status !== 'active' || !ambassador.code) {
          set.status = 404
          return envelope('AMBASSADOR_NOT_FOUND', 'Página não encontrada')
        }
        // Bônus SEM PII do bolsista (LGPD): o embaixador vê valor/data/estado,
        // nunca quem assinou. A régua do que é visível vive no repo/domínio
        // (filtro no SQL, ANTES do limit — canceladas não empurram bônus reais
        // para fora da página).
        const visible = await deps.repo.listAmbassadorVisibleConversions(ambassador.id, 50)
        return {
          name: ambassador.name,
          code: ambassador.code,
          shareUrl: `${base}/bolsa/${ambassador.code}`,
          stats: ambassador.stats,
          bonus: {
            amountCents: deps.bonusAmountCents,
            pixKey: ambassador.pixKey,
            items: visible.map((c) => ({
              id: c.id,
              status: c.status,
              bonusCents: c.bonusCents,
              subscribedAt: c.paidAt.toISOString(),
              paidMarkedAt: c.paidMarkedAt?.toISOString() ?? null,
            })),
          },
        }
      },
      { params: t.Object({ token: t.String({ pattern: TOKEN_PATTERN }) }) },
    )
    .patch(
      // Chave Pix do bônus — cadastrada pelo PRÓPRIO embaixador (a capability
      // da página é a autorização; validação leve: CPF/e-mail/fone/EVP cabem).
      '/ambassadors/by-token/:token/pix',
      async ({ params, body, headers, set }) => {
        guard(headers)
        const pixKey = body.pixKey.trim()
        const ok = await deps.repo.setAmbassadorPixByToken(params.token, pixKey)
        if (!ok) {
          set.status = 404
          return envelope('AMBASSADOR_NOT_FOUND', 'Página não encontrada')
        }
        return { ok: true }
      },
      {
        params: t.Object({ token: t.String({ pattern: TOKEN_PATTERN }) }),
        body: t.Object({ pixKey: t.String({ minLength: 5, maxLength: 140 }) }),
      },
    )
    .post(
      '/ambassadors/by-token/:token/invites',
      async ({ params, body, headers, set }) => {
        guard(headers)
        const result = await deps.invite.execute({
          pageToken: params.token,
          name: body.name,
          email: body.email,
        })
        switch (result.kind) {
          case 'sent':
            set.status = 202
            return { ok: true }
          case 'ambassador_not_found':
            set.status = 404
            return envelope('AMBASSADOR_NOT_FOUND', 'Página não encontrada')
          case 'already_invited':
            set.status = 409
            return envelope('INVITE_ALREADY_SENT', 'Esse e-mail já recebeu o convite')
          case 'already_redeemed':
            set.status = 409
            return envelope('EMAIL_ALREADY_REDEEMED', 'Esse e-mail já resgatou a bolsa')
          case 'daily_limit':
            set.status = 429
            return envelope('INVITE_DAILY_LIMIT', 'Limite diário de convites atingido')
          case 'upstream_error':
            set.status = 502
            return envelope('UPSTREAM_ERROR', 'Não foi possível enviar agora')
        }
      },
      {
        params: t.Object({ token: t.String({ pattern: TOKEN_PATTERN }) }),
        body: t.Object({
          name: t.String({ minLength: 2, maxLength: 120 }),
          email: t.String({ pattern: EMAIL_PATTERN, maxLength: 254 }),
        }),
      },
    )
    .post(
      '/redemptions',
      async ({ body, headers, set }) => {
        guard(headers)
        const result = await deps.redeem.execute({
          code: body.code,
          name: body.name,
          email: body.email,
          phone: body.phone,
          attribution: sanitizeGiftAttribution(body.attribution),
        })
        switch (result.kind) {
          case 'completed':
            set.status = 201
            return {
              status: 'completed',
              expiresAt: result.expiresAt,
              emailStatus: result.emailStatus,
            }
          case 'processing':
            set.status = 202
            return { status: 'processing' }
          case 'code_not_found':
            set.status = 404
            return envelope('CODE_NOT_FOUND', 'Código não encontrado')
          case 'already_redeemed':
            set.status = 409
            return envelope('SCHOLARSHIP_ALREADY_REDEEMED', 'Esse e-mail já resgatou a bolsa')
          case 'gift_unavailable':
            set.status = 503
            return envelope('GIFT_UNAVAILABLE', 'O curso indicado ainda está em preparação')
          case 'campaign_unavailable':
            set.status = 410
            return envelope(
              'CAMPAIGN_UNAVAILABLE',
              result.state === 'scheduled'
                ? 'Esta campanha ainda não começou.'
                : result.state === 'paused'
                  ? 'Esta campanha está pausada.'
                  : 'O período desta campanha terminou.',
            )
          case 'failed':
            if (result.reason === 'gift_window_elapsed') {
              set.status = 410
              return envelope('GIFT_EXPIRED', 'Os sete dias de acesso deste cadastro terminaram.')
            }
            // Terminal (ex.: matrícula conflitante) — retry não resolve; suporte.
            set.status = 409
            return envelope('SCHOLARSHIP_FAILED', 'Não foi possível concluir o resgate')
          case 'upstream_error':
            set.status = 502
            return envelope('UPSTREAM_ERROR', 'Não foi possível concluir agora')
        }
      },
      {
        body: t.Object({
          code: t.String({ minLength: 4, maxLength: 32 }),
          name: t.String({ minLength: 2, maxLength: 120 }),
          email: t.String({ pattern: EMAIL_PATTERN, maxLength: 254 }),
          phone: t.Optional(t.String({ maxLength: 20 })),
          attribution: t.Optional(
            t.Object({
              utmSource: t.Optional(t.Nullable(t.String({ maxLength: 100 }))),
              utmMedium: t.Optional(t.Nullable(t.String({ maxLength: 100 }))),
              utmCampaign: t.Optional(t.Nullable(t.String({ maxLength: 100 }))),
              utmContent: t.Optional(t.Nullable(t.String({ maxLength: 100 }))),
            }),
          ),
        }),
      },
    )
}
