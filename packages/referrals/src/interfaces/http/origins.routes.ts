import { envelope } from '@sistemazero/core/http'
import { Elysia, t } from 'elysia'
import type { AcquisitionReportsService } from '../../application/acquisitions/acquisition-reports.service'
import { EMAIL_PATTERN } from '../../domain/codes'
import { assertInternalCaller, requireAdmin } from './auth'

const AUDIENCE = t.Union([t.Literal('kids'), t.Literal('adult')])
const DAY_MS = 86_400_000
/** O relatório olha no máximo um ano (o painel é de acompanhamento, não de arquivo). */
const MAX_PERIOD_DAYS = 366

/**
 * Leituras de origem do Admin (25/11/2026), admin+ (no gateway, rotas literais admin+): a página "Origem das vendas", as aquisições
 * de uma conta e o detalhe de resultado de campanha e de embaixador (pessoas e vendas).
 * ⚠️ A ficha e o detalhe têm e-mails: só leitura do Admin, nunca do embaixador.
 */
export function originsRoutes(deps: {
  reports: AcquisitionReportsService
  requireAdminEnabled: boolean
  internalToken?: string
  now?: () => Date
}) {
  const now = deps.now ?? (() => new Date())
  return new Elysia({ prefix: '/referrals/admin' })
    .onTransform(({ headers }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      // Leitura admin+ (como a listagem de bônus): e-mails das pessoas e faturamento.
      requireAdmin(headers, deps.requireAdminEnabled, { write: true })
    })
    .get(
      '/origins',
      async ({ query, set }) => {
        const to = query.to ? new Date(query.to) : now()
        const from = query.from ? new Date(query.from) : new Date(to.getTime() - 30 * DAY_MS)
        if (
          !Number.isFinite(from.getTime()) ||
          !Number.isFinite(to.getTime()) ||
          to <= from ||
          to.getTime() - from.getTime() > MAX_PERIOD_DAYS * DAY_MS
        ) {
          set.status = 400
          return envelope('PERIOD_INVALID', 'Escolha um período de até um ano.')
        }
        return deps.reports.originReport({ audience: query.audience, from, to })
      },
      {
        query: t.Object({
          audience: t.Optional(AUDIENCE),
          from: t.Optional(t.String({ format: 'date-time', maxLength: 40 })),
          to: t.Optional(t.String({ format: 'date-time', maxLength: 40 })),
        }),
      },
    )
    .get(
      '/acquisitions',
      async ({ query }) => ({ items: await deps.reports.accountAcquisitions(query.email) }),
      { query: t.Object({ email: t.String({ pattern: EMAIL_PATTERN, maxLength: 254 }) }) },
    )
    .get(
      '/campaigns/:id/results',
      ({ params, query }) =>
        deps.reports.campaignDetail(params.id, query.offset ?? 0, query.audience),
      {
        params: t.Object({ id: t.String({ format: 'uuid' }) }),
        query: t.Object({
          offset: t.Optional(t.Numeric({ minimum: 0, maximum: 100_000 })),
          audience: t.Optional(AUDIENCE),
        }),
      },
    )
    .get(
      '/ambassadors/:id/results',
      ({ params, query }) =>
        deps.reports.ambassadorDetail(params.id, query.offset ?? 0, query.audience),
      {
        params: t.Object({ id: t.String({ format: 'uuid' }) }),
        query: t.Object({
          offset: t.Optional(t.Numeric({ minimum: 0, maximum: 100_000 })),
          audience: t.Optional(AUDIENCE),
        }),
      },
    )
}
