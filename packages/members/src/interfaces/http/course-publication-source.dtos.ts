import { ModuleAnimationSchema } from '@sistemazero/core/course/module-animation'
import type { DraftBlockContent, LessonSection } from '@sistemazero/core/learning'
import { getSchemaValidator } from 'elysia'
import { z } from 'zod'
import { COURSE_LEVELS, COURSE_TRACKS } from '../../domain/course/course'
import type { StoredPublicationSnapshot } from '../../domain/course-publication/jobs'
import { LessonSectionSchema } from './learning.dtos'
import { parsePublishedLessonBlock } from './lesson-draft.dtos'

const dates = { createdAt: z.iso.datetime(), updatedAt: z.iso.datetime() }
const archived = { ...dates, archivedAt: z.null() }
const title = z.string().min(1).max(500)
const slug = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
const section = getSchemaValidator(LessonSectionSchema)
const document = z.strictObject({
  title,
  slug,
  estimatedMinutes: z.number().int().nonnegative().nullable(),
  blocks: z
    .array(
      z.strictObject({
        id: z.uuid(),
        content: z
          .unknown()
          .transform((value): DraftBlockContent => ({ ...parsePublishedLessonBlock(value) })),
      }),
    )
    .min(1)
    .max(1000),
  sections: z.array(z.custom<LessonSection>((value) => section.Check(value))).max(1000),
  attachments: z
    .array(
      z.strictObject({
        id: z.uuid(),
        label: z.string().max(200),
        url: z.string().max(4000),
        fileType: z.string().max(100).nullable(),
        sizeBytes: z.number().int().nonnegative().nullable(),
        zappyStudentNotebook: z.boolean().optional(),
      }),
    )
    .max(1000),
  plannedVideos: z
    .array(
      z.strictObject({
        blockId: z.uuid(),
        instructions: z.string().max(5000),
        videoId: z
          .string()
          .regex(/^\d{1,20}$/)
          .nullable(),
      }),
    )
    .max(1000),
})

/** Private, bounded teaching capture. It carries no learner progress, conversations or submissions. */
export const PublicationSourceSchema = z
  .strictObject({
    course: z.strictObject({
      ...dates,
      id: z.uuid(),
      version: z.number().int().nonnegative(),
      slug,
      title,
      subtitle: z.string().nullable(),
      description: z.string().nullable(),
      coverImageUrl: z.string().nullable(),
      status: z.literal('published'),
      audience: z.literal('kids'),
      modality: z.literal('recorded'),
      level: z.enum(COURSE_LEVELS),
      track: z.enum(COURSE_TRACKS),
      careerSlot: z.number().int().positive().nullable(),
      journeyRole: z.enum(['positioned', 'reward', 'extra']),
      sequentialLock: z.boolean(),
      videoBeforeActivity: z.boolean(),
      metadata: z.record(z.string(), z.unknown()).nullable(),
    }),
    modules: z
      .array(
        z.strictObject({
          ...archived,
          id: z.uuid(),
          courseId: z.uuid(),
          title,
          summary: z.string().nullable(),
          animation: ModuleAnimationSchema.nullable().default(null),
          sortOrder: z.number().int(),
        }),
      )
      .min(1)
      .max(1000),
    lessons: z
      .array(
        z.strictObject({
          row: z.strictObject({
            ...archived,
            id: z.uuid(),
            courseId: z.uuid(),
            moduleId: z.uuid(),
            title,
            slug,
            sortOrder: z.number().int(),
            estimatedMinutes: z.number().int().nonnegative().nullable(),
            isPublished: z.literal(true),
          }),
          published: document,
          publishedRevision: z.string().min(1).max(128),
          draft: z.strictObject({ revision: z.uuid(), document }).nullable(),
        }),
      )
      .min(1)
      .max(5000),
    archivedModules: z.array(z.never()).max(0).optional(),
    archivedLessons: z.array(z.never()).max(0).optional(),
  })
  .superRefine((source, context) => {
    const moduleIds = new Set(source.modules.map((module) => module.id))
    const lessonIds = new Set(source.lessons.map((lesson) => lesson.row.id))
    if (
      moduleIds.size !== source.modules.length ||
      lessonIds.size !== source.lessons.length ||
      source.modules.some((module) => module.courseId !== source.course.id) ||
      source.lessons.some(
        (lesson) => lesson.row.courseId !== source.course.id || !moduleIds.has(lesson.row.moduleId),
      )
    )
      context.addIssue({ code: 'custom', message: 'A grade não pertence à origem declarada' })
    const blocks = source.lessons.flatMap((lesson) =>
      lesson.published.blocks.map((block) => block.id),
    )
    if (new Set(blocks).size !== blocks.length)
      context.addIssue({
        code: 'custom',
        message: 'A origem repete identidade de bloco entre aulas',
      })
  })
export function parsePublicationSource(value: unknown): StoredPublicationSnapshot['source'] {
  return PublicationSourceSchema.parse(value)
}
