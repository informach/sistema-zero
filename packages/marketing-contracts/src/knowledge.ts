import type { EditorialDocument, EditorialItem } from './editorial'

export function analysisFreshness(
  document: Extract<EditorialDocument, { kind: 'analysis' }>,
  items: ReadonlyArray<Pick<EditorialItem, 'id' | 'revisionId' | 'archived'>>,
): 'current' | 'stale' | 'untracked' {
  if (!document.basis?.length) return 'untracked'
  const byId = new Map(items.map((item) => [item.id, item]))
  return document.basis.every((source) => {
    const item = byId.get(source.entityId)
    return item && !item.archived && item.revisionId === source.revisionId
  })
    ? 'current'
    : 'stale'
}
