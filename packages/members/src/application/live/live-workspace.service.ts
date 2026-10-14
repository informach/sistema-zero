import { randomUUID } from 'node:crypto'
import { ValidationError } from '@sistemazero/core/errors'
import {
  assistanceRequestExpired,
  type LiveWorkspaceCommitRequest,
  type LiveWorkspaceView,
  lessonAccess,
  liveProjectOrigin,
  occurrenceIsOpen,
  supervisionStatus,
} from '@sistemazero/core/live'
import { createBlankProjectSnapshot as createEmptyProject } from '@sistemazero/studio/blank-project'
import {
  LiveAccessError,
  LiveConflictError,
  LiveNotFoundError,
} from '../../domain/live/live.errors'
import { validateLiveSnapshot as validateSnapshot } from '../../domain/live/workspace-snapshot'
import type { LiveActor } from '../../domain/ports/live-repository.port'
import type {
  LiveWorkspaceRecord,
  LiveWorkspaceRepository,
  LiveWorkspaceTransaction,
} from '../../domain/ports/live-workspace-repository.port'
import type { LiveContext, LiveService } from './live.service'

const LEASE_MS = 30_000
const view = ({ accountId: _accountId, ...workspace }: LiveWorkspaceRecord): LiveWorkspaceView =>
  structuredClone(workspace)

export class LiveWorkspaceService {
  constructor(
    private readonly repository: LiveWorkspaceRepository,
    private readonly live: Pick<LiveService, 'requireContext'>,
    private readonly clock: () => Date = () => new Date(),
    private readonly recording?: { confirmPaused(occurrenceId: string): Promise<void> },
    private readonly continuation?: { canContinue(accountId: string): Promise<boolean> },
    private readonly contextSessionId?: string,
  ) {}

  forSession(sessionId?: string) {
    return new LiveWorkspaceService(
      this.repository,
      this.live,
      this.clock,
      this.recording,
      this.continuation,
      sessionId,
    )
  }

  private async existingAccess(
    actor: LiveActor,
    workspace: LiveWorkspaceRecord,
    deviceId?: string,
    requireRoom = false,
  ) {
    let origin: LiveContext
    try {
      origin = await this.live.requireContext(actor, workspace.sessionId)
    } catch (error) {
      if (
        (error instanceof LiveNotFoundError || error instanceof LiveAccessError) &&
        !this.contextSessionId &&
        !requireRoom &&
        actor.id === workspace.learnerId &&
        actor.accountId === workspace.accountId &&
        (await this.continuation?.canContinue(actor.accountId))
      ) {
        workspace.contextSessionId = workspace.sessionId
        return undefined
      }
      throw error
    }
    const linked = origin.aggregate.sessions.filter(
      (session) => liveProjectOrigin(origin.aggregate.sessions, session).id === workspace.sessionId,
    )
    const selected =
      this.contextSessionId ?? (requireRoom ? workspace.assistance?.sessionId : undefined)
    if (selected && !linked.some((session) => session.id === selected)) throw new LiveAccessError()
    const candidates = selected
      ? linked.filter((session) => session.id === selected)
      : [...linked].sort((a, b) => {
          const open = (id: string) => {
            const occurrence = origin.aggregate.occurrences.find((item) => item.id === id)
            return occurrence && occurrenceIsOpen(occurrence, this.clock()) ? 1 : 0
          }
          return open(b.occurrenceId) - open(a.occurrenceId) || b.order - a.order
        })
    for (const session of candidates) {
      const enrollment = origin.aggregate.enrollments.find(
        (item) => item.learnerId === workspace.learnerId && item.status === 'active',
      )
      const grant = origin.aggregate.grants.find(
        (item) => item.enrollmentId === enrollment?.id && item.sessionId === session.id,
      )
      if (
        !grant ||
        lessonAccess(grant.startsAt, grant.endsAt, this.clock(), Boolean(grant.revokedAt)) !==
          'available'
      )
        continue
      const context = await this.access(
        actor,
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
    if (
      !selected &&
      !requireRoom &&
      actor.id === workspace.learnerId &&
      actor.accountId === workspace.accountId &&
      (await this.continuation?.canContinue(actor.accountId))
    ) {
      workspace.contextSessionId = workspace.sessionId
      return undefined
    }
    throw new LiveAccessError()
  }

  private async access(
    actor: LiveActor,
    sessionId: string,
    learnerId: string,
    deviceId?: string,
    requireRoom = false,
  ) {
    const context = await this.live.requireContext(actor, sessionId)
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

  async open(actor: LiveActor, sessionId: string, learnerId: string): Promise<LiveWorkspaceView> {
    const context = await this.access(actor, sessionId, learnerId)
    const origin = liveProjectOrigin(context.aggregate.sessions, context.session)
    const id = randomUUID()
    const template = origin.plan.starterProjectId
      ? await this.repository.findTemplate(origin.plan.starterProjectId)
      : null
    if (origin.plan.starterProjectId && !template) throw new LiveNotFoundError()
    const project = template
      ? { ...template, id }
      : (JSON.parse(JSON.stringify(createEmptyProject(id, context.session.plan.title))) as Record<
          string,
          unknown
        >)
    const record = await this.repository.ensure({
      id,
      sessionId: origin.id,
      learnerId,
      accountId: context.enrollment.accountId,
      revision: 0,
      writerEpoch: 0,
      writerId: learnerId,
      writerDeviceId: null,
      leaseExpiresAt: null,
      project: validateSnapshot(project, id),
      assistance: null,
      updatedAt: this.clock().toISOString(),
    })
    return this.forSession(sessionId).get(actor, record.id)
  }

  async demonstration(actor: LiveActor, sessionId: string) {
    const context = await this.live.requireContext(actor, sessionId)
    if (context.role !== 'teacher') throw new LiveAccessError()
    const template = context.session.plan.starterProjectId
      ? await this.repository.findTemplate(context.session.plan.starterProjectId)
      : null
    if (context.session.plan.starterProjectId && !template) throw new LiveNotFoundError()
    return {
      project: template
        ? { ...template, id: sessionId }
        : createEmptyProject(sessionId, context.session.plan.title),
    }
  }

  async get(actor: LiveActor, id: string): Promise<LiveWorkspaceView> {
    const workspace = await this.repository.find(id)
    if (!workspace) throw new LiveNotFoundError()
    await this.existingAccess(actor, workspace)
    if (assistanceRequestExpired(workspace.assistance, this.clock()))
      return this.transaction(actor, id, async ({ workspace }) => view(workspace))
    return view(workspace)
  }

  async poll(
    actor: LiveActor,
    id: string,
    knownRevision: number,
  ): Promise<Omit<LiveWorkspaceView, 'project'> & { project?: LiveWorkspaceView['project'] }> {
    const workspace = await this.get(actor, id)
    if (workspace.revision !== knownRevision) return workspace
    const { project: _project, ...metadata } = workspace
    return structuredClone(metadata)
  }

  async listOwned(actor: LiveActor) {
    if (actor.staff || actor.id === actor.accountId) return { workspaces: [] }
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

  private async transaction<T>(
    actor: LiveActor,
    id: string,
    fn: (tx: LiveWorkspaceTransaction) => Promise<T>,
  ) {
    return this.repository.transaction(id, async (tx) => {
      await this.existingAccess(actor, tx.workspace)
      if (assistanceRequestExpired(tx.workspace.assistance, this.clock()))
        tx.workspace.assistance = null
      return fn(tx)
    })
  }

  async claim(actor: LiveActor, id: string, deviceId: string, takeover: boolean) {
    return this.transaction(actor, id, async ({ workspace }) => {
      await this.existingAccess(actor, workspace, deviceId)
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
    return this.transaction(actor, id, async ({ workspace }) => {
      await this.assertWriter(actor, workspace, deviceId, writerEpoch)
      workspace.leaseExpiresAt = new Date(this.clock().getTime() + LEASE_MS).toISOString()
      return view(workspace)
    })
  }

  private async assertWriter(
    actor: LiveActor,
    workspace: LiveWorkspaceRecord,
    deviceId: string,
    writerEpoch: number,
  ) {
    await this.existingAccess(actor, workspace, deviceId, actor.id !== workspace.learnerId)
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
    input: LiveWorkspaceCommitRequest,
  ) {
    const { workspace } = tx
    await this.assertWriter(actor, workspace, input.deviceId, input.writerEpoch)
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
    return this.transaction(actor, id, async (tx) => {
      await this.commitInTransaction(actor, tx, input)
      return view(tx.workspace)
    })
  }

  async requestAssistance(actor: LiveActor, id: string) {
    return this.transaction(actor, id, async ({ workspace }) => {
      const context = await this.existingAccess(actor, workspace, undefined, true)
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
    const current = await this.existingAccess(actor, initial, input.deviceId, true)
    if (!current) throw new LiveAccessError()
    if (this.recording) await this.recording.confirmPaused(current.occurrence.id)
    return this.transaction(actor, id, async (tx) => {
      const { workspace } = tx
      const context = await this.existingAccess(actor, workspace, input.deviceId, true)
      if (!context) throw new LiveAccessError()
      const request = workspace.assistance
      if (
        actor.id !== workspace.learnerId ||
        request?.id !== requestId ||
        request.status !== 'requested'
      )
        throw new LiveAccessError()
      // A failed recorder is NOT proof that capture has stopped. The recording service
      // must first acknowledge paused or finalized capture; database status alone
      // must not authorize help against a finalized receiver generation.
      const safeRecordingStates = this.recording
        ? ['not_started', 'paused', 'review', 'ready']
        : ['not_started', 'paused', 'ready']
      if (!safeRecordingStates.includes(context.occurrence.recording.state))
        throw new LiveConflictError(
          'Aguarde a confirmação de pausa da gravação para aceitar a ajuda.',
        )
      if (await tx.teacherHasActiveWorkspace(request.teacherId, this.clock()))
        throw new LiveConflictError('A professora está concluindo outra ajuda.')
      await this.commitInTransaction(actor, tx, input)
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
    return this.transaction(actor, id, async ({ workspace }) => {
      await this.existingAccess(actor, workspace, undefined, true)
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
    return this.transaction(actor, id, async ({ workspace }) => {
      if (actor.id !== workspace.learnerId) throw new LiveAccessError()
      await this.existingAccess(actor, workspace, deviceId)
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
    return this.transaction(actor, id, async (tx) => {
      if (
        tx.workspace.assistance?.teacherId !== actor.id ||
        tx.workspace.assistance.status !== 'active'
      )
        throw new LiveAccessError()
      await this.commitInTransaction(actor, tx, input)
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

  async createTemplate(actor: LiveActor, raw: Record<string, unknown>) {
    if (!actor.staff) throw new LiveAccessError()
    const id = randomUUID()
    const project = validateSnapshot({ ...raw, id }, id)
    await this.repository.createTemplate({
      id,
      project,
      createdBy: actor.id,
      createdAt: this.clock().toISOString(),
    })
    return { id, title: project.name }
  }
  async listTemplates(actor: LiveActor) {
    if (!actor.staff) throw new LiveAccessError()
    return this.repository.listTemplates()
  }

  async cursor(
    actor: LiveActor,
    id: string,
    input: {
      deviceId: string
      writerEpoch: number
      x: number
      y: number
      target?: import('@sistemazero/core/live').LiveCursorTarget | null
      revision?: number
    },
  ) {
    return this.transaction(actor, id, async ({ workspace }) => {
      await this.assertWriter(actor, workspace, input.deviceId, input.writerEpoch)
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
