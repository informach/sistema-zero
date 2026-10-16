import { randomUUID } from 'node:crypto'
import {
  type ImportProductionShare,
  type ProductionReport,
  productionReportSchema,
} from '@sistemazero/marketing-contracts'
import {
  productionCanonicalLocation,
  productionFolderFromPath,
  productionInputs,
  productionReviewFromTexts,
} from '@sistemazero/marketing-import'
import { and, asc, eq, gt, inArray, like, or, sql } from 'drizzle-orm'
import { payloadHash } from '../../../application/workspace/workspace.service'
import { WorkspaceError } from '../../../domain/workspace/workspace-error'
import { requireImportProduct } from './import-product'
import { importSourceText } from './import-source-text'
import {
  projectAccess,
  receipt,
  recordChange,
  type WorkspaceTransaction,
} from './workspace.repository'
import {
  editorialAssets as assets,
  editorialImportEntries as entries,
  editorialReceipts as receipts,
  editorialImportProductionReports as reports,
  editorialRevisions as revisions,
  editorialImports as runs,
  editorialImportSourceVersions as versions,
} from './workspace-schema'

const conflict = (message: string) => new WorkspaceError('IMPORT_CONFLICT', message)
const prefix = (value: string) => `${value.replace(/[\\%_]/g, '\\$&')}%`

export async function shareProduction(
  tx: WorkspaceTransaction,
  actorId: string,
  projectId: string,
  runId: string,
  input: ImportProductionShare,
) {
  await projectAccess(tx, actorId, projectId, 'edit')
  const hash = payloadHash({ action: 'share-import-production', runId, input })
  const saved = await receipt(tx, projectId, actorId, input.operationId, hash)
  if (saved) return productionReportSchema.parse(saved.result)
  const [run] = await tx
    .select()
    .from(runs)
    .where(and(eq(runs.id, runId), eq(runs.projectId, projectId)))
  if (run?.state !== 'inventoried' || run.origin !== 'sistema-zero')
    throw conflict('Confirme o inventário desta origem antes de compartilhar a conferência')
  const identified = productionFolderFromPath(input.folderPath)
  if (!identified) throw conflict('Pasta de produção fora do formato reconhecido')
  const canonical = productionCanonicalLocation(identified)
  await requireImportProduct(tx, projectId, run.origin, identified.product)
  const rows = await tx
    .select()
    .from(entries)
    .where(
      and(
        eq(entries.runId, runId),
        or(
          like(entries.sourcePath, prefix(`${input.folderPath}/`)),
          canonical.endsWith('/')
            ? like(entries.sourcePath, prefix(canonical))
            : eq(entries.sourcePath, canonical),
        ),
      ),
    )
    .orderBy(asc(entries.ordinal))
    .limit(3001)
  if (rows.length > 3000) throw conflict('A pasta e suas fontes excedem o limite de conferência')
  const inventory = rows.map((value) => value.source)
  let inputs: ReturnType<typeof productionInputs>
  try {
    inputs = productionInputs(inventory, input.folderPath)
  } catch (error) {
    throw conflict(error instanceof Error ? error.message : 'Origens de produção inválidas')
  }
  const { folder, selected } = inputs
  const texts = new Map<string, string>()
  const sources: ProductionReport['sources'] = []
  for (const { source, kind } of selected) {
    const row = rows.find((value) => value.sourcePath === source.path)
    if (!row?.result || !source.sha256 || row.result.sourceHash !== source.sha256)
      throw conflict(`Origem ainda não carregada: ${source.path}`)
    const [version] = await tx
      .select()
      .from(versions)
      .where(and(eq(versions.id, row.result.sourceVersionId), eq(versions.projectId, projectId)))
    if (
      !version ||
      version.origin !== run.origin ||
      version.sourcePath !== source.path ||
      version.sourceHash !== source.sha256
    )
      throw conflict('A versão preservada diverge do inventário')
    let assetId: string | null = null
    if (kind === 'media') {
      const originals = await tx
        .select({ document: revisions.document })
        .from(revisions)
        .where(
          and(
            eq(revisions.projectId, projectId),
            inArray(
              revisions.id,
              version.destinations.map((value) => value.revisionId),
            ),
          ),
        )
      const ids = originals.flatMap(({ document }) =>
        document.kind === 'evidence' ? (document.assetIds ?? []) : [],
      )
      if (ids.length !== 1 || !ids[0])
        throw conflict(`Arquivo original não vinculado: ${source.path}`)
      const [asset] = await tx
        .select()
        .from(assets)
        .where(
          and(eq(assets.id, ids[0]), eq(assets.projectId, projectId), eq(assets.confirmed, true)),
        )
      if (
        asset?.manifest.role !== 'original' ||
        asset.manifest.sha256 !== source.sha256 ||
        asset.manifest.size !== source.bytes
      )
        throw conflict(`Original não confirmado ou divergente: ${source.path}`)
      assetId = asset.id
    } else {
      const preserved = await importSourceText(tx, projectId, version.id)
      texts.set(source.path, preserved.text)
    }
    sources.push({ path: source.path, sourceVersionId: version.id, sha256: source.sha256, assetId })
  }
  let review: ProductionReport['review']
  try {
    review = productionReviewFromTexts(folder, inventory, texts)
  } catch (error) {
    throw conflict(error instanceof Error ? error.message : 'Conferência inválida')
  }
  // projectAccess holds the project lock for this transaction. Sharing the same
  // immutable folder from another device/person therefore reuses one report,
  // while retaining an operation receipt for each actor. Revalidation above is
  // still mandatory for a new operation; a persisted receipt is read-only reuse.
  const existing = await tx
    .select({ report: reports.report })
    .from(reports)
    .where(
      and(
        eq(reports.projectId, projectId),
        eq(reports.runId, runId),
        sql`${reports.report}->'review'->'folder'->>'path' = ${folder.path}`,
        sql`${reports.report}->'review'->>'parserVersion' = ${review.parserVersion}`,
      ),
    )
    .limit(2)
  if (existing.length > 1)
    throw conflict(
      'Há conferências repetidas desta pasta; preserve os registros e confira seus vínculos',
    )
  if (existing[0]) {
    const report = productionReportSchema.parse(existing[0].report)
    if (
      report.inventoryDigest !== run.digest ||
      payloadHash({ review: report.review, sources: report.sources }) !==
        payloadHash({ review, sources })
    )
      throw conflict(
        'A conferência existente diverge das origens; preserve-a e registre um novo inventário',
      )
    await tx
      .insert(receipts)
      .values({ projectId, actorId, operationId: input.operationId, hash, result: report })
    return report
  }
  const report = productionReportSchema.parse({
    id: randomUUID(),
    projectId,
    inventoryId: runId,
    inventoryDigest: run.digest,
    createdBy: actorId,
    createdAt: new Date().toISOString(),
    review,
    sources,
  })
  await tx.insert(reports).values({ id: report.id, projectId, runId, report })
  await tx
    .insert(receipts)
    .values({ projectId, actorId, operationId: input.operationId, hash, result: report })
  await recordChange(tx, projectId, actorId, 'import', report.id, null)
  return report
}

export async function productionReports(
  tx: WorkspaceTransaction,
  actorId: string,
  projectId: string,
  runId: string,
  after: string | null,
) {
  await projectAccess(tx, actorId, projectId, 'read')
  const [run] = await tx
    .select({ id: runs.id })
    .from(runs)
    .where(and(eq(runs.projectId, projectId), eq(runs.id, runId)))
  if (!run)
    throw new WorkspaceError('OBJECT_INACCESSIBLE', 'Inventário não disponível neste projeto')
  const rows = await tx
    .select({ report: reports.report })
    .from(reports)
    .where(
      and(
        eq(reports.projectId, projectId),
        eq(reports.runId, runId),
        after ? gt(reports.id, after) : undefined,
      ),
    )
    .orderBy(asc(reports.id))
    .limit(51)
  const items = rows.slice(0, 50).map(({ report }) => productionReportSchema.parse(report))
  return { items, nextCursor: rows.length > 50 ? (items.at(-1)?.id ?? null) : null }
}
