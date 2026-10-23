import type {
  StudioLessonBinding,
  StudioLessonBindingRepository,
  StudioLessonOwner,
} from '../../src/domain/ports/studio-lesson-binding-repository.port'
import type { StudioLessonBaseline } from '../../src/domain/studio/lesson-baseline'

/** HTTP fixture only. Locking, deletion fencing and races are covered by the PostgreSQL suite. */
export class InMemoryStudioLessonBindingRepository implements StudioLessonBindingRepository {
  readonly rows = new Map<string, StudioLessonBinding>()
  private key(owner: StudioLessonOwner, blockId: string) {
    return JSON.stringify([owner.userId, owner.accountId, blockId])
  }
  async find(owner: StudioLessonOwner, blockId: string) {
    return structuredClone(this.rows.get(this.key(owner, blockId)) ?? null)
  }
  async bindRecorded(owner: StudioLessonOwner, baseline: StudioLessonBaseline) {
    const key = this.key(owner, baseline.blockId)
    if (!this.rows.has(key)) this.rows.set(key, structuredClone({ baseline, workspaceId: null }))
    return structuredClone(this.rows.get(key)!)
  }
}
