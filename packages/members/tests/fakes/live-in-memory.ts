import { randomUUID } from 'node:crypto'
import type { CourseModality } from '@sistemazero/core/course/modality'
import type { LiveStudioConfig } from '@sistemazero/core/live'
import { LiveAccessError, LiveNotFoundError } from '../../src/domain/live/live.errors'
import { type LivePresenceRow, overlayPresence } from '../../src/domain/live/presence'
import type {
  LiveCoursePort,
  LiveCourseRecord,
  LiveLessonSections,
  LiveStudioBlockRecord,
} from '../../src/domain/ports/live-course.port'
import type {
  LiveCatalogQuery,
  LiveCohortAggregate,
  LivePresenceTouch,
  LiveRepository,
  LiveRoomRef,
} from '../../src/domain/ports/live-repository.port'

export class InMemoryLiveRepository implements LiveRepository {
  readonly cohorts = new Map<string, LiveCohortAggregate>()
  readonly positions = new Map<string, number>()
  /** Presence rows by `occurrenceId:actorId` (a heartbeat with nothing new writes only here). */
  readonly presence = new Map<string, LivePresenceRow>()
  /** Accounts in erasure: every family write is refused, presence included. */
  readonly fences = new Set<string>()
  /** Counters for the tests: full cohort loads, room slices and occurrence document writes. */
  readonly reads = { cohort: 0, room: 0, occurrenceWrites: 0, presenceWrites: 0 }
  /** Every audit entry appended by transactions, in order (the real repository inserts them). */
  readonly auditLog: LiveCohortAggregate['audit'] = []
  async readReplayPosition(sessionId: string, learnerId: string, version: number) {
    return this.positions.get(`${sessionId}:${learnerId}:${version}`) ?? 0
  }
  private locks = new Map<string, Promise<void>>()
  private async lock<T>(id: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(id) ?? Promise.resolve()
    let release!: () => void
    const current = new Promise<void>((resolve) => {
      release = resolve
    })
    this.locks.set(id, current)
    await previous
    try {
      return await operation()
    } finally {
      release()
      if (this.locks.get(id) === current) this.locks.delete(id)
    }
  }
  private read(aggregate: LiveCohortAggregate | undefined): LiveCohortAggregate | null {
    if (!aggregate) return null
    return overlayPresence(structuredClone(aggregate), [...this.presence.values()])
  }
  /** One encounter: this session, its occurrences, every seat, this session's grants. */
  private slice(aggregate: LiveCohortAggregate, sessionId: string): LiveCohortAggregate {
    return overlayPresence(
      structuredClone({
        cohort: aggregate.cohort,
        sessions: aggregate.sessions.filter((session) => session.id === sessionId),
        occurrences: aggregate.occurrences.filter((item) => item.sessionId === sessionId),
        enrollments: aggregate.enrollments,
        grants: aggregate.grants.filter((grant) => grant.sessionId === sessionId),
        audit: [],
      }),
      [...this.presence.values()],
    )
  }
  private locate(ref: LiveRoomRef) {
    for (const aggregate of this.cohorts.values()) {
      const sessionId =
        'sessionId' in ref
          ? aggregate.sessions.find((session) => session.id === ref.sessionId)?.id
          : aggregate.occurrences.find((item) => item.id === ref.occurrenceId)?.sessionId
      if (sessionId) return { aggregate, sessionId }
    }
    return null
  }
  async findRoom(ref: LiveRoomRef) {
    const found = this.locate(ref)
    if (!found) return null
    this.reads.room++
    return this.slice(found.aggregate, found.sessionId)
  }
  async roomTransaction<T>(
    ref: LiveRoomRef,
    mutate: (aggregate: LiveCohortAggregate) => T | Promise<T>,
    accountId?: string,
  ): Promise<T> {
    const found = this.locate(ref)
    if (!found) throw new LiveNotFoundError()
    const { sessionId } = found
    return this.lock(found.aggregate.cohort.id, async () => {
      if (accountId && this.fences.has(accountId))
        throw new LiveAccessError('Esta conta está em exclusão.')
      const full = this.cohorts.get(found.aggregate.cohort.id)!
      const slice = this.slice(full, sessionId)
      const before = JSON.stringify(slice.occurrences)
      const result = await mutate(slice)
      if (JSON.stringify(slice.occurrences) !== before) this.reads.occurrenceWrites++
      this.auditLog.push(...structuredClone(slice.audit))
      for (const position of slice.replayPositions ?? [])
        this.positions.set(
          `${position.sessionId}:${position.learnerId}:${position.version}`,
          position.positionSeconds,
        )
      // The slice goes back into the cohort; the other encounters are never touched.
      this.cohorts.set(full.cohort.id, {
        ...full,
        cohort: structuredClone(slice.cohort),
        sessions: full.sessions.map(
          (session) => slice.sessions.find((item) => item.id === session.id) ?? session,
        ),
        occurrences: [
          ...full.occurrences.filter((item) => item.sessionId !== sessionId),
          ...structuredClone(slice.occurrences),
        ],
        enrollments: structuredClone(slice.enrollments),
        grants: [
          ...full.grants.filter((grant) => grant.sessionId !== sessionId),
          ...structuredClone(slice.grants),
        ],
        audit: [],
      })
      return result
    })
  }
  async touchPresence(input: LivePresenceTouch) {
    if (this.fences.has(input.accountId)) throw new LiveAccessError('Esta conta está em exclusão.')
    this.reads.presenceWrites++
    const key = `${input.occurrenceId}:${input.actorId}`
    const current = this.presence.get(key)
    const at = input.at.toISOString()
    this.presence.set(key, {
      occurrenceId: input.occurrenceId,
      actorId: input.actorId,
      seenAt: current && current.seenAt > at ? current.seenAt : at,
      activityAt: input.activity ? at : (current?.activityAt ?? null),
    })
  }
  async createCohort(aggregate: LiveCohortAggregate) {
    this.cohorts.set(aggregate.cohort.id, structuredClone(aggregate))
  }
  async listCohorts(query?: LiveCatalogQuery) {
    return [...this.cohorts.values()]
      .filter(
        (item) =>
          item.cohort.courseId &&
          (!query ||
            ((!query.cursor || item.cohort.id > query.cursor) &&
              (!query.audience || item.cohort.course?.audience === query.audience) &&
              (query.mode === 'admin' ||
                (item.cohort.status === 'open' &&
                  (query.discoverableCourseIds ?? []).includes(item.cohort.courseId)) ||
                item.enrollments.some(
                  (enrollment) =>
                    enrollment.accountId === query.actor.accountId &&
                    (query.mode === 'parents' || enrollment.learnerId === query.actor.id),
                ) ||
                (query.actor.staff && item.cohort.teacherIds.includes(query.actor.id))))),
      )
      .sort((a, b) => a.cohort.id.localeCompare(b.cohort.id))
      .slice(0, query?.limit ?? 50)
      .map((item) => this.read(item)!)
  }
  async overdueOccurrences(now: Date) {
    return [...this.cohorts.values()]
      .flatMap((item) => item.occurrences)
      .filter(
        (item) =>
          ['live', 'lobby', 'scheduled'].includes(item.state) &&
          Date.parse(item.hardEndsAt) <= now.getTime(),
      )
      .slice(0, 100)
      .map((item) => item.id)
  }
  async findCohort(id: string) {
    const found = this.cohorts.get(id)
    if (found) this.reads.cohort++
    return this.read(found)
  }
  async findBySession(id: string) {
    const found = [...this.cohorts.values()].find((item) =>
      item.sessions.some((session) => session.id === id),
    )
    if (found) this.reads.cohort++
    return this.read(found)
  }
  async findByOccurrence(id: string) {
    const found = [...this.cohorts.values()].find((item) =>
      item.occurrences.some((occurrence) => occurrence.id === id),
    )
    if (found) this.reads.cohort++
    return this.read(found)
  }
  async sessionRef(id: string) {
    for (const item of this.cohorts.values()) {
      const session = item.sessions.find((entry) => entry.id === id)
      if (session)
        return {
          cohortId: item.cohort.id,
          lessonId: session.lessonId ?? null,
          occurrenceId: session.occurrenceId,
        }
    }
    return null
  }
  async findByEnrollment(id: string) {
    return this.read(
      [...this.cohorts.values()].find((item) =>
        item.enrollments.some((enrollment) => enrollment.id === id),
      ),
    )
  }
  async transaction<T>(
    id: string,
    mutate: (aggregate: LiveCohortAggregate) => T | Promise<T>,
  ): Promise<T> {
    return this.lock(id, async () => {
      const aggregate = this.read(this.cohorts.get(id))
      if (!aggregate) throw new LiveNotFoundError()
      aggregate.audit = []
      const before = JSON.stringify(aggregate.occurrences)
      const result = await mutate(aggregate)
      if (JSON.stringify(aggregate.occurrences) !== before) this.reads.occurrenceWrites++
      this.auditLog.push(...structuredClone(aggregate.audit))
      for (const position of aggregate.replayPositions ?? [])
        this.positions.set(
          `${position.sessionId}:${position.learnerId}:${position.version}`,
          position.positionSeconds,
        )
      aggregate.replayPositions = []
      this.cohorts.set(id, structuredClone(aggregate))
      return result
    })
  }
}

export interface FakeLiveLesson {
  id: string
  title: string
  sectionIds: string[]
}

/** Live courses for the tests: published lessons, their parts and Studio blocks. */
export class InMemoryLiveCourses implements LiveCoursePort {
  /**
   * `persist`: tests on a real database write each course row on its first read (a cohort locks
   * that row when it is created).
   */
  constructor(private readonly persist?: (course: LiveCourseRecord) => Promise<void>) {}
  readonly courses = new Map<string, LiveCourseRecord>()
  readonly sections = new Map<string, LiveLessonSections>()
  readonly blocks = new Map<string, LiveStudioBlockRecord>()
  /** Lesson lookups (the cache in the service must keep heartbeats from re-reading). */
  sectionReads = 0

  /** A live course with `lessons` published lessons, each with `sections` parts. */
  add(
    input: {
      lessons?: number
      sections?: number
      audience?: 'adult' | 'kids'
      modality?: CourseModality
      status?: LiveCourseRecord['status']
      title?: string
    } = {},
  ) {
    const id = randomUUID()
    const lessons: FakeLiveLesson[] = Array.from({ length: input.lessons ?? 2 }, (_, index) => ({
      id: randomUUID(),
      title: `Encontro ${index + 1}`,
      sectionIds: Array.from({ length: input.sections ?? 3 }, () => randomUUID()),
    }))
    const course: LiveCourseRecord = {
      id,
      slug: `oficina-${id.slice(0, 8)}`,
      title: input.title ?? 'Oficina de jogos',
      audience: input.audience ?? 'kids',
      description: 'Criar juntos ao vivo.',
      coverImageUrl: null,
      status: input.status ?? 'published',
      modality: input.modality ?? 'live',
      lessons: lessons.map(({ id: lessonId, title }) => ({ id: lessonId, title })),
    }
    this.courses.set(id, course)
    for (const lesson of lessons)
      this.sections.set(lesson.id, {
        lessonId: lesson.id,
        courseId: id,
        published: true,
        sectionIds: lesson.sectionIds,
      })
    return { course, lessons }
  }

  /** A Studio block in a lesson of the course; `chain` makes one project across lessons. */
  addStudioBlock(
    courseId: string,
    lessonId: string,
    input: { chain?: string; initialProject?: unknown; studio?: LiveStudioConfig } = {},
  ) {
    const block: LiveStudioBlockRecord = {
      blockId: randomUUID(),
      lessonId,
      courseId,
      chain: input.chain ?? null,
      initialProject: input.initialProject ?? null,
      studio: input.studio ?? {},
    }
    this.blocks.set(`${lessonId}:${block.blockId}`, block)
    return block
  }

  async findCourse(courseId: string) {
    const course = this.courses.get(courseId)
    if (course && this.persist) await this.persist(course)
    return structuredClone(course ?? null)
  }
  async listLiveCourses(filter: { ids?: string[]; audience?: 'adult' | 'kids' }) {
    return structuredClone(
      [...this.courses.values()].filter(
        (course) =>
          course.modality === 'live' &&
          course.status !== 'archived' &&
          (!filter.ids || filter.ids.includes(course.id)) &&
          (!filter.audience || course.audience === filter.audience),
      ),
    )
  }
  async lessonSections(lessonId: string) {
    this.sectionReads++
    return structuredClone(this.sections.get(lessonId) ?? null)
  }
  async studioBlock(lessonId: string, blockId: string) {
    return structuredClone(this.blocks.get(`${lessonId}:${blockId}`) ?? null)
  }
}
