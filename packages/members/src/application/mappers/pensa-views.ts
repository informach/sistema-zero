import type {
  PensaArtifact,
  PensaArtifactStatus,
  PensaArtifactType,
  PensaChatMessage,
  PensaConversation,
  PensaCycle,
  PensaProject,
  PensaProjectStatus,
  PensaStage,
  PensaTask,
  PensaTaskCategory,
  PensaTaskContext,
  PensaTaskDestination,
  PensaTaskGuide,
  PensaTaskOutputRef,
  PensaTaskStatus,
} from '../../domain/pensa/pensa'
import { nextAvailableTask } from '../../domain/pensa/task-plan'

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
  status: PensaProjectStatus
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
  status: PensaProjectStatus
  createdAt: string
  updatedAt: string
  cycles: PensaCycleView[]
  currentCycle: PensaCycleView
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

export interface PensaStageView {
  stage: PensaStage
  conversation: { messages: PensaChatMessage[]; summary: string | null; messageCount: number }
  state: Record<string, unknown>
  artifacts: PensaArtifactView[]
  tasks: PensaTaskView[]
  nextTaskId: string | null
}

const iso = (date: Date | null): string | null => date?.toISOString() ?? null

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
    status: project.status,
    cycleNumber: currentCycle.number,
    stage: currentCycle.stage,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
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

export function toPensaArtifactIndexEntry(artifact: PensaArtifact): PensaArtifactIndexEntry {
  const { content: _content, id: _id, ...entry } = toPensaArtifactView(artifact)
  return entry
}

export function toPensaProjectDetailView(
  project: PensaProject,
  cycles: PensaCycle[],
  currentCycle: PensaCycle,
  artifacts: PensaArtifact[],
): PensaProjectDetailView {
  return {
    id: project.id,
    name: project.name,
    status: project.status,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    cycles: cycles.map(toPensaCycleView),
    currentCycle: toPensaCycleView(currentCycle),
    artifactsIndex: artifacts.map(toPensaArtifactIndexEntry),
  }
}

export function toPensaTaskView(task: PensaTask): PensaTaskView {
  return {
    id: task.id,
    title: task.title,
    summary: task.summary,
    destination: task.destination,
    category: task.category,
    estimatedMinutes: task.estimatedMinutes,
    position: task.position,
    dependencies: task.dependencies,
    guide: task.guide,
    context: task.context,
    progress: {
      status: task.progress.status,
      completedStepIds: task.progress.completedStepIds,
      completedCriteriaIds: task.progress.completedCriteriaIds,
      outputRef: task.progress.outputRef,
      startedAt: iso(task.progress.startedAt),
      completedAt: iso(task.progress.completedAt),
      updatedAt: iso(task.progress.updatedAt),
    },
    revision: task.revision,
    supersedesTaskId: task.supersedesTaskId,
  }
}

export function toPensaStageView(
  stage: PensaStage,
  conversation: PensaConversation | null,
  artifacts: PensaArtifact[],
  tasks: PensaTask[],
): PensaStageView {
  return {
    stage,
    conversation: conversation
      ? {
          messages: conversation.messages,
          summary: conversation.summary,
          messageCount: conversation.messageCount,
        }
      : { messages: [], summary: null, messageCount: 0 },
    state: conversation?.state ?? {},
    artifacts: artifacts.map(toPensaArtifactView),
    tasks: tasks.map(toPensaTaskView),
    nextTaskId: nextAvailableTask(tasks)?.id ?? null,
  }
}
