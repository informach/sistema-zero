/**
 * Explicit JSON format conversion; no DDL and no student writes.
 * Default: dry-run. Apply requires --apply --backup-dir=<new local directory>.
 * Each changed lesson is locked, backed up durably, converted and receipted separately.
 */
import { createHash, randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { and, eq, isNotNull, sql } from 'drizzle-orm'
import { planStudioExamplesMigration } from '../src/domain/learning/studio-examples-migration'
import { stableJson } from '../src/domain/shared/stable-json'
import { DrizzleCourseRepository } from '../src/infrastructure/persistence/drizzle/course.repository'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { lockLessonStructure } from '../src/infrastructure/persistence/drizzle/lesson-structure'
import {
  courses,
  lessonBlocks,
  lessonCriteriaMigrationSnapshots,
  lessonDrafts,
  lessonStructures,
  lessons,
} from '../src/infrastructure/persistence/drizzle/schema'
import {
  prepareDurableMigrationDirectory,
  writeDurableMigrationJson,
} from './lib/durable-migration-backup'

const args = process.argv.slice(2)
if (
  args.some((arg) => arg !== '--apply' && arg !== '--dry-run' && !arg.startsWith('--backup-dir='))
)
  throw new Error('Opção desconhecida. Use --dry-run ou --apply --backup-dir=<diretório novo>.')
const apply = args.includes('--apply')
if (apply && args.includes('--dry-run')) throw new Error('Escolha somente um modo.')
const backupArgument = args
  .find((arg) => arg.startsWith('--backup-dir='))
  ?.slice('--backup-dir='.length)
if (apply && !backupArgument) throw new Error('--backup-dir é obrigatório para aplicar.')
const databaseUrl = process.env.DATABASE_URL?.trim()
if (!databaseUrl) throw new Error('DATABASE_URL é obrigatória.')
const backupDirectory =
  apply && backupArgument ? await prepareDurableMigrationDirectory(resolve(backupArgument)) : null
const connection = createDbConnection(databaseUrl, {
  max: 1,
  ssl: ['true', '1'].includes(process.env.DATABASE_SSL?.toLowerCase() ?? ''),
})
const summary = {
  current: 0,
  pending: 0,
  converted: 0,
  conflict: 0,
  blocked: 0,
  indeterminate: 0,
  committedReceiptFailed: 0,
}
const fingerprint = (value: unknown) => createHash('sha256').update(stableJson(value)).digest('hex')
try {
  const ids = await connection.db.select({ id: lessons.id }).from(lessons).orderBy(lessons.id)
  for (const { id: lessonId } of ids) {
    const state: {
      stage: 'not-started' | 'prepared' | 'writing' | 'committed'
      backup: { path: string; sha256: string } | null
      preparedReceipt: { path: string; sha256: string } | null
    } = {
      stage: 'not-started',
      backup: null,
      preparedReceipt: null,
    }
    try {
      const receipt = await connection.db.transaction(async (tx) => {
        const [head] = await tx
          .select({ courseId: lessons.courseId })
          .from(lessons)
          .where(eq(lessons.id, lessonId))
        if (!head) throw new Error('Aula removida durante o inventário.')
        const [course] = await tx
          .select({ id: courses.id, slug: courses.slug })
          .from(courses)
          .where(eq(courses.id, head.courseId))
          .for('update')
        if (!course) throw new Error('Curso ausente.')
        await lockLessonStructure(tx, lessonId)
        const lesson = await new DrizzleCourseRepository(tx).findLessonWithContent(lessonId, {
          includePrivateStudioAuthoring: true,
        })
        if (!lesson) throw new Error('Aula ausente.')
        const archivedLegacy = await tx
          .select({ id: lessonBlocks.id })
          .from(lessonBlocks)
          .where(
            and(
              eq(lessonBlocks.lessonId, lessonId),
              isNotNull(lessonBlocks.archivedAt),
              sql`${lessonBlocks.content} ? 'solutionProject'`,
            ),
          )
          .limit(1)
        if (archivedLegacy.length)
          throw new Error(
            'Há gabarito global em bloco arquivado. Revise o histórico individualmente; a ferramenta não inventa associações antigas.',
          )
        const [structure] = await tx
          .select()
          .from(lessonStructures)
          .where(eq(lessonStructures.lessonId, lessonId))
          .for('update')
        const [draft] = await tx
          .select()
          .from(lessonDrafts)
          .where(eq(lessonDrafts.lessonId, lessonId))
          .for('update')
        const [criteriaMigration] = await tx
          .select()
          .from(lessonCriteriaMigrationSnapshots)
          .where(eq(lessonCriteriaMigrationSnapshots.lessonId, lessonId))
        const plan = planStudioExamplesMigration({
          lesson,
          courseSlug: course.slug,
          sections: structure?.sections,
          draft: draft ?? null,
          criteriaMigration,
        })
        const observed = {
          publishedRevision: plan.beforeRevision,
          draftRevision: draft?.revision ?? null,
          draftDocumentSha256: draft ? fingerprint(draft.document) : null,
          previousDocumentSha256: draft?.previousDocument
            ? fingerprint(draft.previousDocument)
            : null,
        }
        if (plan.kind === 'current' || plan.kind === 'conflict')
          return { lessonId, status: plan.kind, counts: plan.counts, observed }
        if (!apply)
          return {
            lessonId,
            status: 'pending' as const,
            counts: plan.counts,
            observed,
            beforeRevision: plan.beforeRevision,
            afterRevision: plan.afterRevision,
            associations: plan.associations,
          }
        if (!backupDirectory) throw new Error('Diretório de backup ausente.')
        const nextDraftRevision = draft ? randomUUID() : null
        const target = {
          publishedRevision: plan.afterRevision,
          draftRevision: nextDraftRevision,
          draftDocumentSha256: plan.draftDocument ? fingerprint(plan.draftDocument) : null,
          previousDocumentSha256: plan.previousDocument ? fingerprint(plan.previousDocument) : null,
        }
        const backup = {
          version: 1,
          lessonId,
          createdAt: new Date().toISOString(),
          lesson,
          structure: structure ?? null,
          draft: draft ?? null,
          criteriaMigration: criteriaMigration ?? null,
          plan: {
            counts: plan.counts,
            associations: plan.associations,
            beforeRevision: plan.beforeRevision,
            afterRevision: plan.afterRevision,
          },
        }
        const savedBackup = await writeDurableMigrationJson(
          backupDirectory,
          `${lessonId}.json`,
          backup,
        )
        state.backup = savedBackup
        state.preparedReceipt = await writeDurableMigrationJson(
          backupDirectory,
          `${lessonId}.prepared.json`,
          {
            version: 1,
            phase: 'prepared',
            lessonId,
            backup: savedBackup,
            observed,
            target,
            note: 'Preparado não significa commit. Compare os hashes observados num novo dry-run se faltar o recibo committed.',
          },
        )
        state.stage = 'prepared'
        for (const block of plan.publishedBlocks) {
          const original = lesson.blocks.find((entry) => entry.id === block.id)
          if (!original || stableJson(original.content) === stableJson(block.content)) continue
          state.stage = 'writing'
          await tx
            .update(lessonBlocks)
            .set({ content: block.content })
            .where(and(eq(lessonBlocks.id, block.id), eq(lessonBlocks.lessonId, lessonId)))
          // Deliberately preserve contentRevision: moving private data changes no child task.
        }
        if (draft) {
          if (!plan.draftDocument) throw new Error('Rascunho convertido ausente.')
          if (!nextDraftRevision) throw new Error('Revisão proposta ausente.')
          state.stage = 'writing'
          const [saved] = await tx
            .update(lessonDrafts)
            .set({
              document: plan.draftDocument,
              previousDocument: plan.previousDocument,
              publishedRevision: plan.afterRevision,
              revision: nextDraftRevision,
              updatedAt: new Date(),
            })
            .where(
              and(eq(lessonDrafts.lessonId, lessonId), eq(lessonDrafts.revision, draft.revision)),
            )
            .returning({ lessonId: lessonDrafts.lessonId })
          if (!saved) throw new Error('O rascunho mudou durante a conversão.')
        }
        return {
          lessonId,
          status: 'converted' as const,
          counts: plan.counts,
          beforeRevision: plan.beforeRevision,
          afterRevision: plan.afterRevision,
          nextDraftRevision,
          backupFile: savedBackup.path,
          backupSha256: savedBackup.sha256,
          preparedReceipt: state.preparedReceipt,
          target,
        }
      })
      // A rejection of transaction() after writes may mean a lost COMMIT acknowledgement.
      // Only reaching here establishes a confirmed commit to report/journal.
      if (receipt.status === 'converted') {
        state.stage = 'committed'
        if (!backupDirectory) throw new Error('Diretório de recibo ausente.')
        await writeDurableMigrationJson(backupDirectory, `${lessonId}.committed.json`, {
          version: 1,
          phase: 'committed',
          confirmedAt: new Date().toISOString(),
          ...receipt,
        })
      }
      summary[receipt.status]++
      console.log(JSON.stringify(receipt))
    } catch (error) {
      // Files and prepared receipts are intentionally retained; do not erase crash evidence.
      const status =
        state.stage === 'committed'
          ? 'committedReceiptFailed'
          : state.stage === 'writing'
            ? 'indeterminate'
            : 'blocked'
      summary[status]++
      console.error(
        JSON.stringify({
          lessonId,
          status,
          stage: state.stage,
          backup: state.backup,
          preparedReceipt: state.preparedReceipt,
          message: error instanceof Error ? error.message : 'Falha de conversão.',
          recovery:
            state.stage === 'not-started'
              ? 'Nenhuma escrita SQL foi iniciada para esta aula.'
              : 'Preserve o backup. Rode dry-run e compare publicado, draft e previous com o alvo do recibo prepared antes de retomar em diretório novo.',
        }),
      )
      if (status !== 'blocked') break
    }
  }
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', total: ids.length, ...summary }))
  if (
    summary.conflict ||
    summary.blocked ||
    summary.indeterminate ||
    summary.committedReceiptFailed
  )
    process.exitCode = 1
} finally {
  await connection.close()
}
