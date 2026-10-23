import type { LiveWorkspaceView } from '@sistemazero/core/live'
import type { StudioLessonBaseline } from '../studio/lesson-baseline'
import type { LiveCohortAggregate } from './live-repository.port'
import type {
  StudioLessonBinding,
  StudioLessonOwner,
} from './studio-lesson-binding-repository.port'

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
export type LiveWorkspaceMetadata = Omit<LiveWorkspaceRecord, 'project'>
export interface LiveWorkspaceRuntimeContext {
  workspace: LiveWorkspaceMetadata
  environment: unknown
  cohort: LiveCohortAggregate | null
  binding: {
    baselineId: string
    lessonId: string
    courseId: string
    environment: unknown
    curation: unknown
  } | null
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
  /** Read-only consistent snapshot; no source/media, locks, lease renewal or new binding. */
  readRuntimeContext(
    id: string,
    sessionId: string | null,
    blockId: string | null,
  ): Promise<LiveWorkspaceRuntimeContext | null>
  findBinding(owner: StudioLessonOwner, blockId: string): Promise<StudioLessonBinding | null>
  /** Bind the exact block and link its encounter atomically under the account/workspace locks. */
  openBound(
    workspace: LiveWorkspaceRecord & { projectKey: string },
    baseline: StudioLessonBaseline,
    sessionId: string,
  ): Promise<{ workspace: LiveWorkspaceRecord; baseline: StudioLessonBaseline }>
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
