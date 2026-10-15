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

/**
 * Um comando montado a partir do `content` (sem a foto) não pode apagar a miniatura que o
 * `asset` já tem: o cartão da galeria ficava velho ou vazio depois de criar um movimento.
 */
export function keepSceneThumb(next: MoldaSceneDocument, source: MoldaSceneDocument) {
  if (next.thumb === source.thumb) return next
  const kept = { ...next }
  if (source.thumb) kept.thumb = source.thumb
  else delete kept.thumb
  return kept
}
