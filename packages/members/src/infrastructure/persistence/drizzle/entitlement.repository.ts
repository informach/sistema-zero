import { and, desc, eq, gt, isNull, ne, notInArray, or, sql } from 'drizzle-orm'
import { EntitlementAggregate } from '../../../domain/entitlement/entitlement.aggregate'
import type { EntitlementRepository } from '../../../domain/ports/entitlement-repository.port'
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

  async findActiveByUserAndCourseRef(
    userId: string,
    courseRef: string,
    now: Date,
  ): Promise<EntitlementAggregate | null> {
    // Pode haver mais de uma matrícula ativa para o mesmo curso (ex.: vitalícia +
    // assinatura). Escolhe a "mais forte": vitalícia (expiresAt nulo) primeiro,
    // senão a de validade mais distante — para o detalhe exibir o acesso correto.
    const [row] = await this.db
      .select()
      .from(entitlements)
      .where(and(activePredicate(userId, now), eq(entitlements.courseRef, courseRef)))
      .orderBy(sql`${entitlements.expiresAt} is null desc`, desc(entitlements.expiresAt))
      .limit(1)
    return row ? fromRow(row) : null
  }

  async listActiveByUser(userId: string, now: Date): Promise<EntitlementAggregate[]> {
    const rows = await this.db.select().from(entitlements).where(activePredicate(userId, now))
    return rows.map(fromRow)
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
