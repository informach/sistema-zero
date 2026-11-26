import type { AmbassadorOfferCounts, GiftAudience } from '@sistemazero/core/referrals'
import { Elysia, t } from 'elysia'
import type { AmbassadorOffersService } from '../../application/ambassador-offers/ambassador-offers.service'
import { MAX_AMBASSADOR_OFFERS } from '../../domain/ambassador-offers'
import { assertInternalCaller, requireAdmin } from './auth'

const AUDIENCE = t.Union([t.Literal('kids'), t.Literal('adult')])
const KIND = t.Union([t.Literal('gift'), t.Literal('referral')])

/**
 * As listas de ofertas dos embaixadores (Admin › Campanhas › Ofertas dos embaixadores). Leitura
 * staff+, escrita admin+ (mesma régua das campanhas).
 */
export function ambassadorOffersRoutes(deps: {
  offers: AmbassadorOffersService
  /** Quanto cada oferta rendeu pelos embaixadores (contagens, sem valores). */
  counts?: (audience: GiftAudience) => Promise<Record<string, AmbassadorOfferCounts>>
  requireAdminEnabled: boolean
  internalToken?: string
}) {
  return new Elysia({ prefix: '/referrals/admin/ambassador-offers' })
    .onTransform(({ headers, request }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      requireAdmin(headers, deps.requireAdminEnabled, {
        write: request.method !== 'GET' && request.method !== 'HEAD',
      })
    })
    .get(
      '',
      async ({ query }) => ({
        ...(await deps.offers.list(query.audience)),
        ...(deps.counts ? { counts: await deps.counts(query.audience) } : {}),
      }),
      {
        query: t.Object({ audience: AUDIENCE }),
      },
    )
    .put(
      '',
      async ({ body }) => ({
        items: await deps.offers.replace(body),
      }),
      {
        body: t.Object({
          audience: AUDIENCE,
          kind: KIND,
          items: t.Array(
            t.Object({ offerId: t.String({ format: 'uuid' }), enabled: t.Boolean() }),
            { maxItems: MAX_AMBASSADOR_OFFERS },
          ),
        }),
      },
    )
}
