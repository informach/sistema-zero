import { randomUUID } from 'node:crypto'
import { and, asc, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import type { CourseAudience } from '../../../domain/course/course'
import type {
  PensaArtifact,
  PensaArtifactType,
  PensaConversation,
  PensaCycle,
  PensaProject,
  PensaStage,
  PensaTask,
  PensaTaskProgress,
  PensaWorkStage,
} from '../../../domain/pensa/pensa'
import { PensaTaskProgressConflictError } from '../../../domain/pensa/pensa.errors'
import type {
  InheritedPensaArtifact,
  NewPensaArtifact,
  NewPensaCycle,
  NewPensaProject,
  NewPensaTask,
  PensaConversationUpsert,
  PensaProjectPatch,
  PensaRepository,
  PensaTaskPlanPatch,
} from '../../../domain/ports/pensa-repository.port'
import type { Database } from './db'
import {
  pensaArtifacts,
  pensaConversations,
  pensaCycles,
  pensaProjects,
  pensaTasks,
} from './schema'

type ProjectRow = typeof pensaProjects.$inferSelect
type CycleRow = typeof pensaCycles.$inferSelect
type ArtifactRow = typeof pensaArtifacts.$inferSelect
type TaskRow = typeof pensaTasks.$inferSelect
type Tx = Parameters<Parameters<Database['transaction']>[0]>[0]

const toProject = (row: ProjectRow): PensaProject => ({ ...row })
const toCycle = (row: CycleRow): PensaCycle => ({ ...row })
const toArtifact = (row: ArtifactRow): PensaArtifact => ({ ...row })
const toTask = (row: TaskRow): PensaTask => ({
  id: row.id,
  cycleId: row.cycleId,
  title: row.title,
  summary: row.summary,
  destination: row.destination,
  category: row.category,
  estimatedMinutes: row.estimatedMinutes,
  position: row.position,
  dependencies: row.dependencies,
  guide: row.guide,
  context: row.context,
  progress: {
    status: row.progressStatus,
    completedStepIds: row.completedStepIds,
    completedCriteriaIds: row.completedCriteriaIds,
    outputRef: row.outputRef,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    updatedAt: row.progressUpdatedAt,
  },
  revision: row.revision,
  supersedesTaskId: row.supersedesTaskId,
  archivedAt: row.archivedAt,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
})

function completedAtPatch(from: PensaWorkStage, now: Date): Partial<CycleRow> {
  if (from === 'z') return { zCompletedAt: now }
  if (from === 'e') return { eCompletedAt: now }
  if (from === 'r') return { rCompletedAt: now }
  return { oCompletedAt: now }
}

async function touchProject(tx: Tx | Database, projectId: string, now: Date): Promise<void> {
  await tx.update(pensaProjects).set({ updatedAt: now }).where(eq(pensaProjects.id, projectId))
}

async function draftLatestPlanReview(tx: Tx, cycleId: string): Promise<void> {
  const [latestReview] = await tx
    .select({ id: pensaArtifacts.id })
    .from(pensaArtifacts)
    .where(and(eq(pensaArtifacts.cycleId, cycleId), eq(pensaArtifacts.type, 'plan_review')))
    .orderBy(desc(pensaArtifacts.version))
    .limit(1)
  if (latestReview) {
    await tx
      .update(pensaArtifacts)
      .set({ status: 'draft' })
      .where(eq(pensaArtifacts.id, latestReview.id))
  }
}

/** Mantém task_plan e plan_review coerentes na mesma transação da mutação do plano. */
async function reconcileTaskArtifacts(tx: Tx, cycleId: string, now: Date): Promise<void> {
  const [cycle] = await tx
    .select()
    .from(pensaCycles)
    .where(eq(pensaCycles.id, cycleId))
    .limit(1)
    .for('update')
  if (!cycle) throw new Error('Ciclo desapareceu durante a atualização do plano')
  const [latestPlan] = await tx
    .select()
    .from(pensaArtifacts)
    .where(and(eq(pensaArtifacts.cycleId, cycleId), eq(pensaArtifacts.type, 'task_plan')))
    .orderBy(desc(pensaArtifacts.version))
    .limit(1)
  if (latestPlan) {
    const tasks = await tx
      .select({ id: pensaTasks.id })
      .from(pensaTasks)
      .where(and(eq(pensaTasks.cycleId, cycleId), isNull(pensaTasks.archivedAt)))
      .orderBy(asc(pensaTasks.position))
    await tx.insert(pensaArtifacts).values({
      id: randomUUID(),
      cycleId,
      stage: 'r',
      type: 'task_plan',
      version: latestPlan.version + 1,
      content: {
        taskIds: tasks.map((task) => task.id),
        generatedAt: now.toISOString(),
        catalog: 'studio-official',
      },
      status: cycle.stage === 'r' ? 'draft' : 'validated',
      createdAt: now,
    })
  }
  if (cycle.stage === 'o' || cycle.stage === 'done') {
    await tx
      .update(pensaCycles)
      .set({ stage: 'o', oCompletedAt: null, updatedAt: now })
      .where(eq(pensaCycles.id, cycleId))
    await draftLatestPlanReview(tx, cycleId)
  }
}

function ownedProject(userId: string, audience: CourseAudience) {
  return and(eq(pensaProjects.userId, userId), eq(pensaProjects.audience, audience))
}

const taskValues = (cycleId: string, task: NewPensaTask, now: Date) => ({
  id: task.id,
  cycleId,
  title: task.title,
  summary: task.summary,
  destination: task.destination,
  category: task.category,
  estimatedMinutes: task.estimatedMinutes,
  position: task.position,
  dependencies: task.dependencies,
  guide: task.guide,
  context: task.context,
  progressStatus: 'planned' as const,
  completedStepIds: [],
  completedCriteriaIds: [],
  outputRef: null,
  startedAt: null,
  completedAt: null,
  progressUpdatedAt: null,
  revision: task.revision ?? 1,
  supersedesTaskId: task.supersedesTaskId ?? null,
  archivedAt: null,
  createdAt: now,
  updatedAt: now,
})

export class DrizzlePensaRepository implements PensaRepository {
  constructor(private readonly db: Database) {}

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
      .select()
      .from(pensaProjects)
      .where(and(ownedProject(userId, audience), eq(pensaProjects.status, 'active')))
      .orderBy(desc(pensaProjects.updatedAt))
    if (projects.length === 0) return []
    const currents = await this.db
      .selectDistinctOn([pensaCycles.projectId])
      .from(pensaCycles)
      .where(
        inArray(
          pensaCycles.projectId,
          projects.map((project) => project.id),
        ),
      )
      .orderBy(pensaCycles.projectId, desc(pensaCycles.number))
    const byProject = new Map(currents.map((cycle) => [cycle.projectId, cycle]))
    return projects.flatMap((project) => {
      const currentCycle = byProject.get(project.id)
      return currentCycle
        ? [{ project: toProject(project), currentCycle: toCycle(currentCycle) }]
        : []
    })
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
      .select()
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
        updatedAt: now,
      })
      .where(eq(pensaProjects.id, projectId))
  }

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
        await tx.insert(pensaArtifacts).values(
          inherit.map((artifact) => ({
            ...artifact,
            cycleId: cycle.id,
            version: 1,
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
      .select({ cycle: pensaCycles, project: pensaProjects })
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
      if (!updated) throw new Error('Ciclo desapareceu durante o avanço')
      await touchProject(tx, projectId, now)
      return toCycle(updated)
    })
  }

  async reopenCycleReview(projectId: string, cycleId: string, now: Date): Promise<PensaCycle> {
    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(pensaCycles)
        .set({ stage: 'o', oCompletedAt: null, updatedAt: now })
        .where(eq(pensaCycles.id, cycleId))
        .returning()
      if (!updated) throw new Error('Ciclo desapareceu durante a reabertura da revisão')
      await draftLatestPlanReview(tx, cycleId)
      await touchProject(tx, projectId, now)
      return toCycle(updated)
    })
  }

  async getConversation(cycleId: string, stage: PensaStage): Promise<PensaConversation | null> {
    const [row] = await this.db
      .select()
      .from(pensaConversations)
      .where(and(eq(pensaConversations.cycleId, cycleId), eq(pensaConversations.stage, stage)))
      .limit(1)
    return row ? { ...row } : null
  }

  async upsertConversation(
    projectId: string,
    data: PensaConversationUpsert,
    now: Date,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .insert(pensaConversations)
        .values({ id: randomUUID(), ...data, updatedAt: now })
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
      const [inserted] = await tx
        .insert(pensaArtifacts)
        .values({
          ...artifact,
          version: sql<number>`coalesce((select max(${pensaArtifacts.version}) from ${pensaArtifacts} where ${pensaArtifacts.cycleId} = ${artifact.cycleId} and ${pensaArtifacts.type} = ${artifact.type}), 0) + 1`,
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

  async countTasks(cycleId: string): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(pensaTasks)
      .where(and(eq(pensaTasks.cycleId, cycleId), isNull(pensaTasks.archivedAt)))
    return row?.value ?? 0
  }

  async listTasks(cycleId: string): Promise<PensaTask[]> {
    const rows = await this.db
      .select()
      .from(pensaTasks)
      .where(and(eq(pensaTasks.cycleId, cycleId), isNull(pensaTasks.archivedAt)))
      .orderBy(asc(pensaTasks.position))
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
      if (tasks.length > 0)
        await tx.insert(pensaTasks).values(tasks.map((task) => taskValues(cycleId, task, now)))
      await reconcileTaskArtifacts(tx, cycleId, now)
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
      await tx.insert(pensaTasks).values(tasks.map((task) => taskValues(cycleId, task, now)))
      await reconcileTaskArtifacts(tx, cycleId, now)
      await touchProject(tx, projectId, now)
    })
  }

  async findTaskWithProject(
    taskId: string,
    userId: string,
    audience: CourseAudience,
  ): Promise<{ task: PensaTask; project: PensaProject; cycle: PensaCycle } | null> {
    const [row] = await this.db
      .select({ task: pensaTasks, project: pensaProjects, cycle: pensaCycles })
      .from(pensaTasks)
      .innerJoin(pensaCycles, eq(pensaTasks.cycleId, pensaCycles.id))
      .innerJoin(pensaProjects, eq(pensaCycles.projectId, pensaProjects.id))
      .where(
        and(
          eq(pensaTasks.id, taskId),
          isNull(pensaTasks.archivedAt),
          ownedProject(userId, audience),
        ),
      )
      .limit(1)
    return row
      ? { task: toTask(row.task), project: toProject(row.project), cycle: toCycle(row.cycle) }
      : null
  }

  async updateTaskPlan(
    projectId: string,
    taskId: string,
    patch: PensaTaskPlanPatch,
    now: Date,
  ): Promise<PensaTask> {
    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(pensaTasks)
        .set({ ...patch, updatedAt: now })
        .where(and(eq(pensaTasks.id, taskId), isNull(pensaTasks.archivedAt)))
        .returning()
      if (!updated) throw new Error('Tarefa desapareceu durante a edição')
      await reconcileTaskArtifacts(tx, updated.cycleId, now)
      await touchProject(tx, projectId, now)
      return toTask(updated)
    })
  }

  async reviseTask(
    projectId: string,
    source: PensaTask,
    replacement: NewPensaTask,
    now: Date,
  ): Promise<PensaTask> {
    return this.db.transaction(async (tx) => {
      await tx
        .update(pensaTasks)
        .set({ archivedAt: now, updatedAt: now })
        .where(eq(pensaTasks.id, source.id))
      const [inserted] = await tx
        .insert(pensaTasks)
        .values(
          taskValues(
            source.cycleId,
            {
              ...replacement,
              revision: source.revision + 1,
              supersedesTaskId: source.id,
            },
            now,
          ),
        )
        .returning()
      if (!inserted) throw new Error('A revisão da tarefa não foi criada')

      const replacements = new Map([[source.id, inserted.id]])
      const dependants = await tx
        .select()
        .from(pensaTasks)
        .where(and(eq(pensaTasks.cycleId, source.cycleId), isNull(pensaTasks.archivedAt)))
        .orderBy(asc(pensaTasks.position))
      for (const dependant of dependants) {
        const dependencies = dependant.dependencies.map(
          (dependencyId) => replacements.get(dependencyId) ?? dependencyId,
        )
        if (
          dependencies.every(
            (dependencyId, index) => dependencyId === dependant.dependencies[index],
          )
        )
          continue
        if (dependant.progressStatus === 'planned') {
          await tx
            .update(pensaTasks)
            .set({ dependencies, updatedAt: now })
            .where(eq(pensaTasks.id, dependant.id))
          continue
        }
        const replacementId = randomUUID()
        await tx
          .update(pensaTasks)
          .set({ archivedAt: now, updatedAt: now })
          .where(eq(pensaTasks.id, dependant.id))
        await tx.insert(pensaTasks).values(
          taskValues(
            source.cycleId,
            {
              id: replacementId,
              title: dependant.title,
              summary: dependant.summary,
              destination: dependant.destination,
              category: dependant.category,
              estimatedMinutes: dependant.estimatedMinutes,
              position: dependant.position,
              dependencies,
              guide: dependant.guide,
              context: dependant.context,
              revision: dependant.revision + 1,
              supersedesTaskId: dependant.id,
            },
            now,
          ),
        )
        replacements.set(dependant.id, replacementId)
      }
      await reconcileTaskArtifacts(tx, source.cycleId, now)
      await touchProject(tx, projectId, now)
      return toTask(inserted)
    })
  }

  async updateTaskProgress(
    projectId: string,
    taskId: string,
    progress: PensaTaskProgress,
    expectedUpdatedAt: Date | null,
    now: Date,
  ): Promise<PensaTask> {
    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(pensaTasks)
        .set({
          progressStatus: progress.status,
          completedStepIds: progress.completedStepIds,
          completedCriteriaIds: progress.completedCriteriaIds,
          outputRef: progress.outputRef,
          startedAt: progress.startedAt,
          completedAt: progress.completedAt,
          progressUpdatedAt: progress.updatedAt,
          updatedAt: now,
        })
        .where(
          and(
            eq(pensaTasks.id, taskId),
            isNull(pensaTasks.archivedAt),
            expectedUpdatedAt === null
              ? isNull(pensaTasks.progressUpdatedAt)
              : eq(pensaTasks.progressUpdatedAt, expectedUpdatedAt),
          ),
        )
        .returning()
      if (!updated) throw new PensaTaskProgressConflictError()
      await touchProject(tx, projectId, now)
      return toTask(updated)
    })
  }

  async deleteTask(projectId: string, taskId: string, now: Date): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [task] = await tx
        .select({ cycleId: pensaTasks.cycleId })
        .from(pensaTasks)
        .where(and(eq(pensaTasks.id, taskId), isNull(pensaTasks.archivedAt)))
        .limit(1)
      await tx
        .delete(pensaTasks)
        .where(and(eq(pensaTasks.id, taskId), isNull(pensaTasks.archivedAt)))
      if (task) await reconcileTaskArtifacts(tx, task.cycleId, now)
      await touchProject(tx, projectId, now)
    })
  }
}
