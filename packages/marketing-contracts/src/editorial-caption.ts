import type { EditorialDocument } from './editorial'

/** A caption component is the editable source of truth. The representation field supports older pieces without one. */
export function editorialCaption(
  representation: Extract<EditorialDocument, { kind: 'representation' }>,
  revisions: ReadonlyArray<{ entityId: string; document: EditorialDocument }>,
) {
  const documents = new Map(revisions.map((revision) => [revision.entityId, revision.document]))
  const captions = representation.componentIds.flatMap((id) => {
    const document = documents.get(id)
    return document?.kind === 'component' && document.componentType === 'caption'
      ? [document.body]
      : []
  })
  return captions.length ? captions.join('\n\n') : representation.caption
}
