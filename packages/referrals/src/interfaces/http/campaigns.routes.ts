import { envelope } from '@sistemazero/core/http'
import { Elysia, t } from 'elysia'
import type { CampaignAdminService } from '../../application/campaigns/campaign-admin.service'
import { assertInternalCaller, decodeIdentityHeader, requireAdmin } from './auth'

const campaignBody = t.Object({
  name: t.String({ minLength: 2, maxLength: 120 }),
  publicTitle: t.String({ minLength: 2, maxLength: 160 }),
  description: t.String({ maxLength: 600 }),
  context: t.Union([t.Literal('ad'), t.Literal('event'), t.Literal('other')]),
  code: t.String({ minLength: 4, maxLength: 32 }),
  startsAt: t.String({ maxLength: 40 }),
  endsAt: t.String({ maxLength: 40 }),
  status: t.Union([
    t.Literal('draft'),
    t.Literal('active'),
    t.Literal('paused'),
    t.Literal('ended'),
  ]),
  channel: t.String({ maxLength: 100 }),
})
const idParams = t.Object({ id: t.String({ format: 'uuid' }) })
const campaignUpdateBody = t.Object({
  ...campaignBody.properties,
  expectedUpdatedAt: t.String({ format: 'date-time', maxLength: 40 }),
})

export function campaignsRoutes(deps: {
  campaigns: CampaignAdminService
  requireAdminEnabled: boolean
  internalToken?: string
}) {
  const actor = (headers: Record<string, string | undefined>) =>
    `${(decodeIdentityHeader(headers['x-auth-user-name']) ?? 'Admin').slice(0, 100)} (${headers['x-auth-user-id'] ?? 'local'})`
  return new Elysia({ prefix: '/referrals/admin/campaigns' })
    .onTransform(({ headers, request }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      requireAdmin(headers, deps.requireAdminEnabled, {
        write: request.method !== 'GET' && request.method !== 'HEAD',
      })
    })
    .get(
      '',
      ({ query }) =>
        deps.campaigns.list({ q: query.q, limit: query.limit ?? 25, offset: query.offset ?? 0 }),
      {
        query: t.Object({
          q: t.Optional(t.String({ maxLength: 120 })),
          limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
          offset: t.Optional(t.Numeric({ minimum: 0 })),
        }),
      },
    )
    .post(
      '',
      async ({ body, headers, set }) => {
        const campaign = await deps.campaigns.create(body, actor(headers))
        if (!campaign) {
          set.status = 409
          return envelope('CAMPAIGN_CODE_EXISTS', 'Este código já está em uso. Escolha outro.')
        }
        set.status = 201
        return { campaign }
      },
      { body: campaignBody },
    )
    .get(
      '/:id',
      async ({ params, set }) => {
        const detail = await deps.campaigns.detail(params.id)
        if (!detail) {
          set.status = 404
          return envelope('CAMPAIGN_NOT_FOUND', 'Campanha não encontrada.')
        }
        return detail
      },
      { params: idParams },
    )
    .patch(
      '/:id',
      async ({ params, body, headers, set }) => {
        const campaign = await deps.campaigns.update(params.id, body, actor(headers))
        if (!campaign) {
          set.status = 404
          return envelope('CAMPAIGN_NOT_FOUND', 'Campanha não encontrada.')
        }
        return { campaign }
      },
      { params: idParams, body: campaignUpdateBody },
    )
    .post(
      '/:id/duplicate',
      async ({ params, body, headers, set }) => {
        const campaign = await deps.campaigns.create(body, actor(headers), params.id)
        if (!campaign) {
          set.status = 409
          return envelope('CAMPAIGN_CODE_EXISTS', 'Este código já está em uso. Escolha outro.')
        }
        set.status = 201
        return { campaign }
      },
      { params: idParams, body: campaignBody },
    )
}
