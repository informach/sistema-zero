import { randomUUID } from 'node:crypto'
import { ValidationError } from '@sistemazero/core/errors'
import { LearningConflictError } from '../../src/domain/learning/learning.errors'
import { learningImportFingerprint } from '../../src/domain/learning/learning-import'
import type {
  LearningImportPlan,
  LearningImportRepository,
} from '../../src/domain/ports/learning-import-repository.port'
import type { InMemoryCourseRepository } from './in-memory'
import type { InMemoryLearningRepository } from './learning-in-memory'

export class InMemoryLearningImportRepository implements LearningImportRepository {
  constructor(
    private readonly courses: InMemoryCourseRepository,
    private readonly learning: InMemoryLearningRepository,
  ) {}
  async snapshot(lessonId: string) {
    const lesson = await this.courses.findLessonWithContent(lessonId)
    return lesson
      ? structuredClone({ lesson, structure: await this.learning.getStructure(lessonId) })
      : null
  }
  async apply(plan: LearningImportPlan) {
    const current = await this.snapshot(plan.lessonId)
    if (!current || learningImportFingerprint(current) !== plan.fingerprint)
      throw new LearningConflictError()
    if (current.lesson.isPublished)
      throw new ValidationError('Despublique a aula antes de importar o novo roteiro.')
    const lesson = this.courses.lessons.find((l) => l.id === plan.lessonId)
    if (!lesson) throw new LearningConflictError()
    for (const [sortOrder, item] of plan.blocks.entries()) {
      const existing = this.courses.blocks.find((b) => b.id === item.id)
      if (existing) {
        existing.sortOrder = sortOrder
        if (item.action === 'update') {
          existing.kind = item.content.kind
          existing.content = item.content
          existing.contentRevision = randomUUID().replaceAll('-', '')
        }
      } else
        this.courses.blocks.push({
          id: item.id,
          lessonId: plan.lessonId,
          kind: item.content.kind,
          content: item.content,
          sortOrder,
          contentRevision: randomUUID().replaceAll('-', ''),
        })
    }
    lesson.title = plan.title
    this.learning.structures.set(plan.lessonId, { revision: randomUUID(), sections: plan.sections })
  }
}
