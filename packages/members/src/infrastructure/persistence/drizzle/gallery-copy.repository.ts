import { ValidationError } from '@sistemazero/core/errors'
import { and, asc, count, eq, gt, isNotNull, isNull, lt, lte, or } from 'drizzle-orm'
import { LearningConflictError } from '../../../domain/learning/learning.errors'
import type { CreationCleanupJob } from '../../../domain/ports/creation-cleanup-repository.port'
import {
  GALLERY_COPY_CLEANUP_DELAY_MS,
  GALLERY_COPY_COMMIT_TTL_MS,
  GALLERY_COPY_PENDING_LIMIT,
  type GalleryCopyAttempt,
  type GalleryCopyRepository,
} from '../../../domain/ports/gallery-copy-repository.port'
import { stableJson } from '../../../domain/shared/stable-json'
import type { Database } from './db'
import { lockLearningOwner } from './learning-owner-lock'
import { galleryCopyAttempts } from './schema'

export class DrizzleGalleryCopyRepository implements GalleryCopyRepository {
  constructor(private readonly db: Database) {}

  async reserve(attempt: GalleryCopyAttempt, now: Date): Promise<void> {
    await this.db.transaction(async (tx) => {
      await lockLearningOwner(tx, attempt)
      const [pending] = await tx
        .select({ total: count() })
        .from(galleryCopyAttempts)
        .where(
          and(
            eq(galleryCopyAttempts.userId, attempt.userId),
            isNull(galleryCopyAttempts.retainedAt),
            isNull(galleryCopyAttempts.completedAt),
          ),
        )
      if ((pending?.total ?? 0) >= GALLERY_COPY_PENDING_LIMIT)
        throw new ValidationError(
          'Há muitos envios em andamento. Aguarde antes de tentar novamente.',
        )
      await tx.insert(galleryCopyAttempts).values({
        ...attempt,
        createdAt: now,
        expiresAt: new Date(now.getTime() + GALLERY_COPY_COMMIT_TTL_MS),
        notBefore: new Date(now.getTime() + GALLERY_COPY_CLEANUP_DELAY_MS),
      })
    })
  }

  async assertActive(attempt: GalleryCopyAttempt, now: Date): Promise<void> {
    const [row] = await this.db
      .select()
      .from(galleryCopyAttempts)
      .where(
        and(
          eq(galleryCopyAttempts.generation, attempt.generation),
          eq(galleryCopyAttempts.accountId, attempt.accountId),
          eq(galleryCopyAttempts.userId, attempt.userId),
          eq(galleryCopyAttempts.blockId, attempt.blockId),
          isNull(galleryCopyAttempts.retiredAt),
          gt(galleryCopyAttempts.expiresAt, now),
        ),
      )
      .limit(1)
    if (!row || stableJson(row.snapshot) !== stableJson(attempt.snapshot))
      throw new LearningConflictError()
  }

  async claimDue(now: Date, leaseExpiredBefore: Date): Promise<CreationCleanupJob | null> {
    const due = and(
      isNull(galleryCopyAttempts.retainedAt),
      isNull(galleryCopyAttempts.completedAt),
      lte(galleryCopyAttempts.expiresAt, now),
      lte(galleryCopyAttempts.notBefore, now),
      or(
        isNull(galleryCopyAttempts.lockedAt),
        lt(galleryCopyAttempts.lockedAt, leaseExpiredBefore),
      ),
    )
    // Do not lock the candidate before the owner: submission persistence takes owner first.
    const candidates = await this.db
      .select()
      .from(galleryCopyAttempts)
      .where(due)
      .orderBy(asc(galleryCopyAttempts.notBefore))
      .limit(25)
    for (const candidate of candidates) {
      const job = await this.db.transaction(async (tx) => {
        await lockLearningOwner(tx, candidate, { allowDeleted: true })
        const [row] = await tx
          .select()
          .from(galleryCopyAttempts)
          .where(and(eq(galleryCopyAttempts.generation, candidate.generation), due))
          .for('update', { skipLocked: true })
          .limit(1)
        if (!row) return null
        await tx
          .update(galleryCopyAttempts)
          .set({
            retiredAt: row.retiredAt ?? now,
            lockedAt: now,
            attempts: row.attempts + 1,
          })
          .where(eq(galleryCopyAttempts.generation, row.generation))
        return {
          scope: 'gallery' as const,
          id: row.generation,
          accountId: row.accountId,
          userIds: [row.userId],
          prefixes: [
            `creations/${row.userId}/lesson-submissions/${row.blockId}/${row.snapshot.requestId}/${row.generation}/`,
          ],
          attempts: row.attempts + 1,
        }
      })
      if (job) return job
    }
    return null
  }

  async complete(id: string, now: Date): Promise<boolean> {
    const rows = await this.db
      .update(galleryCopyAttempts)
      .set({ completedAt: now, lockedAt: null, lastError: null })
      .where(
        and(
          eq(galleryCopyAttempts.generation, id),
          isNull(galleryCopyAttempts.retainedAt),
          isNotNull(galleryCopyAttempts.retiredAt),
          isNull(galleryCopyAttempts.completedAt),
        ),
      )
      .returning({ id: galleryCopyAttempts.generation })
    return rows.length === 1
  }

  async fail(id: string, error: string, _now: Date, retryAt: Date): Promise<boolean> {
    const rows = await this.db
      .update(galleryCopyAttempts)
      .set({ lockedAt: null, lastError: error, notBefore: retryAt })
      .where(
        and(
          eq(galleryCopyAttempts.generation, id),
          isNull(galleryCopyAttempts.retainedAt),
          isNotNull(galleryCopyAttempts.retiredAt),
          isNull(galleryCopyAttempts.completedAt),
        ),
      )
      .returning({ id: galleryCopyAttempts.generation })
    return rows.length === 1
  }
}
