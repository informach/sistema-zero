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
    const rows = await this.db
      .select({
        id: entitlements.id,
        userId: entitlements.userId,
        expiresAt: entitlements.expiresAt,
        offerSlug: sql<string | null>`${entitlements.snapshot} ->> 'offerSlug'`,
        productName: sql<string | null>`${entitlements.snapshot} ->> 'name'`,
      })
      .from(entitlements)
      .leftJoin(
        renewalRemindersSent,
        and(
          eq(renewalRemindersSent.entitlementId, entitlements.id),
          // Mesma derivação do `expiresOnKey` (data UTC do vencimento).
          eq(
            renewalRemindersSent.expiresOn,
            sql`(${entitlements.expiresAt} at time zone 'UTC')::date`,
          ),
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
      )
      .orderBy(asc(entitlements.expiresAt))
      .limit(limit)

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
