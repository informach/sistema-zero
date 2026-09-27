import type { BufferAttribute } from 'three'

/** One bounded envelope retains every pending component until the GPU acknowledges the upload. */
export function markSceneAttributeUpload(attribute: BufferAttribute, start: number, end: number) {
  if (end <= start) return
  for (const range of attribute.updateRanges) {
    start = Math.min(start, range.start)
    end = Math.max(end, range.start + range.count)
  }
  attribute.clearUpdateRanges()
  attribute.addUpdateRange(start, end - start)
  attribute.needsUpdate = true
}
