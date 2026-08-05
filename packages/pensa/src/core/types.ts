export type PensaStage = 'z' | 'e' | 'r' | 'o' | 'done'
export type PensaWorkStage = Exclude<PensaStage, 'done'>
export type PensaArtifactType =
  | 'idea'
  | 'game_design'
  | 'visual_direction'
  | 'task_plan'
  | 'plan_review'
export type PensaTaskDestination = 'pinta' | 'studio'
export type PensaTaskStatus = 'planned' | 'in_progress' | 'completed'
export type PensaTaskCategory = 'art' | 'setup' | 'gameplay' | 'scene' | 'ui' | 'polish'
export type PensaArtKind = 'sprite' | 'background' | 'tileset' | 'tilemap'

export interface PensaCycleView {
  id: string
  number: number
  goal: string | null
  stage: PensaStage
  zCompletedAt: string | null
  eCompletedAt: string | null
  rCompletedAt: string | null
  oCompletedAt: string | null
}

export interface PensaProjectListView {
  id: string
  name: string
  status: 'active' | 'archived'
  cycleNumber: number
  stage: PensaStage
  createdAt: string
  updatedAt: string
}

export interface PensaArtifactView {
  id: string
  stage: PensaStage
  type: PensaArtifactType
  version: number
  status: 'draft' | 'validated'
  content: unknown
  createdAt: string
}

export interface PensaProjectDetailView {
  id: string
  name: string
  status: 'active' | 'archived'
  createdAt: string
  updatedAt: string
  cycles: PensaCycleView[]
  currentCycle: PensaCycleView
  artifactsIndex: Array<Omit<PensaArtifactView, 'id' | 'content'>>
}

export interface PensaGuideItem {
  id: string
  text: string
  hint?: string
  required: boolean
}
export interface PensaTaskGuide {
  steps: PensaGuideItem[]
  criteria: PensaGuideItem[]
}
export interface PensaPintaTaskContext {
  kind: 'pinta'
  assetId: string
  artKind: PensaArtKind
  style: 'pixel' | 'vector' | 'either'
  preset?: string
  palette: Array<{ role: string; color: string }>
  appearance: string
  animations: string[]
  states: string[]
  usage: string
  requiresStudioUse: boolean
}
export interface PensaStudioBlockReference {
  id: string
  label: string
  category: string
  subcategory: string
  area: 'structure' | 'appearance' | 'start' | 'events' | 'loops' | 'value'
  extension: string | null
}
export interface PensaStudioTaskContext {
  kind: 'studio'
  dimension: '2d' | '3d'
  visualAssetIds: string[]
  blockIds: string[]
  blocks: PensaStudioBlockReference[]
  mechanicDocumentIds: string[]
  extensionIds: string[]
}
export type PensaTaskContext = PensaPintaTaskContext | PensaStudioTaskContext
export type PensaTaskOutputRef =
  | { kind: 'pinta_asset'; assetId: string; assetName?: string; usedInStudioAt?: string }
  | { kind: 'studio_project'; projectId: string; saveRevision?: string }

export interface PensaTaskView {
  id: string
  title: string
  summary: string | null
  destination: PensaTaskDestination
  category: PensaTaskCategory
  estimatedMinutes: number
  position: number
  dependencies: string[]
  guide: PensaTaskGuide
  context: PensaTaskContext
  progress: {
    status: PensaTaskStatus
    completedStepIds: string[]
    completedCriteriaIds: string[]
    outputRef: PensaTaskOutputRef | null
    startedAt: string | null
    completedAt: string | null
    updatedAt: string | null
  }
  revision: number
  supersedesTaskId: string | null
}

export interface PensaChatMessage {
  role: 'user' | 'assistant'
  content: string
  at: string
}
export interface PensaZState {
  answered: {
    idea: boolean
    objective: boolean
    controls: boolean
    outcome: boolean
    dimension: boolean
  }
  ready: boolean
}
export interface PensaStageView {
  stage: PensaStage
  conversation: { messages: PensaChatMessage[]; summary: string | null; messageCount: number }
  state: Record<string, unknown>
  artifacts: PensaArtifactView[]
  tasks: PensaTaskView[]
  nextTaskId: string | null
}

export interface PensaTaskHandoffView {
  task: PensaTaskView
  project: { id: string; name: string }
  cycle: { id: string; number: number; goal: string | null }
  capability: { owned: boolean; blockedReason: string | null }
}

export class PensaApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly scope?: 'day' | 'month',
  ) {
    super(message)
    this.name = 'PensaApiError'
  }
}

export interface PensaChatInput {
  projectId: string
  cycleId: string
  stage: 'z'
  message: string
}
export interface PensaChatHandlers {
  onDelta(text: string): void
  onState?(state: Record<string, unknown>): void
  onDone(): void
  onError(error: Error): void
}
export interface PensaTransport {
  request<T>(
    path: string,
    init?: { method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'; body?: unknown },
  ): Promise<T>
  streamChat(input: PensaChatInput, handlers: PensaChatHandlers): () => void
}
export type PensaMascotPose = 'happy' | 'thinking' | 'celebrating' | 'sleeping'

/** Única integração do Pensa: abrir o Cartão de Criação na ferramenta de destino. */
export interface PensaHostAdapter {
  transport: PensaTransport
  mode: 'kids'
  theme?: 'light' | 'dark'
  capabilities: { pintaOwned: boolean; studioOwned: boolean }
  mascotImages?: Partial<Record<PensaMascotPose, string>>
  onOpenTask(args: { taskId: string; destination: PensaTaskDestination }): void
}
