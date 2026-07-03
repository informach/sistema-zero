import type {
  PensaArtifact,
  PensaArtifactStatus,
  PensaArtifactType,
  PensaBuildEnv,
  PensaChatMessage,
  PensaChecklistCategory,
  PensaChecklistItem,
  PensaConversation,
  PensaCycle,
  PensaMission,
  PensaProject,
  PensaProjectKind,
  PensaProjectStatus,
  PensaStage,
  PensaTask,
  PensaTaskColumn,
} from '../../domain/pensa/pensa'

// Views JSON do Pensa (shapes EXATOS do contrato entre camadas; datas SEMPRE
// ISO string — Date→ISO acontece SÓ aqui, padrão do views.ts).

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
  kind: PensaProjectKind
  status: PensaProjectStatus
  /** Do ciclo CORRENTE (maior number). */
  cycleNumber: number
  stage: PensaStage
  createdAt: string
  updatedAt: string
}

export interface PensaArtifactIndexEntry {
  type: PensaArtifactType
  stage: PensaStage
  version: number
  status: PensaArtifactStatus
  createdAt: string
}

export interface PensaProjectDetailView {
  id: string
  name: string
  kind: PensaProjectKind
  status: PensaProjectStatus
  studioProjectId: string | null
  /** Onde construir (fase R) — `null` = a etapa R mostra o chooser. */
  buildEnv: PensaBuildEnv | null
  /** Última gravação do snapshot do Estúdio (o BLOB nunca sai na view). */
  studioSnapshotAt: string | null
  createdAt: string
  updatedAt: string
  /** Ordenados por number ASC. */
  cycles: PensaCycleView[]
  /** O de maior number. */
  currentCycle: PensaCycleView
  /** Latest por type, do ciclo CORRENTE. */
  artifactsIndex: PensaArtifactIndexEntry[]
}

export interface PensaArtifactView {
  id: string
  stage: PensaStage
  type: PensaArtifactType
  version: number
  status: PensaArtifactStatus
  content: unknown
  createdAt: string
}

export interface PensaStageView {
  stage: PensaStage
  conversation: { messages: PensaChatMessage[]; summary: string | null; messageCount: number }
  /** Etapa z → PensaZState; demais {}. */
  state: Record<string, unknown>
  /** Latest por type DESTA etapa. */
  artifacts: PensaArtifactView[]
  /**
   * Estado VIVO do kanban/checklist do CICLO (não são por etapa — vêm em toda
   * etapa p/ o reload da UI nunca perder o progresso do quadro; sem eles o front
   * teria que re-gerar o plano ao voltar, zerando as colunas).
   */
  tasks: PensaTaskView[]
  checklist: PensaChecklistItemView[]
}

export interface PensaTaskView {
  id: string
  title: string
  summary: string | null
  taskType: string | null
  column: PensaTaskColumn
  position: number
  mission: PensaMission
  notes: string | null
}

export interface PensaChecklistItemView {
  id: string
  category: PensaChecklistCategory
  title: string
  description: string | null
  required: boolean
  position: number
  done: boolean
  doneAt: string | null
}

const iso = (date: Date | null): string | null => (date ? date.toISOString() : null)

export function toPensaCycleView(cycle: PensaCycle): PensaCycleView {
  return {
    id: cycle.id,
    number: cycle.number,
    goal: cycle.goal,
    stage: cycle.stage,
    zCompletedAt: iso(cycle.zCompletedAt),
    eCompletedAt: iso(cycle.eCompletedAt),
    rCompletedAt: iso(cycle.rCompletedAt),
    oCompletedAt: iso(cycle.oCompletedAt),
  }
}

export function toPensaProjectListView(
  project: PensaProject,
  currentCycle: PensaCycle,
): PensaProjectListView {
  return {
    id: project.id,
    name: project.name,
    kind: project.kind,
    status: project.status,
    cycleNumber: currentCycle.number,
    stage: currentCycle.stage,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  }
}

export function toPensaArtifactIndexEntry(artifact: PensaArtifact): PensaArtifactIndexEntry {
  return {
    type: artifact.type,
    stage: artifact.stage,
    version: artifact.version,
    status: artifact.status,
    createdAt: artifact.createdAt.toISOString(),
  }
}

export function toPensaProjectDetailView(
  project: PensaProject,
  cycles: PensaCycle[],
  currentCycle: PensaCycle,
  currentCycleLatestArtifacts: PensaArtifact[],
): PensaProjectDetailView {
  return {
    id: project.id,
    name: project.name,
    kind: project.kind,
    status: project.status,
    studioProjectId: project.studioProjectId,
    buildEnv: project.buildEnv,
    studioSnapshotAt: iso(project.studioSnapshotAt),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    cycles: cycles.map(toPensaCycleView),
    currentCycle: toPensaCycleView(currentCycle),
    artifactsIndex: currentCycleLatestArtifacts.map(toPensaArtifactIndexEntry),
  }
}

export function toPensaArtifactView(artifact: PensaArtifact): PensaArtifactView {
  return {
    id: artifact.id,
    stage: artifact.stage,
    type: artifact.type,
    version: artifact.version,
    status: artifact.status,
    content: artifact.content,
    createdAt: artifact.createdAt.toISOString(),
  }
}

export function toPensaStageView(
  stage: PensaStage,
  conversation: Pick<PensaConversation, 'messages' | 'summary' | 'state' | 'messageCount'>,
  latestArtifacts: PensaArtifact[],
  tasks: PensaTask[],
  checklist: PensaChecklistItem[],
): PensaStageView {
  return {
    stage,
    conversation: {
      messages: conversation.messages,
      summary: conversation.summary,
      messageCount: conversation.messageCount,
    },
    state: conversation.state,
    artifacts: latestArtifacts.map(toPensaArtifactView),
    tasks: tasks.map(toPensaTaskView),
    checklist: checklist.map(toPensaChecklistItemView),
  }
}

export function toPensaTaskView(task: PensaTask): PensaTaskView {
  return {
    id: task.id,
    title: task.title,
    summary: task.summary,
    taskType: task.taskType,
    column: task.column,
    position: task.position,
    mission: task.mission,
    notes: task.notes,
  }
}

export function toPensaChecklistItemView(item: PensaChecklistItem): PensaChecklistItemView {
  return {
    id: item.id,
    category: item.category,
    title: item.title,
    description: item.description,
    required: item.required,
    position: item.position,
    done: item.done,
    doneAt: iso(item.doneAt),
  }
}
