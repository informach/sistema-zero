import { z } from 'zod'

export const CoursePublicationOperationSchema = z.enum(['copy-adult', 'promote-kids'])
export const CoursePublicationStatusSchema = z.enum([
  'preview',
  'queued',
  'preparing',
  'publishing',
  'completed',
  'failed',
  'cancelled',
])
export type CoursePublicationOperation = z.infer<typeof CoursePublicationOperationSchema>
export type CoursePublicationStatus = z.infer<typeof CoursePublicationStatusSchema>
export const CoursePublicationPreviewSchema = z.strictObject({
  source: z.strictObject({
    id: z.uuid(),
    title: z.string().min(1).max(300),
    slug: z.string().min(1).max(200),
    environment: z.enum(['local', 'staging', 'production']),
  }),
  target: z.strictObject({
    id: z.uuid(),
    title: z.string().min(1).max(300),
    slug: z.string().min(1).max(200),
    environment: z.enum(['local', 'staging', 'production']),
    audience: z.enum(['kids', 'adult']),
    exists: z.boolean(),
  }),
  modules: z.number().int().nonnegative(),
  lessons: z.number().int().nonnegative(),
  retiredModules: z.number().int().nonnegative(),
  retiredLessons: z.number().int().nonnegative(),
})
export type CoursePublicationPreview = z.infer<typeof CoursePublicationPreviewSchema>
export const CoursePublicationJobViewSchema = z
  .strictObject({
    id: z.uuid(),
    operation: CoursePublicationOperationSchema,
    status: CoursePublicationStatusSchema,
    version: z.number().int().nonnegative(),
    planHash: z.string().regex(/^[a-f0-9]{64}$/),
    preview: CoursePublicationPreviewSchema,
    tasks: z.strictObject({
      completed: z.number().int().nonnegative(),
      total: z.number().int().nonnegative(),
    }),
    error: z.string().max(500).nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .refine(
    (view) =>
      view.tasks.completed <= view.tasks.total &&
      (view.status !== 'completed' || view.tasks.completed === view.tasks.total),
    'Progresso da publicação inconsistente',
  )
export type CoursePublicationJobView = z.infer<typeof CoursePublicationJobViewSchema>
export const CoursePublicationCommandSchema = z.strictObject({
  version: z.number().int().nonnegative(),
  planHash: z.string().regex(/^[a-f0-9]{64}$/),
})
