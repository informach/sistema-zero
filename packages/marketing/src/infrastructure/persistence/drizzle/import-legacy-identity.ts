import { batchResultSchema, stableEditorialId } from '@sistemazero/marketing-contracts'
import { parseStructuredCalendar, type SourcePiece } from '@sistemazero/marketing-import'
import { and, eq, inArray } from 'drizzle-orm'
import type { WorkspaceTransaction } from './workspace.repository'
import { editorialItems as items, editorialReceipts as receipts } from './workspace-schema'

/** Adoption requires the original sample receipts and an exact calendar path, never a similar title. */
export async function legacyImportIdentity(
  tx: WorkspaceTransaction,
  projectId: string,
  origin: string,
  sourcePath: string,
  piece: SourcePiece,
) {
  if (origin !== 'sistema-zero' || !/^(P|ST)\d{2}$/.test(piece.key)) return null
  const ids = await Promise.all(
    ['sample-context-v1', `sample-piece-v1:${piece.key}`].map((key) =>
      stableEditorialId(`${projectId}:instagram:${key}`),
    ),
  )
  const saved = await tx
    .select({ operationId: receipts.operationId, result: receipts.result })
    .from(receipts)
    .where(and(eq(receipts.projectId, projectId), inArray(receipts.operationId, ids)))
  const context = batchResultSchema.safeParse(
    saved.find((row) => row.operationId === ids[0])?.result,
  )
  const baseline = batchResultSchema.safeParse(
    saved.find((row) => row.operationId === ids[1])?.result,
  )
  if (
    !context.success ||
    context.data.status !== 'applied' ||
    !baseline.success ||
    baseline.data.status !== 'applied'
  )
    return null
  const pieceId = await stableEditorialId(`${projectId}:instagram:piece:${piece.key}`)
  const original = baseline.data.items.find((item) => item.id === pieceId)
  if (
    original?.document.kind !== 'piece' ||
    original.document.sourceKey !== `instagram:${piece.key}` ||
    original.document.state !== 'incomplete'
  )
    return null
  const evidenceIds = original.document.evidenceIds
  const calendars = context.data.items.filter(
    (item) =>
      item.document.kind === 'evidence' &&
      evidenceIds.includes(item.id) &&
      item.document.source.sourceKey?.endsWith('/instagram/03-postagens.md'),
  )
  if (calendars.length !== 1) return null
  const calendar = calendars[0]?.document
  if (calendar?.kind !== 'evidence' || !calendar.source.sourceKey) return null
  const entry = parseStructuredCalendar(calendar.body, origin, calendar.source.sourceKey).find(
    (entry) => entry.sourceId === piece.key,
  )
  if (entry?.sourceKey !== `${origin}:${sourcePath}#${piece.key}`) return null
  const representations = baseline.data.items.filter(
    (item) => item.document.kind === 'representation' && item.document.pieceId === pieceId,
  )
  const main = representations[0]
  if (
    representations.length !== 1 ||
    main?.document.kind !== 'representation' ||
    !original.document.representationIds.includes(main.id)
  )
    return null
  const identities = new Map([
    ['piece', pieceId],
    ['main', main.id],
  ])
  for (const component of piece.components.filter((value) => value.channel === 'main')) {
    const matching = baseline.data.items.filter(
      (item) =>
        item.document.kind === 'component' &&
        item.document.representationId === main.id &&
        item.document.title === component.title &&
        item.document.componentType === component.type,
    )
    if (matching.length === 1 && matching[0])
      identities.set(`main:${component.key}`, matching[0].id)
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
          baseline.data.items.map((item) => item.id),
        ),
      ),
    )
  const intact = baseline.data.items.every((previous) =>
    current.some(
      (item) =>
        item.id === previous.id && item.revisionId === previous.revisionId && !item.archived,
    ),
  )
  return {
    identities,
    current,
    intact,
    evidenceIds,
    destinations: baseline.data.items.map((item) => ({
      entityId: item.id,
      revisionId: item.revisionId,
    })),
  }
}
