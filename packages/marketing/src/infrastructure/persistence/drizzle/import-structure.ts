import { createHash, randomUUID } from 'node:crypto'
import {
  batchOperationSchema,
  canonicalJson,
  type EditorialBatch,
  type ImportStructureApply,
  type ImportStructurePreview,
  type ImportStructureResult,
  importStructureResultSchema,
  stableEditorialId,
} from '@sistemazero/marketing-contracts'
import {
  parseStructuredCopy,
  type SourcePiece,
  structuredCopyVersion,
  structuredDocuments,
} from '@sistemazero/marketing-import'
import { and, desc, eq, inArray, like } from 'drizzle-orm'
import { WorkspaceError } from '../../../domain/workspace/workspace-error'
import type { Database } from './db'
import { legacyImportIdentity } from './import-legacy-identity'
import { importSourceText } from './import-source-text'
import {
  DrizzleWorkspaceRepository,
  projectAccess,
  receipt,
  recordChange,
  type WorkspaceTransaction,
} from './workspace.repository'
import {
  editorialItems as items,
  editorialImportStructures as mappings,
  editorialReceipts as receipts,
  editorialRevisions as revisions,
  type editorialImportSourceVersions as sources,
} from './workspace-schema'

const conflict = (message: string) => new WorkspaceError('IMPORT_CONFLICT', message)
const hash = (value: unknown) => createHash('sha256').update(canonicalJson(value)).digest('hex')
async function sourceText(tx: WorkspaceTransaction, projectId: string, sourceId: string) {
  const { source, historical, text } = await importSourceText(tx, projectId, sourceId)
  return { source, historical, parsed: parseStructuredCopy(text) }
}
type Mapping = typeof mappings.$inferSelect
async function mappingState(
  tx: WorkspaceTransaction,
  projectId: string,
  sourceId: string,
  pieceId: string,
  legacy: Awaited<ReturnType<typeof legacyImportIdentity>>,
) {
  const [latestRow] = await tx
    .select()
    .from(mappings)
    .where(
      and(
        eq(mappings.projectId, projectId),
        eq(mappings.pieceId, pieceId),
        like(mappings.parserVersion, 'editorial-markdown-%'),
      ),
    )
    .orderBy(desc(mappings.sequence))
    .limit(1)
  const [same] = await tx
    .select()
    .from(mappings)
    .where(
      and(
        eq(mappings.projectId, projectId),
        eq(mappings.pieceId, pieceId),
        eq(mappings.sourceVersionId, sourceId),
        eq(mappings.parserVersion, structuredCopyVersion),
      ),
    )
    .limit(1)
  const latest = latestRow ?? null
  if (same) return { state: 'imported' as const, latest, same, current: [] }
  if (!latest) {
    if (legacy)
      return {
        state: legacy.intact ? ('update' as const) : ('conflict' as const),
        latest: null,
        same: null,
        current: legacy.current,
      }
    const occupied = await tx
      .select({ id: items.id })
      .from(items)
      .where(eq(items.id, pieceId))
      .limit(1)
    return {
      state: occupied.length ? ('conflict' as const) : ('new' as const),
      latest,
      same: null,
      current: [],
    }
  }
  const current = await tx
    .select({
      id: items.id,
      revisionId: items.revisionId,
      archived: items.archived,
      document: items.document,
    })
    .from(items)
    .where(
      and(
        eq(items.projectId, projectId),
        inArray(
          items.id,
          latest.destinations.map((value) => value.entityId),
        ),
      ),
    )
  const baselineId = latest.destinations.find((value) => value.entityId === pieceId)?.revisionId
  const [baseline] = baselineId
    ? await tx
        .select({ document: revisions.document })
        .from(revisions)
        .where(
          and(
            eq(revisions.projectId, projectId),
            eq(revisions.entityId, pieceId),
            eq(revisions.id, baselineId),
          ),
        )
    : []
  const intact = latest.destinations.every((value) => {
    const item = current.find((item) => item.id === value.entityId)
    if (!item || item.archived) return false
    if (item.revisionId === value.revisionId) return true
    // Calendar fields have a separate owner. A copy delta must neither erase them nor require undoing them.
    if (
      item.id === pieceId &&
      item.document.kind === 'piece' &&
      baseline?.document.kind === 'piece'
    ) {
      const { week, position, editorialDate } = item.document
      return (
        canonicalJson({ ...baseline.document, week, position, editorialDate }) ===
        canonicalJson(item.document)
      )
    }
    return false
  })
  return {
    state: intact ? ('update' as const) : ('conflict' as const),
    latest,
    same: null,
    current,
  }
}
async function documents(
  tx: WorkspaceTransaction,
  projectId: string,
  source: typeof sources.$inferSelect,
  historical: boolean,
  piece: SourcePiece,
) {
  const legacy = await legacyImportIdentity(tx, projectId, source.origin, source.sourcePath, piece)
  const generated = await structuredDocuments({
    projectId,
    origin: source.origin,
    sourcePath: source.sourcePath,
    piece,
    evidence: source.destinations,
    historical,
    identities: legacy?.identities,
  })
  for (const item of generated.documents)
    if (item.document.kind === 'piece' && legacy)
      item.document.evidenceIds = [
        ...new Set([...legacy.evidenceIds, ...item.document.evidenceIds]),
      ]
  return { ...generated, legacy }
}
export async function previewStructure(
  tx: WorkspaceTransaction,
  actorId: string,
  projectId: string,
  sourceId: string,
): Promise<ImportStructurePreview> {
  await projectAccess(tx, actorId, projectId, 'read')
  const { source, historical, parsed } = await sourceText(tx, projectId, sourceId)
  const pieces: ImportStructurePreview['pieces'] = []
  for (const piece of parsed.pieces) {
    const generated = await documents(tx, projectId, source, historical, piece)
    const state = await mappingState(tx, projectId, sourceId, generated.pieceId, generated.legacy)
    pieces.push({
      key: piece.key,
      title: piece.title,
      format: piece.format,
      components: piece.components.length,
      directMessages: piece.components.filter((value) => value.channel === 'direct').length,
      pieceId: generated.pieceId,
      mappingId: state.latest?.id ?? null,
      state: state.state,
    })
  }
  return {
    sourceVersionId: source.id,
    sourceHash: source.sourceHash,
    sourcePath: source.sourcePath,
    parserVersion: parsed.parserVersion,
    pieces,
    issues: parsed.issues,
  }
}
export async function applyStructure(
  db: Database,
  tx: WorkspaceTransaction,
  actorId: string,
  projectId: string,
  input: ImportStructureApply,
): Promise<ImportStructureResult> {
  await projectAccess(tx, actorId, projectId, 'edit')
  const operationHash = hash(input),
    saved = await receipt(tx, projectId, actorId, input.operationId, operationHash)
  if (saved) return importStructureResultSchema.parse(saved.result)
  if (input.parserVersion !== structuredCopyVersion)
    throw conflict('A conversão foi atualizada; confira a prévia novamente')
  const { source, historical, parsed } = await sourceText(tx, projectId, input.sourceVersionId)
  const piece = parsed.pieces.find((piece) => piece.key === input.key)
  if (!piece) throw conflict('Peça não reconhecida nesta versão da origem')
  const generated = await documents(tx, projectId, source, historical, piece)
  const state = await mappingState(tx, projectId, source.id, generated.pieceId, generated.legacy)
  let result: ImportStructureResult
  if (state.same)
    result = {
      status: 'reused',
      pieceId: generated.pieceId,
      mappingId: state.same.id,
      message: 'Origem já convertida. Edições da equipe foram preservadas.',
    }
  else if (state.state === 'conflict' || (state.latest?.id ?? null) !== input.expectedMappingId)
    result = {
      status: 'conflict',
      pieceId: generated.pieceId,
      mappingId: state.latest?.id ?? null,
      message:
        'A peça mudou desde a carga anterior. Compare as versões antes de substituir o trabalho da equipe.',
    }
  else {
    const previous = new Map(state.current.map((item) => [item.id, item]))
    const changes: EditorialBatch['changes'] = generated.documents.map((value) => {
      const current = previous.get(value.id),
        document = value.document
      return {
        entityId: value.id,
        baseRevisionId: current?.revisionId ?? null,
        action: 'save',
        document:
          document.kind === 'piece' && current?.document.kind === 'piece'
            ? {
                ...document,
                week: current.document.week,
                position: current.document.position,
                editorialDate: current.document.editorialDate,
              }
            : document,
      }
    })
    for (const value of state.latest?.destinations ?? generated.legacy?.destinations ?? [])
      if (!generated.documents.some((document) => document.id === value.entityId))
        changes.push({
          entityId: value.entityId,
          baseRevisionId: value.revisionId,
          action: 'archive',
        })
    const batch = batchOperationSchema.parse({
      schemaVersion: 1,
      projectId,
      operationId: await stableEditorialId(`${input.operationId}:structure`),
      changes,
    })
    const applied = await new DrizzleWorkspaceRepository(db).applyBatchInTransaction(
      tx,
      actorId,
      batch,
      hash(batch),
    )
    if (applied.status !== 'applied')
      throw conflict('Identidade ocupada; a peça existente foi preservada')
    const id = randomUUID(),
      sequence = await recordChange(tx, projectId, actorId, 'import', source.id, null)
    const mapping: Omit<Mapping, 'createdAt'> = {
      id,
      projectId,
      sourceVersionId: source.id,
      pieceId: generated.pieceId,
      sectionKey: piece.key,
      parserVersion: structuredCopyVersion,
      sequence,
      destinations: applied.items
        .filter((item) => !item.archived)
        .map((item) => ({ entityId: item.id, revisionId: item.revisionId })),
    }
    await tx.insert(mappings).values(mapping)
    result = {
      status: 'applied',
      pieceId: generated.pieceId,
      mappingId: id,
      message:
        generated.legacy && !state.latest
          ? 'Peça existente reconciliada, com IDs e planejamento preservados.'
          : state.latest
            ? 'Nova versão da fonte aplicada à peça, com histórico preservado.'
            : 'Peça editável criada em preparação, com origem preservada.',
    }
  }
  await tx
    .insert(receipts)
    .values({ projectId, actorId, operationId: input.operationId, hash: operationHash, result })
  return result
}
