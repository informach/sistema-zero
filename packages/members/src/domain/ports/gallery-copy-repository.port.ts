import type { GallerySubmission } from '@sistemazero/core/learning'
import type { CreationCleanupJob } from './creation-cleanup-repository.port'
import type { LearningOwner } from './learning-repository.port'

export const GALLERY_COPY_COMMIT_TTL_MS = 60 * 60_000
export const GALLERY_COPY_CLEANUP_DELAY_MS = 24 * 60 * 60_000
export const GALLERY_COPY_PENDING_LIMIT = 128

export interface GalleryCopyAttempt extends LearningOwner {
  generation: string
  blockId: string
  snapshot: GallerySubmission
}

/** SQL persistence marks a generation retained atomically with its accepted submission. */
export interface GalleryCopyRepository {
  reserve(attempt: GalleryCopyAttempt, now: Date): Promise<void>
  assertActive(attempt: GalleryCopyAttempt, now: Date): Promise<void>
  claimDue(now: Date, leaseExpiredBefore: Date): Promise<CreationCleanupJob | null>
  complete(id: string, now: Date): Promise<boolean>
  fail(id: string, error: string, now: Date, retryAt: Date): Promise<boolean>
}
