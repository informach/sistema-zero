import type { LiveWorkspaceView } from '@sistemazero/core/live'

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
}
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
