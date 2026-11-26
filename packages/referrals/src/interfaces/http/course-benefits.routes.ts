import { envelope } from '@sistemazero/core/http'
import { Elysia, t } from 'elysia'
import type { AcquisitionReportsService } from '../../application/acquisitions/acquisition-reports.service'
import type { CourseBenefitAdminService } from '../../application/course-benefits/course-benefit-admin.service'
import { assertInternalCaller, requireAdmin } from './auth'

const audience = t.Union([t.Literal('kids'), t.Literal('adult')])
export function courseBenefitsRoutes(deps: {
  benefits: CourseBenefitAdminService
  reports: AcquisitionReportsService
  internalToken?: string
  requireAdminEnabled: boolean
}) {
  return new Elysia({ prefix: '/referrals/admin/course-benefits' })
    .onTransform(({ headers }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      requireAdmin(headers, deps.requireAdminEnabled, { write: true })
    })
    .get(
      '',
      async ({ query }) => ({
        items: await deps.reports.courseBenefits(query.audience, query.courseSlug),
      }),
      {
        query: t.Object({ audience, courseSlug: t.Optional(t.String({ maxLength: 140 })) }),
      },
    )
    .get(
      '/:id/results',
      async ({ params, query, set }) => {
        const from = query.from ? new Date(query.from) : undefined
        const to = query.to ? new Date(query.to) : undefined
        if (from && to && from >= to) {
          set.status = 400
          return envelope('INVALID_PERIOD', 'Escolha um período válido.')
        }
        const result = await deps.reports.courseBenefitDetail(
          params.id,
          query.audience,
          query.offset,
          from,
          to,
        )
        if (!result) {
          set.status = 404
          return envelope('NOT_FOUND', 'Benefício não encontrado.')
        }
        return result
      },
      {
        params: t.Object({ id: t.String({ format: 'uuid' }) }),
        query: t.Object({
          audience,
          offset: t.Optional(t.Numeric({ minimum: 0 })),
          from: t.Optional(t.String({ format: 'date-time' })),
          to: t.Optional(t.String({ format: 'date-time' })),
        }),
      },
    )
    .post(
      '/convert-campaign',
      async ({ body }) => {
        const benefit = await deps.benefits.convert(body)
        return { benefit: { ...benefit, createdAt: benefit.createdAt.toISOString() } }
      },
      {
        body: t.Object({
          campaignId: t.String({ format: 'uuid' }),
          audience,
          courseSlug: t.String({ minLength: 1, maxLength: 140 }),
          name: t.String({ minLength: 1, maxLength: 160 }),
        }),
      },
    )
}
