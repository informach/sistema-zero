import { randomUUID } from 'node:crypto'
import { ValidationError } from '@sistemazero/core/errors'
import {
  assistanceRequestExpired,
  type LiveCursorTarget,
  type LiveWorkspaceCommitRequest,
  type LiveWorkspaceView,
  lessonAccess,
  occurrenceIsOpen,
  supervisionStatus,
} from '@sistemazero/core/live'
import { createBlankProjectSnapshot as createEmptyProject } from '@sistemazero/studio/blank-project'
import {
  LiveAccessError,
  LiveConflictError,
  LiveNotFoundError,
} from '../../domain/live/live.errors'
import { liveProjectKey } from '../../domain/live/live-course-rules'
import { validateLiveSnapshot as validateSnapshot } from '../../domain/live/workspace-snapshot'
import type { LiveStudioBlockRecord } from '../../domain/ports/live-course.port'
import type { LiveActor, LiveCohortAggregate } from '../../domain/ports/live-repository.port'
import type {
  LiveWorkspaceRecord,
  LiveWorkspaceRepository,
  LiveWorkspaceTransaction,
} from '../../domain/ports/live-workspace-repository.port'
import type { LiveContext, LiveService } from './live.service'

const LEASE_MS = 30_000
/**
 * A poll whose revision did not change reuses a successful authorization for this long instead
 * of reloading the whole cohort every second. Writes and project downloads always re-check.
 */
const POLL_AUTHORIZATION_MS = 5_000
const POLL_MEMO_LIMIT = 10_000
const view = ({
  accountId: _accountId,
  projectKey: _projectKey,
  lessonIds: _lessonIds,
  ...workspace
}: LiveWorkspaceRecord): LiveWorkspaceView => structuredClone(workspace)
/** The encounters whose lesson already opened this project: access is judged in them. */
const linkedSessions = (aggregate: LiveCohortAggregate, workspace: LiveWorkspaceRecord) =>
  aggregate.sessions.filter(
    (session) => session.lessonId != null && workspace.lessonIds.includes(session.lessonId),
  )

type Cohort = LiveCohortAggregate | null
type Access = (LiveContext & { enrollment: NonNullable<LiveContext['enrollment']> }) | undefined
interface AccessOptions {
  deviceId?: string
  requireRoom?: boolean
  /** Inside a transaction: the loader bound to that transaction (never a second connection). */
  cohort?: () => Promise<Cohort>
  /** Inside a transaction the subscription check is decided before the locks are taken. */
  continuation?: boolean | 'defer'
}
/** Thrown inside a transaction when the subscription answer is needed; resolved outside it. */
class ContinuationCheckRequired extends Error {}
type TransactionAccess = (
  workspace: LiveWorkspaceRecord,
  options?: { deviceId?: string; requireRoom?: boolean },
) => Promise<Access>
type PollMemo = Map<string, { until: number; readOnly: boolean; contextSessionId?: string }>

export class LiveWorkspaceService {
  constructor(
    private readonly repository: LiveWorkspaceRepository,
    private readonly live: Pick<LiveService, 'contextFor' | 'cohortForSession' | 'studioBlock'>,
    private readonly clock: () => Date = () => new Date(),
    private readonly recording?: { confirmPaused(occurrenceId: string): Promise<void> },
    private readonly continuation?: { canContinue(accountId: string): Promise<boolean> },
    private readonly contextSessionId?: string,
    private readonly pollMemo: PollMemo = new Map(),
  ) {}

  forSession(sessionId?: string) {
    return new LiveWorkspaceService(
      this.repository,
      this.live,
      this.clock,
      this.recording,
      this.continuation,
      sessionId,
      this.pollMemo,
    )
  }

  private async continues(actor: LiveActor, options: AccessOptions) {
    if (options.continuation === 'defer') throw new ContinuationCheckRequired()
    if (options.continuation !== undefined) return options.continuation
    return (await this.continuation?.canContinue(actor.accountId)) ?? false
  }

  private async existingAccess(
    actor: LiveActor,
    workspace: LiveWorkspaceRecord,
    options: AccessOptions = {},
  ): Promise<Access> {
    const { deviceId, requireRoom = false } = options
    const aggregate = options.cohort
      ? await options.cohort()
      : await this.live.cohortForSession(workspace.sessionId)
    const owner = actor.id === workspace.learnerId && actor.accountId === workspace.accountId
    try {
      if (!aggregate) throw new LiveNotFoundError()
      this.live.contextFor(actor, aggregate, workspace.sessionId)
    } catch (error) {
      if (
        (error instanceof LiveNotFoundError || error instanceof LiveAccessError) &&
        !this.contextSessionId &&
        !requireRoom &&
        owner &&
        (await this.continues(actor, options))
      ) {
        workspace.contextSessionId = workspace.sessionId
        return undefined
      }
      throw error
    }
    const linked = linkedSessions(aggregate, workspace)
    const selected =
      this.contextSessionId ?? (requireRoom ? workspace.assistance?.sessionId : undefined)
    if (selected && !linked.some((session) => session.id === selected)) throw new LiveAccessError()
    const candidates = selected
      ? linked.filter((session) => session.id === selected)
      : [...linked].sort((a, b) => {
          const open = (id: string) => {
            const occurrence = aggregate.occurrences.find((item) => item.id === id)
            return occurrence && occurrenceIsOpen(occurrence, this.clock()) ? 1 : 0
          }
          return open(b.occurrenceId) - open(a.occurrenceId) || b.order - a.order
        })
    for (const session of candidates) {
      const enrollment = aggregate.enrollments.find(
        (item) => item.learnerId === workspace.learnerId && item.status === 'active',
      )
      const grant = aggregate.grants.find(
        (item) => item.enrollmentId === enrollment?.id && item.sessionId === session.id,
      )
      if (
        !grant ||
        lessonAccess(grant.startsAt, grant.endsAt, this.clock(), Boolean(grant.revokedAt)) !==
          'available'
      )
        continue
      const context = this.accessIn(
        actor,
        aggregate,
        session.id,
        workspace.learnerId,
        deviceId,
        requireRoom,
      )
      if (
        requireRoom &&
        workspace.assistance?.sessionId &&
        workspace.assistance.sessionId !== session.id
      )
        throw new LiveConflictError('Conclua a ajuda na sala em que ela foi aceita.')
      workspace.contextSessionId = session.id
      return context
    }
    // Subscription continues an existing project only from the library. Explicit lesson
    // requests must still respect that lesson's own release and expiry.
    if (!selected && !requireRoom && owner && (await this.continues(actor, options))) {
      workspace.contextSessionId = workspace.sessionId
      return undefined
    }
    throw new LiveAccessError()
  }

  /** Pure: the lesson grant of `learnerId` in `sessionId`, judged on an already loaded cohort. */
  private accessIn(
    actor: LiveActor,
    aggregate: LiveCohortAggregate,
    sessionId: string,
    learnerId: string,
    deviceId?: string,
    requireRoom = false,
  ) {
    const context = this.live.contextFor(actor, aggregate, sessionId)
    if (context.role !== 'teacher' && learnerId !== actor.id) throw new LiveAccessError()
    const enrollment = context.aggregate.enrollments.find(
      (e) => e.learnerId === learnerId && e.status === 'active',
    )
    const grant = context.aggregate.grants.find(
      (g) => g.enrollmentId === enrollment?.id && g.sessionId === sessionId,
    )
    if (
      !enrollment ||
      !grant ||
      lessonAccess(grant.startsAt, grant.endsAt, this.clock(), Boolean(grant.revokedAt)) !==
        'available'
    )
      throw new LiveAccessError()
    if (context.role === 'learner' && enrollment.accountId !== actor.accountId)
      throw new LiveAccessError()
    if (deviceId && occurrenceIsOpen(context.occurrence, this.clock())) {
      const p = context.occurrence.participants.find((p) => p.learnerId === learnerId)
      if (context.role === 'learner' && p && (p.deviceId !== deviceId || p.admission === 'removed'))
        throw new LiveAccessError('Este projeto está aberto em outro aparelho. Use Continuar aqui.')
    }
    if (requireRoom) {
      const participant = context.occurrence.participants.find((p) => p.learnerId === learnerId)
      if (
        !occurrenceIsOpen(context.occurrence, this.clock()) ||
        supervisionStatus(context.occurrence.teachers, this.clock()) !== 'present' ||
        participant?.admission !== 'admitted'
      )
        throw new LiveConflictError(
          'A ajuda precisa de uma sala supervisionada e da criança presente.',
        )
    }
    return { ...context, enrollment }
  }

  /**
   * After the lesson window, without a Studio subscription, the project is still the child's:
   * the owner (library only) and an assigned teacher may view and export it. Never a write.
   */
  private async readOnlyAllowed(actor: LiveActor, workspace: LiveWorkspaceRecord) {
    if (
      !actor.staff &&
      !this.contextSessionId &&
      actor.id === workspace.learnerId &&
      actor.accountId === workspace.accountId
    )
      return true
    if (!actor.staff) return false
    const aggregate = await this.live.cohortForSession(workspace.sessionId)
    if (!aggregate?.cohort.teacherIds.includes(actor.id)) return false
    return (
      !this.contextSessionId ||
      linkedSessions(aggregate, workspace).some((session) => session.id === this.contextSessionId)
    )
  }

  /** The block's `initialProject` as this child's project (`id` is the workspace id). */
  private seed(block: LiveStudioBlockRecord, id: string) {
    const initial = block.initialProject
    if (typeof initial !== 'object' || initial === null || Array.isArray(initial))
      return validateSnapshot(
        JSON.parse(JSON.stringify(createEmptyProject(id, 'Meu projeto'))) as Record<
          string,
          unknown
        >,
        id,
      )
    return validateSnapshot({ ...(initial as Record<string, unknown>), id }, id)
  }

  /**
   * The child's project for a Studio BLOCK of the encounter's PUBLISHED lesson, opened or
   * created: key = course + child + the block `chain` (one project across the chain lessons) or
   * the block id. Seed = the block `initialProject`; the block curation goes in `studio`. A
   * teacher of the cohort opens a child's project with `learnerId`. After the lesson deadline an
   * existing project only opens to read (and export); none is created.
   */
  async openForBlock(
    actor: LiveActor,
    sessionId: string,
    blockId: string,
    learnerId: string = actor.id,
  ): Promise<LiveWorkspaceView> {
    const aggregate = await this.live.cohortForSession(sessionId)
    if (!aggregate) throw new LiveNotFoundError()
    const context = this.live.contextFor(actor, aggregate, sessionId)
    if (context.role !== 'teacher' && learnerId !== actor.id) throw new LiveAccessError()
    const courseId = aggregate.cohort.courseId
    const lessonId = context.session.lessonId
    if (!courseId || !lessonId) throw new LiveNotFoundError()
    const block = await this.live.studioBlock(lessonId, blockId)
    if (!block || block.courseId !== courseId) throw new LiveNotFoundError()
    const projectKey = liveProjectKey(courseId, block)
    let access: ReturnType<LiveWorkspaceService['accessIn']> | null = null
    try {
      access = this.accessIn(actor, aggregate, sessionId, learnerId)
    } catch (error) {
      if (!(error instanceof LiveAccessError)) throw error
    }
    let record = await this.repository.findByKey(learnerId, projectKey)
    if (!access) {
      // This lesson is closed (deadline passed, not yet released, revoked): never a new project,
      // and an existing one only to read here. The owner and the assigned teacher keep reading
      // it (the library rules decide who); editing it is never reopened through this lesson.
      if (!record) throw new LiveAccessError()
      const readable = await this.forSession().get(actor, record.id)
      return { ...readable, readOnly: true, studio: block.studio }
    }
    if (!record) {
      const id = randomUUID()
      record = await this.repository.ensureByKey({
        id,
        sessionId,
        learnerId,
        accountId: access.enrollment.accountId,
        revision: 0,
        writerEpoch: 0,
        writerId: learnerId,
        writerDeviceId: null,
        leaseExpiresAt: null,
        project: this.seed(block, id),
        assistance: null,
        updatedAt: this.clock().toISOString(),
        projectKey,
        lessonIds: [lessonId],
      })
    }
    const anchor = record.sessionId
    // Opened in a new lesson of the chain, or in an encounter of another cohort of the course.
    const anchored = aggregate.sessions.some((session) => session.id === anchor)
    if (!record.lessonIds.includes(lessonId) || !anchored)
      record = await this.repository.linkLesson(record.id, { lessonId, sessionId })
    return { ...(await this.forSession(sessionId).get(actor, record.id)), studio: block.studio }
  }

  private async read(actor: LiveActor, workspace: LiveWorkspaceRecord) {
    try {
      await this.existingAccess(actor, workspace)
    } catch (error) {
      if (
        (error instanceof LiveAccessError || error instanceof LiveNotFoundError) &&
        (await this.readOnlyAllowed(actor, workspace))
      )
        return { ...view(workspace), readOnly: true } satisfies LiveWorkspaceView
      throw error
    }
    if (assistanceRequestExpired(workspace.assistance, this.clock()))
      return this.transaction(actor, workspace.id, async ({ workspace }) => view(workspace))
    return view(workspace)
  }

  async get(actor: LiveActor, id: string): Promise<LiveWorkspaceView> {
    const workspace = await this.repository.find(id)
    if (!workspace) throw new LiveNotFoundError()
    return this.read(actor, workspace)
  }

  async poll(
    actor: LiveActor,
    id: string,
    knownRevision: number,
  ): Promise<Omit<LiveWorkspaceView, 'project'> & { project?: LiveWorkspaceView['project'] }> {
    const workspace = await this.repository.find(id)
    if (!workspace) throw new LiveNotFoundError()
    const now = this.clock()
    const key = [actor.id, actor.accountId, actor.staff, id, this.contextSessionId ?? ''].join('|')
    const memo = this.pollMemo.get(key)
    if (
      memo &&
      memo.until > now.getTime() &&
      workspace.revision === knownRevision &&
      !assistanceRequestExpired(workspace.assistance, now)
    ) {
      const { project: _project, ...metadata } = view(workspace)
      return {
        ...metadata,
        ...(memo.contextSessionId ? { contextSessionId: memo.contextSessionId } : {}),
        ...(memo.readOnly ? { readOnly: true } : {}),
      }
    }
    this.pollMemo.delete(key)
    const current = await this.read(actor, workspace)
    if (this.pollMemo.size >= POLL_MEMO_LIMIT)
      for (const [entry, value] of this.pollMemo)
        if (value.until <= now.getTime()) this.pollMemo.delete(entry)
    if (this.pollMemo.size >= POLL_MEMO_LIMIT) this.pollMemo.clear()
    this.pollMemo.set(key, {
      until: now.getTime() + POLL_AUTHORIZATION_MS,
      readOnly: current.readOnly === true,
      ...(current.contextSessionId ? { contextSessionId: current.contextSessionId } : {}),
    })
    if (current.revision !== knownRevision) return current
    const { project: _project, ...metadata } = current
    return structuredClone(metadata)
  }

  async listOwned(actor: LiveActor) {
    if (actor.staff) return { workspaces: [] }
    const records = await this.repository.listOwned(actor.accountId, actor.id)
    const workspaces = await Promise.all(
      records.map(async (workspace) => {
        let canEdit = true
        try {
          await this.existingAccess(actor, workspace)
        } catch (error) {
          if (!(error instanceof LiveAccessError) && !(error instanceof LiveNotFoundError))
            throw error
          canEdit = false
        }
        return {
          id: workspace.id,
          sessionId: workspace.sessionId,
          title: String(workspace.project.name ?? 'Meu projeto').slice(0, 200),
          revision: workspace.revision,
          updatedAt: workspace.updatedAt,
          canEdit,
          // The child can always view and export what she created.
          readOnly: !canEdit,
        }
      }),
    )
    return { workspaces }
  }

  async showcaseSnapshot(actor: LiveActor, id: string, expectedRevision: number) {
    const workspace = await this.repository.find(id)
    if (
      !workspace ||
      workspace.learnerId !== actor.id ||
      workspace.accountId !== actor.accountId ||
      actor.staff
    )
      throw new LiveNotFoundError()
    await this.existingAccess(actor, workspace)
    if (
      workspace.revision !== expectedRevision ||
      workspace.revision < 1 ||
      workspace.writerId !== actor.id ||
      workspace.assistance !== null
    )
      throw new LiveConflictError('Guarde o projeto e conclua a ajuda antes de publicar.')
    return {
      workspaceId: workspace.id,
      revision: workspace.revision,
      project: structuredClone(workspace.project),
      title: String(workspace.project.name ?? 'Meu projeto').slice(0, 200),
    }
  }

  /**
   * Every write: account lock + workspace row lock, then authorization on a cohort snapshot
   * read through the SAME transaction (cached for it). The cohort row is not locked: workspace
   * writes do not need to wait for room heartbeats, and the account lock orders them against
   * account erasure. The subscription check, an extra query, never runs while locks are held.
   */
  private async transaction<T>(
    actor: LiveActor,
    id: string,
    fn: (tx: LiveWorkspaceTransaction, access: TransactionAccess) => Promise<T>,
  ) {
    let continuation: boolean | undefined
    for (;;) {
      try {
        return await this.repository.transaction(id, async (tx) => {
          let cohort: Promise<Cohort> | undefined
          const access: TransactionAccess = (workspace, options = {}) =>
            this.existingAccess(actor, workspace, {
              ...options,
              cohort: () => {
                cohort ??= tx.loadCohort()
                return cohort
              },
              continuation: continuation ?? 'defer',
            })
          await access(tx.workspace)
          if (assistanceRequestExpired(tx.workspace.assistance, this.clock()))
            tx.workspace.assistance = null
          return fn(tx, access)
        })
      } catch (error) {
        if (!(error instanceof ContinuationCheckRequired) || continuation !== undefined) throw error
        continuation = (await this.continuation?.canContinue(actor.accountId)) ?? false
      }
    }
  }

  async claim(actor: LiveActor, id: string, deviceId: string, takeover: boolean) {
    return this.transaction(actor, id, async ({ workspace }, access) => {
      await access(workspace, { deviceId })
      if (actor.id !== workspace.learnerId)
        throw new LiveAccessError('A professora precisa de um aceite para editar.')
      const active =
        workspace.leaseExpiresAt && Date.parse(workspace.leaseExpiresAt) > this.clock().getTime()
      if (
        active &&
        (workspace.writerId !== actor.id ||
          (workspace.writerDeviceId && workspace.writerDeviceId !== deviceId)) &&
        !takeover
      )
        throw new LiveConflictError('O projeto já está sendo editado. Confirme Continuar aqui.')
      // Each opening fences callbacks from the preceding editor instance, even on
      // the same browser document. Heartbeats use renew and never change this epoch.
      workspace.writerEpoch++
      workspace.writerId = actor.id
      workspace.writerDeviceId = deviceId
      workspace.leaseExpiresAt = new Date(this.clock().getTime() + LEASE_MS).toISOString()
      workspace.assistance = null
      return view(workspace)
    })
  }

  async renew(actor: LiveActor, id: string, deviceId: string, writerEpoch: number) {
    return this.transaction(actor, id, async ({ workspace }, access) => {
      await this.assertWriter(actor, workspace, access, deviceId, writerEpoch)
      workspace.leaseExpiresAt = new Date(this.clock().getTime() + LEASE_MS).toISOString()
      return view(workspace)
    })
  }

  private async assertWriter(
    actor: LiveActor,
    workspace: LiveWorkspaceRecord,
    access: TransactionAccess,
    deviceId: string,
    writerEpoch: number,
  ) {
    await access(workspace, { deviceId, requireRoom: actor.id !== workspace.learnerId })
    if (
      workspace.writerId !== actor.id ||
      workspace.writerDeviceId !== deviceId ||
      workspace.writerEpoch !== writerEpoch ||
      !workspace.leaseExpiresAt ||
      Date.parse(workspace.leaseExpiresAt) <= this.clock().getTime()
    )
      throw new LiveConflictError(
        'A autoria mudou. Seu rascunho local precisa ser recuperado sem sobrescrever a revisão atual.',
      )
  }

  private async commitInTransaction(
    actor: LiveActor,
    tx: LiveWorkspaceTransaction,
    access: TransactionAccess,
    input: LiveWorkspaceCommitRequest,
  ) {
    const { workspace } = tx
    await this.assertWriter(actor, workspace, access, input.deviceId, input.writerEpoch)
    const project = validateSnapshot(input.project, workspace.id)
    const previous = await tx.findMutation(input.mutationId)
    if (previous) {
      if (
        previous.writerId !== actor.id ||
        JSON.stringify(previous.project) !== JSON.stringify(project)
      )
        throw new LiveConflictError('Identificador de gravação reutilizado com outro conteúdo.')
      return
    }
    if (workspace.revision !== input.expectedRevision)
      throw new LiveConflictError('Há uma revisão mais recente deste projeto.')
    workspace.revision++
    workspace.project = project
    workspace.updatedAt = this.clock().toISOString()
    workspace.leaseExpiresAt = new Date(this.clock().getTime() + LEASE_MS).toISOString()
    await tx.appendRevision({
      workspaceId: workspace.id,
      revision: workspace.revision,
      project,
      writerId: actor.id,
      mutationId: input.mutationId,
      createdAt: workspace.updatedAt,
    })
  }

  async commit(actor: LiveActor, id: string, input: LiveWorkspaceCommitRequest) {
    return this.transaction(actor, id, async (tx, access) => {
      await this.commitInTransaction(actor, tx, access, input)
      return view(tx.workspace)
    })
  }

  async requestAssistance(actor: LiveActor, id: string) {
    return this.transaction(actor, id, async ({ workspace }, access) => {
      const context = await access(workspace, { requireRoom: true })
      if (context?.role !== 'teacher') throw new LiveAccessError()
      if (workspace.assistance)
        throw new LiveConflictError('Já existe um pedido de ajuda para este projeto.')
      workspace.assistance = {
        id: randomUUID(),
        teacherId: actor.id,
        teacherName: actor.name,
        status: 'requested',
        requestedAt: this.clock().toISOString(),
        checkpointRevision: null,
        sessionId: context.session.id,
      }
      return view(workspace)
    })
  }

  async acceptAssistance(
    actor: LiveActor,
    id: string,
    requestId: string,
    input: LiveWorkspaceCommitRequest,
  ) {
    const initial = await this.repository.find(id)
    if (
      !initial ||
      initial.learnerId !== actor.id ||
      initial.assistance?.id !== requestId ||
      initial.assistance.status !== 'requested' ||
      assistanceRequestExpired(initial.assistance, this.clock())
    )
      throw new LiveAccessError()
    const current = await this.existingAccess(actor, initial, {
      deviceId: input.deviceId,
      requireRoom: true,
    })
    if (!current) throw new LiveAccessError()
    if (this.recording) await this.recording.confirmPaused(current.occurrence.id)
    return this.transaction(actor, id, async (tx, access) => {
      const { workspace } = tx
      const context = await access(workspace, { deviceId: input.deviceId, requireRoom: true })
      if (!context) throw new LiveAccessError()
      const request = workspace.assistance
      if (
        actor.id !== workspace.learnerId ||
        request?.id !== requestId ||
        request.status !== 'requested'
      )
        throw new LiveAccessError()
      // A failed recorder is NOT proof that capture has stopped. `confirmPaused` just proved
      // it (acknowledgement or expired capture lease); `unavailable`/`empty` are only shown
      // after such a proof or when nothing was captured. Without a recorder nothing records.
      const safeRecordingStates = this.recording
        ? ['not_started', 'paused', 'review', 'ready', 'unavailable', 'empty']
        : ['not_started', 'paused', 'ready']
      if (!safeRecordingStates.includes(context.occurrence.recording.state))
        throw new LiveConflictError(
          'Aguarde a confirmação de pausa da gravação para aceitar a ajuda.',
        )
      if (await tx.teacherHasActiveWorkspace(request.teacherId, this.clock()))
        throw new LiveConflictError('A professora está concluindo outra ajuda.')
      await this.commitInTransaction(actor, tx, access, input)
      workspace.assistance = {
        ...request,
        status: 'active',
        checkpointRevision: workspace.revision,
      }
      workspace.writerId = request.teacherId
      workspace.writerDeviceId = null
      workspace.writerEpoch++
      workspace.leaseExpiresAt = new Date(this.clock().getTime() + LEASE_MS).toISOString()
      return view(workspace)
    })
  }

  async attachTeacher(actor: LiveActor, id: string, deviceId: string) {
    return this.transaction(actor, id, async ({ workspace }, access) => {
      await access(workspace, { requireRoom: true })
      if (
        workspace.assistance?.status !== 'active' ||
        workspace.writerId !== actor.id ||
        workspace.assistance.teacherId !== actor.id ||
        !workspace.leaseExpiresAt ||
        Date.parse(workspace.leaseExpiresAt) <= this.clock().getTime()
      )
        throw new LiveAccessError('O aceite precisa estar ativo.')
      if (workspace.writerDeviceId && workspace.writerDeviceId !== deviceId)
        throw new LiveConflictError('A ajuda já está aberta em outro aparelho da professora.')
      workspace.writerDeviceId = deviceId
      return view(workspace)
    })
  }

  async revoke(actor: LiveActor, id: string, deviceId: string) {
    return this.transaction(actor, id, async ({ workspace }, access) => {
      if (actor.id !== workspace.learnerId) throw new LiveAccessError()
      await access(workspace, { deviceId })
      // A declined invitation never transferred authorship. Keep in-flight child saves valid.
      if (!workspace.assistance || workspace.assistance.status === 'requested') {
        workspace.assistance = null
        return view(workspace)
      }
      workspace.writerEpoch++
      workspace.writerId = workspace.learnerId
      workspace.writerDeviceId = deviceId
      workspace.leaseExpiresAt = new Date(this.clock().getTime() + LEASE_MS).toISOString()
      workspace.assistance = null
      return view(workspace)
    })
  }

  async cancelAssistance(actor: LiveActor, id: string, requestId: string) {
    return this.transaction(actor, id, async ({ workspace }) => {
      if (!actor.staff || workspace.assistance?.teacherId !== actor.id) throw new LiveAccessError()
      if (workspace.assistance.id !== requestId)
        throw new LiveConflictError('Este pedido de ajuda já mudou. Atualize antes de cancelar.')
      if (workspace.assistance.status !== 'requested') {
        if (
          workspace.assistance.status === 'active' &&
          workspace.leaseExpiresAt &&
          Date.parse(workspace.leaseExpiresAt) > this.clock().getTime()
        )
          throw new LiveConflictError('Guarde e devolva o projeto antes de encerrar a ajuda.')
        // Ending an abandoned lease (or an unacknowledged return) is not a write.
        // Keep the last committed revision and fence every callback from the old editor.
        workspace.writerEpoch++
        workspace.writerId = workspace.learnerId
        workspace.writerDeviceId = null
        workspace.leaseExpiresAt = null
      }
      workspace.assistance = null
      return view(workspace)
    })
  }

  async returnAuthorship(actor: LiveActor, id: string, input: LiveWorkspaceCommitRequest) {
    return this.transaction(actor, id, async (tx, access) => {
      if (
        tx.workspace.assistance?.teacherId !== actor.id ||
        tx.workspace.assistance.status !== 'active'
      )
        throw new LiveAccessError()
      await this.commitInTransaction(actor, tx, access, input)
      tx.workspace.assistance.status = 'returning'
      tx.workspace.writerEpoch++
      tx.workspace.writerDeviceId = null
      tx.workspace.leaseExpiresAt = null
      return view(tx.workspace)
    })
  }

  async acknowledgeReturn(actor: LiveActor, id: string, revision: number, deviceId: string) {
    return this.transaction(actor, id, async ({ workspace }) => {
      if (
        actor.id !== workspace.learnerId ||
        workspace.assistance?.status !== 'returning' ||
        workspace.revision !== revision
      )
        throw new LiveConflictError('Aplique a revisão final antes de voltar a editar.')
      workspace.writerId = actor.id
      workspace.writerDeviceId = deviceId
      workspace.writerEpoch++
      workspace.assistance = null
      workspace.leaseExpiresAt = new Date(this.clock().getTime() + LEASE_MS).toISOString()
      return view(workspace)
    })
  }

  async cursor(
    actor: LiveActor,
    id: string,
    input: {
      deviceId: string
      writerEpoch: number
      x: number
      y: number
      target?: LiveCursorTarget | null
      revision?: number
    },
  ) {
    return this.transaction(actor, id, async ({ workspace }, access) => {
      await this.assertWriter(actor, workspace, access, input.deviceId, input.writerEpoch)
      if (workspace.assistance?.status !== 'active' || workspace.assistance.teacherId !== actor.id)
        throw new LiveAccessError()
      if (![input.x, input.y].every((n) => Number.isFinite(n) && n >= 0 && n <= 1))
        throw new ValidationError('Posição de cursor inválida.')
      workspace.assistance.cursor = {
        x: input.x,
        y: input.y,
        ...(input.target ? { target: input.target } : {}),
        revision: input.revision,
        expiresAt: new Date(this.clock().getTime() + 2000).toISOString(),
      }
      return { ok: true }
    })
  }
}
