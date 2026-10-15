import type { PensaTeamArtItem } from '@sistemazero/core/pensa'
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
import type { PensaRoleRow } from '../pensa/team'

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

/** Quem mexe numa missão: o perfil e a CONTA dele (a evidência é conferida na conta do ator). */
export interface PensaTaskActor {
  profileId: string
  accountId: string
}

/**
 * Resultado de `setRoles`: `updated`; `code_locked` = trocar quem programa depois de o jogo
 * começar (regra 5); `not_in_team` = algum id não está mais na equipe (alguém saiu entre a
 * leitura e a trava); `legacy` = plano sem jornada v2; `not_found` = o plano sumiu.
 */
export type PensaSetRolesOutcome =
  | 'updated'
  | 'code_locked'
  | 'not_in_team'
  | 'legacy'
  | 'not_found'

/** Uma missão concluída com arte entregue (o download de "Trazer da equipe"). */
export interface PensaTeamArtTask {
  completedByProfileId: string
  tool: 'pinta' | 'molda'
  assetId: string
}

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
   * duplicidade volta como `'duplicate'` em vez de estourar a chave primária. O código
   * e o status são revalidados sob a mesma trava: revogar/arquivar fecha a porta imediatamente.
   */
  addMember(
    member: NewPensaProjectMember,
    now: Date,
    maxMembers: number,
    expectedCode: string,
  ): Promise<'added' | 'duplicate' | 'full' | 'invite_invalid'>
  /**
   * `false` = não estava na equipe. Toca o `updated_at` quando tira alguém. Na MESMA transação
   * apaga as funções da pessoa (v2) e solta as missões não concluídas que ela tinha começado.
   */
  removeMember(projectId: string, profileId: string, now: Date): Promise<boolean>
  // ── Funções da equipe no v2 (14/10/2026) ──
  /** As linhas CRUAS de `pensa_project_roles` (quem lê passa por `pensaTeamRoles`). */
  listRoles(projectId: string): Promise<PensaRoleRow[]>
  /**
   * Troca as funções de uma vez, com a linha do projeto TRANCADA (`for update`): confere a
   * equipe, a regra 5 (quem programa só muda antes de o jogo começar), regrava as linhas
   * (`code` igual à dona = sem linha; `art` vazio = sem linhas), solta as missões não
   * concluídas de quem perdeu a função e sobe a revisão da jornada (as colegas percebem).
   */
  setRoles(
    projectId: string,
    roles: { code: string; art: readonly string[] },
    assignedBy: string,
    now: Date,
  ): Promise<PensaSetRolesOutcome>
  /**
   * O jogo já começou no Estúdio de quem programa: alguma missão do Estúdio do ciclo atual saiu
   * de `planned` ou existe uma versão guardada (checkpoint) do plano.
   */
  isCodeLocked(projectId: string): Promise<boolean>
  /**
   * As artes ENTREGUES no plano por OUTRA pessoa (`completed_by` ≠ `viewerProfileId`): missões
   * não arquivadas de todos os ciclos, concluídas, com `outputRef` do Pinta ou do Molda, cuja
   * criação segue viva e confirmada na conta de quem concluiu. Mais recente primeiro.
   */
  listTeamArt(
    projectId: string,
    viewerProfileId: string,
    limit: number,
  ): Promise<PensaTeamArtItem[]>
  /** A missão de arte entregue (não arquivada, concluída, com `outputRef` de arte) ou `null`. */
  findTeamArtTask(projectId: string, taskId: string): Promise<PensaTeamArtTask | null>
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
  /**
   * `journey` = o projeto tem a jornada v2 ATIVA (a mesma régua que o `updateTaskProgress`
   * usa para exigir a criação guardada). É ela, e não a marca do guia, que libera concluir
   * uma missão direto do `planned`.
   */
  findTaskWithProject(
    taskId: string,
    userId: string,
    audience: CourseAudience,
  ): Promise<{
    task: PensaTask
    project: PensaProjectAccess
    cycle: PensaCycle
    journey: boolean
  } | null>
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
  /**
   * Na jornada v2 confere, sob a trava do projeto, a função do ATOR e a missão pega por outra
   * pessoa (`assertPensaMissionWorker`), a evidência na conta do ATOR e grava `assignee` e
   * `completed_by` (`pensaMissionOwnership`).
   */
  updateTaskProgress(
    projectId: string,
    taskId: string,
    progress: PensaTaskProgress,
    expectedUpdatedAt: Date | null,
    now: Date,
    actor: PensaTaskActor,
  ): Promise<PensaTask>
  deleteTask(projectId: string, taskId: string, now: Date): Promise<void>
}
