import { and, asc, eq, gte, isNull, lte, sql } from 'drizzle-orm'
import type {
  ExpiringTermEntitlement,
  RenewalReminderRepository,
} from '../../../domain/ports/renewal-reminder-repository.port'
import type { Database } from './db'
import { entitlements, renewalRemindersSent } from './schema'

/**
 * Repositório do lembrete de renovação (Drizzle/Postgres). O filtro "ainda sem
 * lembrete p/ ESTE vencimento" é resolvido no SQL (anti-join com a data do
 * vencimento derivada da própria linha) — um EXTEND que mova a validade torna a
 * matrícula elegível de novo, por design.
 */
export class DrizzleRenewalReminderRepository implements RenewalReminderRepository {
  constructor(private readonly db: Database) {}

  async listExpiringTermEntitlements(
    from: Date,
    to: Date,
    limit: number,
  ): Promise<ExpiringTermEntitlement[]> {
    const expiresOnExpression = sql<string>`(${entitlements.expiresAt} at time zone 'UTC')::date`
    const expiresOn = expiresOnExpression.as('expires_on')
    const offerSlug = sql<string | null>`${entitlements.snapshot} ->> 'offerSlug'`.as('offer_slug')
    const productName = sql<string | null>`${entitlements.snapshot} ->> 'name'`.as('product_name')
    // O limite é de COMPRAS (usuário + oferta + data), não de matrículas. Uma
    // oferta pode conceder mais matrículas que o tamanho do lote; selecionar
    // linhas diretamente dividiria a compra entre ciclos e enviaria dois e-mails.
    const eligible = this.db.$with('eligible_renewal_entitlements').as(
      this.db
        .select({
          id: entitlements.id,
          userId: entitlements.userId,
          expiresAt: entitlements.expiresAt,
          expiresOn,
          offerSlug,
          productName,
        })
        .from(entitlements)
        .leftJoin(
          renewalRemindersSent,
          and(
            eq(renewalRemindersSent.entitlementId, entitlements.id),
            // Mesma derivação do `expiresOnKey` (data UTC do vencimento).
            eq(renewalRemindersSent.expiresOn, expiresOnExpression),
          ),
        )
        .where(
          and(
            eq(entitlements.status, 'active'),
            eq(entitlements.sourceKind, 'payment'),
            isNull(entitlements.subscriptionId),
            gte(entitlements.expiresAt, from),
            lte(entitlements.expiresAt, to),
            isNull(renewalRemindersSent.entitlementId),
          ),
        ),
    )
    // Referências qualificadas aos aliases do CTE. Drizzle preserva aliases de
    // expressões SQL como nomes simples, que ficam ambíguos ao juntar os CTEs.
    const eligibleExpiresOn = sql<string>`"eligible_renewal_entitlements"."expires_on"`
    const eligibleOfferSlug = sql<string | null>`"eligible_renewal_entitlements"."offer_slug"`
    const eligibleProductName = sql<string | null>`"eligible_renewal_entitlements"."product_name"`
    const selectedGroups = this.db.$with('selected_renewal_groups').as(
      this.db
        .select({
          userId: eligible.userId,
          offerSlug: eligibleOfferSlug.as('offer_slug'),
          expiresOn: eligibleExpiresOn.as('expires_on'),
        })
        .from(eligible)
        .groupBy(eligible.userId, eligibleOfferSlug, eligibleExpiresOn)
        .orderBy(
          asc(sql`min("eligible_renewal_entitlements"."expires_at")`),
          asc(eligible.userId),
          asc(eligibleOfferSlug),
        )
        .limit(limit),
    )
    const rows = await this.db
      .with(eligible, selectedGroups)
      .select({
        id: eligible.id,
        userId: eligible.userId,
        expiresAt: eligible.expiresAt,
        offerSlug: eligibleOfferSlug,
        productName: eligibleProductName,
      })
      .from(eligible)
      .innerJoin(
        selectedGroups,
        and(
          eq(selectedGroups.userId, eligible.userId),
          sql`"selected_renewal_groups"."expires_on" = "eligible_renewal_entitlements"."expires_on"`,
          // `offerSlug` pode ser null; `=` não casa dois nulls no Postgres.
          sql`"selected_renewal_groups"."offer_slug" is not distinct from "eligible_renewal_entitlements"."offer_slug"`,
        ),
      )
      .orderBy(asc(eligible.expiresAt), asc(eligible.id))

    return rows
      .filter((r): r is typeof r & { expiresAt: Date } => r.expiresAt != null)
      .map((r) => ({
        id: r.id,
        userId: r.userId,
        expiresAt: r.expiresAt,
        offerSlug: r.offerSlug,
        productName: r.productName,
      }))
  }

  async markReminded(entitlementId: string, expiresOn: string, now: Date): Promise<void> {
    await this.db
      .insert(renewalRemindersSent)
      .values({ entitlementId, expiresOn, sentAt: now })
      .onConflictDoNothing()
  }
}
