import { and, asc, eq, isNull, lt, lte, or, sql } from 'drizzle-orm'
import type {
  CreationCleanupJob,
  CreationCleanupRepository,
} from '../../../domain/ports/creation-cleanup-repository.port'
import type { Database } from './db'
import { creationCleanupJobs } from './schema'

export class DrizzleCreationCleanupRepository implements CreationCleanupRepository {
  constructor(private readonly db: Database) {}

  async claimDue(now: Date, leaseExpiredBefore: Date): Promise<CreationCleanupJob | null> {
    return this.db.transaction(async (tx) => {
      const [job] = await tx
        .select()
        .from(creationCleanupJobs)
        .where(
          and(
            isNull(creationCleanupJobs.completedAt),
            lte(creationCleanupJobs.notBefore, now),
            or(
              isNull(creationCleanupJobs.lockedAt),
              lt(creationCleanupJobs.lockedAt, leaseExpiredBefore),
            ),
          ),
        )
        .orderBy(asc(creationCleanupJobs.notBefore))
        .limit(1)
        .for('update', { skipLocked: true })
      if (!job) return null
      const [claimed] = await tx
        .update(creationCleanupJobs)
        .set({
          lockedAt: now,
          attempts: sql`${creationCleanupJobs.attempts} + 1`,
          updatedAt: now,
        })
        .where(eq(creationCleanupJobs.id, job.id))
        .returning({ attempts: creationCleanupJobs.attempts })
      return {
        id: job.id,
        accountId: job.accountId,
        userIds:
          job.userIds.length > 0 ? job.userIds : userIdsFromPrefixes(job.accountId, job.prefixes),
        prefixes: job.prefixes,
        attempts: claimed?.attempts ?? job.attempts + 1,
      }
    })
  }

  async complete(id: string, now: Date): Promise<boolean> {
    const rows = await this.db
      .update(creationCleanupJobs)
      .set({ completedAt: now, lockedAt: null, lastError: null, updatedAt: now })
      .where(and(eq(creationCleanupJobs.id, id), isNull(creationCleanupJobs.completedAt)))
      .returning({ id: creationCleanupJobs.id })
    return rows.length === 1
  }

  async fail(id: string, error: string, now: Date, retryAt: Date): Promise<boolean> {
    const rows = await this.db
      .update(creationCleanupJobs)
      .set({ lockedAt: null, lastError: error, notBefore: retryAt, updatedAt: now })
      .where(and(eq(creationCleanupJobs.id, id), isNull(creationCleanupJobs.completedAt)))
      .returning({ id: creationCleanupJobs.id })
    return rows.length === 1
  }
}

function userIdsFromPrefixes(accountId: string, prefixes: readonly string[]): string[] {
  const ids = new Set<string>([accountId])
  for (const prefix of prefixes) {
    const match = /^creations\/([^/]+)\/$/.exec(prefix)
    if (match?.[1]) ids.add(match[1])
  }
  return [...ids]
}
