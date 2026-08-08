import { randomUUID } from 'node:crypto'
import type { CourseAudience } from '../../src/domain/course/course'
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
} from '../../src/domain/pensa/pensa'
import { PensaTaskProgressConflictError } from '../../src/domain/pensa/pensa.errors'
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
} from '../../src/domain/ports/pensa-repository.port'

const taskFromNew = (cycleId: string, task: NewPensaTask, now: Date): PensaTask => ({
  ...task,
  cycleId,
  progress: {
    status: 'planned',
    completedStepIds: [],
    completedCriteriaIds: [],
    outputRef: null,
    startedAt: null,
    completedAt: null,
    updatedAt: null,
  },
  revision: task.revision ?? 1,
  supersedesTaskId: task.supersedesTaskId ?? null,
  archivedAt: null,
  createdAt: now,
  updatedAt: now,
})

export class InMemoryPensaRepository implements PensaRepository {
  readonly projects = new Map<string, PensaProject>()
  readonly cycles = new Map<string, PensaCycle>()
  readonly conversations = new Map<string, PensaConversation>()
  readonly artifacts: PensaArtifact[] = []
  readonly tasks = new Map<string, PensaTask>()

  private touch(projectId: string, now: Date): void {
    const project = this.projects.get(projectId)
    if (project) this.projects.set(projectId, { ...project, updatedAt: now })
  }

  private draftLatestPlanReview(cycleId: string): void {
    const latestReview = this.artifacts
      .filter((artifact) => artifact.cycleId === cycleId && artifact.type === 'plan_review')
      .sort((a, b) => b.version - a.version)[0]
    if (!latestReview) return
    const index = this.artifacts.findIndex((artifact) => artifact.id === latestReview.id)
    if (index >= 0) this.artifacts[index] = { ...latestReview, status: 'draft' }
  }

  private reconcileTaskPlan(cycleId: string, now: Date): void {
    const latestPlan = this.artifacts
      .filter((artifact) => artifact.cycleId === cycleId && artifact.type === 'task_plan')
      .sort((a, b) => b.version - a.version)[0]
    const cycle = this.cycles.get(cycleId)
    if (latestPlan && cycle) {
      const taskIds = [...this.tasks.values()]
        .filter((task) => task.cycleId === cycleId && task.archivedAt === null)
        .sort((a, b) => a.position - b.position)
        .map((task) => task.id)
      this.artifacts.push({
        id: randomUUID(),
        cycleId,
        stage: 'r',
        type: 'task_plan',
        version: latestPlan.version + 1,
        content: { taskIds, generatedAt: now.toISOString(), catalog: 'studio-official' },
        status: cycle.stage === 'r' ? 'draft' : 'validated',
        createdAt: now,
      })
    }
    if (cycle?.stage === 'o' || cycle?.stage === 'done') {
      this.cycles.set(cycleId, { ...cycle, stage: 'o', oCompletedAt: null, updatedAt: now })
      this.draftLatestPlanReview(cycleId)
    }
  }

  async countActiveProjects(userId: string, audience: CourseAudience): Promise<number> {
    return [...this.projects.values()].filter(
      (project) =>
        project.userId === userId && project.audience === audience && project.status === 'active',
    ).length
  }

  async listActiveProjects(userId: string, audience: CourseAudience) {
    return [...this.projects.values()]
      .filter(
        (project) =>
          project.userId === userId && project.audience === audience && project.status === 'active',
      )
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .flatMap((project) => {
        const currentCycle = [...this.cycles.values()]
          .filter((cycle) => cycle.projectId === project.id)
          .sort((a, b) => b.number - a.number)[0]
        return currentCycle ? [{ project, currentCycle }] : []
      })
  }

  async createProject(
    project: NewPensaProject,
    firstCycle: NewPensaCycle,
    now: Date,
  ): Promise<void> {
    this.projects.set(project.id, { ...project, status: 'active', createdAt: now, updatedAt: now })
    this.cycles.set(firstCycle.id, {
      ...firstCycle,
      stage: 'z',
      zCompletedAt: null,
      eCompletedAt: null,
      rCompletedAt: null,
      oCompletedAt: null,
      createdAt: now,
      updatedAt: now,
    })
  }

  async findProject(projectId: string, userId: string, audience: CourseAudience) {
    const project = this.projects.get(projectId)
    return project?.userId === userId && project.audience === audience ? project : null
  }

  async updateProject(projectId: string, patch: PensaProjectPatch, now: Date): Promise<void> {
    const project = this.projects.get(projectId)
    if (project) this.projects.set(projectId, { ...project, ...patch, updatedAt: now })
  }

  async listCycles(projectId: string): Promise<PensaCycle[]> {
    return [...this.cycles.values()]
      .filter((cycle) => cycle.projectId === projectId)
      .sort((a, b) => a.number - b.number)
  }

  async createCycle(
    cycle: NewPensaCycle,
    now: Date,
    inherit: InheritedPensaArtifact[] = [],
  ): Promise<void> {
    this.cycles.set(cycle.id, {
      ...cycle,
      stage: 'z',
      zCompletedAt: null,
      eCompletedAt: null,
      rCompletedAt: null,
      oCompletedAt: null,
      createdAt: now,
      updatedAt: now,
    })
    for (const artifact of inherit) {
      this.artifacts.push({
        ...artifact,
        cycleId: cycle.id,
        version: 1,
        status: 'validated',
        createdAt: now,
      })
    }
    this.touch(cycle.projectId, now)
  }

  async findCycleWithProject(cycleId: string, userId: string, audience: CourseAudience) {
    const cycle = this.cycles.get(cycleId)
    if (!cycle) return null
    const project = await this.findProject(cycle.projectId, userId, audience)
    return project ? { cycle, project } : null
  }

  async advanceCycle(
    projectId: string,
    cycleId: string,
    from: PensaWorkStage,
    to: PensaStage,
    now: Date,
  ) {
    const cycle = this.cycles.get(cycleId)
    if (!cycle) throw new Error('cycle not found')
    const updated = {
      ...cycle,
      stage: to,
      ...(from === 'z' ? { zCompletedAt: now } : {}),
      ...(from === 'e' ? { eCompletedAt: now } : {}),
      ...(from === 'r' ? { rCompletedAt: now } : {}),
      ...(from === 'o' ? { oCompletedAt: now } : {}),
      updatedAt: now,
    }
    this.cycles.set(cycleId, updated)
    this.touch(projectId, now)
    return updated
  }

  async reopenCycleReview(projectId: string, cycleId: string, now: Date) {
    const cycle = this.cycles.get(cycleId)
    if (!cycle) throw new Error('cycle not found')
    const updated: PensaCycle = { ...cycle, stage: 'o', oCompletedAt: null, updatedAt: now }
    this.cycles.set(cycleId, updated)
    this.draftLatestPlanReview(cycleId)
    this.touch(projectId, now)
    return updated
  }

  async getConversation(cycleId: string, stage: PensaStage) {
    return this.conversations.get(`${cycleId}:${stage}`) ?? null
  }

  async upsertConversation(
    projectId: string,
    data: PensaConversationUpsert,
    now: Date,
  ): Promise<void> {
    this.conversations.set(`${data.cycleId}:${data.stage}`, { ...data })
    this.touch(projectId, now)
  }

  async listLatestArtifacts(cycleId: string) {
    const latest = new Map<PensaArtifactType, PensaArtifact>()
    for (const artifact of this.artifacts.filter((item) => item.cycleId === cycleId)) {
      const current = latest.get(artifact.type)
      if (!current || artifact.version > current.version) latest.set(artifact.type, artifact)
    }
    return [...latest.values()]
  }

  async listLatestArtifactsByStage(cycleId: string, stage: PensaStage) {
    return (await this.listLatestArtifacts(cycleId)).filter((artifact) => artifact.stage === stage)
  }

  async findLatestArtifact(cycleId: string, type: PensaArtifactType) {
    return (
      (await this.listLatestArtifacts(cycleId)).find((artifact) => artifact.type === type) ?? null
    )
  }

  async insertArtifact(projectId: string, artifact: NewPensaArtifact, now: Date) {
    const version =
      this.artifacts.filter(
        (item) => item.cycleId === artifact.cycleId && item.type === artifact.type,
      ).length + 1
    const created: PensaArtifact = { ...artifact, version, status: 'draft', createdAt: now }
    this.artifacts.push(created)
    this.touch(projectId, now)
    return created
  }

  async validateArtifact(projectId: string, artifactId: string, now: Date) {
    const index = this.artifacts.findIndex((artifact) => artifact.id === artifactId)
    if (index < 0) throw new Error('artifact not found')
    const current = this.artifacts[index]
    if (!current) throw new Error('artifact not found')
    const updated: PensaArtifact = { ...current, status: 'validated' }
    this.artifacts[index] = updated
    this.touch(projectId, now)
    return updated
  }

  async countTasks(cycleId: string): Promise<number> {
    return (await this.listTasks(cycleId)).length
  }

  async listTasks(cycleId: string): Promise<PensaTask[]> {
    return [...this.tasks.values()]
      .filter((task) => task.cycleId === cycleId && task.archivedAt === null)
      .sort((a, b) => a.position - b.position)
  }

  async replaceTasks(
    projectId: string,
    cycleId: string,
    tasks: NewPensaTask[],
    now: Date,
  ): Promise<void> {
    for (const [id, task] of this.tasks) if (task.cycleId === cycleId) this.tasks.delete(id)
    for (const task of tasks) this.tasks.set(task.id, taskFromNew(cycleId, task, now))
    this.reconcileTaskPlan(cycleId, now)
    this.touch(projectId, now)
  }

  async appendTasks(
    projectId: string,
    cycleId: string,
    tasks: NewPensaTask[],
    now: Date,
  ): Promise<void> {
    for (const task of tasks) this.tasks.set(task.id, taskFromNew(cycleId, task, now))
    this.reconcileTaskPlan(cycleId, now)
    this.touch(projectId, now)
  }

  async findTaskWithProject(taskId: string, userId: string, audience: CourseAudience) {
    const task = this.tasks.get(taskId)
    if (!task || task.archivedAt !== null) return null
    const cycle = this.cycles.get(task.cycleId)
    if (!cycle) return null
    const project = await this.findProject(cycle.projectId, userId, audience)
    return project ? { task, project, cycle } : null
  }

  async updateTaskPlan(projectId: string, taskId: string, patch: PensaTaskPlanPatch, now: Date) {
    const task = this.tasks.get(taskId)
    if (!task) throw new Error('task not found')
    const updated = { ...task, ...patch, updatedAt: now }
    this.tasks.set(taskId, updated)
    this.reconcileTaskPlan(task.cycleId, now)
    this.touch(projectId, now)
    return updated
  }

  async reviseTask(projectId: string, source: PensaTask, replacement: NewPensaTask, now: Date) {
    this.tasks.set(source.id, { ...source, archivedAt: now, updatedAt: now })
    const revised = taskFromNew(
      source.cycleId,
      {
        ...replacement,
        revision: source.revision + 1,
        supersedesTaskId: source.id,
      },
      now,
    )
    this.tasks.set(revised.id, revised)
    const replacements = new Map([[source.id, revised.id]])
    const dependants = [...this.tasks.entries()]
      .filter(([, task]) => task.cycleId === source.cycleId && task.archivedAt === null)
      .sort(([, a], [, b]) => a.position - b.position)
    for (const [id, task] of dependants) {
      const dependencies = task.dependencies.map(
        (dependencyId) => replacements.get(dependencyId) ?? dependencyId,
      )
      if (dependencies.every((dependencyId, index) => dependencyId === task.dependencies[index]))
        continue
      if (task.progress.status === 'planned') {
        this.tasks.set(id, { ...task, dependencies, updatedAt: now })
        continue
      }
      const replacementId = randomUUID()
      this.tasks.set(id, { ...task, archivedAt: now, updatedAt: now })
      this.tasks.set(
        replacementId,
        taskFromNew(
          source.cycleId,
          {
            id: replacementId,
            title: task.title,
            summary: task.summary,
            destination: task.destination,
            category: task.category,
            estimatedMinutes: task.estimatedMinutes,
            position: task.position,
            dependencies,
            guide: task.guide,
            context: task.context,
            revision: task.revision + 1,
            supersedesTaskId: task.id,
          },
          now,
        ),
      )
      replacements.set(task.id, replacementId)
    }
    this.reconcileTaskPlan(source.cycleId, now)
    this.touch(projectId, now)
    return revised
  }

  async updateTaskProgress(
    projectId: string,
    taskId: string,
    progress: PensaTaskProgress,
    expectedUpdatedAt: Date | null,
    now: Date,
  ) {
    const task = this.tasks.get(taskId)
    if (!task) throw new Error('task not found')
    if ((task.progress.updatedAt?.getTime() ?? null) !== (expectedUpdatedAt?.getTime() ?? null)) {
      throw new PensaTaskProgressConflictError()
    }
    const updated = { ...task, progress, updatedAt: now }
    this.tasks.set(taskId, updated)
    this.touch(projectId, now)
    return updated
  }

  async deleteTask(projectId: string, taskId: string, now: Date): Promise<void> {
    const task = this.tasks.get(taskId)
    this.tasks.delete(taskId)
    if (task) this.reconcileTaskPlan(task.cycleId, now)
    this.touch(projectId, now)
  }
}
