import type { MoldaSceneDocument } from './document'

/** Shallow COW identity, not deep equality. Thumbnail/save timestamps are not authorial revisions. */
export function sameSceneContent(a: MoldaSceneDocument, b: MoldaSceneDocument) {
  if (a === b) return true
  const entries = (document: MoldaSceneDocument) =>
      Object.entries(document).filter(([key]) => key !== 'thumb' && key !== 'updatedAt'),
    source = entries(a),
    current = new Map(entries(b))
  return (
    source.length === current.size &&
    source.every(([key, value]) => current.has(key) && current.get(key) === value)
  )
}
