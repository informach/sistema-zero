import type {
  EditorialDocument,
  EditorialItem,
  ProjectView,
} from '@sistemazero/marketing-contracts'

export type EditorialEntry = {
  id: string
  confirmed: EditorialItem | null
  document: EditorialDocument
  archived: boolean
  pending: string[]
  conflict: boolean
  error: string | null
}
/** A local draft never acquires an invented revision ID or server approval. */
export function projectEntries(view: ProjectView): EditorialEntry[] {
  const entries = new Map<string, EditorialEntry>(
    view.items.map((item) => [
      item.id,
      {
        id: item.id,
        confirmed: item,
        document: item.document,
        archived: item.archived,
        pending: [],
        conflict: false,
        error: null,
      },
    ]),
  )
  const changes = [
    ...view.pending
      .filter((item) => item.state !== 'confirmed')
      .map((item) => ({
        id: item.operation.operationId,
        createdAt: item.createdAt,
        state: item.state,
        error: item.error,
        changes: [item.operation],
      })),
    ...view.pendingBatches
      .filter((item) => item.state !== 'confirmed')
      .map((item) => ({
        id: item.operation.operationId,
        createdAt: item.createdAt,
        state: item.state,
        error: item.error,
        changes: item.operation.changes,
      })),
  ].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
  for (const pending of changes)
    for (const change of pending.changes) {
      const previous = entries.get(change.entityId),
        document = change.document ?? previous?.document
      if (!document) continue
      entries.set(change.entityId, {
        id: change.entityId,
        confirmed: previous?.confirmed ?? null,
        document,
        archived: change.action === 'archive',
        pending: [...(previous?.pending ?? []), pending.id],
        conflict: Boolean(previous?.conflict) || pending.state === 'conflict',
        error: pending.error ?? previous?.error ?? null,
      })
    }
  return [...entries.values()]
}
export function entryStatus(entry: EditorialEntry) {
  if (entry.conflict) return 'Conflito preservado'
  if (entry.error) return 'Envio bloqueado'
  if (entry.pending.length) return 'Rascunho local'
  return 'Confirmado no servidor'
}
export function searchableText(entry: EditorialEntry) {
  const doc = entry.document
  return [
    doc.title,
    'body' in doc ? doc.body : '',
    'brief' in doc ? doc.brief : '',
    doc.kind === 'piece' ? `${doc.week ?? ''} ${doc.editorialDate ?? ''}` : '',
    doc.kind === 'evidence' ? doc.tags.join(' ') : '',
  ]
    .join(' ')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}
