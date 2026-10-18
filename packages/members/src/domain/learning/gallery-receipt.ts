import type { GalleryDeliveryPlan } from '@sistemazero/core/learning'

/** The persisted receipt is authoritative for every retry of the same gallery request. */
export function gallerySubmissionReceipt(record: {
  submittedAt: Date
  score?: number | null
  passedAt?: Date | null
}): Extract<GalleryDeliveryPlan, { completed: true }>['result'] {
  return {
    submittedAt: record.submittedAt.toISOString(),
    ...(typeof record.score === 'number'
      ? { score: record.score, passed: Boolean(record.passedAt) }
      : {}),
    ...(record.passedAt ? { passed: true } : {}),
  }
}
