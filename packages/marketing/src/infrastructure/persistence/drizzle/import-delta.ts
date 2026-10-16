import { type ImportDeltaQuery, importDeltaSchema } from '@sistemazero/marketing-contracts'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { WorkspaceError } from '../../../domain/workspace/workspace-error'
import { verifyInventoryIntegrity } from './import-integrity'
import { snapshotProjectAccess, type WorkspaceTransaction } from './workspace.repository'
import { editorialImportEntries as entries, editorialImports as runs } from './workspace-schema'

/** Compare two immutable, sealed snapshots. Removed source paths never delete
 * editorial work, and reclassification never promotes a direction automatically. */
export async function importDelta(
  tx: WorkspaceTransaction,
  actorId: string,
  projectId: string,
  runId: string,
  query: ImportDeltaQuery,
) {
  await snapshotProjectAccess(tx, actorId, projectId)
  const found = await tx
    .select()
    .from(runs)
    .where(and(eq(runs.projectId, projectId), inArray(runs.id, [runId, query.previousId])))
  const previous = found.find((run) => run.id === query.previousId),
    current = found.find((run) => run.id === runId)
  if (!previous || !current)
    throw new WorkspaceError('OBJECT_INACCESSIBLE', 'Inventário não disponível neste projeto')
  if (
    previous.origin !== current.origin ||
    previous.state === 'receiving' ||
    current.state === 'receiving'
  )
    throw new WorkspaceError('IMPORT_CONFLICT', 'Compare inventários confirmados da mesma origem')
  for (const snapshot of previous.id === current.id ? [current] : [previous, current])
    if (snapshot.state === 'retired') await verifyInventoryIntegrity(tx, snapshot)
  const before = tx
    .select({ path: entries.sourcePath, source: entries.source })
    .from(entries)
    .where(eq(entries.runId, previous.id))
    .as('previous_sources')
  const after = tx
    .select({ path: entries.sourcePath, source: entries.source })
    .from(entries)
    .where(eq(entries.runId, current.id))
    .as('current_sources')
  const state = sql<string>`CASE
    WHEN ${before.path} IS NULL THEN 'added'
    WHEN ${after.path} IS NULL THEN 'removed'
    WHEN (${before.source}->>'sha256') IS DISTINCT FROM (${after.source}->>'sha256')
      OR (${before.source}->>'bytes') IS DISTINCT FROM (${after.source}->>'bytes')
      OR (${before.source}->>'kind') IS DISTINCT FROM (${after.source}->>'kind') THEN 'changed'
    WHEN ${before.source} IS DISTINCT FROM ${after.source} THEN 'reclassified'
    ELSE 'unchanged' END`
  const joined = tx
    .select({
      ordinal:
        sql<number>`row_number() over (order by coalesce(${before.path},${after.path}) COLLATE "C") - 1`
          .mapWith(Number)
          .as('delta_ordinal'),
      path: sql<string>`coalesce(${before.path},${after.path})`.as('delta_path'),
      state: state.as('delta_state'),
      previous: sql`${before.source}`.as('previous_source'),
      current: sql`${after.source}`.as('current_source'),
    })
    .from(before)
    .fullJoin(after, eq(before.path, after.path))
    .as('source_delta')
  const summary = await tx
    .select({ state: joined.state, count: sql<number>`count(*)`.mapWith(Number) })
    .from(joined)
    .groupBy(joined.state)
  const rows = await tx
    .select()
    .from(joined)
    .where(
      and(
        sql`${joined.ordinal} >= ${query.cursor}`,
        query.state === 'all' ? undefined : sql`${joined.state} = ${query.state}`,
      ),
    )
    .orderBy(joined.ordinal)
    .limit(101)
  const view = (run: typeof previous) => ({
    ...run,
    createdAt: run.createdAt.toISOString(),
    capturedAt: run.capturedAt.toISOString(),
  })
  return importDeltaSchema.parse({
    previous: view(previous),
    current: view(current),
    summary,
    entries: rows.slice(0, 100),
    nextCursor: rows[100]?.ordinal ?? null,
  })
}
