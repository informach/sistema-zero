import { envelope } from '@sistemazero/core/http'
import { Elysia, t } from 'elysia'
import type { AmbassadorAdminService } from '../../application/ambassadors/ambassador-admin.service'
import { EMAIL_PATTERN } from '../../domain/codes'
import type {
  ConversionListItem,
  ConversionRecord,
  RedemptionRecord,
  ReferralRepository,
} from '../../domain/ports/referral-repository.port'
import { CONVERSION_STATUSES } from '../../domain/ports/referral-repository.port'
import { assertInternalCaller, decodeIdentityHeader, requireAdmin } from './auth'

// String (não RegExp.source): o `pattern` do TypeBox compila SEM flags — um /i
// perdido rejeitaria uuid maiúsculo com 422.
const UUID_PATTERN = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'

export interface AdminRoutesDeps {
  ambassadors: AmbassadorAdminService
  repo: ReferralRepository
  requireAdminEnabled: boolean
  internalToken?: string
}

/** Resgates no detalhe do embaixador (e-mail COMPLETO — visão admin). */
function toRedemptionView(r: RedemptionRecord, conversion?: ConversionRecord) {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    status: r.status,
    failedReason: r.failedReason,
    lastError: r.lastError,
    attemptCount: r.attemptCount,
    createdAt: r.createdAt.toISOString(),
    completedAt: r.completedAt?.toISOString() ?? null,
    // Jornada do bolsista: ficou só no Desafio (null) ou assinou a Comunidade.
    conversion: conversion
      ? {
          status: conversion.status,
          bonusCents: conversion.bonusCents,
          subscribedAt: conversion.paidAt.toISOString(),
        }
      : null,
  }
}

/** bigint não é JSON — `amountCents` viaja como string (mesma régua do payments). */
function toConversionView(c: ConversionListItem) {
  return {
    id: c.id,
    status: c.status,
    offerSlug: c.offerSlug,
    amountCents: c.amountCents.toString(),
    bonusCents: c.bonusCents,
    subscribedAt: c.paidAt.toISOString(),
    maturesAt: c.maturesAt.toISOString(),
    eligibleAt: c.eligibleAt?.toISOString() ?? null,
    paidMarkedAt: c.paidMarkedAt?.toISOString() ?? null,
    paidMarkedBy: c.paidMarkedBy,
    note: c.note,
    ambassadorName: c.ambassadorName,
    ambassadorEmail: c.ambassadorEmail,
    ambassadorPixKey: c.ambassadorPixKey,
    redemptionName: c.redemptionName,
    redemptionEmail: c.redemptionEmail,
  }
}

/**
 * Rotas admin (`/referrals/admin/*`) — o RBAC real é do gateway (JWT + roles:
 * leitura staff+, escrita admin+); aqui `requireAdmin` (X-Auth-User-*) +
 * `x-internal-token` (prova de origem), espelhando fiscal/members.
 */
export function adminRoutes(deps: AdminRoutesDeps) {
  const guard = (headers: Record<string, string | undefined>, write = false) => {
    assertInternalCaller(headers['x-internal-token'], deps.internalToken)
    requireAdmin(headers, deps.requireAdminEnabled, { write })
  }

  return (
    new Elysia({ prefix: '/referrals/admin' })
      // Auth ANTES da validação de schema (transform roda antes do validate) —
      // corpo malformado de chamador sem token não pode vazar a forma da rota.
      .onTransform(({ headers, request }) => {
        const method = request.method.toUpperCase()
        // Fail-closed: tudo que não é leitura exige role de ESCRITA — um verbo
        // novo (PUT/DELETE) nasce protegido em vez de cair na régua de leitura.
        guard(headers, method !== 'GET' && method !== 'HEAD')
      })
      .post(
        '/ambassadors',
        async ({ body, headers, set }) => {
          guard(headers, true)
          const result = await deps.ambassadors.create({ name: body.name, email: body.email })
          if (result.kind !== 'created') {
            // `account_exists` é inalcançável sem accountUserId (a UNIQUE
            // parcial ignora NULL) — tratado junto por exaustão do union.
            set.status = 409
            return envelope('AMBASSADOR_EMAIL_EXISTS', 'Já existe embaixador com esse e-mail')
          }
          set.status = 201
          return { ambassador: result.ambassador, emailSent: result.emailSent }
        },
        {
          body: t.Object({
            name: t.String({ minLength: 2, maxLength: 120 }),
            email: t.String({ pattern: EMAIL_PATTERN, maxLength: 254 }),
          }),
        },
      )
      .get(
        '/ambassadors',
        async ({ query, headers }) => {
          guard(headers)
          const { items, total } = await deps.ambassadors.list({
            q: query.q,
            limit: Math.min(query.limit ?? 25, 100),
            offset: query.offset ?? 0,
          })
          return {
            items: items.map((i) => ({
              ...i,
              linkEmailSentAt: i.linkEmailSentAt?.toISOString() ?? null,
              createdAt: i.createdAt.toISOString(),
            })),
            total,
          }
        },
        {
          query: t.Object({
            q: t.Optional(t.String({ maxLength: 200 })),
            limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
            offset: t.Optional(t.Numeric({ minimum: 0 })),
          }),
        },
      )
      .get(
        '/ambassadors/:id',
        async ({ params, headers, set }) => {
          guard(headers)
          const detail = await deps.ambassadors.detail(params.id)
          if (!detail) {
            set.status = 404
            return envelope('AMBASSADOR_NOT_FOUND', 'Embaixador não encontrado')
          }
          return {
            ambassador: detail.ambassador,
            redemptions: detail.redemptions.map((r) =>
              toRedemptionView(r, detail.conversionByRedemption.get(r.id)),
            ),
          }
        },
        { params: t.Object({ id: t.String({ pattern: UUID_PATTERN }) }) },
      )
      // ── Bônus (conversões bolsista → assinatura; Pix MANUAL controlado aqui) ──
      .get(
        '/conversions',
        async ({ query, headers }) => {
          guard(headers)
          const { items, total } = await deps.repo.listConversions({
            status: query.status,
            limit: Math.min(query.limit ?? 25, 100),
            offset: query.offset ?? 0,
          })
          return { items: items.map(toConversionView), total }
        },
        {
          query: t.Object({
            status: t.Optional(t.Union(CONVERSION_STATUSES.map((s) => t.Literal(s)))),
            limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
            offset: t.Optional(t.Numeric({ minimum: 0 })),
          }),
        },
      )
      .post(
        '/conversions/:id/mark-paid',
        async ({ params, body, headers, set }) => {
          guard(headers, true)
          const by =
            decodeIdentityHeader(headers['x-auth-user-name']) ??
            headers['x-auth-user-id'] ??
            'admin'
          const marked = await deps.repo.markConversionPaid(
            params.id,
            by.slice(0, 120),
            body.note?.trim() || null,
          )
          if (!marked) {
            // Só `eligible` vira `paid` — repetição/estado errado aflora como 409.
            set.status = 409
            return envelope('CONVERSION_NOT_ELIGIBLE', 'Este bônus não está aguardando pagamento')
          }
          return { ok: true }
        },
        {
          params: t.Object({ id: t.String({ pattern: UUID_PATTERN }) }),
          body: t.Object({ note: t.Optional(t.String({ maxLength: 500 })) }),
        },
      )
      .post(
        // Ferramenta de STAGING/e2e: antecipa a garantia de uma conversão pending
        // (o sweep promove e dispara o e-mail no próximo ciclo/execução).
        '/conversions/:id/mature-now',
        async ({ params, headers, set }) => {
          guard(headers, true)
          const ok = await deps.repo.setConversionMaturesNow(params.id)
          if (!ok) {
            set.status = 409
            return envelope('CONVERSION_NOT_PENDING', 'Só conversões pendentes podem antecipar')
          }
          return { ok: true }
        },
        { params: t.Object({ id: t.String({ pattern: UUID_PATTERN }) }) },
      )
      .post(
        '/ambassadors/:id/resend-link',
        async ({ params, headers, set }) => {
          guard(headers, true)
          const result = await deps.ambassadors.resendLink(params.id)
          if (!result) {
            set.status = 404
            return envelope('AMBASSADOR_NOT_FOUND', 'Embaixador não encontrado')
          }
          return { sent: result.kind === 'sent' }
        },
        { params: t.Object({ id: t.String({ pattern: UUID_PATTERN }) }) },
      )
      .patch(
        '/ambassadors/:id',
        async ({ params, body, headers, set }) => {
          guard(headers, true)
          const updated = await deps.ambassadors.patch(params.id, {
            status: body.status,
            rotateToken: body.rotateToken,
          })
          if (!updated) {
            set.status = 404
            return envelope('AMBASSADOR_NOT_FOUND', 'Embaixador não encontrado')
          }
          return { ambassador: updated }
        },
        {
          params: t.Object({ id: t.String({ pattern: UUID_PATTERN }) }),
          body: t.Object({
            status: t.Optional(t.Union([t.Literal('active'), t.Literal('disabled')])),
            rotateToken: t.Optional(t.Boolean()),
          }),
        },
      )
  )
}
