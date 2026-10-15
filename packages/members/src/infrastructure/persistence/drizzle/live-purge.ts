import { asc, eq, inArray, or } from 'drizzle-orm'
import type { Database } from './db'
import {
  liveAccessGrants,
  liveAudit,
  liveCohorts,
  liveEnrollments,
  liveLearningAttempts,
  liveLearningProgress,
  liveMediaConnections,
  liveOccurrences,
  livePresence,
  liveReplayPositions,
  liveWorkspaceRevisions,
  liveWorkspaces,
} from './schema'

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]

/** Called inside the account-erasure transaction, after its account lock. */
export async function purgeLiveAccount(tx: Transaction, accountId: string, userIds: string[]) {
  const enrollments = await tx
    .select()
    .from(liveEnrollments)
    .where(
      or(eq(liveEnrollments.accountId, accountId), inArray(liveEnrollments.learnerId, userIds)),
    )
  const ids = [
    ...new Set([
      ...userIds,
      ...enrollments.flatMap((row) => (row.learnerId ? [row.learnerId] : [])),
    ]),
  ]
  const cohortIds = [...new Set(enrollments.map((row) => row.cohortId))].sort()
  // Serialize against room changes; never restore a child from an older JSON snapshot.
  if (cohortIds.length)
    await tx
      .select({ id: liveCohorts.id })
      .from(liveCohorts)
      .where(inArray(liveCohorts.id, cohortIds))
      .orderBy(asc(liveCohorts.id))
      .for('update')
  if (cohortIds.length) {
    const occurrences = await tx
      .select()
      .from(liveOccurrences)
      .where(inArray(liveOccurrences.cohortId, cohortIds))
    for (const row of occurrences) {
      const document = row.document
      document.participants = document.participants.filter(
        (participant) => !ids.includes(participant.learnerId),
      )
      document.messages = document.messages.filter(
        (message) => !(message.authorId && ids.includes(message.authorId)),
      )
      if (document.guidance?.learnerId && ids.includes(document.guidance.learnerId))
        document.guidance = null
      document.version++
      await tx.update(liveOccurrences).set({ document }).where(eq(liveOccurrences.id, row.id))
    }
  }
  const workspaces = await tx
    .select({ id: liveWorkspaces.id })
    .from(liveWorkspaces)
    .where(or(eq(liveWorkspaces.accountId, accountId), inArray(liveWorkspaces.learnerId, ids)))
    .for('update')
  if (workspaces.length) {
    const workspaceIds = workspaces.map((row) => row.id)
    await tx
      .delete(liveWorkspaceRevisions)
      .where(inArray(liveWorkspaceRevisions.workspaceId, workspaceIds))
    await tx.delete(liveWorkspaces).where(inArray(liveWorkspaces.id, workspaceIds))
  }
  // The independent media supervisor retains its own short lease for physical cleanup.
  await tx
    .delete(liveLearningProgress)
    .where(
      or(
        eq(liveLearningProgress.accountId, accountId),
        inArray(liveLearningProgress.learnerId, ids),
      ),
    )
  await tx
    .delete(liveLearningAttempts)
    .where(
      or(
        eq(liveLearningAttempts.accountId, accountId),
        inArray(liveLearningAttempts.learnerId, ids),
      ),
    )
  await tx.delete(liveMediaConnections).where(inArray(liveMediaConnections.actorId, ids))
  await tx
    .delete(livePresence)
    .where(or(eq(livePresence.accountId, accountId), inArray(livePresence.actorId, ids)))
  await tx
    .delete(liveReplayPositions)
    .where(
      or(eq(liveReplayPositions.accountId, accountId), inArray(liveReplayPositions.learnerId, ids)),
    )
  await tx.delete(liveAudit).where(inArray(liveAudit.actorId, ids))
  if (enrollments.length) {
    const enrollmentIds = enrollments.map((row) => row.id)
    await tx.delete(liveAudit).where(inArray(liveAudit.targetId, enrollmentIds))
    await tx.delete(liveAccessGrants).where(inArray(liveAccessGrants.enrollmentId, enrollmentIds))
    await tx.delete(liveEnrollments).where(inArray(liveEnrollments.id, enrollmentIds))
  }
}
