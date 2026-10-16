import { createHash, randomUUID } from 'node:crypto'
import {
  batchOperationSchema,
  canonicalJson,
  type ImportCalendarApply,
  type ImportCalendarPreview,
  type ImportCalendarResult,
  importCalendarResultSchema,
  stableEditorialId,
} from '@sistemazero/marketing-contracts'
import { parseStructuredCalendar, structuredCalendarVersion } from '@sistemazero/marketing-import'
import { and, desc, eq, like, sql } from 'drizzle-orm'
import { WorkspaceError } from '../../../domain/workspace/workspace-error'
import type { Database } from './db'
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

const hash = (value: unknown) => createHash('sha256').update(canonicalJson(value)).digest('hex')
type Entry = ReturnType<typeof parseStructuredCalendar>[number]
async function calendarEntry(
  tx: WorkspaceTransaction,
  projectId: string,
  source: typeof sources.$inferSelect,
  historical: boolean,
  entry: Entry,
) {
  // An exact source identity is mandatory. Titles and short codes alone can refer to another product.
  const candidates = await tx
    .select()
    .from(items)
    .where(
      and(
        eq(items.projectId, projectId),
        eq(items.kind, 'piece'),
        eq(items.archived, false),
        sql`${items.document}->>'sourceKey' = ${entry.sourceKey}`,
      ),
    )
    .limit(2)
  const piece = candidates.length === 1 ? candidates[0] : undefined
  const document = piece?.document.kind === 'piece' ? piece.document : undefined
  const [latest] = piece
    ? await tx
        .select()
        .from(mappings)
        .where(
          and(
            eq(mappings.projectId, projectId),
            eq(mappings.pieceId, piece.id),
            like(mappings.parserVersion, 'editorial-calendar-%'),
          ),
        )
        .orderBy(desc(mappings.sequence))
        .limit(1)
    : []
  const [same] = piece
    ? await tx
        .select()
        .from(mappings)
        .where(
          and(
            eq(mappings.projectId, projectId),
            eq(mappings.pieceId, piece.id),
            eq(mappings.sourceVersionId, source.id),
            eq(mappings.parserVersion, structuredCalendarVersion),
          ),
        )
        .limit(1)
    : []
  let state: ImportCalendarPreview['entries'][number]['state'] = 'new'
  let message = 'Vincula a semana e a posição sugeridas. A data e a copy são preservadas.'
  if (historical) {
    state = 'historical'
    message = 'Calendário histórico preservado para consulta; não altera o planejamento atual.'
  } else if (candidates.length > 1) {
    state = 'ambiguous'
    message = 'Mais de uma peça corresponde à origem. Resolva a duplicidade antes de vincular.'
  } else if (!piece || !document) {
    state = 'missing'
    message = 'Converta primeiro a copy indicada nesta referência.'
  } else if (same) {
    state = 'imported'
    message = 'Esta versão já foi vinculada. Alterações posteriores da equipe são preservadas.'
  } else if (latest) {
    const destination = latest.destinations.find((value) => value.entityId === piece.id)
    const [baseline] = destination
      ? await tx
          .select({ document: revisions.document })
          .from(revisions)
          .where(
            and(
              eq(revisions.projectId, projectId),
              eq(revisions.entityId, piece.id),
              eq(revisions.id, destination.revisionId),
            ),
          )
      : []
    if (
      baseline?.document.kind === 'piece' &&
      baseline.document.week === document.week &&
      baseline.document.position === document.position
    )
      state = 'update'
    else {
      state = 'conflict'
      message = 'A equipe alterou a semana ou a ordem. O planejamento do app foi preservado.'
    }
  } else if (document.week !== null || document.position !== 0) {
    if (document.week !== entry.week || document.position !== entry.position) {
      state = 'conflict'
      message = 'A peça já tem outro planejamento. Confira antes de substituir.'
    }
  }
  return {
    piece,
    latest,
    same,
    view: {
      key: entry.sourceId,
      title: entry.title,
      week: entry.week,
      position: entry.position,
      sourceKey: entry.sourceKey,
      pieceId: piece?.id ?? null,
      revisionId: piece?.revisionId ?? null,
      currentWeek: document?.week ?? null,
      currentPosition: document?.position ?? null,
      mappingId: latest?.id ?? null,
      state,
      message,
    },
  }
}
export async function previewCalendar(
  tx: WorkspaceTransaction,
  actorId: string,
  projectId: string,
  sourceId: string,
): Promise<ImportCalendarPreview> {
  await projectAccess(tx, actorId, projectId, 'read')
  const { source, text, historical } = await importSourceText(tx, projectId, sourceId)
  const entries: ImportCalendarPreview['entries'] = []
  for (const entry of parseStructuredCalendar(text, source.origin, source.sourcePath))
    entries.push((await calendarEntry(tx, projectId, source, historical, entry)).view)
  return {
    sourceVersionId: source.id,
    sourceHash: source.sourceHash,
    sourcePath: source.sourcePath,
    parserVersion: structuredCalendarVersion,
    historical,
    entries,
  }
}
export async function applyCalendar(
  db: Database,
  tx: WorkspaceTransaction,
  actorId: string,
  projectId: string,
  input: ImportCalendarApply,
): Promise<ImportCalendarResult> {
  await projectAccess(tx, actorId, projectId, 'edit')
  const operationHash = hash(input),
    saved = await receipt(tx, projectId, actorId, input.operationId, operationHash)
  if (saved) return importCalendarResultSchema.parse(saved.result)
  if (input.parserVersion !== structuredCalendarVersion)
    throw new WorkspaceError('IMPORT_CONFLICT', 'Confira novamente a prévia do calendário')
  const { source, text, historical } = await importSourceText(tx, projectId, input.sourceVersionId)
  const entry = parseStructuredCalendar(text, source.origin, source.sourcePath).find(
    (entry) => entry.sourceId === input.key,
  )
  if (!entry) throw new WorkspaceError('IMPORT_CONFLICT', 'Pauta não reconhecida neste calendário')
  const state = await calendarEntry(tx, projectId, source, historical, entry),
    { piece } = state
  let result: ImportCalendarResult
  if (!piece || piece.id !== input.pieceId || piece.document.kind !== 'piece')
    throw new WorkspaceError(
      'IMPORT_CONFLICT',
      'A peça não corresponde à referência exata do calendário',
    )
  if (state.same)
    result = {
      status: 'reused',
      pieceId: piece.id,
      mappingId: state.same.id,
      message: state.view.message,
    }
  else if (
    !['new', 'update'].includes(state.view.state) ||
    state.view.mappingId !== input.expectedMappingId ||
    piece.revisionId !== input.expectedRevisionId
  )
    result = {
      status: 'conflict',
      pieceId: piece.id,
      mappingId: state.view.mappingId,
      message:
        'O planejamento foi preservado. Confira a origem e a revisão atual antes de continuar.',
    }
  else {
    const batch = batchOperationSchema.parse({
      schemaVersion: 1,
      projectId,
      operationId: await stableEditorialId(`${input.operationId}:calendar`),
      changes: [
        {
          entityId: piece.id,
          baseRevisionId: piece.revisionId,
          action: 'save',
          document: { ...piece.document, week: entry.week, position: entry.position },
        },
      ],
    })
    const applied = await new DrizzleWorkspaceRepository(db).applyBatchInTransaction(
      tx,
      actorId,
      batch,
      hash(batch),
    )
    if (applied.status !== 'applied')
      throw new WorkspaceError('IMPORT_CONFLICT', 'A peça mudou; confira novamente')
    const id = randomUUID(),
      sequence = await recordChange(tx, projectId, actorId, 'import', source.id, null)
    await tx.insert(mappings).values({
      id,
      projectId,
      sourceVersionId: source.id,
      pieceId: piece.id,
      sectionKey: entry.sourceId,
      parserVersion: structuredCalendarVersion,
      sequence,
      destinations: applied.items.map((item) => ({
        entityId: item.id,
        revisionId: item.revisionId,
      })),
    })
    result = {
      status: 'applied',
      pieceId: piece.id,
      mappingId: id,
      message: 'Semana e ordem vinculadas. Copy, data e estado da peça foram preservados.',
    }
  }
  await tx
    .insert(receipts)
    .values({ projectId, actorId, operationId: input.operationId, hash: operationHash, result })
  return result
}
