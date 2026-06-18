import { and, asc, desc, eq, gt, isNull, ne, notInArray, or, type SQL, sql } from 'drizzle-orm'
import { EntitlementAggregate } from '../../../domain/entitlement/entitlement.aggregate'
import type { AccessType } from '../../../domain/entitlement/fulfillment'
import type {
  EntitlementRepository,
  ListMembersFilter,
  ListMembersResult,
} from '../../../domain/ports/entitlement-repository.port'
import type { Database } from './db'
import { entitlements } from './schema'

type Row = typeof entitlements.$inferSelect

function fromRow(row: Row): EntitlementAggregate {
  return EntitlementAggregate.restore({
    id: row.id,
    version: row.version,
    userId: row.userId,
    productId: row.productId,
    productKind: row.productKind,
    accessType: row.accessType,
    courseRef: row.courseRef,
    offerId: row.offerId,
    snapshot: row.snapshot,
    status: row.status,
    sourceKind: row.sourceKind,
    sourceId: row.sourceId,
    subscriptionId: row.subscriptionId,
    grantedAt: row.grantedAt,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    idempotencyKey: row.idempotencyKey,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  })
}

/** Matrícula ativa = `status='active'` E (vitalícia OU dentro da validade). */
function activePredicate(userId: string, now: Date) {
  return and(
    eq(entitlements.userId, userId),
    eq(entitlements.status, 'active'),
    or(isNull(entitlements.expiresAt), gt(entitlements.expiresAt, now)),
  )
}

export class DrizzleEntitlementRepository implements EntitlementRepository {
  constructor(private readonly db: Database) {}

  async findByIdempotencyKey(idempotencyKey: string): Promise<EntitlementAggregate | null> {
    const [row] = await this.db
      .select()
      .from(entitlements)
      .where(eq(entitlements.idempotencyKey, idempotencyKey))
      .limit(1)
    return row ? fromRow(row) : null
  }

  async findById(id: string): Promise<EntitlementAggregate | null> {
    const [row] = await this.db.select().from(entitlements).where(eq(entitlements.id, id)).limit(1)
    return row ? fromRow(row) : null
  }

  async save(entitlement: EntitlementAggregate): Promise<boolean> {
    const s = entitlement.toSnapshot()
    const inserted = await this.db
      .insert(entitlements)
      .values({
        id: s.id,
        version: s.version,
        userId: s.userId,
        productId: s.productId,
        productKind: s.productKind,
        accessType: s.accessType,
        courseRef: s.courseRef,
        offerId: s.offerId,
        snapshot: s.snapshot,
        status: s.status,
        sourceKind: s.sourceKind,
        sourceId: s.sourceId,
        subscriptionId: s.subscriptionId,
        grantedAt: s.grantedAt,
        expiresAt: s.expiresAt,
        revokedAt: s.revokedAt,
        idempotencyKey: s.idempotencyKey,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })
      // Sem alvo: cobre QUALQUER índice único (idempotency_key E
      // user_product_source) — um conflito em qualquer um vira no-op (false), não
      // exceção. Defesa contra um caminho futuro que derive a idempotencyKey diferente.
      .onConflictDoNothing()
      .returning({ id: entitlements.id })
    return inserted.length > 0
  }

  async update(entitlement: EntitlementAggregate): Promise<boolean> {
    const s = entitlement.toSnapshot()
    const updated = await this.db
      .update(entitlements)
      .set({
        status: s.status,
        expiresAt: s.expiresAt,
        revokedAt: s.revokedAt,
        updatedAt: s.updatedAt,
        version: s.version + 1,
      })
      .where(and(eq(entitlements.id, s.id), eq(entitlements.version, s.version)))
      .returning({ id: entitlements.id })
    return updated.length > 0
  }

  async findActiveForCourse(
    userId: string,
    courseRef: string,
    now: Date,
    opts?: { masterType?: AccessType | null },
  ): Promise<EntitlementAggregate | null> {
    // Acesso ao curso = matrícula específica (courseRef) OU a chave-mestra da
    // AUDIÊNCIA do curso (`all_courses` p/ adult, `all_kids_courses` p/ kids).
    // Pode haver mais de uma ativa (ex.: vitalícia + assinatura + chave-mestra);
    // escolhe a "mais forte": vitalícia (expiresAt nulo) primeiro, senão a de
    // validade mais distante. `masterType` ausente/null → só a matrícula específica.
    const coverage = opts?.masterType
      ? or(eq(entitlements.courseRef, courseRef), eq(entitlements.accessType, opts.masterType))
      : eq(entitlements.courseRef, courseRef)
    const [row] = await this.db
      .select()
      .from(entitlements)
      .where(and(activePredicate(userId, now), coverage))
      .orderBy(sql`${entitlements.expiresAt} is null desc`, desc(entitlements.expiresAt))
      .limit(1)
    return row ? fromRow(row) : null
  }

  async listActiveByUser(userId: string, now: Date): Promise<EntitlementAggregate[]> {
    const rows = await this.db.select().from(entitlements).where(activePredicate(userId, now))
    return rows.map(fromRow)
  }

  async listByUserId(userId: string): Promise<EntitlementAggregate[]> {
    const rows = await this.db
      .select()
      .from(entitlements)
      .where(eq(entitlements.userId, userId))
      .orderBy(desc(entitlements.grantedAt))
    return rows.map(fromRow)
  }

  async listMembers(filter: ListMembersFilter, now: Date): Promise<ListMembersResult> {
    // Predicado "ativo agora" reusado p/ `activeCount` e p/ o filtro de status='active'.
    // ⚠️ Em fragmento `sql` cru o Drizzle NÃO aplica o mapper da coluna: um Date
    // viraria `toString()` JS (inparseável no PG → 500). Passe ISO + cast.
    const activeFilter = sql`${entitlements.status} = 'active' and (${entitlements.expiresAt} is null or ${entitlements.expiresAt} > ${now.toISOString()}::timestamptz)`

    // Membership (HAVING): mantém o grupo se ele tem ≥1 matrícula que casa o filtro.
    // As contagens do sumário continuam sobre o conjunto TODO do membro (não filtrado).
    const having: SQL[] = []
    if (filter.status === 'active') {
      having.push(sql`count(*) filter (where ${activeFilter}) > 0`)
    } else if (filter.status) {
      having.push(sql`count(*) filter (where ${entitlements.status}::text = ${filter.status}) > 0`)
    }
    if (filter.courseRef) {
      having.push(sql`count(*) filter (where ${entitlements.courseRef} = ${filter.courseRef}) > 0`)
    }
    // Todo grupo tem ≥1 linha → `count(*) > 0` é no-op (quando não há filtro).
    const havingCond = having.length > 0 ? and(...having) : sql`count(*) > 0`

    const rows = await this.db
      .select({
        userId: entitlements.userId,
        totalCount: sql<number>`count(*)::int`,
        activeCount: sql<number>`count(*) filter (where ${activeFilter})::int`,
        lastGrantedAt: sql<Date>`max(${entitlements.grantedAt})`,
        courseRefs: sql<
          string[]
        >`coalesce(array_agg(distinct ${entitlements.courseRef}) filter (where ${entitlements.courseRef} is not null), '{}')`,
      })
      .from(entitlements)
      .groupBy(entitlements.userId)
      .having(havingCond)
      .orderBy(sql`max(${entitlements.grantedAt}) desc`, asc(entitlements.userId))
      .limit(filter.limit)
      .offset(filter.offset)

    // Total = nº de GRUPOS que passam no filtro (subquery — não conta linhas).
    const grouped = this.db
      .select({ userId: entitlements.userId })
      .from(entitlements)
      .groupBy(entitlements.userId)
      .having(havingCond)
      .as('grouped')
    const [totalRow] = await this.db.select({ total: sql<number>`count(*)::int` }).from(grouped)

    return {
      items: rows.map((r) => ({
        userId: r.userId,
        totalCount: r.totalCount,
        activeCount: r.activeCount,
        lastGrantedAt: new Date(r.lastGrantedAt),
        courseRefs: r.courseRefs ?? [],
      })),
      total: totalRow?.total ?? 0,
    }
  }

  async revokeBySubscriptionId(subscriptionId: string, now: Date): Promise<number> {
    const updated = await this.db
      .update(entitlements)
      .set({
        status: 'revoked',
        revokedAt: now,
        updatedAt: now,
        version: sql`${entitlements.version} + 1`,
      })
      .where(
        and(eq(entitlements.subscriptionId, subscriptionId), ne(entitlements.status, 'revoked')),
      )
      .returning({ id: entitlements.id })
    return updated.length
  }

  async expireBySubscriptionId(subscriptionId: string, now: Date): Promise<number> {
    const updated = await this.db
      .update(entitlements)
      .set({ status: 'expired', updatedAt: now, version: sql`${entitlements.version} + 1` })
      .where(
        and(
          eq(entitlements.subscriptionId, subscriptionId),
          notInArray(entitlements.status, ['revoked', 'expired']),
        ),
      )
      .returning({ id: entitlements.id })
    return updated.length
  }
}
