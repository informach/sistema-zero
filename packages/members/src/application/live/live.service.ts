import { createHash, randomUUID } from 'node:crypto'
import { ValidationError } from '@sistemazero/core/errors'
import { publicInteractiveBlock } from '@sistemazero/core/learning'
import {
  addCalendarDays,
  type LiveCatalogView,
  type LiveCohort,
  type LiveControl,
  type LiveCreateCohort,
  type LiveCreateProgram,
  type LiveEnrollment,
  type LiveJoinRequest,
  type LiveLessonPlan,
  type LiveLessonPlanView,
  type LiveOccurrence,
  type LiveParticipation,
  type LiveProgram,
  type LiveRecordingState,
  type LiveRoomView,
  type LiveSession,
  lessonAccess,
  occurrenceIsOpen,
  supervisionStatus,
} from '@sistemazero/core/live'
import { sanitizeLiveSteps } from '../../domain/live/learning-plan'
import {
  LiveAccessError,
  LiveConflictError,
  LiveNotFoundError,
  LiveUnavailableError,
} from '../../domain/live/live.errors'
import type {
  LiveAccessGrant,
  LiveActor,
  LiveCohortAggregate,
  LiveProfileOwnershipPort,
  LiveRepository,
} from '../../domain/ports/live-repository.port'

export interface LiveContext {
  aggregate: LiveCohortAggregate
  session: LiveSession
  occurrence: LiveOccurrence
  enrollment: LiveEnrollment | null
  grant: LiveAccessGrant | null
  role: 'teacher' | 'learner'
}
export interface LiveServiceOptions {
  /** Enabled only after actual media + supervision rehearsal, never inferred from credentials. */
  mediaReady?: boolean
  validatePlanAssets?: (plan: LiveLessonPlan) => Promise<void>
  /** Revoke SFU/resources and writer leases immediately after a durable permission change. */
  onPermissionsChanged?: (occurrenceId: string) => Promise<void>
}

const firstName = (name: string) => name.trim().split(/\s+/)[0]?.slice(0, 50) || 'Criador'
const summary = ({ plan, ...session }: LiveSession, occurrence?: LiveOccurrence) => ({
  ...session,
  title: plan.title,
  occurrenceStartsAt: occurrence?.startsAt ?? session.startsAt,
  occurrenceEndsAt: occurrence?.endsAt ?? session.endsAt,
})
const sessionSummaries = (aggregate: LiveCohortAggregate) =>
  aggregate.sessions.map((session) =>
    summary(
      session,
      aggregate.occurrences.find((occurrence) => occurrence.id === session.occurrenceId),
    ),
  )
const validDate = (value: string) => {
  const time = Date.parse(value)
  if (!Number.isFinite(time)) throw new ValidationError('Data inválida.')
  return time
}
const text = (value: string, max: number) => {
  const result = value.trim()
  if (!result || result.length > max) throw new ValidationError('Texto vazio ou muito longo.')
  return result
}

/** Commercial lesson grants and operational calls are independent state machines. */
export class LiveService {
  constructor(
    private readonly repository: LiveRepository,
    private readonly clock: () => Date,
    private readonly profiles: LiveProfileOwnershipPort,
    private readonly options: LiveServiceOptions = {},
    private readonly id: () => string = randomUUID,
  ) {}

  private requireStaff(actor: LiveActor) {
    if (!actor.staff) throw new LiveAccessError('Acesso da equipe necessário.')
  }
  private audit(
    aggregate: LiveCohortAggregate,
    actor: LiveActor,
    action: string,
    targetId: string,
  ) {
    aggregate.audit.push({
      id: this.id(),
      actorId: actor.id,
      action,
      targetId,
      createdAt: this.clock().toISOString(),
    })
  }

  private async validatePlan(plan: LiveLessonPlan) {
    text(plan.title, 160)
    text(plan.instructions, 24_000)
    plan.steps = sanitizeLiveSteps(plan.steps)
    if (Buffer.byteLength(JSON.stringify(plan), 'utf8') > 2_000_000)
      throw new ValidationError('O roteiro da aula pode ter até 2 MB.')
    if (
      plan.materials.length > 30 ||
      new Set(plan.materials.map((material) => material.id)).size !== plan.materials.length
    )
      throw new ValidationError('Materiais repetidos ou acima do limite.')
    for (const material of plan.materials) {
      text(material.title, 160)
      text(material.fileName, 200)
      if (
        !material.storageKey.startsWith('live/materials/') ||
        material.storageKey.includes('..') ||
        [...material.storageKey].some(
          (character) => character.charCodeAt(0) < 32 || character === '\\',
        )
      )
        throw new ValidationError('Material fora da área de arquivos da oficina.')
    }
    if (plan.starterProjectId || plan.materials.length) {
      if (!this.options.validatePlanAssets)
        throw new LiveUnavailableError(
          'A importação de projetos e materiais precisa estar configurada antes de publicar estes arquivos.',
        )
      await this.options.validatePlanAssets(plan)
    }
  }

  private validateProjectContinuity(lessons: LiveLessonPlan[]) {
    for (const [index, lesson] of lessons.entries()) {
      const source = lesson.continueProjectFrom
      if (
        source != null &&
        (!Number.isInteger(source) || source < 0 || source >= index || lesson.starterProjectId)
      )
        throw new ValidationError(
          'Continue o projeto de um encontro anterior, sem escolher outro modelo inicial.',
        )
    }
  }

  async createProgram(actor: LiveActor, input: LiveCreateProgram): Promise<LiveProgram> {
    this.requireStaff(actor)
    if (!input.lessons.length || input.lessons.length > 24)
      throw new ValidationError('A oficina precisa de 1 a 24 aulas.')
    for (const lesson of input.lessons) await this.validatePlan(lesson)
    this.validateProjectContinuity(input.lessons)
    const program: LiveProgram = {
      id: this.id(),
      title: text(input.title, 160),
      description: text(input.description, 4000),
      lessons: structuredClone(input.lessons),
      status: 'draft',
      revision: 1,
      createdAt: this.clock().toISOString(),
    }
    await this.repository.createProgram(program)
    return program
  }

  async updateProgram(
    actor: LiveActor,
    id: string,
    patch: Partial<LiveCreateProgram> & {
      expectedRevision: number
      status?: LiveProgram['status']
    },
  ) {
    this.requireStaff(actor)
    if (patch.lessons) {
      if (!patch.lessons.length || patch.lessons.length > 24)
        throw new ValidationError('A oficina precisa de 1 a 24 aulas.')
      for (const lesson of patch.lessons) await this.validatePlan(lesson)
      this.validateProjectContinuity(patch.lessons)
    }
    return this.repository.updateProgram(id, (program) => {
      if (program.revision !== patch.expectedRevision) throw new LiveConflictError()
      if (patch.title !== undefined) program.title = text(patch.title, 160)
      if (patch.description !== undefined) program.description = text(patch.description, 4000)
      if (patch.lessons) program.lessons = structuredClone(patch.lessons)
      if (patch.status) program.status = patch.status
      program.revision++
    })
  }

  async createCohort(actor: LiveActor, programId: string, input: LiveCreateCohort) {
    this.requireStaff(actor)
    const program = await this.repository.findProgram(programId)
    if (!program) throw new LiveNotFoundError()
    if (program.status === 'archived') throw new LiveConflictError('Esta oficina está arquivada.')
    if (!Number.isInteger(input.capacity) || input.capacity < 1 || input.capacity > 8)
      throw new ValidationError('A turma pode ter até oito crianças.')
    if (
      !input.teacherIds.length ||
      input.teacherIds.length > 4 ||
      new Set(input.teacherIds).size !== input.teacherIds.length
    )
      throw new ValidationError('Informe as professoras responsáveis sem repetir.')
    if (input.schedule.length !== program.lessons.length)
      throw new ValidationError('Agende uma data para cada aula da oficina.')
    const cohort: LiveCohort = {
      id: this.id(),
      programId,
      title: text(input.title, 160),
      timeZone: input.timeZone,
      capacity: input.capacity,
      accessDays: input.accessDays,
      teacherIds: [...input.teacherIds],
      status: 'draft',
      createdAt: this.clock().toISOString(),
    }
    const occurrences: LiveOccurrence[] = []
    const sessions = input.schedule.map((interval, order): LiveSession => {
      const start = validDate(interval.startsAt)
      const end = validDate(interval.endsAt)
      if (end - start < 60_000 || end - start > 4 * 3_600_000)
        throw new ValidationError('Cada encontro precisa durar entre um minuto e quatro horas.')
      const previous = input.schedule[order - 1]
      if (previous && start < validDate(previous.endsAt))
        throw new ValidationError('As aulas da turma não podem se sobrepor.')
      const sessionId = this.id()
      const occurrence = this.newOccurrence(
        sessionId,
        new Date(start).toISOString(),
        new Date(end).toISOString(),
      )
      occurrences.push(occurrence)
      let accessEndsAt: string
      try {
        accessEndsAt = addCalendarDays(interval.startsAt, input.accessDays, input.timeZone)
      } catch {
        throw new ValidationError('Confira o fuso, a duração do acesso e as datas da turma.')
      }
      const plan = program.lessons[order]
      if (!plan) throw new ValidationError('Aula não encontrada no roteiro.')
      return {
        id: sessionId,
        cohortId: cohort.id,
        order,
        plan: structuredClone(plan),
        startsAt: occurrence.startsAt,
        endsAt: occurrence.endsAt,
        accessEndsAt,
        occurrenceId: occurrence.id,
      }
    })
    const aggregate: LiveCohortAggregate = {
      cohort,
      sessions,
      occurrences,
      enrollments: [],
      grants: [],
      audit: [],
    }
    this.audit(aggregate, actor, 'cohort.created', cohort.id)
    await this.repository.createCohort(aggregate)
    return { cohort, sessions }
  }

  private newOccurrence(sessionId: string, startsAt: string, endsAt: string): LiveOccurrence {
    return {
      id: this.id(),
      sessionId,
      startsAt,
      endsAt,
      hardEndsAt: endsAt,
      state: 'scheduled',
      version: 1,
      speakingMode: 'turns',
      chatEnabled: true,
      teachers: {},
      participants: [],
      messages: [],
      recording: { state: 'not_started', published: false, version: 0, storageKey: null },
    }
  }

  async updateCohort(actor: LiveActor, id: string, status: LiveCohort['status']) {
    this.requireStaff(actor)
    return this.repository.transaction(id, (aggregate) => {
      if (aggregate.cohort.status === 'archived' && status !== 'archived')
        throw new LiveConflictError('Crie uma nova turma para preservar este histórico.')
      aggregate.cohort.status = status
      this.audit(aggregate, actor, `cohort.${status}`, id)
      return aggregate.cohort
    })
  }

  async enroll(
    actor: LiveActor,
    cohortId: string,
    input: { accountId: string; learnerId: string | null; learnerName: string },
  ) {
    this.requireStaff(actor)
    // Cross-service lookup outside the database lock; no user-supplied name becomes identity.
    const identity = await this.profiles.assertOwnership(input.accountId, input.learnerId)
    return this.repository.transaction(
      cohortId,
      (aggregate) => {
        if (aggregate.cohort.status !== 'open')
          throw new LiveConflictError('Esta turma não está aberta para inscrições.')
        const active = aggregate.enrollments.filter((enrollment) => enrollment.status === 'active')
        if (
          input.learnerId &&
          active.some((enrollment) => enrollment.learnerId === input.learnerId)
        )
          throw new LiveConflictError('Esta criança já tem uma vaga nesta turma.')
        if (active.length >= aggregate.cohort.capacity)
          throw new LiveConflictError('Esta turma já está completa.')
        if (
          aggregate.sessions.every(
            (session) => validDate(session.accessEndsAt) <= this.clock().getTime(),
          )
        )
          throw new LiveConflictError('O período desta turma já terminou.')
        const enrollment: LiveEnrollment = {
          id: this.id(),
          cohortId,
          accountId: input.accountId,
          learnerId: input.learnerId,
          learnerName: input.learnerId ? identity.name : text(input.learnerName, 100),
          status: 'active',
          source: 'manual',
          createdAt: this.clock().toISOString(),
        }
        aggregate.enrollments.push(enrollment)
        for (const session of aggregate.sessions)
          aggregate.grants.push({
            id: this.id(),
            enrollmentId: enrollment.id,
            sessionId: session.id,
            startsAt: session.startsAt,
            endsAt: session.accessEndsAt,
            revokedAt: null,
          })
        this.audit(aggregate, actor, 'enrollment.created', enrollment.id)
        return enrollment
      },
      input.accountId,
    )
  }

  async assignLearner(actor: LiveActor, enrollmentId: string, learnerId: string) {
    const found = await this.repository.findByEnrollment(enrollmentId)
    const current = found?.enrollments.find((enrollment) => enrollment.id === enrollmentId)
    if (
      !found ||
      !current ||
      (!actor.staff && (actor.id !== actor.accountId || current.accountId !== actor.accountId))
    )
      throw new LiveNotFoundError()
    const identity = await this.profiles.assertOwnership(current.accountId, learnerId)
    return this.repository.transaction(
      found.cohort.id,
      (aggregate) => {
        const enrollment = aggregate.enrollments.find((item) => item.id === enrollmentId)
        if (enrollment?.status !== 'active') throw new LiveNotFoundError()
        if (enrollment.learnerId && enrollment.learnerId !== learnerId)
          throw new LiveConflictError('Esta vaga já está vinculada a outra criança.')
        if (
          aggregate.enrollments.some(
            (item) =>
              item.id !== enrollmentId && item.learnerId === learnerId && item.status === 'active',
          )
        )
          throw new LiveConflictError('Esta criança já tem uma vaga nesta turma.')
        enrollment.learnerId = learnerId
        enrollment.learnerName = identity.name
        this.audit(aggregate, actor, 'enrollment.assigned', enrollment.id)
        return enrollment
      },
      current.accountId,
    )
  }

  async revoke(actor: LiveActor, enrollmentId: string) {
    this.requireStaff(actor)
    const found = await this.repository.findByEnrollment(enrollmentId)
    if (!found) throw new LiveNotFoundError()
    const enrollment = await this.repository.transaction(found.cohort.id, (aggregate) => {
      const item = aggregate.enrollments.find((entry) => entry.id === enrollmentId)
      if (!item) throw new LiveNotFoundError()
      item.status = 'revoked'
      for (const grant of aggregate.grants.filter((grant) => grant.enrollmentId === item.id))
        grant.revokedAt ??= this.clock().toISOString()
      for (const occurrence of aggregate.occurrences) {
        const participant = occurrence.participants.find(
          (participant) => participant.learnerId === item.learnerId,
        )
        if (participant) {
          participant.admission = 'removed'
          participant.turnGranted = false
          participant.muteEpoch++
          occurrence.version++
        }
      }
      this.audit(aggregate, actor, 'enrollment.revoked', item.id)
      return item
    })
    for (const occurrence of found.occurrences)
      await this.options.onPermissionsChanged?.(occurrence.id)
    return enrollment
  }

  async enrollments(actor: LiveActor, cohortId: string) {
    this.requireStaff(actor)
    const aggregate = await this.repository.findCohort(cohortId)
    if (!aggregate) throw new LiveNotFoundError()
    return { enrollments: aggregate.enrollments }
  }

  async catalog(
    actor: LiveActor,
    mode: 'learner' | 'parents' | 'admin' = 'learner',
    page: { cursor?: string; limit?: number } = {},
  ) {
    if (mode === 'admin') this.requireStaff(actor)
    if (mode === 'parents' && actor.id !== actor.accountId)
      throw new LiveAccessError('Entre com a conta do responsável.')
    const limit = page.limit ?? 20
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 50 ||
      (page.cursor && !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(page.cursor))
    )
      throw new ValidationError('Página de oficinas inválida.')
    const [allPrograms, rows] = await Promise.all([
      this.repository.listPrograms(),
      this.repository.listCohorts({ actor, mode, cursor: page.cursor, limit: limit + 1 }),
    ])
    const all = rows.slice(0, limit)
    const nextCursor = rows.length > limit ? all.at(-1)!.cohort.id : null
    if (mode === 'admin')
      return {
        nextCursor,
        programs: allPrograms,
        cohorts: all.map((item) => item.cohort),
        sessions: all.flatMap(sessionSummaries),
        enrollments: all.flatMap((item) => item.enrollments),
      }
    const own = (enrollment: LiveEnrollment) =>
      enrollment.accountId === actor.accountId &&
      (mode === 'parents' || enrollment.learnerId === actor.id)
    const visible = all.filter(
      (item) =>
        (item.cohort.status === 'open' &&
          allPrograms.some(
            (program) => program.id === item.cohort.programId && program.status === 'published',
          )) ||
        item.enrollments.some(own) ||
        (actor.staff && item.cohort.teacherIds.includes(actor.id)),
    )
    const programs = allPrograms
      .filter(
        (program) =>
          program.status === 'published' ||
          visible.some((item) => item.cohort.programId === program.id),
      )
      .map(({ lessons, ...program }) => ({ ...program, lessonCount: lessons.length }))
    return {
      nextCursor,
      programs,
      cohorts: visible.map((item) => item.cohort),
      // Discovery can include public offers; the personal agenda requires a seat
      // or an assigned teacher. Expired grants remain visible as lesson history.
      sessions: visible
        .filter(
          (item) =>
            (actor.staff && item.cohort.teacherIds.includes(actor.id)) ||
            (item.cohort.status !== 'draft' &&
              item.enrollments.some(
                (enrollment) => own(enrollment) && enrollment.status === 'active',
              )),
        )
        .flatMap(sessionSummaries),
      enrollments: visible.flatMap((item) => item.enrollments.filter(own)),
    } satisfies LiveCatalogView
  }

  private context(
    actor: LiveActor,
    aggregate: LiveCohortAggregate,
    sessionId: string,
  ): LiveContext {
    const session = aggregate.sessions.find((item) => item.id === sessionId)
    const occurrence = aggregate.occurrences.find((item) => item.id === session?.occurrenceId)
    if (!session || !occurrence) throw new LiveNotFoundError()
    if (actor.staff && aggregate.cohort.teacherIds.includes(actor.id))
      return { aggregate, session, occurrence, enrollment: null, grant: null, role: 'teacher' }
    const enrollment = aggregate.enrollments.find(
      (item) =>
        item.accountId === actor.accountId &&
        item.learnerId === actor.id &&
        item.status === 'active',
    )
    const grant = aggregate.grants.find(
      (item) => item.enrollmentId === enrollment?.id && item.sessionId === sessionId,
    )
    if (!enrollment || !grant || aggregate.cohort.status === 'draft') throw new LiveNotFoundError()
    return { aggregate, session, occurrence, enrollment, grant, role: 'learner' }
  }

  async requireContext(actor: LiveActor, sessionId: string): Promise<LiveContext> {
    const aggregate = await this.repository.findBySession(sessionId)
    if (!aggregate) throw new LiveNotFoundError()
    return this.context(actor, aggregate, sessionId)
  }

  assertAvailable(context: LiveContext) {
    if (context.role === 'teacher') return
    const grant = context.grant
    if (
      !grant ||
      lessonAccess(grant.startsAt, grant.endsAt, this.clock(), grant.revokedAt !== null) !==
        'available'
    )
      throw new LiveAccessError()
  }

  private view(actor: LiveActor, context: LiveContext): LiveRoomView {
    const now = this.clock()
    const { session, aggregate, role, grant } = context
    const status =
      role === 'teacher'
        ? 'available'
        : lessonAccess(
            grant?.startsAt ?? session.startsAt,
            grant?.endsAt ?? session.accessEndsAt,
            now,
            grant?.revokedAt !== null,
          )
    const canOpen = status === 'available'
    const occurrence = structuredClone(context.occurrence)
    const supervision = supervisionStatus(occurrence.teachers, now)
    const participant = occurrence.participants.find((item) => item.learnerId === actor.id)
    const admitted = role === 'teacher' || participant?.admission === 'admitted'
    const recordingPublished = aggregate.occurrences.some(
      (item) =>
        item.sessionId === session.id &&
        item.recording.published &&
        item.recording.state === 'ready' &&
        item.recording.storageKey !== null,
    )
    occurrence.recording.storageKey = null
    if (
      occurrence.guidance &&
      (validDate(occurrence.guidance.expiresAt) <= now.getTime() ||
        (role === 'learner' &&
          occurrence.guidance.learnerId !== null &&
          occurrence.guidance.learnerId !== actor.id))
    )
      occurrence.guidance = null
    if (role === 'learner') {
      occurrence.teachers = {}
      occurrence.participants = participant ? [participant] : []
      occurrence.messages =
        admitted && canOpen ? occurrence.messages.filter((message) => !message.removed) : []
    }
    const plan: LiveLessonPlanView | null = canOpen
      ? {
          ...structuredClone(session.plan),
          steps: session.plan.steps?.map((step) => ({
            ...structuredClone(step),
            blocks: step.blocks.map((block) => ({
              ...block,
              content: publicInteractiveBlock(block.content),
            })),
          })),
        }
      : null
    // Identifiers for materials remain; download resolution performs a new access check.
    if (plan) plan.materials = plan.materials.map((material) => ({ ...material, storageKey: '' }))
    return {
      session: summary(session, occurrence),
      cohort: aggregate.cohort,
      plan,
      planRevision: createHash('sha256').update(JSON.stringify(session.plan)).digest('hex'),
      access: {
        startsAt: grant?.startsAt ?? session.startsAt,
        endsAt: grant?.endsAt ?? session.accessEndsAt,
        status,
        canOpen,
        canJoinMedia:
          canOpen && admitted && occurrenceIsOpen(occurrence, now) && supervision === 'present',
        canWatchRecording: canOpen && recordingPublished,
      },
      occurrence: canOpen ? occurrence : null,
      recordings: canOpen
        ? aggregate.occurrences
            .filter(
              (item) =>
                item.sessionId === session.id &&
                item.recording.storageKey &&
                ['review', 'ready'].includes(item.recording.state) &&
                (role === 'teacher' || item.recording.published),
            )
            .sort((a, b) => validDate(b.startsAt) - validDate(a.startsAt))
            .map((item) => {
              const { storageKey: _key, ...recording } = item.recording
              return { occurrenceId: item.id, startsAt: item.startsAt, recording }
            })
        : [],
      role,
      actorId: actor.id,
      supervision,
      serverTime: now.toISOString(),
      mediaReady: this.options.mediaReady === true,
    }
  }

  async room(actor: LiveActor, sessionId: string, knownPlanRevision?: string) {
    const before = await this.requireContext(actor, sessionId)
    if (
      ['live', 'lobby'].includes(before.occurrence.state) &&
      validDate(before.occurrence.hardEndsAt) <= this.clock().getTime()
    )
      await this.endExpiredOccurrence(before.occurrence.id)
    const room = this.view(actor, await this.requireContext(actor, sessionId))
    if (room.access.canOpen && knownPlanRevision === room.planRevision) delete room.plan
    return room
  }

  async reconcileDeadlines(): Promise<void> {
    const ids = await this.repository.overdueOccurrences(this.clock())
    for (const id of ids) await this.endExpiredOccurrence(id)
  }

  private async endExpiredOccurrence(id: string): Promise<void> {
    const found = await this.repository.findByOccurrence(id)
    if (!found) return
    const changed = await this.repository.transaction(found.cohort.id, (aggregate) => {
      const occurrence = aggregate.occurrences.find((item) => item.id === id)
      if (
        !occurrence ||
        !['live', 'lobby'].includes(occurrence.state) ||
        validDate(occurrence.hardEndsAt) > this.clock().getTime()
      )
        return false
      occurrence.state = 'ended'
      occurrence.version++
      occurrence.guidance = null
      for (const participant of occurrence.participants) {
        participant.turnGranted = false
        participant.muteEpoch++
      }
      aggregate.audit.push({
        id: this.id(),
        actorId: aggregate.cohort.teacherIds[0]!,
        action: 'room.deadline-ended',
        targetId: id,
        createdAt: this.clock().toISOString(),
      })
      return true
    })
    if (changed) await this.options.onPermissionsChanged?.(id)
  }

  async withAvailableSession<T>(
    actor: LiveActor,
    sessionId: string,
    action: (context: LiveContext) => Promise<T>,
  ) {
    return this.mutateRoom(actor, sessionId, async (context) => {
      this.assertAvailable(context)
      return action(context)
    })
  }

  private async mutateRoom<T>(
    actor: LiveActor,
    sessionId: string,
    mutate: (context: LiveContext) => T | Promise<T>,
  ) {
    const initial = await this.requireContext(actor, sessionId)
    return this.repository.transaction(
      initial.aggregate.cohort.id,
      async (aggregate) => mutate(this.context(actor, aggregate, sessionId)),
      actor.accountId,
    )
  }

  private operational(context: LiveContext, allowLobby = false) {
    this.assertAvailable(context)
    const { occurrence } = context
    if (
      ['ended', 'cancelled'].includes(occurrence.state) ||
      this.clock().getTime() >= validDate(occurrence.hardEndsAt)
    )
      throw new LiveConflictError('Este encontro já terminou.')
    if (allowLobby) {
      if (!['lobby', 'live'].includes(occurrence.state))
        throw new LiveConflictError('A professora ainda não abriu a sala.')
    } else if (!occurrenceIsOpen(occurrence, this.clock()))
      throw new LiveConflictError('A aula ainda não começou.')
  }

  private participation(
    actor: LiveActor,
    context: LiveContext,
    deviceId: string,
  ): LiveParticipation {
    const participant = context.occurrence.participants.find((item) => item.learnerId === actor.id)
    if (!participant || participant.deviceId !== deviceId || participant.admission === 'removed')
      throw new LiveConflictError(
        'A aula está aberta em outro dispositivo ou sua entrada precisa ser autorizada.',
      )
    return participant
  }

  async join(actor: LiveActor, sessionId: string, request: LiveJoinRequest) {
    const room = await this.mutateRoom(actor, sessionId, (context) => {
      this.operational(context, true)
      const { occurrence, role } = context
      if (role === 'teacher') occurrence.teachers[actor.id] = this.clock().toISOString()
      else {
        let participant = occurrence.participants.find((item) => item.learnerId === actor.id)
        if (participant?.admission === 'removed')
          throw new LiveAccessError('A professora precisa autorizar sua volta à sala.')
        if (participant && participant.deviceId !== request.deviceId && !request.takeover)
          throw new LiveConflictError('Use “Continuar aqui” para trocar de dispositivo.')
        if (participant && participant.deviceId !== request.deviceId) {
          participant.deviceId = request.deviceId
          participant.turnGranted = false
          participant.muteEpoch++
          this.audit(context.aggregate, actor, 'participation.takeover', occurrence.id)
        }
        if (!participant) {
          participant = {
            learnerId: actor.id,
            displayName: firstName(context.enrollment?.learnerName ?? actor.name),
            deviceId: request.deviceId,
            admission: 'waiting',
            joinedAt: this.clock().toISOString(),
            seenAt: this.clock().toISOString(),
            handAt: null,
            helpAt: null,
            microphoneLocked: false,
            cameraLocked: false,
            turnGranted: false,
            muteEpoch: 0,
          }
          occurrence.participants.push(participant)
        }
        participant.seenAt = this.clock().toISOString()
      }
      occurrence.version++
      return this.view(actor, context)
    })
    await this.options.onPermissionsChanged?.(room.occurrence?.id ?? '')
    return room
  }

  async heartbeat(
    actor: LiveActor,
    sessionId: string,
    deviceId: string,
    activity?: import('@sistemazero/core/live').LiveActivityReport,
  ) {
    return this.mutateRoom(actor, sessionId, (context) => {
      this.operational(context, true)
      if (context.role === 'teacher')
        context.occurrence.teachers[actor.id] = this.clock().toISOString()
      else {
        const participant = this.participation(actor, context, deviceId)
        participant.seenAt = this.clock().toISOString()
        if (activity && participant.admission === 'admitted') {
          if (
            activity.stepId &&
            !context.session.plan.steps?.some((step) => step.id === activity.stepId)
          )
            throw new ValidationError('Etapa inválida para este encontro.')
          if (!['not-open', 'saving', 'saved', 'offline'].includes(activity.saveState))
            throw new ValidationError('Estado de salvamento inválido.')
          participant.activity = {
            stepId: activity.stepId,
            saveState: activity.saveState,
            reportedAt: participant.seenAt,
          }
        }
      }
      return this.view(actor, context)
    })
  }

  async request(
    actor: LiveActor,
    sessionId: string,
    deviceId: string,
    kind: 'hand' | 'help',
    raised: boolean,
  ) {
    return this.mutateRoom(actor, sessionId, (context) => {
      this.operational(context)
      if (context.role !== 'learner') throw new LiveAccessError()
      if (supervisionStatus(context.occurrence.teachers, this.clock()) !== 'present')
        throw new LiveConflictError('Aguardando a professora reconectar.')
      const participant = this.participation(actor, context, deviceId)
      if (participant.admission !== 'admitted')
        throw new LiveAccessError('Aguarde a professora autorizar sua entrada.')
      const key = kind === 'hand' ? 'handAt' : 'helpAt'
      const requestedAt = raised ? (participant[key] ?? this.clock().toISOString()) : null
      if (participant[key] !== requestedAt) {
        participant[key] = requestedAt
        // Moderation is conditional on the snapshot that showed this request.
        // An old lower-hands command must not erase a newly raised hand.
        context.occurrence.version++
      }
      return this.view(actor, context)
    })
  }

  async chat(actor: LiveActor, sessionId: string, deviceId: string, raw: string) {
    const message = text(raw, 500)
    if (/(?:https?:\/\/|www\.|(?:^|\s)[a-z0-9-]+\.(?:com|net|org|br)(?:[\s/]|$))/i.test(message))
      throw new ValidationError('Use o espaço de materiais para compartilhar links e arquivos.')
    return this.mutateRoom(actor, sessionId, (context) => {
      this.operational(context)
      const { occurrence } = context
      if (supervisionStatus(occurrence.teachers, this.clock()) !== 'present')
        throw new LiveConflictError('Aguardando a professora reconectar.')
      if (context.role === 'learner') {
        const participant = this.participation(actor, context, deviceId)
        if (participant.admission !== 'admitted' || !occurrence.chatEnabled)
          throw new LiveAccessError('A conversa da turma está fechada agora.')
      }
      if (occurrence.messages.length >= 500)
        throw new LiveConflictError('A conversa atingiu o limite deste encontro.')
      if (
        occurrence.messages.filter(
          (item) =>
            item.authorId === actor.id &&
            validDate(item.createdAt) > this.clock().getTime() - 10_000,
        ).length >= 5
      )
        throw new LiveConflictError('Espere um pouquinho antes de enviar outra mensagem.')
      occurrence.messages.push({
        id: this.id(),
        authorId: actor.id,
        authorName: firstName(actor.name),
        role: context.role,
        text: message,
        createdAt: this.clock().toISOString(),
        removed: false,
        pinned: false,
      })
      return this.view(actor, context)
    })
  }

  async control(
    actor: LiveActor,
    sessionId: string,
    expectedVersion: number,
    command: LiveControl,
  ) {
    const room = await this.mutateRoom(actor, sessionId, (context) => {
      if (context.role !== 'teacher')
        throw new LiveAccessError('Somente a professora desta turma pode conduzir a sala.')
      const { occurrence } = context
      if (occurrence.version !== expectedVersion) throw new LiveConflictError()
      if (['ended', 'cancelled'].includes(occurrence.state)) {
        if (command.kind === 'end' && occurrence.state === 'ended') return this.view(actor, context)
        throw new LiveConflictError('Este encontro já terminou. Agende uma reposição.')
      }
      if (command.kind !== 'end' && this.clock().getTime() >= validDate(occurrence.hardEndsAt))
        throw new LiveConflictError('O horário deste encontro terminou.')
      switch (command.kind) {
        case 'suggest-step':
          if (
            command.stepId !== null &&
            !context.session.plan.steps?.some((step) => step.id === command.stepId)
          )
            throw new LiveNotFoundError()
          occurrence.suggestedStepId = command.stepId
          break
        case 'open-lobby':
          if (occurrence.state !== 'scheduled') throw new LiveConflictError()
          if (this.clock().getTime() < validDate(occurrence.startsAt) - 15 * 60_000)
            throw new LiveConflictError('A sala de espera abre quinze minutos antes do encontro.')
          occurrence.state = 'lobby'
          break
        case 'start':
          if (
            !['scheduled', 'lobby'].includes(occurrence.state) ||
            this.clock().getTime() < validDate(occurrence.startsAt)
          )
            throw new LiveConflictError('A aula só pode começar no horário agendado.')
          if (!this.options.mediaReady)
            throw new LiveUnavailableError(
              'A transmissão precisa concluir a verificação operacional antes de iniciar uma turma.',
            )
          occurrence.state = 'live'
          break
        case 'end':
          occurrence.state = 'ended'
          for (const participant of occurrence.participants) {
            participant.turnGranted = false
            participant.muteEpoch++
          }
          break
        case 'speaking-mode':
          occurrence.speakingMode = command.mode
          for (const participant of occurrence.participants) {
            participant.turnGranted = false
            participant.muteEpoch++
          }
          break
        case 'chat':
          occurrence.chatEnabled = command.enabled
          break
        case 'guide': {
          if (
            command.learnerId &&
            !occurrence.participants.some(
              (participant) =>
                participant.learnerId === command.learnerId && participant.admission === 'admitted',
            )
          )
            throw new LiveNotFoundError()
          occurrence.guidance = {
            id: this.id(),
            target: command.target,
            learnerId: command.learnerId,
            expiresAt: new Date(this.clock().getTime() + 8_000).toISOString(),
          }
          break
        }
        case 'remove-message':
        case 'pin-message': {
          const message = occurrence.messages.find((item) => item.id === command.messageId)
          if (!message) throw new LiveNotFoundError()
          if (command.kind === 'remove-message') {
            message.removed = true
            message.text = ''
            message.pinned = false
          } else if (!message.removed) message.pinned = !message.pinned
          break
        }
        default: {
          const participants =
            command.learnerId === null
              ? occurrence.participants
              : occurrence.participants.filter((item) => item.learnerId === command.learnerId)
          if (command.learnerId && participants.length === 0) throw new LiveNotFoundError()
          for (const participant of participants) {
            switch (command.kind) {
              case 'admit':
                participant.admission = 'admitted'
                break
              case 'remove':
                participant.admission = 'removed'
                participant.turnGranted = false
                participant.muteEpoch++
                break
              case 'grant-turn':
                if (participant.admission === 'admitted') participant.turnGranted = true
                break
              case 'revoke-turn':
                participant.turnGranted = false
                participant.muteEpoch++
                break
              case 'mute':
                participant.muteEpoch++
                break
              case 'lower-hands':
                participant.handAt = null
                break
              case 'lock-microphone':
                participant.microphoneLocked = true
                participant.turnGranted = false
                participant.muteEpoch++
                break
              case 'unlock-microphone':
                participant.microphoneLocked = false
                break
              case 'lock-camera':
                participant.cameraLocked = true
                break
              case 'unlock-camera':
                participant.cameraLocked = false
                break
            }
          }
        }
      }
      occurrence.teachers[actor.id] = this.clock().toISOString()
      occurrence.version++
      this.audit(context.aggregate, actor, `room.${command.kind}`, occurrence.id)
      return this.view(actor, context)
    })
    await this.options.onPermissionsChanged?.(room.occurrence?.id ?? '')
    return room
  }

  async authorizeMedia(actor: LiveActor, occurrenceId: string, deviceId: string) {
    const aggregate = await this.repository.findByOccurrence(occurrenceId)
    const found = aggregate?.occurrences.find((item) => item.id === occurrenceId)
    if (!aggregate || !found) throw new LiveNotFoundError()
    const context = this.context(actor, aggregate, found.sessionId)
    if (context.occurrence.id !== occurrenceId) throw new LiveAccessError()
    this.operational(context)
    if (
      !this.options.mediaReady ||
      supervisionStatus(context.occurrence.teachers, this.clock()) !== 'present'
    )
      throw new LiveUnavailableError('A transmissão está aguardando supervisão.')
    const participation =
      context.role === 'learner' ? this.participation(actor, context, deviceId) : null
    if (participation?.admission !== undefined && participation.admission !== 'admitted')
      throw new LiveAccessError('Aguarde sua entrada ser autorizada.')
    return {
      role: context.role,
      actorId: actor.id,
      accountId: actor.accountId,
      sessionId: found.sessionId,
      occurrenceId,
      roomVersion: context.occurrence.version,
      participation,
      occurrence: context.occurrence,
      cohort: aggregate.cohort,
    }
  }

  async material(actor: LiveActor, sessionId: string, materialId: string) {
    const context = await this.requireContext(actor, sessionId)
    this.assertAvailable(context)
    const material = context.session.plan.materials.find((item) => item.id === materialId)
    if (!material) throw new LiveNotFoundError()
    return {
      storageKey: material.storageKey,
      fileName: material.fileName,
      expiresAt: context.grant?.endsAt ?? context.session.accessEndsAt,
    }
  }

  async recording(actor: LiveActor, sessionId: string, occurrenceId?: string) {
    const context = await this.requireContext(actor, sessionId)
    this.assertAvailable(context)
    const occurrence = [...context.aggregate.occurrences]
      .filter(
        (item) =>
          item.sessionId === sessionId &&
          (!occurrenceId || item.id === occurrenceId) &&
          item.recording.storageKey &&
          (item.recording.published || context.role === 'teacher'),
      )
      .sort((left, right) => validDate(right.startsAt) - validDate(left.startsAt))[0]
    const recording = occurrence?.recording
    if (
      !occurrence ||
      !recording?.storageKey ||
      !['review', 'ready'].includes(recording.state) ||
      (!recording.published && context.role !== 'teacher')
    )
      throw new LiveNotFoundError()
    return {
      storageKey: recording.storageKey,
      occurrenceId: occurrence.id,
      version: recording.version,
      expiresAt: context.grant?.endsAt ?? context.session.accessEndsAt,
    }
  }

  /** Internal-only: the coordinator must verify its durable job generation before calling. */
  async setRecordingState(
    occurrenceId: string,
    update: { state: Exclude<LiveRecordingState, 'ready'>; storageKey?: string | null },
  ) {
    const found = await this.repository.findByOccurrence(occurrenceId)
    if (!found) throw new LiveNotFoundError()
    return this.repository.transaction(found.cohort.id, (aggregate) => {
      const occurrence = aggregate.occurrences.find((item) => item.id === occurrenceId)
      if (!occurrence) throw new LiveNotFoundError()
      const recording = occurrence.recording
      // Published footage is immutable. New captures require a new occurrence/job.
      if (recording.published || recording.state === 'ready')
        throw new LiveConflictError('Esta gravação já foi revisada. Preserve a versão publicada.')
      if (
        update.storageKey !== undefined &&
        update.storageKey !== null &&
        (!update.storageKey.startsWith(`live/recordings/${occurrenceId}/`) ||
          update.storageKey.includes('..'))
      )
        throw new ValidationError('Gravação fora da área privada do encontro.')
      if (update.state === 'review' && !(update.storageKey ?? recording.storageKey))
        throw new LiveConflictError('A gravação precisa de um arquivo confirmado para revisão.')
      recording.state = update.state
      if (update.storageKey !== undefined) recording.storageKey = update.storageKey
      recording.published = false
      recording.version =
        Math.max(
          ...aggregate.occurrences
            .filter((item) => item.sessionId === occurrence.sessionId)
            .map((item) => item.recording.version),
        ) + 1
      return { ...recording }
    })
  }

  async publishRecording(
    actor: LiveActor,
    sessionId: string,
    expectedVersion: number,
    published: boolean,
    occurrenceId?: string,
  ) {
    return this.mutateRoom(actor, sessionId, (context) => {
      if (context.role !== 'teacher') throw new LiveAccessError()
      const occurrence = occurrenceId
        ? context.aggregate.occurrences.find(
            (item) => item.id === occurrenceId && item.sessionId === sessionId,
          )
        : context.occurrence
      if (!occurrence) throw new LiveNotFoundError()
      const recording = occurrence.recording
      if (recording.version !== expectedVersion) throw new LiveConflictError()
      if (published && (!['review', 'ready'].includes(recording.state) || !recording.storageKey))
        throw new LiveConflictError('A gravação ainda não está pronta para revisão e publicação.')
      recording.published = published
      if (published) recording.state = 'ready'
      recording.version =
        Math.max(
          ...context.aggregate.occurrences
            .filter((item) => item.sessionId === sessionId)
            .map((item) => item.recording.version),
        ) + 1
      this.audit(
        context.aggregate,
        actor,
        published ? 'recording.published' : 'recording.withdrawn',
        occurrence.id,
      )
      return this.view(actor, context)
    })
  }

  async replayPosition(actor: LiveActor, sessionId: string, version: number) {
    const context = await this.requireContext(actor, sessionId)
    this.assertReplayVersion(context, version)
    return {
      positionSeconds: await this.repository.readReplayPosition(sessionId, actor.id, version),
    }
  }

  private assertReplayVersion(context: LiveContext, version: number) {
    this.assertAvailable(context)
    if (
      context.role !== 'learner' ||
      !context.aggregate.occurrences.some(
        (item) =>
          item.sessionId === context.session.id &&
          item.recording.version === version &&
          item.recording.published &&
          item.recording.state === 'ready',
      )
    )
      throw new LiveNotFoundError()
  }

  async saveReplayPosition(
    actor: LiveActor,
    sessionId: string,
    version: number,
    positionSeconds: number,
  ) {
    if (!Number.isFinite(positionSeconds) || positionSeconds < 0 || positionSeconds > 14_400)
      throw new ValidationError('Posição da gravação inválida.')
    return this.mutateRoom(actor, sessionId, (context) => {
      this.assertReplayVersion(context, version)
      const position = Math.floor(positionSeconds)
      context.aggregate.replayPositions = [
        {
          sessionId,
          learnerId: actor.id,
          accountId: actor.accountId,
          version,
          positionSeconds: position,
        },
      ]
      return { positionSeconds: position }
    })
  }

  /** A replacement is a new occurrence; it never rewrites the original recording/history. */
  async replaceOccurrence(
    actor: LiveActor,
    sessionId: string,
    input: {
      expectedVersion: number
      startsAt: string
      endsAt: string
      extendAccessUntil?: string
    },
  ) {
    return this.mutateRoom(actor, sessionId, (context) => {
      if (context.role !== 'teacher') throw new LiveAccessError()
      if (
        context.occurrence.version !== input.expectedVersion ||
        !['ended', 'cancelled'].includes(context.occurrence.state)
      )
        throw new LiveConflictError('Encerre a chamada atual antes de marcar uma reposição.')
      const starts = validDate(input.startsAt),
        ends = validDate(input.endsAt)
      if (starts < this.clock().getTime() || ends <= starts || ends - starts > 4 * 3_600_000)
        throw new ValidationError('Confira as datas da reposição.')
      const relevant = context.aggregate.grants.filter(
        (grant) => grant.sessionId === sessionId && !grant.revokedAt,
      )
      if (input.extendAccessUntil) {
        const until = validDate(input.extendAccessUntil)
        if (until <= ends || until > this.clock().getTime() + 366 * 86_400_000)
          throw new ValidationError('Confira o novo prazo de acesso.')
        for (const grant of relevant)
          if (until > validDate(grant.endsAt)) grant.endsAt = new Date(until).toISOString()
        if (until > validDate(context.session.accessEndsAt))
          context.session.accessEndsAt = new Date(until).toISOString()
        this.audit(context.aggregate, actor, 'grant.extended', sessionId)
      }
      if (
        relevant.some(
          (grant) => starts < validDate(grant.startsAt) || ends >= validDate(grant.endsAt),
        ) ||
        ends >= validDate(context.session.accessEndsAt)
      )
        throw new LiveConflictError(
          'Amplie explicitamente o acesso antes de marcar a reposição fora do prazo.',
        )
      const occurrence = this.newOccurrence(
        sessionId,
        new Date(starts).toISOString(),
        new Date(ends).toISOString(),
      )
      context.aggregate.occurrences.push(occurrence)
      context.session.occurrenceId = occurrence.id
      this.audit(context.aggregate, actor, 'occurrence.replacement', occurrence.id)
      return occurrence
    })
  }
}
