import type { CourseAudience } from '../course/course'
import type {
  PensaArtifact,
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
  PensaTaskProgress,
  PensaTaskStatus,
  PensaWorkStage,
} from '../pensa/pensa'

export interface NewPensaProject {
  id: string
  userId: string
  accountId: string
  audience: CourseAudience
  kind: 'game'
  name: string
}

export interface NewPensaCycle {
  id: string
  projectId: string
  number: number
  goal: string | null
}

export interface PensaProjectPatch {
  name?: string
  status?: PensaProjectStatus
}

export interface PensaConversationUpsert {
  cycleId: string
  stage: PensaWorkStage
  messages: PensaChatMessage[]
  summary: string | null
  state: Record<string, unknown>
  messageCount: number
}

export interface NewPensaArtifact {
  id: string
  cycleId: string
  stage: PensaWorkStage
  type: PensaArtifactType
  content: unknown
}

export interface InheritedPensaArtifact {
  id: string
  stage: PensaWorkStage
  type: PensaArtifactType
  content: unknown
}

/** Dependências já resolvidas para IDs reais pelo serviço. */
export interface NewPensaTask {
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
  revision?: number
  supersedesTaskId?: string | null
}

export interface PensaTaskPlanPatch {
  title?: string
  summary?: string | null
  destination?: PensaTaskDestination
  category?: PensaTaskCategory
  estimatedMinutes?: number
  position?: number
  dependencies?: string[]
  guide?: PensaTaskGuide
  context?: PensaTaskContext
}

export interface PensaTaskProgressPatch {
  status?: PensaTaskStatus
  completedStepIds?: string[]
  completedCriteriaIds?: string[]
  outputRef?: PensaTaskOutputRef | null
}

export interface PensaRepository {
  countActiveProjects(userId: string, audience: CourseAudience): Promise<number>
  listActiveProjects(
    userId: string,
    audience: CourseAudience,
  ): Promise<Array<{ project: PensaProject; currentCycle: PensaCycle }>>
  createProject(project: NewPensaProject, firstCycle: NewPensaCycle, now: Date): Promise<void>
  findProject(
    projectId: string,
    userId: string,
    audience: CourseAudience,
  ): Promise<PensaProject | null>
  updateProject(projectId: string, patch: PensaProjectPatch, now: Date): Promise<void>

  listCycles(projectId: string): Promise<PensaCycle[]>
  createCycle(cycle: NewPensaCycle, now: Date, inherit?: InheritedPensaArtifact[]): Promise<void>
  findCycleWithProject(
    cycleId: string,
    userId: string,
    audience: CourseAudience,
  ): Promise<{ cycle: PensaCycle; project: PensaProject } | null>
  advanceCycle(
    projectId: string,
    cycleId: string,
    from: PensaWorkStage,
    to: PensaStage,
    now: Date,
  ): Promise<PensaCycle>
  /** Edição do plano aprovado volta a versão para a auditoria O. */
  reopenCycleReview(projectId: string, cycleId: string, now: Date): Promise<PensaCycle>

  getConversation(cycleId: string, stage: PensaStage): Promise<PensaConversation | null>
  upsertConversation(projectId: string, data: PensaConversationUpsert, now: Date): Promise<void>

  listLatestArtifacts(cycleId: string): Promise<PensaArtifact[]>
  listLatestArtifactsByStage(cycleId: string, stage: PensaStage): Promise<PensaArtifact[]>
  findLatestArtifact(cycleId: string, type: PensaArtifactType): Promise<PensaArtifact | null>
  insertArtifact(projectId: string, artifact: NewPensaArtifact, now: Date): Promise<PensaArtifact>
  validateArtifact(projectId: string, artifactId: string, now: Date): Promise<PensaArtifact>

  countTasks(cycleId: string): Promise<number>
  listTasks(cycleId: string): Promise<PensaTask[]>
  replaceTasks(projectId: string, cycleId: string, tasks: NewPensaTask[], now: Date): Promise<void>
  appendTasks(projectId: string, cycleId: string, tasks: NewPensaTask[], now: Date): Promise<void>
  findTaskWithProject(
    taskId: string,
    userId: string,
    audience: CourseAudience,
  ): Promise<{ task: PensaTask; project: PensaProject; cycle: PensaCycle } | null>
  updateTaskPlan(
    projectId: string,
    taskId: string,
    patch: PensaTaskPlanPatch,
    now: Date,
  ): Promise<PensaTask>
  reviseTask(
    projectId: string,
    source: PensaTask,
    replacement: NewPensaTask,
    now: Date,
  ): Promise<PensaTask>
  updateTaskProgress(
    projectId: string,
    taskId: string,
    progress: PensaTaskProgress,
    expectedUpdatedAt: Date | null,
    now: Date,
  ): Promise<PensaTask>
  deleteTask(projectId: string, taskId: string, now: Date): Promise<void>
}
