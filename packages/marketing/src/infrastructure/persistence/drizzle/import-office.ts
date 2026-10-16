import { createHash } from 'node:crypto'
import {
  batchOperationSchema,
  canonicalJson,
  type EditorialDocument,
  type ImportOfficeApply,
  importOfficeViewSchema,
  isImportSourceAsset,
  stableEditorialId,
} from '@sistemazero/marketing-contracts'
import { extractOfficeText, officeTextVersion } from '@sistemazero/marketing-import/office'
import { and, eq, inArray } from 'drizzle-orm'
import { WorkspaceError } from '../../../domain/workspace/workspace-error'
import type { Database } from './db'
import { requireImportedSourceProduct } from './import-product'
import {
  DrizzleWorkspaceRepository,
  projectAccess,
  receipt,
  snapshotProjectAccess,
  type WorkspaceTransaction,
} from './workspace.repository'
import {
  editorialAssets as assets,
  editorialImportOfficeTexts as extractions,
  editorialReceipts as receipts,
  editorialRevisions as revisions,
  editorialImportSourceVersions as sources,
} from './workspace-schema'

const conflict = (message: string) => new WorkspaceError('IMPORT_CONFLICT', message)
async function officeSource(tx: WorkspaceTransaction, projectId: string, sourceId: string) {
  const [source] = await tx
    .select()
    .from(sources)
    .where(and(eq(sources.projectId, projectId), eq(sources.id, sourceId)))
  if (!source)
    throw new WorkspaceError('OBJECT_INACCESSIBLE', 'Origem não disponível neste projeto')
  await requireImportedSourceProduct(tx, source)
  if (!/\.(docx|xlsx)$/i.test(source.sourcePath))
    throw conflict('Esta origem não é um documento Office compatível')
  const preserved = await tx
    .select()
    .from(revisions)
    .where(
      and(
        eq(revisions.projectId, projectId),
        inArray(
          revisions.id,
          source.destinations.map((value) => value.revisionId),
        ),
      ),
    )
  const original = preserved.find((row) => row.document.kind === 'evidence')?.document
  if (original?.kind !== 'evidence' || original.assetIds?.length !== 1)
    throw conflict('Original Office não preservado')
  const [asset] = await tx
    .select()
    .from(assets)
    .where(and(eq(assets.projectId, projectId), eq(assets.id, original.assetIds[0] ?? '')))
  if (
    !asset?.confirmed ||
    asset.manifest.projectId !== projectId ||
    !isImportSourceAsset(asset.manifest) ||
    asset.manifest.sha256 !== source.sourceHash
  )
    throw conflict('Confirme o arquivo Office original antes de extrair o texto')
  return {
    source,
    original,
    asset,
    sourceKey: `${source.origin}:${source.sourcePath}#${officeTextVersion}`,
  }
}
export async function viewOfficeText(
  tx: WorkspaceTransaction,
  actorId: string,
  projectId: string,
  sourceId: string,
) {
  await snapshotProjectAccess(tx, actorId, projectId)
  const value = await officeSource(tx, projectId, sourceId)
  const [extraction] = await tx
    .select()
    .from(extractions)
    .where(
      and(
        eq(extractions.projectId, projectId),
        eq(extractions.sourceVersionId, sourceId),
        eq(extractions.parserVersion, officeTextVersion),
      ),
    )
  return importOfficeViewSchema.parse({
    sourceVersionId: sourceId,
    sourcePath: value.source.sourcePath,
    sourceHash: value.source.sourceHash,
    assetId: value.asset.id,
    size: value.asset.manifest.size,
    parserVersion: officeTextVersion,
    destinations: extraction?.destinations ?? [],
    notes: extraction?.notes ?? [
      'Texto extraído como referência separada. O original permanece preservado; layout e imagens não são reproduzidos. Fórmulas não são executadas.',
    ],
  })
}
export async function applyOfficeText(
  db: Database,
  tx: WorkspaceTransaction,
  actorId: string,
  projectId: string,
  sourceId: string,
  input: ImportOfficeApply,
) {
  await projectAccess(tx, actorId, projectId, 'edit')
  const hash = createHash('sha256')
    .update(canonicalJson({ sourceId, input, action: officeTextVersion }))
    .digest('hex')
  const saved = await receipt(tx, projectId, actorId, input.operationId, hash)
  if (saved) return importOfficeViewSchema.parse(saved.result)
  const value = await officeSource(tx, projectId, sourceId)
  const bytes = Buffer.from(input.base64, 'base64')
  if (
    bytes.toString('base64') !== input.base64 ||
    bytes.length !== value.asset.manifest.size ||
    createHash('sha256').update(bytes).digest('hex') !== value.source.sourceHash
  )
    throw conflict('O arquivo da extração diverge do original preservado')
  let extracted: ReturnType<typeof extractOfficeText>
  try {
    extracted = extractOfficeText(bytes, value.source.sourcePath)
  } catch (error) {
    throw conflict(error instanceof Error ? error.message : 'Falha ao extrair o texto Office')
  }
  const before = await viewOfficeText(tx, actorId, projectId, sourceId)
  if (!before.destinations.length) {
    const documents: Array<{
      entityId: string
      baseRevisionId: null
      action: 'save'
      document: EditorialDocument
    }> = []
    let rest = extracted.text
    while (rest.length) {
      let end = Math.min(rest.length, 99000)
      if (/^[\uD800-\uDBFF]$/.test(rest.charAt(end - 1))) end--
      const body = rest.slice(0, end)
      rest = rest.slice(end)
      const part = documents.length
      documents.push({
        entityId: await stableEditorialId(`${projectId}:${sourceId}:${officeTextVersion}:${part}`),
        baseRevisionId: null,
        action: 'save',
        document: {
          ...value.original,
          title: `${value.original.title.slice(0, 250)} · texto extraído ${part + 1}`,
          body: `${body}\n\n[Extração ${officeTextVersion}] ${extracted.notes.join(' ')}`,
          source: { ...value.original.source, sourceKey: value.sourceKey },
          tags: [...new Set([...value.original.tags, officeTextVersion, 'texto-extraido'])],
        },
      })
    }
    const batch = batchOperationSchema.parse({
      schemaVersion: 1,
      projectId,
      operationId: await stableEditorialId(`${input.operationId}:office-text`),
      changes: documents,
    })
    const applied = await new DrizzleWorkspaceRepository(db).applyBatchInTransaction(
      tx,
      actorId,
      batch,
      createHash('sha256').update(canonicalJson(batch)).digest('hex'),
    )
    if (applied.status !== 'applied')
      throw conflict('A referência já mudou; o trabalho da equipe foi preservado')
    await tx.insert(extractions).values({
      projectId,
      sourceVersionId: sourceId,
      parserVersion: officeTextVersion,
      textHash: createHash('sha256').update(extracted.text).digest('hex'),
      destinations: applied.items.map((item) => ({
        entityId: item.id,
        revisionId: item.revisionId,
      })),
      notes: extracted.notes,
      createdBy: actorId,
    })
  }
  const result = await viewOfficeText(tx, actorId, projectId, sourceId)
  await tx
    .insert(receipts)
    .values({ projectId, actorId, operationId: input.operationId, hash, result })
  return result
}
