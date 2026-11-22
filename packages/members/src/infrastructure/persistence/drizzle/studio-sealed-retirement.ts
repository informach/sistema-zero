import { randomUUID } from 'node:crypto'
import { creationStorageKey } from '@sistemazero/core/creations'
import {
  resolveCreationPartKey,
  studioSealedBlobKey,
} from '@sistemazero/core/creations/studio-sealed-storage'
import type { StudioSealedTicket } from '@sistemazero/core/creations/studio-sealed-writer'
import { and, eq, isNull, lt, lte, notExists, or, sql } from 'drizzle-orm'
import { type CreationPartRef, isCreationPartHash } from '../../../domain/creations/creation'
import type { CreationCleanupJob } from '../../../domain/ports/creation-cleanup-repository.port'
import type { Database } from './db'
import { creations, studioSealedObjects } from './schema'
import type { StudioSealOwner } from './studio-sealed-write-state'

const GRACE_MS = 20 * 60_000
type Insert = Pick<Database, 'insert'>

/** Register both physical names before an uploader can receive a presign. */
export async function trackStudioSeal(tx: Insert, ticket: StudioSealedTicket) {
  const { scope, nonce } = ticket
  const notBefore = new Date(Date.parse(ticket.expiresAt) + GRACE_MS)
  const record = (stage: 'upload' | 'sealed', hash?: string) => ({
    ...scope,
    id: randomUUID(),
    objectKey: studioSealedBlobKey(scope, nonce, stage, hash),
    notBefore,
    ...(stage === 'sealed' && hash ? { partNonce: nonce, partHash: hash } : {}),
  })
  const names = [record('upload'), record('sealed')]
  for (const part of ticket.parts) {
    if (part.source === 'sealed') continue
    if (part.source === 'upload') names.push(record('upload', part.hash))
    names.push(record('sealed', part.hash))
  }
  await tx.insert(studioSealedObjects).values(names)
}

/** Delay release of superseded keys beyond their last GET and any old numbered PUT. */
export async function retireStudioRevision(
  tx: Insert,
  owner: StudioSealOwner,
  previous: { storageRef: string | null; revision: number; parts: CreationPartRef[] },
  retained: readonly CreationPartRef[],
  notBefore: Date,
) {
  const locator = { ...owner, tool: 'studio' as const }
  const keep = new Set(retained.map((part) => resolveCreationPartKey(locator, part)))
  const records: (typeof studioSealedObjects.$inferInsert)[] = []
  const eligibility = new Date(Math.max(notBefore.getTime(), Date.now()) + GRACE_MS)
  const entry = (objectKey: string) => ({
    ...owner,
    id: randomUUID(),
    objectKey,
    notBefore: eligibility,
  })
  // Newly sealed pointers are always registered already. Accept the old key only at its exact locator.
  const legacyMain = creationStorageKey(
    owner.userId,
    'studio',
    owner.itemId,
    previous.revision,
    owner.audience,
  )
  if (
    previous.storageRef === legacyMain ||
    previous.storageRef?.startsWith(legacyMain.slice(0, legacyMain.lastIndexOf('/') + 1) + 'seals/')
  ) {
    records.push(entry(previous.storageRef))
  }
  for (const part of previous.parts) {
    if (!isCreationPartHash(part.hash)) continue
    const objectKey = resolveCreationPartKey(locator, part)
    if (keep.has(objectKey)) continue
    records.push(
      'rev' in part
        ? entry(objectKey)
        : { ...entry(objectKey), partNonce: part.nonce, partHash: part.hash },
    )
  }
  if (records.length) {
    await tx
      .insert(studioSealedObjects)
      .values(records)
      .onConflictDoUpdate({
        target: studioSealedObjects.objectKey,
        set: { notBefore: sql`greatest(${studioSealedObjects.notBefore}, excluded.not_before)` },
      })
  }
}

export class DrizzleStudioSealedRetirementRepository {
  constructor(private readonly db: Database) {}

  async claim(now: Date, leaseExpired: Date): Promise<CreationCleanupJob | null> {
    const o = studioSealedObjects
    return this.db.transaction(async (tx) => {
      const [candidate] = await tx
        .select()
        .from(o)
        .where(
          and(
            lte(o.notBefore, now),
            or(isNull(o.lockedAt), lt(o.lockedAt, leaseExpired)),
            notExists(
              tx
                .select({ id: creations.id })
                .from(creations)
                .where(
                  and(
                    eq(creations.userId, o.userId),
                    eq(creations.audience, o.audience),
                    eq(creations.tool, 'studio'),
                    eq(creations.itemId, o.itemId),
                    or(
                      eq(creations.storageRef, o.objectKey),
                      sql`(${o.partNonce} is not null and ${creations.parts} @> jsonb_build_array(jsonb_build_object('nonce', ${o.partNonce}::text, 'hash', ${o.partHash})))`,
                    ),
                  ),
                ),
            ),
          ),
        )
        .orderBy(o.notBefore)
        .limit(1)
        .for('update', { skipLocked: true })
      if (!candidate) return null
      await tx
        .update(o)
        .set({ lockedAt: now, attempts: candidate.attempts + 1 })
        .where(eq(o.id, candidate.id))
      return {
        scope: 'studio-seal',
        id: candidate.id,
        accountId: candidate.accountId,
        prefixes: [],
        userIds: [],
        objectKeys: [candidate.objectKey],
        attempts: candidate.attempts + 1,
      }
    })
  }

  async complete(id: string): Promise<boolean> {
    const o = studioSealedObjects
    return (await this.db.delete(o).where(eq(o.id, id)).returning({ id: o.id })).length === 1
  }

  async fail(id: string, notBefore: Date): Promise<boolean> {
    const o = studioSealedObjects
    return (
      (
        await this.db
          .update(o)
          .set({ lockedAt: null, notBefore })
          .where(eq(o.id, id))
          .returning({ id: o.id })
      ).length === 1
    )
  }
}
