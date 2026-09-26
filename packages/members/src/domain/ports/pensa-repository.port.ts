import type { CourseAudience } from '../course/course'
import type {
  PensaArtifact,
  PensaArtifactType,
  PensaChatMessage,
  PensaConversation,
  PensaCycle,
  PensaProject,
  PensaProjectAccess,
  PensaProjectMember,
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

export type NewPensaProjectMember = Omit<PensaProjectMember, 'joinedAt'>

export interface PensaRepository {
  /** Só os projetos PRÓPRIOS (a cota de criar é do dono; equipes não contam). */
  countActiveProjects(userId: string, audience: CourseAudience): Promise<number>
  /** Projetos ativos de que o perfil é DONO ou MEMBRO, com o papel resolvido. */
  listActiveProjects(
    userId: string,
    audience: CourseAudience,
  ): Promise<Array<{ project: PensaProjectAccess; currentCycle: PensaCycle }>>
  createProject(project: NewPensaProject, firstCycle: NewPensaCycle, now: Date): Promise<void>
  /** Dono OU membro da equipe; quem não é nenhum dos dois recebe `null` (→ 404). */
  findProject(
    projectId: string,
    userId: string,
    audience: CourseAudience,
  ): Promise<PensaProjectAccess | null>
  updateProject(projectId: string, patch: PensaProjectPatch, now: Date): Promise<void>
  // ── Equipe (26/09/2026) ──
  /**
   * Grava (ou apaga, `null`) o código. `false` = o código já é de OUTRO plano (o índice
   * único parcial recusou): quem chama sorteia outro. Nunca lança por colisão.
   */
  setShareCode(projectId: string, code: string | null, now: Date): Promise<boolean>
  /** Por código, em QUALQUER vitrine (o índice único é global): o serviço confere a vitrine. */
  findProjectByShareCode(code: string): Promise<PensaProject | null>
  listMembers(projectId: string): Promise<PensaProjectMember[]>
  /** Quantas equipes ATIVAS o perfil já entrou (o teto de `MAX_JOINED_PROJECTS`). */
  countMemberships(profileId: string, audience: CourseAudience): Promise<number>
  /** Toca o `updated_at` do projeto (o dono vê que o plano mudou). */
  /**
   * Entra na equipe DENTRO de uma transação que tranca o projeto: conferir a vaga e gravar
   * é um passo só, então dois convidados no mesmo instante não passam do teto, e a
   * duplicidade volta como `'duplicate'` em vez de estourar a chave primária.
   */
  addMember(
    member: NewPensaProjectMember,
    now: Date,
    maxMembers: number,
  ): Promise<'added' | 'duplicate' | 'full'>
  /** `false` = não estava na equipe. Toca o `updated_at` quando tira alguém. */
  removeMember(projectId: string, profileId: string, now: Date): Promise<boolean>
  /**
   * Apaga o plano INTEIRO do dono (ciclos, conversas, artefatos e cartões vão junto
   * pelas FKs `on delete cascade`). O ledger de XP/badges NÃO é tocado: `xp_events`
   * guarda snapshot sem FK, e a criança não perde o que já conquistou.
   */
  deleteProject(projectId: string, userId: string, audience: CourseAudience): Promise<void>

  listCycles(projectId: string): Promise<PensaCycle[]>
  createCycle(cycle: NewPensaCycle, now: Date, inherit?: InheritedPensaArtifact[]): Promise<void>
  findCycleWithProject(
    cycleId: string,
    userId: string,
    audience: CourseAudience,
  ): Promise<{ cycle: PensaCycle; project: PensaProjectAccess } | null>
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
  ): Promise<{ task: PensaTask; project: PensaProjectAccess; cycle: PensaCycle } | null>
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
