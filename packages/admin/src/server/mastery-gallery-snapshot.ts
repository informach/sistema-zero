import type { CreatorMasteryReviewDetail } from '@sistemazero/core/journey'
import { GALLERY_STUDIO_SOURCE_LIMITS, isGallerySubmission } from '@sistemazero/core/learning'
import { z } from 'zod'

/** Selects only keys frozen with the authorized submission, never the learner's latest gallery. */
export function masteryGalleryItem(
  detail: Pick<CreatorMasteryReviewDetail, 'userId' | 'evidence'>,
  itemId: string,
) {
  const payload = detail.evidence.payload
  const snapshot =
    payload && typeof payload === 'object' && 'project' in payload ? payload.project : null
  if (
    !isGallerySubmission(snapshot) ||
    !z.uuid().safeParse(detail.userId).success ||
    !z.uuid().safeParse(snapshot.requestId).success ||
    !/^[A-Za-z0-9_-]{1,64}$/.test(itemId) ||
    new Set(snapshot.items.map((item) => item.itemId)).size !== snapshot.items.length
  )
    return null
  const item = snapshot.items.find((entry) => entry.itemId === itemId)
  if (!item || !Number.isSafeInteger(item.revision) || item.revision < 1) return null
  const ownerPrefix = `creations/${detail.userId}/lesson-submissions/`
  if (!item.storageKey.startsWith(ownerPrefix)) return null
  const blockId = item.storageKey.slice(ownerPrefix.length).split('/')[0]
  if (!z.uuid().safeParse(blockId).success) return null
  const prefix = `${ownerPrefix}${blockId}/${snapshot.requestId}/${snapshot.copyGeneration ? `${snapshot.copyGeneration}/` : ''}${item.itemId}-${item.revision}`
  if (
    item.storageKey !== `${prefix}/project.gz` ||
    item.parts.length > GALLERY_STUDIO_SOURCE_LIMITS.parts ||
    new Set(item.parts.map((part) => part.hash)).size !== item.parts.length ||
    !item.parts.every(
      (part) =>
        /^[a-f0-9]{64}$/.test(part.hash) && part.storageKey === `${prefix}/parts/${part.hash}.gz`,
    )
  )
    return null
  return { snapshot, item, blockId }
}
