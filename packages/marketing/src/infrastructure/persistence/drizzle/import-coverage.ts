import { type ImportCoverageQuery, importCoverageSchema } from '@sistemazero/marketing-contracts'
import { and, asc, eq, gte, sql } from 'drizzle-orm'
import { WorkspaceError } from '../../../domain/workspace/workspace-error'
import { snapshotProjectAccess, type WorkspaceTransaction } from './workspace.repository'
import {
  editorialImportProducts as bindings,
  editorialImportDecisions as decisions,
  editorialImportEntries as entries,
  editorialImports as runs,
} from './workspace-schema'

/** Counts and origins come from the same repeatable-read snapshot. A source
 * receipt proves preservation, not approval, production linkage or activation. */
export async function importCoverage(
  tx: WorkspaceTransaction,
  actorId: string,
  projectId: string,
  runId: string,
  query: ImportCoverageQuery,
) {
  await snapshotProjectAccess(tx, actorId, projectId)
  const [run] = await tx
    .select()
    .from(runs)
    .where(and(eq(runs.projectId, projectId), eq(runs.id, runId)))
  if (!run) throw new WorkspaceError('OBJECT_INACCESSIBLE', 'Carga não disponível neste projeto')
  const [binding] = await tx
    .select()
    .from(bindings)
    .where(and(eq(bindings.projectId, projectId), eq(bindings.origin, run.origin)))
  const state = binding
    ? sql<string>`CASE
    WHEN NOT (${entries.source}->>'product'=${binding.product} OR (${binding.includeShared} AND ${entries.source}->>'product'='shared')) THEN 'other-product'
    WHEN ${entries.result} IS NOT NULL THEN 'loaded'
    WHEN ${decisions.decision}->>'state' IN ('deferred','omitted') THEN ${decisions.decision}->>'state'
    WHEN ${entries.source}->>'disposition'='eligible' THEN 'pending'
    WHEN ${entries.source}->>'disposition'='review' THEN 'review'
    WHEN ${entries.source}->>'disposition'='blocked' THEN 'blocked'
    ELSE 'excluded' END`
    : sql<string>`'unbound'`
  const grouped = tx
    .select({
      state: state.as('coverage_state'),
      bytes: sql<string>`${entries.source}->>'bytes'`.as('source_bytes'),
    })
    .from(entries)
    .leftJoin(
      decisions,
      and(eq(decisions.runId, entries.runId), eq(decisions.ordinal, entries.ordinal)),
    )
    .where(eq(entries.runId, runId))
    .as('coverage_sources')
  const summary = await tx
    .select({
      state: grouped.state,
      count: sql<number>`count(*)`.mapWith(Number),
      bytes: sql<number>`coalesce(sum((${grouped.bytes})::bigint),0)`.mapWith(Number),
    })
    .from(grouped)
    .groupBy(grouped.state)
  const rows = await tx
    .select({
      ordinal: entries.ordinal,
      source: entries.source,
      result: entries.result,
      state,
      decision: decisions.decision,
    })
    .from(entries)
    .leftJoin(
      decisions,
      and(eq(decisions.runId, entries.runId), eq(decisions.ordinal, entries.ordinal)),
    )
    .where(
      and(
        eq(entries.runId, runId),
        gte(entries.ordinal, query.cursor),
        query.state === 'all' ? undefined : sql`${state}=${query.state}`,
      ),
    )
    .orderBy(asc(entries.ordinal))
    .limit(101)
  return importCoverageSchema.parse({
    run: {
      ...run,
      capturedAt: run.capturedAt.toISOString(),
      createdAt: run.createdAt.toISOString(),
    },
    binding: binding ? { ...binding, updatedAt: binding.updatedAt.toISOString() } : null,
    countedAt: new Date().toISOString(),
    summary,
    entries: rows.slice(0, 100),
    nextCursor: rows[100]?.ordinal ?? null,
  })
}
