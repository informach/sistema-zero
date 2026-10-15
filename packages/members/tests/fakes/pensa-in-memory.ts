import { randomUUID } from 'node:crypto'
import {
  createPensaJourney,
  type PensaJourneyView,
  type PensaTeamArtItem,
  type PensaTeamRoles,
} from '@sistemazero/core/pensa'
import type { CourseAudience } from '../../src/domain/course/course'
import type {
  PensaArtifact,
  PensaArtifactType,
  PensaConversation,
  PensaCycle,
  PensaProject,
  PensaProjectAccess,
  PensaProjectMember,
  PensaStage,
  PensaTask,
  PensaTaskProgress,
  PensaWorkStage,
} from '../../src/domain/pensa/pensa'
import {
  PensaNotFoundError,
  PensaTaskProgressConflictError,
} from '../../src/domain/pensa/pensa.errors'
import {
  assertPensaMissionWorker,
  type PensaRoleRow,
  pensaJourneyTeam,
  pensaMissionOwnership,
  pensaTeamRoles,
} from '../../src/domain/pensa/team'
import type { CreationsRepository } from '../../src/domain/ports/creations-repository.port'
import type {
  InheritedPensaArtifact,
  NewPensaArtifact,
  NewPensaCycle,
  NewPensaProject,
  NewPensaProjectMember,
  NewPensaTask,
  PensaConversationUpsert,
  PensaProjectPatch,
  PensaRepository,
  PensaSetRolesOutcome,
  PensaTaskActor,
  PensaTaskPlanPatch,
  PensaTeamArtTask,
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
  assigneeProfileId: null,
  completedByProfileId: null,
  revision: task.revision ?? 1,
  supersedesTaskId: task.supersedesTaskId ?? null,
  archivedAt: null,
  createdAt: now,
  updatedAt: now,
})

/**
 * Espelho em memória do `DrizzlePensaRepository`. Equipe no v2 (14/10/2026): as funções, a missão
 * pega, `assignee`/`completed_by`, a regra 5 e as artes da equipe seguem as MESMAS réguas do
 * domínio (`domain/pensa/team.ts`). ⚠️ A evidência (a criação guardada que conclui a missão) só é
 * conferida no Drizzle, como antes; quem a cobre é `tests/db/pensa-team-v2.test.ts`.
 * `creations` (opcional) é o índice das criações que as artes da equipe consultam.
 */
export class InMemoryPensaRepository implements PensaRepository {
  constructor(private readonly creations: CreationsRepository | null = null) {}

  readonly projects = new Map<string, PensaProject>()
  /** A equipe: chave `${projectId}:${profileId}`. */
  readonly members = new Map<string, PensaProjectMember>()
  readonly cycles = new Map<string, PensaCycle>()
  readonly conversations = new Map<string, PensaConversation>()
  readonly artifacts: PensaArtifact[] = []
  readonly tasks = new Map<string, PensaTask>()
  /** Projetos com jornada v2 ativa (o Drizzle lê `pensa_journeys`; aqui o teste marca). */
  readonly journeyProjects = new Set<string>()
  /** As funções da equipe (`pensa_project_roles`), linhas cruas. */
  readonly roles: Array<PensaRoleRow & { projectId: string; assignedBy: string }> = []
  /** Projetos com versão guardada (`pensa_checkpoints`): trancam quem programa (regra 5). */
  readonly checkpointProjects = new Set<string>()
  /** Quantas vezes a jornada do projeto subiu de revisão por mudança na equipe. */
  readonly journeyBumps = new Map<string, number>()

  /**
   * Leitura mínima da jornada v2 (o que o `PUT …/roles` devolve nos testes de integração): o
   * projeto, os ciclos, o papel e a `team` com os papéis efetivos. A revisão é a contagem de
   * mudanças na equipe (o Drizzle sobe a `pensa_journeys.revision` nos mesmos pontos).
   */
  async journeyView(actor: { profileId: string }, projectId: string): Promise<PensaJourneyView> {
    const project = await this.findProject(projectId, actor.profileId, 'kids')
    const cycles = await this.listCycles(projectId)
    const current = cycles.at(-1)
    if (!project || !current || !this.journeyProjects.has(projectId)) throw new PensaNotFoundError()
    const memberProfileIds = (await this.listMembers(projectId)).map((member) => member.profileId)
    return {
      project: { id: project.id, name: project.name, status: project.status },
      journey: {
        ...createPensaJourney(projectId, current.id, project.createdAt.toISOString()),
        revision: this.journeyBumps.get(projectId) ?? 0,
      },
      operation: null,
      cycles: cycles.map((cycle) => ({ id: cycle.id, number: cycle.number })),
      checkpoints: [],
      role: project.role,
      team: pensaJourneyTeam({
        viewerProfileId: actor.profileId,
        ownerProfileId: project.userId,
        memberProfileIds,
        shareCode: project.shareCode,
        rows: this.rowsOf(projectId),
      }),
    }
  }

  private bumpJourney(projectId: string): void {
    if (this.journeyProjects.has(projectId))
      this.journeyBumps.set(projectId, (this.journeyBumps.get(projectId) ?? 0) + 1)
  }

  private projectTasks(projectId: string): PensaTask[] {
    const cycleIds = new Set(
      [...this.cycles.values()]
        .filter((cycle) => cycle.projectId === projectId)
        .map((cycle) => cycle.id),
    )
    return [...this.tasks.values()].filter((task) => cycleIds.has(task.cycleId))
  }

  /** O ciclo da jornada ativa: aqui, o de maior número. */
  private currentCycleId(projectId: string): string | null {
    return (
      [...this.cycles.values()]
        .filter((cycle) => cycle.projectId === projectId)
        .sort((a, b) => b.number - a.number)[0]?.id ?? null
    )
  }

  private teamRoles(projectId: string): PensaTeamRoles | null {
    const project = this.projects.get(projectId)
    if (!project) return null
    const memberIds = [...this.members.values()]
      .filter((member) => member.projectId === projectId)
      .map((member) => member.profileId)
    return pensaTeamRoles(project.userId, memberIds, this.rowsOf(projectId))
  }

  private rowsOf(projectId: string): PensaRoleRow[] {
    return this.roles
      .filter((row) => row.projectId === projectId)
      .map(({ profileId, role }) => ({ profileId, role }))
  }

  /** O mesmo `releasePensaMissions` do Drizzle. */
  private releaseMissions(projectId: string, roles: PensaTeamRoles): void {
    for (const task of this.projectTasks(projectId)) {
      if (task.progress.status === 'completed' || !task.assigneeProfileId) continue
      const keeps =
        task.destination === 'studio'
          ? task.assigneeProfileId === roles.code
          : roles.art.includes(task.assigneeProfileId)
      if (!keeps) this.tasks.set(task.id, { ...task, assigneeProfileId: null })
    }
  }

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

  private memberCount(projectId: string): number {
    return [...this.members.values()].filter((member) => member.projectId === projectId).length
  }

  /** Dono OU membro, como o `accessibleProject` do Drizzle; `null` = nem um nem outro. */
  private accessOf(
    project: PensaProject | undefined,
    userId: string,
    audience: CourseAudience,
  ): PensaProjectAccess | null {
    if (!project || project.audience !== audience) return null
    const isOwner = project.userId === userId
    // O membro só alcança plano ATIVO (o dono arquiva para "fechar"); o dono alcança sempre.
    if (!isOwner && (project.status !== 'active' || !this.members.has(`${project.id}:${userId}`)))
      return null
    return {
      ...project,
      role: isOwner ? 'owner' : 'member',
      memberCount: this.memberCount(project.id),
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
      .filter((project) => project.status === 'active')
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .flatMap((raw) => {
        const project = this.accessOf(raw, userId, audience)
        if (!project) return []
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
    this.projects.set(project.id, {
      ...project,
      status: 'active',
      shareCode: null,
      createdAt: now,
      updatedAt: now,
    })
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
    return this.accessOf(this.projects.get(projectId), userId, audience)
  }

  async setShareCode(projectId: string, code: string | null, now: Date): Promise<boolean> {
    if (code !== null) {
      // O índice único parcial do banco: outro plano com o mesmo código recusa a gravação.
      for (const [id, other] of this.projects) {
        if (id !== projectId && other.shareCode === code) return false
      }
    }
    const project = this.projects.get(projectId)
    if (project) this.projects.set(projectId, { ...project, shareCode: code, updatedAt: now })
    return true
  }

  async findProjectByShareCode(code: string): Promise<PensaProject | null> {
    return [...this.projects.values()].find((project) => project.shareCode === code) ?? null
  }

  async listMembers(projectId: string): Promise<PensaProjectMember[]> {
    return [...this.members.values()]
      .filter((member) => member.projectId === projectId)
      .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())
  }

  async countMemberships(profileId: string, audience: CourseAudience): Promise<number> {
    return [...this.members.values()].filter((member) => {
      const project = this.projects.get(member.projectId)
      return (
        member.profileId === profileId &&
        project?.audience === audience &&
        project.status === 'active'
      )
    }).length
  }

  async addMember(
    member: NewPensaProjectMember,
    now: Date,
    maxMembers: number,
    expectedCode: string,
  ): Promise<'added' | 'duplicate' | 'full' | 'invite_invalid'> {
    const project = this.projects.get(member.projectId)
    if (!project || project.shareCode !== expectedCode || project.status !== 'active') {
      return 'invite_invalid'
    }
    const key = `${member.projectId}:${member.profileId}`
    if (this.members.has(key)) return 'duplicate'
    if (this.memberCount(member.projectId) >= maxMembers) return 'full'
    this.members.set(key, { ...member, joinedAt: now })
    this.touch(member.projectId, now)
    return 'added'
  }

  async removeMember(projectId: string, profileId: string, now: Date): Promise<boolean> {
    const removed = this.members.delete(`${projectId}:${profileId}`)
    if (!removed) return false
    for (let index = this.roles.length - 1; index >= 0; index -= 1) {
      const row = this.roles[index]
      if (row?.projectId === projectId && row.profileId === profileId) this.roles.splice(index, 1)
    }
    for (const task of this.projectTasks(projectId))
      if (task.progress.status !== 'completed' && task.assigneeProfileId === profileId)
        this.tasks.set(task.id, { ...task, assigneeProfileId: null })
    this.bumpJourney(projectId)
    this.touch(projectId, now)
    return true
  }

  async listRoles(projectId: string): Promise<PensaRoleRow[]> {
    return this.rowsOf(projectId)
  }

  async setRoles(
    projectId: string,
    input: { code: string; art: readonly string[] },
    assignedBy: string,
    now: Date,
  ): Promise<PensaSetRolesOutcome> {
    const project = this.projects.get(projectId)
    if (!project) return 'not_found'
    if (!this.journeyProjects.has(projectId)) return 'legacy'
    const memberIds = [...this.members.values()]
      .filter((member) => member.projectId === projectId)
      .map((member) => member.profileId)
    const team = new Set([project.userId, ...memberIds])
    const art = [...new Set(input.art)]
    if (!team.has(input.code) || art.some((id) => !team.has(id))) return 'not_in_team'
    const rows: PensaRoleRow[] = [
      ...(input.code === project.userId ? [] : [{ profileId: input.code, role: 'code' as const }]),
      ...art.map((profileId) => ({ profileId, role: 'art' as const })),
    ]
    const current = pensaTeamRoles(project.userId, memberIds, this.rowsOf(projectId))
    const next = pensaTeamRoles(project.userId, memberIds, rows)
    if (next.code !== current.code && (await this.isCodeLocked(projectId))) return 'code_locked'
    for (let index = this.roles.length - 1; index >= 0; index -= 1)
      if (this.roles[index]?.projectId === projectId) this.roles.splice(index, 1)
    for (const row of rows) this.roles.push({ ...row, projectId, assignedBy })
    this.releaseMissions(projectId, next)
    this.bumpJourney(projectId)
    this.touch(projectId, now)
    return 'updated'
  }

  async isCodeLocked(projectId: string): Promise<boolean> {
    if (this.checkpointProjects.has(projectId)) return true
    const cycleId = this.currentCycleId(projectId)
    return [...this.tasks.values()].some(
      (task) =>
        task.cycleId === cycleId &&
        task.destination === 'studio' &&
        task.progress.status !== 'planned',
    )
  }

  async listTeamArt(
    projectId: string,
    viewerProfileId: string,
    limit: number,
  ): Promise<PensaTeamArtItem[]> {
    const items: PensaTeamArtItem[] = []
    for (const task of this.projectTasks(projectId)) {
      const ref = task.progress.outputRef
      if (
        task.archivedAt !== null ||
        task.progress.status !== 'completed' ||
        !task.progress.completedAt ||
        !ref ||
        ref.kind === 'studio_project' ||
        !task.completedByProfileId ||
        task.completedByProfileId === viewerProfileId
      )
        continue
      const tool = ref.kind === 'pinta_asset' ? ('pinta' as const) : ('molda' as const)
      const creation = await this.creations?.get(task.completedByProfileId, tool, ref.assetId)
      if (!creation || creation.deletedAt !== null || !creation.storageRef) continue
      items.push({
        taskId: task.id,
        title: task.title,
        tool,
        assetId: ref.assetId,
        assetName: creation.name || ref.assetName || null,
        assetKind: creation.kind || null,
        byProfileId: task.completedByProfileId,
        completedAt: task.progress.completedAt.toISOString(),
        updatedAt: creation.itemUpdatedAt.toISOString(),
        revision: creation.revision,
      })
    }
    return items
      .sort(
        (a, b) => b.completedAt.localeCompare(a.completedAt) || a.taskId.localeCompare(b.taskId),
      )
      .slice(0, limit)
  }

  async findTeamArtTask(projectId: string, taskId: string): Promise<PensaTeamArtTask | null> {
    const task = this.projectTasks(projectId).find((candidate) => candidate.id === taskId)
    const ref = task?.progress.outputRef
    if (
      !task ||
      task.archivedAt !== null ||
      task.progress.status !== 'completed' ||
      !task.completedByProfileId ||
      !ref ||
      ref.kind === 'studio_project'
    )
      return null
    return {
      completedByProfileId: task.completedByProfileId,
      tool: ref.kind === 'pinta_asset' ? 'pinta' : 'molda',
      assetId: ref.assetId,
    }
  }

  async updateProject(projectId: string, patch: PensaProjectPatch, now: Date): Promise<void> {
    const project = this.projects.get(projectId)
    if (project) this.projects.set(projectId, { ...project, ...patch, updatedAt: now })
  }

  /** Espelha a CASCATA do Postgres: o que pende do projeto cai junto. */
  async deleteProject(projectId: string, userId: string, audience: CourseAudience): Promise<void> {
    const project = this.projects.get(projectId)
    if (project?.userId !== userId || project.audience !== audience) return
    for (const key of [...this.members.keys()]) {
      if (key.startsWith(`${projectId}:`)) this.members.delete(key)
    }
    for (let index = this.roles.length - 1; index >= 0; index -= 1)
      if (this.roles[index]?.projectId === projectId) this.roles.splice(index, 1)
    const cycleIds = new Set(
      [...this.cycles.values()]
        .filter((cycle) => cycle.projectId === projectId)
        .map((cycle) => cycle.id),
    )
    for (const cycleId of cycleIds) {
      this.cycles.delete(cycleId)
      for (const [key, conversation] of this.conversations)
        if (conversation.cycleId === cycleId) this.conversations.delete(key)
      for (const [key, task] of this.tasks) if (task.cycleId === cycleId) this.tasks.delete(key)
    }
    for (let index = this.artifacts.length - 1; index >= 0; index -= 1) {
      const artifact = this.artifacts[index]
      if (artifact && cycleIds.has(artifact.cycleId)) this.artifacts.splice(index, 1)
    }
    this.projects.delete(projectId)
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
    return project ? { task, project, cycle, journey: this.journeyProjects.has(project.id) } : null
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
    actor: PensaTaskActor,
  ) {
    const task = this.tasks.get(taskId)
    if (!task) throw new Error('task not found')
    // Equipe no v2: a mesma régua do Drizzle (função + missão pega), conferida antes de gravar.
    const roles = this.journeyProjects.has(projectId) ? this.teamRoles(projectId) : null
    if (roles)
      assertPensaMissionWorker(
        {
          destination: task.destination,
          status: task.progress.status,
          assigneeProfileId: task.assigneeProfileId,
        },
        actor.profileId,
        roles,
      )
    if ((task.progress.updatedAt?.getTime() ?? null) !== (expectedUpdatedAt?.getTime() ?? null)) {
      throw new PensaTaskProgressConflictError()
    }
    const updated = {
      ...task,
      ...(roles ? pensaMissionOwnership(task, progress.status, actor.profileId) : {}),
      progress,
      updatedAt: now,
    }
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
