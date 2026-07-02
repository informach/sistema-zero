import type { CourseAudience } from '../../src/domain/course/course'
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
} from '../../src/domain/pensa/pensa'
import type {
  NewPensaArtifact,
  NewPensaChecklistItem,
  NewPensaCycle,
  NewPensaProject,
  NewPensaTask,
  PensaConversationUpsert,
  PensaProjectPatch,
  PensaRepository,
  PensaTaskBoardChange,
} from '../../src/domain/ports/pensa-repository.port'

/**
 * Fake in-memory do `PensaRepository` — espelha o comportamento do Drizzle:
 * ownership por (userId, audience) nos `find*WithProject`, TODA escrita toca
 * `project.updatedAt`, artefato versionado por MAX+1.
 */
export class InMemoryPensaRepository implements PensaRepository {
  readonly projects: PensaProject[] = []
  readonly cycles: PensaCycle[] = []
  readonly conversations: PensaConversation[] = []
  readonly artifacts: PensaArtifact[] = []
  readonly tasks: PensaTask[] = []
  readonly checklist: PensaChecklistItem[] = []
  /** BLOB do snapshot do Estúdio por projectId (fora do PensaProject, como no Drizzle). */
  readonly studioSnapshots = new Map<string, unknown>()

  private touch(projectId: string, now: Date): void {
    const project = this.projects.find((p) => p.id === projectId)
    if (project) project.updatedAt = now
  }

  private owned(project: PensaProject | undefined, userId: string, audience: CourseAudience) {
    return project && project.userId === userId && project.audience === audience
      ? project
      : undefined
  }

  private projectOfCycle(cycleId: string): PensaProject | undefined {
    const cycle = this.cycles.find((c) => c.id === cycleId)
    return cycle ? this.projects.find((p) => p.id === cycle.projectId) : undefined
  }

  // ── Projetos ──────────────────────────────────────────────────────────────
  async countActiveProjects(userId: string, audience: CourseAudience): Promise<number> {
    return this.projects.filter(
      (p) => p.userId === userId && p.audience === audience && p.status === 'active',
    ).length
  }

  async listActiveProjects(
    userId: string,
    audience: CourseAudience,
  ): Promise<Array<{ project: PensaProject; currentCycle: PensaCycle }>> {
    return this.projects
      .filter((p) => p.userId === userId && p.audience === audience && p.status === 'active')
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .flatMap((project) => {
        const current = this.cycles
          .filter((c) => c.projectId === project.id)
          .sort((a, b) => b.number - a.number)[0]
        return current ? [{ project: { ...project }, currentCycle: { ...current } }] : []
      })
  }

  async createProject(
    project: NewPensaProject,
    firstCycle: NewPensaCycle,
    now: Date,
  ): Promise<void> {
    this.projects.push({
      ...project,
      status: 'active',
      studioProjectId: null,
      buildEnv: null,
      studioSnapshotAt: null,
      createdAt: now,
      updatedAt: now,
    })
    this.cycles.push(this.newCycleRow(firstCycle, now))
  }

  private newCycleRow(cycle: NewPensaCycle, now: Date): PensaCycle {
    return {
      ...cycle,
      stage: 'z',
      zCompletedAt: null,
      eCompletedAt: null,
      rCompletedAt: null,
      oCompletedAt: null,
      createdAt: now,
      updatedAt: now,
    }
  }

  async findProject(
    projectId: string,
    userId: string,
    audience: CourseAudience,
  ): Promise<PensaProject | null> {
    const project = this.owned(
      this.projects.find((p) => p.id === projectId),
      userId,
      audience,
    )
    return project ? { ...project } : null
  }

  async updateProject(projectId: string, patch: PensaProjectPatch, now: Date): Promise<void> {
    const project = this.projects.find((p) => p.id === projectId)
    if (!project) return
    if (patch.name !== undefined) project.name = patch.name
    if (patch.status !== undefined) project.status = patch.status
    if (patch.studioProjectId !== undefined) project.studioProjectId = patch.studioProjectId
    if (patch.buildEnv !== undefined) project.buildEnv = patch.buildEnv
    project.updatedAt = now
  }

  // ── Snapshot do Estúdio ───────────────────────────────────────────────────
  async getStudioSnapshot(
    projectId: string,
  ): Promise<{ snapshot: unknown; snapshotAt: Date | null }> {
    const project = this.projects.find((p) => p.id === projectId)
    return {
      snapshot: this.studioSnapshots.get(projectId) ?? null,
      snapshotAt: project?.studioSnapshotAt ?? null,
    }
  }

  async saveStudioSnapshot(
    projectId: string,
    snapshot: Record<string, unknown>,
    now: Date,
  ): Promise<void> {
    this.studioSnapshots.set(projectId, snapshot)
    const project = this.projects.find((p) => p.id === projectId)
    if (project) project.studioSnapshotAt = now
    this.touch(projectId, now)
  }

  // ── Ciclos ────────────────────────────────────────────────────────────────
  async listCycles(projectId: string): Promise<PensaCycle[]> {
    return this.cycles
      .filter((c) => c.projectId === projectId)
      .sort((a, b) => a.number - b.number)
      .map((c) => ({ ...c }))
  }

  async createCycle(cycle: NewPensaCycle, now: Date): Promise<void> {
    this.cycles.push(this.newCycleRow(cycle, now))
    this.touch(cycle.projectId, now)
  }

  async findCycleWithProject(
    cycleId: string,
    userId: string,
    audience: CourseAudience,
  ): Promise<{ cycle: PensaCycle; project: PensaProject } | null> {
    const cycle = this.cycles.find((c) => c.id === cycleId)
    const project = this.owned(this.projectOfCycle(cycleId), userId, audience)
    return cycle && project ? { cycle: { ...cycle }, project: { ...project } } : null
  }

  async advanceCycle(
    projectId: string,
    cycleId: string,
    from: PensaWorkStage,
    to: PensaStage,
    now: Date,
  ): Promise<PensaCycle> {
    const cycle = this.cycles.find((c) => c.id === cycleId)
    if (!cycle) throw new Error('ciclo inexistente no fake')
    cycle.stage = to
    if (from === 'z') cycle.zCompletedAt = now
    else if (from === 'e') cycle.eCompletedAt = now
    else if (from === 'r') cycle.rCompletedAt = now
    else cycle.oCompletedAt = now
    cycle.updatedAt = now
    this.touch(projectId, now)
    return { ...cycle }
  }

  // ── Conversas ─────────────────────────────────────────────────────────────
  async getConversation(cycleId: string, stage: PensaStage): Promise<PensaConversation | null> {
    const found = this.conversations.find((c) => c.cycleId === cycleId && c.stage === stage)
    return found ? { ...found, messages: [...found.messages], state: { ...found.state } } : null
  }

  async upsertConversation(
    projectId: string,
    data: PensaConversationUpsert,
    now: Date,
  ): Promise<void> {
    const existing = this.conversations.find(
      (c) => c.cycleId === data.cycleId && c.stage === data.stage,
    )
    if (existing) {
      existing.messages = data.messages
      existing.summary = data.summary
      existing.state = data.state
      existing.messageCount = data.messageCount
    } else {
      this.conversations.push({ ...data })
    }
    this.touch(projectId, now)
  }

  // ── Artefatos ─────────────────────────────────────────────────────────────
  private latestByType(pool: PensaArtifact[]): PensaArtifact[] {
    const latest = new Map<PensaArtifactType, PensaArtifact>()
    for (const artifact of pool) {
      const current = latest.get(artifact.type)
      if (!current || artifact.version > current.version) latest.set(artifact.type, artifact)
    }
    return [...latest.values()].map((a) => ({ ...a }))
  }

  async listLatestArtifacts(cycleId: string): Promise<PensaArtifact[]> {
    return this.latestByType(this.artifacts.filter((a) => a.cycleId === cycleId))
  }

  async listLatestArtifactsByStage(cycleId: string, stage: PensaStage): Promise<PensaArtifact[]> {
    return this.latestByType(
      this.artifacts.filter((a) => a.cycleId === cycleId && a.stage === stage),
    )
  }

  async findLatestArtifact(
    cycleId: string,
    type: PensaArtifactType,
  ): Promise<PensaArtifact | null> {
    const [latest] = this.latestByType(
      this.artifacts.filter((a) => a.cycleId === cycleId && a.type === type),
    )
    return latest ?? null
  }

  async insertArtifact(
    projectId: string,
    artifact: NewPensaArtifact,
    now: Date,
  ): Promise<PensaArtifact> {
    const latest = await this.findLatestArtifact(artifact.cycleId, artifact.type)
    const row: PensaArtifact = {
      ...artifact,
      version: (latest?.version ?? 0) + 1,
      status: 'draft',
      createdAt: now,
    }
    this.artifacts.push(row)
    this.touch(projectId, now)
    return { ...row }
  }

  async validateArtifact(projectId: string, artifactId: string, now: Date): Promise<PensaArtifact> {
    const artifact = this.artifacts.find((a) => a.id === artifactId)
    if (!artifact) throw new Error('artefato inexistente no fake')
    artifact.status = 'validated'
    this.touch(projectId, now)
    return { ...artifact }
  }

  // ── Tasks ─────────────────────────────────────────────────────────────────
  async countTasks(cycleId: string): Promise<number> {
    return this.tasks.filter((t) => t.cycleId === cycleId).length
  }

  async listTasks(cycleId: string): Promise<PensaTask[]> {
    return this.tasks
      .filter((t) => t.cycleId === cycleId)
      .sort((a, b) => a.column.localeCompare(b.column) || a.position - b.position)
      .map((t) => ({ ...t }))
  }

  async replaceTasks(
    projectId: string,
    cycleId: string,
    tasks: NewPensaTask[],
    now: Date,
  ): Promise<void> {
    for (let i = this.tasks.length - 1; i >= 0; i--) {
      if (this.tasks[i]?.cycleId === cycleId) this.tasks.splice(i, 1)
    }
    for (const task of tasks) {
      this.tasks.push({ ...task, cycleId, createdAt: now, updatedAt: now })
    }
    this.touch(projectId, now)
  }

  async findTaskWithProject(
    taskId: string,
    userId: string,
    audience: CourseAudience,
  ): Promise<{ task: PensaTask; project: PensaProject } | null> {
    const task = this.tasks.find((t) => t.id === taskId)
    if (!task) return null
    const project = this.owned(this.projectOfCycle(task.cycleId), userId, audience)
    return project ? { task: { ...task }, project: { ...project } } : null
  }

  async applyTaskChanges(
    projectId: string,
    changes: PensaTaskBoardChange[],
    now: Date,
  ): Promise<void> {
    for (const change of changes) {
      const task = this.tasks.find((t) => t.id === change.id)
      if (!task) continue
      task.column = change.column
      task.position = change.position
      if (change.notes !== undefined) task.notes = change.notes
      task.updatedAt = now
    }
    this.touch(projectId, now)
  }

  // ── Checklist ─────────────────────────────────────────────────────────────
  async listChecklist(cycleId: string): Promise<PensaChecklistItem[]> {
    return this.checklist
      .filter((i) => i.cycleId === cycleId)
      .sort((a, b) => a.position - b.position)
      .map((i) => ({ ...i }))
  }

  async replaceChecklist(
    projectId: string,
    cycleId: string,
    items: NewPensaChecklistItem[],
    now: Date,
  ): Promise<void> {
    for (let i = this.checklist.length - 1; i >= 0; i--) {
      if (this.checklist[i]?.cycleId === cycleId) this.checklist.splice(i, 1)
    }
    for (const item of items) {
      this.checklist.push({ ...item, cycleId, done: false, doneAt: null })
    }
    this.touch(projectId, now)
  }

  async findChecklistItemWithProject(
    itemId: string,
    userId: string,
    audience: CourseAudience,
  ): Promise<{ item: PensaChecklistItem; project: PensaProject } | null> {
    const item = this.checklist.find((i) => i.id === itemId)
    if (!item) return null
    const project = this.owned(this.projectOfCycle(item.cycleId), userId, audience)
    return project ? { item: { ...item }, project: { ...project } } : null
  }

  async setChecklistItemDone(
    projectId: string,
    itemId: string,
    done: boolean,
    now: Date,
  ): Promise<PensaChecklistItem> {
    const item = this.checklist.find((i) => i.id === itemId)
    if (!item) throw new Error('item inexistente no fake')
    item.done = done
    item.doneAt = done ? now : null
    this.touch(projectId, now)
    return { ...item }
  }
}
