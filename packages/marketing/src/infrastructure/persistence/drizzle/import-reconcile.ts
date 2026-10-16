import { randomUUID } from 'node:crypto'
import {
  type ImportReconcileApply,
  importProductAllowed,
  importReconcileResultSchema,
  productionLinkSchema,
  productionReportSchema,
} from '@sistemazero/marketing-contracts'
import { productionCanonicalLocation } from '@sistemazero/marketing-import'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import { payloadHash } from '../../../application/workspace/workspace.service'
import { WorkspaceError } from '../../../domain/workspace/workspace-error'
import {
  projectAccess,
  receipt,
  recordChange,
  type WorkspaceTransaction,
} from './workspace.repository'
import {
  editorialImportProducts as bindings,
  editorialImportDecisions as decisions,
  editorialImportEntries as entries,
  editorialImportProductionLinks as links,
  editorialReceipts as receipts,
  editorialImportProductionReports as reports,
  editorialImports as runs,
} from './workspace-schema'

const conflict = (message: string) => new WorkspaceError('IMPORT_CONFLICT', message)
function count(value: unknown) {
  const [row] = z
    .array(z.object({ count: z.coerce.number().int().nonnegative() }))
    .length(1)
    .parse(value)
  if (!row) throw new Error('Contagem da reconciliação ausente')
  return row.count
}
const prefix = (value: string) => `${value.replace(/[\\%_]/g, '\\$&')}%`

/** Reuses receipts for identical origins under one project lock. Never rewrites
 * editorial items, approvals, original bytes, existing decisions or existing receipts. */
export async function reconcileImport(
  tx: WorkspaceTransaction,
  actorId: string,
  projectId: string,
  runId: string,
  input: ImportReconcileApply,
) {
  await projectAccess(tx, actorId, projectId, 'edit')
  const hash = payloadHash({ action: 'reconcile-import', runId, input })
  const saved = await receipt(tx, projectId, actorId, input.operationId, hash)
  if (saved) return importReconcileResultSchema.parse(saved.result)
  const found = await tx
    .select()
    .from(runs)
    .where(and(eq(runs.projectId, projectId), inArray(runs.id, [runId, input.previousId])))
  const current = found.find((row) => row.id === runId),
    previous = found.find((row) => row.id === input.previousId)
  if (!current || !previous)
    throw new WorkspaceError('OBJECT_INACCESSIBLE', 'Inventário não disponível neste projeto')
  if (
    current.id === previous.id ||
    current.origin !== previous.origin ||
    current.state !== 'inventoried' ||
    previous.state !== 'inventoried' ||
    current.digest !== input.currentDigest ||
    previous.digest !== input.previousDigest
  )
    throw conflict('Confira dois inventários completos da mesma origem, na ordem da carga')
  const order = count(
    await tx.execute(sql`SELECT count(*)::int AS count FROM ${runs} newer JOIN ${runs} older
    ON newer.created_at > older.created_at WHERE newer.id=${runId} AND older.id=${previous.id}`),
  )
  if (order !== 1) throw conflict('Confira os inventários na ordem de registro da carga')
  const [binding] = await tx
    .select()
    .from(bindings)
    .where(and(eq(bindings.projectId, projectId), eq(bindings.origin, current.origin)))
  if (!binding) throw conflict('Vincule o produto ao projeto antes de reconciliar')
  const products = binding.includeShared
    ? [...new Set([binding.product, 'shared'])]
    : [binding.product]
  const allowed = inArray(sql`target.source->>'product'`, products)
  const result = importReconcileResultSchema.parse({
    projectId,
    inventoryId: runId,
    previousId: previous.id,
    sources: 0,
    decisions: 0,
    reports: 0,
    links: 0,
    reportsPending: 0,
  })
  // UPDATE FROM uses the unique (run_id, source_path) index. Equality includes
  // classification, validity, disposition, bytes, kind and hash, not hash alone.
  result.sources = count(
    await tx.execute(sql`WITH copied AS (
    UPDATE ${entries} AS target SET result = old.result || '{"status":"reused"}'::jsonb
    FROM ${entries} AS old
    WHERE target.run_id = ${runId} AND old.run_id = ${previous.id}
      AND target.source_path = old.source_path AND target.source = old.source
      AND target.result IS NULL AND old.result IS NOT NULL AND ${allowed}
      AND target.source->>'disposition' IN ('eligible', 'review')
      AND NOT EXISTS (SELECT 1 FROM ${decisions} d WHERE d.run_id=target.run_id AND d.ordinal=target.ordinal)
    RETURNING target.ordinal
  ) SELECT count(*)::int AS count FROM copied`),
  )
  result.decisions = count(
    await tx.execute(sql`WITH copied AS (
    INSERT INTO ${decisions} (run_id, ordinal, decision)
    SELECT target.run_id, target.ordinal, d.decision || jsonb_build_object(
      'inventoryId', ${runId}::text, 'ordinal', target.ordinal, 'revisionId', gen_random_uuid()::text,
      'decidedBy', ${actorId}::text, 'decidedAt', ${new Date().toISOString()}::text,
      'inheritedFrom', jsonb_build_object('inventoryId', ${previous.id}::text, 'ordinal', old.ordinal, 'revisionId', d.decision->>'revisionId'))
    FROM ${entries} target JOIN ${entries} old ON old.run_id=${previous.id} AND old.source_path=target.source_path
    JOIN ${decisions} d ON d.run_id=old.run_id AND d.ordinal=old.ordinal
    WHERE target.run_id=${runId} AND target.source=old.source AND target.result IS NULL AND ${allowed}
      AND target.source->>'disposition' IN ('eligible', 'review') AND d.decision->>'state' IN ('omitted', 'deferred')
    ON CONFLICT (run_id, ordinal) DO NOTHING RETURNING ordinal
  ) SELECT count(*)::int AS count FROM copied`),
  )
  const priorReports = await tx
    .select({ report: reports.report, link: links.link })
    .from(reports)
    .leftJoin(links, and(eq(links.reportId, reports.id), eq(links.projectId, projectId)))
    .where(and(eq(reports.runId, previous.id), eq(reports.projectId, projectId)))
    .limit(1001)
  if (priorReports.length > 1000) throw conflict('Reconcilie conjuntos com até 1.000 conferências')
  for (const row of priorReports) {
    const original = productionReportSchema.parse(row.report)
    if (!importProductAllowed(binding, original.review.folder.product)) continue
    const [exists] = await tx
      .select({ id: reports.id })
      .from(reports)
      .where(
        and(
          eq(reports.runId, runId),
          sql`${reports.report}->'review'->'folder'->>'path'=${original.review.folder.path}`,
        ),
      )
      .limit(1)
    if (exists) continue
    const canonical = productionCanonicalLocation(original.review.folder)
    // Compare the entire relevant folder and canonical-copy namespace. A newly
    // added alternative, removed file or changed classification invalidates reuse.
    const scope = sql`(source_path LIKE ${prefix(`${original.review.folder.path}/`)} OR ${
      canonical.endsWith('/')
        ? sql`source_path LIKE ${prefix(canonical)}`
        : sql`source_path=${canonical}`
    })`
    const changed = count(
      await tx.execute(sql`WITH before_sources AS (
      SELECT source_path, source FROM ${entries} WHERE run_id=${previous.id} AND ${scope}
    ), after_sources AS (
      SELECT source_path, source FROM ${entries} WHERE run_id=${runId} AND ${scope}
    ) SELECT count(*)::int AS count FROM before_sources b FULL JOIN after_sources a USING(source_path)
      WHERE b.source IS DISTINCT FROM a.source`),
    )
    const destinations = await tx
      .select({ path: entries.sourcePath, result: entries.result })
      .from(entries)
      .where(
        and(
          eq(entries.runId, runId),
          inArray(
            entries.sourcePath,
            original.sources.map((source) => source.path),
          ),
        ),
      )
    if (
      changed ||
      original.sources.some(
        (source) =>
          !destinations.some(
            (target) =>
              target.path === source.path &&
              target.result?.sourceVersionId === source.sourceVersionId &&
              target.result.sourceHash === source.sha256,
          ),
      )
    ) {
      result.reportsPending++
      continue
    }
    const report = productionReportSchema.parse({
      ...original,
      id: randomUUID(),
      inventoryId: runId,
      inventoryDigest: current.digest,
      createdBy: actorId,
      createdAt: new Date().toISOString(),
      inheritedFrom: { inventoryId: previous.id, reportId: original.id },
    })
    await tx.insert(reports).values({ id: report.id, projectId, runId, report })
    result.reports++
    if (row.link) {
      const originalLink = productionLinkSchema.parse(row.link)
      const link = productionLinkSchema.parse({
        ...originalLink,
        reportId: report.id,
        inheritedFrom: original.id,
      })
      await tx.insert(links).values({ reportId: report.id, projectId, link })
      result.links++
    }
  }
  await tx
    .insert(receipts)
    .values({ projectId, actorId, operationId: input.operationId, hash, result })
  await recordChange(tx, projectId, actorId, 'import', runId, null)
  return result
}
