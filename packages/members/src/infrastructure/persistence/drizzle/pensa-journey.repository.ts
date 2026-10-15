import { randomUUID } from 'node:crypto'
import { creationPartStorageKey, creationStorageKey } from '@sistemazero/core/creations'
import {
  applyPensaCommand,
  createPensaJourney,
  type PensaFileTicket,
  type PensaJourney,
  type PensaJourneyCommand,
  PensaJourneyConflict,
  type PensaJourneyView,
  type PensaOperation,
  type PensaProtectionAction,
  type PensaVoiceRequest,
  type PensaVoiceResult,
  pensaZeroStage,
} from '@sistemazero/core/pensa'
import { and, asc, count, eq, exists, inArray, isNull, or, sql } from 'drizzle-orm'
import { CREATION_LIMITS } from '../../../domain/creations/creation'
import { MAX_ACTIVE_PROJECTS } from '../../../domain/pensa/pensa'
import {
  PensaNotFoundError,
  PensaNotOwnerError,
  PensaNotProgrammerError,
  PensaQuotaExceededError,
  PensaTaskProgressConflictError,
} from '../../../domain/pensa/pensa.errors'
import { pensaJourneyTeam } from '../../../domain/pensa/team'
import type {
  PensaGenerationStart,
  PensaJourneyActor,
  PensaJourneyListRow,
  PensaJourneyRepository,
  PensaOperationWork,
  PensaStepResult,
} from '../../../domain/ports/pensa-journey-repository.port'
import { ValidationError } from '../../../domain/shared/errors'
import type { Database } from './db'
import { loadPensaTeamRoles, pensaTaskValues } from './pensa.repository'
import {
  commitPensaUsage,
  lockPensaAccount,
  releasePensaReservation,
  releasePensaUsage,
  reservePensaUsage,
} from './pensa-reservations'
import {
  accountDeletionFences,
  aiUsageReservations,
  creations,
  pensaCheckpoints,
  pensaCycles,
  pensaDeletionJobs,
  pensaJourneys,
  pensaOperations,
  pensaProjectMembers,
  pensaProjects,
  pensaProviderUsage,
  pensaTasks,
  privateNarrations,
} from './schema'

type Tx = Parameters<Parameters<Database['transaction']>[0]>[0]
type OperationRow = typeof pensaOperations.$inferSelect
type SavedCreation = Pick<
  typeof creations.$inferSelect,
  | 'id'
  | 'itemId'
  | 'revision'
  | 'name'
  | 'kind'
  | 'bytes'
  | 'formatVersion'
  | 'parts'
  | 'storageRef'
  | 'contentFingerprint'
>
interface CheckpointManifest {
  creation: SavedCreation
  tasks: Array<typeof pensaTasks.$inferSelect>
  files: PensaFileTicket['files']
}
const operationView = (row: OperationRow): PensaOperation => ({
  id: row.id,
  projectId: row.projectId,
  cycleId: row.cycleId,
  kind: row.kind,
  step: row.step,
  status: row.status,
  inputRevision: row.inputRevision,
  attempts: row.attempts,
  error: row.error,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
})
/** Só a DONA: renomear/arquivar, apagar, a cota de planos e o `create` idempotente. */
const ownerOnly = (actor: PensaJourneyActor) =>
  and(
    eq(pensaProjects.userId, actor.profileId),
    eq(pensaProjects.accountId, actor.accountId),
    eq(pensaProjects.audience, 'kids'),
  )
/**
 * A EQUIPE (14/10/2026): a dona (qualquer status) OU quem entrou pelo código, só em plano
 * ativo (a mesma régua do `accessibleProject` do plano clássico; arquivar "fecha" o plano para
 * a equipe). O perfil E a conta conferem nos dois ramos.
 */
const accessible = (actor: PensaJourneyActor) =>
  and(
    eq(pensaProjects.audience, 'kids'),
    or(
      and(eq(pensaProjects.userId, actor.profileId), eq(pensaProjects.accountId, actor.accountId)),
      and(
        eq(pensaProjects.status, 'active'),
        exists(
          sql`(select 1 from ${pensaProjectMembers} where ${pensaProjectMembers.projectId} = ${pensaProjects.id} and ${pensaProjectMembers.profileId} = ${actor.profileId}::uuid and ${pensaProjectMembers.accountId} = ${actor.accountId}::uuid)`,
        ),
      ),
    ),
  )
/** Comandos que usam o jogo salvo no Estúdio de quem PROGRAMA: só ela os dispara. */
const PROGRAMMER_COMMANDS: ReadonlySet<PensaJourneyCommand['type']> = new Set([
  'observe',
  'record_test',
  'repair',
  'close',
  'revise',
])
const conflict = (message?: string) => new PensaTaskProgressConflictError(message)

/** O nome de um jogo novo, antes de a criança ou a primeira proposta darem outro. */
export const DEFAULT_JOURNEY_NAME = 'Meu novo jogo'
/** O nome atual ainda é o que o sistema deu (de fábrica ou o título da proposta anterior)? */
export function aiGivenName(current: string, previousProposalTitle: string | null): boolean {
  return (
    current === DEFAULT_JOURNEY_NAME ||
    (previousProposalTitle !== null && current === previousProposalTitle.slice(0, 120))
  )
}

export class DrizzlePensaJourneyRepository implements PensaJourneyRepository {
  constructor(
    private readonly db: Database,
    private readonly limits: { dailyLimit: number; monthlyLimit: number },
  ) {}

  private async lock(tx: Tx, actor: PensaJourneyActor, projectId: string, active = true) {
    // Uma colega pode retomar o pedido, mas a reserva pertence a quem o iniciou.
    // Trave ambas as contas ANTES do projeto, sempre na mesma ordem, inclusive quando
    // duas equipes retomam pedidos uma da outra. Nunca adquira a segunda trava depois.
    const [billing] = await tx
      .select({ accountId: pensaOperations.accountId })
      .from(pensaJourneys)
      .innerJoin(
        pensaOperations,
        sql`${pensaOperations.id} = (${pensaJourneys.data}->>'operationId')::uuid`,
      )
      .where(and(eq(pensaJourneys.projectId, projectId), eq(pensaJourneys.active, true)))
    const accounts = [...new Set([actor.accountId, ...(billing ? [billing.accountId] : [])])].sort()
    for (const accountId of accounts) await lockPensaAccount(tx, accountId)
    const [project] = await tx
      .select()
      .from(pensaProjects)
      .where(and(accessible(actor), eq(pensaProjects.id, projectId)))
      .for('update')
    if (!project) throw new PensaNotFoundError()
    if (active && project.status !== 'active')
      throw conflict('Abra o plano arquivado antes de continuar.')
    const [journey] = await tx
      .select()
      .from(pensaJourneys)
      .where(and(eq(pensaJourneys.projectId, projectId), eq(pensaJourneys.active, true)))
      .for('update')
    if (!journey) throw new PensaNotFoundError()
    if (journey.data.operationId) {
      const [current] = await tx
        .select({ accountId: pensaOperations.accountId })
        .from(pensaOperations)
        .where(eq(pensaOperations.id, journey.data.operationId))
      // O pedido pode ter mudado enquanto esperávamos. Recarregue em vez de adquirir
      // uma conta nova fora da ordem (ou conferir cota sem a trava correspondente).
      if (current && !accounts.includes(current.accountId)) throw conflict()
    }
    // Os papéis lidos DEPOIS da trava do projeto: trocar as funções tranca a mesma linha.
    const { roles } = await loadPensaTeamRoles(tx, projectId, project.userId)
    const role = project.userId === actor.profileId ? ('owner' as const) : ('member' as const)
    return { project, row: journey, state: journey.data, role, roles }
  }

  private async operationPayer(tx: Tx, operation: OperationRow): Promise<PensaJourneyActor> {
    const [hold] = await tx
      .select()
      .from(aiUsageReservations)
      .where(eq(aiUsageReservations.id, operation.id))
    if (
      !hold ||
      hold.projectId !== operation.projectId ||
      hold.accountId !== operation.accountId ||
      hold.profileId !== operation.profileId
    )
      throw conflict()
    // O privilégio também é o da reserva, nunca o do participante que retoma.
    return { accountId: hold.accountId, profileId: hold.profileId, privileged: hold.privileged }
  }

  /** Só quem PROGRAMA testa, conclui, guarda, restaura e adapta: o jogo mora no Estúdio dela. */
  private assertProgrammer(actor: PensaJourneyActor, roles: { code: string }) {
    if (roles.code !== actor.profileId) throw new PensaNotProgrammerError()
  }

  private async save(tx: Tx, state: PensaJourney, now: Date) {
    if (JSON.stringify(state).length > 262_144)
      throw new PensaQuotaExceededError(
        'Esta conversa ficou grande. Seu jogo e o guia continuam guardados.',
      )
    await tx
      .update(pensaJourneys)
      .set({ data: state, revision: state.revision, updatedAt: now })
      .where(eq(pensaJourneys.cycleId, state.cycleId))
    await tx
      .update(pensaProjects)
      .set({ updatedAt: now })
      .where(eq(pensaProjects.id, state.projectId))
  }

  private async activeCount(tx: Tx, actor: PensaJourneyActor) {
    const [total] = await tx
      .select({ n: count() })
      .from(pensaProjects)
      .where(and(ownerOnly(actor), eq(pensaProjects.status, 'active')))
    if ((total?.n ?? 0) >= MAX_ACTIVE_PROJECTS)
      throw new PensaQuotaExceededError(
        'Você já tem 20 jogos em andamento. Continue um deles ou arquive um plano para abrir espaço.',
      )
  }

  /**
   * Os planos v2 da dona E os em que o perfil entrou (o membro só vê os ativos). O 1º nome da
   * dona (`team.ownerFirstName`) é preenchido pelo serviço, a partir do `ownerProfileId`.
   */
  async list(
    actor: PensaJourneyActor,
    status: 'active' | 'archived',
  ): Promise<PensaJourneyListRow[]> {
    const rows = await this.db
      .select({
        project: pensaProjects,
        journey: pensaJourneys,
        cycle: pensaCycles,
        memberCount: sql<number>`(select count(*)::int from ${pensaProjectMembers} where ${pensaProjectMembers.projectId} = ${pensaProjects.id})`,
      })
      .from(pensaProjects)
      .innerJoin(
        pensaJourneys,
        and(eq(pensaJourneys.projectId, pensaProjects.id), eq(pensaJourneys.active, true)),
      )
      .innerJoin(pensaCycles, eq(pensaCycles.id, pensaJourneys.cycleId))
      .where(and(accessible(actor), eq(pensaProjects.status, status)))
    return rows
      .map(({ project, journey, cycle, memberCount }) => ({
        id: project.id,
        name: project.name,
        status: project.status,
        cycleNumber: cycle.number,
        stage: pensaZeroStage(journey.data),
        lastInteractionAt: journey.data.lastInteractionAt,
        paused: journey.data.paused,
        role: project.userId === actor.profileId ? ('owner' as const) : ('member' as const),
        team: { memberCount: Number(memberCount), ownerFirstName: null },
        ownerProfileId: project.userId,
      }))
      .sort((a, b) => b.lastInteractionAt.localeCompare(a.lastInteractionAt))
  }

  async create(actor: PensaJourneyActor, projectId: string, now: Date): Promise<PensaJourneyView> {
    await this.db.transaction(async (tx) => {
      await lockPensaAccount(tx, actor.accountId)
      const [fence] = await tx
        .select()
        .from(accountDeletionFences)
        .where(eq(accountDeletionFences.accountId, actor.accountId))
      if (fence) throw new PensaNotFoundError()
      const [deleted] = await tx
        .select({ id: pensaDeletionJobs.id })
        .from(pensaDeletionJobs)
        .where(eq(pensaDeletionJobs.id, projectId))
      if (deleted) throw new PensaNotFoundError()
      const [existing] = await tx
        .select()
        .from(pensaProjects)
        .where(eq(pensaProjects.id, projectId))
      if (existing) {
        if (
          existing.userId !== actor.profileId ||
          existing.accountId !== actor.accountId ||
          existing.audience !== 'kids'
        )
          throw new PensaNotFoundError()
        const [journey] = await tx
          .select()
          .from(pensaJourneys)
          .where(eq(pensaJourneys.projectId, projectId))
        if (!journey)
          throw conflict('Este projeto usa o planejamento anterior. Abra seu plano para continuar.')
        return
      }
      await this.activeCount(tx, actor)
      const cycleId = randomUUID()
      await tx.insert(pensaProjects).values({
        id: projectId,
        userId: actor.profileId,
        accountId: actor.accountId,
        audience: 'kids',
        kind: 'game',
        name: DEFAULT_JOURNEY_NAME,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      })
      await tx
        .insert(pensaCycles)
        .values({ id: cycleId, projectId, number: 1, stage: 'z', createdAt: now, updatedAt: now })
      await tx.insert(pensaJourneys).values({
        cycleId,
        projectId,
        revision: 0,
        data: createPensaJourney(projectId, cycleId, now.toISOString()),
        updatedAt: now,
      })
    })
    return this.get(actor, projectId)
  }

  async get(actor: PensaJourneyActor, projectId: string): Promise<PensaJourneyView> {
    const [row] = await this.db
      .select({ project: pensaProjects, state: pensaJourneys.data })
      .from(pensaProjects)
      .innerJoin(
        pensaJourneys,
        and(eq(pensaJourneys.projectId, pensaProjects.id), eq(pensaJourneys.active, true)),
      )
      .where(and(accessible(actor), eq(pensaProjects.id, projectId)))
    if (!row) throw new PensaNotFoundError()
    const { memberProfileIds, rows: roleRows } = await loadPensaTeamRoles(
      this.db,
      projectId,
      row.project.userId,
    )
    const team = pensaJourneyTeam({
      viewerProfileId: actor.profileId,
      ownerProfileId: row.project.userId,
      memberProfileIds,
      shareCode: row.project.shareCode,
      rows: roleRows,
    })
    const [operation] = row.state.operationId
      ? await this.db
          .select()
          .from(pensaOperations)
          .where(
            and(
              eq(pensaOperations.id, row.state.operationId),
              eq(pensaOperations.projectId, projectId),
            ),
          )
      : []
    const cycles = await this.db
      .select({ id: pensaCycles.id, number: pensaCycles.number })
      .from(pensaCycles)
      .where(eq(pensaCycles.projectId, projectId))
      .orderBy(asc(pensaCycles.number))
    const checkpoints = await this.db
      .select({
        id: pensaCheckpoints.id,
        creationId: pensaCheckpoints.creationId,
        saveRevision: pensaCheckpoints.saveRevision,
        cycleId: pensaCheckpoints.cycleId,
        createdAt: pensaCheckpoints.createdAt,
        journey: pensaCheckpoints.journey,
      })
      .from(pensaCheckpoints)
      .where(
        and(
          eq(pensaCheckpoints.projectId, projectId),
          // As versões guardadas são as de quem PROGRAMA (o jogo mora no Estúdio dela).
          eq(pensaCheckpoints.profileId, team.roles.code),
          eq(pensaCheckpoints.status, 'ready'),
        ),
      )
      .orderBy(asc(pensaCheckpoints.createdAt))
    return {
      project: { id: projectId, name: row.project.name, status: row.project.status },
      journey: row.state,
      operation: operation ? operationView(operation) : null,
      cycles,
      checkpoints: checkpoints.map(({ journey, createdAt, ...checkpoint }) => ({
        ...checkpoint,
        planRevision: journey.revision,
        createdAt: createdAt.toISOString(),
      })),
      role: row.project.userId === actor.profileId ? 'owner' : 'member',
      team,
    }
  }

  async command(
    actor: PensaJourneyActor,
    projectId: string,
    expected: number,
    command: PensaJourneyCommand,
    now: Date,
  ) {
    await this.db.transaction(async (tx) => {
      const { state, roles } = await this.lock(tx, actor, projectId)
      if (PROGRAMMER_COMMANDS.has(command.type)) this.assertProgrammer(actor, roles)
      if (command.type === 'record_test') {
        const [creation] = await tx
          .select()
          .from(creations)
          .where(
            and(
              eq(creations.userId, actor.profileId),
              eq(creations.accountId, actor.accountId),
              eq(creations.tool, 'studio'),
              eq(creations.itemId, `pensa-${projectId.replaceAll('-', '')}`),
              isNull(creations.deletedAt),
            ),
          )
        if (
          !creation?.storageRef ||
          creation.itemId !== command.test.creationId ||
          String(creation.revision) !== command.test.saveRevision ||
          creation.pendingRevision
        )
          throw conflict(
            'Salve o jogo e espere aparecer Guardado na conta antes de testar esta versão.',
          )
      }
      if (command.type === 'close' || command.type === 'revise') {
        const [saved] = await tx
          .select()
          .from(creations)
          .where(
            and(
              eq(creations.userId, actor.profileId),
              eq(creations.accountId, actor.accountId),
              eq(creations.tool, 'studio'),
              eq(creations.itemId, `pensa-${projectId.replaceAll('-', '')}`),
              isNull(creations.deletedAt),
            ),
          )
          .for('update')
        if (
          saved?.storageRef &&
          (saved.pendingRevision ||
            state.checkpoint?.saveRevision !== String(saved.revision) ||
            state.checkpoint.cycleId !== state.cycleId)
        )
          throw conflict(
            'Guarde uma cópia da versão atual antes de encerrar. Você pode pausar enquanto isso.',
          )
      }
      let next: PensaJourney
      try {
        next = applyPensaCommand(state, expected, command, now.toISOString())
      } catch (cause) {
        if (cause instanceof PensaJourneyConflict) throw conflict(cause.message)
        throw cause
      }
      if (command.type === 'accept') {
        const [existing] = state.operationId
          ? await tx.select().from(pensaOperations).where(eq(pensaOperations.id, state.operationId))
          : []
        if (existing && (existing.status !== 'waiting' || existing.step !== 'choice'))
          throw conflict()
        const operation = existing ?? { id: randomUUID() }
        if (!existing)
          await tx.insert(pensaOperations).values({
            id: operation.id,
            projectId,
            cycleId: state.cycleId,
            profileId: actor.profileId,
            accountId: actor.accountId,
            kind: 'planning',
            step: 'choice',
            status: 'waiting',
            inputRevision: state.revision,
            input: { message: state.intent },
            createdAt: now,
            updatedAt: now,
          })
        next.operationId = operation.id
        await reservePensaUsage(tx, {
          ...(existing ? await this.operationPayer(tx, existing) : actor),
          ...this.limits,
          id: operation.id,
          projectId,
          feature: 'pensa-planning',
          now,
        })
        await tx
          .update(pensaOperations)
          .set({
            step: 'guides',
            status: 'queued',
            inputRevision: next.revision,
            attempts: 0,
            error: null,
            updatedAt: now,
          })
          .where(eq(pensaOperations.id, operation.id))
      }
      if (command.type === 'repair') {
        const tasks = await tx
          .select()
          .from(pensaTasks)
          .where(and(eq(pensaTasks.cycleId, state.cycleId), isNull(pensaTasks.archivedAt)))
          .orderBy(asc(pensaTasks.position))
        // A conclusão anterior é histórica. Um ajuste ganha sua própria evidência e nunca
        // apaga o trabalho que a criança já fez nem reapresenta um plano inteiro.
        if (tasks.length && tasks.every((task) => task.progressStatus === 'completed')) {
          const source = tasks.filter((task) => task.destination === 'studio').at(-1)
          if (!source) throw conflict('Abra o jogo no Estúdio para escolher o que ajustar.')
          if (tasks.filter((task) => task.supersedesTaskId).length >= 6)
            throw conflict(
              'Vamos guardar este começo e pedir ajuda para encontrar o ajuste. As missões anteriores continuam aqui.',
            )
          const id = randomUUID()
          const observed = state.tests.at(-1)
          const steps = source.guide.steps
            .filter((step) => step.id !== 'observe-again')
            .slice(0, 11)
            .map((step) => ({ ...step, required: false }))
          await tx.insert(pensaTasks).values({
            ...source,
            id,
            title: 'Ajustar o resultado do jogo',
            summary: observed?.note || state.proposal?.test.expected || source.summary,
            position: Math.max(...tasks.map((task) => task.position)) + 1,
            dependencies: [],
            supersedesTaskId: source.id,
            guide: {
              ...source.guide,
              contractVersion: 2,
              steps: [
                {
                  id: 'observe-again',
                  text: `No Estúdio, rode o jogo e confira: ${state.proposal?.test.expected ?? source.summary}`,
                  hint: observed?.note
                    ? `Você observou: ${observed.note}. Use os passos abaixo para localizar e ajustar essa parte.`
                    : 'Use os passos abaixo para localizar a parte que precisa de ajuste. Se travar, peça ajuda ao Zappy.',
                  required: false,
                },
                ...steps,
              ],
            },
            progressStatus: 'planned',
            completedStepIds: [],
            completedCriteriaIds: [],
            outputRef: null,
            startedAt: null,
            completedAt: null,
            progressUpdatedAt: null,
            // O ajuste nasce livre: quem programa o começa (a missão de origem guarda o histórico).
            assigneeProfileId: null,
            completedByProfileId: null,
            revision: 1,
            createdAt: now,
            updatedAt: now,
          })
          next.missionIds = [...state.missionIds, id]
        }
      }
      if (command.type === 'retry') {
        const [operation] = await tx
          .select()
          .from(pensaOperations)
          .where(eq(pensaOperations.id, state.operationId!))
        if (operation?.status !== 'failed' || operation.attempts >= 2 || operation.calls >= 10)
          throw conflict(
            'Não consegui preparar esse caminho. Cancele e ajuste o pedido para tentar outra ideia.',
          )
        await tx
          .update(pensaOperations)
          .set({ status: 'queued', error: null, updatedAt: now })
          .where(eq(pensaOperations.id, operation.id))
      }
      await this.save(tx, next, now)
    })
    return this.get(actor, projectId)
  }

  async archive(
    actor: PensaJourneyActor,
    projectId: string,
    status: 'active' | 'archived',
    now: Date,
  ) {
    await this.db.transaction(async (tx) => {
      const { state, project, role } = await this.lock(tx, actor, projectId, false)
      if (role !== 'owner') throw new PensaNotOwnerError()
      if (project.status === status) return
      if (status === 'active') await this.activeCount(tx, actor)
      await this.cancelWithin(tx, state, now)
      await tx
        .update(pensaProjects)
        .set({ status, updatedAt: now })
        .where(eq(pensaProjects.id, projectId))
    })
    return this.get(actor, projectId)
  }

  async rename(actor: PensaJourneyActor, projectId: string, name: string, now: Date) {
    const clean = name.trim().replace(/\s+/g, ' ')
    if (clean.length < 2 || clean.length > 120)
      throw new ValidationError('Dê ao jogo um nome de 2 a 120 letras.')
    await this.db.transaction(async (tx) => {
      const { role } = await this.lock(tx, actor, projectId, false)
      if (role !== 'owner') throw new PensaNotOwnerError()
      await tx
        .update(pensaProjects)
        .set({ name: clean, updatedAt: now })
        .where(eq(pensaProjects.id, projectId))
    })
    return this.get(actor, projectId)
  }

  async delete(actor: PensaJourneyActor, projectId: string, now: Date): Promise<void> {
    await this.db.transaction(async (tx) => {
      const { state, role } = await this.lock(tx, actor, projectId, false)
      if (role !== 'owner') throw new PensaNotOwnerError()
      await this.cancelWithin(tx, state, now)
      const operations = await tx
        .select()
        .from(pensaOperations)
        .where(and(eq(pensaOperations.projectId, projectId), eq(pensaOperations.kind, 'restore')))
      const abandonedFiles = operations
        .filter((op) => op.status !== 'succeeded')
        .flatMap(
          (op) =>
            (op.output.files as PensaFileTicket['files'] | undefined)?.map(
              (file) => file.destination,
            ) ?? [],
        )
      // Equipe (14/10/2026): o plano deixa dado no R2 de TODO perfil que mexeu nele (as versões
      // guardadas de quem programa, as falas do Zappy de cada um). A limpeza cobre a dona, quem
      // está na equipe e quem tem checkpoint ou fala do plano (inclusive quem já saiu).
      const people = new Set<string>([actor.profileId])
      for (const { profileId } of await tx
        .select({ profileId: pensaProjectMembers.profileId })
        .from(pensaProjectMembers)
        .where(eq(pensaProjectMembers.projectId, projectId)))
        people.add(profileId)
      for (const { profileId } of await tx
        .selectDistinct({ profileId: pensaCheckpoints.profileId })
        .from(pensaCheckpoints)
        .where(eq(pensaCheckpoints.projectId, projectId)))
        people.add(profileId)
      for (const { profileId } of await tx
        .selectDistinct({ profileId: privateNarrations.profileId })
        .from(privateNarrations)
        .where(eq(privateNarrations.projectId, projectId)))
        people.add(profileId)
      await tx.insert(pensaDeletionJobs).values({
        id: projectId,
        accountId: actor.accountId,
        profileId: actor.profileId,
        prefixes: [
          ...[...people].map((profileId) => `creations/${profileId}/pensa/${projectId}/`),
          ...abandonedFiles,
        ],
        notBefore: new Date(now.getTime() + 10 * 60_000),
        createdAt: now,
        updatedAt: now,
      })
      // Metadados sem texto mantêm o teto financeiro mesmo após apagar o plano.
      // A resolução da origem e o prefixo removido invalidam o áudio imediatamente.
      await tx.delete(pensaProjects).where(and(ownerOnly(actor), eq(pensaProjects.id, projectId)))
    })
  }

  async start(actor: PensaJourneyActor, projectId: string, input: PensaGenerationStart, now: Date) {
    await this.db.transaction(async (tx) => {
      const { state } = await this.lock(tx, actor, projectId)
      const [duplicate] = await tx
        .select()
        .from(pensaOperations)
        .where(
          and(
            eq(pensaOperations.projectId, projectId),
            sql`(${pensaOperations.id} = ${input.id}::uuid or ${pensaOperations.input}->'requestIds' @> ${JSON.stringify([input.id])}::jsonb)`,
          ),
        )
      if (duplicate) {
        if (state.messages.find((m) => m.id === input.id)?.text !== input.message)
          throw conflict('Esse envio já foi usado para outra mensagem.')
        return
      }
      if (state.revision !== input.expectedRevision) throw conflict()
      if (!input.message.trim() || input.message.length > 4000 || state.messages.length >= 80)
        throw new PensaQuotaExceededError(
          'Guarde esta conversa e use o guia do seu jogo. Esta mensagem não pôde ser enviada.',
        )
      if (state.stage === 'closed')
        throw conflict('Continue esta versão ou escolha uma melhoria antes de conversar.')
      if (input.kind === 'planning' && ['building', 'observing'].includes(state.stage))
        throw conflict('Guarde a ideia para a próxima versão ou peça ajuda sobre a missão atual.')
      const [previous] = state.operationId
        ? await tx.select().from(pensaOperations).where(eq(pensaOperations.id, state.operationId))
        : []
      if (previous && ['running', 'queued'].includes(previous.status))
        throw conflict('O Zappy ainda está preparando sua resposta. Você pode sair e retomar.')
      // Operação esperando a criança (o Zappy perguntou algo) é RETOMADA pela resposta dela,
      // com a mesma reserva: o planejamento por qualquer mensagem do planejamento (ou da
      // proposta), a ajuda pela próxima ajuda. Uma unidade por pedido, cobrada na entrega.
      const reuse =
        previous?.status === 'waiting' &&
        (previous.kind === 'planning'
          ? input.kind === 'planning' || state.stage === 'proposal'
          : previous.kind === input.kind)
      // A que esperava e NÃO é retomada (a ajuda que perguntou e a criança foi planejar, ou o
      // inverso) fica para trás: o `operationId` passa a ser a nova e nada mais a reivindica.
      // Encerrada aqui, com a reserva solta; antes ela segurava uma unidade da cota até vencer.
      if (previous?.status === 'waiting' && !reuse) {
        await tx
          .update(pensaOperations)
          .set({ status: 'cancelled', leaseId: null, leaseUntil: null, updatedAt: now })
          .where(eq(pensaOperations.id, previous.id))
        await releasePensaReservation(tx, previous.id, now)
      }
      const id = reuse ? previous.id : input.id
      await reservePensaUsage(tx, {
        ...(reuse ? await this.operationPayer(tx, previous) : actor),
        ...this.limits,
        id,
        projectId,
        feature: input.kind === 'planning' ? 'pensa-planning' : 'pensa-help',
        now,
      })
      const next: PensaJourney = {
        ...state,
        revision: state.revision + 1,
        paused: false,
        operationId: id,
        intent: state.intent || input.message,
        lastInteractionAt: now.toISOString(),
        messages: [
          ...state.messages,
          {
            id: input.id,
            role: 'user',
            text: input.message,
            at: now.toISOString(),
            revision: 1,
            final: true,
          },
        ],
      }
      const requestIds =
        reuse && Array.isArray(previous.input.requestIds)
          ? [...previous.input.requestIds, input.id]
          : [input.id]
      const values = {
        input: {
          ...input.context,
          message: input.message,
          requestIds,
          requesterProfileId: actor.profileId,
        },
        output: {},
        status: 'queued' as const,
        step: input.kind === 'planning' ? ('propose' as const) : ('answer' as const),
        inputRevision: next.revision,
        attempts: 0,
        leaseId: null,
        leaseUntil: null,
        error: null,
        updatedAt: now,
      }
      if (reuse) await tx.update(pensaOperations).set(values).where(eq(pensaOperations.id, id))
      else
        await tx.insert(pensaOperations).values({
          ...values,
          id,
          projectId,
          cycleId: state.cycleId,
          profileId: actor.profileId,
          accountId: actor.accountId,
          kind: input.kind,
          createdAt: now,
        })
      await this.save(tx, next, now)
    })
    return this.get(actor, projectId)
  }

  async claim(
    actor: PensaJourneyActor,
    projectId: string,
    operationId: string,
    leaseId: string,
    now: Date,
  ): Promise<PensaOperationWork | null> {
    return this.db.transaction(async (tx) => {
      const { state } = await this.lock(tx, actor, projectId)
      const [operation] = await tx
        .select()
        .from(pensaOperations)
        .where(and(eq(pensaOperations.id, operationId), eq(pensaOperations.projectId, projectId)))
        .for('update')
      if (
        !operation ||
        state.operationId !== operationId ||
        !['queued', 'running', 'failed'].includes(operation.status)
      )
        return null
      if (operation.leaseUntil && operation.leaseUntil > now) return null
      const day = now.toISOString().slice(0, 10)
      const [used] = await tx
        .select({
          day: sql<number>`coalesce(sum(case when ${pensaProviderUsage.day} = ${day} then ${pensaProviderUsage.calls} else 0 end),0)`,
          month: sql<number>`coalesce(sum(${pensaProviderUsage.calls}),0)`,
        })
        .from(pensaProviderUsage)
        .where(
          and(
            eq(pensaProviderUsage.accountId, operation.accountId),
            sql`${pensaProviderUsage.day} >= ${`${day.slice(0, 7)}-01`}`,
          ),
        )
      if (Number(used?.day ?? 0) >= 60 || Number(used?.month ?? 0) >= 600) {
        await tx
          .update(pensaOperations)
          .set({
            status: 'failed',
            error:
              'O Zappy já preparou muitas ideias hoje. Seu caminho está guardado. Continue construindo e tente conversar mais tarde.',
            leaseId: null,
            leaseUntil: null,
            updatedAt: now,
          })
          .where(eq(pensaOperations.id, operationId))
        await releasePensaUsage(tx, projectId, now)
        return null
      }
      if (operation.attempts >= 2 || operation.calls >= 10) {
        await tx
          .update(pensaOperations)
          .set({
            status: 'failed',
            error:
              'Não consegui preparar esta parte. Sua ideia continua guardada. Você pode cancelar e ajustar o pedido.',
            leaseId: null,
            leaseUntil: null,
            updatedAt: now,
          })
          .where(eq(pensaOperations.id, operationId))
        await releasePensaUsage(tx, projectId, now)
        return null
      }
      try {
        await reservePensaUsage(tx, {
          ...(await this.operationPayer(tx, operation)),
          ...this.limits,
          id: operation.id,
          projectId,
          feature: operation.kind === 'planning' ? 'pensa-planning' : 'pensa-help',
          now,
        })
      } catch (cause) {
        if (!(cause instanceof PensaQuotaExceededError)) throw cause
        await tx
          .update(pensaOperations)
          .set({
            status: 'failed',
            error:
              'O limite de ajuda foi alcançado. Sua ideia continua guardada; tente retomar quando o saldo renovar.',
            leaseId: null,
            leaseUntil: null,
            updatedAt: now,
          })
          .where(eq(pensaOperations.id, operation.id))
        return null
      }
      await tx
        .update(pensaOperations)
        .set({
          leaseId,
          leaseUntil: new Date(now.getTime() + 180_000),
          status: 'running',
          attempts: operation.attempts + 1,
          calls: operation.calls + 1,
          error: null,
          updatedAt: now,
        })
        .where(eq(pensaOperations.id, operationId))
      await tx
        .insert(pensaProviderUsage)
        .values({ accountId: operation.accountId, day, calls: 1, updatedAt: now })
        .onConflictDoUpdate({
          target: [pensaProviderUsage.accountId, pensaProviderUsage.day],
          set: { calls: sql`${pensaProviderUsage.calls} + 1`, updatedAt: now },
        })
      return {
        ...operationView(operation),
        status: 'running',
        input: {
          ...operation.input,
          requesterProfileId: operation.input.requesterProfileId ?? operation.profileId,
        },
        output: operation.output,
        leaseId,
      }
    })
  }

  async publish(
    actor: PensaJourneyActor,
    projectId: string,
    operationId: string,
    leaseId: string,
    result: PensaStepResult,
    now: Date,
  ) {
    await this.db.transaction(async (tx) => {
      const { state, project } = await this.lock(tx, actor, projectId)
      const [operation] = await tx
        .select()
        .from(pensaOperations)
        .where(and(eq(pensaOperations.id, operationId), eq(pensaOperations.projectId, projectId)))
        .for('update')
      if (
        !operation ||
        operation.leaseId !== leaseId ||
        operation.status !== 'running' ||
        state.operationId !== operationId ||
        !operation.leaseUntil ||
        operation.leaseUntil <= now
      )
        throw conflict('Esta resposta já não corresponde ao trabalho aberto.')
      // Pause/backlog edits are safe. Proposal/plan mutations are serialized through this operation.
      const next: PensaJourney = { ...state, revision: state.revision + 1 }
      let status: OperationRow['status'] = 'queued'
      let step = operation.step
      let output = operation.output
      if (result.type === 'step') {
        if (operation.step !== 'propose' || result.step !== 'review') throw conflict()
        step = result.step
        output = { ...output, ...result.output }
      }
      if (result.type === 'proposal') {
        if (operation.kind !== 'planning' || operation.step !== 'review') throw conflict()
        if (
          state.checkpoint &&
          state.proposal &&
          state.proposal.dimension !== result.proposal.dimension
        )
          throw conflict(
            'Este jogo já tem um formato. Mantenha o mesmo formato para continuar neste arquivo.',
          )
        next.proposal = result.proposal
        next.stage = 'proposal'
        next.acceptedProposalId = null
        next.backlog = [
          ...state.backlog,
          ...result.proposal.later.filter(
            (idea) => !state.backlog.some((old) => old.text === idea.text),
          ),
        ].slice(0, 80)
        next.messages = [
          ...state.messages,
          {
            id: randomUUID(),
            role: 'assistant',
            text: result.proposal.summary,
            at: now.toISOString(),
            revision: 1,
            final: true,
          },
        ]
        // O título da proposta só vira o nome enquanto o jogo não tem um nome dado pela criança
        // (o de fábrica, ou o da proposta anterior). Renomeado, o nome é dela e fica.
        if (aiGivenName(project.name, state.proposal?.title ?? null))
          await tx
            .update(pensaProjects)
            .set({ name: result.proposal.title.slice(0, 120) })
            .where(eq(pensaProjects.id, projectId))
        status = 'waiting'
        step = 'choice'
      }
      if (result.type === 'question' || result.type === 'answer') {
        if (!result.text.trim() || result.text.length > 6000) throw conflict()
        next.messages = [
          ...state.messages,
          {
            id: randomUUID(),
            role: 'assistant',
            text: result.text,
            at: now.toISOString(),
            revision: 1,
            final: true,
          },
        ]
        status = result.type === 'question' ? 'waiting' : 'succeeded'
        if (result.type === 'answer') {
          if (operation.kind === 'planning') {
            status = 'waiting'
            step = next.proposal ? 'choice' : 'propose'
          } else {
            await commitPensaUsage(tx, operation.id, operation.accountId, now)
            next.operationId = null
          }
        }
      }
      if (result.type === 'plan') {
        if (
          operation.step !== 'guides' ||
          next.acceptedProposalId !== next.proposal?.id ||
          next.stage !== 'preparing'
        )
          throw conflict()
        if (!result.tasks.length || result.tasks.length > 12) throw conflict()
        const missions = next.proposal!.missions
        if (
          missions.length !== result.tasks.length ||
          result.tasks.some((task, index) => {
            const mission = missions[index]!
            return (
              task.destination !== mission.destination ||
              task.context.kind !== mission.destination ||
              task.guide.contractVersion !== 2 ||
              task.position !== index ||
              task.dependencies.length !== mission.dependencies.length ||
              mission.dependencies.some(
                (key) =>
                  !task.dependencies.includes(
                    result.tasks[missions.findIndex((m) => m.key === key)]?.id ?? '',
                  ),
              ) ||
              (task.context.kind === 'studio' &&
                (task.context.dimension !== next.proposal!.dimension ||
                  task.context.blockIds.some((id) => !mission.blockIds.includes(id)) ||
                  task.context.blockIds.length !== mission.blockIds.length ||
                  task.context.extensionIds.length !== mission.extensionIds.length ||
                  task.context.extensionIds.some((id) => !mission.extensionIds.includes(id)) ||
                  task.context.mechanicDocumentIds.length !== mission.mechanicIds.length ||
                  task.context.mechanicDocumentIds.some(
                    (id) => !mission.mechanicIds.includes(id),
                  ))) ||
              (task.context.kind !== 'studio' &&
                (task.context.assetId !== mission.asset?.id ||
                  task.context.artKind !== mission.asset?.kind))
            )
          })
        )
          throw conflict('As missões precisam corresponder ao começo escolhido.')
        const [existing] = await tx
          .select({ n: count() })
          .from(pensaTasks)
          .where(eq(pensaTasks.cycleId, state.cycleId))
        if (existing?.n && !state.revising)
          throw conflict('Este ciclo já tem missões. Retome o plano salvo.')
        if (state.revising)
          await tx
            .update(pensaTasks)
            .set({ archivedAt: now, updatedAt: now })
            .where(eq(pensaTasks.cycleId, state.cycleId))
        await tx
          .insert(pensaTasks)
          .values(result.tasks.map((task) => pensaTaskValues(state.cycleId, task, now)))
        await commitPensaUsage(tx, operation.id, operation.accountId, now)
        next.missionIds = result.tasks.map((task) => task.id)
        next.stage = 'building'
        next.revising = false
        next.operationId = null
        status = 'succeeded'
        step = 'publish'
      }
      await tx
        .update(pensaOperations)
        .set({
          status,
          step,
          output,
          inputRevision: next.revision,
          attempts: status === 'queued' ? 0 : operation.attempts,
          leaseId: null,
          leaseUntil: null,
          updatedAt: now,
        })
        .where(eq(pensaOperations.id, operationId))
      await this.save(tx, next, now)
    })
  }

  async fail(
    actor: PensaJourneyActor,
    projectId: string,
    operationId: string,
    leaseId: string,
    message: string,
    now: Date,
  ) {
    await this.db.transaction(async (tx) => {
      const { state } = await this.lock(tx, actor, projectId, false)
      if (state.operationId !== operationId) return
      const failed = await tx
        .update(pensaOperations)
        .set({
          status: 'failed',
          leaseId: null,
          leaseUntil: null,
          error: message.slice(0, 500),
          updatedAt: now,
        })
        .where(
          and(
            eq(pensaOperations.id, operationId),
            eq(pensaOperations.projectId, projectId),
            eq(pensaOperations.leaseId, leaseId),
          ),
        )
        .returning({ id: pensaOperations.id })
      if (failed.length) await releasePensaUsage(tx, projectId, now)
    })
  }

  private async cancelWithin(tx: Tx, state: PensaJourney, now: Date) {
    await tx
      .update(pensaOperations)
      .set({ status: 'cancelled', leaseId: null, leaseUntil: null, updatedAt: now })
      .where(
        and(
          eq(pensaOperations.projectId, state.projectId),
          inArray(pensaOperations.status, ['queued', 'running', 'waiting', 'failed']),
        ),
      )
    await releasePensaUsage(tx, state.projectId, now)
    await this.save(
      tx,
      {
        ...state,
        revision: state.revision + 1,
        operationId: null,
        paused: true,
        stage: state.stage === 'preparing' ? 'proposal' : state.stage,
        lastInteractionAt: now.toISOString(),
      },
      now,
    )
  }

  async cancel(actor: PensaJourneyActor, projectId: string, now: Date) {
    await this.db.transaction(async (tx) => {
      const { state } = await this.lock(tx, actor, projectId)
      await this.cancelWithin(tx, state, now)
    })
    return this.get(actor, projectId)
  }

  async voice(
    actor: PensaJourneyActor,
    input: PensaVoiceRequest,
    now: Date,
  ): Promise<PensaVoiceResult> {
    return this.db.transaction(async (tx) => {
      await lockPensaAccount(tx, actor.accountId)
      const [fence] = await tx
        .select()
        .from(accountDeletionFences)
        .where(eq(accountDeletionFences.accountId, actor.accountId))
      if (fence) throw new PensaNotFoundError()
      if (input.projectId) await this.lock(tx, actor, input.projectId, false)
      const [old] = await tx
        .select()
        .from(privateNarrations)
        .where(eq(privateNarrations.id, input.id))
        .for('update')
      if (
        old &&
        (old.profileId !== actor.profileId ||
          old.accountId !== actor.accountId ||
          old.projectId !== (input.projectId ?? null) ||
          old.chars !== input.chars)
      )
        throw new PensaNotFoundError()
      // Each attempt owns its blob. A timed-out provider must never overwrite or
      // delete the next lease's audio when its late upload/cleanup finally finishes.
      const prefix = input.projectId
        ? `creations/${actor.profileId}/pensa/${input.projectId}/voice/${input.id}`
        : `creations/${actor.profileId}/voice/${input.id}`
      const key = `${prefix}/${input.leaseId}.mp3`
      if (old?.status === 'ready' && input.type === 'claim')
        return { status: 'ready', key: `${prefix}/${old.leaseId}.mp3` }
      if (input.type !== 'claim') {
        if (
          !old ||
          old.leaseId !== input.leaseId ||
          (old.status !== 'ready' && old.leaseUntil <= now)
        )
          throw conflict()
        await tx
          .update(privateNarrations)
          .set({ status: input.type === 'commit' ? 'ready' : 'failed', leaseUntil: now })
          .where(eq(privateNarrations.id, input.id))
        return { status: input.type === 'commit' ? 'ready' : 'waiting', key }
      }
      if (old?.status === 'generating' && old.leaseUntil > now)
        return { status: 'waiting', key: `${prefix}/${old.leaseId}.mp3` }
      const day = new Date(now)
      day.setUTCHours(0, 0, 0, 0)
      const month = new Date(day)
      month.setUTCDate(1)
      const [used] = await tx
        .select({
          day: sql<number>`coalesce(sum(case when ${privateNarrations.createdAt} >= ${day.toISOString()} then ${privateNarrations.chars} * ${privateNarrations.attempts} else 0 end),0)`,
          month: sql<number>`coalesce(sum(${privateNarrations.chars} * ${privateNarrations.attempts}),0)`,
        })
        .from(privateNarrations)
        .where(
          and(
            eq(privateNarrations.accountId, actor.accountId),
            sql`${privateNarrations.createdAt} >= ${month.toISOString()}`,
          ),
        )
      if (
        (old?.attempts ?? 0) >= 2 ||
        Number(used?.day ?? 0) + input.chars > 6000 ||
        Number(used?.month ?? 0) + input.chars > 60000
      )
        throw new PensaQuotaExceededError('A voz descansou por hoje. O texto continua disponível.')
      const leaseUntil = new Date(now.getTime() + 120000)
      if (old)
        await tx
          .update(privateNarrations)
          .set({
            status: 'generating',
            attempts: old.attempts + 1,
            createdAt: now,
            leaseId: input.leaseId,
            leaseUntil,
          })
          .where(eq(privateNarrations.id, input.id))
      else
        await tx.insert(privateNarrations).values({
          id: input.id,
          projectId: input.projectId ?? null,
          profileId: actor.profileId,
          accountId: actor.accountId,
          chars: input.chars,
          status: 'generating',
          leaseId: input.leaseId,
          leaseUntil,
          createdAt: now,
        })
      return { status: 'generate', key }
    })
  }

  async protect(
    actor: PensaJourneyActor,
    projectId: string,
    action: PensaProtectionAction,
    now: Date,
  ): Promise<PensaJourneyView | PensaFileTicket> {
    const ticket = await this.db.transaction(async (tx): Promise<PensaFileTicket | null> => {
      const { state, roles } = await this.lock(tx, actor, projectId)
      // Guardar, restaurar e começar a próxima versão usam o jogo do Estúdio de quem programa.
      this.assertProgrammer(actor, roles)
      const [fence] = await tx
        .select()
        .from(accountDeletionFences)
        .where(eq(accountDeletionFences.accountId, actor.accountId))
      if (fence) throw new PensaNotFoundError()
      if ('expectedRevision' in action && state.revision !== action.expectedRevision)
        throw conflict()
      if (action.type === 'increment') {
        if (state.stage !== 'closed' || state.closedReason !== 'met' || !state.checkpoint)
          throw conflict('Guarde e conclua esta versão antes de escolher a próxima.')
        const [base] = await tx
          .select()
          .from(creations)
          .where(
            and(
              eq(creations.userId, actor.profileId),
              eq(creations.accountId, actor.accountId),
              eq(creations.tool, 'studio'),
              eq(creations.itemId, state.checkpoint.creationId),
              isNull(creations.deletedAt),
            ),
          )
          .for('update')
        if (
          !base?.storageRef ||
          base.pendingRevision ||
          String(base.revision) !== state.checkpoint.saveRevision
        )
          throw conflict(
            'O jogo mudou desde o último teste. Use Testar mudanças antes de escolher o próximo pedaço, ou volte à versão guardada.',
          )
        const cycles = await tx
          .select()
          .from(pensaCycles)
          .where(eq(pensaCycles.projectId, projectId))
        if (cycles.length >= 40)
          throw new PensaQuotaExceededError('Este jogo já tem muitas versões guardadas.')
        const cycleId = randomUUID()
        const number = Math.max(...cycles.map((c) => c.number)) + 1
        await tx
          .update(pensaJourneys)
          .set({ active: false })
          .where(eq(pensaJourneys.cycleId, state.cycleId))
        await tx.insert(pensaCycles).values({
          id: cycleId,
          projectId,
          number,
          stage: 'z',
          goal: null,
          createdAt: now,
          updatedAt: now,
        })
        const next = {
          ...createPensaJourney(projectId, cycleId, now.toISOString()),
          revision: state.revision + 1,
          intent: state.intent,
          builtResults: [
            ...(state.builtResults ?? []),
            ...(state.proposal ? [state.proposal.firstResult] : []),
          ].slice(-40),
          proposal: state.proposal,
          backlog: state.backlog,
          checkpoint: state.checkpoint,
          messages: [
            {
              id: randomUUID(),
              role: 'assistant' as const,
              text: 'Seu jogo já tem um começo guardado. Qual pedaço você quer acrescentar agora?',
              at: now.toISOString(),
              revision: 1,
              final: true,
            },
          ],
        }
        await tx.insert(pensaJourneys).values({
          cycleId,
          projectId,
          active: true,
          revision: next.revision,
          data: next,
          updatedAt: now,
        })
        return null
      }
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`creation-quota:${actor.profileId}`}, 0))`,
      )
      const [creation] = await tx
        .select()
        .from(creations)
        .where(
          and(
            eq(creations.userId, actor.profileId),
            eq(creations.accountId, actor.accountId),
            eq(creations.tool, 'studio'),
            eq(creations.itemId, `pensa-${projectId.replaceAll('-', '')}`),
            isNull(creations.deletedAt),
          ),
        )
        .for('update')
      if (!creation?.storageRef || creation.pendingRevision)
        throw conflict(
          'Abra e salve seu jogo. Espere Guardado na conta antes de proteger esta versão.',
        )
      if (action.type === 'prepare') {
        if (
          state.checkpoint?.saveRevision === String(creation.revision) &&
          state.checkpoint.cycleId === state.cycleId &&
          state.checkpoint.planRevision === state.revision - 1
        ) {
          const [ready] = await tx
            .select()
            .from(pensaCheckpoints)
            .where(
              and(
                eq(pensaCheckpoints.id, state.checkpoint.id),
                eq(pensaCheckpoints.projectId, projectId),
                eq(pensaCheckpoints.status, 'ready'),
              ),
            )
          if (ready) return { id: ready.id, files: [] }
        }
        const [existing] = await tx
          .select()
          .from(pensaCheckpoints)
          .where(eq(pensaCheckpoints.id, action.id))
        if (existing) {
          if (
            existing.projectId !== projectId ||
            existing.profileId !== actor.profileId ||
            existing.journey.revision !== state.revision ||
            existing.saveRevision !== String(creation.revision)
          )
            throw conflict()
          return {
            id: existing.id,
            files: (existing.manifest as unknown as CheckpointManifest).files,
          }
        }
        const [total] = await tx
          .select({
            n: count(),
            bytes: sql<number>`coalesce(sum((${pensaCheckpoints.manifest}->'creation'->>'bytes')::bigint), 0)`,
          })
          .from(pensaCheckpoints)
          .where(eq(pensaCheckpoints.profileId, actor.profileId))
        if ((total?.n ?? 0) >= 80 || Number(total?.bytes ?? 0) + creation.bytes > 512 * 1024 * 1024)
          throw new PensaQuotaExceededError(
            'O espaço de versões guardadas está cheio. Seu jogo atual continua salvo.',
          )
        const prefix = `creations/${actor.profileId}/pensa/${projectId}/checkpoints/${action.id}`
        const parts = creation.parts as Array<{ hash: string; bytes: number; rev?: number }>
        if (parts.some((p) => !p.rev))
          throw conflict('Um recurso do jogo precisa ser salvo de novo.')
        const files = [
          { source: creation.storageRef, destination: `${prefix}/game.json.gz` },
          ...parts.map((p) => ({
            source: creationPartStorageKey(
              actor.profileId,
              'studio',
              creation.itemId,
              p.hash,
              p.rev!,
            ),
            destination: `${prefix}/${p.hash}.gz`,
          })),
        ]
        const tasks = await tx
          .select()
          .from(pensaTasks)
          .where(eq(pensaTasks.cycleId, state.cycleId))
          .orderBy(asc(pensaTasks.position))
        const saved: SavedCreation = {
          id: creation.id,
          itemId: creation.itemId,
          revision: creation.revision,
          name: creation.name,
          kind: creation.kind,
          bytes: creation.bytes,
          formatVersion: creation.formatVersion,
          parts: creation.parts,
          storageRef: creation.storageRef,
          contentFingerprint: creation.contentFingerprint,
        }
        await tx.insert(pensaCheckpoints).values({
          id: action.id,
          projectId,
          cycleId: state.cycleId,
          profileId: actor.profileId,
          accountId: actor.accountId,
          creationId: creation.itemId,
          saveRevision: String(creation.revision),
          journey: state,
          manifest: { creation: saved, tasks, files },
          status: 'copying',
          createdAt: now,
        })
        return { id: action.id, files }
      }
      if (action.type === 'commit') {
        const [checkpoint] = await tx
          .select()
          .from(pensaCheckpoints)
          .where(
            and(
              eq(pensaCheckpoints.id, action.id),
              eq(pensaCheckpoints.projectId, projectId),
              eq(pensaCheckpoints.profileId, actor.profileId),
            ),
          )
          .for('update')
        if (!checkpoint) throw new PensaNotFoundError()
        if (checkpoint.status === 'ready' && state.checkpoint?.id === checkpoint.id) return null
        if (
          checkpoint.journey.revision !== state.revision ||
          checkpoint.saveRevision !== String(creation.revision)
        )
          throw conflict('O jogo mudou durante a cópia. Proteja a versão atual de novo.')
        await tx
          .update(pensaCheckpoints)
          .set({ status: 'ready' })
          .where(eq(pensaCheckpoints.id, checkpoint.id))
        await this.save(
          tx,
          {
            ...state,
            revision: state.revision + 1,
            checkpoint: {
              id: checkpoint.id,
              creationId: creation.itemId,
              saveRevision: String(creation.revision),
              planRevision: state.revision,
              cycleId: state.cycleId,
              createdAt: now.toISOString(),
            },
          },
          now,
        )
        return null
      }
      if (action.type === 'restore_prepare') {
        if (state.operationId) throw conflict('Termine ou cancele a preparação antes de restaurar.')
        // Uma cópia pronta do estado atual deve preceder qualquer substituição.
        if (!state.checkpoint || state.checkpoint.saveRevision !== String(creation.revision))
          throw conflict('Proteja a versão atual antes de restaurar.')
        const [target] = await tx
          .select()
          .from(pensaCheckpoints)
          .where(
            and(
              eq(pensaCheckpoints.id, action.checkpointId),
              eq(pensaCheckpoints.projectId, projectId),
              eq(pensaCheckpoints.profileId, actor.profileId),
              eq(pensaCheckpoints.status, 'ready'),
            ),
          )
        if (!target) throw new PensaNotFoundError()
        const snapshot = target.manifest as unknown as CheckpointManifest
        const [old] = await tx
          .select()
          .from(pensaOperations)
          .where(eq(pensaOperations.id, action.id))
        if (old) {
          if (old.projectId !== projectId || old.kind !== 'restore') throw conflict()
          return { id: old.id, files: old.output.files as PensaFileTicket['files'] }
        }
        const revision = creation.lastReservedRevision + 1
        const files = [
          {
            source: snapshot.files[0]!.destination,
            destination: creationStorageKey(actor.profileId, 'studio', creation.itemId, revision),
          },
          ...snapshot.creation.parts.map((p, i) => ({
            source: snapshot.files[i + 1]!.destination,
            destination: creationPartStorageKey(
              actor.profileId,
              'studio',
              creation.itemId,
              p.hash,
              revision,
            ),
          })),
        ]
        await tx
          .update(creations)
          .set({ lastReservedRevision: revision })
          .where(eq(creations.id, creation.id))
        await tx.insert(pensaOperations).values({
          id: action.id,
          projectId,
          cycleId: state.cycleId,
          profileId: actor.profileId,
          accountId: actor.accountId,
          kind: 'restore',
          step: 'copy',
          status: 'waiting',
          inputRevision: state.revision,
          input: { checkpointId: target.id, baseRevision: creation.revision, revision },
          output: { files },
          createdAt: now,
          updatedAt: now,
        })
        return { id: action.id, files }
      }
      const [operation] = await tx
        .select()
        .from(pensaOperations)
        .where(
          and(
            eq(pensaOperations.id, action.id),
            eq(pensaOperations.projectId, projectId),
            eq(pensaOperations.profileId, actor.profileId),
          ),
        )
        .for('update')
      if (operation?.kind !== 'restore') throw new PensaNotFoundError()
      if (operation.status === 'succeeded') return null
      if (
        operation.inputRevision !== state.revision ||
        operation.input.baseRevision !== creation.revision
      )
        throw conflict('O jogo mudou. Guarde a versão atual antes de restaurar.')
      const [target] = await tx
        .select()
        .from(pensaCheckpoints)
        .where(
          and(
            eq(pensaCheckpoints.id, String(operation.input.checkpointId)),
            eq(pensaCheckpoints.projectId, projectId),
            eq(pensaCheckpoints.status, 'ready'),
          ),
        )
      if (!target) throw new PensaNotFoundError()
      const snapshot = target.manifest as unknown as CheckpointManifest
      const revision = Number(operation.input.revision)
      const files = operation.output.files as PensaFileTicket['files']
      const [usage] = await tx
        .select({ bytes: sql<number>`coalesce(sum(${creations.bytes}),0)` })
        .from(creations)
        .where(and(eq(creations.userId, actor.profileId), isNull(creations.deletedAt)))
      if (
        Number(usage?.bytes ?? 0) - creation.bytes + snapshot.creation.bytes >
        CREATION_LIMITS.maxTotalBytes
      )
        throw conflict('Não há espaço para restaurar este jogo agora.')
      await tx
        .update(creations)
        .set({
          revision,
          storageRef: files[0]!.destination,
          name: snapshot.creation.name,
          kind: snapshot.creation.kind,
          bytes: snapshot.creation.bytes,
          formatVersion: snapshot.creation.formatVersion,
          contentFingerprint: snapshot.creation.contentFingerprint,
          parts: snapshot.creation.parts.map((p) => ({ ...p, rev: revision })),
          itemUpdatedAt: now,
          syncedAt: now,
        })
        .where(eq(creations.id, creation.id))
      await tx
        .update(pensaJourneys)
        .set({ active: false })
        .where(eq(pensaJourneys.projectId, projectId))
      // Retire ajustes criados depois do snapshot; seus registros continuam como histórico.
      await tx
        .update(pensaTasks)
        .set({ archivedAt: now })
        .where(eq(pensaTasks.cycleId, target.cycleId))
      for (const task of snapshot.tasks)
        await tx
          .update(pensaTasks)
          .set({
            title: task.title,
            summary: task.summary,
            context: task.context,
            guide: task.guide,
            dependencies: task.dependencies,
            position: task.position,
            archivedAt: task.archivedAt ? new Date(task.archivedAt) : null,
            revision: sql`${pensaTasks.revision} + 1`,
            progressStatus: task.progressStatus,
            // Quem começou e quem concluiu voltam com o progresso (cópia anterior à equipe: null).
            assigneeProfileId: task.assigneeProfileId ?? null,
            completedByProfileId: task.completedByProfileId ?? null,
            completedStepIds: task.completedStepIds,
            completedCriteriaIds: task.completedCriteriaIds,
            outputRef:
              task.outputRef?.kind === 'studio_project'
                ? { ...task.outputRef, saveRevision: String(revision) }
                : task.outputRef,
            progressUpdatedAt: now,
            updatedAt: now,
            startedAt: task.startedAt ? new Date(task.startedAt) : null,
            completedAt: task.completedAt ? new Date(task.completedAt) : null,
          })
          .where(and(eq(pensaTasks.id, task.id), eq(pensaTasks.cycleId, target.cycleId)))
      const restored: PensaJourney = {
        ...target.journey,
        revision: state.revision + 1,
        paused: true,
        operationId: null,
        // Testes antigos ficam no histórico; o arquivo restaurado merece nova observação.
        stage: target.journey.missionIds.length
          ? 'building'
          : target.journey.stage === 'closed'
            ? (target.journey.closedFrom ?? 'idea')
            : target.journey.stage,
        closedReason: null,
        closedFrom: null,
        tests: [
          ...new Map(
            [...target.journey.tests, ...state.tests].map((test) => [test.id, test]),
          ).values(),
        ],
        testSessionStart: new Set([...target.journey.tests, ...state.tests].map((test) => test.id))
          .size,
        lastInteractionAt: now.toISOString(),
        checkpoint: {
          id: target.id,
          creationId: creation.itemId,
          saveRevision: String(revision),
          planRevision: target.journey.revision,
          cycleId: target.cycleId,
          createdAt: target.createdAt.toISOString(),
        },
        backlog: [
          ...new Map(
            [...target.journey.backlog, ...state.backlog].map((idea) => [idea.id, idea]),
          ).values(),
        ].slice(0, 80),
      }
      await tx
        .update(pensaJourneys)
        .set({ active: true, data: restored, revision: restored.revision, updatedAt: now })
        .where(eq(pensaJourneys.cycleId, target.cycleId))
      await tx
        .update(pensaOperations)
        .set({ status: 'succeeded', step: 'publish', updatedAt: now })
        .where(eq(pensaOperations.id, operation.id))
      return null
    })
    return ticket ?? this.get(actor, projectId)
  }
}
