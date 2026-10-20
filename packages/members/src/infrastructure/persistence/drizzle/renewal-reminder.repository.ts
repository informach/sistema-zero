import { and, asc, eq, gte, isNull, lte, sql } from 'drizzle-orm'
import {
  type AccessEndedKind,
  type AccessEndedMessagesRepository,
  COMMUNITY_SUBSCRIPTION_OFFER_SLUGS,
  type EndedSubscriptionEntitlement,
  type ExpiringTermEntitlement,
  type FixedAccessLifecycleEntitlement,
  type FixedAccessLifecycleKind,
  type GiftLifecycleEntitlement,
  type GiftLifecycleKind,
  type RenewalReminderRepository,
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
export class DrizzleRenewalReminderRepository
  implements RenewalReminderRepository, AccessEndedMessagesRepository
{
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
            // Somente o Desafio fixed/days possui a cadência própria abaixo.
            // Outros produtos por dias continuam no lembrete genérico.
            sql`not coalesce((
              ${entitlements.snapshot} -> 'accessPolicy' ->> 'mode' = 'fixed'
              and ${entitlements.snapshot} -> 'accessPolicy' ->> 'durationUnit' = 'days'
              and ${entitlements.snapshot} ->> 'offerSlug' like 'desafio-primeiro-jogo%'
            ), false)`,
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
                 or stronger.expires_at > ${entitlements.expiresAt}
                 or (
                   stronger.expires_at = ${entitlements.expiresAt}
                   and (
                     stronger.source_kind = 'subscription'
                     or stronger.access_type = 'all_kids_courses'
                     or stronger.id < ${entitlements.id}
                   )
                 )
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

  async listGiftLifecycleEntitlements(
    now: Date,
    windowMs: number,
    limit: number,
  ): Promise<GiftLifecycleEntitlement[]> {
    const nowIso = now.toISOString()
    const sinceIso = new Date(now.getTime() - windowMs).toISOString()
    // O limite conta PRESENTES (conta + resgate + vencimento): o curso e o Mural temporário do
    // mesmo resgate saem juntos no mesmo ciclo, um e-mail só.
    const rows = await this.db.execute(sql`
      with eligible as (
        select e.id, e.user_id, e.source_id, e.expires_at,
          case when e.expires_at <= ${nowIso}::timestamptz then 'gift_expired' else 'gift_expiry_2d' end
            as message_kind
          from members.entitlements e
         where e.source_kind = 'manual'
           and e.source_id like 'scholarship:%'
           and e.expires_at is not null
           and e.status::text in ('active', 'expired')
           and (
             -- No dia: venceu há pouco (a janela impede avisar presentes antigos no deploy).
             (e.expires_at <= ${nowIso}::timestamptz and e.expires_at > ${sinceIso}::timestamptz)
             -- Dois dias antes, no calendário de São Paulo, só com o presente ainda ativo.
             or (
               e.status::text = 'active'
               and e.expires_at > ${nowIso}::timestamptz
               and (e.expires_at at time zone 'America/Sao_Paulo')::date
                 - (${nowIso}::timestamptz at time zone 'America/Sao_Paulo')::date <= 2
             )
           )
           and not exists (
             select 1 from members.entitlement_lifecycle_messages_sent sent
              where sent.entitlement_id = e.id
                and sent.expires_on = (e.expires_at at time zone 'UTC')::date
                and sent.message_kind =
                  case when e.expires_at <= ${nowIso}::timestamptz then 'gift_expired' else 'gift_expiry_2d' end
           )
           -- Acesso mais forte e duradouro (assinatura, chave-mestra Kids ou o mesmo curso por
           -- outra via) torna o fim do presente irrelevante. Mesma régua do Desafio.
           and not exists (
             select 1 from members.entitlements stronger
              where stronger.user_id = e.user_id
                and stronger.source_id <> e.source_id
                and stronger.status = 'active'
                and (stronger.expires_at is null or stronger.expires_at > ${nowIso}::timestamptz)
                and (stronger.expires_at is null or stronger.expires_at > e.expires_at)
                and (
                  stronger.access_type = 'all_kids_courses'
                  or stronger.snapshot ->> 'offerSlug' in (
                    ${sql.join(
                      COMMUNITY_SUBSCRIPTION_OFFER_SLUGS.kids.map((slug) => sql`${slug}`),
                      sql`, `,
                    )}
                  )
                  or stronger.course_ref in (
                    select gift.course_ref from members.entitlements gift
                     where gift.user_id = e.user_id and gift.source_id = e.source_id
                       and gift.expires_at is not null
                  )
                )
           )
      ), groups as (
        select user_id, source_id, expires_at, message_kind from eligible
         group by user_id, source_id, expires_at, message_kind
         order by expires_at, user_id, source_id
         limit ${limit}
      )
      select eligible.* from eligible
        join groups using (user_id, source_id, expires_at, message_kind)
       order by eligible.expires_at, eligible.id
    `)
    return rows.flatMap((row) => {
      const kind = row.message_kind
      if (kind !== 'gift_expired' && kind !== 'gift_expiry_2d') return []
      return [
        {
          id: String(row.id),
          userId: String(row.user_id),
          sourceId: String(row.source_id),
          expiresAt: new Date(row.expires_at as string),
          messageKind: kind as GiftLifecycleKind,
        },
      ]
    })
  }

  async listEndedCommunitySubscriptions(
    now: Date,
    windowMs: number,
    limit: number,
  ): Promise<EndedSubscriptionEntitlement[]> {
    const nowIso = now.toISOString()
    const sinceIso = new Date(now.getTime() - windowMs).toISOString()
    const list = (slugs: readonly string[]) =>
      sql.join(
        slugs.map((slug) => sql`${slug}`),
        sql`, `,
      )
    const kids = list(COMMUNITY_SUBSCRIPTION_OFFER_SLUGS.kids)
    const adult = list(COMMUNITY_SUBSCRIPTION_OFFER_SLUGS.adult)
    const rows = await this.db.execute(sql`
      with candidates as (
        select e.id, e.user_id, e.subscription_id,
          coalesce(e.expires_at, e.updated_at) as ended_at,
          case when e.snapshot ->> 'offerSlug' in (${adult}) then 'adult' else 'kids' end as audience
          from members.entitlements e
         where e.subscription_id is not null
           and e.status::text = 'expired'
           -- Só o que venceu agora: nada de avisar vencimentos antigos quando o job estreia.
           and e.updated_at > ${sinceIso}::timestamptz
           and e.updated_at <= ${nowIso}::timestamptz
           and e.snapshot ->> 'offerSlug' in (${kids}, ${adult})
      ), eligible as (
        select c.* from candidates c
         where not exists (
             select 1 from members.entitlement_lifecycle_messages_sent sent
              where sent.entitlement_id = c.id
                and sent.expires_on = (c.ended_at at time zone 'UTC')::date
                and sent.message_kind = 'subscription_ended'
           )
           -- Outro acesso ativo à Comunidade da mesma audiência (outra assinatura, a renovação
           -- ou a chave-mestra) significa que o acesso não terminou.
           and not exists (
             select 1 from members.entitlements other
              where other.user_id = c.user_id
                and other.status = 'active'
                and (other.expires_at is null or other.expires_at > ${nowIso}::timestamptz)
                and (
                  (c.audience = 'kids' and (
                    other.snapshot ->> 'offerSlug' in (${kids}) or other.access_type = 'all_kids_courses'))
                  or (c.audience = 'adult' and (
                    other.snapshot ->> 'offerSlug' in (${adult}) or other.access_type = 'all_courses'))
                )
           )
      ), groups as (
        select user_id, subscription_id, audience from eligible
         group by user_id, subscription_id, audience
         order by min(ended_at), user_id, subscription_id
         limit ${limit}
      )
      select eligible.* from eligible
        join groups using (user_id, subscription_id, audience)
       order by eligible.ended_at, eligible.id
    `)
    return rows.map((row) => ({
      id: String(row.id),
      userId: String(row.user_id),
      subscriptionId: String(row.subscription_id),
      audience: row.audience === 'adult' ? ('adult' as const) : ('kids' as const),
      endedAt: new Date(row.ended_at as string),
    }))
  }

  async markAccessEndedMessageSent(
    entitlementId: string,
    expiresOn: string,
    messageKind: AccessEndedKind,
    now: Date,
  ): Promise<void> {
    await this.db
      .insert(entitlementLifecycleMessagesSent)
      .values({ entitlementId, expiresOn, messageKind, sentAt: now })
      .onConflictDoNothing()
  }
}
