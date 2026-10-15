import type {
  LiveCohort,
  LiveEnrollment,
  LiveOccurrence,
  LiveSession,
} from '@sistemazero/core/live'
import { and, asc, eq, inArray, isNotNull, sql } from 'drizzle-orm'
import {
  LiveAccessError,
  LiveConflictError,
  LiveNotFoundError,
} from '../../../domain/live/live.errors'
import { type LivePresenceRow, overlayPresence } from '../../../domain/live/presence'
import type {
  LiveAccessGrant,
  LiveCatalogQuery,
  LiveCohortAggregate,
  LivePresenceTouch,
  LiveRepository,
  LiveRoomRef,
} from '../../../domain/ports/live-repository.port'
import type { Database } from './db'
import { courseModality } from './live-course.repository'
import {
  accountDeletionFences,
  courses,
  liveAccessGrants,
  liveAudit,
  liveCohorts,
  liveEnrollments,
  liveOccurrences,
  livePresence,
  liveReplayPositions,
  liveSessions,
} from './schema'

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]
type Reader = Database | Transaction

/**
 * Loads a cohort aggregate through the given reader. Inside a transaction, pass the `tx`:
 * a second pool connection while a lock is held can exhaust the pool under load.
 */
export async function loadLiveCohort(db: Reader, id: string): Promise<LiveCohortAggregate | null> {
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
  const presence =
    occurrences.length === 0
      ? []
      : await db
          .select()
          .from(livePresence)
          .where(
            inArray(
              livePresence.occurrenceId,
              occurrences.map((occurrence) => occurrence.id),
            ),
          )
  return overlayPresence(
    { cohort, sessions, enrollments, occurrences, grants, audit: [] },
    presence.map((row) => ({
      occurrenceId: row.occurrenceId,
      actorId: row.actorId,
      seenAt: row.seenAt.toISOString(),
      activityAt: row.activityAt?.toISOString() ?? null,
    })),
  )
}

const iso = (value: string) => new Date(value).toISOString()

/**
 * The room of ONE encounter in ONE statement (one snapshot, one round trip): the cohort
 * document, the session, the occurrences of that session, the seats, this session's grants and
 * the presence rows. Nothing of the other encounters is read.
 */
export async function loadLiveRoom(
  db: Reader,
  ref: LiveRoomRef,
): Promise<LiveCohortAggregate | null> {
  const session =
    'sessionId' in ref
      ? sql`s.id = ${ref.sessionId}::uuid`
      : sql`s.id = (select o.session_id from members.live_occurrences o where o.id = ${ref.occurrenceId}::uuid)`
  const rows = await db.execute<{
    cohort: LiveCohort
    session: LiveSession
    occurrences: LiveOccurrence[]
    enrollments: LiveEnrollment[]
    grants: (Omit<LiveAccessGrant, 'revokedAt'> & { revokedAt: string | null })[]
    presence: LivePresenceRow[]
  }>(sql`
    select
      c.document as cohort,
      s.document as session,
      coalesce((select jsonb_agg(o.document) from members.live_occurrences o
        where o.session_id = s.id), '[]'::jsonb) as occurrences,
      coalesce((select jsonb_agg(e.document) from members.live_enrollments e
        where e.cohort_id = c.id), '[]'::jsonb) as enrollments,
      coalesce((select jsonb_agg(jsonb_build_object(
          'id', g.id, 'enrollmentId', g.enrollment_id, 'sessionId', g.session_id,
          'startsAt', g.starts_at, 'endsAt', g.ends_at, 'revokedAt', g.revoked_at))
        from members.live_access_grants g where g.session_id = s.id), '[]'::jsonb) as grants,
      coalesce((select jsonb_agg(jsonb_build_object(
          'occurrenceId', p.occurrence_id, 'actorId', p.actor_id,
          'seenAt', p.seen_at, 'activityAt', p.activity_at))
        from members.live_presence p join members.live_occurrences o on o.id = p.occurrence_id
        where o.session_id = s.id), '[]'::jsonb) as presence
    from members.live_sessions s
    join members.live_cohorts c on c.id = s.cohort_id
    where ${session}`)
  const row = [...rows][0]
  if (!row) return null
  return overlayPresence(
    {
      cohort: row.cohort,
      sessions: [row.session],
      occurrences: row.occurrences,
      enrollments: row.enrollments,
      // Same instant format as the full load (the room shows the grant window).
      grants: row.grants.map((grant) => ({
        ...grant,
        startsAt: iso(grant.startsAt),
        endsAt: iso(grant.endsAt),
        revokedAt: grant.revokedAt ? iso(grant.revokedAt) : null,
      })),
      audit: [],
    },
    row.presence,
  )
}

async function lockAccount(tx: Transaction, accountId: string) {
  // Same order as account erasure: account first, then cohort/workspace.
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

/** All changes to a cohort take the same row lock, including seat allocation. */
export class DrizzleLiveRepository implements LiveRepository {
  constructor(private readonly db: Database) {}

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
  /**
   * The course row is locked in the same transaction and its modality re-checked: changing a
   * course's modality checks "no cohort" under that same lock, so the two never cross.
   */
  async createCohort(aggregate: LiveCohortAggregate) {
    await this.db.transaction(async (tx) => {
      const courseId = aggregate.cohort.courseId
      if (courseId) {
        const [course] = await tx
          .select()
          .from(courses)
          .where(eq(courses.id, courseId))
          .for('update')
        if (!course) throw new LiveNotFoundError()
        if (courseModality(course) !== 'live')
          throw new LiveConflictError('Este curso não é mais ao vivo. Atualize a página.')
      }
      await tx.insert(liveCohorts).values({
        id: aggregate.cohort.id,
        programId: aggregate.cohort.programId || null,
        courseId: aggregate.cohort.courseId ?? null,
        document: aggregate.cohort,
      })
      await this.persist(tx, aggregate)
    })
  }

  private load(db: Reader, id: string): Promise<LiveCohortAggregate | null> {
    return loadLiveCohort(db, id)
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
  async sessionRef(id: string) {
    const row = (
      await this.db
        .select({
          cohortId: liveSessions.cohortId,
          lessonId: sql<string | null>`${liveSessions.document}->>'lessonId'`,
          occurrenceId: sql<string>`${liveSessions.document}->>'occurrenceId'`,
        })
        .from(liveSessions)
        .where(eq(liveSessions.id, id))
    )[0]
    return row
      ? { cohortId: row.cohortId, lessonId: row.lessonId, occurrenceId: row.occurrenceId }
      : null
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
              // Old script cohorts (no course) are archived by 0114 and never listed.
              isNotNull(liveCohorts.courseId),
              query?.cursor ? sql`${liveCohorts.id} > ${query.cursor}::uuid` : undefined,
              query?.audience
                ? sql`${liveCohorts.document}->'course'->>'audience' = ${query.audience}`
                : undefined,
              query && query.mode !== 'admin'
                ? sql`(
              (${liveCohorts.document}->>'status' = 'open' and ${liveCohorts.courseId} = any(${`{${(query.discoverableCourseIds ?? []).join(',')}}`}::uuid[])) or exists (
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
  async findRoom(ref: LiveRoomRef) {
    return loadLiveRoom(this.db, ref)
  }
  async roomTransaction<T>(
    ref: LiveRoomRef,
    mutate: (aggregate: LiveCohortAggregate) => T | Promise<T>,
    accountId?: string,
  ): Promise<T> {
    return this.db.transaction(async (tx) => {
      if (accountId) await lockAccount(tx, accountId)
      const target = (
        await tx.execute<{ session_id: string; cohort_id: string }>(
          'sessionId' in ref
            ? sql`select id as session_id, cohort_id from members.live_sessions where id = ${ref.sessionId}::uuid`
            : sql`select session_id, cohort_id from members.live_occurrences where id = ${ref.occurrenceId}::uuid`,
        )
      )[0]
      if (!target) throw new LiveNotFoundError()
      // The same cohort row lock as every other cohort write: seats, commands and recording.
      await tx
        .select({ id: liveCohorts.id })
        .from(liveCohorts)
        .where(eq(liveCohorts.id, target.cohort_id))
        .for('update')
      const aggregate = await loadLiveRoom(tx, { sessionId: target.session_id })
      if (!aggregate) throw new LiveNotFoundError()
      const before = structuredClone(aggregate)
      const result = await mutate(aggregate)
      await this.persist(tx, aggregate, before)
      return result
    })
  }
  async touchPresence(input: LivePresenceTouch) {
    await this.db.transaction(async (tx) => {
      await lockAccount(tx, input.accountId)
      const row = {
        occurrenceId: input.occurrenceId,
        actorId: input.actorId,
        accountId: input.accountId,
        seenAt: input.at,
        activityAt: input.activity ? input.at : null,
      }
      await tx
        .insert(livePresence)
        .values(row)
        .onConflictDoUpdate({
          target: [livePresence.occurrenceId, livePresence.actorId],
          set: {
            seenAt: sql`greatest(${livePresence.seenAt}, excluded.seen_at)`,
            activityAt: input.activity
              ? sql`greatest(${livePresence.activityAt}, excluded.activity_at)`
              : sql`${livePresence.activityAt}`,
          },
        })
    })
  }
  async overdueOccurrences(now: Date) {
    const rows = await this.db
      .select({ id: liveOccurrences.id })
      .from(liveOccurrences)
      .where(
        // Scheduled occurrences whose end passed are cancelled by the sweep (never stuck).
        sql`${liveOccurrences.document}->>'state' in ('live', 'lobby', 'scheduled') and (${liveOccurrences.document}->>'hardEndsAt')::timestamptz <= ${now.toISOString()}::timestamptz`,
      )
      .orderBy(
        sql`(${liveOccurrences.document}->>'hardEndsAt')::timestamptz`,
        asc(liveOccurrences.id),
      )
      .limit(100)
    return rows.map((row) => row.id)
  }

  async transaction<T>(
    id: string,
    mutate: (aggregate: LiveCohortAggregate) => T | Promise<T>,
    accountId?: string,
  ): Promise<T> {
    return this.db.transaction(async (tx) => {
      if (accountId) await lockAccount(tx, accountId)
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
  }
}
