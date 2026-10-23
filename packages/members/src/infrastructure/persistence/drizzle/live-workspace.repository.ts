import type { LiveAssistanceView } from '@sistemazero/core/live'
import { studioProjectContinuityIssue } from '@sistemazero/core/studio/project-continuity'
import { and, desc, eq, getTableColumns, gt, inArray, ne, sql } from 'drizzle-orm'
import {
  LiveAccessError,
  LiveConflictError,
  LiveNotFoundError,
} from '../../../domain/live/live.errors'
import type {
  LiveWorkspaceRecord,
  LiveWorkspaceRepository,
  LiveWorkspaceRevision,
  LiveWorkspaceRuntimeContext,
} from '../../../domain/ports/live-workspace-repository.port'
import type { StudioLessonOwner } from '../../../domain/ports/studio-lesson-binding-repository.port'
import type { StudioLessonBaseline } from '../../../domain/studio/lesson-baseline'
import type { Database } from './db'
import { loadLiveCohort, loadLiveRoom } from './live.repository'
import {
  accountDeletionFences,
  liveSessions,
  liveWorkspaceRevisions,
  liveWorkspaces,
  studioLessonBaselines,
  studioLessonBindings,
} from './schema'
import {
  insertStudioLessonBinding,
  readStudioLessonBinding,
} from './studio-lesson-binding.repository'
import { studioCurationProjection, studioEnvironmentProjection } from './studio-runtime-projection'

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]
async function lockAccount(tx: Transaction, accountId: string) {
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

function record(row: typeof liveWorkspaces.$inferSelect): LiveWorkspaceRecord {
  return {
    ...row,
    leaseExpiresAt: row.leaseExpiresAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
    assistance: row.assistance as LiveAssistanceView | null,
    lessonIds: Array.isArray(row.lessonIds) ? row.lessonIds : [],
  }
}
function values(workspace: LiveWorkspaceRecord) {
  return {
    ...workspace,
    leaseExpiresAt: workspace.leaseExpiresAt ? new Date(workspace.leaseExpiresAt) : null,
    updatedAt: new Date(workspace.updatedAt),
  }
}
export class DrizzleLiveWorkspaceRepository implements LiveWorkspaceRepository {
  constructor(private readonly db: Database) {}
  async readRuntimeContext(
    id: string,
    sessionId: string | null,
    blockId: string | null,
  ): Promise<LiveWorkspaceRuntimeContext | null> {
    return this.db.transaction(
      async (tx) => {
        const { project: _project, ...metadata } = getTableColumns(liveWorkspaces)
        const [row] = await tx
          .select({
            ...metadata,
            environment: studioEnvironmentProjection(sql`${liveWorkspaces.project}`),
            cohortId: liveSessions.cohortId,
            deletionFence: accountDeletionFences.accountId,
          })
          .from(liveWorkspaces)
          .leftJoin(liveSessions, eq(liveSessions.id, liveWorkspaces.sessionId))
          .leftJoin(
            accountDeletionFences,
            eq(accountDeletionFences.accountId, liveWorkspaces.accountId),
          )
          .where(eq(liveWorkspaces.id, id))
        if (!row) return null
        if (row.deletionFence) throw new LiveAccessError('Esta conta está em exclusão.')
        const { environment, cohortId, deletionFence: _fence, ...stored } = row
        const cohort = sessionId
          ? await loadLiveRoom(tx, { sessionId })
          : cohortId
            ? await loadLiveCohort(tx, cohortId)
            : null
        const [binding] = blockId
          ? await tx
              .select({
                baselineId: studioLessonBaselines.id,
                lessonId: studioLessonBaselines.lessonId,
                courseId: studioLessonBaselines.courseId,
                environment: studioEnvironmentProjection(
                  sql`${studioLessonBaselines.configuration}->'initialProject'`,
                ),
                curation: studioCurationProjection(sql`${studioLessonBaselines.configuration}`),
              })
              .from(studioLessonBindings)
              .innerJoin(
                studioLessonBaselines,
                eq(studioLessonBaselines.id, studioLessonBindings.baselineId),
              )
              .where(
                and(
                  eq(studioLessonBindings.workspaceId, id),
                  eq(studioLessonBindings.accountId, stored.accountId),
                  eq(studioLessonBindings.userId, stored.learnerId),
                  eq(studioLessonBindings.blockId, blockId),
                ),
              )
          : []
        return {
          workspace: {
            ...stored,
            leaseExpiresAt: stored.leaseExpiresAt?.toISOString() ?? null,
            updatedAt: stored.updatedAt.toISOString(),
          },
          environment,
          // An encounter in another cohort cannot confer access to this workspace.
          cohort: cohort?.cohort.id === cohortId ? cohort : null,
          binding: binding ?? null,
        }
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    )
  }
  findBinding(owner: StudioLessonOwner, blockId: string) {
    return readStudioLessonBinding(this.db, owner, blockId)
  }
  async openBound(
    candidate: LiveWorkspaceRecord & { projectKey: string },
    baseline: StudioLessonBaseline,
    sessionId: string,
  ) {
    return this.db.transaction(async (tx) => {
      await lockAccount(tx, candidate.accountId)
      const owner = { userId: candidate.learnerId, accountId: candidate.accountId }
      const bound = await readStudioLessonBinding(tx, owner, baseline.blockId)
      if (bound && !bound.workspaceId)
        throw new LiveConflictError('Este projeto pertence a uma aula gravada.')
      const condition = bound?.workspaceId
        ? eq(liveWorkspaces.id, bound.workspaceId)
        : and(
            eq(liveWorkspaces.learnerId, candidate.learnerId),
            eq(liveWorkspaces.projectKey, candidate.projectKey),
          )
      let [row] = await tx.select().from(liveWorkspaces).where(condition).for('update')
      if (!row) {
        if (bound) throw new LiveNotFoundError()
        await tx.insert(liveWorkspaces).values(values(candidate)).onConflictDoNothing()
        ;[row] = await tx.select().from(liveWorkspaces).where(condition).for('update')
      }
      if (!row || row.accountId !== candidate.accountId || row.learnerId !== candidate.learnerId)
        throw new LiveAccessError()
      const original = bound?.baseline ?? baseline
      if (studioProjectContinuityIssue(row.project, original.configuration.initialProject))
        throw new LiveConflictError(
          'O projeto salvo e esta aula usam ambientes diferentes. O trabalho foi preservado; peça à equipe para conferir a configuração.',
        )
      const binding = bound ?? (await insertStudioLessonBinding(tx, owner, original, row.id))
      const cohorts = await tx
        .select({ id: liveSessions.id, cohortId: liveSessions.cohortId })
        .from(liveSessions)
        .where(inArray(liveSessions.id, [row.sessionId, sessionId]))
      const anchorSessionId = row.sessionId
      const anchor = cohorts.find((item) => item.id === anchorSessionId)?.cohortId
      const target = cohorts.find((item) => item.id === sessionId)?.cohortId
      if (!target) throw new LiveNotFoundError()
      const lessonIds = row.lessonIds
      const move = anchor !== target && row.assistance === null
      if (move || !lessonIds.includes(original.lessonId)) {
        const [updated] = await tx
          .update(liveWorkspaces)
          .set(
            move
              ? { sessionId, lessonIds: [original.lessonId] }
              : { lessonIds: [...lessonIds, original.lessonId] },
          )
          .where(eq(liveWorkspaces.id, row.id))
          .returning()
        if (!updated) throw new LiveNotFoundError()
        row = updated
      }
      return { workspace: record(row), baseline: binding.baseline }
    })
  }
  async find(id: string) {
    const [row] = await this.db.select().from(liveWorkspaces).where(eq(liveWorkspaces.id, id))
    return row ? record(row) : null
  }
  async listOwned(accountId: string, learnerId: string) {
    const rows = await this.db
      .select()
      .from(liveWorkspaces)
      .where(and(eq(liveWorkspaces.accountId, accountId), eq(liveWorkspaces.learnerId, learnerId)))
      .orderBy(desc(liveWorkspaces.updatedAt))
      .limit(100)
    return rows.map(record)
  }
  async findByKey(learnerId: string, projectKey: string) {
    const [row] = await this.db
      .select()
      .from(liveWorkspaces)
      .where(
        and(eq(liveWorkspaces.learnerId, learnerId), eq(liveWorkspaces.projectKey, projectKey)),
      )
    return row ? record(row) : null
  }
  async ensureByKey(workspace: LiveWorkspaceRecord & { projectKey: string }) {
    return this.db.transaction(async (tx) => {
      await lockAccount(tx, workspace.accountId)
      // Any unique conflict means a concurrent open created it first: return that one.
      await tx.insert(liveWorkspaces).values(values(workspace)).onConflictDoNothing()
      const [row] = await tx
        .select()
        .from(liveWorkspaces)
        .where(
          and(
            eq(liveWorkspaces.learnerId, workspace.learnerId),
            eq(liveWorkspaces.projectKey, workspace.projectKey),
          ),
        )
      if (!row) throw new LiveNotFoundError()
      return record(row)
    })
  }
  async linkLesson(id: string, input: { lessonId: string; sessionId: string }) {
    return this.db.transaction(async (tx) => {
      const [owner] = await tx
        .select({ accountId: liveWorkspaces.accountId })
        .from(liveWorkspaces)
        .where(eq(liveWorkspaces.id, id))
      if (!owner) throw new LiveNotFoundError()
      await lockAccount(tx, owner.accountId)
      const [row] = await tx
        .select()
        .from(liveWorkspaces)
        .where(eq(liveWorkspaces.id, id))
        .for('update')
      if (!row) throw new LiveNotFoundError()
      const cohorts = await tx
        .select({ id: liveSessions.id, cohortId: liveSessions.cohortId })
        .from(liveSessions)
        .where(inArray(liveSessions.id, [row.sessionId, input.sessionId]))
      const anchor = cohorts.find((item) => item.id === row.sessionId)?.cohortId
      const target = cohorts.find((item) => item.id === input.sessionId)?.cohortId
      if (!target) throw new LiveNotFoundError()
      const lessonIds = Array.isArray(row.lessonIds) ? row.lessonIds : []
      // A new cohort of the same course: the project follows the child (never during help).
      const move = anchor !== target && row.assistance === null
      const next = move
        ? { sessionId: input.sessionId, lessonIds: [input.lessonId] }
        : {
            lessonIds: lessonIds.includes(input.lessonId)
              ? lessonIds
              : [...lessonIds, input.lessonId],
          }
      const [updated] = await tx
        .update(liveWorkspaces)
        .set(next)
        .where(eq(liveWorkspaces.id, id))
        .returning()
      if (!updated) throw new LiveNotFoundError()
      return record(updated)
    })
  }
  async transaction<T>(
    id: string,
    action: (
      tx: import('../../../domain/ports/live-workspace-repository.port').LiveWorkspaceTransaction,
    ) => Promise<T>,
  ): Promise<T> {
    return this.db.transaction(async (tx) => {
      const [owner] = await tx
        .select({ accountId: liveWorkspaces.accountId })
        .from(liveWorkspaces)
        .where(eq(liveWorkspaces.id, id))
      if (!owner) throw new LiveNotFoundError()
      await lockAccount(tx, owner.accountId)
      const [parent] = await tx
        .select({ cohortId: liveSessions.cohortId })
        .from(liveWorkspaces)
        .innerJoin(liveSessions, eq(liveSessions.id, liveWorkspaces.sessionId))
        .where(eq(liveWorkspaces.id, id))
      if (!parent) throw new LiveNotFoundError()
      // No cohort row lock: the account lock orders us against erasure and the workspace row
      // lock against other writers. Authorization reads the cohort through this same `tx`.
      const [row] = await tx
        .select()
        .from(liveWorkspaces)
        .where(eq(liveWorkspaces.id, id))
        .for('update')
      if (!row) throw new LiveNotFoundError()
      const workspace = record(row)
      const previousAssistance = JSON.stringify(workspace.assistance)
      const result = await action({
        workspace,
        findMutation: async (mutationId) => {
          const [revision] = await tx
            .select()
            .from(liveWorkspaceRevisions)
            .where(
              and(
                eq(liveWorkspaceRevisions.workspaceId, id),
                eq(liveWorkspaceRevisions.mutationId, mutationId),
              ),
            )
          return revision ? { ...revision, createdAt: revision.createdAt.toISOString() } : null
        },
        appendRevision: async (revision: LiveWorkspaceRevision) => {
          await tx
            .insert(liveWorkspaceRevisions)
            .values({ ...revision, createdAt: new Date(revision.createdAt) })
        },
        loadCohort: () => loadLiveCohort(tx, parent.cohortId),
        teacherHasActiveWorkspace: async (teacherId, now) => {
          // Only competing handoffs for this teacher serialize across cohorts.
          // Normal saves/cursors do not contend with unrelated rooms.
          await tx.execute(
            sql`select pg_advisory_xact_lock(hashtextextended(${`members.live-teacher:${teacherId}`}, 0))`,
          )
          const [other] = await tx
            .select({ id: liveWorkspaces.id })
            .from(liveWorkspaces)
            .where(
              and(
                ne(liveWorkspaces.id, id),
                eq(liveWorkspaces.writerId, teacherId),
                sql`${liveWorkspaces.assistance}->>'status' = 'active'`,
                gt(liveWorkspaces.leaseExpiresAt, now),
              ),
            )
            .limit(1)
          return Boolean(other)
        },
      })
      // Heartbeats/cursors must not rewrite a multi-megabyte project document.
      const updates: Partial<typeof liveWorkspaces.$inferInsert> = {
        writerId: workspace.writerId,
        writerDeviceId: workspace.writerDeviceId,
        writerEpoch: workspace.writerEpoch,
        leaseExpiresAt: workspace.leaseExpiresAt ? new Date(workspace.leaseExpiresAt) : null,
      }
      if (workspace.revision !== row.revision) {
        updates.project = workspace.project
        updates.revision = workspace.revision
        updates.updatedAt = new Date(workspace.updatedAt)
      }
      if (JSON.stringify(workspace.assistance) !== previousAssistance)
        updates.assistance = workspace.assistance
      await tx.update(liveWorkspaces).set(updates).where(eq(liveWorkspaces.id, id))
      const retained = await tx
        .select({ revision: liveWorkspaceRevisions.revision })
        .from(liveWorkspaceRevisions)
        .where(eq(liveWorkspaceRevisions.workspaceId, id))
        .orderBy(desc(liveWorkspaceRevisions.revision))
        .offset(20)
      const removable = retained
        .map((r) => r.revision)
        .filter((r) => r !== workspace.assistance?.checkpointRevision)
      if (removable.length)
        await tx
          .delete(liveWorkspaceRevisions)
          .where(
            and(
              eq(liveWorkspaceRevisions.workspaceId, id),
              inArray(liveWorkspaceRevisions.revision, removable),
            ),
          )
      return result
    })
  }
}
