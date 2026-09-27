/**
 * Reconcilia SOMENTE a mudança de formato do hash após a remoção de `supportBlockIds`.
 * Não altera o documento do rascunho, a publicação nem a revisão de edição.
 *
 * Dry-run: bun run drafts:rebase-revisions
 * Aplicar: bun run drafts:rebase-revisions -- --apply
 *
 * Casos com hash inesperado são recusados e exigem análise individual. O script é idempotente:
 * uma segunda execução classifica as linhas já atualizadas como `current`.
 */
import { eq } from 'drizzle-orm'
import { DrizzleCourseRepository } from '../src/infrastructure/persistence/drizzle/course.repository'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { classifyLessonDraftRevision } from '../src/infrastructure/persistence/drizzle/lesson-draft-revision-rebase'
import { lockLessonStructure } from '../src/infrastructure/persistence/drizzle/lesson-structure'
import {
  courses,
  lessonDrafts,
  lessonStructures,
  lessons,
} from '../src/infrastructure/persistence/drizzle/schema'

const apply = process.argv.includes('--apply')
if (apply && process.argv.includes('--dry-run'))
  throw new Error('Use somente um modo: --apply ou --dry-run')

const databaseUrl = process.env.DATABASE_URL?.trim()
if (!databaseUrl) throw new Error('DATABASE_URL é obrigatória')

const connection = createDbConnection(databaseUrl, {
  max: 1,
  ssl: ['true', '1'].includes(process.env.DATABASE_SSL?.toLowerCase() ?? ''),
})

try {
  const ids = await connection.db
    .select({ lessonId: lessonDrafts.lessonId })
    .from(lessonDrafts)
    .orderBy(lessonDrafts.lessonId)
  const summary = { current: 0, rebased: 0, pending: 0, conflict: 0, missing: 0 }

  for (const { lessonId } of ids) {
    const result = await connection.db.transaction(async (tx) => {
      const [head] = await tx
        .select({ courseId: lessons.courseId })
        .from(lessons)
        .where(eq(lessons.id, lessonId))
      if (!head) return 'missing' as const
      // Mesma ordem de locks do fluxo de publicação: curso → estrutura → aula/rascunho.
      await tx
        .select({ id: courses.id })
        .from(courses)
        .where(eq(courses.id, head.courseId))
        .for('update')
      await lockLessonStructure(tx, lessonId)
      const [lessonRow] = await tx
        .select({ id: lessons.id })
        .from(lessons)
        .where(eq(lessons.id, lessonId))
        .for('update')
      if (!lessonRow) return 'missing' as const
      const [draft] = await tx
        .select({ publishedRevision: lessonDrafts.publishedRevision })
        .from(lessonDrafts)
        .where(eq(lessonDrafts.lessonId, lessonId))
        .for('update')
      if (!draft) return 'missing' as const

      const lesson = await new DrizzleCourseRepository(tx).findLessonWithContent(lessonId)
      if (!lesson) return 'missing' as const
      const [structure] = await tx
        .select({ sections: lessonStructures.sections })
        .from(lessonStructures)
        .where(eq(lessonStructures.lessonId, lessonId))
      const snapshot = {
        title: lesson.title,
        slug: lesson.slug,
        estimatedMinutes: lesson.estimatedMinutes,
        blocks: lesson.blocks,
        attachments: lesson.attachments,
        sections: structure?.sections,
      }
      const decision = classifyLessonDraftRevision(snapshot, draft.publishedRevision, !!structure)
      if (decision.kind !== 'rebase' || !apply)
        return decision.kind === 'rebase' ? ('pending' as const) : decision.kind

      await tx
        .update(lessonDrafts)
        .set({ publishedRevision: decision.currentRevision })
        .where(eq(lessonDrafts.lessonId, lessonId))
      return 'rebased' as const
    })
    summary[result]++
    if (result === 'conflict' || result === 'missing') console.error(`${result}: ${lessonId}`)
  }

  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', total: ids.length, ...summary }))
  if (summary.conflict || summary.missing) process.exitCode = 1
} finally {
  await connection.close()
}
