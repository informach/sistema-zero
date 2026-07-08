import { randomUUID } from 'node:crypto'
import type { Logger } from '@sistemazero/core/logging'
import { type AvatarConfig, defaultAvatarConfig } from '../../src/domain/avatar/avatar-config'
import type { CertificateRecord } from '../../src/domain/certificate/certificate'
import {
  type Course,
  type CourseAudience,
  type CourseLevel,
  isCourseAccessible,
  type Lesson,
  type LessonAttachment,
  type LessonBlock,
  type LessonWithContent,
  type Module,
  type ModuleWithLessons,
} from '../../src/domain/course/course'
import { DuplicateSlugError } from '../../src/domain/course/course.errors'
import type { LessonBlockContent, LessonBlockKind } from '../../src/domain/course/lesson-block'
import { isCompletionGatingBlock } from '../../src/domain/course/lesson-block'
import type { QuizAttemptSummary } from '../../src/domain/course/quiz'
import {
  EntitlementAggregate,
  type EntitlementState,
} from '../../src/domain/entitlement/entitlement.aggregate'
import type { AccessType } from '../../src/domain/entitlement/fulfillment'
import type { BadgeSlug } from '../../src/domain/gamification/badges'
import {
  applyDailyCap,
  DAILY_COIN_CAP,
  streakMilestoneCoins,
} from '../../src/domain/gamification/coins'
import {
  advanceStreak,
  challengeBadgeSlugs,
  clubeBadgeSlugs,
  coinsSaverBadgeSlugs,
  courseBadgeSlugs,
  pensaCycleBadgeSlugs,
  pensaStageBadgeSlugs,
  playsBadgeSlugs,
  quizPerfectBadgeSlugs,
  showcaseBadgeSlugs,
  streakBadgeSlugs,
  studioMasteryBadgeSlugs,
} from '../../src/domain/gamification/gamification'
import type { QualifyingByLevel } from '../../src/domain/gamification/levels'
import type { MissionGoalType } from '../../src/domain/gamification/missions'
import type {
  AnalyticsRepository,
  CourseLessonCount,
  LessonFunnelRow,
} from '../../src/domain/ports/analytics-repository.port'
import type { AvatarRepository } from '../../src/domain/ports/avatar-repository.port'
import type { CatalogGateway, ResolvedOffer } from '../../src/domain/ports/catalog-gateway.port'
import type { CertificateRepository } from '../../src/domain/ports/certificate-repository.port'
import type {
  AttachmentFields,
  ContentAdminRepository,
  CourseFields,
  LessonFields,
  ListCoursesAdminFilter,
  ModuleFields,
} from '../../src/domain/ports/content-admin-repository.port'
import type {
  CourseRatingRepository,
  CourseRatingUpsert,
  MemberCourseRating,
} from '../../src/domain/ports/course-rating-repository.port'
import type { CourseRepository } from '../../src/domain/ports/course-repository.port'
import type {
  EntitlementRepository,
  ListMembersFilter,
  ListMembersResult,
  MemberSummary,
} from '../../src/domain/ports/entitlement-repository.port'
import {
  type AwardInput,
  type AwardResult,
  type BuyStreakFreezeInput,
  type BuyStreakFreezeResult,
  type ClaimMissionInput,
  type ClaimMissionResult,
  type GamificationProfileRecord,
  type GamificationRanking,
  type GamificationRepository,
  type LeagueMembershipRecord,
  MAX_STREAK_FREEZES,
  type SpendCoinsInput,
  type SpendCoinsResult,
  type XpEventInput,
} from '../../src/domain/ports/gamification-repository.port'
import type { ParentReportRepository } from '../../src/domain/ports/parent-report-repository.port'
import type { ProcessedWebhookRepository } from '../../src/domain/ports/processed-webhook-repository.port'
import type {
  ProgressRepository,
  RecentLessonActivity,
} from '../../src/domain/ports/progress-repository.port'
import type {
  QuizAttemptRecord,
  QuizAttemptRepository,
  RecentQuizAttempt,
} from '../../src/domain/ports/quiz-attempt-repository.port'
import type { RoomRepository } from '../../src/domain/ports/room-repository.port'
import type {
  RecentStudioSubmission,
  StudioSubmissionCourseRow,
  StudioSubmissionDetail,
  StudioSubmissionGlobalFilter,
  StudioSubmissionGlobalRow,
  StudioSubmissionRecord,
  StudioSubmissionRepository,
  StudioSubmissionState,
  StudioSubmissionSummary,
} from '../../src/domain/ports/studio-submission-repository.port'
import type {
  AdminThreadsFilter,
  AppendMessageInput,
  EnsureThreadInput,
  TeacherMessageRecord,
  TeacherThreadRecord,
  TeacherThreadRepository,
  TeacherThreadSummary,
} from '../../src/domain/ports/teacher-thread-repository.port'
import type { VideoPositionRepository } from '../../src/domain/ports/video-position-repository.port'
import type { CourseRating } from '../../src/domain/rating/course-rating'
import type { RoomState } from '../../src/domain/room/room-catalog'

export const silentLogger: Logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
}

function cloneState(s: EntitlementState): EntitlementState {
  return { ...s, snapshot: { ...s.snapshot } }
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    )
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(',')}}`
  }
  return JSON.stringify(value) ?? 'undefined'
}

function shouldInvalidateBlockProgress(
  previous: LessonBlockContent,
  next: LessonBlockContent,
): boolean {
  const touchesGate =
    previous.kind === 'quiz' ||
    previous.kind === 'studio' ||
    next.kind === 'quiz' ||
    next.kind === 'studio'
  return touchesGate && stableJson(previous) !== stableJson(next)
}

function isActive(s: EntitlementState, now: Date): boolean {
  return s.status === 'active' && (s.expiresAt === null || s.expiresAt.getTime() > now.getTime())
}

function hasEntitlementUniqueConflict(a: EntitlementState, b: EntitlementState): boolean {
  return (
    a.idempotencyKey === b.idempotencyKey ||
    (a.userId === b.userId &&
      a.productId === b.productId &&
      a.sourceKind === b.sourceKind &&
      a.sourceId === b.sourceId)
  )
}

/** Vitalícia (expiresAt nulo) > validade mais distante. Espelha a ordenação do SQL. */
function isStrongerState(a: EntitlementState, b: EntitlementState): boolean {
  if (a.expiresAt === null) return true
  if (b.expiresAt === null) return false
  return a.expiresAt.getTime() > b.expiresAt.getTime()
}

export class InMemoryEntitlementRepository implements EntitlementRepository {
  readonly byId = new Map<string, EntitlementState>()

  async findByIdempotencyKey(key: string): Promise<EntitlementAggregate | null> {
    for (const s of this.byId.values()) {
      if (s.idempotencyKey === key) return EntitlementAggregate.restore(cloneState(s))
    }
    return null
  }

  async findById(id: string): Promise<EntitlementAggregate | null> {
    const s = this.byId.get(id)
    return s ? EntitlementAggregate.restore(cloneState(s)) : null
  }

  async save(e: EntitlementAggregate): Promise<boolean> {
    const s = e.toSnapshot()
    // Espelha os DOIS índices únicos do schema: idempotency_key E
    // (user_id, product_id, source_kind, source_id). Conflito em qualquer → no-op.
    for (const x of this.byId.values()) {
      if (hasEntitlementUniqueConflict(x, s)) return false
    }
    this.byId.set(s.id, cloneState(s))
    return true
  }

  async saveMany(items: EntitlementAggregate[]): Promise<boolean> {
    const snapshots = items.map((e) => e.toSnapshot())
    const staged: EntitlementState[] = []
    for (const s of snapshots) {
      for (const x of this.byId.values()) {
        if (hasEntitlementUniqueConflict(x, s)) return false
      }
      for (const x of staged) {
        if (hasEntitlementUniqueConflict(x, s)) return false
      }
      staged.push(s)
    }
    for (const s of staged) this.byId.set(s.id, cloneState(s))
    return true
  }

  async update(e: EntitlementAggregate): Promise<boolean> {
    const s = e.toSnapshot()
    const cur = this.byId.get(s.id)
    if (!cur || cur.version !== s.version) return false
    this.byId.set(s.id, cloneState({ ...s, version: s.version + 1 }))
    return true
  }

  async findActiveForCourse(
    userId: string,
    courseRef: string,
    now: Date,
    opts?: { masterType?: AccessType | null },
  ): Promise<EntitlementAggregate | null> {
    // Mirror do SQL: matrícula específica OU a chave-mestra da AUDIÊNCIA do curso
    // (`masterType` = all_courses p/ adult, all_kids_courses p/ kids); a mais forte.
    let strongest: EntitlementState | null = null
    for (const s of this.byId.values()) {
      const covers =
        (s.accessType === 'course' && s.courseRef === courseRef) ||
        (opts?.masterType != null && s.accessType === opts.masterType)
      if (s.userId === userId && covers && isActive(s, now)) {
        if (!strongest || isStrongerState(s, strongest)) strongest = s
      }
    }
    return strongest ? EntitlementAggregate.restore(cloneState(strongest)) : null
  }

  async listActiveByUser(userId: string, now: Date): Promise<EntitlementAggregate[]> {
    return [...this.byId.values()]
      .filter((s) => s.userId === userId && isActive(s, now))
      .map((s) => EntitlementAggregate.restore(cloneState(s)))
  }

  async listByUserId(userId: string): Promise<EntitlementAggregate[]> {
    return [...this.byId.values()]
      .filter((s) => s.userId === userId)
      .sort((a, b) => b.grantedAt.getTime() - a.grantedAt.getTime())
      .map((s) => EntitlementAggregate.restore(cloneState(s)))
  }

  /** Mirror do SQL: agrupa por user_id, filtra membership por HAVING, ordena/pagina. */
  async listMembers(filter: ListMembersFilter, now: Date): Promise<ListMembersResult> {
    const groups = new Map<string, EntitlementState[]>()
    for (const s of this.byId.values()) {
      const arr = groups.get(s.userId) ?? []
      arr.push(s)
      groups.set(s.userId, arr)
    }

    const summaries: MemberSummary[] = []
    for (const [userId, rows] of groups) {
      if (filter.status === 'active' && !rows.some((r) => isActive(r, now))) continue
      if (
        filter.status &&
        filter.status !== 'active' &&
        !rows.some((r) => r.status === filter.status)
      )
        continue
      if (filter.courseRef && !rows.some((r) => r.courseRef === filter.courseRef)) continue

      const lastGrantedAt = rows.reduce((a, b) =>
        a.grantedAt.getTime() >= b.grantedAt.getTime() ? a : b,
      ).grantedAt
      const courseRefs = [
        ...new Set(rows.map((r) => r.courseRef).filter((c): c is string => c !== null)),
      ]
      summaries.push({
        userId,
        totalCount: rows.length,
        activeCount: rows.filter((r) => isActive(r, now)).length,
        lastGrantedAt,
        courseRefs,
      })
    }

    summaries.sort((a, b) => {
      const d = b.lastGrantedAt.getTime() - a.lastGrantedAt.getTime()
      if (d !== 0) return d
      return a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0
    })

    return {
      items: summaries.slice(filter.offset, filter.offset + filter.limit),
      total: summaries.length,
    }
  }

  async revokeBySubscriptionId(
    subscriptionId: string,
    now: Date,
  ): Promise<{ affected: number; userIds: string[] }> {
    let affected = 0
    const userIds = new Set<string>()
    for (const s of this.byId.values()) {
      if (s.subscriptionId === subscriptionId && s.status !== 'revoked') {
        this.byId.set(s.id, {
          ...s,
          status: 'revoked',
          revokedAt: now,
          updatedAt: now,
          version: s.version + 1,
        })
        affected += 1
        userIds.add(s.userId)
      }
    }
    return { affected, userIds: [...userIds] }
  }

  async expireBySubscriptionId(
    subscriptionId: string,
    now: Date,
  ): Promise<{ affected: number; userIds: string[] }> {
    let affected = 0
    const userIds = new Set<string>()
    for (const s of this.byId.values()) {
      if (s.subscriptionId === subscriptionId && s.status !== 'revoked' && s.status !== 'expired') {
        this.byId.set(s.id, { ...s, status: 'expired', updatedAt: now, version: s.version + 1 })
        affected += 1
        userIds.add(s.userId)
      }
    }
    return { affected, userIds: [...userIds] }
  }

  seed(e: EntitlementAggregate): void {
    const s = e.toSnapshot()
    this.byId.set(s.id, cloneState(s))
  }
}

export class InMemoryCourseRepository implements CourseRepository, ContentAdminRepository {
  courses: Course[] = []
  modules: Module[] = []
  lessons: Lesson[] = []
  blocks: LessonBlock[] = []
  attachments: LessonAttachment[] = []
  onEvaluativeBlockContentChanged?: (blockId: string) => void

  async findCourseBySlug(slug: string): Promise<Course | null> {
    return this.courses.find((c) => c.slug === slug) ?? null
  }

  async findCourseById(id: string): Promise<Course | null> {
    return this.courses.find((c) => c.id === id) ?? null
  }

  async findLesson(lessonId: string): Promise<Lesson | null> {
    return this.lessons.find((l) => l.id === lessonId) ?? null
  }

  async findAccessibleCoursesBySlugs(slugs: string[]): Promise<Course[]> {
    const set = new Set(slugs)
    return this.courses.filter((c) => set.has(c.slug) && isCourseAccessible(c.status))
  }

  async findCoursesBySlugs(slugs: string[]): Promise<Course[]> {
    const set = new Set(slugs)
    return this.courses.filter((c) => set.has(c.slug))
  }

  async listPublishedCourses(audience: CourseAudience): Promise<Course[]> {
    return this.courses
      .filter((c) => c.status === 'published' && c.audience === audience)
      .sort((a, b) => a.title.localeCompare(b.title))
  }

  async findOutline(
    courseId: string,
    opts?: { publishedOnly?: boolean },
  ): Promise<ModuleWithLessons[]> {
    return this.modules
      .filter((m) => m.courseId === courseId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((m) => ({
        ...m,
        lessons: this.lessons
          .filter((l) => l.moduleId === m.id && (!opts?.publishedOnly || l.isPublished))
          .sort((a, b) => a.sortOrder - b.sortOrder),
      }))
  }

  async findOutlinesByCourseIds(
    courseIds: string[],
    opts?: { publishedOnly?: boolean },
  ): Promise<Map<string, ModuleWithLessons[]>> {
    const out = new Map<string, ModuleWithLessons[]>()
    for (const courseId of new Set(courseIds))
      out.set(courseId, await this.findOutline(courseId, opts))
    return out
  }

  async findLessonWithContent(
    lessonId: string,
    opts?: { includeAttachments?: boolean },
  ): Promise<LessonWithContent | null> {
    const lesson = this.lessons.find((l) => l.id === lessonId)
    if (!lesson) return null
    return {
      ...lesson,
      blocks: this.blocks
        .filter((b) => b.lessonId === lessonId)
        .sort((a, b) => a.sortOrder - b.sortOrder),
      attachments:
        opts?.includeAttachments === false
          ? []
          : this.attachments
              .filter((a) => a.lessonId === lessonId)
              .sort((a, b) => a.sortOrder - b.sortOrder),
    }
  }

  async countLessons(courseId: string): Promise<number> {
    return this.lessons.filter((l) => l.courseId === courseId).length
  }

  async countPublishedLessons(
    courseId: string,
    opts?: { excludeLessonId?: string; excludeModuleId?: string },
  ): Promise<number> {
    return this.lessons.filter(
      (l) =>
        l.courseId === courseId &&
        l.isPublished &&
        l.id !== opts?.excludeLessonId &&
        l.moduleId !== opts?.excludeModuleId,
    ).length
  }

  async listPublishedLessonIds(moduleId: string): Promise<string[]> {
    return this.lessons.filter((l) => l.moduleId === moduleId && l.isPublished).map((l) => l.id)
  }

  async findPrecedingStudioBlockInChain(
    courseId: string,
    lessonId: string,
    chain: string,
  ): Promise<{ blockId: string; lessonId: string } | null> {
    // Espelha a query Drizzle: aulas publicadas do curso ordenadas por
    // (module.sortOrder, lesson.sortOrder); varre para trás a partir da atual e,
    // dentro de cada aula, pega o bloco studio da cadeia com maior sortOrder.
    const ordered = this.lessons
      .filter((l) => l.courseId === courseId && l.isPublished)
      .map((l) => ({ l, modSort: this.modules.find((m) => m.id === l.moduleId)?.sortOrder ?? 0 }))
      .sort((a, b) => a.modSort - b.modSort || a.l.sortOrder - b.l.sortOrder)
    const curIdx = ordered.findIndex((x) => x.l.id === lessonId)
    if (curIdx < 0) return null
    // Da aula imediatamente anterior para trás (mesma ordem do `ORDER BY ... DESC`).
    for (const { l } of ordered.slice(0, curIdx).reverse()) {
      const block = this.blocks
        .filter((b) => b.lessonId === l.id && b.kind === 'studio')
        .sort((a, b) => b.sortOrder - a.sortOrder)
        // `trim` no valor armazenado (o serviço já passa `chain` trimado) — mirror do SQL.
        .find((b) => (b.content as { chain?: string }).chain?.trim() === chain)
      if (block) return { blockId: block.id, lessonId: l.id }
    }
    return null
  }

  async countLessonsByCourseIds(courseIds: string[]): Promise<Map<string, number>> {
    const set = new Set(courseIds)
    const out = new Map<string, number>()
    for (const l of this.lessons) {
      if (set.has(l.courseId)) out.set(l.courseId, (out.get(l.courseId) ?? 0) + 1)
    }
    return out
  }

  async countPublishedLessonsByCourseIds(courseIds: string[]): Promise<Map<string, number>> {
    const set = new Set(courseIds)
    const out = new Map<string, number>()
    for (const l of this.lessons) {
      if (set.has(l.courseId) && l.isPublished) {
        out.set(l.courseId, (out.get(l.courseId) ?? 0) + 1)
      }
    }
    return out
  }

  // ── ContentAdminRepository (autoria) — opera nos MESMOS arrays acima ──────
  async listCoursesAdmin(
    filter: ListCoursesAdminFilter,
  ): Promise<{ items: Course[]; total: number }> {
    let all = [...this.courses]
    const q = filter.q?.trim().toLowerCase()
    if (q) {
      all = all.filter((c) => c.title.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q))
    }
    if (filter.status) all = all.filter((c) => c.status === filter.status)
    if (filter.audience) all = all.filter((c) => c.audience === filter.audience)
    all.sort((a, b) => a.title.localeCompare(b.title))
    return { items: all.slice(filter.offset, filter.offset + filter.limit), total: all.length }
  }

  async createCourse(fields: CourseFields): Promise<Course> {
    if (this.courses.some((c) => c.slug === fields.slug)) throw new DuplicateSlugError()
    const now = new Date()
    // Mirror do SQL: `salesPageUrl` vira a chave do metadata (jsonb), não coluna;
    // `audience` ausente cai no default da coluna (`adult`).
    const { salesPageUrl, audience, sequentialLock, level, ...rest } = fields
    const course: Course = {
      id: randomUUID(),
      ...rest,
      audience: audience ?? 'adult',
      sequentialLock: sequentialLock ?? true,
      level: level ?? 'iniciante',
      metadata: salesPageUrl ? { salesPageUrl } : null,
      createdAt: now,
      updatedAt: now,
    }
    this.courses.push(course)
    return course
  }

  async updateCourse(course: Course): Promise<boolean> {
    const idx = this.courses.findIndex((c) => c.id === course.id)
    if (idx === -1) return false
    if (this.courses.some((c) => c.id !== course.id && c.slug === course.slug)) {
      throw new DuplicateSlugError()
    }
    this.courses[idx] = { ...course, updatedAt: new Date() }
    return true
  }

  async deleteCourse(id: string): Promise<boolean> {
    if (!this.courses.some((c) => c.id === id)) return false
    const lessonIds = new Set(this.lessons.filter((l) => l.courseId === id).map((l) => l.id))
    this.courses = this.courses.filter((c) => c.id !== id)
    this.modules = this.modules.filter((m) => m.courseId !== id)
    this.lessons = this.lessons.filter((l) => l.courseId !== id)
    this.blocks = this.blocks.filter((b) => !lessonIds.has(b.lessonId))
    this.attachments = this.attachments.filter((a) => !lessonIds.has(a.lessonId))
    return true
  }

  async findModuleById(id: string): Promise<Module | null> {
    return this.modules.find((m) => m.id === id) ?? null
  }

  async createModule(courseId: string, fields: ModuleFields): Promise<Module> {
    const sortOrder = this.modules
      .filter((m) => m.courseId === courseId)
      .reduce((mx, m) => Math.max(mx, m.sortOrder + 1), 0)
    const mod: Module = { id: randomUUID(), courseId, ...fields, sortOrder }
    this.modules.push(mod)
    return mod
  }

  async updateModule(id: string, fields: ModuleFields): Promise<Module | null> {
    const m = this.modules.find((x) => x.id === id)
    if (!m) return null
    m.title = fields.title
    m.summary = fields.summary
    return m
  }

  async deleteModule(id: string): Promise<boolean> {
    if (!this.modules.some((m) => m.id === id)) return false
    const lessonIds = new Set(this.lessons.filter((l) => l.moduleId === id).map((l) => l.id))
    this.modules = this.modules.filter((m) => m.id !== id)
    this.lessons = this.lessons.filter((l) => l.moduleId !== id)
    this.blocks = this.blocks.filter((b) => !lessonIds.has(b.lessonId))
    this.attachments = this.attachments.filter((a) => !lessonIds.has(a.lessonId))
    return true
  }

  async listModuleIds(courseId: string): Promise<string[]> {
    return this.modules
      .filter((m) => m.courseId === courseId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((m) => m.id)
  }

  async reorderModules(_courseId: string, orderedIds: string[]): Promise<void> {
    orderedIds.forEach((id, i) => {
      const m = this.modules.find((x) => x.id === id)
      if (m) m.sortOrder = i
    })
  }

  async findLessonById(id: string): Promise<Lesson | null> {
    return this.lessons.find((l) => l.id === id) ?? null
  }

  async createLesson(moduleId: string, courseId: string, fields: LessonFields): Promise<Lesson> {
    if (this.lessons.some((l) => l.courseId === courseId && l.slug === fields.slug)) {
      throw new DuplicateSlugError()
    }
    const sortOrder = this.lessons
      .filter((l) => l.moduleId === moduleId)
      .reduce((mx, l) => Math.max(mx, l.sortOrder + 1), 0)
    const lesson: Lesson = { id: randomUUID(), moduleId, courseId, ...fields, sortOrder }
    this.lessons.push(lesson)
    return lesson
  }

  async updateLesson(id: string, fields: LessonFields): Promise<Lesson | null> {
    const l = this.lessons.find((x) => x.id === id)
    if (!l) return null
    if (
      this.lessons.some((x) => x.id !== id && x.courseId === l.courseId && x.slug === fields.slug)
    ) {
      throw new DuplicateSlugError()
    }
    l.slug = fields.slug
    l.title = fields.title
    l.estimatedMinutes = fields.estimatedMinutes
    l.isPublished = fields.isPublished
    return l
  }

  async deleteLesson(id: string): Promise<boolean> {
    if (!this.lessons.some((l) => l.id === id)) return false
    this.lessons = this.lessons.filter((l) => l.id !== id)
    this.blocks = this.blocks.filter((b) => b.lessonId !== id)
    this.attachments = this.attachments.filter((a) => a.lessonId !== id)
    return true
  }

  async listLessonIds(moduleId: string): Promise<string[]> {
    return this.lessons
      .filter((l) => l.moduleId === moduleId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((l) => l.id)
  }

  async reorderLessons(_moduleId: string, orderedIds: string[]): Promise<void> {
    orderedIds.forEach((id, i) => {
      const l = this.lessons.find((x) => x.id === id)
      if (l) l.sortOrder = i
    })
  }

  async createBlock(
    lessonId: string,
    kind: LessonBlockKind,
    content: LessonBlockContent,
  ): Promise<LessonBlock> {
    const sortOrder = this.blocks
      .filter((b) => b.lessonId === lessonId)
      .reduce((mx, b) => Math.max(mx, b.sortOrder + 1), 0)
    const block: LessonBlock = { id: randomUUID(), lessonId, kind, sortOrder, content }
    this.blocks.push(block)
    return block
  }

  async updateBlock(
    id: string,
    kind: LessonBlockKind,
    content: LessonBlockContent,
  ): Promise<LessonBlock | null> {
    const b = this.blocks.find((x) => x.id === id)
    if (!b) return null
    const invalidateProgress = shouldInvalidateBlockProgress(b.content, content)
    b.kind = kind
    b.content = content
    if (invalidateProgress) this.onEvaluativeBlockContentChanged?.(id)
    return b
  }

  async deleteBlock(id: string): Promise<boolean> {
    const exists = this.blocks.some((b) => b.id === id)
    this.blocks = this.blocks.filter((b) => b.id !== id)
    return exists
  }

  async listBlockIds(lessonId: string): Promise<string[]> {
    return this.blocks
      .filter((b) => b.lessonId === lessonId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((b) => b.id)
  }

  async reorderBlocks(_lessonId: string, orderedIds: string[]): Promise<void> {
    orderedIds.forEach((id, i) => {
      const b = this.blocks.find((x) => x.id === id)
      if (b) b.sortOrder = i
    })
  }

  async findBlockCourseId(id: string): Promise<string | null> {
    const block = this.blocks.find((b) => b.id === id)
    if (!block) return null
    return this.lessons.find((l) => l.id === block.lessonId)?.courseId ?? null
  }

  async findBlockLessonId(id: string): Promise<string | null> {
    return this.blocks.find((b) => b.id === id)?.lessonId ?? null
  }

  async lessonHasCertificateBlock(lessonId: string): Promise<boolean> {
    return this.blocks.some((b) => b.lessonId === lessonId && b.content.kind === 'certificate')
  }

  async lessonHasGatingBlock(
    lessonId: string,
    opts: { excludeBlockId?: string } = {},
  ): Promise<boolean> {
    return this.blocks.some(
      (b) =>
        b.lessonId === lessonId &&
        b.id !== opts.excludeBlockId &&
        isCompletionGatingBlock(b.content),
    )
  }

  async countCertificateBlocks(
    courseId: string,
    opts: { excludeBlockId?: string } = {},
  ): Promise<number> {
    const lessonIds = new Set(this.lessons.filter((l) => l.courseId === courseId).map((l) => l.id))
    return this.blocks.filter(
      (b) =>
        b.content.kind === 'certificate' &&
        lessonIds.has(b.lessonId) &&
        b.id !== opts.excludeBlockId,
    ).length
  }

  async createAttachment(lessonId: string, fields: AttachmentFields): Promise<LessonAttachment> {
    const sortOrder = this.attachments
      .filter((a) => a.lessonId === lessonId)
      .reduce((mx, a) => Math.max(mx, a.sortOrder + 1), 0)
    const att: LessonAttachment = { id: randomUUID(), lessonId, ...fields, sortOrder }
    this.attachments.push(att)
    return att
  }

  async updateAttachment(id: string, fields: AttachmentFields): Promise<LessonAttachment | null> {
    const a = this.attachments.find((x) => x.id === id)
    if (!a) return null
    a.label = fields.label
    a.url = fields.url
    a.fileType = fields.fileType
    a.sizeBytes = fields.sizeBytes
    return a
  }

  async deleteAttachment(id: string): Promise<boolean> {
    const exists = this.attachments.some((a) => a.id === id)
    this.attachments = this.attachments.filter((a) => a.id !== id)
    return exists
  }

  async listAttachmentIds(lessonId: string): Promise<string[]> {
    return this.attachments
      .filter((a) => a.lessonId === lessonId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((a) => a.id)
  }

  async reorderAttachments(_lessonId: string, orderedIds: string[]): Promise<void> {
    orderedIds.forEach((id, i) => {
      const a = this.attachments.find((x) => x.id === id)
      if (a) a.sortOrder = i
    })
  }
}

interface Completion {
  userId: string
  lessonId: string
  courseId: string
  completedAt: Date
}

export class InMemoryProgressRepository implements ProgressRepository {
  readonly completions: Completion[] = []

  /** `lessonSource` espelha o join com `lessons.is_published` das contagens `*Published`. */
  constructor(private readonly lessonSource?: { lessons: Lesson[] }) {}

  async markComplete(
    userId: string,
    lessonId: string,
    courseId: string,
    now: Date,
  ): Promise<boolean> {
    if (this.completions.some((c) => c.userId === userId && c.lessonId === lessonId)) return false
    this.completions.push({ userId, lessonId, courseId, completedAt: now })
    return true
  }

  async countCompleted(userId: string, courseId: string): Promise<number> {
    return this.completions.filter((c) => c.userId === userId && c.courseId === courseId).length
  }

  async countCompletedByCourseIds(
    userId: string,
    courseIds: string[],
  ): Promise<Map<string, number>> {
    const set = new Set(courseIds)
    const out = new Map<string, number>()
    for (const c of this.completions) {
      if (c.userId === userId && set.has(c.courseId)) {
        out.set(c.courseId, (out.get(c.courseId) ?? 0) + 1)
      }
    }
    return out
  }

  /** Mirror do SQL: inner join com lessons publicadas. Sem source = tudo publicado. */
  private isPublished(lessonId: string): boolean {
    if (!this.lessonSource) return true
    return this.lessonSource.lessons.some((l) => l.id === lessonId && l.isPublished)
  }

  async countCompletedPublished(userId: string, courseId: string): Promise<number> {
    return this.completions.filter(
      (c) => c.userId === userId && c.courseId === courseId && this.isPublished(c.lessonId),
    ).length
  }

  async countCompletedPublishedByCourseIds(
    userId: string,
    courseIds: string[],
  ): Promise<Map<string, number>> {
    const set = new Set(courseIds)
    const out = new Map<string, number>()
    for (const c of this.completions) {
      if (c.userId === userId && set.has(c.courseId) && this.isPublished(c.lessonId)) {
        out.set(c.courseId, (out.get(c.courseId) ?? 0) + 1)
      }
    }
    return out
  }

  async listCompletedLessonIds(userId: string, courseId: string): Promise<string[]> {
    return this.completions
      .filter((c) => c.userId === userId && c.courseId === courseId)
      .map((c) => c.lessonId)
  }

  async listCompletedLessonIdsByCourseIds(
    userId: string,
    courseIds: string[],
  ): Promise<Map<string, string[]>> {
    const set = new Set(courseIds)
    const out = new Map<string, string[]>()
    for (const c of this.completions) {
      if (c.userId === userId && set.has(c.courseId)) {
        const arr = out.get(c.courseId) ?? []
        arr.push(c.lessonId)
        out.set(c.courseId, arr)
      }
    }
    return out
  }

  async lastCompletedAt(userId: string, courseId: string): Promise<Date | null> {
    const cs = this.completions.filter((c) => c.userId === userId && c.courseId === courseId)
    if (cs.length === 0) return null
    return cs.reduce((a, b) => (a.completedAt.getTime() >= b.completedAt.getTime() ? a : b))
      .completedAt
  }

  async listRecentCompletions(userId: string, limit: number): Promise<RecentLessonActivity[]> {
    return this.completions
      .filter((c) => c.userId === userId)
      .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
      .slice(0, limit)
      .map((c) => ({
        lessonId: c.lessonId,
        lessonTitle: this.lessonSource?.lessons.find((l) => l.id === c.lessonId)?.title ?? null,
        courseTitle: null,
        at: c.completedAt,
      }))
  }
}

/** Analytics de aprendizado em memória (espelha a lógica do Drizzle sobre cursos+conclusões). */
export class InMemoryAnalyticsRepository implements AnalyticsRepository {
  constructor(
    private readonly courseRepo: InMemoryCourseRepository,
    private readonly progress: InMemoryProgressRepository,
  ) {}

  private publishedLessonsOf(courseId: string): Lesson[] {
    return this.courseRepo.lessons.filter((l) => l.courseId === courseId && l.isPublished)
  }

  /** Conclusões de aulas AINDA publicadas (espelha o inner join do SQL). */
  private publishedCompletions() {
    const pubIds = new Set(this.courseRepo.lessons.filter((l) => l.isPublished).map((l) => l.id))
    return this.progress.completions.filter((c) => pubIds.has(c.lessonId))
  }

  async coursesWithLessonCounts(): Promise<CourseLessonCount[]> {
    return this.courseRepo.courses
      .filter((c) => c.status !== 'draft')
      .map((c) => ({
        courseId: c.id,
        courseRef: c.slug,
        title: c.title,
        audience: c.audience,
        status: c.status,
        publishedLessons: this.publishedLessonsOf(c.id).length,
      }))
      .sort((a, b) => a.title.localeCompare(b.title))
  }

  async startedCountsByCourse(): Promise<Map<string, number>> {
    const byCourse = new Map<string, Set<string>>()
    for (const c of this.publishedCompletions()) {
      const set = byCourse.get(c.courseId) ?? new Set<string>()
      set.add(c.userId)
      byCourse.set(c.courseId, set)
    }
    return new Map([...byCourse].map(([k, v]) => [k, v.size]))
  }

  async completedCountsByCourse(): Promise<Map<string, number>> {
    // done por (curso, aprendiz) sobre aulas publicadas.
    const done = new Map<string, Map<string, number>>()
    for (const c of this.publishedCompletions()) {
      const perUser = done.get(c.courseId) ?? new Map<string, number>()
      perUser.set(c.userId, (perUser.get(c.userId) ?? 0) + 1)
      done.set(c.courseId, perUser)
    }
    const out = new Map<string, number>()
    for (const [courseId, perUser] of done) {
      const total = this.publishedLessonsOf(courseId).length
      if (total === 0) continue
      let n = 0
      for (const v of perUser.values()) if (v >= total) n++
      if (n > 0) out.set(courseId, n)
    }
    return out
  }

  async lessonFunnel(courseId: string): Promise<LessonFunnelRow[]> {
    // Curso rascunho/inexistente → funil vazio (espelha o innerJoin não-rascunho do SQL).
    const course = this.courseRepo.courses.find((c) => c.id === courseId)
    if (!course || course.status === 'draft') return []
    const completionsByLesson = new Map<string, Set<string>>()
    for (const c of this.progress.completions) {
      const set = completionsByLesson.get(c.lessonId) ?? new Set<string>()
      set.add(c.userId)
      completionsByLesson.set(c.lessonId, set)
    }
    return this.publishedLessonsOf(courseId)
      .map((l) => ({
        l,
        mod: this.courseRepo.modules.find((m) => m.id === l.moduleId),
      }))
      .sort(
        (a, b) =>
          (a.mod?.sortOrder ?? 0) - (b.mod?.sortOrder ?? 0) || a.l.sortOrder - b.l.sortOrder,
      )
      .map(({ l, mod }) => ({
        lessonId: l.id,
        title: l.title,
        moduleTitle: mod?.title ?? '',
        completions: completionsByLesson.get(l.id)?.size ?? 0,
      }))
  }

  async startedAndCompletedForCourse(
    courseId: string,
  ): Promise<{ started: number; completed: number }> {
    const course = this.courseRepo.courses.find((c) => c.id === courseId)
    if (!course || course.status === 'draft') return { started: 0, completed: 0 }
    const total = this.publishedLessonsOf(courseId).length
    if (total === 0) return { started: 0, completed: 0 }
    const done = new Map<string, number>()
    for (const c of this.publishedCompletions()) {
      if (c.courseId !== courseId) continue
      done.set(c.userId, (done.get(c.userId) ?? 0) + 1)
    }
    let started = 0
    let completed = 0
    for (const v of done.values()) {
      started++
      if (v >= total) completed++
    }
    return { started, completed }
  }
}

interface PositionRow {
  userId: string
  lessonId: string
  courseId: string
  positionSeconds: number
  updatedAt: Date
}

export class InMemoryVideoPositionRepository implements VideoPositionRepository {
  readonly rows: PositionRow[] = []

  async upsert(
    userId: string,
    lessonId: string,
    courseId: string,
    positionSeconds: number,
    now: Date,
  ): Promise<void> {
    const existing = this.rows.find((r) => r.userId === userId && r.lessonId === lessonId)
    if (existing) {
      existing.positionSeconds = positionSeconds
      existing.updatedAt = now
      return
    }
    this.rows.push({ userId, lessonId, courseId, positionSeconds, updatedAt: now })
  }

  async findPosition(userId: string, lessonId: string): Promise<number | null> {
    const row = this.rows.find((r) => r.userId === userId && r.lessonId === lessonId)
    return row?.positionSeconds ?? null
  }

  async lastAccessedLessonId(userId: string, courseId: string): Promise<string | null> {
    const rows = this.rows.filter((r) => r.userId === userId && r.courseId === courseId)
    if (rows.length === 0) return null
    return rows.reduce((a, b) => (a.updatedAt.getTime() >= b.updatedAt.getTime() ? a : b)).lessonId
  }

  async lastAccessedByCourseIds(userId: string, courseIds: string[]): Promise<Map<string, string>> {
    const out = new Map<string, string>()
    for (const courseId of courseIds) {
      const lessonId = await this.lastAccessedLessonId(userId, courseId)
      if (lessonId) out.set(courseId, lessonId)
    }
    return out
  }

  async listRecentAccessed(userId: string, limit: number): Promise<RecentLessonActivity[]> {
    return this.rows
      .filter((r) => r.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, limit)
      .map((r) => ({ lessonId: r.lessonId, lessonTitle: null, courseTitle: null, at: r.updatedAt }))
  }
}

export class InMemoryCourseRatingRepository implements CourseRatingRepository {
  readonly rows: CourseRating[] = []

  async find(userId: string, courseId: string): Promise<CourseRating | null> {
    return this.rows.find((r) => r.userId === userId && r.courseId === courseId) ?? null
  }

  async upsert(
    userId: string,
    courseId: string,
    fields: CourseRatingUpsert,
    now: Date,
  ): Promise<CourseRating> {
    const existing = this.rows.find((r) => r.userId === userId && r.courseId === courseId)
    if (existing) {
      // Overwrite puro (ver port): `createdAt` preservado, `updatedAt` avança.
      Object.assign(existing, fields, { updatedAt: now })
      return existing
    }
    const row: CourseRating = {
      id: randomUUID(),
      userId,
      courseId,
      ...fields,
      createdAt: now,
      updatedAt: now,
    }
    this.rows.push(row)
    return row
  }

  async listByUser(userId: string): Promise<MemberCourseRating[]> {
    return this.rows
      .filter((r) => r.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .map((r) => ({ ...r, courseTitle: null, courseRef: null }))
  }
}

export class InMemoryQuizAttemptRepository implements QuizAttemptRepository {
  readonly attempts: QuizAttemptRecord[] = []

  deleteByBlockId(blockId: string): void {
    for (let i = this.attempts.length - 1; i >= 0; i--) {
      if (this.attempts[i]?.blockId === blockId) this.attempts.splice(i, 1)
    }
  }

  /** Mirror do SQL: com `guard`, re-checa o cooldown antes de gravar (atômico aqui — single-thread). */
  async save(attempt: QuizAttemptRecord, guard?: { cooldownMs: number }): Promise<boolean> {
    if (guard) {
      const mine = this.attempts
        .filter((a) => a.userId === attempt.userId && a.blockId === attempt.blockId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      const last = mine[0]
      const everPassed = mine.some((a) => a.passed)
      if (
        last &&
        !everPassed &&
        !last.passed &&
        last.createdAt.getTime() + guard.cooldownMs > attempt.createdAt.getTime()
      ) {
        return false
      }
    }
    this.attempts.push({ ...attempt, answers: { ...attempt.answers } })
    return true
  }

  /** Mirror do SQL: agrega o histórico por bloco (mais recente = última tentativa). */
  async summarizeByBlockIds(
    userId: string,
    blockIds: string[],
  ): Promise<Map<string, QuizAttemptSummary>> {
    const set = new Set(blockIds)
    const out = new Map<string, QuizAttemptSummary>()
    const sorted = [...this.attempts]
      .filter((a) => a.userId === userId && set.has(a.blockId))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    for (const a of sorted) {
      const existing = out.get(a.blockId)
      if (!existing) {
        out.set(a.blockId, {
          attemptsCount: 1,
          lastScore: a.score,
          lastPassed: a.passed,
          lastAttemptAt: a.createdAt,
          everPassed: a.passed,
        })
        continue
      }
      existing.attemptsCount += 1
      existing.everPassed = existing.everPassed || a.passed
    }
    return out
  }

  async listRecentByUser(userId: string, limit: number): Promise<RecentQuizAttempt[]> {
    return [...this.attempts]
      .filter((a) => a.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
      .map((a) => ({
        blockId: a.blockId,
        lessonId: a.lessonId,
        lessonTitle: null,
        courseTitle: null,
        score: a.score,
        passed: a.passed,
        createdAt: a.createdAt,
      }))
  }
}

export class InMemoryStudioSubmissionRepository implements StudioSubmissionRepository {
  readonly submissions: StudioSubmissionRecord[] = []

  /** Courses p/ resolver a audiência da entrega (countByUserAndAudience). */
  constructor(private readonly courses?: InMemoryCourseRepository) {}

  deleteByBlockId(blockId: string): void {
    for (let i = this.submissions.length - 1; i >= 0; i--) {
      if (this.submissions[i]?.blockId === blockId) this.submissions.splice(i, 1)
    }
  }

  /** Upsert por (user, block) — reenvio sobrescreve projeto/data/correção. */
  async upsert(
    submission: StudioSubmissionRecord,
    options?: { preservePassedAt?: boolean },
  ): Promise<void> {
    const existing = this.submissions.find(
      (s) => s.userId === submission.userId && s.blockId === submission.blockId,
    )
    if (existing) {
      existing.project = submission.project
      existing.submittedAt = submission.submittedAt
      existing.score = submission.score ?? null
      existing.results = submission.results ?? null
      existing.checkedAt = submission.checkedAt ?? null
      existing.passedAt =
        options?.preservePassedAt && existing.passedAt
          ? existing.passedAt
          : (submission.passedAt ?? null)
      existing.message = submission.message ?? null
    } else {
      this.submissions.push({
        ...submission,
        score: submission.score ?? null,
        results: submission.results ?? null,
        checkedAt: submission.checkedAt ?? null,
        passedAt: submission.passedAt ?? null,
        message: submission.message ?? null,
      })
    }
  }

  async summarizeByBlockIds(
    userId: string,
    blockIds: string[],
  ): Promise<Map<string, StudioSubmissionState>> {
    const set = new Set(blockIds)
    const map = new Map<string, StudioSubmissionState>()
    for (const s of this.submissions) {
      if (s.userId !== userId || !set.has(s.blockId)) continue
      map.set(s.blockId, {
        submittedAt: s.submittedAt,
        score: s.score ?? null,
        passed: s.passedAt != null,
      })
    }
    return map
  }

  async listByBlock(blockId: string): Promise<StudioSubmissionSummary[]> {
    return this.submissions
      .filter((s) => s.blockId === blockId)
      .sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime())
      .map((s) => ({
        userId: s.userId,
        accountId: s.accountId ?? null,
        submittedAt: s.submittedAt,
        score: s.score ?? null,
        checkedAt: s.checkedAt ?? null,
        passed: s.passedAt != null,
        message: s.message ?? null,
      }))
  }

  async listByCourse(courseId: string): Promise<StudioSubmissionCourseRow[]> {
    const rows = this.submissions
      .filter((s) => s.courseId === courseId)
      .map((s) => {
        const lesson = this.courses?.lessons.find((l) => l.id === s.lessonId)
        const mod = lesson ? this.courses?.modules.find((m) => m.id === lesson.moduleId) : undefined
        return {
          moduleSort: mod?.sortOrder ?? 0,
          lessonSort: lesson?.sortOrder ?? 0,
          row: {
            userId: s.userId,
            accountId: s.accountId ?? null,
            blockId: s.blockId,
            lessonId: s.lessonId,
            lessonTitle: lesson?.title ?? '',
            moduleTitle: mod?.title ?? '',
            submittedAt: s.submittedAt,
            score: s.score ?? null,
            checkedAt: s.checkedAt ?? null,
            passed: s.passedAt != null,
            message: s.message ?? null,
          } satisfies StudioSubmissionCourseRow,
        }
      })
    rows.sort(
      (a, b) =>
        a.moduleSort - b.moduleSort ||
        a.lessonSort - b.lessonSort ||
        a.row.submittedAt.getTime() - b.row.submittedAt.getTime(),
    )
    return rows.map((r) => r.row)
  }

  /**
   * Entregas "respondidas" na fila global (`${userId}:${blockId}`). O REAL deriva
   * de teacher_threads (mensagem do professor após o envio) — no fake o teste
   * marca explicitamente; a semântica SQL é coberta pela QA integrada.
   */
  readonly answeredKeys = new Set<string>()

  async listAll(
    filter: StudioSubmissionGlobalFilter,
  ): Promise<{ items: StudioSubmissionGlobalRow[]; total: number }> {
    const all = this.submissions
      .map((s) => {
        const lesson = this.courses?.lessons.find((l) => l.id === s.lessonId)
        const mod = lesson ? this.courses?.modules.find((m) => m.id === lesson.moduleId) : undefined
        const course = this.courses?.courses.find((c) => c.id === s.courseId)
        return {
          userId: s.userId,
          accountId: s.accountId ?? null,
          blockId: s.blockId,
          lessonId: s.lessonId,
          lessonTitle: lesson?.title ?? '',
          moduleTitle: mod?.title ?? '',
          courseId: s.courseId,
          courseTitle: course?.title ?? '',
          audience: course?.audience ?? 'adult',
          submittedAt: s.submittedAt,
          score: s.score ?? null,
          checkedAt: s.checkedAt ?? null,
          passed: s.passedAt != null,
          message: s.message ?? null,
          answered: this.answeredKeys.has(`${s.userId}:${s.blockId}`),
        } satisfies StudioSubmissionGlobalRow
      })
      .filter((r) => !filter.courseId || r.courseId === filter.courseId)
      .filter((r) => !filter.audience || r.audience === filter.audience)
      .filter((r) =>
        filter.status === 'pending'
          ? !r.answered
          : filter.status === 'answered'
            ? r.answered
            : true,
      )
      // Pendentes primeiro, depois as mais recentes (espelha o repo real).
      .sort(
        (a, b) =>
          Number(a.answered) - Number(b.answered) ||
          b.submittedAt.getTime() - a.submittedAt.getTime(),
      )
    return { items: all.slice(filter.offset, filter.offset + filter.limit), total: all.length }
  }

  async getOne(userId: string, blockId: string): Promise<StudioSubmissionDetail | null> {
    const s = this.submissions.find((x) => x.userId === userId && x.blockId === blockId)
    return s
      ? {
          project: s.project,
          submittedAt: s.submittedAt,
          score: s.score ?? null,
          results: s.results ?? null,
          checkedAt: s.checkedAt ?? null,
          passedAt: s.passedAt ?? null,
          message: s.message ?? null,
        }
      : null
  }

  async countByUserAndAudience(userId: string, audience: CourseAudience): Promise<number> {
    return this.submissions.filter((s) => {
      if (s.userId !== userId) return false
      const course = this.courses?.courses.find((c) => c.id === s.courseId)
      return course?.audience === audience
    }).length
  }

  async countSubmittedInPeriodByAudience(
    userId: string,
    audience: CourseAudience,
    from: Date,
    to: Date,
  ): Promise<number> {
    return this.submissions.filter((s) => {
      if (s.userId !== userId) return false
      if (s.submittedAt < from || s.submittedAt >= to) return false
      const course = this.courses?.courses.find((c) => c.id === s.courseId)
      return course?.audience === audience
    }).length
  }

  async listAccountsSubmittedInPeriod(
    audience: CourseAudience,
    from: Date,
    to: Date,
  ): Promise<string[]> {
    const accounts = new Set<string>()
    for (const s of this.submissions) {
      if (s.submittedAt < from || s.submittedAt >= to) continue
      const course = this.courses?.courses.find((c) => c.id === s.courseId)
      if (course?.audience !== audience) continue
      if (s.accountId) accounts.add(s.accountId)
    }
    return [...accounts]
  }

  async listRecentByUser(userId: string, limit: number): Promise<RecentStudioSubmission[]> {
    return this.submissions
      .filter((s) => s.userId === userId)
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
      .slice(0, limit)
      .map((s) => ({
        blockId: s.blockId,
        lessonId: s.lessonId,
        lessonTitle: null,
        courseTitle: this.courses?.courses.find((c) => c.id === s.courseId)?.title ?? null,
        score: s.score ?? null,
        passed: s.passedAt != null,
        submittedAt: s.submittedAt,
        message: s.message ?? null,
      }))
  }
}

/** Fake das conversas professor↔aluno (mirror do Drizzle: watermark de não-lido). */
export class InMemoryTeacherThreadRepository implements TeacherThreadRepository {
  readonly threads: TeacherThreadRecord[] = []
  readonly messages: TeacherMessageRecord[] = []

  async ensureThread(input: EnsureThreadInput): Promise<string> {
    if (input.contextType !== 'general' && input.contextRef != null) {
      const existing = this.threads.find(
        (t) =>
          t.userId === input.userId &&
          t.contextType === input.contextType &&
          t.contextRef === input.contextRef,
      )
      if (existing) return existing.id
    }
    const id = randomUUID()
    this.threads.push({
      id,
      userId: input.userId,
      accountId: input.accountId ?? null,
      audience: input.audience,
      contextType: input.contextType,
      contextRef: input.contextRef ?? null,
      courseId: input.courseId ?? null,
      lessonId: input.lessonId ?? null,
      title: input.title ?? null,
      lastMessageAt: input.now,
      studentLastReadAt: null,
      teacherLastReadAt: null,
      createdAt: input.now,
    })
    return id
  }

  async appendMessage(input: AppendMessageInput): Promise<TeacherMessageRecord> {
    // Id determinístico (webhook do Mural) já presente → idempotente (retry não duplica).
    if (input.messageId) {
      const dup = this.messages.find((m) => m.id === input.messageId)
      if (dup) return dup
    }
    const record: TeacherMessageRecord = {
      id: input.messageId ?? randomUUID(),
      threadId: input.threadId,
      authorRole: input.authorRole,
      authorId: input.authorId ?? null,
      authorName: input.authorName ?? null,
      body: input.body,
      createdAt: input.now,
    }
    this.messages.push(record)
    const thread = this.threads.find((t) => t.id === input.threadId)
    if (thread) {
      thread.lastMessageAt = input.now
      if (input.authorRole === 'teacher') thread.teacherLastReadAt = input.now
      else thread.studentLastReadAt = input.now
    }
    return record
  }

  async findById(id: string): Promise<TeacherThreadRecord | null> {
    return this.threads.find((t) => t.id === id) ?? null
  }

  async findByContext(
    userId: string,
    contextType: TeacherThreadRecord['contextType'],
    contextRef: string,
  ): Promise<TeacherThreadRecord | null> {
    return (
      this.threads.find(
        (t) => t.userId === userId && t.contextType === contextType && t.contextRef === contextRef,
      ) ?? null
    )
  }

  async listMessages(threadId: string): Promise<TeacherMessageRecord[]> {
    return this.messages
      .filter((m) => m.threadId === threadId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  }

  async listForStudent(
    userId: string,
    audience: CourseAudience,
    limit: number,
    offset: number,
  ): Promise<TeacherThreadSummary[]> {
    return this.threads
      .filter((t) => t.userId === userId && t.audience === audience)
      .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime())
      .slice(offset, offset + limit)
      .map((t) => this.toSummary(t, 'student'))
  }

  async listForAdmin(filter: AdminThreadsFilter): Promise<TeacherThreadSummary[]> {
    return this.threads
      .filter((t) => {
        if (filter.audience && t.audience !== filter.audience) return false
        if (filter.contextType && t.contextType !== filter.contextType) return false
        if (filter.courseId && t.courseId !== filter.courseId) return false
        if (filter.unreadOnly && !this.unreadFor(t, 'teacher')) return false
        return true
      })
      .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime())
      .slice(filter.offset, filter.offset + filter.limit)
      .map((t) => this.toSummary(t, 'teacher'))
  }

  async countUnreadForStudent(userId: string, audience: CourseAudience): Promise<number> {
    return this.threads.filter(
      (t) => t.userId === userId && t.audience === audience && this.unreadFor(t, 'student'),
    ).length
  }

  async markReadByStudent(threadId: string, userId: string, now: Date): Promise<void> {
    const t = this.threads.find((x) => x.id === threadId && x.userId === userId)
    if (t) t.studentLastReadAt = now
  }

  async markReadByTeacher(threadId: string, now: Date): Promise<void> {
    const t = this.threads.find((x) => x.id === threadId)
    if (t) t.teacherLastReadAt = now
  }

  private unreadFor(thread: TeacherThreadRecord, side: 'student' | 'teacher'): boolean {
    const watermark = side === 'student' ? thread.studentLastReadAt : thread.teacherLastReadAt
    const fromRole = side === 'student' ? 'teacher' : 'student'
    return this.messages.some(
      (m) =>
        m.threadId === thread.id &&
        m.authorRole === fromRole &&
        (!watermark || m.createdAt > watermark),
    )
  }

  private toSummary(
    thread: TeacherThreadRecord,
    side: 'student' | 'teacher',
  ): TeacherThreadSummary {
    const msgs = this.messages
      .filter((m) => m.threadId === thread.id)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    const last = msgs[msgs.length - 1]
    return {
      id: thread.id,
      userId: thread.userId,
      accountId: thread.accountId,
      audience: thread.audience,
      contextType: thread.contextType,
      contextRef: thread.contextRef,
      courseId: thread.courseId,
      lessonId: thread.lessonId,
      title: thread.title,
      lastMessageAt: thread.lastMessageAt,
      createdAt: thread.createdAt,
      lastMessagePreview: last ? last.body.slice(0, 140) : null,
      lastMessageRole: last ? last.authorRole : null,
      messageCount: msgs.length,
      unread: this.unreadFor(thread, side),
    }
  }
}

interface XpEventRow extends XpEventInput {
  userId: string
  audience: CourseAudience
  /**
   * Snapshot da dificuldade do curso nos marcos de curso (mirror de `xp_events.source_level`).
   * Opcional: fixtures de teste que empurram eventos crus (não-curso) não precisam setá-lo.
   */
  sourceLevel?: CourseLevel | null
  createdAt: Date
}

interface CoinEventRow {
  userId: string
  audience: CourseAudience
  sourceType: string
  sourceId: string
  amount: number
  balanceAfter: number
  createdAt: Date
}

// Mirror do COIN_TYPE_FOR_XP do Drizzle (tipo de XP de rotina → tipo de moeda).
const COIN_TYPE_FOR_XP: Partial<Record<XpEventInput['sourceType'], string>> = {
  lesson_complete: 'lesson_complete',
  quiz_passed: 'quiz_passed',
  unit_complete: 'unit_complete',
  studio_passed: 'studio_passed',
  pensa_stage_complete: 'pensa_stage_complete',
  pensa_cycle_complete: 'pensa_cycle_complete',
  studio_publish_day: 'studio_publish_day',
}

/**
 * Mirror da transação do Drizzle: ledger idempotente + streak + badges —
 * TUDO segregado por vitrine (perfil/badges/contagens chaveiam user+audience).
 */
export class InMemoryGamificationRepository implements GamificationRepository {
  readonly events: XpEventRow[] = []
  readonly profiles = new Map<string, GamificationProfileRecord>()
  /** Ledger de moeda (faucet + sink) — espelha `coin_events` (idempotência/saldo). */
  readonly coinEvents: CoinEventRow[] = []
  /** Acumulado do teto diário + lifetime por perfil (chave `userId:audience`). */
  readonly wallets = new Map<
    string,
    { earnedToday: number; earnedDate: string | null; lifetime: number }
  >()
  /** Mirror da coluna `account_id` por perfil (chave `userId:audience` → conta). */
  readonly accountIds = new Map<string, string>()
  /** Mês do último freeze grátis concedido (`freeze_granted_month`), por perfil. */
  readonly freezeMonths = new Map<string, string>()
  /** Resgates de missão (`<slug>:<periodKey>` por perfil) — idempotência do prêmio. */
  readonly missionClaims = new Map<string, Set<string>>()
  /** Memberships de liga (tier por semana) — espelha `league_membership`. */
  readonly leagueMemberships: {
    userId: string
    accountId: string
    audience: CourseAudience
    weekKey: string
    tier: string
  }[] = []
  readonly badges: {
    userId: string
    audience: CourseAudience
    badgeSlug: string
    unlockedAt: Date
  }[] = []
  /** Mirror da coluna `privileged` do perfil (equipe fora do ranking). */
  readonly privilegedUsers = new Set<string>()
  /** Simula indisponibilidade (testa o fail-open dos services). */
  failAlways = false

  /** Fontes p/ a coorte do ranking (mirror do join entitlements×courses). */
  constructor(
    private readonly sources?: {
      entitlements: InMemoryEntitlementRepository
      courses: InMemoryCourseRepository
      // Inventários p/ a compra ATÔMICA (`spendCoins` + posse na mesma "transação" — mirror
      // do prod, onde os repos partilham o `db`). Opcionais: testes de erro não os exigem.
      avatar?: InMemoryAvatarRepository
      room?: InMemoryRoomRepository
    },
  ) {}

  private profileKey(userId: string, audience: CourseAudience): string {
    return `${userId}:${audience}`
  }

  private accountHasActiveAudienceAccess(
    accountId: string,
    audience: CourseAudience,
    now: Date,
  ): boolean {
    const masterType = audience === 'adult' ? 'all_courses' : 'all_kids_courses'
    for (const e of this.sources?.entitlements.byId.values() ?? []) {
      if (e.userId !== accountId || !isActive(e, now)) continue
      const course = this.sources?.courses.courses.find((c) => c.slug === e.courseRef)
      if (
        (e.accessType === 'course' && course?.audience === audience) ||
        e.accessType === masterType
      )
        return true
    }
    return false
  }

  async award(input: AwardInput): Promise<AwardResult> {
    if (this.failAlways) throw new Error('gamification indisponível (fake)')

    const newEvents: XpEventInput[] = []
    for (const e of input.events) {
      // UNIQUE continua (user, sourceType, sourceId) — um source pertence a UM curso.
      const dup = this.events.some(
        (x) =>
          x.userId === input.userId && x.sourceType === e.sourceType && x.sourceId === e.sourceId,
      )
      if (dup) continue
      // Mirror do SQL: congela `courses.level` nos marcos de curso (rank não regride).
      const sourceLevel =
        e.sourceType === 'course_complete' || e.sourceType === 'course_showcased'
          ? (this.sources?.courses.courses.find((c) => c.id === e.sourceId)?.level ?? null)
          : null
      this.events.push({
        ...e,
        userId: input.userId,
        audience: input.audience,
        sourceLevel,
        createdAt: input.now,
      })
      newEvents.push(e)
    }

    const badgeCandidates = new Set<BadgeSlug>()
    const countByType = (type: XpEventInput['sourceType']) =>
      this.events.filter(
        (x) => x.userId === input.userId && x.audience === input.audience && x.sourceType === type,
      ).length
    if (newEvents.some((e) => e.sourceType === 'lesson_complete')) {
      if (countByType('lesson_complete') === 1) badgeCandidates.add('first-lesson')
    }
    if (newEvents.some((e) => e.sourceType === 'course_complete')) {
      for (const slug of courseBadgeSlugs(countByType('course_complete'))) {
        badgeCandidates.add(slug)
      }
    }
    if (newEvents.some((e) => e.sourceType === 'quiz_perfect')) {
      for (const slug of quizPerfectBadgeSlugs(countByType('quiz_perfect'))) {
        badgeCandidates.add(slug)
      }
    }
    if (newEvents.some((e) => e.sourceType === 'studio_passed')) {
      for (const slug of studioMasteryBadgeSlugs(countByType('studio_passed'))) {
        badgeCandidates.add(slug)
      }
    }
    // 1º jogo publicado no Mural (mirror do Drizzle — marco `course_showcased`).
    if (newEvents.some((e) => e.sourceType === 'course_showcased')) {
      for (const slug of showcaseBadgeSlugs(countByType('course_showcased'))) {
        badgeCandidates.add(slug)
      }
    }
    // Pensa (mirror do Drizzle): 1ª etapa (Carta da Ideia) + 1º/3º ciclo lançado.
    if (newEvents.some((e) => e.sourceType === 'pensa_stage_complete')) {
      for (const slug of pensaStageBadgeSlugs(countByType('pensa_stage_complete'))) {
        badgeCandidates.add(slug)
      }
    }
    if (newEvents.some((e) => e.sourceType === 'pensa_cycle_complete')) {
      for (const slug of pensaCycleBadgeSlugs(countByType('pensa_cycle_complete'))) {
        badgeCandidates.add(slug)
      }
    }
    // Desafio do mês (mirror do Drizzle — 1ª participação = challenge-first).
    if (newEvents.some((e) => e.sourceType === 'challenge_entry')) {
      for (const slug of challengeBadgeSlugs(countByType('challenge_entry'))) {
        badgeCandidates.add(slug)
      }
    }
    // Clube (mirror do Drizzle — 1ª conversa aprovada = clube-primeiro-post).
    if (newEvents.some((e) => e.sourceType === 'clube_thread')) {
      for (const slug of clubeBadgeSlugs(countByType('clube_thread'))) {
        badgeCandidates.add(slug)
      }
    }
    // Jogadas recebidas (mirror do Drizzle — jogo cruzou 10/100 plays no /jogar).
    if (
      newEvents.some(
        (e) => e.sourceType === 'play_milestone_10' || e.sourceType === 'play_milestone_100',
      )
    ) {
      for (const slug of playsBadgeSlugs(
        countByType('play_milestone_10'),
        countByType('play_milestone_100'),
      )) {
        badgeCandidates.add(slug)
      }
    }

    const key = this.profileKey(input.userId, input.audience)
    const profile = this.profiles.get(key)
    const xpAwarded = newEvents.reduce((sum, e) => sum + e.amount, 0)
    let totalXp = profile?.xp ?? 0
    let streak = {
      current: profile?.streakCurrent ?? 0,
      best: profile?.streakBest ?? 0,
      extended: false,
      freezesConsumed: 0,
    }
    let coinsAwarded = 0
    let coinBalance = profile?.coinBalance ?? 0
    let coinsCapped = false

    // Streak só com XP REAL novo (amount > 0) — MARCO não move (mirror do SQL).
    // A carteira Zappy também só ganha aqui (faucets têm amount > 0).
    if (newEvents.some((e) => e.amount > 0)) {
      // Freeze grátis do mês (lazy/idempotente; só entra se houver espaço no teto, e o
      // mês só é MARCADO quando entra) — mirror do Drizzle.
      const monthKey = input.today.slice(0, 7)
      const currentFreezes = profile?.streakFreezes ?? 0
      const grantsFreeFreeze =
        this.freezeMonths.get(key) !== monthKey && currentFreezes < MAX_STREAK_FREEZES
      const freezesBefore = currentFreezes + (grantsFreeFreeze ? 1 : 0)
      streak = advanceStreak(
        {
          streakCurrent: profile?.streakCurrent ?? 0,
          streakBest: profile?.streakBest ?? 0,
          lastActivityDate: profile?.lastActivityDate ?? null,
          freezes: freezesBefore,
          vacationFrom: profile?.vacationFrom ?? null,
          vacationTo: profile?.vacationTo ?? null,
        },
        input.today,
      )
      const freezesAfter = freezesBefore - streak.freezesConsumed
      if (grantsFreeFreeze) this.freezeMonths.set(key, monthKey)
      totalXp += xpAwarded

      // Carteira Zappy (mirror do Drizzle): rotina (conta no teto) + marco de streak (exempto).
      const routine = newEvents.flatMap((e) => {
        const coinType = COIN_TYPE_FOR_XP[e.sourceType]
        return coinType && (e.coins ?? 0) > 0
          ? [{ sourceType: coinType, sourceId: e.sourceId, amount: e.coins as number }]
          : []
      })
      const milestones = streak.extended
        ? streakMilestoneCoins(streak.current).map((m) => ({
            sourceType: 'streak_milestone',
            sourceId: m.sourceId,
            amount: m.amount,
          }))
        : []
      const wallet = this.wallets.get(key) ?? { earnedToday: 0, earnedDate: null, lifetime: 0 }
      const earnedTodayBase = wallet.earnedDate === input.today ? wallet.earnedToday : 0
      const cap = applyDailyCap(
        routine.map((c) => c.amount),
        earnedTodayBase,
        DAILY_COIN_CAP,
      )
      coinsCapped = cap.capped
      const grants: { sourceType: string; sourceId: string; amount: number }[] = []
      routine.forEach((c, i) => {
        const give = cap.granted[i] ?? 0
        if (give > 0) grants.push({ ...c, amount: give })
      })
      grants.push(...milestones)
      let running = profile?.coinBalance ?? 0
      for (const g of grants) {
        const dup = this.coinEvents.some(
          (ce) =>
            ce.userId === input.userId &&
            ce.audience === input.audience &&
            ce.sourceType === g.sourceType &&
            ce.sourceId === g.sourceId,
        )
        if (dup) continue
        running += g.amount
        coinsAwarded += g.amount
        this.coinEvents.push({
          userId: input.userId,
          audience: input.audience,
          sourceType: g.sourceType,
          sourceId: g.sourceId,
          amount: g.amount,
          balanceAfter: running,
          createdAt: input.now,
        })
      }
      coinBalance = (profile?.coinBalance ?? 0) + coinsAwarded
      const newLifetime = wallet.lifetime + coinsAwarded
      this.wallets.set(key, {
        earnedToday: earnedTodayBase + cap.totalGranted,
        earnedDate: input.today,
        lifetime: newLifetime,
      })

      this.profiles.set(key, {
        userId: input.userId,
        accountId: input.accountId,
        xp: totalXp,
        streakCurrent: streak.current,
        streakBest: streak.best,
        lastActivityDate: input.today,
        coinBalance,
        streakFreezes: freezesAfter,
        // Férias é preservada (set/limpa só via setVacation) — award nunca a altera.
        vacationFrom: profile?.vacationFrom ?? null,
        vacationTo: profile?.vacationTo ?? null,
      })
      this.accountIds.set(key, input.accountId)
      if (input.privileged) this.privilegedUsers.add(input.userId)
      else this.privilegedUsers.delete(input.userId)
      for (const slug of streakBadgeSlugs(streak.current)) badgeCandidates.add(slug)
      for (const slug of coinsSaverBadgeSlugs(newLifetime)) badgeCandidates.add(slug)
    }

    const badgesUnlocked: { slug: string; unlockedAt: Date }[] = []
    for (const slug of badgeCandidates) {
      const dup = this.badges.some(
        (b) => b.userId === input.userId && b.audience === input.audience && b.badgeSlug === slug,
      )
      if (dup) continue
      this.badges.push({
        userId: input.userId,
        audience: input.audience,
        badgeSlug: slug,
        unlockedAt: input.now,
      })
      badgesUnlocked.push({ slug, unlockedAt: input.now })
    }

    return {
      xpAwarded,
      totalXp,
      streak,
      newEvents,
      badgesUnlocked,
      coinsAwarded,
      coinBalance,
      coinsCapped,
    }
  }

  async spendCoins(input: SpendCoinsInput): Promise<SpendCoinsResult> {
    const key = this.profileKey(input.userId, input.audience)
    const existing = this.coinEvents.some(
      (ce) =>
        ce.userId === input.userId &&
        ce.audience === input.audience &&
        ce.sourceType === input.reason &&
        ce.sourceId === input.idempotencyKey,
    )
    const profile = this.profiles.get(key)
    const balance = profile?.coinBalance ?? 0
    // Posse concedida junto com o gasto (atômico no prod); idempotente + também no ALREADY_SPENT.
    const grantInventory = async () => {
      const g = input.grantInventory
      if (!g) return
      const repo = g.scope === 'avatar' ? this.sources?.avatar : this.sources?.room
      await repo?.addToInventory(input.userId, input.audience, g.itemId, input.now)
    }
    if (existing) {
      await grantInventory()
      return { ok: false, code: 'ALREADY_SPENT', balance }
    }
    if (balance < input.amount) return { ok: false, code: 'INSUFFICIENT_BALANCE', balance }
    const balanceAfter = balance - input.amount
    this.coinEvents.push({
      userId: input.userId,
      audience: input.audience,
      sourceType: input.reason,
      sourceId: input.idempotencyKey,
      amount: -input.amount,
      balanceAfter,
      createdAt: input.now,
    })
    // profile existe (balance ≥ amount > 0).
    this.profiles.set(key, { ...(profile as GamificationProfileRecord), coinBalance: balanceAfter })
    await grantInventory()
    return { ok: true, balanceAfter }
  }

  async getBalance(userId: string, audience: CourseAudience): Promise<number> {
    return this.profiles.get(this.profileKey(userId, audience))?.coinBalance ?? 0
  }

  async hasXpEvent(
    userId: string,
    audience: CourseAudience,
    sourceType: XpEventInput['sourceType'],
    sourceId: string,
  ): Promise<boolean> {
    return this.events.some(
      (e) =>
        e.userId === userId &&
        e.audience === audience &&
        e.sourceType === sourceType &&
        e.sourceId === sourceId,
    )
  }

  async getProfile(
    userId: string,
    audience: CourseAudience,
  ): Promise<GamificationProfileRecord | null> {
    const key = this.profileKey(userId, audience)
    const rec = this.profiles.get(key)
    if (!rec) return null
    // `freezeGrantedMonth` mora num mapa à parte no fake — mirror do que o Drizzle lê da coluna.
    return { ...rec, freezeGrantedMonth: this.freezeMonths.get(key) ?? null }
  }

  async listByAccount(
    accountId: string,
    userIds: string[],
    audience: CourseAudience,
  ): Promise<GamificationProfileRecord[]> {
    const out: GamificationProfileRecord[] = []
    for (const userId of userIds) {
      const key = this.profileKey(userId, audience)
      const rec = this.profiles.get(key)
      // Mirror do filtro SQL `account_id = ?` — perfil de outra conta não volta. O
      // `freezeGrantedMonth` mora num mapa à parte (igual ao `getProfile`) — anexa p/ o
      // streak de EXIBIÇÃO da área dos pais projetar o freeze grátis do mês.
      if (rec && this.accountIds.get(key) === accountId) {
        out.push({ ...rec, freezeGrantedMonth: this.freezeMonths.get(key) ?? null })
      }
    }
    return out
  }

  async listBadges(
    userId: string,
    audience: CourseAudience,
  ): Promise<{ badgeSlug: string; unlockedAt: Date }[]> {
    return this.badges
      .filter((b) => b.userId === userId && b.audience === audience)
      .map((b) => ({ badgeSlug: b.badgeSlug, unlockedAt: b.unlockedAt }))
  }

  /** Mirror do SQL: cursos com AMBOS os marcos (complete ∩ showcased) por dificuldade. */
  async countQualifyingCoursesByLevel(
    userId: string,
    audience: CourseAudience,
  ): Promise<QualifyingByLevel> {
    const mine = this.events.filter((e) => e.userId === userId && e.audience === audience)
    const completed = mine.filter((e) => e.sourceType === 'course_complete')
    const showcasedByCourse = new Map(
      mine.filter((e) => e.sourceType === 'course_showcased').map((e) => [e.sourceId, e]),
    )
    const result: QualifyingByLevel = { iniciante: 0, intermediario: 0, avancado: 0 }
    for (const ce of completed) {
      const sc = showcasedByCourse.get(ce.sourceId)
      if (!sc) continue
      // Mirror do COALESCE(showcased.source_level, complete.source_level, courses.level):
      // o snapshot congelado vence; `courses.level` ao vivo é só fallback legado.
      const level =
        sc.sourceLevel ??
        ce.sourceLevel ??
        this.sources?.courses.courses.find((c) => c.id === ce.sourceId)?.level
      if (level && level in result) result[level] += 1
    }
    return result
  }

  async countQualifyingByLevelForProfiles(
    profileIds: string[],
    audience: CourseAudience,
  ): Promise<Map<string, QualifyingByLevel>> {
    const map = new Map<string, QualifyingByLevel>()
    for (const id of new Set(profileIds)) {
      const q = await this.countQualifyingCoursesByLevel(id, audience)
      if (q.iniciante || q.intermediario || q.avancado) map.set(id, q)
    }
    return map
  }

  /**
   * Mirror do SQL (PR3b): coorte = PERFIS (linhas de gamification_profiles,
   * não-equipe) da audiência cuja CONTA (account_id) tem matrícula na audiência.
   * `null` se a conta do requester não tem matrícula (sem acesso). Requester sem
   * perfil (XP 0) ainda é contado.
   */
  async getRanking(
    userId: string,
    accountId: string,
    audience: CourseAudience,
    now: Date,
  ): Promise<GamificationRanking | null> {
    const accountsWithEntitlement = new Set<string>()
    for (const e of this.sources?.entitlements.byId.values() ?? []) {
      if (this.accountHasActiveAudienceAccess(e.userId, audience, now)) {
        accountsWithEntitlement.add(e.userId)
      }
    }
    if (!accountsWithEntitlement.has(accountId)) return null

    const cohortXp: number[] = []
    let requesterCounted = false
    for (const [key, rec] of this.profiles) {
      if (key !== this.profileKey(rec.userId, audience)) continue // só da audiência
      if (this.privilegedUsers.has(rec.userId)) continue // equipe fora
      const acc = this.accountIds.get(key)
      if (!acc || !accountsWithEntitlement.has(acc)) continue
      cohortXp.push(rec.xp)
      if (rec.userId === userId) requesterCounted = true
    }
    const myXp = this.profiles.get(this.profileKey(userId, audience))?.xp ?? 0
    const ahead = cohortXp.filter((xp) => xp > myXp).length
    // Requester sem perfil (XP 0) ainda conta como aluno (+1).
    const totalStudents = cohortXp.length + (requesterCounted ? 0 : 1)
    return { position: ahead + 1, totalStudents }
  }

  /** Mirror do `rankProfiles` do Drizzle: coorte resolvida 1×, ranqueia cada perfil em memória. */
  async rankProfiles(
    accountId: string,
    profileIds: string[],
    audience: CourseAudience,
    now: Date,
  ): Promise<Map<string, number>> {
    if (profileIds.length === 0) return new Map()
    const accountsWithEntitlement = new Set<string>()
    for (const e of this.sources?.entitlements.byId.values() ?? []) {
      if (this.accountHasActiveAudienceAccess(e.userId, audience, now)) {
        accountsWithEntitlement.add(e.userId)
      }
    }
    if (!accountsWithEntitlement.has(accountId)) return new Map()

    const cohortXp: number[] = []
    const xpByUser = new Map<string, number>()
    for (const [key, rec] of this.profiles) {
      if (key !== this.profileKey(rec.userId, audience)) continue
      if (this.privilegedUsers.has(rec.userId)) continue
      const acc = this.accountIds.get(key)
      if (!acc || !accountsWithEntitlement.has(acc)) continue
      cohortXp.push(rec.xp)
      xpByUser.set(rec.userId, rec.xp)
    }
    const out = new Map<string, number>()
    for (const profileId of profileIds) {
      const myXp = xpByUser.get(profileId) ?? 0
      out.set(profileId, cohortXp.filter((xp) => xp > myXp).length + 1)
    }
    return out
  }

  async hasActiveAudienceAccess(
    accountId: string,
    audience: CourseAudience,
    now: Date,
  ): Promise<boolean> {
    return this.accountHasActiveAudienceAccess(accountId, audience, now)
  }

  async countEventsInPeriod(
    userId: string,
    audience: CourseAudience,
    sourceTypes: MissionGoalType[],
    from: Date,
    to: Date,
  ): Promise<number> {
    const set = new Set<string>(sourceTypes)
    return this.events.filter(
      (e) =>
        e.userId === userId &&
        e.audience === audience &&
        set.has(e.sourceType) &&
        e.createdAt >= from &&
        e.createdAt < to,
    ).length
  }

  async listClaimedMissions(
    userId: string,
    audience: CourseAudience,
    periodKeys: string[],
  ): Promise<Set<string>> {
    const all = this.missionClaims.get(this.profileKey(userId, audience)) ?? new Set()
    const periods = new Set(periodKeys)
    const out = new Set<string>()
    for (const entry of all) {
      const period = entry.slice(entry.indexOf(':') + 1)
      if (periods.has(period)) out.add(entry)
    }
    return out
  }

  async claimMission(input: ClaimMissionInput): Promise<ClaimMissionResult> {
    const key = this.profileKey(input.userId, input.audience)
    const claims = this.missionClaims.get(key) ?? new Set<string>()
    const entry = `${input.missionSlug}:${input.periodKey}`
    const profile = this.profiles.get(key)
    const balance = profile?.coinBalance ?? 0
    if (claims.has(entry)) {
      return { claimed: false, xpAwarded: 0, coinsAwarded: 0, coinBalance: balance }
    }
    claims.add(entry)
    this.missionClaims.set(key, claims)

    const wallet = this.wallets.get(key) ?? { earnedToday: 0, earnedDate: null, lifetime: 0 }
    const earnedTodayBase = wallet.earnedDate === input.today ? wallet.earnedToday : 0
    const cap = applyDailyCap([input.rewardCoins], earnedTodayBase, DAILY_COIN_CAP)
    const coinsAwarded = cap.totalGranted
    const coinBalance = balance + coinsAwarded
    const newLifetime = wallet.lifetime + coinsAwarded
    if (coinsAwarded > 0) {
      this.coinEvents.push({
        userId: input.userId,
        audience: input.audience,
        sourceType: 'mission_reward',
        sourceId: entry,
        amount: coinsAwarded,
        balanceAfter: coinBalance,
        createdAt: input.now,
      })
    }
    this.wallets.set(key, {
      earnedToday: earnedTodayBase + coinsAwarded,
      earnedDate: input.today,
      lifetime: newLifetime,
    })
    if (profile) {
      this.profiles.set(key, {
        ...profile,
        xp: profile.xp + input.rewardXp,
        coinBalance,
      })
    }
    for (const slug of coinsSaverBadgeSlugs(newLifetime)) {
      const dup = this.badges.some(
        (b) => b.userId === input.userId && b.audience === input.audience && b.badgeSlug === slug,
      )
      if (!dup) {
        this.badges.push({
          userId: input.userId,
          audience: input.audience,
          badgeSlug: slug,
          unlockedAt: input.now,
        })
      }
    }
    return { claimed: true, xpAwarded: input.rewardXp, coinsAwarded, coinBalance }
  }

  async buyStreakFreeze(input: BuyStreakFreezeInput): Promise<BuyStreakFreezeResult> {
    const key = this.profileKey(input.userId, input.audience)
    const profile = this.profiles.get(key)
    const balance = profile?.coinBalance ?? 0
    const freezes = profile?.streakFreezes ?? 0
    if (freezes >= MAX_STREAK_FREEZES) return { ok: false, code: 'MAX_FREEZES', freezes, balance }
    const existing = this.coinEvents.some(
      (ce) =>
        ce.userId === input.userId &&
        ce.audience === input.audience &&
        ce.sourceType === 'spend_streak_freeze' &&
        ce.sourceId === input.idempotencyKey,
    )
    if (existing) return { ok: true, freezes, balance }
    if (balance < input.price) return { ok: false, code: 'INSUFFICIENT_BALANCE', freezes, balance }
    const balanceAfter = balance - input.price
    this.coinEvents.push({
      userId: input.userId,
      audience: input.audience,
      sourceType: 'spend_streak_freeze',
      sourceId: input.idempotencyKey,
      amount: -input.price,
      balanceAfter,
      createdAt: input.now,
    })
    if (profile) {
      this.profiles.set(key, {
        ...profile,
        coinBalance: balanceAfter,
        streakFreezes: freezes + 1,
      })
    }
    return { ok: true, freezes: freezes + 1, balance: balanceAfter }
  }

  async setVacation(
    userId: string,
    accountId: string,
    audience: CourseAudience,
    from: string | null,
    to: string | null,
    _now: Date,
  ): Promise<void> {
    const key = this.profileKey(userId, audience)
    const profile = this.profiles.get(key)
    if (profile) {
      this.profiles.set(key, { ...profile, vacationFrom: from, vacationTo: to })
    } else {
      this.profiles.set(key, {
        userId,
        accountId,
        xp: 0,
        streakCurrent: 0,
        streakBest: 0,
        lastActivityDate: null,
        coinBalance: 0,
        streakFreezes: 0,
        vacationFrom: from,
        vacationTo: to,
      })
      this.accountIds.set(key, accountId)
    }
  }

  async getLeagueMembership(
    userId: string,
    audience: CourseAudience,
    weekKey: string,
  ): Promise<LeagueMembershipRecord | null> {
    const m = this.leagueMemberships.find(
      (x) => x.userId === userId && x.audience === audience && x.weekKey === weekKey,
    )
    return m ? { weekKey: m.weekKey, tier: m.tier } : null
  }

  async getMostRecentLeagueMembership(
    userId: string,
    audience: CourseAudience,
    beforeWeekKey: string,
  ): Promise<LeagueMembershipRecord | null> {
    const prior = this.leagueMemberships
      .filter((x) => x.userId === userId && x.audience === audience && x.weekKey < beforeWeekKey)
      .sort((a, b) => (a.weekKey < b.weekKey ? 1 : -1)) // mais recente primeiro
    const m = prior[0]
    return m ? { weekKey: m.weekKey, tier: m.tier } : null
  }

  async createLeagueMembership(
    userId: string,
    accountId: string,
    audience: CourseAudience,
    weekKey: string,
    tier: string,
    _now: Date,
  ): Promise<void> {
    const dup = this.leagueMemberships.some(
      (x) => x.userId === userId && x.audience === audience && x.weekKey === weekKey,
    )
    if (dup) return
    this.leagueMemberships.push({ userId, accountId, audience, weekKey, tier })
  }

  async listLeagueCohort(
    audience: CourseAudience,
    weekKey: string,
    tier: string,
    now: Date,
  ): Promise<string[]> {
    return this.leagueMemberships
      .filter(
        (x) =>
          x.audience === audience &&
          x.weekKey === weekKey &&
          x.tier === tier &&
          this.accountHasActiveAudienceAccess(x.accountId, audience, now) &&
          !this.privilegedUsers.has(x.userId),
      )
      .map((x) => x.userId)
  }

  async sumWeeklyXp(
    audience: CourseAudience,
    userIds: string[],
    from: Date,
    to: Date,
  ): Promise<Map<string, number>> {
    const set = new Set(userIds)
    const out = new Map<string, number>()
    for (const e of this.events) {
      if (e.audience !== audience || !set.has(e.userId)) continue
      if (e.createdAt < from || e.createdAt >= to) continue
      out.set(e.userId, (out.get(e.userId) ?? 0) + e.amount)
    }
    return out
  }

  async countBadgesUnlockedInPeriod(
    userId: string,
    audience: CourseAudience,
    from: Date,
    to: Date,
  ): Promise<number> {
    return this.badges.filter(
      (b) =>
        b.userId === userId && b.audience === audience && b.unlockedAt >= from && b.unlockedAt < to,
    ).length
  }

  async listActiveAccountsInPeriod(
    audience: CourseAudience,
    from: Date,
    to: Date,
  ): Promise<string[]> {
    const accounts = new Set<string>()
    for (const e of this.events) {
      if (e.audience !== audience || e.createdAt < from || e.createdAt >= to) continue
      const accountId = this.accountIds.get(this.profileKey(e.userId, audience))
      if (accountId) accounts.add(accountId)
    }
    return [...accounts]
  }

  async listProfileIdsByAccount(accountId: string, audience: CourseAudience): Promise<string[]> {
    const out: string[] = []
    for (const [key, acc] of this.accountIds) {
      if (acc !== accountId) continue
      const [userId, aud] = key.split(':')
      if (aud === audience && userId) out.push(userId)
    }
    return out
  }
}

/** Fake in-memory do report semanal dos pais (envio dedupado + opt-out). */
export class InMemoryParentReportRepository implements ParentReportRepository {
  readonly sent = new Set<string>() // `${accountId}:${weekKey}`
  readonly prefs = new Map<string, boolean>()

  async listSentAccounts(weekKey: string, accountIds: string[]): Promise<Set<string>> {
    return new Set(accountIds.filter((id) => this.sent.has(`${id}:${weekKey}`)))
  }

  async markSent(accountId: string, weekKey: string, _now: Date): Promise<void> {
    this.sent.add(`${accountId}:${weekKey}`)
  }

  async listDisabledAccounts(accountIds: string[]): Promise<Set<string>> {
    return new Set(accountIds.filter((id) => this.prefs.get(id) === true))
  }

  async isDisabled(accountId: string): Promise<boolean> {
    return this.prefs.get(accountId) === true
  }

  async setDisabled(accountId: string, disabled: boolean, _now: Date): Promise<void> {
    this.prefs.set(accountId, disabled)
  }
}

export class InMemoryAvatarRepository implements AvatarRepository {
  readonly configs = new Map<string, AvatarConfig>()
  /** Mirror da coluna `account_id` (gravada SÓ no insert da config). */
  readonly accountIds = new Map<string, string>()
  readonly photoUrls = new Map<string, string>()
  readonly inventory: { userId: string; audience: CourseAudience; partId: string }[] = []

  private key(userId: string, audience: CourseAudience): string {
    return `${userId}:${audience}`
  }

  async getConfig(userId: string, audience: CourseAudience): Promise<AvatarConfig | null> {
    return this.configs.get(this.key(userId, audience)) ?? null
  }

  async upsertConfig(
    userId: string,
    accountId: string,
    audience: CourseAudience,
    config: AvatarConfig,
    _now: Date,
  ): Promise<void> {
    const k = this.key(userId, audience)
    if (!this.configs.has(k)) this.accountIds.set(k, accountId) // imutável: só no insert
    this.configs.set(k, config)
  }

  async listInventory(userId: string, audience: CourseAudience): Promise<string[]> {
    return this.inventory
      .filter((i) => i.userId === userId && i.audience === audience)
      .map((i) => i.partId)
  }

  async addToInventory(
    userId: string,
    audience: CourseAudience,
    partId: string,
    _now: Date,
  ): Promise<{ added: boolean }> {
    const dup = this.inventory.some(
      (i) => i.userId === userId && i.audience === audience && i.partId === partId,
    )
    if (dup) return { added: false }
    this.inventory.push({ userId, audience, partId })
    return { added: true }
  }

  async getPhotoUrl(userId: string, audience: CourseAudience): Promise<string | null> {
    return this.photoUrls.get(this.key(userId, audience)) ?? null
  }

  async listPhotoUrlsByProfileIds(
    profileIds: string[],
    audience: CourseAudience,
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>()
    for (const id of new Set(profileIds)) {
      const url = this.photoUrls.get(this.key(id, audience))
      if (url) map.set(id, url)
    }
    return map
  }

  async setPhotoUrl(
    userId: string,
    accountId: string,
    audience: CourseAudience,
    photoUrl: string,
    _now: Date,
  ): Promise<void> {
    const k = this.key(userId, audience)
    if (!this.configs.has(k)) {
      this.accountIds.set(k, accountId)
      this.configs.set(k, defaultAvatarConfig())
    }
    this.photoUrls.set(k, photoUrl)
  }
}

export class InMemoryRoomRepository implements RoomRepository {
  readonly states = new Map<string, RoomState>()
  readonly accountIds = new Map<string, string>()
  readonly inventory: { userId: string; audience: CourseAudience; itemId: string }[] = []

  private key(userId: string, audience: CourseAudience): string {
    return `${userId}:${audience}`
  }

  async getState(userId: string, audience: CourseAudience): Promise<RoomState | null> {
    return this.states.get(this.key(userId, audience)) ?? null
  }

  async upsertState(
    userId: string,
    accountId: string,
    audience: CourseAudience,
    state: RoomState,
    _now: Date,
  ): Promise<void> {
    const k = this.key(userId, audience)
    if (!this.states.has(k)) this.accountIds.set(k, accountId) // imutável: só no insert
    this.states.set(k, state)
  }

  async listInventory(userId: string, audience: CourseAudience): Promise<string[]> {
    return this.inventory
      .filter((i) => i.userId === userId && i.audience === audience)
      .map((i) => i.itemId)
  }

  async addToInventory(
    userId: string,
    audience: CourseAudience,
    itemId: string,
    _now: Date,
  ): Promise<{ added: boolean }> {
    const dup = this.inventory.some(
      (i) => i.userId === userId && i.audience === audience && i.itemId === itemId,
    )
    if (dup) return { added: false }
    this.inventory.push({ userId, audience, itemId })
    return { added: true }
  }
}

export class InMemoryProcessedWebhookRepository implements ProcessedWebhookRepository {
  readonly seen = new Set<string>()
  async isProcessed(deliveryId: string): Promise<boolean> {
    return this.seen.has(deliveryId)
  }
  async markProcessed(deliveryId: string): Promise<void> {
    this.seen.add(deliveryId)
  }
}

export class InMemoryCertificateRepository implements CertificateRepository {
  readonly rows: CertificateRecord[] = []

  async findByUserAndCourse(userId: string, courseId: string): Promise<CertificateRecord | null> {
    return this.rows.find((r) => r.userId === userId && r.courseId === courseId) ?? null
  }

  async insertIfAbsent(record: CertificateRecord): Promise<CertificateRecord> {
    // Mirror do UNIQUE (user_id, course_id): se já há cert do aluno+curso, no-op e
    // devolve o vigente; senão insere.
    const existing = this.rows.find(
      (r) => r.userId === record.userId && r.courseId === record.courseId,
    )
    if (existing) return existing
    this.rows.push({ ...record })
    return record
  }

  async findById(id: string): Promise<CertificateRecord | null> {
    return this.rows.find((r) => r.id === id) ?? null
  }

  async listByUser(userId: string): Promise<CertificateRecord[]> {
    return this.rows
      .filter((r) => r.userId === userId)
      .sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime())
  }

  async revoke(id: string, revokedAt: Date): Promise<void> {
    const row = this.rows.find((r) => r.id === id)
    if (row) row.revokedAt = revokedAt
  }
}

export class FakeCatalogGateway implements CatalogGateway {
  readonly offers = new Map<string, ResolvedOffer>()
  set(ref: string, offer: ResolvedOffer): void {
    this.offers.set(ref, offer)
  }
  async resolveOfferEntitlements(ref: string): Promise<ResolvedOffer | null> {
    return this.offers.get(ref) ?? null
  }
}
