/**
 * Reorganiza SOMENTE o curso `desafio-primeiro-jogo`.
 *
 * Uso (DATABASE_URL deve apontar explicitamente para o ambiente certo):
 *   bun scripts/reorganize-desafio-primeiro-jogo.ts --target staging
 *   bun scripts/reorganize-desafio-primeiro-jogo.ts --target staging --apply --expect-course-id <id-do-dry-run> --expect-database <banco-do-dry-run>
 *
 * O mesmo script pode ser executado depois em production, com dry-run e ID próprios.
 * A migração 0094 (coluna modules.illustration) precisa estar aplicada antes.
 */
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'
import {
  courses,
  lessonBlocks,
  lessonCompletions,
  lessons,
  modules,
} from '../src/infrastructure/persistence/drizzle/schema'
import { planDesafioCourse } from './lib/desafio-course-plan'

const COURSE_SLUG = 'desafio-primeiro-jogo'
const apply = process.argv.includes('--apply')

function argument(name: string): string | null {
  const index = process.argv.indexOf(name)
  return index >= 0 ? (process.argv[index + 1] ?? null) : null
}

const target = argument('--target')
if (target !== 'staging' && target !== 'production') {
  throw new Error('Informe --target staging ou --target production')
}
const expectedCourseId = argument('--expect-course-id')
const expectedDatabase = argument('--expect-database')
if (apply && (!expectedCourseId || !expectedDatabase)) {
  throw new Error(
    'Para aplicar, copie courseId e database do dry-run em --expect-course-id e --expect-database',
  )
}
const databaseUrl = process.env.DATABASE_URL?.trim()
if (!databaseUrl) throw new Error('DATABASE_URL é obrigatória')
const parsedDatabaseUrl = new URL(databaseUrl)
const database = `${parsedDatabaseUrl.hostname}:${parsedDatabaseUrl.port || '5432'}${parsedDatabaseUrl.pathname}`
if (apply && expectedDatabase !== database) {
  throw new Error(`Banco diferente do dry-run: encontrado ${database}`)
}

const connection = createDbConnection(databaseUrl, {
  max: 1,
  ssl: ['true', '1'].includes(process.env.DATABASE_SSL?.toLowerCase() ?? ''),
  statementTimeoutMs: 30_000,
  idleInTransactionTimeoutMs: 30_000,
})

try {
  const result = await connection.db.transaction(async (tx) => {
    const courseQuery = tx
      .select({ id: courses.id, slug: courses.slug, audience: courses.audience })
      .from(courses)
      .where(eq(courses.slug, COURSE_SLUG))
      .limit(1)
    const [course] = apply ? await courseQuery.for('update') : await courseQuery
    if (!course) throw new Error(`Curso ${COURSE_SLUG} não encontrado`)
    if (course.audience !== 'kids') throw new Error('O curso encontrado não pertence ao Kids')
    if (apply && course.id !== expectedCourseId) {
      throw new Error(`ID do curso diferente do dry-run: encontrado ${course.id}`)
    }

    const moduleQuery = tx
      .select({
        id: modules.id,
        title: modules.title,
        summary: modules.summary,
        illustration: modules.illustration,
        sortOrder: modules.sortOrder,
      })
      .from(modules)
      .where(eq(modules.courseId, course.id))
      .orderBy(asc(modules.sortOrder))
    const currentModules = apply ? await moduleQuery.for('update') : await moduleQuery
    const lessonQuery = tx
      .select({
        id: lessons.id,
        moduleId: lessons.moduleId,
        slug: lessons.slug,
        title: lessons.title,
        sortOrder: lessons.sortOrder,
      })
      .from(lessons)
      .where(eq(lessons.courseId, course.id))
    const currentLessons = apply ? await lessonQuery.for('update') : await lessonQuery
    const plan = planDesafioCourse(currentModules, currentLessons)
    const deletionIds = plan.deletions.map((lesson) => lesson.id)

    let completionCount = 0
    if (deletionIds.length > 0) {
      const [counted] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(lessonCompletions)
        .where(inArray(lessonCompletions.lessonId, deletionIds))
      completionCount = counted?.count ?? 0
      const blocks = await tx
        .select({ kind: lessonBlocks.kind, content: lessonBlocks.content })
        .from(lessonBlocks)
        .where(and(inArray(lessonBlocks.lessonId, deletionIds), isNull(lessonBlocks.archivedAt)))
      if (
        blocks.some(
          (block) =>
            block.kind === 'studio' &&
            block.content.kind === 'studio' &&
            block.content.showcase?.enabled === true,
        )
      ) {
        throw new Error('Uma aula a excluir contém atividade de vitrine; revise no Admin')
      }
    }

    if (apply && plan.changed) {
      if (deletionIds.length > 0) {
        await tx.delete(lessonCompletions).where(inArray(lessonCompletions.lessonId, deletionIds))
        await tx.delete(lessons).where(inArray(lessons.id, deletionIds))
      }
      const now = new Date()
      if (plan.lessons.some((lesson) => lesson.changed)) {
        // O índice (module_id, sort_order) não é deferrable. Primeiro estaciona as
        // sete aulas em posições negativas, depois coloca cada uma no destino.
        const lowest = Math.min(...currentLessons.map((lesson) => lesson.sortOrder))
        for (const [index, lesson] of plan.lessons.entries()) {
          await tx
            .update(lessons)
            .set({ sortOrder: lowest - 1000 - index, updatedAt: now })
            .where(eq(lessons.id, lesson.id))
        }
        for (const lesson of plan.lessons) {
          await tx
            .update(lessons)
            .set({ moduleId: lesson.to.moduleId, sortOrder: lesson.to.sortOrder, updatedAt: now })
            .where(eq(lessons.id, lesson.id))
        }
      }
      for (const module of plan.modules.filter((item) => item.changed)) {
        await tx
          .update(modules)
          .set({ ...module.to, updatedAt: now })
          .where(eq(modules.id, module.id))
      }
      if (plan.removeOldEndingModule) {
        const remaining = await tx
          .select({ id: lessons.id })
          .from(lessons)
          .where(eq(lessons.moduleId, plan.removeOldEndingModule.id))
        if (remaining.length > 0) throw new Error('O quarto módulo ainda contém aulas')
        await tx.delete(modules).where(eq(modules.id, plan.removeOldEndingModule.id))
      }
    }
    return { courseId: course.id, completionCount, plan }
  })

  console.log(
    JSON.stringify(
      {
        mode: apply ? 'APLICADO' : 'DRY-RUN',
        target,
        database,
        courseSlug: COURSE_SLUG,
        courseId: result.courseId,
        studentCompletionsRemovedIfApplied: result.completionCount,
        ...result.plan,
      },
      null,
      2,
    ),
  )
} finally {
  await connection.close()
}
