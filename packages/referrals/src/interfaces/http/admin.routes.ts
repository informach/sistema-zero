import { envelope } from '@sistemazero/core/http'
import { Elysia, t } from 'elysia'
import type { AmbassadorAdminService } from '../../application/ambassadors/ambassador-admin.service'
import { EMAIL_PATTERN } from '../../domain/codes'
import type { RedemptionRecord } from '../../domain/ports/referral-repository.port'
import { assertInternalCaller, requireAdmin } from './auth'

// String (não RegExp.source): o `pattern` do TypeBox compila SEM flags — um /i
// perdido rejeitaria uuid maiúsculo com 422.
const UUID_PATTERN = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'

export interface AdminRoutesDeps {
  ambassadors: AmbassadorAdminService
  requireAdminEnabled: boolean
  internalToken?: string
}

/** Resgates no detalhe do embaixador (e-mail COMPLETO — visão admin). */
function toRedemptionView(r: RedemptionRecord) {
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
          if (result.kind === 'email_exists') {
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
            redemptions: detail.redemptions.map(toRedemptionView),
          }
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
