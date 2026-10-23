import { ValidationError } from '@sistemazero/core/errors'
import {
  defaultLessonSection,
  type LessonDraftDocument,
  lessonStudioExampleTransportIssues,
} from '@sistemazero/core/learning'
import { studioSectionCompletionIssues } from '@sistemazero/studio/server-project-checks'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { assertBlockCoherent } from '../../../application/content-admin/content-admin.service'
import type { StudioAuthoringPolicy } from '../../../domain/studio/authoring-policy'
import { DrizzleCourseRepository } from './course.repository'
import type { Database } from './db'
import { courses, lessonBlocks, lessonDrafts, lessonStructures } from './schema'

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]

/** Caller owns the lesson lock. No large JSON is loaded when no private registry exists. */
export async function assertPublishedStudioExamples(
  tx: Transaction,
  lessonId: string,
  policy?: StudioAuthoringPolicy,
  courseSlugOverride?: string,
): Promise<void> {
  const [present] = await tx
    .select({ id: lessonBlocks.id })
    .from(lessonBlocks)
    .where(
      and(
        eq(lessonBlocks.lessonId, lessonId),
        isNull(lessonBlocks.archivedAt),
        sql`${lessonBlocks.content} ? 'projectExamples'`,
      ),
    )
    .limit(1)
  if (!present) return
  const lesson = await new DrizzleCourseRepository(tx).findLessonWithContent(lessonId, {
    includeAttachments: false,
    includePrivateStudioAuthoring: true,
  })
  if (!lesson) throw new ValidationError('A aula não existe mais.')
  const [course] = await tx
    .select({ slug: courses.slug })
    .from(courses)
    .where(eq(courses.id, lesson.courseId))
  if (!course) throw new ValidationError('O curso não existe mais.')
  const [structure] = await tx
    .select({ sections: lessonStructures.sections })
    .from(lessonStructures)
    .where(eq(lessonStructures.lessonId, lessonId))
  const document: LessonDraftDocument = {
    title: lesson.title,
    slug: lesson.slug,
    estimatedMinutes: lesson.estimatedMinutes,
    blocks: lesson.blocks.map((block) => ({ id: block.id, content: { ...block.content } })),
    sections: structure?.sections ?? [
      defaultLessonSection(
        lessonId,
        lesson.title,
        lesson.blocks.map((block) => block.id),
      ),
    ],
    attachments: [],
    plannedVideos: [],
  }
  const [contextIssue] = studioSectionCompletionIssues(document.sections, document.blocks)
  if (contextIssue) throw new ValidationError(contextIssue.message)
  const [transportIssue] = lessonStudioExampleTransportIssues(
    document,
    courseSlugOverride ?? course.slug,
  )
  if (transportIssue) throw new ValidationError(transportIssue.message)
  // These are published documents, so configuration must also remain executable after a
  // legacy curation/source edit. WIP draft saves deliberately keep their separate protocol.
  for (const block of lesson.blocks)
    if (block.content.kind === 'studio' && Object.hasOwn(block.content, 'projectExamples'))
      assertBlockCoherent(block.content, policy)
}

/** Course-slug changes must preserve the exportability of the draft and its undo document too. */
export async function assertDraftStudioExampleTransport(
  tx: Transaction,
  lessonId: string,
  courseSlug: string,
): Promise<void> {
  const [draft] = await tx
    .select({ document: lessonDrafts.document, previous: lessonDrafts.previousDocument })
    .from(lessonDrafts)
    .where(
      and(
        eq(lessonDrafts.lessonId, lessonId),
        sql`(
      exists (select 1 from jsonb_array_elements(${lessonDrafts.document}->'blocks') block
        where block->'content' ? 'projectExamples')
      or exists (select 1 from jsonb_array_elements(coalesce(${lessonDrafts.previousDocument}->'blocks', '[]'::jsonb)) block
        where block->'content' ? 'projectExamples')
    )`,
      ),
    )
  if (!draft) return
  for (const document of [draft.document, draft.previous]) {
    if (!document) continue
    const [issue] = lessonStudioExampleTransportIssues(document, courseSlug)
    if (issue) throw new ValidationError(issue.message)
  }
}
