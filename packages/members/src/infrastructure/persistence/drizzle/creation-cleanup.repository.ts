import { and, asc, eq, isNull, lt, lte, or, sql } from 'drizzle-orm'
import type {
  CreationCleanupJob,
  CreationCleanupRepository,
  CreationCleanupScope,
} from '../../../domain/ports/creation-cleanup-repository.port'
import type { Database } from './db'
import { creationCleanupJobs, pensaDeletionJobs } from './schema'

export class DrizzleCreationCleanupRepository implements CreationCleanupRepository {
  constructor(private readonly db: Database) {}

  async claimDue(
    now: Date,
    leaseExpiredBefore: Date,
    scopes: readonly CreationCleanupScope[],
  ): Promise<CreationCleanupJob | null> {
    const accountJob = await this.db.transaction(async (tx) => {
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
    if (accountJob) return accountJob
    // Limpeza de PLANO só para o worker que declarou `pensa`: o worker antigo (rollback do
    // Kids) ignora `scope` e finalizaria a exclusão da CONTA da família com o perfil do plano.
    if (!scopes.includes('pensa')) return null
    return this.db.transaction(async (tx) => {
      const [job] = await tx
        .select()
        .from(pensaDeletionJobs)
        .where(
          and(
            isNull(pensaDeletionJobs.completedAt),
            lte(pensaDeletionJobs.notBefore, now),
            or(
              isNull(pensaDeletionJobs.lockedAt),
              lt(pensaDeletionJobs.lockedAt, leaseExpiredBefore),
            ),
          ),
        )
        .orderBy(asc(pensaDeletionJobs.notBefore))
        .limit(1)
        .for('update', { skipLocked: true })
      if (!job) return null
      await tx
        .update(pensaDeletionJobs)
        .set({ lockedAt: now, attempts: job.attempts + 1, updatedAt: now })
        .where(eq(pensaDeletionJobs.id, job.id))
      return {
        id: job.id,
        accountId: job.accountId,
        userIds: [job.profileId],
        prefixes: job.prefixes,
        attempts: job.attempts + 1,
        scope: 'pensa' as const,
      }
    })
  }

  async complete(id: string, now: Date): Promise<boolean> {
    const rows = await this.db
      .update(creationCleanupJobs)
      .set({ completedAt: now, lockedAt: null, lastError: null, updatedAt: now })
      .where(and(eq(creationCleanupJobs.id, id), isNull(creationCleanupJobs.completedAt)))
      .returning({ id: creationCleanupJobs.id })
    if (rows.length) return true
    const plans = await this.db
      .update(pensaDeletionJobs)
      .set({ completedAt: now, lockedAt: null, lastError: null, updatedAt: now })
      .where(and(eq(pensaDeletionJobs.id, id), isNull(pensaDeletionJobs.completedAt)))
      .returning({ id: pensaDeletionJobs.id })
    return plans.length === 1
  }

  async fail(id: string, error: string, now: Date, retryAt: Date): Promise<boolean> {
    const rows = await this.db
      .update(creationCleanupJobs)
      .set({ lockedAt: null, lastError: error, notBefore: retryAt, updatedAt: now })
      .where(and(eq(creationCleanupJobs.id, id), isNull(creationCleanupJobs.completedAt)))
      .returning({ id: creationCleanupJobs.id })
    if (rows.length) return true
    const plans = await this.db
      .update(pensaDeletionJobs)
      .set({ lockedAt: null, lastError: error, notBefore: retryAt, updatedAt: now })
      .where(and(eq(pensaDeletionJobs.id, id), isNull(pensaDeletionJobs.completedAt)))
      .returning({ id: pensaDeletionJobs.id })
    return plans.length === 1
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
