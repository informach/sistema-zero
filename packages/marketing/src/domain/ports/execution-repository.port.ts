import type {
  ClaimRun,
  ContextRequest,
  ExecutionContext,
  ExecutionRequest,
  ExecutionRun,
  FinishRun,
  Heartbeat,
  RunListQuery,
  RunPage,
} from '@sistemazero/marketing-contracts'
export interface ExecutionRepository {
  apply(actorId: string, projectId: string, id: string, variantIndex: number): Promise<ExecutionRun>
  undo(actorId: string, projectId: string, id: string): Promise<ExecutionRun>
  context(
    actorId: string,
    input: ContextRequest,
  ): Promise<{ context: ExecutionContext; hash: string }>
  create(actorId: string, input: ExecutionRequest, hash: string): Promise<ExecutionRun>
  list(actorId: string, projectId: string, query: RunListQuery): Promise<RunPage>
  get(actorId: string, projectId: string, id: string): Promise<ExecutionRun>
  claim(
    actorId: string,
    deviceId: string,
    projectId: string,
    id: string,
    input: ClaimRun,
    hash: string,
  ): Promise<ExecutionRun>
  heartbeat(
    actorId: string,
    deviceId: string,
    projectId: string,
    id: string,
    input: Heartbeat,
    hash: string,
  ): Promise<ExecutionRun>
  finish(
    actorId: string,
    deviceId: string,
    projectId: string,
    id: string,
    input: FinishRun,
    hash: string,
  ): Promise<ExecutionRun>
  cancel(
    actorId: string,
    projectId: string,
    id: string,
    operationId: string,
    hash: string,
  ): Promise<ExecutionRun>
}
