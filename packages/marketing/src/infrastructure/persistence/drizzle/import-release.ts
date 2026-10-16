import { createHash, randomUUID } from 'node:crypto'
import {
  canonicalJson,
  type ImportReleaseApply,
  type ImportReleasePreview,
  importProductAllowed,
  importReleasePreviewSchema,
  importReleaseSchema,
  importRunSchema,
} from '@sistemazero/marketing-contracts'
import { productionFolders } from '@sistemazero/marketing-import'
import { and, asc, desc, eq, gte, like, ne, notLike, sql } from 'drizzle-orm'
import { payloadHash } from '../../../application/workspace/workspace.service'
import { WorkspaceError } from '../../../domain/workspace/workspace-error'
import {
  projectAccess,
  receipt,
  recordChange,
  snapshotProjectAccess,
  type WorkspaceTransaction,
} from './workspace.repository'
import {
  editorialImportProducts as bindings,
  editorialImportDecisions as decisions,
  editorialImportEntries as entries,
  editorialImportProductionLinks as links,
  editorialReceipts as receipts,
  editorialImportReleases as releases,
  editorialImportProductionReports as reports,
  editorialImports as runs,
  editorialImportStructures as structures,
} from './workspace-schema'

const viewRun = (run: typeof runs.$inferSelect) =>
  importRunSchema.parse({
    ...run,
    capturedAt: run.capturedAt.toISOString(),
    createdAt: run.createdAt.toISOString(),
  })

/** A release records a complete disposition of this product's origins. Pending
 * editorial work remains visible; it never approves or publishes a piece. */
export async function previewImportRelease(
  tx: WorkspaceTransaction,
  actorId: string,
  projectId: string,
  runId: string,
): Promise<ImportReleasePreview> {
  await snapshotProjectAccess(tx, actorId, projectId)
  const [run] = await tx
    .select()
    .from(runs)
    .where(and(eq(runs.id, runId), eq(runs.projectId, projectId)))
  if (!run) throw new WorkspaceError('OBJECT_INACCESSIBLE', 'Carga não disponível neste projeto')
  const [binding] = await tx
    .select()
    .from(bindings)
    .where(and(eq(bindings.projectId, projectId), eq(bindings.origin, run.origin)))
  const [recent] = await tx
    .select()
    .from(runs)
    .where(
      and(eq(runs.projectId, projectId), eq(runs.origin, run.origin), ne(runs.state, 'retired')),
    )
    // Server registration order is authoritative across desktop clocks.
    .orderBy(desc(runs.createdAt), desc(runs.id))
    .limit(1)
  const verification = recent ?? run
  const blockers: string[] = []
  if (!binding) blockers.push('Vincule o produto desta origem ao projeto.')
  if (run.state !== 'inventoried') blockers.push('O inventário precisa estar completo e ativo.')
  if (verification.state !== 'inventoried')
    blockers.push('Conclua a nova leitura da pasta antes de liberar a carga.')
  if (verification.id === run.id)
    blockers.push(
      'Confira novamente a pasta no desktop para verificar mudanças desde a leitura desta carga.',
    )
  if (verification.digest !== run.digest)
    blockers.push(
      'A leitura mais recente mudou. Compare os inventários e reconcilie a nova carga antes de liberar.',
    )
  const summary: ImportReleasePreview['summary'] = {
    preserved: 0,
    deferred: 0,
    omitted: 0,
    pending: 0,
    excluded: 0,
    blocked: 0,
    otherProduct: 0,
    productionFolders: 0,
    productionReports: 0,
    productionLinked: 0,
    productionPending: 0,
    structuredGroups: 0,
    calendars: 0,
  }
  const hash = createHash('sha256').update(
    canonicalJson({
      version: 1,
      runId,
      digest: run.digest,
      state: run.state,
      verificationId: verification.id,
      verificationDigest: verification.digest,
      verificationState: verification.state,
      binding: binding?.revisionId ?? null,
    }),
  )
  const folders = new Set<string>()
  let cursor = 0
  for (;;) {
    const page = await tx
      .select({
        ordinal: entries.ordinal,
        source: entries.source,
        result: entries.result,
        decision: decisions.decision,
      })
      .from(entries)
      .leftJoin(
        decisions,
        and(eq(decisions.runId, entries.runId), eq(decisions.ordinal, entries.ordinal)),
      )
      .where(and(eq(entries.runId, runId), gte(entries.ordinal, cursor)))
      .orderBy(asc(entries.ordinal))
      .limit(500)
    for (const row of page) {
      if (row.ordinal !== cursor++)
        throw new WorkspaceError('IMPORT_CONFLICT', 'O inventário contém uma lacuna')
      // "imported" vs "reused" describes the request, not a change to the
      // preserved origin. A colleague replaying the same source must not
      // invalidate a release whose content, destinations and decisions match.
      hash.update(
        canonicalJson({
          ...row,
          result: row.result
            ? {
                sourceVersionId: row.result.sourceVersionId,
                sourceHash: row.result.sourceHash,
                destinations: row.result.destinations,
                previousSourceVersion: row.result.previousSourceVersion,
                classificationReview: row.result.classificationReview ?? false,
              }
            : null,
        }),
      )
      if (!binding || !importProductAllowed(binding, row.source.product)) {
        summary.otherProduct++
        continue
      }
      for (const folder of productionFolders([row.source])) folders.add(folder.path)
      if (row.result) summary.preserved++
      else if (row.source.disposition === 'excluded') summary.excluded++
      else if (row.source.disposition === 'blocked') summary.blocked++
      else if (row.decision?.state === 'deferred') summary.deferred++
      else if (row.decision?.state === 'omitted') summary.omitted++
      else summary.pending++
    }
    if (page.length < 500) break
  }
  if (cursor !== run.entryCount) blockers.push('Ainda faltam registros do inventário.')
  if (summary.pending)
    blockers.push(`${summary.pending} origens ainda precisam de destino ou decisão com motivo.`)
  if (!summary.preserved)
    blockers.push('Preserve conteúdo deste produto no projeto antes de liberar sua continuidade.')
  summary.productionFolders = folders.size
  const production = await tx
    .select({ id: reports.id, report: reports.report, link: links.link })
    .from(reports)
    .leftJoin(links, and(eq(links.reportId, reports.id), eq(links.projectId, projectId)))
    .where(and(eq(reports.projectId, projectId), eq(reports.runId, runId)))
    .orderBy(asc(reports.id))
  const coveredFolders = new Set<string>()
  for (const row of production) {
    if (!folders.has(row.report.review.folder.path)) continue
    if (coveredFolders.has(row.report.review.folder.path))
      throw new WorkspaceError(
        'IMPORT_CONFLICT',
        'Há conferências concorrentes da mesma pasta; reconcilie suas versões',
      )
    coveredFolders.add(row.report.review.folder.path)
    hash.update(canonicalJson(row))
    summary.productionReports++
    if (row.link) summary.productionLinked++
    else summary.productionPending++
  }
  if (coveredFolders.size !== folders.size)
    blockers.push(
      `${folders.size - coveredFolders.size} pastas de produção ainda precisam de conferência compartilhada.`,
    )
  const [structured] = await tx
    .select({ count: sql<number>`count(distinct ${structures.pieceId})`.mapWith(Number) })
    .from(structures)
    .where(
      and(
        eq(structures.projectId, projectId),
        notLike(structures.parserVersion, 'editorial-calendar-%'),
      ),
    )
  const [calendar] = await tx
    .select({ count: sql<number>`count(distinct ${structures.sourceVersionId})`.mapWith(Number) })
    .from(structures)
    .where(
      and(
        eq(structures.projectId, projectId),
        like(structures.parserVersion, 'editorial-calendar-%'),
      ),
    )
  summary.structuredGroups = structured?.count ?? 0
  summary.calendars = calendar?.count ?? 0
  const planHash = hash.update(canonicalJson(summary)).digest('hex')
  const [last] = await tx
    .select()
    .from(releases)
    .where(and(eq(releases.projectId, projectId), eq(releases.runId, runId)))
    .orderBy(desc(releases.createdAt), desc(releases.id))
    .limit(1)
  return importReleasePreviewSchema.parse({
    run: viewRun(run),
    verification: viewRun(verification),
    summary,
    planHash,
    blockers,
    latest: last?.release ?? null,
    state:
      run.state === 'retired'
        ? 'retired'
        : last
          ? last.release.planHash === planHash
            ? 'current'
            : 'changed'
          : 'preparing',
  })
}

export async function releaseImport(
  tx: WorkspaceTransaction,
  actorId: string,
  projectId: string,
  runId: string,
  input: ImportReleaseApply,
) {
  await projectAccess(tx, actorId, projectId, 'admin')
  const hash = payloadHash({ action: 'release-import', runId, input })
  const saved = await receipt(tx, projectId, actorId, input.operationId, hash)
  if (saved) return importReleaseSchema.parse(saved.result)
  const plan = await previewImportRelease(tx, actorId, projectId, runId)
  if (plan.planHash !== input.expectedPlanHash)
    throw new WorkspaceError(
      'IMPORT_CONFLICT',
      'A carga ou suas decisões mudaram. Confira novamente antes de liberar',
    )
  if (plan.blockers.length) throw new WorkspaceError('IMPORT_CONFLICT', plan.blockers.join(' '))
  let result = plan.latest?.planHash === plan.planHash ? plan.latest : null
  if (!result) {
    result = importReleaseSchema.parse({
      id: randomUUID(),
      projectId,
      inventoryId: runId,
      verifiedInventoryId: plan.verification.id,
      planHash: plan.planHash,
      summary: plan.summary,
      createdBy: actorId,
      createdAt: new Date().toISOString(),
    })
    await tx.insert(releases).values({
      id: result.id,
      projectId,
      runId,
      verifiedRunId: result.verifiedInventoryId,
      release: result,
      createdAt: new Date(result.createdAt),
    })
    await recordChange(tx, projectId, actorId, 'import', runId, null)
  }
  await tx
    .insert(receipts)
    .values({ projectId, actorId, operationId: input.operationId, hash, result })
  return result
}
