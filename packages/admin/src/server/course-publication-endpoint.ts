import type {
  CoursePublicationMediaPlan,
  CoursePublicationMediaResult,
  CoursePublicationMediaTask,
} from '@sistemazero/core/course/publication'
import { CoursePublicationMediaTaskSchema } from '@sistemazero/core/course/publication'
import { RequestBodyTooLargeError, readJsonBodyWithLimit } from '@sistemazero/core/http'
import type { LessonDraftDocument } from '@sistemazero/core/learning'
import { safeEqual } from '@sistemazero/core/security'
import { z } from 'zod'

const envelope = z.discriminatedUnion('action', [
  z.strictObject({
    action: z.literal('plan'),
    documents: z
      .array(
        z.strictObject({
          title: z.string().max(500),
          slug: z.string().max(250),
          estimatedMinutes: z.number().nullable(),
          blocks: z
            .array(
              z.strictObject({
                id: z.uuid(),
                content: z
                  .record(z.string(), z.unknown())
                  .refine((value) => typeof value.kind === 'string'),
              }),
            )
            .max(1000),
          attachments: z
            .array(
              z.strictObject({
                id: z.uuid(),
                label: z.string(),
                url: z.string(),
                fileType: z.string().nullable(),
                sizeBytes: z.number().nullable(),
                zappyStudentNotebook: z.boolean().optional(),
              }),
            )
            .max(1000),
          // Only media-related content is transported. No section structure is needed for planning.
        }),
      )
      .max(1),
  }),
  z.strictObject({ action: z.literal('execute'), task: CoursePublicationMediaTaskSchema }),
])
export interface PublicationMediaEndpointDependencies {
  token?: string
  environment?: 'local' | 'staging' | 'production'
  profileHash: string
  plan(documents: readonly LessonDraftDocument[]): CoursePublicationMediaPlan
  execute(task: CoursePublicationMediaTask): Promise<CoursePublicationMediaResult>
}
const respond = (status: number, body: unknown) =>
  Response.json(body, { status, headers: { 'cache-control': 'private, no-store' } })

/** Dedicated S2S capability. It never accepts a session cookie, role header or destination URL. */
export async function handleCoursePublicationMedia(
  request: Request,
  deps: PublicationMediaEndpointDependencies,
) {
  if (!deps.token || !deps.environment)
    return respond(503, { error: 'COURSE_PUBLICATION_UNAVAILABLE' })
  if (
    !safeEqual(request.headers.get('x-course-publication-token') ?? '', deps.token) ||
    request.headers.get('x-course-environment') !== deps.environment
  )
    return respond(401, { error: 'UNAUTHORIZED' })
  if (
    !/^application\/json(?:;|$)/i.test(request.headers.get('content-type') ?? '') ||
    request.headers.has('content-encoding')
  )
    return respond(400, { error: 'INVALID_INPUT' })
  let body: z.infer<typeof envelope>
  try {
    body = envelope.parse(await readJsonBodyWithLimit(request, 16 * 1024 * 1024, request.signal))
  } catch (error) {
    return respond(error instanceof RequestBodyTooLargeError ? 413 : 400, {
      error: 'INVALID_INPUT',
    })
  }
  try {
    if (
      body.action === 'execute' &&
      request.headers.get('x-course-media-profile') !== deps.profileHash
    )
      return respond(409, { error: 'COURSE_MEDIA_PROFILE_CHANGED' })
    const result =
      body.action === 'plan'
        ? deps.plan(
            body.documents.map((document) => ({
              ...document,
              blocks: document.blocks as LessonDraftDocument['blocks'],
              sections: [],
              plannedVideos: [],
            })),
          )
        : await deps.execute(body.task)
    return respond(200, { environment: deps.environment, result })
  } catch {
    // Never forward provider bodies, signed transcript URLs, PDF content or synthesis credentials.
    return respond(422, { error: 'COURSE_MEDIA_NOT_READY' })
  }
}
