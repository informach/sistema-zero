import { randomUUID } from 'node:crypto'
import { ValidationError } from '@sistemazero/core/errors'
import {
  addCalendarDays,
  type LiveActivityReport,
  type LiveCatalogView,
  type LiveCohort,
  type LiveControl,
  type LiveCourseSummary,
  type LiveCreateCohort,
  type LiveEnrollment,
  type LiveJoinRequest,
  type LiveOccurrence,
  type LiveParticipation,
  type LiveRecordingSourceView,
  type LiveRecordingState,
  type LiveRecordingSummary,
  type LiveRecordingVimeo,
  type LiveRoomView,
  type LiveSession,
  type LiveUpdateCohort,
  lessonAccess,
  occurrenceIsOpen,
  supervisionStatus,
} from '@sistemazero/core/live'
import {
  LiveAccessError,
  LiveConflictError,
  LiveNotFoundError,
  LiveUnavailableError,
} from '../../domain/live/live.errors'
import { LIVE_SECTIONS_MAX, liveVimeoRecording } from '../../domain/live/live-course-rules'
import {
  type LiveRecordingSegmentTime,
  recordingChapters,
} from '../../domain/live/recording-chapters'
import type {
  LiveCoursePort,
  LiveCourseRecord,
  LiveStudioBlockRecord,
} from '../../domain/ports/live-course.port'
import type {
  LiveAccessGrant,
  LiveActor,
  LiveCohortAggregate,
  LiveProfileOwnershipPort,
  LiveRepository,
  LiveSessionRef,
} from '../../domain/ports/live-repository.port'
import type { LiveRewardsPort } from '../../domain/ports/live-rewards.port'

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
  /** Revoke SFU/resources and writer leases immediately after a durable permission change. */
  onPermissionsChanged?: (occurrenceId: string) => Promise<void>
  /** The live courses (cohorts, catalog, the published lesson parts). Without it: no cohorts. */
  courses?: LiveCoursePort
  /**
   * Achievements and missions when a child is received in a `live` encounter. Best effort,
   * outside the transaction: a failure never undoes nor fails the teacher's command.
   */
  liveRewards?: LiveRewardsPort
  onRewardsError?: (error: unknown) => void
  /** The segment timeline the recorder confirmed (chapters are computed on publication). */
  recordingTimeline?: (occurrenceId: string) => Promise<LiveRecordingSegmentTime[] | null>
}
/** Media authorization computed from one cohort snapshot (one load, many publishers). */
export interface LiveMediaAuthorization {
  role: 'teacher' | 'learner'
  actorId: string
  accountId: string
  sessionId: string
  occurrenceId: string
  roomVersion: number
  participation: LiveParticipation | null
  occurrence: LiveOccurrence
  cohort: LiveCohort
  /** First name shown on the classmates' tiles. */
  displayName: string
}
export type LiveMediaPublisherResult =
  | { ok: true; access: LiveMediaAuthorization }
  | { ok: false; error: unknown }

/** The teacher may open the reception 15 min early; the child may enter it in the same window. */
export const LIVE_LOBBY_EARLY_MS = 15 * 60_000
/** State transitions are the only commands that still check the room version. */
const TRANSITIONS = new Set<LiveControl['kind']>(['start', 'end', 'open-lobby', 'cancel'])

const firstName = (name: string) => name.trim().split(/\s+/)[0]?.slice(0, 50) || 'Criador'
/** A recording the child can watch: the platform file or the video already ready on Vimeo. */
const watchable = (recording: LiveOccurrence['recording']) =>
  recording.storageKey !== null || recording.vimeo?.status === 'ready'
const recordingPublished = (aggregate: LiveCohortAggregate, sessionId: string) =>
  aggregate.occurrences.some(
    (item) =>
      item.sessionId === sessionId &&
      item.recording.published &&
      item.recording.state === 'ready' &&
      watchable(item.recording),
  )
const summary = (
  { plan, ...session }: LiveSession,
  occurrence?: LiveOccurrence,
  aggregate?: LiveCohortAggregate,
  titles?: Map<string, string>,
) => ({
  ...session,
  // The lesson title of the live course (fresh in the catalog); the creation snapshot otherwise.
  title: (session.lessonId && titles?.get(session.lessonId)) || plan.title,
  occurrenceStartsAt: occurrence?.startsAt ?? session.startsAt,
  occurrenceEndsAt: occurrence?.endsAt ?? session.endsAt,
  ...(occurrence ? { occurrenceState: occurrence.state } : {}),
  ...(aggregate ? { recordingPublished: recordingPublished(aggregate, session.id) } : {}),
})
const sessionSummaries = (aggregate: LiveCohortAggregate, titles?: Map<string, string>) =>
  aggregate.sessions.map((session) =>
    summary(
      session,
      aggregate.occurrences.find((occurrence) => occurrence.id === session.occurrenceId),
      aggregate,
      titles,
    ),
  )
const courseSummary = ({
  status: _status,
  modality: _modality,
  ...course
}: LiveCourseRecord): LiveCourseSummary => course
const recordingSummary = (item: LiveOccurrence): LiveRecordingSummary => {
  const { storageKey: _key, ...recording } = item.recording
  return { occurrenceId: item.id, startsAt: item.startsAt, recording }
}
/** Section ids of the published lesson stay cached briefly: heartbeats validate against them. */
const SECTIONS_CACHE_MS = 30_000
const SECTIONS_CACHE_LIMIT = 500
const UUID = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i
interface RewardCandidate {
  learnerId: string
  accountId: string
  occurrenceId: string
  courseId: string
  audience: 'adult' | 'kids'
}
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
const sameName = (left: string, right: string) =>
  left.trim().toLocaleLowerCase('pt-BR') === right.trim().toLocaleLowerCase('pt-BR')
/** A pending reservation repeated within this window is the same click, not a second seat. */
const PENDING_ENROLLMENT_IDEMPOTENCY_MS = 10 * 60_000

function validTeachers(teacherIds: string[]) {
  if (
    !Array.isArray(teacherIds) ||
    !teacherIds.length ||
    teacherIds.length > 4 ||
    new Set(teacherIds).size !== teacherIds.length
  )
    throw new ValidationError('Informe de uma a quatro professoras responsáveis, sem repetir.')
  return [...teacherIds]
}
/** Only names of assigned teachers survive; a stale name never outlives the assignment. */
function teacherNamesFor(
  teacherIds: string[],
  names: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (names === undefined) return undefined
  if (typeof names !== 'object' || names === null || Array.isArray(names))
    throw new ValidationError('Nomes das professoras inválidos.')
  const result: Record<string, string> = {}
  for (const id of teacherIds) {
    const raw = names[id]
    if (raw === undefined) continue
    if (typeof raw !== 'string' || !raw.trim() || raw.trim().length > 80)
      throw new ValidationError('O nome de cada professora precisa ter de 1 a 80 caracteres.')
    result[id] = raw.trim()
  }
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

  private readonly sectionsCache = new Map<string, { until: number; ids: string[] | null }>()

  private requireStaff(actor: LiveActor) {
    if (!actor.staff) throw new LiveAccessError('Acesso da equipe necessário.')
  }
  private requireAdmin(actor: LiveActor) {
    if (!actor.staff || actor.admin !== true)
      throw new LiveAccessError('Esta ação é exclusiva da administração.')
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

  private requireCourses(): LiveCoursePort {
    if (!this.options.courses)
      throw new LiveUnavailableError('Os cursos ao vivo ainda não estão configurados.')
    return this.options.courses
  }

  /**
   * The parts of the PUBLISHED lesson, in order. `fresh` skips the short cache (start and
   * open-section read the lesson as it is now); heartbeats use the cache. Null = no published
   * lesson (unpublished, deleted, or no course port).
   */
  private async publishedSections(lessonId: string, fresh = false): Promise<string[] | null> {
    const now = this.clock().getTime()
    const cached = this.sectionsCache.get(lessonId)
    if (!fresh && cached && cached.until > now) return cached.ids
    const lesson = await this.options.courses?.lessonSections(lessonId)
    const ids = lesson?.published ? lesson.sectionIds : null
    if (this.sectionsCache.size >= SECTIONS_CACHE_LIMIT)
      for (const [key, value] of this.sectionsCache)
        if (value.until <= now) this.sectionsCache.delete(key)
    if (this.sectionsCache.size >= SECTIONS_CACHE_LIMIT) this.sectionsCache.clear()
    this.sectionsCache.set(lessonId, { until: now + SECTIONS_CACHE_MS, ids })
    return ids
  }

  /**
   * A cohort of a LIVE course: one encounter per PUBLISHED lesson, in the course order. The
   * course summary is kept in the cohort (lists, platform filter, the room's lesson address).
   */
  async createCohort(actor: LiveActor, courseId: string, input: LiveCreateCohort) {
    this.requireStaff(actor)
    const course = await this.requireCourses().findCourse(courseId)
    if (!course) throw new LiveNotFoundError()
    if (course.modality !== 'live')
      throw new ValidationError('Turmas são só de cursos ao vivo. Este curso é gravado.')
    if (course.status === 'archived') throw new LiveConflictError('Este curso está arquivado.')
    if (!course.lessons.length)
      throw new ValidationError('Publique as aulas do curso antes de criar a turma.')
    if (course.lessons.length > 24)
      throw new ValidationError('Uma turma tem até 24 encontros: o curso tem aulas demais.')
    if (!Number.isInteger(input.capacity) || input.capacity < 1 || input.capacity > 8)
      throw new ValidationError('A turma pode ter até oito crianças.')
    const teacherIds = validTeachers(input.teacherIds)
    const teacherNames = teacherNamesFor(teacherIds, input.teacherNames)
    if (input.schedule.length !== course.lessons.length)
      throw new ValidationError('Agende uma data para cada aula publicada do curso.')
    const cohort: LiveCohort = {
      id: this.id(),
      // A course cohort has no script; the field stays for the old contract.
      programId: '',
      courseId: course.id,
      course: { id: course.id, slug: course.slug, title: course.title, audience: course.audience },
      title: text(input.title, 160),
      timeZone: input.timeZone,
      capacity: input.capacity,
      accessDays: input.accessDays,
      teacherIds,
      ...(teacherNames ? { teacherNames } : {}),
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
        throw new ValidationError('Os encontros da turma não podem se sobrepor.')
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
      const lesson = course.lessons[order]!
      return {
        id: sessionId,
        cohortId: cohort.id,
        order,
        lessonId: lesson.id,
        // The old script field stays typed; only the title is read (as a fallback).
        plan: { title: lesson.title, instructions: '', starterProjectId: null, materials: [] },
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
      conductorId: null,
      recording: { state: 'not_started', published: false, version: 0, storageKey: null },
    }
  }

  /** Admin-only: status and the assigned teachers (with their display names). Audited. */
  async updateCohort(actor: LiveActor, id: string, patch: LiveUpdateCohort) {
    this.requireAdmin(actor)
    if (
      patch.status === undefined &&
      patch.teacherIds === undefined &&
      patch.teacherNames === undefined
    )
      throw new ValidationError('Informe o que muda na turma.')
    const teacherIds = patch.teacherIds === undefined ? undefined : validTeachers(patch.teacherIds)
    let removedTeachers = false
    let teachersAudited = false
    const result = await this.repository.transaction(id, (aggregate) => {
      const { cohort } = aggregate
      if (patch.status !== undefined) {
        if (cohort.status === 'archived' && patch.status !== 'archived')
          throw new LiveConflictError('Crie uma nova turma para preservar este histórico.')
        if (cohort.status !== patch.status) {
          cohort.status = patch.status
          this.audit(aggregate, actor, `cohort.${patch.status}`, id)
        }
      }
      if (teacherIds) {
        const removed = cohort.teacherIds.filter((teacher) => !teacherIds.includes(teacher))
        if (removed.length || teacherIds.some((teacher) => !cohort.teacherIds.includes(teacher))) {
          cohort.teacherIds = teacherIds
          this.audit(aggregate, actor, 'cohort.teachers-changed', id)
          teachersAudited = true
        }
        if (removed.length) {
          removedTeachers = true
          // A removed teacher's heartbeat must not keep a room "supervised".
          for (const occurrence of aggregate.occurrences) {
            const before = Object.keys(occurrence.teachers).length
            for (const teacher of removed) delete occurrence.teachers[teacher]
            if (Object.keys(occurrence.teachers).length !== before) occurrence.version++
          }
        }
      }
      if (teacherIds || patch.teacherNames !== undefined) {
        // Names merge over the current ones and are pruned to the assigned teachers.
        const names =
          teacherNamesFor(cohort.teacherIds, {
            ...(cohort.teacherNames ?? {}),
            ...(patch.teacherNames ?? {}),
          }) ?? {}
        if (JSON.stringify(names) !== JSON.stringify(cohort.teacherNames ?? {})) {
          cohort.teacherNames = names
          if (!teachersAudited) this.audit(aggregate, actor, 'cohort.teacher-names-changed', id)
        }
      }
      return {
        cohort: structuredClone(cohort),
        occurrences: aggregate.occurrences.map((o) => o.id),
      }
    })
    if (removedTeachers)
      for (const occurrenceId of result.occurrences)
        await this.options.onPermissionsChanged?.(occurrenceId)
    return result.cohort
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
        const active = aggregate.enrollments.filter((enrollment) => enrollment.status === 'active')
        // Idempotent: a double click (or a retry) returns the seat that already exists.
        const repeated = active.find((enrollment) =>
          input.learnerId
            ? enrollment.learnerId === input.learnerId
            : enrollment.learnerId === null &&
              enrollment.accountId === input.accountId &&
              sameName(enrollment.learnerName, input.learnerName) &&
              this.clock().getTime() - validDate(enrollment.createdAt) <=
                PENDING_ENROLLMENT_IDEMPOTENCY_MS,
        )
        if (repeated) {
          if (repeated.accountId !== input.accountId)
            throw new LiveConflictError('Esta criança já tem uma vaga nesta turma.')
          return repeated
        }
        if (aggregate.cohort.status !== 'open')
          throw new LiveConflictError('Esta turma não está aberta para inscrições.')
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

  /** Children's names and family accounts: admins, or the teachers assigned to this cohort. */
  private seesRoster(actor: LiveActor, cohort: LiveCohort) {
    return actor.staff && (actor.admin === true || cohort.teacherIds.includes(actor.id))
  }

  async enrollments(actor: LiveActor, cohortId: string) {
    this.requireStaff(actor)
    const aggregate = await this.repository.findCohort(cohortId)
    if (!aggregate || !this.seesRoster(actor, aggregate.cohort)) throw new LiveNotFoundError()
    return { enrollments: aggregate.enrollments }
  }

  /**
   * Admin: the cohorts of the platform (`audience`, from the course) and every LIVE course of
   * it, to pick one for a new cohort. Child/parents: discovery (open cohorts) + own seats, with
   * the courses of those cohorts (published lessons only). Old script cohorts never appear.
   */
  async catalog(
    actor: LiveActor,
    mode: 'learner' | 'parents' | 'admin' = 'learner',
    page: { cursor?: string; limit?: number; audience?: 'adult' | 'kids' } = {},
  ) {
    if (mode === 'admin') this.requireStaff(actor)
    if (mode === 'parents' && actor.id !== actor.accountId)
      throw new LiveAccessError('Entre com a conta do responsável.')
    const limit = page.limit ?? 20
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 50 ||
      (page.cursor && !UUID.test(page.cursor)) ||
      (page.audience !== undefined && page.audience !== 'adult' && page.audience !== 'kids')
    )
      throw new ValidationError('Página de oficinas inválida.')
    // The live courses of the platform (few): the admin picks one; discovery needs it PUBLISHED.
    const liveCourses =
      (await this.options.courses?.listLiveCourses({ audience: page.audience })) ?? []
    const discoverable = new Set(
      liveCourses.filter((course) => course.status === 'published').map((course) => course.id),
    )
    const rows = await this.repository.listCohorts({
      actor,
      mode,
      cursor: page.cursor,
      limit: limit + 1,
      audience: page.audience,
      discoverableCourseIds: [...discoverable],
    })
    const all = rows.slice(0, limit)
    const nextCursor = rows.length > limit ? all.at(-1)!.cohort.id : null
    const own = (enrollment: LiveEnrollment) =>
      enrollment.accountId === actor.accountId &&
      (mode === 'parents' || enrollment.learnerId === actor.id)
    const visible =
      mode === 'admin'
        ? all
        : all.filter(
            (item) =>
              (item.cohort.status === 'open' &&
                item.cohort.courseId !== undefined &&
                item.cohort.courseId !== null &&
                discoverable.has(item.cohort.courseId)) ||
              item.enrollments.some(own) ||
              (actor.staff && item.cohort.teacherIds.includes(actor.id)),
          )
    const visibleCourses = new Set(visible.map((item) => item.cohort.courseId))
    const courses =
      mode === 'admin' ? liveCourses : liveCourses.filter((course) => visibleCourses.has(course.id))
    const fresh = new Map(courses.map((course) => [course.id, course]))
    const titles = new Map(
      courses.flatMap((course) => course.lessons.map((lesson) => [lesson.id, lesson.title])),
    )
    // The cohort keeps a course summary from its creation; the catalog shows the current one.
    const cohortOf = ({ cohort }: LiveCohortAggregate): LiveCohort => {
      const course = cohort.courseId ? fresh.get(cohort.courseId) : undefined
      return course
        ? {
            ...cohort,
            course: {
              id: course.id,
              slug: course.slug,
              title: course.title,
              audience: course.audience,
            },
          }
        : cohort
    }
    const summaries = (aggregate: LiveCohortAggregate) => sessionSummaries(aggregate, titles)
    if (mode === 'admin')
      return {
        nextCursor,
        courses: courses.map(courseSummary),
        programs: [],
        cohorts: all.map(cohortOf),
        sessions: all.flatMap(summaries),
        // Staff not assigned to a cohort does not see that cohort's children or families.
        enrollments: all.flatMap((item) =>
          this.seesRoster(actor, item.cohort) ? item.enrollments : [],
        ),
      } satisfies LiveCatalogView
    return {
      nextCursor,
      courses: courses.map(courseSummary),
      programs: [],
      cohorts: visible.map(cohortOf),
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
        .flatMap(summaries),
      enrollments: visible.flatMap((item) => item.enrollments.filter(own)),
    } satisfies LiveCatalogView
  }

  /** Pure authorization over a loaded aggregate (no I/O): who is this actor in this lesson? */
  contextFor(actor: LiveActor, aggregate: LiveCohortAggregate, sessionId: string): LiveContext {
    const session = aggregate.sessions.find((item) => item.id === sessionId)
    const occurrence = aggregate.occurrences.find((item) => item.id === session?.occurrenceId)
    // An old script cohort (no live course) was archived by 0110 and is ignored everywhere.
    if (!session || !occurrence || !aggregate.cohort.courseId) throw new LiveNotFoundError()
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

  /** Unlocked snapshot read (one pool connection, no lock held by the caller). */
  cohortForSession(sessionId: string): Promise<LiveCohortAggregate | null> {
    return this.repository.findBySession(sessionId)
  }

  /** A Studio block of the PUBLISHED lesson (the live project seed and curation). */
  async studioBlock(lessonId: string, blockId: string): Promise<LiveStudioBlockRecord | null> {
    return (await this.options.courses?.studioBlock(lessonId, blockId)) ?? null
  }

  async requireContext(actor: LiveActor, sessionId: string): Promise<LiveContext> {
    const aggregate = await this.repository.findBySession(sessionId)
    if (!aggregate) throw new LiveNotFoundError()
    return this.contextFor(actor, aggregate, sessionId)
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

  /**
   * Before the lesson opens, a child with a valid (not yet started) grant may already wait in
   * the reception during the 15 minutes the teacher can open it. Nothing else opens early.
   */
  private inLobbyWindow(context: LiveContext, now: Date): boolean {
    const { grant, occurrence } = context
    if (context.role !== 'learner' || !grant) return false
    return (
      lessonAccess(grant.startsAt, grant.endsAt, now, grant.revokedAt !== null) === 'scheduled' &&
      now.getTime() >= validDate(occurrence.startsAt) - LIVE_LOBBY_EARLY_MS &&
      now.getTime() < validDate(occurrence.hardEndsAt)
    )
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
    const early = !canOpen && this.inLobbyWindow(context, now)
    const occurrence = structuredClone(context.occurrence)
    const supervision = supervisionStatus(occurrence.teachers, now)
    const participant = occurrence.participants.find((item) => item.learnerId === actor.id)
    const admitted = role === 'teacher' || participant?.admission === 'admitted'
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
        admitted && canOpen
          ? occurrence.messages
              .filter((message) => !message.removed)
              // Classmates' profile UUIDs never reach a child's browser.
              .map((message) =>
                message.role === 'learner' && message.authorId !== actor.id
                  ? { ...message, authorId: null }
                  : message,
              )
          : []
    }
    // An unpublished recording (under review) never shows its Vimeo link or chapters to a child.
    if (role === 'learner' && !occurrence.recording.published) {
      delete occurrence.recording.vimeo
      delete occurrence.recording.chapters
    }
    // The lesson of the encounter opens through the regular lesson routes (null when expired).
    const lesson =
      canOpen && aggregate.cohort.courseId && aggregate.cohort.course && session.lessonId
        ? {
            courseId: aggregate.cohort.courseId,
            courseSlug: aggregate.cohort.course.slug,
            lessonId: session.lessonId,
          }
        : null
    const reception =
      (canOpen || early) &&
      ['lobby', 'live'].includes(occurrence.state) &&
      now.getTime() < validDate(occurrence.hardEndsAt) &&
      participant?.admission !== 'removed'
    return {
      session: summary(session, occurrence, aggregate),
      cohort: aggregate.cohort,
      lesson,
      access: {
        startsAt: grant?.startsAt ?? session.startsAt,
        endsAt: grant?.endsAt ?? session.accessEndsAt,
        status,
        canOpen,
        canJoinMedia:
          canOpen && admitted && occurrenceIsOpen(occurrence, now) && supervision === 'present',
        canWatchRecording: canOpen && recordingPublished(aggregate, session.id),
        canEnterLobby: reception,
      },
      occurrence: canOpen || early ? occurrence : null,
      recordings: canOpen
        ? aggregate.occurrences
            .filter(
              (item) =>
                item.sessionId === session.id &&
                (item.recording.storageKey || item.recording.vimeo) &&
                ['review', 'ready'].includes(item.recording.state) &&
                (role === 'teacher' || item.recording.published),
            )
            .sort((a, b) => validDate(b.startsAt) - validDate(a.startsAt))
            .map((item) => recordingSummary(item))
        : [],
      role,
      actorId: actor.id,
      supervision,
      serverTime: now.toISOString(),
      mediaReady: this.options.mediaReady === true,
    }
  }

  private overdue(occurrence: LiveOccurrence, now = this.clock()) {
    return (
      ['live', 'lobby', 'scheduled'].includes(occurrence.state) &&
      validDate(occurrence.hardEndsAt) <= now.getTime()
    )
  }

  async room(actor: LiveActor, sessionId: string) {
    let context = await this.requireContext(actor, sessionId)
    if (this.overdue(context.occurrence)) {
      await this.endExpiredOccurrence(context.occurrence.id)
      context = await this.requireContext(actor, sessionId)
    }
    return this.view(actor, context)
  }

  /** Separate from recording: a slow recorder never delays the end of a class. */
  async reconcileDeadlines(): Promise<void> {
    const ids = await this.repository.overdueOccurrences(this.clock())
    for (const id of ids) await this.endExpiredOccurrence(id)
  }

  private async endExpiredOccurrence(id: string): Promise<void> {
    const cohortId = (await this.repository.findByOccurrence(id))?.cohort.id
    if (!cohortId) return
    const changed = await this.repository.transaction(cohortId, (aggregate) => {
      const occurrence = aggregate.occurrences.find((item) => item.id === id)
      if (!occurrence || !this.overdue(occurrence)) return false
      // An encounter that never happened is cancelled (and can get a replacement);
      // reception and live calls are ended.
      const action =
        occurrence.state === 'scheduled' ? 'room.deadline-cancelled' : 'room.deadline-ended'
      occurrence.state = occurrence.state === 'scheduled' ? 'cancelled' : 'ended'
      occurrence.version++
      occurrence.guidance = null
      for (const participant of occurrence.participants) {
        participant.turnGranted = false
        participant.muteEpoch++
      }
      aggregate.audit.push({
        id: this.id(),
        actorId: aggregate.cohort.teacherIds[0]!,
        action,
        targetId: id,
        createdAt: this.clock().toISOString(),
      })
      return true
    })
    if (changed) await this.options.onPermissionsChanged?.(id)
  }

  /** One indexed lookup, then the cohort lock; authorization happens on the locked snapshot. */
  private async mutateRoom<T>(
    actor: LiveActor,
    sessionId: string,
    mutate: (context: LiveContext) => T | Promise<T>,
    preloaded?: LiveSessionRef,
  ) {
    const ref = preloaded ?? (await this.repository.sessionRef(sessionId))
    if (!ref) throw new LiveNotFoundError()
    return this.repository.transaction(
      ref.cohortId,
      async (aggregate) => mutate(this.contextFor(actor, aggregate, sessionId)),
      actor.accountId,
    )
  }

  private async requireRef(sessionId: string) {
    const ref = await this.repository.sessionRef(sessionId)
    if (!ref) throw new LiveNotFoundError()
    return ref
  }

  private operational(context: LiveContext, allowLobby = false) {
    const now = this.clock()
    if (!(allowLobby && this.inLobbyWindow(context, now))) this.assertAvailable(context)
    const { occurrence } = context
    if (
      ['ended', 'cancelled'].includes(occurrence.state) ||
      now.getTime() >= validDate(occurrence.hardEndsAt)
    )
      throw new LiveConflictError('Este encontro já terminou.')
    if (allowLobby) {
      if (!['lobby', 'live'].includes(occurrence.state))
        throw new LiveConflictError('A professora ainda não abriu a sala.')
    } else if (!occurrenceIsOpen(occurrence, now))
      throw new LiveConflictError('O encontro ainda não começou.')
  }

  private participation(
    actor: LiveActor,
    context: LiveContext,
    deviceId: string,
  ): LiveParticipation {
    const participant = context.occurrence.participants.find((item) => item.learnerId === actor.id)
    if (!participant || participant.deviceId !== deviceId || participant.admission === 'removed')
      throw new LiveConflictError(
        'O encontro está aberto em outro aparelho ou sua entrada precisa ser autorizada.',
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
          throw new LiveConflictError('Use “Continuar aqui” para trocar de aparelho.')
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

  /**
   * Presence plus what the child is doing: the part of the lesson she is in (`sectionId`) and
   * the parts she already completed (`completedSectionIds`, from the real lesson progress), for
   * the teacher's cards. Section ids must be parts of the PUBLISHED lesson.
   */
  async heartbeat(
    actor: LiveActor,
    sessionId: string,
    deviceId: string,
    activity?: LiveActivityReport,
  ) {
    const ref = await this.requireRef(sessionId)
    let report: Omit<LiveActivityReport, 'stepId'> & { stepId: null } = {
      stepId: null,
      saveState: 'not-open',
    }
    if (activity) {
      if (!['not-open', 'saving', 'saved', 'offline'].includes(activity.saveState))
        throw new ValidationError('Estado de salvamento inválido.')
      // The old script steps are gone: a step id is never valid in a course encounter.
      if (activity.stepId) throw new ValidationError('Etapa inválida para este encontro.')
      const sectionId = activity.sectionId ?? null
      const completed = activity.completedSectionIds
      if (
        (sectionId !== null && (typeof sectionId !== 'string' || !UUID.test(sectionId))) ||
        (completed !== undefined &&
          (!Array.isArray(completed) ||
            completed.length > LIVE_SECTIONS_MAX ||
            new Set(completed).size !== completed.length ||
            completed.some((id) => typeof id !== 'string' || !UUID.test(id))))
      )
        throw new ValidationError('Parte inválida para este encontro.')
      if (sectionId !== null || completed?.length) {
        const known = new Set(
          (ref.lessonId ? await this.publishedSections(ref.lessonId) : null) ?? [],
        )
        if (
          (sectionId !== null && !known.has(sectionId)) ||
          completed?.some((id) => !known.has(id))
        )
          throw new ValidationError('Parte inválida para este encontro.')
      }
      report = {
        stepId: null,
        saveState: activity.saveState,
        sectionId,
        ...(completed !== undefined ? { completedSectionIds: [...completed] } : {}),
      }
    }
    return this.mutateRoom(
      actor,
      sessionId,
      (context) => {
        this.operational(context, true)
        if (context.role === 'teacher')
          context.occurrence.teachers[actor.id] = this.clock().toISOString()
        else {
          const participant = this.participation(actor, context, deviceId)
          participant.seenAt = this.clock().toISOString()
          if (activity && participant.admission === 'admitted')
            participant.activity = { ...report, reportedAt: participant.seenAt }
        }
        return this.view(actor, context)
      },
      ref,
    )
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

  /**
   * Teacher commands. Only state transitions (start, end, open-lobby, cancel) check the room
   * version: every other command is idempotent and must not fail just because a hand was
   * raised or a child arrived. Moderation also works in the reception (lobby).
   */
  async control(
    actor: LiveActor,
    sessionId: string,
    expectedVersion: number | undefined,
    command: LiveControl,
  ) {
    if (command.kind === 'lower-hands' && command.before !== undefined) validDate(command.before)
    const ref = await this.requireRef(sessionId)
    // The parts of the PUBLISHED lesson, read before the cohort lock (never a second
    // connection while it is held) and fresh: the teacher conducts the lesson as it is now.
    const sections =
      (command.kind === 'start' || command.kind === 'open-section') && ref.lessonId
        ? await this.publishedSections(ref.lessonId, true)
        : null
    let rewards: RewardCandidate[] = []
    const room = await this.mutateRoom(
      actor,
      sessionId,
      (context) => {
        if (context.role !== 'teacher')
          throw new LiveAccessError('Somente a professora desta turma pode conduzir a sala.')
        const result = this.applyControl(actor, context, expectedVersion, command, sections)
        rewards = result.rewards
        return result.room
      },
      ref,
    )
    await this.options.onPermissionsChanged?.(room.occurrence?.id ?? '')
    await this.grantRewards(rewards)
    return room
  }

  /** Children received in a `live` encounter: the rewards port is told after the commit. */
  private receivedLive(context: LiveContext) {
    if (context.occurrence.state !== 'live') return new Set<string>()
    return new Set(
      context.occurrence.participants
        .filter((participant) => participant.admission === 'admitted')
        .map((participant) => participant.learnerId),
    )
  }

  private async grantRewards(candidates: RewardCandidate[]) {
    const rewards = this.options.liveRewards
    if (!rewards || !candidates.length) return
    const results = await Promise.allSettled(
      candidates.map((candidate) => rewards.encounterAttended(candidate)),
    )
    for (const result of results)
      if (result.status === 'rejected') this.options.onRewardsError?.(result.reason)
  }

  private applyControl(
    actor: LiveActor,
    context: LiveContext,
    expectedVersion: number | undefined,
    command: LiveControl,
    sections: string[] | null,
  ): { room: LiveRoomView; rewards: RewardCandidate[] } {
    const before = this.receivedLive(context)
    const room = this.applyCommand(actor, context, expectedVersion, command, sections)
    const { cohort } = context.aggregate
    const rewards: RewardCandidate[] = []
    for (const learnerId of this.receivedLive(context)) {
      if (before.has(learnerId) || !cohort.courseId || !cohort.course) continue
      const enrollment = context.aggregate.enrollments.find(
        (item) => item.learnerId === learnerId && item.status === 'active',
      )
      if (!enrollment) continue
      rewards.push({
        learnerId,
        accountId: enrollment.accountId,
        occurrenceId: context.occurrence.id,
        courseId: cohort.courseId,
        audience: cohort.course.audience,
      })
    }
    return { room, rewards }
  }

  private applyCommand(
    actor: LiveActor,
    context: LiveContext,
    expectedVersion: number | undefined,
    command: LiveControl,
    sections: string[] | null,
  ): LiveRoomView {
    const { occurrence } = context
    if (
      TRANSITIONS.has(command.kind) &&
      expectedVersion !== undefined &&
      occurrence.version !== expectedVersion
    )
      throw new LiveConflictError()
    if (['ended', 'cancelled'].includes(occurrence.state)) {
      if (
        (command.kind === 'end' && occurrence.state === 'ended') ||
        (command.kind === 'cancel' && occurrence.state === 'cancelled')
      )
        return this.view(actor, context)
      throw new LiveConflictError('Este encontro já terminou. Agende uma reposição.')
    }
    if (
      command.kind !== 'end' &&
      command.kind !== 'cancel' &&
      this.clock().getTime() >= validDate(occurrence.hardEndsAt)
    )
      throw new LiveConflictError('O horário deste encontro terminou.')
    switch (command.kind) {
      case 'suggest-step':
        // The old script steps are gone: the teacher conducts the parts (`open-section`).
        throw new ValidationError('Este encontro não tem etapas. Abra as partes da aula.')
      case 'open-lobby':
        if (occurrence.state !== 'scheduled') throw new LiveConflictError()
        if (this.clock().getTime() < validDate(occurrence.startsAt) - LIVE_LOBBY_EARLY_MS)
          throw new LiveConflictError('A sala de espera abre quinze minutos antes do encontro.')
        occurrence.state = 'lobby'
        break
      case 'start':
        if (
          !['scheduled', 'lobby'].includes(occurrence.state) ||
          this.clock().getTime() < validDate(occurrence.startsAt)
        )
          throw new LiveConflictError('O encontro só pode começar no horário agendado.')
        if (!this.options.mediaReady)
          throw new LiveUnavailableError(
            'A transmissão precisa concluir a verificação operacional antes de iniciar uma turma.',
          )
        occurrence.state = 'live'
        // The recording follows whoever actually conducts this occurrence.
        occurrence.conductorId = actor.id
        {
          // The FIRST part of the published lesson opens with the encounter (chapter mark).
          const first = sections?.[0]
          occurrence.sections = { openedIds: first ? [first] : [], currentId: first ?? null }
          occurrence.marks = first ? [{ sectionId: first, at: this.clock().toISOString() }] : []
        }
        break
      case 'end':
        occurrence.state = 'ended'
        for (const participant of occurrence.participants) {
          participant.turnGranted = false
          participant.muteEpoch++
        }
        break
      case 'cancel':
        if (!['scheduled', 'lobby'].includes(occurrence.state))
          throw new LiveConflictError(
            'Só dá para cancelar um encontro que ainda não começou. Use Encerrar.',
          )
        occurrence.state = 'cancelled'
        occurrence.guidance = null
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
      case 'open-section': {
        if (occurrence.state !== 'live')
          throw new LiveConflictError('As partes abrem com o encontro ao vivo.')
        if (!sections?.includes(command.sectionId)) throw new LiveNotFoundError()
        const control = occurrence.sections ?? { openedIds: [], currentId: null }
        // Reopening an already opened part only makes it current: no second chapter.
        if (!control.openedIds.includes(command.sectionId)) {
          control.openedIds = [...control.openedIds, command.sectionId]
          occurrence.marks = [
            ...(occurrence.marks ?? []),
            { sectionId: command.sectionId, at: this.clock().toISOString() },
          ]
        }
        control.currentId = command.sectionId
        occurrence.sections = control
        break
      }
      case 'admit-all':
        for (const participant of occurrence.participants)
          if (participant.admission === 'waiting') participant.admission = 'admitted'
        break
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
              // A hand raised after the teacher's snapshot stays up.
              if (
                command.before === undefined ||
                (participant.handAt !== null &&
                  Date.parse(participant.handAt) <= Date.parse(command.before))
              )
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
  }

  /** Media authorization of one actor over an already loaded snapshot (no I/O). */
  private mediaAccess(
    aggregate: LiveCohortAggregate,
    actor: LiveActor,
    occurrenceId: string,
    deviceId: string,
  ): LiveMediaAuthorization {
    const found = aggregate.occurrences.find((item) => item.id === occurrenceId)
    if (!found) throw new LiveNotFoundError()
    const context = this.contextFor(actor, aggregate, found.sessionId)
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
      displayName:
        participation?.displayName ??
        aggregate.cohort.teacherNames?.[actor.id] ??
        firstName(actor.name),
    }
  }

  async authorizeMedia(actor: LiveActor, occurrenceId: string, deviceId: string) {
    const aggregate = await this.repository.findByOccurrence(occurrenceId)
    if (!aggregate) throw new LiveNotFoundError()
    return this.mediaAccess(aggregate, actor, occurrenceId, deviceId)
  }

  /**
   * One cohort load per media poll or reconcile: every actor is judged on the same snapshot,
   * so a per-actor denial is a real denial, never a transient database error (which rejects
   * the whole call instead).
   */
  async authorizeMediaMany(
    occurrenceId: string,
    entries: { actor: LiveActor; deviceId: string }[],
  ): Promise<LiveMediaPublisherResult[]> {
    const aggregate = await this.repository.findByOccurrence(occurrenceId)
    return entries.map(({ actor, deviceId }) => {
      try {
        if (!aggregate) throw new LiveNotFoundError()
        return {
          ok: true as const,
          access: this.mediaAccess(aggregate, actor, occurrenceId, deviceId),
        }
      } catch (error) {
        return { ok: false as const, error }
      }
    })
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

  /**
   * Publishing a reviewed recording also computes its CHAPTERS: each part opening (`marks`)
   * becomes a position in the video, discounting the pauses, from the segment timeline the
   * recorder confirmed. Without a timeline the recording is published without chapters.
   */
  async publishRecording(
    actor: LiveActor,
    sessionId: string,
    expectedVersion: number,
    published: boolean,
    occurrenceId?: string,
  ) {
    const ref = await this.requireRef(sessionId)
    const target = occurrenceId ?? ref.occurrenceId
    let segments: LiveRecordingSegmentTime[] | null = null
    if (published && this.options.recordingTimeline)
      try {
        segments = await this.options.recordingTimeline(target)
      } catch {
        segments = null
      }
    return this.mutateRoom(
      actor,
      sessionId,
      (context) => {
        if (context.role !== 'teacher') throw new LiveAccessError()
        const occurrence = occurrenceId
          ? context.aggregate.occurrences.find(
              (item) => item.id === occurrenceId && item.sessionId === sessionId,
            )
          : context.occurrence
        if (!occurrence) throw new LiveNotFoundError()
        const recording = occurrence.recording
        if (recording.version !== expectedVersion) throw new LiveConflictError()
        if (
          published &&
          (!['review', 'ready'].includes(recording.state) ||
            !(recording.storageKey || recording.vimeo))
        )
          throw new LiveConflictError('A gravação ainda não está pronta para revisão e publicação.')
        recording.published = published
        if (published) recording.state = 'ready'
        if (published && segments && occurrence.id === target)
          recording.chapters = recordingChapters(occurrence.marks ?? [], segments)
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
      },
      ref,
    )
  }

  /** Who sends a recording to Vimeo: the administration or a teacher assigned to the cohort. */
  private assertRecordingManager(actor: LiveActor, aggregate: LiveCohortAggregate) {
    if (
      !aggregate.cohort.courseId ||
      !actor.staff ||
      !(actor.admin === true || aggregate.cohort.teacherIds.includes(actor.id))
    )
      throw new LiveNotFoundError()
  }

  /** A recording that went through review (or publication): the only one that leaves for Vimeo. */
  private reviewedRecording(occurrence: LiveOccurrence) {
    const { recording } = occurrence
    if (!['review', 'ready'].includes(recording.state) || !recording.storageKey)
      throw new LiveConflictError('A gravação deste encontro ainda não foi revisada.')
    return recording
  }

  /** The reviewed MP4 for the Admin to sign a temporary URL with its own credentials. */
  async recordingSource(actor: LiveActor, occurrenceId: string): Promise<LiveRecordingSourceView> {
    const aggregate = await this.repository.findByOccurrence(occurrenceId)
    const occurrence = aggregate?.occurrences.find((item) => item.id === occurrenceId)
    if (!aggregate || !occurrence) throw new LiveNotFoundError()
    this.assertRecordingManager(actor, aggregate)
    const recording = this.reviewedRecording(occurrence)
    return { storageKey: recording.storageKey!, bucket: 'private' }
  }

  /**
   * The Admin created (or follows) the video on Vimeo. Never changes the recording version: the
   * children's replay positions are kept. Audited.
   */
  async setRecordingVimeo(
    actor: LiveActor,
    occurrenceId: string,
    input: { videoId: string; embedUrl: string; status: string },
  ): Promise<LiveRecordingSummary> {
    const vimeo: LiveRecordingVimeo = liveVimeoRecording(input)
    const found = await this.repository.findByOccurrence(occurrenceId)
    if (!found) throw new LiveNotFoundError()
    return this.repository.transaction(found.cohort.id, (aggregate) => {
      const occurrence = aggregate.occurrences.find((item) => item.id === occurrenceId)
      if (!occurrence) throw new LiveNotFoundError()
      this.assertRecordingManager(actor, aggregate)
      // The platform MP4 may be deleted once Vimeo is ready; a later status update still counts.
      if (!occurrence.recording.vimeo) this.reviewedRecording(occurrence)
      else if (!['review', 'ready'].includes(occurrence.recording.state))
        throw new LiveConflictError('A gravação deste encontro ainda não foi revisada.')
      occurrence.recording.vimeo = vimeo
      this.audit(aggregate, actor, `recording.vimeo-${vimeo.status}`, occurrence.id)
      return recordingSummary(occurrence)
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

  /**
   * A replacement is a new occurrence; it never rewrites the original recording/history.
   * Extending the commercial access is admin-only: a teacher schedules within the grant.
   */
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
    if (input.extendAccessUntil !== undefined && actor.admin !== true)
      throw new LiveAccessError('Somente a administração pode ampliar o prazo de acesso.')
    return this.mutateRoom(actor, sessionId, (context) => {
      if (context.role !== 'teacher') throw new LiveAccessError()
      if (
        context.occurrence.version !== input.expectedVersion ||
        !['ended', 'cancelled'].includes(context.occurrence.state)
      )
        throw new LiveConflictError(
          'Encerre ou cancele o encontro atual antes de marcar a reposição.',
        )
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
          'A reposição precisa caber no prazo de acesso. Peça à administração para ampliá-lo.',
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
