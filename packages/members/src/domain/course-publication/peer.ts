import {
  type CoursePublicationJobView,
  CoursePublicationStatusSchema,
} from '@sistemazero/core/course/publication'
import { z } from 'zod'
import type { CourseSnapshot } from './course-sync'

export const CoursePromotionBindingSchema = z.strictObject({
  version: z.literal(1),
  jobId: z.uuid(),
  sourceCourseId: z.uuid(),
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
  sourceEnvironment: z.literal('staging'),
  targetEnvironment: z.literal('production'),
  status: CoursePublicationStatusSchema,
})
export type CoursePromotionBinding = z.infer<typeof CoursePromotionBindingSchema>
export interface PromotionPreviewInput {
  source: CourseSnapshot
  sourceHash: string
  targetSlug: string
  actorId: string
  requestKey: string
}
/** Fixed production capability, never a URL or credential supplied by the browser. */
export interface CoursePromotionPeerPort {
  available(): Promise<boolean>
  prepare(input: PromotionPreviewInput): Promise<CoursePublicationJobView>
  view(id: string): Promise<CoursePublicationJobView>
  latest(sourceCourseId: string): Promise<CoursePublicationJobView[]>
  binding(id: string): Promise<CoursePromotionBinding>
  command(
    id: string,
    command: 'approve' | 'cancel' | 'resume',
    version: number,
    planHash: string,
  ): Promise<CoursePublicationJobView>
}
export interface CoursePromotionSourcePort {
  read(jobId: string, signal: AbortSignal): Promise<{ source: CourseSnapshot; sourceHash: string }>
}
