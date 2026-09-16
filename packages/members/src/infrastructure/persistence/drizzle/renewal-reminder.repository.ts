import { and, asc, eq, gte, isNull, lte, sql } from 'drizzle-orm'
import type {
  ExpiringTermEntitlement,
  FixedAccessLifecycleEntitlement,
  FixedAccessLifecycleKind,
  RenewalReminderRepository,
} from '../../../domain/ports/renewal-reminder-repository.port'
import type { Database } from './db'
import { entitlementLifecycleMessagesSent, entitlements, renewalRemindersSent } from './schema'

const CHALLENGE_COURSE_REF = 'desafio-primeiro-jogo'

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
            // O lembrete genérico é só do prazo anual/mensal. `fixed/days`
            // possui a cadência própria do Desafio abaixo.
            sql`coalesce(${entitlements.snapshot} -> 'accessPolicy' ->> 'durationUnit', 'months') <> 'days'`,
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

  async listFixedAccessLifecycleEntitlements(
    now: Date,
    limit: number,
  ): Promise<FixedAccessLifecycleEntitlement[]> {
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 86_400_000)
    const expiresOnExpression = sql<string>`(${entitlements.expiresAt} at time zone 'UTC')::date`
    const messageKindExpression = sql<FixedAccessLifecycleKind>`case
      when ${entitlements.expiresAt} <= ${now.toISOString()}::timestamptz then 'expired'
      when ${entitlements.expiresAt} <= ${new Date(now.getTime() + 3 * 86_400_000).toISOString()}::timestamptz then 'expiry_3d'
      else 'expiry_7d'
    end`
    const offerSlug = sql<string | null>`${entitlements.snapshot} ->> 'offerSlug'`.as('offer_slug')
    const productName = sql<string | null>`${entitlements.snapshot} ->> 'name'`.as('product_name')

    const rows = await this.db
      .select({
        id: entitlements.id,
        userId: entitlements.userId,
        expiresAt: entitlements.expiresAt,
        offerSlug,
        productName,
        courseRef: entitlements.courseRef,
        messageKind: messageKindExpression.as('message_kind'),
      })
      .from(entitlements)
      .where(
        and(
          sql`${entitlements.status}::text in ('active', 'expired')`,
          eq(entitlements.sourceKind, 'payment'),
          isNull(entitlements.subscriptionId),
          eq(entitlements.accessType, 'course'),
          eq(entitlements.courseRef, CHALLENGE_COURSE_REF),
          sql`${entitlements.snapshot} -> 'accessPolicy' ->> 'mode' = 'fixed'`,
          sql`${entitlements.snapshot} -> 'accessPolicy' ->> 'durationUnit' = 'days'`,
          lte(entitlements.expiresAt, sevenDaysFromNow),
          // Só a mensagem da faixa ATUAL participa do anti-join. Quem entrou
          // direto na faixa de 3 dias não recebe o aviso atrasado de 7 dias.
          sql`not exists (
            select 1
              from members.entitlement_lifecycle_messages_sent sent
             where sent.entitlement_id = ${entitlements.id}
               and sent.expires_on = ${expiresOnExpression}
               and sent.message_kind = ${messageKindExpression}
          )`,
          // Outra matrícula ativa que cobre o mesmo curso e termina depois (ou
          // nunca termina) torna este prazo irrelevante para o comprador.
          sql`not exists (
            select 1
              from members.entitlements stronger
             where stronger.id <> ${entitlements.id}
               and stronger.user_id = ${entitlements.userId}
               and stronger.status = 'active'
               and (stronger.expires_at is null or stronger.expires_at > ${now.toISOString()}::timestamptz)
               and (
                 (stronger.access_type = 'course' and stronger.course_ref = ${entitlements.courseRef})
                 or stronger.access_type = 'all_kids_courses'
               )
               and (
                 stronger.expires_at is null
                 or stronger.expires_at >= ${entitlements.expiresAt}
               )
          )`,
        ),
      )
      .orderBy(asc(entitlements.expiresAt), asc(entitlements.id))
      .limit(limit)

    return rows
      .filter(
        (
          row,
        ): row is typeof row & {
          expiresAt: Date
          courseRef: string
          messageKind: FixedAccessLifecycleKind
        } =>
          row.expiresAt != null &&
          row.courseRef != null &&
          (row.messageKind === 'expiry_7d' ||
            row.messageKind === 'expiry_3d' ||
            row.messageKind === 'expired'),
      )
      .map((row) => ({
        id: row.id,
        userId: row.userId,
        expiresAt: row.expiresAt,
        offerSlug: row.offerSlug,
        productName: row.productName,
        courseRef: row.courseRef,
        messageKind: row.messageKind,
      }))
  }

  async markLifecycleMessageSent(
    entitlementId: string,
    expiresOn: string,
    messageKind: FixedAccessLifecycleKind,
    now: Date,
  ): Promise<void> {
    await this.db
      .insert(entitlementLifecycleMessagesSent)
      .values({ entitlementId, expiresOn, messageKind, sentAt: now })
      .onConflictDoNothing()
  }
}
