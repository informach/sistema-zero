import {
  parseRevisionHistoryPage,
  type RevisionHistoryPage,
} from '@sistemazero/marketing-contracts'
import { and, desc, eq, sql } from 'drizzle-orm'
import { WorkspaceError } from '../../../domain/workspace/workspace-error'
import type { WorkspaceTransaction } from './workspace.repository'
import { editorialRevisions as revisions } from './workspace-schema'

export async function readRevisionHistoryPage(
  tx: WorkspaceTransaction,
  projectId: string,
  entityId: string,
  before: string | null,
): Promise<RevisionHistoryPage> {
  const anchor = before
    ? tx
        .select({ createdAt: revisions.createdAt, id: revisions.id })
        .from(revisions)
        .where(
          and(
            eq(revisions.id, before),
            eq(revisions.projectId, projectId),
            eq(revisions.entityId, entityId),
          ),
        )
        .limit(1)
    : null
  if (anchor) {
    const [valid] = await anchor
    if (!valid)
      throw new WorkspaceError('OBJECT_INACCESSIBLE', 'Revisão não disponível neste histórico')
  }
  const rows = await tx
    .select()
    .from(revisions)
    .where(
      and(
        eq(revisions.projectId, projectId),
        eq(revisions.entityId, entityId),
        // Compare timestamps inside PostgreSQL so microseconds are not lost through JS Date.
        anchor ? sql`(${revisions.createdAt}, ${revisions.id}) < (${anchor})` : undefined,
      ),
    )
    .orderBy(desc(revisions.createdAt), desc(revisions.id))
    .limit(51)
  const items: RevisionHistoryPage['items'] = []
  let bytes = 0
  for (const row of rows) {
    if (items.length === 50) break
    const item = { ...row, createdAt: row.createdAt.toISOString() }
    const size = Buffer.byteLength(JSON.stringify(item))
    if (size > 2 * 1024 * 1024 - 1024)
      throw new WorkspaceError(
        'CONTEXT_TOO_LARGE',
        'A revisão excede o limite de transferência do histórico',
      )
    if (bytes + size > 2 * 1024 * 1024 - 1024) break
    items.push(item)
    bytes += size
  }
  return parseRevisionHistoryPage(
    {
      projectId,
      entityId,
      items,
      nextBefore: items.length < rows.length ? items.at(-1)?.id : null,
    },
    projectId,
    entityId,
    before,
  )
}
