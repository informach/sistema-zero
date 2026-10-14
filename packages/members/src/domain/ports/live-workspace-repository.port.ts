import type { LiveWorkspaceView } from '@sistemazero/core/live'
import type { LiveCohortAggregate } from './live-repository.port'

export interface LiveWorkspaceRecord extends LiveWorkspaceView {
  accountId: string
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
  ensure(workspace: LiveWorkspaceRecord): Promise<LiveWorkspaceRecord>
  transaction<T>(id: string, action: (tx: LiveWorkspaceTransaction) => Promise<T>): Promise<T>
  createTemplate(input: {
    id: string
    project: Record<string, unknown>
    createdBy: string
    createdAt: string
  }): Promise<void>
  findTemplate(id: string): Promise<Record<string, unknown> | null>
  listTemplates(): Promise<{ id: string; title: string }[]>
}
