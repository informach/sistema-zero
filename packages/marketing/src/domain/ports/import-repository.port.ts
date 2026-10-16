import type {
  ImportChunk,
  ImportPage,
  ImportRun,
  ImportStart,
} from '@sistemazero/marketing-contracts'
export interface ImportRepository {
  loadSource(
    actorId: string,
    projectId: string,
    runId: string,
    input: import('@sistemazero/marketing-contracts').ImportSourceLoad,
  ): Promise<import('@sistemazero/marketing-contracts').ImportSourceResult>
  start(actorId: string, projectId: string, input: ImportStart): Promise<ImportRun>
  chunk(actorId: string, projectId: string, runId: string, input: ImportChunk): Promise<ImportRun>
  finish(actorId: string, projectId: string, runId: string): Promise<ImportRun>
  retire(actorId: string, projectId: string, runId: string): Promise<ImportRun>
  list(actorId: string, projectId: string, before: string | null): Promise<ImportRun[]>
  page(actorId: string, projectId: string, runId: string, cursor: number): Promise<ImportPage>
}
