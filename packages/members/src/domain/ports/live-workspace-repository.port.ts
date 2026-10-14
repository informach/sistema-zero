import type { LiveWorkspaceView } from '@sistemazero/core/live'
import type { LiveCohortAggregate } from './live-repository.port'

export interface LiveWorkspaceRecord extends LiveWorkspaceView {
  accountId: string
  /**
   * The per-block key (course + `chain` of the Studio block, or course + block id), unique per
   * child. Null only in the old script projects, which no longer open for editing.
   */
  projectKey: string | null
  /** Lessons of the live course that already opened this project (access is judged in them). */
  lessonIds: string[]
}
export interface LiveWorkspaceRevision {
  workspaceId: string
  revision: number
  project: Record<string, unknown>
  writerId: string
  mutationId: string
  createdAt: string
}
export interface LiveWorkspaceTransaction {
  workspace: LiveWorkspaceRecord
  findMutation(id: string): Promise<LiveWorkspaceRevision | null>
  appendRevision(revision: LiveWorkspaceRevision): Promise<void>
  teacherHasActiveWorkspace(teacherId: string, now: Date): Promise<boolean>
  /** The workspace's cohort read through THIS transaction (no second pool connection). */
  loadCohort(): Promise<LiveCohortAggregate | null>
}
/**
 * `transaction` takes the account lock (same order as account erasure) and the workspace row
 * lock. It does NOT lock the cohort row: room heartbeats must not queue project saves.
 */
export interface LiveWorkspaceRepository {
  find(id: string): Promise<LiveWorkspaceRecord | null>
  listOwned(accountId: string, learnerId: string): Promise<LiveWorkspaceRecord[]>
  findByKey(learnerId: string, projectKey: string): Promise<LiveWorkspaceRecord | null>
  /** Creates the project of this key, or returns the one a concurrent open created first. */
  ensureByKey(workspace: LiveWorkspaceRecord & { projectKey: string }): Promise<LiveWorkspaceRecord>
  /**
   * The project opened in another lesson of the course: the lesson joins `lessonIds`. When the
   * project belongs to an encounter of ANOTHER cohort (the child is in a new cohort of the same
   * course), it moves to this encounter, unless a teacher's help is in progress.
   */
  linkLesson(
    id: string,
    input: { lessonId: string; sessionId: string },
  ): Promise<LiveWorkspaceRecord>
  transaction<T>(id: string, action: (tx: LiveWorkspaceTransaction) => Promise<T>): Promise<T>
}
