/**
 * Liga as campanhas antigas, sem oferta de presente, à oferta Cadê padrão do MESMO público
 * (15/11/2026). Modos: `plan` (padrão, só relata) e `apply` (grava). Idempotente: só toca
 * campanhas com `gift_offer_id` nulo, e a escrita confere de novo o nulo. O relatório JSON
 * traz só ids, público e estado das campanhas (nenhum dado pessoal).
 *
 *   bun run gifts:backfill-offer           # plan
 *   bun run gifts:backfill-offer apply     # grava
 */
import type { GiftAudience } from '@sistemazero/core/referrals'
import { and, eq, isNull } from 'drizzle-orm'
import { DEFAULT_GIFT_OFFER_SLUGS, giftOfferProblem } from '../src/domain/gift-policy'
import { loadEnv } from '../src/infrastructure/config/env'
import { GiftOfferCatalogHttpClient } from '../src/infrastructure/gateways/gift-offer-catalog.client'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { campaignHistory, campaigns } from '../src/infrastructure/persistence/drizzle/schema'

const ACTOR = 'Sistema (backfill da oferta do presente)'

const args = process.argv.slice(2)
if (args.includes('--help')) {
  console.log('bun run gifts:backfill-offer [plan|apply]: padrão plan, só relata e não grava.')
} else {
  const mode = args[0] ?? 'plan'
  if (args.length > 1 || (mode !== 'plan' && mode !== 'apply'))
    throw new Error('Modo desconhecido. Use plan (padrão) ou apply.')
  const env = loadEnv()
  const catalog = new GiftOfferCatalogHttpClient({
    baseUrl: env.CATALOG_BASE_URL,
    internalToken: env.CATALOG_INTERNAL_TOKEN,
    timeoutMs: env.S2S_TIMEOUT_MS,
  })

  // A oferta padrão de cada público precisa resolver e servir como presente daquele público.
  const offers = {} as Record<GiftAudience, { slug: string; offerId: string }>
  for (const audience of ['kids', 'adult'] as const) {
    const slug = DEFAULT_GIFT_OFFER_SLUGS[audience]
    const offer = await catalog.resolve(slug)
    if (!offer) throw new Error(`Oferta padrão não encontrada no Catálogo: ${slug}`)
    const problem = giftOfferProblem(offer, audience)
    if (problem) throw new Error(`Oferta padrão ${slug} não serve como presente: ${problem}`)
    offers[audience] = { slug, offerId: offer.offerId }
  }

  const connection = createDbConnection(env.DATABASE_URL, { max: 1 })
  try {
    const rows = await connection.db
      .select({ id: campaigns.id, audience: campaigns.audience, status: campaigns.status })
      .from(campaigns)
      .where(isNull(campaigns.giftOfferId))
    const report = {
      mode,
      offers,
      campaigns: [] as {
        campaignId: string
        audience: GiftAudience
        status: string
        offerId: string
        updated: boolean
      }[],
    }
    for (const row of rows) {
      const offerId = offers[row.audience].offerId
      let updated = false
      if (mode === 'apply') {
        updated = await connection.db.transaction(async (tx) => {
          const changed = await tx
            .update(campaigns)
            .set({ giftOfferId: offerId })
            .where(and(eq(campaigns.id, row.id), isNull(campaigns.giftOfferId)))
            .returning({ id: campaigns.id })
          if (changed.length !== 1) return false
          // Trilha no histórico da campanha (o `updated_at` fica: nenhuma edição aberta no
          // painel perde o controle de concorrência por causa do backfill).
          await tx.insert(campaignHistory).values({
            campaignId: row.id,
            actor: ACTOR,
            action: 'updated',
            changes: { giftOfferId: offerId },
          })
          return true
        })
      }
      report.campaigns.push({
        campaignId: row.id,
        audience: row.audience,
        status: row.status,
        offerId,
        updated,
      })
    }
    console.log(
      JSON.stringify(
        {
          ...report,
          total: report.campaigns.length,
          updated: report.campaigns.filter((item) => item.updated).length,
        },
        null,
        2,
      ),
    )
  } finally {
    await connection.close()
  }
}
