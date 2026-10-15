import type { LiveAssistanceView } from '@sistemazero/core/live'
import { and, desc, eq, gt, inArray, ne, sql } from 'drizzle-orm'
import { LiveAccessError, LiveNotFoundError } from '../../../domain/live/live.errors'
import type {
  LiveWorkspaceRecord,
  LiveWorkspaceRepository,
  LiveWorkspaceRevision,
} from '../../../domain/ports/live-workspace-repository.port'
import type { Database } from './db'
import { loadLiveCohort } from './live.repository'
import {
  accountDeletionFences,
  liveSessions,
  liveWorkspaceRevisions,
  liveWorkspaces,
} from './schema'

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
