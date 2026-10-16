import type {
  DraftResolution,
  EditorialBatch,
  EditorialOperation,
  ExecutionRun,
  Handoff,
  PendingOperation,
  Project,
  ProjectView,
  projectCreateSchema,
  UploadView,
} from '@sistemazero/marketing-contracts'
import type { z } from 'zod'

export interface WorkbenchPort {
  exportAssetFile?(
    input: import('@sistemazero/marketing-contracts').AssetExportRequest,
  ): Promise<boolean>
  inventory?: {
    loadSelection(
      projectId: string,
      id: string,
      selection: import('@sistemazero/marketing-contracts').ImportSelection,
    ): Promise<import('@sistemazero/marketing-contracts').ImportBatchResult>
    loadFile(
      projectId: string,
      id: string,
      ordinal: number,
    ): Promise<import('@sistemazero/marketing-contracts').ImportFileLoadResult>
    cancel(projectId: string): Promise<void>
    onProgress(listener: (message: string) => void): () => void
    loadText(
      projectId: string,
      id: string,
      ordinal: number,
    ): Promise<import('@sistemazero/marketing-contracts').ImportSourceResult>
    choose(
      projectId: string,
      origin: import('@sistemazero/marketing-contracts').ImportInventory['origin'],
    ): Promise<import('@sistemazero/marketing-contracts').PreparedImport | null>
    list(
      projectId: string,
      before?: string,
    ): Promise<{
      items: import('@sistemazero/marketing-contracts').PreparedImport[]
      nextCursor: string | null
    }>
    page(
      projectId: string,
      id: string,
      cursor: number,
    ): Promise<{
      prepared: import('@sistemazero/marketing-contracts').PreparedImport
      entries: import('@sistemazero/marketing-contracts').InventoryEntry[]
      nextCursor: number | null
    }>
    synchronize(
      projectId: string,
      id: string,
    ): Promise<import('@sistemazero/marketing-contracts').ImportRun>
  }
  readonly location: 'web' | 'desktop'
  readonly identity: string
  readonly userId: string
  chooseMedia?(projectId: string): Promise<UploadView | null>
  uploadFile?(
    projectId: string,
    file: File,
    signal: AbortSignal,
    progress: (message: string, fraction: number) => void,
  ): Promise<UploadView>
  resumeMedia?(projectId: string, assetId: string): Promise<UploadView>
  assetUrl(projectId: string, assetId: string): Promise<string>
  exportEditionFile?(
    input: import('@sistemazero/marketing-contracts').EditionExportRequest,
  ): Promise<boolean>
  projects(): Promise<Project[]>
  createProject(input: z.infer<typeof projectCreateSchema>): Promise<Project>
  view(projectId: string): Promise<ProjectView>
  save(operation: EditorialOperation, dependsOnOperationId: string | null): Promise<void>
  saveBatch(operation: EditorialBatch): Promise<void>
  resolveDrafts(input: DraftResolution): Promise<void>
  synchronize(): Promise<void>
  request(path: string, method?: 'GET' | 'POST' | 'PUT', body?: unknown): Promise<unknown>
  subscribe(listener: () => void): () => void
  openDesktop(handoff: Omit<Handoff, 'expiresAt'>): Promise<void>
  execute?(
    projectId: string,
    runId: string,
    strategy: 'start' | 'resume' | 'regenerate',
  ): Promise<ExecutionRun>
  onHandoff?(listener: (value: Handoff) => void, onError: (error: unknown) => void): () => void
}
export function errorMessage(error: unknown): string {
  if (error instanceof Error)
    return error.message.replace(/^Error invoking remote method '[^']+': Error: /, '')
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string')
    return error.message
  return 'Não foi possível concluir. Seu pedido foi preservado.'
}
export function latestPending(items: PendingOperation[], entityId: string) {
  return (
    items
      .filter((item) => item.operation.entityId === entityId && item.state !== 'confirmed')
      .at(-1) ?? null
  )
}
