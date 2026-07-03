import type { CourseAudience } from '../course/course'
import type {
  PensaArtifact,
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
  PensaWorkStage,
} from '../pensa/pensa'

export interface NewPensaProject {
  id: string
  userId: string
  accountId: string
  audience: CourseAudience
  kind: PensaProjectKind
  name: string
}

export interface NewPensaCycle {
  id: string
  projectId: string
  number: number
  goal: string | null
}

/** Patch parcial do projeto — campo `undefined` = não mexe. */
export interface PensaProjectPatch {
  name?: string
  status?: PensaProjectStatus
  studioProjectId?: string | null
  buildEnv?: PensaBuildEnv
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

export interface NewPensaTask {
  id: string
  title: string
  summary: string | null
  taskType: string | null
  mission: PensaMission
  column: PensaTaskColumn
  position: number
  notes: string | null
}

/** Mudança de board por task; `notes` presente (mesmo `null`) = sobrescreve. */
export interface PensaTaskBoardChange {
  id: string
  column: PensaTaskColumn
  position: number
  notes?: string | null
}

export interface NewPensaChecklistItem {
  id: string
  category: PensaChecklistCategory
  title: string
  description: string | null
  required: boolean
  position: number
}

/**
 * Persistência do Pensa (planejamento guiado). OWNERSHIP: os `find*WithProject`
 * resolvem o recurso JUNTO do projeto dono já filtrando por (userId, audience) —
 * mismatch devolve `null` e o use case traduz p/ `PensaNotFoundError` (nunca
 * vazar existência). TODA escrita recebe `projectId` e toca
 * `pensa_projects.updated_at` na MESMA transação (a lista ordena por ele).
 */
export interface PensaRepository {
  // ── Projetos ──────────────────────────────────────────────────────────────
  countActiveProjects(userId: string, audience: CourseAudience): Promise<number>
  /** Projetos `active` do dono + ciclo CORRENTE (maior number), por updated_at DESC. */
  listActiveProjects(
    userId: string,
    audience: CourseAudience,
  ): Promise<Array<{ project: PensaProject; currentCycle: PensaCycle }>>
  /** Cria projeto + ciclo 1 (stage z) ATOMICAMENTE (transação). */
  createProject(project: NewPensaProject, firstCycle: NewPensaCycle, now: Date): Promise<void>
  /** Projeto por id FILTRADO pelo dono (userId + audience) — mismatch → null. */
  findProject(
    projectId: string,
    userId: string,
    audience: CourseAudience,
  ): Promise<PensaProject | null>
  updateProject(projectId: string, patch: PensaProjectPatch, now: Date): Promise<void>

  // ── Snapshot do Estúdio (BLOB fora do PensaProject — pesado) ──────────────
  /** Blob + data do snapshot. OWNERSHIP já resolvida pelo caller (findProject). */
  getStudioSnapshot(projectId: string): Promise<{ snapshot: unknown; snapshotAt: Date | null }>
  /** Grava snapshot + snapshot_at = now e toca `updated_at` (mesmo UPDATE). */
  saveStudioSnapshot(projectId: string, snapshot: Record<string, unknown>, now: Date): Promise<void>

  // ── Ciclos ────────────────────────────────────────────────────────────────
  /** Ciclos do projeto por `number` ASC. */
  listCycles(projectId: string): Promise<PensaCycle[]>
  /** Insere o ciclo + toca o projeto (transação). */
  createCycle(cycle: NewPensaCycle, now: Date): Promise<void>
  /** Ciclo + projeto dono, filtrado por (userId, audience) — mismatch → null. */
  findCycleWithProject(
    cycleId: string,
    userId: string,
    audience: CourseAudience,
  ): Promise<{ cycle: PensaCycle; project: PensaProject } | null>
  /** Avança o stage + grava `<from>_completed_at` + toca o projeto (transação). */
  advanceCycle(
    projectId: string,
    cycleId: string,
    from: PensaWorkStage,
    to: PensaStage,
    now: Date,
  ): Promise<PensaCycle>

  // ── Conversas (1 linha por ciclo+etapa; upsert) ───────────────────────────
  getConversation(cycleId: string, stage: PensaStage): Promise<PensaConversation | null>
  upsertConversation(projectId: string, data: PensaConversationUpsert, now: Date): Promise<void>

  // ── Artefatos (append-only, versionados) ──────────────────────────────────
  /** LATEST por type do ciclo inteiro (insumo do detail + gates z/e). */
  listLatestArtifacts(cycleId: string): Promise<PensaArtifact[]>
  /** LATEST por type ENTRE os artefatos da etapa (insumo da stage view). */
  listLatestArtifactsByStage(cycleId: string, stage: PensaStage): Promise<PensaArtifact[]>
  findLatestArtifact(cycleId: string, type: PensaArtifactType): Promise<PensaArtifact | null>
  /** Insere com `version = latest+1` (resolvido na transação) + toca o projeto. */
  insertArtifact(projectId: string, artifact: NewPensaArtifact, now: Date): Promise<PensaArtifact>
  /** Marca `validated` + toca o projeto (transação). */
  validateArtifact(projectId: string, artifactId: string, now: Date): Promise<PensaArtifact>

  // ── Tasks (kanban de missões) ─────────────────────────────────────────────
  countTasks(cycleId: string): Promise<number>
  /** Tasks do ciclo por (coluna, position). */
  listTasks(cycleId: string): Promise<PensaTask[]>
  /** REPLACE total (delete + insert) + toca o projeto (transação). */
  replaceTasks(projectId: string, cycleId: string, tasks: NewPensaTask[], now: Date): Promise<void>
  /** Task + projeto dono, filtrado por (userId, audience) — mismatch → null. */
  findTaskWithProject(
    taskId: string,
    userId: string,
    audience: CourseAudience,
  ): Promise<{ task: PensaTask; project: PensaProject } | null>
  /** Aplica o lote de mudanças de board (move/re-sequência/notes) + toca o projeto. */
  applyTaskChanges(projectId: string, changes: PensaTaskBoardChange[], now: Date): Promise<void>

  // ── Checklist de lançamento ───────────────────────────────────────────────
  /** Itens do ciclo por position ASC. */
  listChecklist(cycleId: string): Promise<PensaChecklistItem[]>
  /** REPLACE total (delete + insert) + toca o projeto (transação). */
  replaceChecklist(
    projectId: string,
    cycleId: string,
    items: NewPensaChecklistItem[],
    now: Date,
  ): Promise<void>
  /** Item + projeto dono, filtrado por (userId, audience) — mismatch → null. */
  findChecklistItemWithProject(
    itemId: string,
    userId: string,
    audience: CourseAudience,
  ): Promise<{ item: PensaChecklistItem; project: PensaProject } | null>
  /** Seta done/done_at + toca o projeto (transação). */
  setChecklistItemDone(
    projectId: string,
    itemId: string,
    done: boolean,
    now: Date,
  ): Promise<PensaChecklistItem>
}
