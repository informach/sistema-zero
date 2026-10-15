import { randomUUID } from 'node:crypto'
import type { PensaTeamArtItem, PensaTeamRoles } from '@sistemazero/core/pensa'
import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  inArray,
  isNotNull,
  isNull,
  ne,
  notExists,
  notInArray,
  or,
  sql,
} from 'drizzle-orm'
import type { CourseAudience } from '../../../domain/course/course'
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
} from '../../../domain/pensa/pensa'
import { PensaTaskProgressConflictError } from '../../../domain/pensa/pensa.errors'
import {
  assertPensaMissionWorker,
  type PensaRoleRow,
  pensaMissionOwnership,
  pensaTeamRoles,
} from '../../../domain/pensa/team'
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
} from '../../../domain/ports/pensa-repository.port'
import type { Database } from './db'
import {
  creations,
  pensaArtifacts,
  pensaCheckpoints,
  pensaConversations,
  pensaCycles,
  pensaJourneys,
  pensaProjectMembers,
  pensaProjectRoles,
  pensaProjects,
  pensaTasks,
} from './schema'

type ProjectRow = typeof pensaProjects.$inferSelect
type CycleRow = typeof pensaCycles.$inferSelect
type ArtifactRow = typeof pensaArtifacts.$inferSelect
type TaskRow = typeof pensaTasks.$inferSelect
type Tx = Parameters<Parameters<Database['transaction']>[0]>[0]

type MemberRow = typeof pensaProjectMembers.$inferSelect
async function assertLegacyPensa(db: Pick<Database, 'select'>, projectId: string) {
  const [journey] = await db
    .select({ id: pensaJourneys.cycleId })
    .from(pensaJourneys)
    .where(eq(pensaJourneys.projectId, projectId))
    .limit(1)
  if (journey)
    throw new PensaTaskProgressConflictError(
      'Este jogo usa o novo caminho do Pensa. Abra a versão atual para continuar.',
    )
}

const toProject = (row: ProjectRow): PensaProject => ({ ...row })
const toMember = (row: MemberRow): PensaProjectMember => ({ ...row })
/** O projeto como QUEM pediu o vê: dono ou membro, com quantos convidados a equipe tem. */
const toAccess = (row: ProjectRow, isOwner: boolean, memberCount: number): PensaProjectAccess => ({
  ...row,
  role: isOwner ? 'owner' : 'member',
  memberCount: Number(memberCount),
})
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
  assigneeProfileId: row.assigneeProfileId,
  completedByProfileId: row.completedByProfileId,
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

/**
 * Equipe no v2: os papéis EFETIVOS do plano (dona + quem entrou + as linhas cruas). Dentro da
 * transação que já trancou o projeto, para a régua valer no mesmo instante da gravação.
 */
export async function loadPensaTeamRoles(
  tx: Tx | Database,
  projectId: string,
  ownerProfileId: string,
): Promise<{ memberProfileIds: string[]; rows: PensaRoleRow[]; roles: PensaTeamRoles }> {
  const members = await tx
    .select({ profileId: pensaProjectMembers.profileId })
    .from(pensaProjectMembers)
    .where(eq(pensaProjectMembers.projectId, projectId))
  const rows = await tx
    .select({ profileId: pensaProjectRoles.profileId, role: pensaProjectRoles.role })
    .from(pensaProjectRoles)
    .where(eq(pensaProjectRoles.projectId, projectId))
  const memberProfileIds = members.map((member) => member.profileId)
  return { memberProfileIds, rows, roles: pensaTeamRoles(ownerProfileId, memberProfileIds, rows) }
}

/**
 * Regra 5 da equipe: o jogo já começou no Estúdio de quem programa quando alguma missão do
 * Estúdio do ciclo ATUAL (inclusive as arquivadas: o jogo existe do mesmo jeito) saiu de
 * `planned`, ou quando o plano já tem uma versão guardada (qualquer checkpoint, até o que
 * ainda está copiando).
 */
export async function pensaCodeLocked(tx: Tx | Database, projectId: string): Promise<boolean> {
  const [started] = await tx
    .select({ id: pensaTasks.id })
    .from(pensaTasks)
    .innerJoin(
      pensaJourneys,
      and(eq(pensaJourneys.cycleId, pensaTasks.cycleId), eq(pensaJourneys.active, true)),
    )
    .where(
      and(
        eq(pensaJourneys.projectId, projectId),
        eq(pensaTasks.destination, 'studio'),
        ne(pensaTasks.progressStatus, 'planned'),
      ),
    )
    .limit(1)
  if (started) return true
  const [saved] = await tx
    .select({ id: pensaCheckpoints.id })
    .from(pensaCheckpoints)
    .where(eq(pensaCheckpoints.projectId, projectId))
    .limit(1)
  return Boolean(saved)
}

/** As tarefas de TODOS os ciclos do plano (subconsulta para os UPDATEs da equipe). */
function projectCycleIds(tx: Tx, projectId: string) {
  return tx
    .select({ id: pensaCycles.id })
    .from(pensaCycles)
    .where(eq(pensaCycles.projectId, projectId))
}

/**
 * Solta as missões NÃO concluídas cujo `assignee` não pode mais fazê-las (saiu da equipe ou
 * perdeu a função): voltam a ser de quem tem a função agora (`nextPensaMissionFor` as oferece).
 */
async function releasePensaMissions(
  tx: Tx,
  projectId: string,
  roles: PensaTeamRoles,
): Promise<void> {
  await tx
    .update(pensaTasks)
    .set({ assigneeProfileId: null })
    .where(
      and(
        inArray(pensaTasks.cycleId, projectCycleIds(tx, projectId)),
        ne(pensaTasks.progressStatus, 'completed'),
        isNotNull(pensaTasks.assigneeProfileId),
        or(
          and(eq(pensaTasks.destination, 'studio'), ne(pensaTasks.assigneeProfileId, roles.code)),
          and(
            ne(pensaTasks.destination, 'studio'),
            notInArray(pensaTasks.assigneeProfileId, roles.art),
          ),
        ),
      ),
    )
}

/** Sobe a revisão da jornada ativa (as telas da equipe percebem a mudança). Sem jornada: nada. */
async function bumpPensaJourney(tx: Tx, projectId: string, now: Date): Promise<void> {
  const [journey] = await tx
    .select()
    .from(pensaJourneys)
    .where(and(eq(pensaJourneys.projectId, projectId), eq(pensaJourneys.active, true)))
    .for('update')
  if (!journey) return
  await tx
    .update(pensaJourneys)
    .set({
      revision: journey.revision + 1,
      data: {
        ...journey.data,
        revision: journey.revision + 1,
        lastInteractionAt: now.toISOString(),
      },
      updatedAt: now,
    })
    .where(eq(pensaJourneys.cycleId, journey.cycleId))
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

/** Só o DONO: apagar o plano e a cota de criar continuam presos ao `user_id`. */
function ownedProject(userId: string, audience: CourseAudience) {
  return and(eq(pensaProjects.userId, userId), eq(pensaProjects.audience, audience))
}

/**
 * Dono OU membro da equipe (26/09/2026): a régua de LEITURA e de trabalho no plano. O papel
 * (`isOwner`) e a contagem de convidados vêm na mesma consulta (`accessColumns`).
 */
function accessibleProject(userId: string, audience: CourseAudience) {
  return and(
    eq(pensaProjects.audience, audience),
    or(
      eq(pensaProjects.userId, userId),
      // ⚠️ O MEMBRO só alcança plano ATIVO: arquivar é o jeito de o dono "fechar" o plano, e sem
      // isto a equipe continuava escrevendo num plano que ele já tirou da lista.
      and(
        eq(pensaProjects.status, 'active'),
        exists(
          sql`(select 1 from ${pensaProjectMembers} where ${pensaProjectMembers.projectId} = ${pensaProjects.id} and ${pensaProjectMembers.profileId} = ${userId}::uuid)`,
        ),
      ),
    ),
  )
}

/**
 * 23505 = unique_violation. O drizzle-orm envelopa o erro do driver em `DrizzleQueryError`
 * com o `PostgresError` em `cause`: caminha a cadeia (com teto), como o content-admin.
 */
function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error
  for (let depth = 0; depth < 5 && typeof current === 'object' && current !== null; depth++) {
    if ((current as { code?: unknown }).code === '23505') return true
    current = (current as { cause?: unknown }).cause
  }
  return false
}

function accessColumns(userId: string) {
  return {
    isOwner: sql<boolean>`(${pensaProjects.userId} = ${userId}::uuid)`,
    memberCount: sql<number>`(select count(*)::int from ${pensaProjectMembers} where ${pensaProjectMembers.projectId} = ${pensaProjects.id})`,
  }
}

export const pensaTaskValues = (cycleId: string, task: NewPensaTask, now: Date) => ({
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
  assigneeProfileId: null,
  completedByProfileId: null,
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
  ): Promise<Array<{ project: PensaProjectAccess; currentCycle: PensaCycle }>> {
    const projects = await this.db
      .select({ project: pensaProjects, ...accessColumns(userId) })
      .from(pensaProjects)
      .where(
        and(
          accessibleProject(userId, audience),
          eq(pensaProjects.status, 'active'),
          notExists(
            this.db
              .select({ id: pensaJourneys.cycleId })
              .from(pensaJourneys)
              .where(eq(pensaJourneys.projectId, pensaProjects.id)),
          ),
        ),
      )
      .orderBy(desc(pensaProjects.updatedAt))
    if (projects.length === 0) return []
    const currents = await this.db
      .selectDistinctOn([pensaCycles.projectId])
      .from(pensaCycles)
      .where(
        inArray(
          pensaCycles.projectId,
          projects.map((row) => row.project.id),
        ),
      )
      .orderBy(pensaCycles.projectId, desc(pensaCycles.number))
    const byProject = new Map(currents.map((cycle) => [cycle.projectId, cycle]))
    return projects.flatMap((row) => {
      const currentCycle = byProject.get(row.project.id)
      return currentCycle
        ? [
            {
              project: toAccess(row.project, row.isOwner, row.memberCount),
              currentCycle: toCycle(currentCycle),
            },
          ]
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
  ): Promise<PensaProjectAccess | null> {
    const [row] = await this.db
      .select({ project: pensaProjects, ...accessColumns(userId) })
      .from(pensaProjects)
      .where(and(eq(pensaProjects.id, projectId), accessibleProject(userId, audience)))
      .limit(1)
    return row ? toAccess(row.project, row.isOwner, row.memberCount) : null
  }

  async setShareCode(projectId: string, code: string | null, now: Date): Promise<boolean> {
    // O código vale para o plano clássico E para o v2 (14/10/2026): é o mesmo convite.
    try {
      await this.db
        .update(pensaProjects)
        .set({ shareCode: code, updatedAt: now })
        .where(eq(pensaProjects.id, projectId))
      return true
    } catch (error) {
      // Dois donos sorteando o MESMO código no mesmo instante: o índice único parcial recusa
      // o segundo, e o serviço sorteia outro em vez de responder 500.
      if (code !== null && isUniqueViolation(error)) return false
      throw error
    }
  }

  async findProjectByShareCode(code: string): Promise<PensaProject | null> {
    const [row] = await this.db
      .select()
      .from(pensaProjects)
      .where(eq(pensaProjects.shareCode, code))
      .limit(1)
    return row ? toProject(row) : null
  }

  async listMembers(projectId: string): Promise<PensaProjectMember[]> {
    const rows = await this.db
      .select()
      .from(pensaProjectMembers)
      .where(eq(pensaProjectMembers.projectId, projectId))
      .orderBy(asc(pensaProjectMembers.joinedAt))
    return rows.map(toMember)
  }

  async countMemberships(profileId: string, audience: CourseAudience): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(pensaProjectMembers)
      .innerJoin(pensaProjects, eq(pensaProjectMembers.projectId, pensaProjects.id))
      .where(
        and(
          eq(pensaProjectMembers.profileId, profileId),
          eq(pensaProjects.audience, audience),
          eq(pensaProjects.status, 'active'),
        ),
      )
    return row?.value ?? 0
  }

  async addMember(
    member: NewPensaProjectMember,
    now: Date,
    maxMembers: number,
    expectedCode: string,
  ): Promise<'added' | 'duplicate' | 'full' | 'invite_invalid'> {
    // Entrar vale para o plano clássico E para o v2 (14/10/2026).
    return this.db.transaction(async (tx) => {
      // Tranca a linha do projeto: conferir a vaga e gravar viram um passo só (dois convidados
      // no mesmo instante com 4 na equipe não viram 6).
      const [project] = await tx
        .select({ shareCode: pensaProjects.shareCode, status: pensaProjects.status })
        .from(pensaProjects)
        .where(eq(pensaProjects.id, member.projectId))
        .limit(1)
        .for('update')
      if (!project || project.shareCode !== expectedCode || project.status !== 'active') {
        return 'invite_invalid'
      }
      const [already] = await tx
        .select({ profileId: pensaProjectMembers.profileId })
        .from(pensaProjectMembers)
        .where(
          and(
            eq(pensaProjectMembers.projectId, member.projectId),
            eq(pensaProjectMembers.profileId, member.profileId),
          ),
        )
        .limit(1)
      if (already) return 'duplicate'
      const [row] = await tx
        .select({ value: count() })
        .from(pensaProjectMembers)
        .where(eq(pensaProjectMembers.projectId, member.projectId))
      if ((row?.value ?? 0) >= maxMembers) return 'full'
      await tx.insert(pensaProjectMembers).values({ ...member, joinedAt: now })
      await touchProject(tx, member.projectId, now)
      return 'added'
    })
  }

  async removeMember(projectId: string, profileId: string, now: Date): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      // Projeto antes da jornada (a mesma ordem do resto do Pensa): sem isto, tirar alguém
      // enquanto outra aba conclui uma missão podia travar em deadlock.
      await tx
        .select({ id: pensaProjects.id })
        .from(pensaProjects)
        .where(eq(pensaProjects.id, projectId))
        .for('update')
      const removed = await tx
        .delete(pensaProjectMembers)
        .where(
          and(
            eq(pensaProjectMembers.projectId, projectId),
            eq(pensaProjectMembers.profileId, profileId),
          ),
        )
        .returning({ profileId: pensaProjectMembers.profileId })
      if (removed.length === 0) return false
      // As funções da pessoa saem junto; quem programava devolve a função à dona (o jogo fica
      // no Estúdio de quem saiu) e as missões não concluídas que ela começou ficam livres.
      await tx
        .delete(pensaProjectRoles)
        .where(
          and(
            eq(pensaProjectRoles.projectId, projectId),
            eq(pensaProjectRoles.profileId, profileId),
          ),
        )
      await tx
        .update(pensaTasks)
        .set({ assigneeProfileId: null })
        .where(
          and(
            inArray(pensaTasks.cycleId, projectCycleIds(tx, projectId)),
            ne(pensaTasks.progressStatus, 'completed'),
            eq(pensaTasks.assigneeProfileId, profileId),
          ),
        )
      await bumpPensaJourney(tx, projectId, now)
      await touchProject(tx, projectId, now)
      return true
    })
  }

  async listRoles(projectId: string): Promise<PensaRoleRow[]> {
    return this.db
      .select({ profileId: pensaProjectRoles.profileId, role: pensaProjectRoles.role })
      .from(pensaProjectRoles)
      .where(eq(pensaProjectRoles.projectId, projectId))
      .orderBy(asc(pensaProjectRoles.createdAt), asc(pensaProjectRoles.profileId))
  }

  async setRoles(
    projectId: string,
    input: { code: string; art: readonly string[] },
    assignedBy: string,
    now: Date,
  ): Promise<PensaSetRolesOutcome> {
    return this.db.transaction(async (tx) => {
      // A linha do projeto TRANCADA: dois `PUT` (ou um `PUT` e alguém saindo) não se cruzam.
      const [project] = await tx
        .select()
        .from(pensaProjects)
        .where(eq(pensaProjects.id, projectId))
        .for('update')
      if (!project) return 'not_found'
      const [journey] = await tx
        .select({ cycleId: pensaJourneys.cycleId })
        .from(pensaJourneys)
        .where(and(eq(pensaJourneys.projectId, projectId), eq(pensaJourneys.active, true)))
      if (!journey) return 'legacy'
      const current = await loadPensaTeamRoles(tx, projectId, project.userId)
      const team = new Set([project.userId, ...current.memberProfileIds])
      const art = [...new Set(input.art)]
      if (!team.has(input.code) || art.some((id) => !team.has(id))) return 'not_in_team'
      const rows: PensaRoleRow[] = [
        ...(input.code === project.userId
          ? []
          : [{ profileId: input.code, role: 'code' as const }]),
        ...art.map((profileId) => ({ profileId, role: 'art' as const })),
      ]
      const next = pensaTeamRoles(project.userId, current.memberProfileIds, rows)
      if (next.code !== current.roles.code && (await pensaCodeLocked(tx, projectId)))
        return 'code_locked'
      await tx.delete(pensaProjectRoles).where(eq(pensaProjectRoles.projectId, projectId))
      if (rows.length > 0)
        await tx
          .insert(pensaProjectRoles)
          .values(rows.map((row) => ({ projectId, ...row, assignedBy, createdAt: now })))
      await releasePensaMissions(tx, projectId, next)
      await bumpPensaJourney(tx, projectId, now)
      await touchProject(tx, projectId, now)
      return 'updated'
    })
  }

  isCodeLocked(projectId: string): Promise<boolean> {
    return pensaCodeLocked(this.db, projectId)
  }

  async listTeamArt(
    projectId: string,
    viewerProfileId: string,
    limit: number,
  ): Promise<PensaTeamArtItem[]> {
    const rows = await this.db
      .select({
        taskId: pensaTasks.id,
        title: pensaTasks.title,
        outputRef: pensaTasks.outputRef,
        completedBy: pensaTasks.completedByProfileId,
        completedAt: pensaTasks.completedAt,
        name: creations.name,
        kind: creations.kind,
        itemUpdatedAt: creations.itemUpdatedAt,
        revision: creations.revision,
      })
      .from(pensaTasks)
      .innerJoin(pensaCycles, eq(pensaCycles.id, pensaTasks.cycleId))
      // A criação ainda viva e confirmada no perfil de quem concluiu (ferramenta + item).
      .innerJoin(
        creations,
        and(
          eq(creations.userId, pensaTasks.completedByProfileId),
          sql`${creations.tool}::text = (case ${pensaTasks.outputRef}->>'kind' when 'pinta_asset' then 'pinta' else 'molda' end)`,
          sql`${creations.itemId} = ${pensaTasks.outputRef}->>'assetId'`,
          isNull(creations.deletedAt),
          isNotNull(creations.storageRef),
        ),
      )
      .where(
        and(
          eq(pensaCycles.projectId, projectId),
          isNull(pensaTasks.archivedAt),
          eq(pensaTasks.progressStatus, 'completed'),
          sql`${pensaTasks.outputRef}->>'kind' in ('pinta_asset', 'molda_asset')`,
          isNotNull(pensaTasks.completedByProfileId),
          ne(pensaTasks.completedByProfileId, viewerProfileId),
        ),
      )
      .orderBy(desc(pensaTasks.completedAt), asc(pensaTasks.id))
      .limit(limit)
    return rows.flatMap((row) => {
      const ref = row.outputRef
      if (!ref || ref.kind === 'studio_project' || !row.completedBy || !row.completedAt) return []
      return [
        {
          taskId: row.taskId,
          title: row.title,
          tool: ref.kind === 'pinta_asset' ? ('pinta' as const) : ('molda' as const),
          assetId: ref.assetId,
          assetName: row.name || ref.assetName || null,
          assetKind: row.kind || null,
          byProfileId: row.completedBy,
          completedAt: row.completedAt.toISOString(),
          updatedAt: row.itemUpdatedAt.toISOString(),
          revision: row.revision,
        },
      ]
    })
  }

  async findTeamArtTask(projectId: string, taskId: string): Promise<PensaTeamArtTask | null> {
    const [row] = await this.db
      .select({ outputRef: pensaTasks.outputRef, completedBy: pensaTasks.completedByProfileId })
      .from(pensaTasks)
      .innerJoin(pensaCycles, eq(pensaCycles.id, pensaTasks.cycleId))
      .where(
        and(
          eq(pensaTasks.id, taskId),
          eq(pensaCycles.projectId, projectId),
          isNull(pensaTasks.archivedAt),
          eq(pensaTasks.progressStatus, 'completed'),
        ),
      )
      .limit(1)
    const ref = row?.outputRef
    if (!row?.completedBy || !ref || ref.kind === 'studio_project') return null
    return {
      completedByProfileId: row.completedBy,
      tool: ref.kind === 'pinta_asset' ? 'pinta' : 'molda',
      assetId: ref.assetId,
    }
  }

  /**
   * Um DELETE só: as FKs de `pensa_cycles` → conversas/artefatos/cartões são
   * `on delete cascade` (migration `0060_pensa_planner_v2`), então a árvore inteira
   * cai junto. O `ownedProject` no WHERE é o portão: plano de outro perfil (ou de
   * outra vitrine) não é alcançado nem com o id certo.
   */
  async deleteProject(projectId: string, userId: string, audience: CourseAudience): Promise<void> {
    await assertLegacyPensa(this.db, projectId)
    await this.db
      .delete(pensaProjects)
      .where(and(eq(pensaProjects.id, projectId), ownedProject(userId, audience)))
  }

  async updateProject(projectId: string, patch: PensaProjectPatch, now: Date): Promise<void> {
    await assertLegacyPensa(this.db, projectId)
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
    await assertLegacyPensa(this.db, cycle.projectId)
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
  ): Promise<{ cycle: PensaCycle; project: PensaProjectAccess } | null> {
    const [row] = await this.db
      .select({ cycle: pensaCycles, project: pensaProjects, ...accessColumns(userId) })
      .from(pensaCycles)
      .innerJoin(pensaProjects, eq(pensaCycles.projectId, pensaProjects.id))
      .where(and(eq(pensaCycles.id, cycleId), accessibleProject(userId, audience)))
      .limit(1)
    return row
      ? { cycle: toCycle(row.cycle), project: toAccess(row.project, row.isOwner, row.memberCount) }
      : null
  }

  async advanceCycle(
    projectId: string,
    cycleId: string,
    from: PensaWorkStage,
    to: PensaStage,
    now: Date,
  ): Promise<PensaCycle> {
    await assertLegacyPensa(this.db, projectId)
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
    await assertLegacyPensa(this.db, projectId)
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
    await assertLegacyPensa(this.db, projectId)
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
    await assertLegacyPensa(this.db, projectId)
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
    await assertLegacyPensa(this.db, projectId)
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
    await assertLegacyPensa(this.db, projectId)
    await this.db.transaction(async (tx) => {
      await tx.delete(pensaTasks).where(eq(pensaTasks.cycleId, cycleId))
      if (tasks.length > 0)
        await tx.insert(pensaTasks).values(tasks.map((task) => pensaTaskValues(cycleId, task, now)))
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
    await assertLegacyPensa(this.db, projectId)
    if (tasks.length === 0) return
    await this.db.transaction(async (tx) => {
      await tx.insert(pensaTasks).values(tasks.map((task) => pensaTaskValues(cycleId, task, now)))
      await reconcileTaskArtifacts(tx, cycleId, now)
      await touchProject(tx, projectId, now)
    })
  }

  async findTaskWithProject(
    taskId: string,
    userId: string,
    audience: CourseAudience,
  ): Promise<{
    task: PensaTask
    project: PensaProjectAccess
    cycle: PensaCycle
    journey: boolean
  } | null> {
    const [row] = await this.db
      .select({
        task: pensaTasks,
        project: pensaProjects,
        cycle: pensaCycles,
        ...accessColumns(userId),
      })
      .from(pensaTasks)
      .innerJoin(pensaCycles, eq(pensaTasks.cycleId, pensaCycles.id))
      .innerJoin(pensaProjects, eq(pensaCycles.projectId, pensaProjects.id))
      .where(
        and(
          eq(pensaTasks.id, taskId),
          isNull(pensaTasks.archivedAt),
          accessibleProject(userId, audience),
        ),
      )
      .limit(1)
    if (!row) return null
    const [journey] = await this.db
      .select()
      .from(pensaJourneys)
      .where(and(eq(pensaJourneys.projectId, row.project.id), eq(pensaJourneys.active, true)))
    if (journey && journey.cycleId !== row.cycle.id) return null
    return {
      task: toTask(row.task),
      project: toAccess(row.project, row.isOwner, row.memberCount),
      cycle: toCycle(row.cycle),
      journey: Boolean(journey),
    }
  }

  async updateTaskPlan(
    projectId: string,
    taskId: string,
    patch: PensaTaskPlanPatch,
    now: Date,
  ): Promise<PensaTask> {
    await assertLegacyPensa(this.db, projectId)
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
    await assertLegacyPensa(this.db, projectId)
    return this.db.transaction(async (tx) => {
      await tx
        .update(pensaTasks)
        .set({ archivedAt: now, updatedAt: now })
        .where(eq(pensaTasks.id, source.id))
      const [inserted] = await tx
        .insert(pensaTasks)
        .values(
          pensaTaskValues(
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
          pensaTaskValues(
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
    actor: PensaTaskActor,
  ): Promise<PensaTask> {
    return this.db.transaction(async (tx) => {
      // A jornada também trava projeto antes de ciclo. Manter a ordem evita deadlock
      // entre concluir uma missão e proteger/revisar o plano em outra aba.
      const [project] = await tx
        .select()
        .from(pensaProjects)
        .where(eq(pensaProjects.id, projectId))
        .for('update')
      const [journey] = await tx
        .select()
        .from(pensaJourneys)
        .where(and(eq(pensaJourneys.projectId, projectId), eq(pensaJourneys.active, true)))
        .for('update')
      let ownership: ReturnType<typeof pensaMissionOwnership> | null = null
      if (journey) {
        const [task] = await tx.select().from(pensaTasks).where(eq(pensaTasks.id, taskId))
        if (
          !task ||
          !project ||
          project.status !== 'active' ||
          task.cycleId !== journey.cycleId ||
          !['building', 'observing'].includes(journey.data.stage)
        )
          throw new PensaTaskProgressConflictError('Abra o caminho atual deste jogo.')
        // Equipe (14/10/2026): a função e a missão pega conferidas SOB a trava do projeto, que
        // serializa todo progresso do plano (duas artistas começando a mesma missão: uma ganha).
        const { roles } = await loadPensaTeamRoles(tx, projectId, project.userId)
        assertPensaMissionWorker(
          {
            destination: task.destination,
            status: task.progressStatus,
            assigneeProfileId: task.assigneeProfileId,
          },
          actor.profileId,
          roles,
        )
        ownership = pensaMissionOwnership(task, progress.status, actor.profileId)
        if (progress.status === 'completed') {
          const dependencies = task.dependencies.length
            ? await tx.select().from(pensaTasks).where(inArray(pensaTasks.id, task.dependencies))
            : []
          if (
            dependencies.some((t) => t.progressStatus !== 'completed') ||
            dependencies.length !== task.dependencies.length
          )
            throw new PensaTaskProgressConflictError(
              'Conclua a missão anterior antes de conferir esta.',
            )
          const ref = progress.outputRef
          const itemId = ref?.kind === 'studio_project' ? ref.projectId : ref?.assetId
          if (
            !itemId ||
            (task.destination === 'studio' && itemId !== `pensa-${projectId.replaceAll('-', '')}`)
          )
            throw new PensaTaskProgressConflictError('Esta missão precisa do jogo certo.')
          // A evidência é a criação guardada no perfil e na conta de quem MEXE (o ator), não da
          // dona: em equipe a arte e o jogo moram no Pinta/Molda/Estúdio de quem fez.
          const [saved] = await tx
            .select()
            .from(creations)
            .where(
              and(
                eq(creations.userId, actor.profileId),
                eq(creations.accountId, actor.accountId),
                eq(creations.tool, task.destination),
                eq(creations.itemId, itemId),
                isNull(creations.deletedAt),
              ),
            )
          if (!saved?.storageRef || saved.pendingRevision)
            throw new PensaTaskProgressConflictError(
              'Espere sua criação ficar Guardada na conta e tente de novo.',
            )
          if (task.context.kind !== 'studio' && saved.kind !== task.context.artKind)
            throw new PensaTaskProgressConflictError(
              'Escolha uma criação do tipo pedido nesta missão.',
            )
          if (ref?.kind === 'studio_project' && ref.saveRevision !== String(saved.revision))
            throw new PensaTaskProgressConflictError(
              'Seu jogo mudou. Espere ficar guardado na conta e experimente novamente.',
            )
        }
      }
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
          ...(ownership ?? {}),
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
      if (journey)
        await tx
          .update(pensaJourneys)
          .set({
            revision: journey.revision + 1,
            data: {
              ...journey.data,
              revision: journey.revision + 1,
              lastInteractionAt: now.toISOString(),
            },
            updatedAt: now,
          })
          .where(eq(pensaJourneys.cycleId, journey.cycleId))
      await touchProject(tx, projectId, now)
      return toTask(updated)
    })
  }

  async deleteTask(projectId: string, taskId: string, now: Date): Promise<void> {
    await assertLegacyPensa(this.db, projectId)
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
