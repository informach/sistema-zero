import { randomUUID } from 'node:crypto'
import { ValidationError } from '@sistemazero/core/errors'
import { and, eq, sql } from 'drizzle-orm'
import { LessonNotFoundError } from '../../../domain/course/course.errors'
import { LearningConflictError } from '../../../domain/learning/learning.errors'
import { learningImportFingerprint } from '../../../domain/learning/learning-import'
import type {
  LearningImportPlan,
  LearningImportRepository,
} from '../../../domain/ports/learning-import-repository.port'
import { DrizzleCourseRepository } from './course.repository'
import type { Database } from './db'
import { lockLessonStructure } from './lesson-structure'
import { lessonBlocks, lessonStructures, lessons } from './schema'

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]
async function snapshotFrom(tx: Transaction, lessonId: string) {
  const lesson = await new DrizzleCourseRepository(tx).findLessonWithContent(lessonId)
  if (!lesson) return null
  const [structure] = await tx
    .select()
    .from(lessonStructures)
    .where(eq(lessonStructures.lessonId, lessonId))
  return {
    lesson,
    structure: structure ? { revision: structure.revision, sections: structure.sections } : null,
  }
}
export class DrizzleLearningImportRepository implements LearningImportRepository {
  constructor(private readonly db: Database) {}
  async snapshot(lessonId: string) {
    return this.db.transaction(async (tx) => {
      await lockLessonStructure(tx, lessonId)
      return snapshotFrom(tx, lessonId)
    })
  }
  async apply(plan: LearningImportPlan) {
    await this.db.transaction(async (tx) => {
      await lockLessonStructure(tx, plan.lessonId)
      const snapshot = await snapshotFrom(tx, plan.lessonId)
      if (!snapshot) throw new LessonNotFoundError()
      if (snapshot.lesson.isPublished)
        throw new ValidationError('Despublique a aula antes de importar o novo roteiro.')
      if (learningImportFingerprint(snapshot) !== plan.fingerprint)
        throw new LearningConflictError()
      // Park all rows before assigning final positions; preserves identities and every submission.
      await tx
        .update(lessonBlocks)
        .set({ sortOrder: sql`${lessonBlocks.sortOrder} - 2000000` })
        .where(eq(lessonBlocks.lessonId, plan.lessonId))
      for (const [sortOrder, block] of plan.blocks.entries()) {
        if (block.action === 'create') {
          await tx.insert(lessonBlocks).values({
            id: block.id,
            lessonId: plan.lessonId,
            kind: block.content.kind,
            content: block.content,
            sortOrder,
          })
        } else {
          await tx
            .update(lessonBlocks)
            .set(
              block.action === 'preserve'
                ? { sortOrder }
                : {
                    kind: block.content.kind,
                    content: block.content,
                    contentRevision: randomUUID().replaceAll('-', ''),
                    sortOrder,
                  },
            )
            .where(and(eq(lessonBlocks.id, block.id), eq(lessonBlocks.lessonId, plan.lessonId)))
        }
      }
      await tx
        .update(lessons)
        .set({ title: plan.title, updatedAt: new Date() })
        .where(eq(lessons.id, plan.lessonId))
      const structure = { lessonId: plan.lessonId, revision: randomUUID(), sections: plan.sections }
      await tx
        .insert(lessonStructures)
        .values(structure)
        .onConflictDoUpdate({
          target: lessonStructures.lessonId,
          set: { revision: structure.revision, sections: structure.sections },
        })
    })
  }
}
