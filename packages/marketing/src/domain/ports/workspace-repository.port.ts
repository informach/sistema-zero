import type {
  BatchResult,
  ChangePage,
  EditorialBatch,
  EditorialItem,
  EditorialOperation,
  Handoff,
  OperationResult,
  Permission,
  Project,
  Revision,
} from '@sistemazero/marketing-contracts'
export type ProjectInput = {
  schemaVersion: 1
  operationId: string
  id: string
  name: string
  product: string
}
export interface WorkspaceRepository {
  actionReceipt(
    actorId: string,
    projectId: string,
    operationId: string,
  ): Promise<import('@sistemazero/marketing-contracts').ActionReceipt>
  members(
    actorId: string,
    projectId: string,
    permission?: 'read' | 'admin',
  ): Promise<{ userId: string; permissions: Permission[] }[]>
  createHandoff(actorId: string, input: Handoff): Promise<{ id: string; expiresAt: string }>
  resolveHandoff(actorId: string, id: string): Promise<Handoff>
  createProject(actorId: string, input: ProjectInput, hash: string): Promise<Project>
  listProjects(actorId: string): Promise<Project[]>
  snapshot(
    actorId: string,
    projectId: string,
  ): Promise<{ items: EditorialItem[]; cursor: number; permissions: Permission[] }>
  history(actorId: string, projectId: string, entityId: string): Promise<Revision[]>
  changes(actorId: string, projectId: string, cursor: number): Promise<ChangePage>
  apply(actorId: string, operation: EditorialOperation, hash: string): Promise<OperationResult>
  applyBatch(actorId: string, input: EditorialBatch, hash: string): Promise<BatchResult>
  setMember(
    actorId: string,
    projectId: string,
    input: { operationId: string; userId: string; permissions: Permission[] },
    hash: string,
  ): Promise<{ updated: true }>
}
