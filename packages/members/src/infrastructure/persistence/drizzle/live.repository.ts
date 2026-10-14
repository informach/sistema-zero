import type { LiveProgram } from '@sistemazero/core/live'
import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import { LiveAccessError, LiveNotFoundError } from '../../../domain/live/live.errors'
import type {
  LiveCatalogQuery,
  LiveCohortAggregate,
  LiveRepository,
} from '../../../domain/ports/live-repository.port'
import type { Database } from './db'
import {
  accountDeletionFences,
  liveAccessGrants,
  liveAudit,
  liveCohorts,
  liveEnrollments,
  liveLearningAttempts,
  liveLearningProgress,
  liveOccurrences,
  livePrograms,
  liveReplayPositions,
  liveSessions,
} from './schema'

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]
type Reader = Database | Transaction

/** All changes to a cohort take the same row lock, including seat allocation. */
export class DrizzleLiveRepository implements LiveRepository {
  constructor(private readonly db: Database) {}

  async listPrograms() {
    return (await this.db.select().from(livePrograms)).map((row) => row.document)
  }
  async findProgram(id: string) {
    return (
      (await this.db.select().from(livePrograms).where(eq(livePrograms.id, id)))[0]?.document ??
      null
    )
  }
  async createProgram(document: LiveProgram) {
    await this.db.insert(livePrograms).values({ id: document.id, document })
  }
  async readReplayPosition(sessionId: string, learnerId: string, version: number) {
    const row = (
      await this.db
        .select()
        .from(liveReplayPositions)
        .where(
          and(
            eq(liveReplayPositions.sessionId, sessionId),
            eq(liveReplayPositions.learnerId, learnerId),
            eq(liveReplayPositions.version, version),
          ),
        )
    )[0]
    return row?.positionSeconds ?? 0
  }
  async readLearningProgress(sessionId: string, learnerId: string, accountId: string) {
    return (
      await this.db
        .select()
        .from(liveLearningProgress)
        .where(
          and(
            eq(liveLearningProgress.sessionId, sessionId),
            eq(liveLearningProgress.learnerId, learnerId),
            eq(liveLearningProgress.accountId, accountId),
          ),
        )
    ).map((row) => row.document)
  }
  async findLearningAttempt(sessionId: string, learnerId: string, accountId: string, id: string) {
    return (
      (
        await this.db
          .select()
          .from(liveLearningAttempts)
          .where(
            and(
              eq(liveLearningAttempts.sessionId, sessionId),
              eq(liveLearningAttempts.learnerId, learnerId),
              eq(liveLearningAttempts.accountId, accountId),
              eq(liveLearningAttempts.id, id),
            ),
          )
      )[0]?.document ?? null
    )
  }
  async updateProgram(id: string, mutate: (program: LiveProgram) => void) {
    return this.db.transaction(async (tx) => {
      const row = (
        await tx.select().from(livePrograms).where(eq(livePrograms.id, id)).for('update')
      )[0]
      if (!row) throw new LiveNotFoundError()
      mutate(row.document)
      await tx.update(livePrograms).set({ document: row.document }).where(eq(livePrograms.id, id))
      return row.document
    })
  }

  async createCohort(aggregate: LiveCohortAggregate) {
    await this.db.transaction(async (tx) => {
      await tx.insert(liveCohorts).values({
        id: aggregate.cohort.id,
        programId: aggregate.cohort.programId,
        document: aggregate.cohort,
      })
      await this.persist(tx, aggregate)
    })
  }

  private async load(db: Reader, id: string): Promise<LiveCohortAggregate | null> {
    const cohort = (await db.select().from(liveCohorts).where(eq(liveCohorts.id, id)))[0]?.document
    if (!cohort) return null
    const sessions = (await db.select().from(liveSessions).where(eq(liveSessions.cohortId, id)))
      .map((row) => row.document)
      .sort((a, b) => a.order - b.order)
    const enrollments = (
      await db.select().from(liveEnrollments).where(eq(liveEnrollments.cohortId, id))
    ).map((row) => row.document)
    const occurrences = (
      await db.select().from(liveOccurrences).where(eq(liveOccurrences.cohortId, id))
    ).map((row) => row.document)
    const grants =
      sessions.length === 0
        ? []
        : (
            await db
              .select()
              .from(liveAccessGrants)
              .where(
                inArray(
                  liveAccessGrants.sessionId,
                  sessions.map((session) => session.id),
                ),
              )
          ).map((row) => ({
            ...row,
            startsAt: row.startsAt.toISOString(),
            endsAt: row.endsAt.toISOString(),
            revokedAt: row.revokedAt?.toISOString() ?? null,
          }))
    return { cohort, sessions, enrollments, occurrences, grants, audit: [] }
  }

  async findCohort(id: string) {
    return this.db.transaction((tx) => this.load(tx, id), {
      isolationLevel: 'repeatable read',
      accessMode: 'read only',
    })
  }
  async findBySession(id: string) {
    const row = (
      await this.db
        .select({ cohortId: liveSessions.cohortId })
        .from(liveSessions)
        .where(eq(liveSessions.id, id))
    )[0]
    return row ? this.findCohort(row.cohortId) : null
  }
  async findByOccurrence(id: string) {
    const row = (
      await this.db
        .select({ cohortId: liveOccurrences.cohortId })
        .from(liveOccurrences)
        .where(eq(liveOccurrences.id, id))
    )[0]
    return row ? this.findCohort(row.cohortId) : null
  }
  async findByEnrollment(id: string) {
    const row = (
      await this.db
        .select({ cohortId: liveEnrollments.cohortId })
        .from(liveEnrollments)
        .where(eq(liveEnrollments.id, id))
    )[0]
    return row ? this.findCohort(row.cohortId) : null
  }
  async listCohorts(query?: LiveCatalogQuery) {
    return this.db.transaction(
      async (tx) => {
        const rows = await tx
          .select({ id: liveCohorts.id })
          .from(liveCohorts)
          .where(
            and(
              query?.cursor ? sql`${liveCohorts.id} > ${query.cursor}::uuid` : undefined,
              query && query.mode !== 'admin'
                ? sql`(
              (${liveCohorts.document}->>'status' = 'open' and exists (
                select 1 from ${livePrograms} where ${livePrograms.id} = ${liveCohorts.programId} and ${livePrograms.document}->>'status' = 'published'
              )) or exists (
                select 1 from ${liveEnrollments} where ${liveEnrollments.cohortId} = ${liveCohorts.id}
                  and ${liveEnrollments.accountId} = ${query.actor.accountId}::uuid
                  ${query.mode === 'parents' ? sql`` : sql`and ${liveEnrollments.learnerId} = ${query.actor.id}::uuid`}
              ) or (${query.actor.staff} and ${liveCohorts.document}->'teacherIds' @> ${JSON.stringify([query.actor.id])}::jsonb)
            )`
                : undefined,
            ),
          )
          .orderBy(asc(liveCohorts.id))
          .limit(query?.limit ?? 50)
        const aggregates: LiveCohortAggregate[] = []
        for (const row of rows) {
          const aggregate = await this.load(tx, row.id)
          if (aggregate) aggregates.push(aggregate)
        }
        return aggregates
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    )
  }
  async overdueOccurrences(now: Date) {
    const rows = await this.db
      .select({ id: liveOccurrences.id })
      .from(liveOccurrences)
      .where(
        sql`${liveOccurrences.document}->>'state' in ('live', 'lobby') and (${liveOccurrences.document}->>'hardEndsAt')::timestamptz <= ${now.toISOString()}::timestamptz`,
      )
      .orderBy(asc(liveOccurrences.id))
      .limit(100)
    return rows.map((row) => row.id)
  }

  async transaction<T>(
    id: string,
    mutate: (aggregate: LiveCohortAggregate) => T | Promise<T>,
    accountId?: string,
  ): Promise<T> {
    return this.db.transaction(async (tx) => {
      // Same order as account erasure: account first, then cohort/workspace.
      if (accountId) {
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${`members-account:${accountId}`}, 0))`,
        )
        if (
          (
            await tx
              .select({ id: accountDeletionFences.accountId })
              .from(accountDeletionFences)
              .where(eq(accountDeletionFences.accountId, accountId))
          )[0]
        )
          throw new LiveAccessError('Esta conta está em exclusão.')
      }
      const row = (
        await tx
          .select({ id: liveCohorts.id })
          .from(liveCohorts)
          .where(eq(liveCohorts.id, id))
          .for('update')
      )[0]
      if (!row) throw new LiveNotFoundError()
      const aggregate = await this.load(tx, id)
      if (!aggregate) throw new LiveNotFoundError()
      const before = structuredClone(aggregate)
      const result = await mutate(aggregate)
      await this.persist(tx, aggregate, before)
      return result
    })
  }

  private async persist(
    tx: Transaction,
    aggregate: LiveCohortAggregate,
    before?: LiveCohortAggregate,
  ) {
    const { cohort } = aggregate
    const changed = (left: unknown, right: unknown) =>
      JSON.stringify(left) !== JSON.stringify(right)
    if (changed(before?.cohort, cohort))
      await tx.update(liveCohorts).set({ document: cohort }).where(eq(liveCohorts.id, cohort.id))
    for (const document of aggregate.sessions) {
      if (
        !changed(
          before?.sessions.find((item) => item.id === document.id),
          document,
        )
      )
        continue
      await tx
        .insert(liveSessions)
        .values({ id: document.id, cohortId: cohort.id, document })
        .onConflictDoUpdate({ target: liveSessions.id, set: { document } })
    }
    for (const document of aggregate.enrollments) {
      if (
        !changed(
          before?.enrollments.find((item) => item.id === document.id),
          document,
        )
      )
        continue
      const row = {
        id: document.id,
        cohortId: cohort.id,
        accountId: document.accountId,
        learnerId: document.learnerId,
        status: document.status,
        document,
      }
      await tx
        .insert(liveEnrollments)
        .values(row)
        .onConflictDoUpdate({ target: liveEnrollments.id, set: row })
    }
    for (const grant of aggregate.grants) {
      if (
        !changed(
          before?.grants.find((item) => item.id === grant.id),
          grant,
        )
      )
        continue
      const row = {
        ...grant,
        startsAt: new Date(grant.startsAt),
        endsAt: new Date(grant.endsAt),
        revokedAt: grant.revokedAt ? new Date(grant.revokedAt) : null,
      }
      await tx
        .insert(liveAccessGrants)
        .values(row)
        .onConflictDoUpdate({ target: liveAccessGrants.id, set: row })
    }
    for (const document of aggregate.occurrences) {
      if (
        !changed(
          before?.occurrences.find((item) => item.id === document.id),
          document,
        )
      )
        continue
      await tx
        .insert(liveOccurrences)
        .values({ id: document.id, cohortId: cohort.id, sessionId: document.sessionId, document })
        .onConflictDoUpdate({ target: liveOccurrences.id, set: { document } })
    }
    for (const entry of aggregate.audit) {
      await tx
        .insert(liveAudit)
        .values({ ...entry, cohortId: cohort.id, createdAt: new Date(entry.createdAt) })
    }
    for (const position of aggregate.replayPositions ?? []) {
      await tx
        .insert(liveReplayPositions)
        .values(position)
        .onConflictDoUpdate({
          target: [
            liveReplayPositions.sessionId,
            liveReplayPositions.learnerId,
            liveReplayPositions.version,
          ],
          set: { positionSeconds: position.positionSeconds },
        })
    }
    for (const write of aggregate.learningWrites ?? []) {
      const { sessionId, learnerId, accountId, progress, attempt } = write
      if (attempt)
        await tx
          .insert(liveLearningAttempts)
          .values({ sessionId, learnerId, accountId, id: attempt.id, document: attempt })
      await tx
        .insert(liveLearningProgress)
        .values({
          sessionId,
          learnerId,
          accountId,
          blockId: progress.blockId,
          revision: progress.revision,
          document: progress,
        })
        .onConflictDoUpdate({
          target: [
            liveLearningProgress.sessionId,
            liveLearningProgress.learnerId,
            liveLearningProgress.blockId,
            liveLearningProgress.revision,
          ],
          set: { document: progress },
        })
    }
  }
}
