import type { StoryProps } from '@sistemazero/marketing-production'
import { z } from 'zod'
import type { UploadView } from '../../../marketing-contracts/src/assets'
import type {
  EditorialBatch,
  EditorialOperation,
  Handoff,
  Project,
} from '../../../marketing-contracts/src/editorial'
import type { ExecutionRun } from '../../../marketing-contracts/src/execution'
import type {
  DraftResolution,
  PendingBatch,
  PendingOperation,
  SyncReport,
} from '../../../marketing-contracts/src/sync'
import type { ExecuteSelection } from '../main/execution/supervisor'
import type { ConnectionState, PairingView, WorkspaceRequest } from './connection'
import type { ProjectProjection } from './project-projection'

export const providerSchema = z.enum(['codex', 'claude'])
export type Provider = z.infer<typeof providerSchema>
export const runRequestSchema = z
  .object({
    provider: providerSchema,
    prompt: z.string().trim().min(1).max(300000),
    kind: z.enum(['copy', 'image', 'edit-image', 'video', 'research']),
    sourceAssetId: z.string().uuid().optional(),
    responseFormat: z
      .enum(['editorial-copy', 'editorial-adapt', 'art', 'capture', 'video', 'composition'])
      .optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (['image', 'edit-image'].includes(value.kind) && value.provider !== 'codex') {
      context.addIssue({ code: 'custom', message: 'Imagem usa o Codex neste fluxo.' })
    }
    if (value.kind === 'edit-image' && !value.sourceAssetId) {
      context.addIssue({ code: 'custom', message: 'Escolha a imagem de origem.' })
    }
    if (value.kind === 'research' && value.provider !== 'codex')
      context.addIssue({
        code: 'custom',
        message:
          'A pesquisa com fontes nesta versão usa a ferramenta de busca do Codex. Selecione Codex para pesquisar.',
      })
  })
export type RunRequest = z.infer<typeof runRequestSchema>
export type ProviderStatus = {
  provider: Provider
  available: boolean
  mode: string
  image: boolean
  reason?: string
}
export type Asset = {
  id: string
  name: string
  url: string
  mime: string
  sha256: string
  size: number
}
export type RunResult = {
  text: string
  assets: Asset[]
  provider: Provider
  mode: string
  durationMs: number
}
export type Progress = { stage: string; progress?: number; activity?: 'inventory' }
export type DesktopBridge = {
  linkInventoryProduction: (
    scope: WorkspaceRequest['scope'],
    projectId: string,
    reportId: string,
    planHash: string,
  ) => Promise<import('@sistemazero/marketing-contracts').ProductionLinkResult>
  inventoryProductionFolders: (
    scope: WorkspaceRequest['scope'],
    projectId: string,
    id: string,
  ) => Promise<import('@sistemazero/marketing-contracts').ProductionFolder[]>
  reviewInventoryProduction: (
    scope: WorkspaceRequest['scope'],
    projectId: string,
    id: string,
    folderPath: string,
  ) => Promise<import('@sistemazero/marketing-contracts').ImportProductionPreview>
  shareInventoryProduction: (
    scope: WorkspaceRequest['scope'],
    projectId: string,
    id: string,
    folderPath: string,
  ) => Promise<import('@sistemazero/marketing-contracts').ProductionShareResult>
  exportAssetFile: (
    scope: WorkspaceRequest['scope'],
    input: import('@sistemazero/marketing-contracts').AssetExportRequest,
  ) => Promise<boolean>
  loadInventorySelection: (
    scope: WorkspaceRequest['scope'],
    projectId: string,
    id: string,
    selection: import('@sistemazero/marketing-contracts').ImportSelection,
  ) => Promise<import('@sistemazero/marketing-contracts').ImportBatchResult>
  loadInventoryFile: (
    scope: WorkspaceRequest['scope'],
    projectId: string,
    id: string,
    ordinal: number,
  ) => Promise<import('@sistemazero/marketing-contracts').ImportFileLoadResult>
  cancelInventory: (scope: WorkspaceRequest['scope'], projectId: string) => Promise<void>
  rescanInventory: (
    scope: WorkspaceRequest['scope'],
    projectId: string,
    id: string,
  ) => Promise<import('@sistemazero/marketing-contracts').PreparedImport>
  loadInventoryText: (
    scope: WorkspaceRequest['scope'],
    projectId: string,
    id: string,
    ordinal: number,
  ) => Promise<import('@sistemazero/marketing-contracts').ImportSourceResult>
  chooseInventory: (
    scope: WorkspaceRequest['scope'],
    projectId: string,
    origin: import('@sistemazero/marketing-contracts').ImportInventory['origin'],
  ) => Promise<import('@sistemazero/marketing-contracts').PreparedImport | null>
  localInventories: (
    scope: WorkspaceRequest['scope'],
    projectId: string,
    before?: string,
  ) => Promise<{
    items: import('@sistemazero/marketing-contracts').PreparedImport[]
    nextCursor: string | null
  }>
  localInventoryPage: (
    scope: WorkspaceRequest['scope'],
    projectId: string,
    id: string,
    cursor: number,
  ) => Promise<{
    prepared: import('@sistemazero/marketing-contracts').PreparedImport
    entries: import('@sistemazero/marketing-contracts').InventoryEntry[]
    nextCursor: number | null
  }>
  syncInventory: (
    scope: WorkspaceRequest['scope'],
    projectId: string,
    id: string,
  ) => Promise<import('@sistemazero/marketing-contracts').ImportRun>
  exportEditionFile: (
    scope: WorkspaceRequest['scope'],
    input: import('@sistemazero/marketing-contracts').EditionExportRequest,
  ) => Promise<boolean>
  speechStatus: () => Promise<{ available: boolean; reason?: string }>
  installSpeech: () => Promise<void>
  resolveDrafts: (scope: WorkspaceRequest['scope'], input: DraftResolution) => Promise<void>
  storageUsage: () => Promise<{ used: number; limit: number; available: number; reserved: number }>
  clearConfirmedCache: (
    scope: WorkspaceRequest['scope'],
    projectId: string,
  ) => Promise<{ freedBytes: number; removed: number; preserved: number; unavailable: number }>
  saveBatch: (scope: WorkspaceRequest['scope'], input: EditorialBatch) => Promise<PendingBatch>
  execute: (selection: ExecuteSelection) => Promise<ExecutionRun>
  importProjectMedia: (scope: WorkspaceRequest['scope'], projectId: string) => Promise<Asset | null>
  uploadProjectMedia: (
    scope: WorkspaceRequest['scope'],
    projectId: string,
    assetId: string,
  ) => Promise<UploadView>
  localAsset: (
    scope: WorkspaceRequest['scope'],
    projectId: string,
    assetId: string,
  ) => Promise<Asset>
  synchronize: () => Promise<SyncReport>
  projects: () => Promise<Project[]>
  projectView: (projectId: string, version: number | null) => Promise<ProjectProjection>
  saveDraft: (
    scope: WorkspaceRequest['scope'],
    input: { operation: EditorialOperation; dependsOnOperationId: string | null },
  ) => Promise<PendingOperation>
  onSync: (listener: (report: SyncReport) => void) => () => void
  handoff: () => Promise<Handoff | null>
  onHandoff: (listener: () => void) => () => void
  connection: () => Promise<ConnectionState>
  connectionState: () => Promise<ConnectionState>
  connect: (input: { origin: string; label: string }) => Promise<PairingView>
  openApproval: () => Promise<void>
  pollConnection: () => Promise<ConnectionState>
  cancelPairing: () => Promise<void>
  disconnect: () => Promise<ConnectionState>
  online: (visible: boolean) => Promise<void>
  workspace: (request: WorkspaceRequest) => Promise<unknown>
  status: () => Promise<ProviderStatus[]>
  login: (provider: Provider) => Promise<void>
  run: (request: RunRequest) => Promise<RunResult>
  cancel: () => Promise<void>
  chooseMedia: () => Promise<Asset | null>
  render: (props: StoryProps) => Promise<Asset>
  exportAsset: (id: string) => Promise<boolean>
  onProgress: (listener: (progress: Progress) => void) => () => void
}
