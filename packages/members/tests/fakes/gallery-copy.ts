import { ValidationError } from '@sistemazero/core/errors'
import { LearningConflictError } from '../../src/domain/learning/learning.errors'
import {
  GALLERY_COPY_COMMIT_TTL_MS,
  GALLERY_COPY_PENDING_LIMIT,
  type GalleryCopyAttempt,
  type GalleryCopyRepository,
} from '../../src/domain/ports/gallery-copy-repository.port'
import { stableJson } from '../../src/domain/shared/stable-json'

export class InMemoryGalleryCopyRepository
  implements Pick<GalleryCopyRepository, 'reserve' | 'assertActive'>
{
  readonly attempts = new Map<string, GalleryCopyAttempt & { expiresAt: Date; retired: boolean }>()
  async reserve(attempt: GalleryCopyAttempt, now: Date) {
    if (
      [...this.attempts.values()].filter(
        (row) => row.userId === attempt.userId && !row.retired && row.expiresAt > now,
      ).length >= GALLERY_COPY_PENDING_LIMIT
    )
      throw new ValidationError('Há muitos envios em andamento.')
    this.attempts.set(attempt.generation, {
      ...structuredClone(attempt),
      expiresAt: new Date(now.getTime() + GALLERY_COPY_COMMIT_TTL_MS),
      retired: false,
    })
  }
  async assertActive(attempt: GalleryCopyAttempt, now: Date) {
    const row = this.attempts.get(attempt.generation)
    if (
      !row ||
      row.retired ||
      row.expiresAt <= now ||
      row.userId !== attempt.userId ||
      row.accountId !== attempt.accountId ||
      row.blockId !== attempt.blockId ||
      stableJson(row.snapshot) !== stableJson(attempt.snapshot)
    )
      throw new LearningConflictError()
  }
}
