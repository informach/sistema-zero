import { randomUUID } from 'node:crypto'
import type {
  LearningAttemptView,
  LearningBlockProgress,
  LearningTopicSummary,
  LessonSection,
  SectionProgressRecord,
} from '@sistemazero/core/learning'
import type { CourseAudience } from '../../src/domain/course/course'
import { LearningConflictError } from '../../src/domain/learning/learning.errors'
import type {
  LearningOwner,
  LearningRepository,
  LessonStructure,
  SaveLearningProgress,
} from '../../src/domain/ports/learning-repository.port'

const key = (owner: LearningOwner, id: string) => `${owner.accountId}:${owner.userId}:${id}`
export class InMemoryLearningRepository implements LearningRepository {
  readonly evidence = new Map<string, import('@sistemazero/core/learning').LessonEvidence[]>()
  async listEvidence(owner: LearningOwner, lessonId: string, beforeId?: string) {
    const rows = structuredClone(this.evidence.get(key(owner, lessonId)) ?? []).sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
    )
    const start = beforeId ? rows.findIndex((row) => row.id === beforeId) + 1 : 0
    if (beforeId && !start) return []
    return rows.slice(start, start + 101)
  }
  async getEvidence(owner: LearningOwner, lessonId: string, id: string) {
    return structuredClone(
      this.evidence.get(key(owner, lessonId))?.find((e) => e.id === id) ?? null,
    )
  }
  readonly sectionProgress = new Map<string, SectionProgressRecord[]>()
  async getSectionProgress(owner: LearningOwner, lessonId: string) {
    return structuredClone(this.sectionProgress.get(key(owner, lessonId)) ?? [])
  }
  async saveSectionProgress(
    owner: LearningOwner,
    lessonId: string,
    revision: string,
    records: SectionProgressRecord[],
    _blockRevisions?: { id: string; revision: string }[],
    evidence?: import('@sistemazero/core/learning').LessonEvidence,
  ) {
    const structure = this.structures.get(lessonId)
    if (
      structure?.revision !== revision ||
      records.some((r) => !structure.sections.some((s) => s.id === r.sectionId))
    )
      throw new LearningConflictError()
    const all = await this.getSectionProgress(owner, lessonId)
    if (evidence)
      this.evidence.set(key(owner, lessonId), [
        ...(this.evidence.get(key(owner, lessonId)) ?? []),
        structuredClone(evidence),
      ])
    for (const r of records) {
      const old = all.find((p) => p.sectionId === r.sectionId)
      if (old?.completedAt) continue
      const next = {
        ...r,
        projectPassed: r.projectPassed || (old?.revision === r.revision && old.projectPassed),
      }
      if (old) Object.assign(old, next)
      else all.push(next)
    }
    this.sectionProgress.set(key(owner, lessonId), all)
  }
  readonly weeklyTopicRows: Array<
    LearningOwner & {
      audience: CourseAudience
      updatedAt: Date
      summary: LearningTopicSummary
    }
  > = []
  readonly structures = new Map<string, LessonStructure>()
  readonly navigation = new Map<string, string>()
  readonly progresses = new Map<string, LearningBlockProgress & { lessonId: string }>()
  readonly attempts = new Map<
    string,
    LearningAttemptView & { lessonId: string; ownerKey: string }
  >()
  async getStructure(lessonId: string) {
    return this.structures.get(lessonId) ?? null
  }
  async saveStructure(lessonId: string, revision: string | null, sections: LessonSection[]) {
    const current = this.structures.get(lessonId)
    if ((current?.revision ?? null) !== revision) return null
    const value = { revision: randomUUID(), sections: structuredClone(sections) }
    this.structures.set(lessonId, value)
    return value
  }
  async getProgress(owner: LearningOwner, lessonId: string) {
    return {
      sectionId: this.navigation.get(key(owner, lessonId)) ?? null,
      blocks: [...this.progresses.entries()]
        .filter(([k, p]) => k.startsWith(key(owner, '')) && p.lessonId === lessonId)
        .map(([, p]) => p),
    }
  }
  async saveNavigation(owner: LearningOwner, lessonId: string, sectionId: string) {
    this.navigation.set(key(owner, lessonId), sectionId)
  }
  async saveProgress(input: SaveLearningProgress) {
    const old = this.progresses.get(key(input, input.progress.blockId))
    const same = old?.revision === input.progress.revision
    const value = {
      ...input.progress,
      lessonId: input.lessonId,
      attemptsCount: same ? old.attemptsCount : 0,
      result: same ? old.result : null,
    }
    this.progresses.set(key(input, input.progress.blockId), value)
    return value
  }
  async findAttempt(owner: LearningOwner, id: string) {
    const a = this.attempts.get(id)
    return a?.ownerKey === key(owner, '') ? a : null
  }
  async recordAttempt(owner: LearningOwner, lessonId: string, a: LearningAttemptView) {
    const existing = this.attempts.get(a.id)
    const old = this.progresses.get(key(owner, a.blockId))
    if (existing) {
      if (existing.ownerKey !== key(owner, '') || existing.blockId !== a.blockId || !old)
        throw new LearningConflictError()
      return old
    }
    this.attempts.set(a.id, { ...a, lessonId, ownerKey: key(owner, '') })
    const same = old?.revision === a.revision
    const value = {
      blockId: a.blockId,
      lessonId,
      revision: a.revision,
      answers: a.answers,
      hintsUsed: a.hintsUsed,
      positionSeconds: null,
      attemptsCount: (same ? old.attemptsCount : 0) + 1,
      result: same && old.result?.passed ? old.result : a.result,
      updatedAt: a.createdAt,
    }
    this.progresses.set(key(owner, a.blockId), value)
    return value
  }
  async listAttempts(owner: LearningOwner, lessonId: string) {
    return [...this.attempts.values()].filter(
      (a) => a.ownerKey === key(owner, '') && a.lessonId === lessonId,
    )
  }
  async listActiveAccounts(audience: CourseAudience, since: Date, until: Date) {
    return [
      ...new Set(
        this.weeklyTopicRows
          .filter((r) => r.audience === audience && r.updatedAt >= since && r.updatedAt <= until)
          .map((r) => r.accountId),
      ),
    ]
  }
  async listProfileIdsByAccount(accountId: string, audience: CourseAudience) {
    return [
      ...new Set(
        this.weeklyTopicRows
          .filter((r) => r.accountId === accountId && r.audience === audience)
          .map((r) => r.userId),
      ),
    ]
  }
  async weeklyTopics(
    accountId: string,
    userId: string,
    audience: CourseAudience,
    since: Date,
    until: Date,
  ) {
    return this.weeklyTopicRows
      .filter(
        (r) =>
          r.accountId === accountId &&
          r.userId === userId &&
          r.audience === audience &&
          r.updatedAt >= since &&
          r.updatedAt <= until,
      )
      .map((r) => r.summary)
  }
}
