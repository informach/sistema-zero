import type { Logger } from '@sistemazero/core/logging'
import {
  type Course,
  isCourseAccessible,
  type Lesson,
  type LessonAttachment,
  type LessonBlock,
  type LessonWithContent,
  type Module,
  type ModuleWithLessons,
} from '../../src/domain/course/course'
import {
  EntitlementAggregate,
  type EntitlementState,
} from '../../src/domain/entitlement/entitlement.aggregate'
import type { CatalogGateway, ResolvedOffer } from '../../src/domain/ports/catalog-gateway.port'
import type { CourseRepository } from '../../src/domain/ports/course-repository.port'
import type { EntitlementRepository } from '../../src/domain/ports/entitlement-repository.port'
import type { ProcessedWebhookRepository } from '../../src/domain/ports/processed-webhook-repository.port'
import type { ProgressRepository } from '../../src/domain/ports/progress-repository.port'

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

  async save(e: EntitlementAggregate): Promise<boolean> {
    const s = e.toSnapshot()
    // Espelha os DOIS índices únicos do schema: idempotency_key E
    // (user_id, product_id, source_kind, source_id). Conflito em qualquer → no-op.
    for (const x of this.byId.values()) {
      const dup =
        x.idempotencyKey === s.idempotencyKey ||
        (x.userId === s.userId &&
          x.productId === s.productId &&
          x.sourceKind === s.sourceKind &&
          x.sourceId === s.sourceId)
      if (dup) return false
    }
    this.byId.set(s.id, cloneState(s))
    return true
  }

  async update(e: EntitlementAggregate): Promise<boolean> {
    const s = e.toSnapshot()
    const cur = this.byId.get(s.id)
    if (!cur || cur.version !== s.version) return false
    this.byId.set(s.id, cloneState({ ...s, version: s.version + 1 }))
    return true
  }

  async findActiveByUserAndCourseRef(
    userId: string,
    courseRef: string,
    now: Date,
  ): Promise<EntitlementAggregate | null> {
    let strongest: EntitlementState | null = null
    for (const s of this.byId.values()) {
      if (s.userId === userId && s.courseRef === courseRef && isActive(s, now)) {
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

  async revokeBySubscriptionId(subscriptionId: string, now: Date): Promise<number> {
    let affected = 0
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
      }
    }
    return affected
  }

  async expireBySubscriptionId(subscriptionId: string, now: Date): Promise<number> {
    let affected = 0
    for (const s of this.byId.values()) {
      if (s.subscriptionId === subscriptionId && s.status !== 'revoked' && s.status !== 'expired') {
        this.byId.set(s.id, { ...s, status: 'expired', updatedAt: now, version: s.version + 1 })
        affected += 1
      }
    }
    return affected
  }

  seed(e: EntitlementAggregate): void {
    const s = e.toSnapshot()
    this.byId.set(s.id, cloneState(s))
  }
}

export class InMemoryCourseRepository implements CourseRepository {
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

  async findOutline(courseId: string): Promise<ModuleWithLessons[]> {
    return this.modules
      .filter((m) => m.courseId === courseId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((m) => ({
        ...m,
        lessons: this.lessons
          .filter((l) => l.moduleId === m.id)
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

  async countLessonsByCourseIds(courseIds: string[]): Promise<Map<string, number>> {
    const set = new Set(courseIds)
    const out = new Map<string, number>()
    for (const l of this.lessons) {
      if (set.has(l.courseId)) out.set(l.courseId, (out.get(l.courseId) ?? 0) + 1)
    }
    return out
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

  async markComplete(userId: string, lessonId: string, courseId: string, now: Date): Promise<void> {
    if (this.completions.some((c) => c.userId === userId && c.lessonId === lessonId)) return
    this.completions.push({ userId, lessonId, courseId, completedAt: now })
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
