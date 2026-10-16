import type { EditorialDocument } from '@sistemazero/marketing-contracts'
import { references } from './references'
import { WorkspaceError } from './workspace-error'

type Node = { id: string; document: EditorialDocument; archived: boolean }
/** Validate both directions of the piece/representation/component graph after an atomic change. */
export function validateEditorialGraph(nodes: Node[], changed: ReadonlySet<string>) {
  const live = new Map(nodes.filter((node) => !node.archived).map((node) => [node.id, node]))
  const invalid = () =>
    new WorkspaceError(
      'DEPENDENCY_MISSING',
      'A peça, suas versões e componentes precisam permanecer vinculados. Salve as alterações relacionadas em conjunto.',
    )
  for (const node of live.values()) {
    const document = node.document,
      refs = references(document)
    if (!changed.has(node.id) && !refs.items.some((id) => changed.has(id))) continue
    if (refs.items.some((id) => !live.has(id))) throw invalid()
    const kind = (id: string) => live.get(id)?.document.kind
    if (
      document.kind === 'direction' &&
      document.referenceIds.some((id) => kind(id) !== 'evidence')
    )
      throw invalid()
    if (document.kind === 'piece') {
      if (document.evidenceIds.some((id) => kind(id) !== 'evidence')) throw invalid()
      for (const id of document.representationIds) {
        const child = live.get(id)?.document
        if (child?.kind !== 'representation' || child.pieceId !== node.id) throw invalid()
      }
    }
    if (document.kind === 'representation') {
      const parent = live.get(document.pieceId)?.document
      if (parent?.kind !== 'piece' || !parent.representationIds.includes(node.id)) throw invalid()
      for (const id of document.componentIds) {
        const child = live.get(id)?.document
        if (
          !child ||
          !['component', 'video'].includes(child.kind) ||
          !('representationId' in child) ||
          child.representationId !== node.id
        )
          throw invalid()
      }
    }
    if (document.kind === 'component' || document.kind === 'video') {
      const parent = live.get(document.representationId)?.document
      if (parent?.kind !== 'representation' || !parent.componentIds.includes(node.id))
        throw invalid()
    }
    if (
      document.kind === 'analysis' &&
      (document.evidenceIds.some((id) => kind(id) !== 'evidence') ||
        (document.proposedPieceId && kind(document.proposedPieceId) !== 'piece'))
    )
      throw invalid()
    if (document.kind === 'watchlist' && document.evidenceIds.some((id) => kind(id) !== 'evidence'))
      throw invalid()
  }
}
