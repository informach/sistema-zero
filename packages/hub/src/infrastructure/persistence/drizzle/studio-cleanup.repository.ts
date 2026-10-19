import { and, asc, eq, isNotNull, isNull, lte } from 'drizzle-orm'
import type { StudioCleanupRepository } from '../../../domain/ports/studio-cleanup-repository.port'
import type { Database } from './db'
import { studioArtifactCleanups } from './schema'

export class DrizzleStudioCleanupRepository implements StudioCleanupRepository {
  constructor(private readonly db: Database) {}

  async claim(now: Date, audience?: 'kids' | 'adult') {
    // Capture caller-owned dates before the first await.
    const claimedAt = new Date(now.getTime())
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(studioArtifactCleanups)
        .where(
          and(
            isNull(studioArtifactCleanups.deliveredAt),
            isNotNull(studioArtifactCleanups.authorId),
            lte(studioArtifactCleanups.nextAttemptAt, claimedAt),
            audience ? eq(studioArtifactCleanups.audience, audience) : undefined,
          ),
        )
        .orderBy(asc(studioArtifactCleanups.nextAttemptAt), asc(studioArtifactCleanups.threadId))
        .limit(1)
        .for('update', { skipLocked: true })
      if (!row || row.authorId === null) return null
      const delay = Math.min(3_600_000, 120_000 * 2 ** Math.min(row.attempts, 5))
      await tx
        .update(studioArtifactCleanups)
        .set({
          attempts: row.attempts + 1,
          nextAttemptAt: new Date(claimedAt.getTime() + delay),
        })
        .where(eq(studioArtifactCleanups.threadId, row.threadId))
      return {
        threadId: row.threadId,
        payload: {
          authorId: row.authorId,
          audience: row.audience,
          playId: row.playId,
          coverUrl: row.coverUrl,
        },
      }
    })
  }

  async acknowledge(threadId: string, now: Date) {
    await this.db
      .update(studioArtifactCleanups)
      .set({ deliveredAt: new Date(now.getTime()) })
      .where(
        and(
          eq(studioArtifactCleanups.threadId, threadId),
          isNull(studioArtifactCleanups.deliveredAt),
        ),
      )
  }
}
