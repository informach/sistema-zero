import { envelope } from '@sistemazero/core/http'
import { Elysia, t } from 'elysia'
import type { CreateInviteService } from '../../application/invites/create-invite.service'
import type { RedeemScholarshipService } from '../../application/redeem-scholarship/redeem-scholarship.service'
import { EMAIL_PATTERN, isValidCode, normalizeCode } from '../../domain/codes'
import type { ReferralRepository } from '../../domain/ports/referral-repository.port'
import { assertInternalCaller } from './auth'

const TOKEN_PATTERN = '^[A-Za-z0-9_-]{16,64}$'

export interface InternalRoutesDeps {
  repo: ReferralRepository
  redeem: RedeemScholarshipService
  invite: CreateInviteService
  funnelPublicUrl: string
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
        return { code: record.code, ownerKind: record.ownerKind, displayName: record.displayName }
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
        return {
          name: ambassador.name,
          code: ambassador.code,
          shareUrl: `${base}/bolsa/${ambassador.code}`,
          stats: ambassador.stats,
        }
      },
      { params: t.Object({ token: t.String({ pattern: TOKEN_PATTERN }) }) },
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
        })
        switch (result.kind) {
          case 'completed':
            set.status = 201
            return { status: 'completed' }
          case 'processing':
            set.status = 202
            return { status: 'processing' }
          case 'code_not_found':
            set.status = 404
            return envelope('CODE_NOT_FOUND', 'Código não encontrado')
          case 'already_redeemed':
            set.status = 409
            return envelope('SCHOLARSHIP_ALREADY_REDEEMED', 'Esse e-mail já resgatou a bolsa')
          case 'failed':
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
        }),
      },
    )
}
