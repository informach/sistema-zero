import { randomUUID } from 'node:crypto'
import type { Logger } from '@sistemazero/core/logging'
import type { AvatarConfig } from '../../src/domain/avatar/avatar-config'
import {
  type Course,
  type CourseAudience,
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
  coinsSaverBadgeSlugs,
  courseBadgeSlugs,
  quizPerfectBadgeSlugs,
  streakBadgeSlugs,
  studioMasteryBadgeSlugs,
} from '../../src/domain/gamification/gamification'
import type { MissionGoalType } from '../../src/domain/gamification/missions'
import type { AvatarRepository } from '../../src/domain/ports/avatar-repository.port'
import type { CatalogGateway, ResolvedOffer } from '../../src/domain/ports/catalog-gateway.port'
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
import type { ProcessedWebhookRepository } from '../../src/domain/ports/processed-webhook-repository.port'
import type { ProgressRepository } from '../../src/domain/ports/progress-repository.port'
import type {
  QuizAttemptRecord,
  QuizAttemptRepository,
} from '../../src/domain/ports/quiz-attempt-repository.port'
import type { RoomRepository } from '../../src/domain/ports/room-repository.port'
import type {
  StudioSubmissionDetail,
  StudioSubmissionRecord,
  StudioSubmissionRepository,
  StudioSubmissionState,
  StudioSubmissionSummary,
} from '../../src/domain/ports/studio-submission-repository.port'
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

  async findLessonWithContent(lessonId: string): Promise<LessonWithContent | null> {
    const lesson = this.lessons.find((l) => l.id === lessonId)
    if (!lesson) return null
    return {
      ...lesson,
      blocks: this.blocks
        .filter((b) => b.lessonId === lessonId)
        .sort((a, b) => a.sortOrder - b.sortOrder),
      attachments: this.attachments
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
        .find((b) => (b.content as { chain?: string }).chain === chain)
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
    const { salesPageUrl, audience, ...rest } = fields
    const course: Course = {
      id: randomUUID(),
      ...rest,
      audience: audience ?? 'adult',
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
    b.kind = kind
    b.content = content
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

  async lastCompletedAt(userId: string, courseId: string): Promise<Date | null> {
    const cs = this.completions.filter((c) => c.userId === userId && c.courseId === courseId)
    if (cs.length === 0) return null
    return cs.reduce((a, b) => (a.completedAt.getTime() >= b.completedAt.getTime() ? a : b))
      .completedAt
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
}

export class InMemoryQuizAttemptRepository implements QuizAttemptRepository {
  readonly attempts: QuizAttemptRecord[] = []

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
}

export class InMemoryStudioSubmissionRepository implements StudioSubmissionRepository {
  readonly submissions: StudioSubmissionRecord[] = []

  /** Courses p/ resolver a audiência da entrega (countByUserAndAudience). */
  constructor(private readonly courses?: InMemoryCourseRepository) {}

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
    } else {
      this.submissions.push({
        ...submission,
        score: submission.score ?? null,
        results: submission.results ?? null,
        checkedAt: submission.checkedAt ?? null,
        passedAt: submission.passedAt ?? null,
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
        submittedAt: s.submittedAt,
        score: s.score ?? null,
        checkedAt: s.checkedAt ?? null,
        passed: s.passedAt != null,
      }))
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
}

interface XpEventRow extends XpEventInput {
  userId: string
  audience: CourseAudience
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
      this.events.push({
        ...e,
        userId: input.userId,
        audience: input.audience,
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
      // Freeze grátis do mês (lazy/idempotente) — mirror do Drizzle.
      const monthKey = input.today.slice(0, 7)
      const freezesBefore =
        (profile?.streakFreezes ?? 0) + (this.freezeMonths.get(key) !== monthKey ? 1 : 0)
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
      this.freezeMonths.set(key, monthKey)
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
    if (existing) return { ok: false, code: 'ALREADY_SPENT', balance }
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
    return { ok: true, balanceAfter }
  }

  async getBalance(userId: string, audience: CourseAudience): Promise<number> {
    return this.profiles.get(this.profileKey(userId, audience))?.coinBalance ?? 0
  }

  async getProfile(
    userId: string,
    audience: CourseAudience,
  ): Promise<GamificationProfileRecord | null> {
    return this.profiles.get(this.profileKey(userId, audience)) ?? null
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
      // Mirror do filtro SQL `account_id = ?` — perfil de outra conta não volta.
      if (rec && this.accountIds.get(key) === accountId) out.push(rec)
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
      lifetime: wallet.lifetime + coinsAwarded,
    })
    if (profile) {
      this.profiles.set(key, { ...profile, xp: profile.xp + input.rewardXp, coinBalance })
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
}

export class InMemoryAvatarRepository implements AvatarRepository {
  readonly configs = new Map<string, AvatarConfig>()
  /** Mirror da coluna `account_id` (gravada SÓ no insert da config). */
  readonly accountIds = new Map<string, string>()
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

export class FakeCatalogGateway implements CatalogGateway {
  readonly offers = new Map<string, ResolvedOffer>()
  set(ref: string, offer: ResolvedOffer): void {
    this.offers.set(ref, offer)
  }
  async resolveOfferEntitlements(ref: string): Promise<ResolvedOffer | null> {
    return this.offers.get(ref) ?? null
  }
}
