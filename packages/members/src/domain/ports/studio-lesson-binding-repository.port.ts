import type { StudioLessonBaseline } from '../studio/lesson-baseline'

export interface StudioLessonOwner {
  userId: string
  accountId: string
}
export interface StudioLessonBinding {
  baseline: StudioLessonBaseline
  /** Null for recorded lessons; live projects bind to their canonical workspace. */
  workspaceId: string | null
}

export interface StudioLessonBindingRepository {
  find(owner: StudioLessonOwner, blockId: string): Promise<StudioLessonBinding | null>
  /** Atomic first binding wins. Account deletion fencing uses the same transaction/lock. */
  bindRecorded(
    owner: StudioLessonOwner,
    baseline: StudioLessonBaseline,
  ): Promise<StudioLessonBinding>
}
