import type {
  AmbassadorOfferItem,
  AmbassadorOfferKind,
  AmbassadorOfferView,
  GiftAudience,
} from '@sistemazero/core/referrals'
import { and, asc, eq, sql } from 'drizzle-orm'
import type { AmbassadorOfferRepository } from '../../../domain/ports/ambassador-offer-repository.port'
import type { Database } from './db'
import { ambassadorOffers } from './schema'

/** Classe do advisory lock de duas chaves das listas (distinta da vaga de conversão). */
const AMBASSADOR_OFFERS_LOCK_CLASS = 742918463

function view(row: typeof ambassadorOffers.$inferSelect): AmbassadorOfferView {
  return {
    offerId: row.offerId,
    enabled: row.enabled,
    audience: row.audience,
    kind: row.kind,
    position: row.position,
    updatedAt: row.updatedAt.toISOString(),
  }
}

export class DrizzleAmbassadorOfferRepository implements AmbassadorOfferRepository {
  constructor(private readonly db: Database) {}

  async list(audience: GiftAudience, kind?: AmbassadorOfferKind): Promise<AmbassadorOfferView[]> {
    const rows = await this.db
      .select()
      .from(ambassadorOffers)
      .where(
        and(
          eq(ambassadorOffers.audience, audience),
          kind ? eq(ambassadorOffers.kind, kind) : undefined,
        ),
      )
      .orderBy(asc(ambassadorOffers.kind), asc(ambassadorOffers.position))
    return rows.map(view)
  }

  async replace(
    audience: GiftAudience,
    kind: AmbassadorOfferKind,
    items: AmbassadorOfferItem[],
  ): Promise<AmbassadorOfferView[]> {
    await this.db.transaction(async (tx) => {
      // Dois saves simultâneos da mesma lista: um espera o outro (sem UNIQUE estourado).
      await tx.execute(
        sql`select pg_advisory_xact_lock(${AMBASSADOR_OFFERS_LOCK_CLASS}::int, hashtext(${`${audience}|${kind}`}))`,
      )
      await tx
        .delete(ambassadorOffers)
        .where(and(eq(ambassadorOffers.audience, audience), eq(ambassadorOffers.kind, kind)))
      if (items.length > 0)
        await tx.insert(ambassadorOffers).values(
          items.map((item, position) => ({
            audience,
            kind,
            offerId: item.offerId,
            enabled: item.enabled,
            position,
          })),
        )
    })
    return this.list(audience, kind)
  }
}
