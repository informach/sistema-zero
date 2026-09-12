import { createHash, randomUUID } from 'node:crypto'
import { ValidationError } from '@sistemazero/core/errors'
import {
  applyLessonDraftChange,
  defaultLessonSection,
  type LessonDraft,
  type LessonDraftCommand,
  type LessonDraftDocument,
  type LessonDraftIssue,
  validateLessonSections,
} from '@sistemazero/core/learning'
import { studioSectionCompletionIssues } from '@sistemazero/studio/server-project-checks'
import { and, eq, inArray, isNull, notInArray, sql } from 'drizzle-orm'
import {
  assertBlockCoherent,
  assertPintaChainTypeMatches,
  canonicalizeBlockContent,
} from '../../../application/content-admin/content-admin.service'
import {
  LessonNotFoundError,
  NoPublishedLessonError,
  NoShowcaseBlockError,
} from '../../../domain/course/course.errors'
import {
  isCompletionGatingBlock,
  type LessonBlockContent,
} from '../../../domain/course/lesson-block'
import { importedLearningId } from '../../../domain/learning/learning-import'
import { LessonDraftConflictError } from '../../../domain/learning/lesson-draft.errors'
import type { LessonDraftRepository } from '../../../domain/ports/lesson-draft-repository.port'
import { stableJson } from '../../../domain/shared/stable-json'
import {
  DrizzleContentAdminRepository,
  quizGateFingerprint,
  studioActivityFingerprint,
} from './content-admin.repository'
import { DrizzleCourseRepository } from './course.repository'
import type { Database } from './db'
import { lockLessonStructure } from './lesson-structure'
import {
  courses,
  lessonAttachments,
  lessonBlocks,
  lessonCriteriaMigrationSnapshots,
  lessonDraftOperations,
  lessonDrafts,
  lessonStructures,
  lessons,
  quizAttempts,
  studioSubmissions,
} from './schema'

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]
export type ParsePublishedBlock = (value: unknown) => LessonBlockContent
const fingerprint = (value: unknown) => createHash('sha256').update(stableJson(value)).digest('hex')

async function publishedSnapshot(tx: Transaction, lessonId: string) {
  const lesson = await new DrizzleCourseRepository(tx).findLessonWithContent(lessonId)
  if (!lesson) throw new LessonNotFoundError()
  const [structure] = await tx
    .select()
    .from(lessonStructures)
    .where(eq(lessonStructures.lessonId, lessonId))
  const [migration] = await tx
    .select()
    .from(lessonCriteriaMigrationSnapshots)
    .where(eq(lessonCriteriaMigrationSnapshots.lessonId, lessonId))
  return {
    lesson,
    structure,
    migrationRevision:
      migration && stableJson(structure?.sections) === stableJson(migration.migratedSections)
        ? fingerprint({
            title: lesson.title,
            slug: lesson.slug,
            estimatedMinutes: lesson.estimatedMinutes,
            blocks: lesson.blocks,
            attachments: lesson.attachments,
            sections: migration.previousSections,
            supportBlockIds: structure?.supportBlockIds,
          })
        : null,
    revision: fingerprint({
      title: lesson.title,
      slug: lesson.slug,
      estimatedMinutes: lesson.estimatedMinutes,
      blocks: lesson.blocks,
      attachments: lesson.attachments,
      sections: structure?.sections,
      supportBlockIds: structure?.supportBlockIds,
    }),
  }
}

function initialDocument(
  snapshot: Awaited<ReturnType<typeof publishedSnapshot>>,
): LessonDraftDocument {
  const { lesson, structure } = snapshot
  const document: LessonDraftDocument = {
    title: lesson.title,
    slug: lesson.slug,
    estimatedMinutes: lesson.estimatedMinutes,
    blocks: lesson.blocks.map((b) => ({ id: b.id, content: { ...b.content } })),
    attachments: lesson.attachments.map(({ id, label, url, fileType, sizeBytes }) => ({
      id,
      label,
      url,
      fileType,
      sizeBytes,
    })),
    sections: structure?.sections ?? [
      defaultLessonSection(
        lesson.id,
        lesson.title,
        lesson.blocks.map((b) => b.id),
      ),
    ],
    supportBlockIds: structure?.supportBlockIds ?? [],
    plannedVideos: [],
  }
  document.sections = document.sections.map((section) => {
    const blockIds = [...section.blockIds]
    for (const [index, instructions] of section.pendingMedia.entries()) {
      const blockId = importedLearningId(lesson.id, 'block', `video-${section.id}-${index}`)
      document.blocks.push({ id: blockId, content: { kind: 'video', provider: 'vimeo', src: '' } })
      document.plannedVideos.push({ blockId, instructions, videoId: null })
      blockIds.push(blockId)
    }
    return { ...section, blockIds, pendingMedia: [] }
  })
  return document
}

/** Course first, then lesson: same lock order as the career/showcase guards. */
async function lockDraft(tx: Transaction, lessonId: string) {
  const [lesson] = await tx
    .select({ courseId: lessons.courseId })
    .from(lessons)
    .where(eq(lessons.id, lessonId))
  if (!lesson) throw new LessonNotFoundError()
  await tx
    .select({ id: courses.id })
    .from(courses)
    .where(eq(courses.id, lesson.courseId))
    .for('update')
  await lockLessonStructure(tx, lessonId)
}

async function readDraft(tx: Transaction, lessonId: string): Promise<LessonDraft> {
  const snapshot = await publishedSnapshot(tx, lessonId)
  let [row] = await tx.select().from(lessonDrafts).where(eq(lessonDrafts.lessonId, lessonId))
  if (!row) {
    ;[row] = await tx
      .insert(lessonDrafts)
      .values({
        lessonId,
        revision: randomUUID(),
        publishedRevision: snapshot.revision,
        document: initialDocument(snapshot),
      })
      .returning()
  }
  if (!row) throw new Error('Não foi possível criar o rascunho da aula')
  return {
    ...row,
    isPublished: snapshot.lesson.isPublished,
    updatedAt: row.updatedAt.toISOString(),
  }
}

function checkDocumentBounds(document: LessonDraftDocument) {
  if (
    document.blocks.length > 200 ||
    document.sections.length > 60 ||
    document.attachments.length > 100 ||
    document.plannedVideos.length > 200
  )
    throw new ValidationError('A aula excede o limite de blocos, seções ou anexos.')
  const ids = document.blocks.map((b) => b.id)
  if (new Set(ids).size !== ids.length)
    throw new ValidationError('Há blocos duplicados no rascunho.')
  const assigned = [...document.sections.flatMap((s) => s.blockIds), ...document.supportBlockIds]
  if (
    new Set(assigned).size !== assigned.length ||
    ids.some((id) => !assigned.includes(id)) ||
    assigned.some((id) => !ids.includes(id))
  )
    throw new ValidationError('Cada bloco precisa estar em uma seção ou nos materiais de apoio.')
  if (
    new Set(document.plannedVideos.map((v) => v.blockId)).size !== document.plannedVideos.length ||
    document.plannedVideos.some(
      (v) => !document.blocks.some((b) => b.id === v.blockId && b.content.kind === 'video'),
    )
  )
    throw new ValidationError(
      'Os vídeos planejados precisam corresponder a blocos de vídeo distintos da aula.',
    )
}

function isVimeoVideo(src: string, id: string) {
  try {
    const url = new URL(src)
    return (
      url.protocol === 'https:' &&
      url.hostname === 'player.vimeo.com' &&
      url.pathname === `/video/${id}`
    )
  } catch {
    return false
  }
}

export class DrizzleLessonDraftRepository implements LessonDraftRepository {
  constructor(
    private readonly db: Database,
    private readonly parseBlock: ParsePublishedBlock,
  ) {}

  async read(lessonId: string) {
    return this.db.transaction(async (tx) => {
      await lockDraft(tx, lessonId)
      return readDraft(tx, lessonId)
    })
  }

  private async write(
    lessonId: string,
    authorId: string,
    expectedRevision: string,
    operationId: string,
    input: unknown,
    update: (draft: LessonDraft, tx: Transaction) => Promise<LessonDraftDocument>,
  ) {
    return this.db.transaction(async (tx) => {
      await lockDraft(tx, lessonId)
      const draft = await readDraft(tx, lessonId)
      const hash = fingerprint({ authorId, expectedRevision, input })
      const [previous] = await tx
        .select()
        .from(lessonDraftOperations)
        .where(
          and(
            eq(lessonDraftOperations.lessonId, lessonId),
            eq(lessonDraftOperations.operationId, operationId),
          ),
        )
      if (previous) {
        if (previous.fingerprint !== hash || previous.revision !== draft.revision)
          throw new LessonDraftConflictError()
        return draft
      }
      if (draft.revision !== expectedRevision) throw new LessonDraftConflictError()
      const document = await update(draft, tx)
      checkDocumentBounds(document)
      const revision = randomUUID()
      const updatedAt = new Date()
      const snapshot = await publishedSnapshot(tx, lessonId)
      const publishedRevision =
        input && typeof input === 'object' && ('publish' in input || 'unpublish' in input)
          ? snapshot.revision
          : draft.publishedRevision
      await tx
        .update(lessonDrafts)
        .set({ document, revision, publishedRevision, updatedBy: authorId, updatedAt })
        .where(eq(lessonDrafts.lessonId, lessonId))
      await tx
        .insert(lessonDraftOperations)
        .values({ lessonId, operationId, authorId, fingerprint: hash, revision })
      return {
        ...draft,
        document,
        revision,
        publishedRevision,
        isPublished: snapshot.lesson.isPublished,
        updatedBy: authorId,
        updatedAt: updatedAt.toISOString(),
      }
    })
  }

  async change(lessonId: string, authorId: string, command: LessonDraftCommand) {
    return this.write(
      lessonId,
      authorId,
      command.expectedRevision,
      command.operationId,
      command.change,
      async (draft) => applyLessonDraftChange(draft.document, command.change),
    )
  }

  async unpublish(
    lessonId: string,
    authorId: string,
    expectedRevision: string,
    operationId: string,
  ) {
    return this.write(
      lessonId,
      authorId,
      expectedRevision,
      operationId,
      { unpublish: true },
      async (draft, tx) => {
        const snapshot = await publishedSnapshot(tx, lessonId)
        if (
          snapshot.revision !== draft.publishedRevision &&
          snapshot.migrationRevision !== draft.publishedRevision
        )
          throw new LessonDraftConflictError()
        const content = new DrizzleContentAdminRepository(tx)
        const course = await new DrizzleCourseRepository(tx).findCourseById(
          snapshot.lesson.courseId,
        )
        if (
          course?.status === 'published' &&
          (await content.countPublishedLessons(course.id, { excludeLessonId: lessonId })) === 0
        )
          throw new NoPublishedLessonError(
            'Esta é a última aula publicada — despublique o curso antes de removê-la.',
          )
        await content.updateLesson(lessonId, {
          title: snapshot.lesson.title,
          slug: snapshot.lesson.slug,
          estimatedMinutes: snapshot.lesson.estimatedMinutes,
          isPublished: false,
        })
        return draft.document
      },
    )
  }

  async replace(
    lessonId: string,
    authorId: string,
    expectedRevision: string,
    operationId: string,
    document: LessonDraftDocument,
  ) {
    return this.write(
      lessonId,
      authorId,
      expectedRevision,
      operationId,
      { replace: document },
      async () => document,
    )
  }

  private inspect(document: LessonDraftDocument, readyVideoIds: string[]) {
    const issues: LessonDraftIssue[] = []
    const blocks: { id: string; content: LessonBlockContent }[] = []
    if (
      !document.title.trim() ||
      document.title.length > 300 ||
      document.slug.length > 200 ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(document.slug)
    )
      issues.push({ message: 'Informe o título e um slug válido para a aula.' })
    const invalid = validateLessonSections(
      document.sections,
      document.blocks.map((b) => ({ id: b.id, kind: b.content.kind })),
      document.supportBlockIds,
    )
    if (invalid) issues.push({ message: invalid })
    if (document.sections.some((s) => s.pendingMedia.length))
      issues.push({
        message: 'Converta as mídias pendentes em cartões de vídeo antes de publicar.',
      })
    if (new Set(document.attachments.map((a) => a.id)).size !== document.attachments.length)
      issues.push({ message: 'Há anexos duplicados.' })
    for (const attachment of document.attachments)
      if (
        !attachment.label.trim() ||
        attachment.label.length > 200 ||
        attachment.url.length > 2000 ||
        !/^(https?:\/\/|r2priv:)./.test(attachment.url)
      )
        issues.push({ message: 'Informe o rótulo e um arquivo ou URL válida para cada anexo.' })
    for (const block of document.blocks) {
      try {
        const content = canonicalizeBlockContent(this.parseBlock(block.content))
        assertBlockCoherent(content)
        blocks.push({ id: block.id, content })
        if (document.supportBlockIds.includes(block.id) && isCompletionGatingBlock(content))
          issues.push({
            blockId: block.id,
            message: 'Coloque esta atividade obrigatória em uma seção do percurso.',
          })
      } catch (error) {
        issues.push({
          blockId: block.id,
          message: error instanceof Error ? error.message : 'Conteúdo incompleto.',
        })
      }
    }
    if (
      blocks.some((b) => b.content.kind === 'certificate') &&
      blocks.some((b) => isCompletionGatingBlock(b.content))
    )
      issues.push({ message: 'A aula de certificado não pode conter atividades obrigatórias.' })
    for (const video of document.plannedVideos) {
      const content = document.blocks.find((b) => b.id === video.blockId)?.content
      if (
        !video.videoId ||
        !readyVideoIds.includes(video.videoId) ||
        content?.provider !== 'vimeo' ||
        typeof content.src !== 'string' ||
        !isVimeoVideo(content.src, video.videoId)
      )
        issues.push({
          blockId: video.blockId,
          message: 'Envie o vídeo planejado e aguarde a confirmação do processamento no Vimeo.',
        })
    }
    issues.push(...studioSectionCompletionIssues(document.sections, blocks))
    return { issues, blocks }
  }

  async validate(lessonId: string, expectedRevision: string, readyVideoIds: string[]) {
    const draft = await this.read(lessonId)
    if (draft.revision !== expectedRevision) throw new LessonDraftConflictError()
    return this.inspect(draft.document, readyVideoIds).issues
  }

  async publish(
    lessonId: string,
    authorId: string,
    expectedRevision: string,
    operationId: string,
    readyVideoIds: string[],
  ) {
    return this.write(
      lessonId,
      authorId,
      expectedRevision,
      operationId,
      { publish: true },
      async (draft, tx) => {
        const snapshot = await publishedSnapshot(tx, lessonId)
        if (
          snapshot.revision !== draft.publishedRevision &&
          snapshot.migrationRevision !== draft.publishedRevision
        )
          throw new LessonDraftConflictError()
        const { issues, blocks } = this.inspect(draft.document, readyVideoIds)
        if (issues.length) throw new ValidationError(issues.map((i) => i.message).join('\n'))
        const content = new DrizzleContentAdminRepository(tx)
        const hadShowcase =
          (await content.listCourseIdsWithShowcaseBlock([snapshot.lesson.courseId])).length > 0
        const ids = blocks.map((b) => b.id)
        const existingRows = await tx
          .select()
          .from(lessonBlocks)
          .where(eq(lessonBlocks.lessonId, lessonId))
        // Client-provided identities can only create new rows or retain this lesson's own rows.
        if (ids.length) {
          const foreign = await tx
            .select({ id: lessonBlocks.id })
            .from(lessonBlocks)
            .where(and(inArray(lessonBlocks.id, ids), sql`${lessonBlocks.lessonId} <> ${lessonId}`))
          if (foreign.length) throw new ValidationError('Um bloco pertence a outra aula.')
        }
        await tx
          .update(lessonBlocks)
          .set({ archivedAt: new Date() })
          .where(
            and(
              eq(lessonBlocks.lessonId, lessonId),
              isNull(lessonBlocks.archivedAt),
              ids.length ? notInArray(lessonBlocks.id, ids) : undefined,
            ),
          )
        await tx
          .update(lessonBlocks)
          .set({ sortOrder: sql`${lessonBlocks.sortOrder} - 2000000` })
          .where(and(eq(lessonBlocks.lessonId, lessonId), isNull(lessonBlocks.archivedAt)))
        for (const [sortOrder, block] of blocks.entries()) {
          const old = existingRows.find((b) => b.id === block.id)
          if (old && old.kind !== block.content.kind)
            throw new ValidationError(
              'Para trocar o tipo, adicione outro bloco. O histórico do bloco original será preservado.',
            )
          let previousContent = old?.content
          if (old) {
            try {
              previousContent = canonicalizeBlockContent(this.parseBlock(old.content))
            } catch {
              /* Previously invalid content gets a new revision after repair. */
            }
          }
          const changed = !old || stableJson(previousContent) !== stableJson(block.content)
          const values = {
            lessonId,
            kind: block.content.kind,
            content: block.content,
            archivedAt: null,
            sortOrder,
            contentRevision: changed ? randomUUID().replaceAll('-', '') : old.contentRevision,
          }
          await tx
            .insert(lessonBlocks)
            .values({ id: block.id, ...values })
            .onConflictDoUpdate({ target: lessonBlocks.id, set: values })
          if (old && quizGateFingerprint(old.content) !== quizGateFingerprint(block.content))
            await tx.delete(quizAttempts).where(eq(quizAttempts.blockId, block.id))
          if (
            old &&
            studioActivityFingerprint(old.content) !== studioActivityFingerprint(block.content)
          )
            await tx
              .update(studioSubmissions)
              .set({ score: null, results: null, checkedAt: null, passedAt: null })
              .where(eq(studioSubmissions.blockId, block.id))
        }
        // Validate against the final set, avoiding transient conflicts while replacing content.
        if ((await content.countCertificateBlocks(snapshot.lesson.courseId)) > 1)
          throw new ValidationError('O curso já possui um bloco de certificado.')
        for (const block of blocks)
          if (block.content.kind === 'pinta' && block.content.chain?.trim())
            await assertPintaChainTypeMatches(
              content,
              snapshot.lesson.courseId,
              block.content,
              block.id,
            )
        const attachmentIds = draft.document.attachments.map((a) => a.id)
        if (attachmentIds.length) {
          const foreign = await tx
            .select({ id: lessonAttachments.id })
            .from(lessonAttachments)
            .where(
              and(
                inArray(lessonAttachments.id, attachmentIds),
                sql`${lessonAttachments.lessonId} <> ${lessonId}`,
              ),
            )
          if (foreign.length) throw new ValidationError('Um anexo pertence a outra aula.')
        }
        await tx.delete(lessonAttachments).where(eq(lessonAttachments.lessonId, lessonId))
        if (draft.document.attachments.length)
          await tx
            .insert(lessonAttachments)
            .values(
              draft.document.attachments.map((a, sortOrder) => ({ ...a, lessonId, sortOrder })),
            )
        await tx
          .update(lessons)
          .set({
            title: draft.document.title.trim(),
            slug: draft.document.slug,
            estimatedMinutes: draft.document.estimatedMinutes,
            isPublished: true,
            updatedAt: new Date(),
          })
          .where(eq(lessons.id, lessonId))
        const structure = {
          lessonId,
          sections: draft.document.sections,
          supportBlockIds: draft.document.supportBlockIds,
          revision: randomUUID(),
        }
        await tx
          .insert(lessonStructures)
          .values(structure)
          .onConflictDoUpdate({ target: lessonStructures.lessonId, set: structure })
        const [course] = await tx
          .select()
          .from(courses)
          .where(eq(courses.id, snapshot.lesson.courseId))
        if (
          hadShowcase &&
          course?.status === 'published' &&
          course.audience === 'kids' &&
          course.careerSlot !== null &&
          !(await content.listCourseIdsWithShowcaseBlock([course.id])).length
        )
          throw new NoShowcaseBlockError()
        return {
          ...draft.document,
          blocks: blocks.map((b) => ({ id: b.id, content: { ...b.content } })),
        }
      },
    )
  }
}
