import { z } from 'zod'
import { ZAPPY_SOURCE_CONTENT_MAX_BYTES, zappySourceContentBytes } from '../zappy'

const content = z
  .string()
  .refine((text) => zappySourceContentBytes(text) <= ZAPPY_SOURCE_CONTENT_MAX_BYTES)
const sourceRef = z.string().regex(/^(block|attachment):[a-f0-9-]{36}$/i)
export const CourseKnowledgeExtractionSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('text'), content }),
  z.strictObject({ kind: z.literal('stable-vtt'), location: z.url().max(4096) }),
  z.strictObject({ kind: z.literal('vimeo'), videoId: z.string().regex(/^\d+$/).max(32) }),
  z.strictObject({
    kind: z.literal('private-pdf'),
    location: z.string().startsWith('r2priv:').max(2048),
  }),
])
export const CoursePublicationMediaTaskSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('voice'),
    speechText: z.string().min(1).max(1200),
  }),
  z.strictObject({ kind: z.literal('video'), videoId: z.string().regex(/^\d+$/).max(32) }),
  z
    .strictObject({
      kind: z.literal('knowledge'),
      sourceRef,
      sourceType: z.enum(['rich-text', 'video-vtt', 'student-notebook']),
      extraction: CourseKnowledgeExtractionSchema,
    })
    .refine((task) =>
      task.sourceType === 'rich-text'
        ? task.extraction.kind === 'text'
        : task.sourceType === 'student-notebook'
          ? task.extraction.kind === 'private-pdf'
          : ['vimeo', 'stable-vtt'].includes(task.extraction.kind),
    ),
])
export type CoursePublicationMediaTask = z.infer<typeof CoursePublicationMediaTaskSchema>
export const CoursePublicationMediaPlanSchema = z
  .strictObject({
    profileHash: z.string().regex(/^[a-f0-9]{64}$/),
    tasks: z
      .array(
        z.strictObject({
          id: z.string().regex(/^[a-z-]+:[a-f0-9]{64}$/),
          input: CoursePublicationMediaTaskSchema,
        }),
      )
      .max(5000),
    voices: z.record(z.uuid(), z.array(z.string().regex(/^voice:[a-f0-9]{64}$/)).max(1000)),
  })
  .refine((plan) => {
    const tasks = new Map(plan.tasks.map((task) => [task.id, task.input]))
    return (
      tasks.size === plan.tasks.length &&
      Object.values(plan.voices).every(
        (keys) =>
          new Set(keys).size === keys.length &&
          keys.every((key) => tasks.get(key)?.kind === 'voice'),
      )
    )
  }, 'A lista de preparação contém referências inconsistentes')
export type CoursePublicationMediaPlan = z.infer<typeof CoursePublicationMediaPlanSchema>
export const CoursePublicationMediaResultSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('voice'),
    key: z.string().min(1).max(6100),
    url: z.url(),
    generated: z.boolean(),
  }),
  z.strictObject({ kind: z.literal('video'), videoId: z.string().regex(/^\d+$/).max(32) }),
  z.strictObject({
    kind: z.literal('knowledge'),
    sourceRef,
    sourceType: z.enum(['rich-text', 'video-vtt', 'student-notebook']),
    content,
  }),
])
export type CoursePublicationMediaResult = z.infer<typeof CoursePublicationMediaResultSchema>
