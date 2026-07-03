import { randomUUID } from 'node:crypto'
import { and, asc, count, desc, eq, getTableColumns, inArray, sql } from 'drizzle-orm'
import type { CourseAudience } from '../../../domain/course/course'
import type {
  PensaArtifact,
  PensaArtifactType,
  PensaChecklistItem,
  PensaConversation,
  PensaCycle,
  PensaProject,
  PensaStage,
  PensaTask,
  PensaWorkStage,
} from '../../../domain/pensa/pensa'
import type {
  InheritedPensaArtifact,
  NewPensaArtifact,
  NewPensaChecklistItem,
  NewPensaCycle,
  NewPensaProject,
  NewPensaTask,
  PensaConversationUpsert,
  PensaProjectPatch,
  PensaRepository,
  PensaTaskBoardChange,
  PensaTaskContentPatch,
} from '../../../domain/ports/pensa-repository.port'
import type { Database } from './db'
import {
  pensaArtifacts,
  pensaChecklistItems,
  pensaConversations,
  pensaCycles,
  pensaProjects,
  pensaTasks,
} from './schema'

// Colunas do PROJETO sem o BLOB `studio_snapshot` (≤1.8M chars): TODA leitura de
// projeto/ownership usa esta seleção explícita — o snapshot só sai nas leituras
// dedicadas (`getStudioSnapshot`), nunca de carona no detail/lista/joins.
const { studioSnapshot: _studioSnapshotBlob, ...projectColumns } = getTableColumns(pensaProjects)

type ProjectRow = Omit<typeof pensaProjects.$inferSelect, 'studioSnapshot'>
type CycleRow = typeof pensaCycles.$inferSelect
type ArtifactRow = typeof pensaArtifacts.$inferSelect
type TaskRow = typeof pensaTasks.$inferSelect
type ChecklistRow = typeof pensaChecklistItems.$inferSelect

const toProject = (row: ProjectRow): PensaProject => ({ ...row })
const toCycle = (row: CycleRow): PensaCycle => ({ ...row })
const toArtifact = (row: ArtifactRow): PensaArtifact => ({ ...row })
const toTask = (row: TaskRow): PensaTask => {
  const { boardColumn, ...rest } = row
  return { ...rest, column: boardColumn }
}
const toChecklistItem = (row: ChecklistRow): PensaChecklistItem => ({ ...row })

/** Campo `<from>CompletedAt` gravado no avanço de etapa. */
function completedAtPatch(from: PensaWorkStage, now: Date): Partial<CycleRow> {
  switch (from) {
    case 'z':
      return { zCompletedAt: now }
    case 'e':
      return { eCompletedAt: now }
    case 'r':
      return { rCompletedAt: now }
    case 'o':
      return { oCompletedAt: now }
  }
}

// Cliente de transação/db (mesma API de escrita).
type Tx = Parameters<Parameters<Database['transaction']>[0]>[0]

/** Toca `pensa_projects.updated_at` (a lista ordena por ele — TODA escrita passa aqui). */
async function touchProject(tx: Tx | Database, projectId: string, now: Date): Promise<void> {
  await tx.update(pensaProjects).set({ updatedAt: now }).where(eq(pensaProjects.id, projectId))
}

/** Filtro de OWNERSHIP do projeto (mismatch de dono/vitrine = não existe). */
function ownedProject(userId: string, audience: CourseAudience) {
  return and(eq(pensaProjects.userId, userId), eq(pensaProjects.audience, audience))
}

export class DrizzlePensaRepository implements PensaRepository {
  constructor(private readonly db: Database) {}

  // ── Projetos ────────────────────────────────────────────────────────────
  async countActiveProjects(userId: string, audience: CourseAudience): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(pensaProjects)
      .where(and(ownedProject(userId, audience), eq(pensaProjects.status, 'active')))
    return row?.value ?? 0
  }

  async listActiveProjects(
    userId: string,
    audience: CourseAudience,
  ): Promise<Array<{ project: PensaProject; currentCycle: PensaCycle }>> {
    const projects = await this.db
      .select(projectColumns)
      .from(pensaProjects)
      .where(and(ownedProject(userId, audience), eq(pensaProjects.status, 'active')))
      .orderBy(desc(pensaProjects.updatedAt))
    if (projects.length === 0) return []

    // Ciclo CORRENTE (maior number) de cada projeto — DISTINCT ON evita N+1.
    const currents = await this.db
      .selectDistinctOn([pensaCycles.projectId])
      .from(pensaCycles)
      .where(
        inArray(
          pensaCycles.projectId,
          projects.map((p) => p.id),
        ),
      )
      .orderBy(pensaCycles.projectId, desc(pensaCycles.number))
    const byProject = new Map(currents.map((c) => [c.projectId, c]))

    const rows: Array<{ project: PensaProject; currentCycle: PensaCycle }> = []
    for (const project of projects) {
      const current = byProject.get(project.id)
      // Projeto sem ciclo viola o invariante de criação — omitido em vez de quebrar a lista.
      if (!current) continue
      rows.push({ project: toProject(project), currentCycle: toCycle(current) })
    }
    return rows
  }

  async createProject(
    project: NewPensaProject,
    firstCycle: NewPensaCycle,
    now: Date,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(pensaProjects).values({ ...project, createdAt: now, updatedAt: now })
      await tx.insert(pensaCycles).values({ ...firstCycle, createdAt: now, updatedAt: now })
    })
  }

  async findProject(
    projectId: string,
    userId: string,
    audience: CourseAudience,
  ): Promise<PensaProject | null> {
    const [row] = await this.db
      .select(projectColumns)
      .from(pensaProjects)
      .where(and(eq(pensaProjects.id, projectId), ownedProject(userId, audience)))
      .limit(1)
    return row ? toProject(row) : null
  }

  async updateProject(projectId: string, patch: PensaProjectPatch, now: Date): Promise<void> {
    await this.db
      .update(pensaProjects)
      .set({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.studioProjectId !== undefined ? { studioProjectId: patch.studioProjectId } : {}),
        ...(patch.buildEnv !== undefined ? { buildEnv: patch.buildEnv } : {}),
        updatedAt: now,
      })
      .where(eq(pensaProjects.id, projectId))
  }

  // ── Snapshot do Estúdio (blob dedicado — fora das leituras de projeto) ────
  async getStudioSnapshot(
    projectId: string,
  ): Promise<{ snapshot: unknown; snapshotAt: Date | null }> {
    const [row] = await this.db
      .select({
        snapshot: pensaProjects.studioSnapshot,
        snapshotAt: pensaProjects.studioSnapshotAt,
      })
      .from(pensaProjects)
      .where(eq(pensaProjects.id, projectId))
      .limit(1)
    return { snapshot: row?.snapshot ?? null, snapshotAt: row?.snapshotAt ?? null }
  }

  async saveStudioSnapshot(
    projectId: string,
    snapshot: Record<string, unknown>,
    now: Date,
  ): Promise<void> {
    // UM update grava o blob + snapshot_at E toca `updated_at` (mesma linha —
    // a regra "toda escrita toca o projeto" sai de graça, sem transação).
    await this.db
      .update(pensaProjects)
      .set({ studioSnapshot: snapshot, studioSnapshotAt: now, updatedAt: now })
      .where(eq(pensaProjects.id, projectId))
  }

  // ── Ciclos ──────────────────────────────────────────────────────────────
  async listCycles(projectId: string): Promise<PensaCycle[]> {
    const rows = await this.db
      .select()
      .from(pensaCycles)
      .where(eq(pensaCycles.projectId, projectId))
      .orderBy(asc(pensaCycles.number))
    return rows.map(toCycle)
  }

  async createCycle(
    cycle: NewPensaCycle,
    now: Date,
    inherit: InheritedPensaArtifact[] = [],
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(pensaCycles).values({ ...cycle, createdAt: now, updatedAt: now })
      if (inherit.length > 0) {
        // Ciclo NOVO → primeira versão de cada tipo herdado; nasce validated.
        await tx.insert(pensaArtifacts).values(
          inherit.map((a) => ({
            id: a.id,
            cycleId: cycle.id,
            stage: a.stage,
            type: a.type,
            version: 1,
            content: a.content,
            status: 'validated' as const,
            createdAt: now,
          })),
        )
      }
      await touchProject(tx, cycle.projectId, now)
    })
  }

  async findCycleWithProject(
    cycleId: string,
    userId: string,
    audience: CourseAudience,
  ): Promise<{ cycle: PensaCycle; project: PensaProject } | null> {
    const [row] = await this.db
      .select({ cycle: pensaCycles, project: projectColumns })
      .from(pensaCycles)
      .innerJoin(pensaProjects, eq(pensaCycles.projectId, pensaProjects.id))
      .where(and(eq(pensaCycles.id, cycleId), ownedProject(userId, audience)))
      .limit(1)
    return row ? { cycle: toCycle(row.cycle), project: toProject(row.project) } : null
  }

  async advanceCycle(
    projectId: string,
    cycleId: string,
    from: PensaWorkStage,
    to: PensaStage,
    now: Date,
  ): Promise<PensaCycle> {
    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(pensaCycles)
        .set({ stage: to, ...completedAtPatch(from, now), updatedAt: now })
        .where(eq(pensaCycles.id, cycleId))
        .returning()
      if (!updated) throw new Error('Ciclo desapareceu durante o advance')
      await touchProject(tx, projectId, now)
      return toCycle(updated)
    })
  }

  // ── Conversas ───────────────────────────────────────────────────────────
  async getConversation(cycleId: string, stage: PensaStage): Promise<PensaConversation | null> {
    const [row] = await this.db
      .select()
      .from(pensaConversations)
      .where(and(eq(pensaConversations.cycleId, cycleId), eq(pensaConversations.stage, stage)))
      .limit(1)
    if (!row) return null
    return {
      cycleId: row.cycleId,
      stage: row.stage,
      messages: row.messages,
      summary: row.summary,
      state: row.state,
      messageCount: row.messageCount,
    }
  }

  async upsertConversation(
    projectId: string,
    data: PensaConversationUpsert,
    now: Date,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .insert(pensaConversations)
        .values({
          id: randomUUID(),
          cycleId: data.cycleId,
          stage: data.stage,
          messages: data.messages,
          summary: data.summary,
          state: data.state,
          messageCount: data.messageCount,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [pensaConversations.cycleId, pensaConversations.stage],
          set: {
            messages: data.messages,
            summary: data.summary,
            state: data.state,
            messageCount: data.messageCount,
            updatedAt: now,
          },
        })
      await touchProject(tx, projectId, now)
    })
  }

  // ── Artefatos ───────────────────────────────────────────────────────────
  async listLatestArtifacts(cycleId: string): Promise<PensaArtifact[]> {
    const rows = await this.db
      .selectDistinctOn([pensaArtifacts.type])
      .from(pensaArtifacts)
      .where(eq(pensaArtifacts.cycleId, cycleId))
      .orderBy(pensaArtifacts.type, desc(pensaArtifacts.version))
    return rows.map(toArtifact)
  }

  async listLatestArtifactsByStage(cycleId: string, stage: PensaStage): Promise<PensaArtifact[]> {
    const rows = await this.db
      .selectDistinctOn([pensaArtifacts.type])
      .from(pensaArtifacts)
      .where(and(eq(pensaArtifacts.cycleId, cycleId), eq(pensaArtifacts.stage, stage)))
      .orderBy(pensaArtifacts.type, desc(pensaArtifacts.version))
    return rows.map(toArtifact)
  }

  async findLatestArtifact(
    cycleId: string,
    type: PensaArtifactType,
  ): Promise<PensaArtifact | null> {
    const [row] = await this.db
      .select()
      .from(pensaArtifacts)
      .where(and(eq(pensaArtifacts.cycleId, cycleId), eq(pensaArtifacts.type, type)))
      .orderBy(desc(pensaArtifacts.version))
      .limit(1)
    return row ? toArtifact(row) : null
  }

  async insertArtifact(
    projectId: string,
    artifact: NewPensaArtifact,
    now: Date,
  ): Promise<PensaArtifact> {
    return this.db.transaction(async (tx) => {
      // `version = latest+1` resolvido NO INSERT (subquery) — o UNIQUE
      // (cycle, type, version) é o backstop contra corrida do mesmo dono.
      const [inserted] = await tx
        .insert(pensaArtifacts)
        .values({
          id: artifact.id,
          cycleId: artifact.cycleId,
          stage: artifact.stage,
          type: artifact.type,
          version: sql<number>`coalesce((select max(${pensaArtifacts.version}) from ${pensaArtifacts} where ${pensaArtifacts.cycleId} = ${artifact.cycleId} and ${pensaArtifacts.type} = ${artifact.type}), 0) + 1`,
          content: artifact.content,
          status: 'draft',
          createdAt: now,
        })
        .returning()
      if (!inserted) throw new Error('Insert de artefato não retornou a linha')
      await touchProject(tx, projectId, now)
      return toArtifact(inserted)
    })
  }

  async validateArtifact(projectId: string, artifactId: string, now: Date): Promise<PensaArtifact> {
    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(pensaArtifacts)
        .set({ status: 'validated' })
        .where(eq(pensaArtifacts.id, artifactId))
        .returning()
      if (!updated) throw new Error('Artefato desapareceu durante a validação')
      await touchProject(tx, projectId, now)
      return toArtifact(updated)
    })
  }

  // ── Tasks (kanban) ──────────────────────────────────────────────────────
  async countTasks(cycleId: string): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(pensaTasks)
      .where(eq(pensaTasks.cycleId, cycleId))
    return row?.value ?? 0
  }

  async listTasks(cycleId: string): Promise<PensaTask[]> {
    const rows = await this.db
      .select()
      .from(pensaTasks)
      .where(eq(pensaTasks.cycleId, cycleId))
      .orderBy(asc(pensaTasks.boardColumn), asc(pensaTasks.position))
    return rows.map(toTask)
  }

  async replaceTasks(
    projectId: string,
    cycleId: string,
    tasks: NewPensaTask[],
    now: Date,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.delete(pensaTasks).where(eq(pensaTasks.cycleId, cycleId))
      if (tasks.length > 0) {
        await tx.insert(pensaTasks).values(
          tasks.map((task) => ({
            id: task.id,
            cycleId,
            title: task.title,
            summary: task.summary,
            taskType: task.taskType,
            mission: task.mission,
            boardColumn: task.column,
            position: task.position,
            notes: task.notes,
            createdAt: now,
            updatedAt: now,
          })),
        )
      }
      await touchProject(tx, projectId, now)
    })
  }

  async appendTasks(
    projectId: string,
    cycleId: string,
    tasks: NewPensaTask[],
    now: Date,
  ): Promise<void> {
    if (tasks.length === 0) return
    await this.db.transaction(async (tx) => {
      await tx.insert(pensaTasks).values(
        tasks.map((task) => ({
          id: task.id,
          cycleId,
          title: task.title,
          summary: task.summary,
          taskType: task.taskType,
          mission: task.mission,
          boardColumn: task.column,
          position: task.position,
          notes: task.notes,
          createdAt: now,
          updatedAt: now,
        })),
      )
      await touchProject(tx, projectId, now)
    })
  }

  async findTaskWithProject(
    taskId: string,
    userId: string,
    audience: CourseAudience,
  ): Promise<{ task: PensaTask; project: PensaProject } | null> {
    const [row] = await this.db
      .select({ task: pensaTasks, project: projectColumns })
      .from(pensaTasks)
      .innerJoin(pensaCycles, eq(pensaTasks.cycleId, pensaCycles.id))
      .innerJoin(pensaProjects, eq(pensaCycles.projectId, pensaProjects.id))
      .where(and(eq(pensaTasks.id, taskId), ownedProject(userId, audience)))
      .limit(1)
    return row ? { task: toTask(row.task), project: toProject(row.project) } : null
  }

  async applyTaskChanges(
    projectId: string,
    changes: PensaTaskBoardChange[],
    now: Date,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (const change of changes) {
        await tx
          .update(pensaTasks)
          .set({
            boardColumn: change.column,
            position: change.position,
            ...(change.notes !== undefined ? { notes: change.notes } : {}),
            updatedAt: now,
          })
          .where(eq(pensaTasks.id, change.id))
      }
      await touchProject(tx, projectId, now)
    })
  }

  async updateTaskContent(
    projectId: string,
    taskId: string,
    patch: PensaTaskContentPatch,
    now: Date,
  ): Promise<PensaTask> {
    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(pensaTasks)
        .set({
          ...(patch.title !== undefined ? { title: patch.title } : {}),
          ...(patch.summary !== undefined ? { summary: patch.summary } : {}),
          ...(patch.taskType !== undefined ? { taskType: patch.taskType } : {}),
          ...(patch.mission !== undefined ? { mission: patch.mission } : {}),
          updatedAt: now,
        })
        .where(eq(pensaTasks.id, taskId))
        .returning()
      if (!updated) throw new Error('Task desapareceu durante a edição')
      await touchProject(tx, projectId, now)
      return toTask(updated)
    })
  }

  async deleteTask(projectId: string, taskId: string, now: Date): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.delete(pensaTasks).where(eq(pensaTasks.id, taskId))
      await touchProject(tx, projectId, now)
    })
  }

  // ── Checklist ───────────────────────────────────────────────────────────
  async listChecklist(cycleId: string): Promise<PensaChecklistItem[]> {
    const rows = await this.db
      .select()
      .from(pensaChecklistItems)
      .where(eq(pensaChecklistItems.cycleId, cycleId))
      .orderBy(asc(pensaChecklistItems.position))
    return rows.map(toChecklistItem)
  }

  async replaceChecklist(
    projectId: string,
    cycleId: string,
    items: NewPensaChecklistItem[],
    now: Date,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.delete(pensaChecklistItems).where(eq(pensaChecklistItems.cycleId, cycleId))
      if (items.length > 0) {
        await tx
          .insert(pensaChecklistItems)
          .values(items.map((item) => ({ ...item, cycleId, done: false, doneAt: null })))
      }
      await touchProject(tx, projectId, now)
    })
  }

  async findChecklistItemWithProject(
    itemId: string,
    userId: string,
    audience: CourseAudience,
  ): Promise<{ item: PensaChecklistItem; project: PensaProject } | null> {
    const [row] = await this.db
      .select({ item: pensaChecklistItems, project: projectColumns })
      .from(pensaChecklistItems)
      .innerJoin(pensaCycles, eq(pensaChecklistItems.cycleId, pensaCycles.id))
      .innerJoin(pensaProjects, eq(pensaCycles.projectId, pensaProjects.id))
      .where(and(eq(pensaChecklistItems.id, itemId), ownedProject(userId, audience)))
      .limit(1)
    return row ? { item: toChecklistItem(row.item), project: toProject(row.project) } : null
  }

  async setChecklistItemDone(
    projectId: string,
    itemId: string,
    done: boolean,
    now: Date,
  ): Promise<PensaChecklistItem> {
    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(pensaChecklistItems)
        .set({ done, doneAt: done ? now : null })
        .where(eq(pensaChecklistItems.id, itemId))
        .returning()
      if (!updated) throw new Error('Item do checklist desapareceu durante o toggle')
      await touchProject(tx, projectId, now)
      return toChecklistItem(updated)
    })
  }
}
