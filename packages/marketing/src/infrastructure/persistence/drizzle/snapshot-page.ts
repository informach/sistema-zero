import {
  parseSnapshotPage,
  type SnapshotCursor,
  type SnapshotPage,
} from '@sistemazero/marketing-contracts'
import { and, asc, desc, eq, gt, inArray, isNotNull, lte } from 'drizzle-orm'
import { WorkspaceError } from '../../../domain/workspace/workspace-error'
import type { WorkspaceTransaction } from './workspace.repository'
import { editorialChanges as changes, editorialRevisions as revisions } from './workspace-schema'

/** Reconstruct one immutable cut from revision events; later writes cannot leak
 * into a later page. No transaction or lock survives an HTTP request. */
export async function readSnapshotPage(
  tx: WorkspaceTransaction,
  projectId: string,
  at: number,
  permissions: SnapshotPage['permissions'],
  cursor: SnapshotCursor | null,
): Promise<SnapshotPage> {
  const latest = tx
    .selectDistinctOn([changes.entityId], {
      entityId: changes.entityId,
      revisionId: changes.revisionId,
      sequence: changes.sequence,
      type: changes.type,
    })
    .from(changes)
    .where(
      and(
        eq(changes.projectId, projectId),
        lte(changes.sequence, at),
        inArray(changes.type, ['revision', 'archive']),
        isNotNull(changes.entityId),
        isNotNull(changes.revisionId),
        cursor ? gt(changes.entityId, cursor.after) : undefined,
      ),
    )
    .orderBy(asc(changes.entityId), desc(changes.sequence))
    .limit(101)
    .as('latest')
  const rows = await tx
    .select({
      event: { entityId: latest.entityId, sequence: latest.sequence, type: latest.type },
      revision: revisions,
    })
    .from(latest)
    .leftJoin(
      revisions,
      and(eq(revisions.id, latest.revisionId), eq(revisions.projectId, projectId)),
    )
    .orderBy(asc(latest.entityId))
  const items: SnapshotPage['items'] = []
  let bytes = 0
  for (const row of rows) {
    if (items.length === 100) break
    const revision = row.revision
    if (!revision || revision.entityId !== row.event.entityId)
      throw new Error('Histórico editorial inconsistente no retrato')
    const item = {
      id: revision.entityId,
      projectId,
      revisionId: revision.id,
      document: revision.document,
      kind: revision.document.kind,
      archived: row.event.type === 'archive',
      authorId: revision.createdBy,
      updatedAt: revision.createdAt.toISOString(),
      sequence: row.event.sequence,
    }
    const size = Buffer.byteLength(JSON.stringify(item))
    if (size > 2 * 1024 * 1024 - 1024)
      throw new WorkspaceError(
        'CONTEXT_TOO_LARGE',
        'Um item excede o limite de transferência do acervo',
      )
    if (bytes + size > 2 * 1024 * 1024 - 1024) break
    items.push(item)
    bytes += size
  }
  return parseSnapshotPage(
    {
      projectId,
      at,
      permissions,
      items,
      nextAfter: items.length < rows.length ? items.at(-1)?.id : null,
    },
    projectId,
    cursor,
  )
}
