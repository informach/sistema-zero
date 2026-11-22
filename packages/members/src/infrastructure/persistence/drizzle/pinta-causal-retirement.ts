import { randomUUID } from 'node:crypto'
import { creationStorageKey, PINTA_PALETTE_LIBRARY_ITEM_ID } from '@sistemazero/core/creations'
import {
  type PintaCausalBackfillBinding,
  type PintaCausalBinding,
  pintaCausalBlobKey,
} from '@sistemazero/core/creations/pinta-causal'
import {
  type PintaPaletteTicket,
  pintaPaletteBlobKey,
} from '@sistemazero/core/creations/pinta-palette-writer'
import { and, eq, exists, inArray, isNull, lt, lte, notExists, or, sql } from 'drizzle-orm'
import type { CreationCleanupJob } from '../../../domain/ports/creation-cleanup-repository.port'
import type { Database } from './db'
import { expirePintaUnits } from './pinta-causal-leases'
import type { Actor, Tx } from './pinta-causal-store'
import {
  creations as c,
  creationInventoryFloors as floors,
  pintaCausalObjects as objects,
  pintaCausalUnits as units,
} from './schema'

const TTL_GRACE_MS = 20 * 60_000

export async function trackPaletteTicket(tx: Tx, actor: Actor, ticket: PintaPaletteTicket) {
  const stages = ['upload', 'sealed'] as const
  await tx
    .insert(objects)
    .values(
      stages.map((stage) => ({
        ...actor,
        id: randomUUID(),
        itemId: PINTA_PALETTE_LIBRARY_ITEM_ID,
        objectKey: pintaPaletteBlobKey(actor, ticket, stage),
        requiresFence: false,
        notBefore: new Date(Date.parse(ticket.expiresAt) + TTL_GRACE_MS),
      })),
    )
    .onConflictDoNothing()
}

/** Persist before issuing any PUT. A crashed sealer cannot strand its private candidate. */
export async function trackPintaObjects(
  tx: Tx,
  a: Actor,
  b: PintaCausalBinding | PintaCausalBackfillBinding,
) {
  const stages: ('sealed' | 'upload')[] = 'opId' in b ? ['sealed', 'upload'] : ['sealed']
  await tx
    .insert(objects)
    .values(
      stages.map((stage) => ({
        ...a,
        id: randomUUID(),
        itemId: b.itemId,
        objectKey: pintaCausalBlobKey(b, stage),
        requiresFence: false,
        notBefore: new Date(Date.parse(b.expiresAt) + TTL_GRACE_MS),
      })),
    )
    .onConflictDoNothing()
}

export async function retirePintaPointer(
  tx: Tx,
  a: Actor,
  itemId: string,
  revision: number,
  objectKey: string | null,
  now: Date,
) {
  if (!objectKey) return
  const notBefore = new Date(now.getTime() + TTL_GRACE_MS)
  if (objectKey === creationStorageKey(a.userId, 'pinta', itemId, revision, a.audience)) {
    await tx
      .insert(objects)
      .values({ ...a, id: randomUUID(), itemId, objectKey, requiresFence: true, notBefore })
      .onConflictDoUpdate({ target: objects.objectKey, set: { notBefore } })
  } else {
    // Only a previously registered immutable address can enter the exact-key cleanup path here.
    await tx
      .update(objects)
      .set({ notBefore })
      .where(
        and(
          eq(objects.userId, a.userId),
          eq(objects.audience, a.audience),
          eq(objects.itemId, itemId),
          eq(objects.objectKey, objectKey),
        ),
      )
  }
}

export class DrizzlePintaRetirementRepository {
  constructor(private readonly db: Database) {}
  async claim(now: Date, leaseExpired: Date): Promise<CreationCleanupJob | null> {
    // Bound metadata even when the device that started a reservation never comes back.
    // An old committed intent cannot execute again after its receipt ages out: it fixed
    // the epoch before publication. Expired competing binds never recover their old nonce.
    await this.db.transaction(async (tx) => {
      const cutoff = new Date(now.getTime() - 90 * 24 * 3600_000)
      const terminal = and(
        inArray(units.state, ['committed', 'expired', 'aborted']),
        lt(units.expiresAt, cutoff),
      )
      const active = and(
        inArray(units.state, ['reserved', 'collecting']),
        lte(units.expiresAt, now),
      )
      const [owner] = await tx
        .select({ userId: units.userId, accountId: units.accountId, audience: units.audience })
        .from(units)
        .where(or(active, terminal))
        .orderBy(units.expiresAt)
        .limit(1)
      if (!owner) return
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`creation-quota:${owner.userId}`},0))`,
      )
      await expirePintaUnits(tx, owner, now, true)
      const scoped = and(
        eq(units.userId, owner.userId),
        eq(units.accountId, owner.accountId),
        eq(units.audience, owner.audience),
        terminal,
      )
      const retired = await tx.select({ id: units.opId }).from(units).where(scoped).limit(100)
      if (retired.length)
        await tx.delete(units).where(
          and(
            scoped,
            inArray(
              units.opId,
              retired.map((r) => r.id),
            ),
          ),
        )
    })
    return this.db.transaction(async (tx) => {
      // A live nonce can never be reused after retirement. Legacy numbered keys become eligible
      // only after this namespace permanently refuses every non-causal producer.
      const eligible = and(
        lte(objects.notBefore, now),
        or(isNull(objects.lockedAt), lt(objects.lockedAt, leaseExpired)),
        notExists(
          tx
            .select({ id: c.id })
            .from(c)
            .where(
              and(
                eq(c.userId, objects.userId),
                eq(c.audience, objects.audience),
                eq(c.tool, 'pinta'),
                eq(c.itemId, objects.itemId),
                eq(c.storageRef, objects.objectKey),
              ),
            ),
        ),
        or(
          eq(objects.requiresFence, false),
          exists(
            tx
              .select({ id: floors.userId })
              .from(floors)
              .where(
                and(
                  eq(floors.userId, objects.userId),
                  eq(floors.audience, objects.audience),
                  eq(floors.tool, 'pinta'),
                  or(
                    and(
                      eq(objects.itemId, PINTA_PALETTE_LIBRARY_ITEM_ID),
                      sql`${floors.paletteGeneration} is not null`,
                    ),
                    and(
                      sql`${objects.itemId} <> ${PINTA_PALETTE_LIBRARY_ITEM_ID}`,
                      eq(floors.requiresCausalRead, true),
                    ),
                  ),
                ),
              ),
          ),
        ),
      )
      const [candidate] = await tx
        .select({ id: objects.id, userId: objects.userId })
        .from(objects)
        .where(eligible)
        .orderBy(objects.notBefore, objects.id)
        .limit(1)
      if (!candidate) return null
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`creation-quota:${candidate.userId}`},0))`,
      )
      const [job] = await tx
        .update(objects)
        .set({ lockedAt: now, attempts: sql`${objects.attempts}+1` })
        .where(and(eq(objects.id, candidate.id), eligible))
        .returning()
      return job
        ? {
            id: job.id,
            accountId: job.accountId,
            scope: 'pinta',
            userIds: [],
            prefixes: [],
            objectKeys: [job.objectKey],
            attempts: job.attempts,
          }
        : null
    })
  }
  async complete(id: string) {
    const rows = await this.db
      .delete(objects)
      .where(eq(objects.id, id))
      .returning({ id: objects.id })
    return rows.length === 1
  }
  async fail(id: string, retryAt: Date) {
    const rows = await this.db
      .update(objects)
      .set({ lockedAt: null, notBefore: retryAt })
      .where(eq(objects.id, id))
      .returning({ id: objects.id })
    return rows.length === 1
  }
}
