import {
  CourseTransferPendingError,
  CourseTransferResultSchema,
  CourseTransferTaskSchema,
} from '@sistemazero/core/course/publication'
import { RequestBodyTooLargeError, readJsonBodyWithLimit } from '@sistemazero/core/http'
import { safeEqual } from '@sistemazero/core/security'
import { z } from 'zod'
import type { createCourseTransferService } from './course-transfer'

const input = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('context'), salesPageUrl: z.url().max(4096).optional() }),
  z.strictObject({ action: z.literal('execute'), task: CourseTransferTaskSchema }),
  z.strictObject({
    action: z.literal('verify'),
    task: CourseTransferTaskSchema,
    result: CourseTransferResultSchema,
  }),
])
const respond = (status: number, result: unknown) =>
  Response.json(result, { status, headers: { 'cache-control': 'private, no-store' } })
export async function handleCourseTransfer(
  request: Request,
  deps: {
    token?: string
    environment?: string
    service?: ReturnType<typeof createCourseTransferService>
  },
) {
  if (!deps.token || deps.environment !== 'production' || !deps.service)
    return respond(503, { error: 'COURSE_TRANSFER_UNAVAILABLE' })
  if (
    !safeEqual(request.headers.get('x-course-publication-token') ?? '', deps.token) ||
    request.headers.get('x-course-environment') !== 'production'
  )
    return respond(401, { error: 'UNAUTHORIZED' })
  if (
    !/^application\/json(?:;|$)/i.test(request.headers.get('content-type') ?? '') ||
    request.headers.has('content-encoding')
  )
    return respond(400, { error: 'INVALID_INPUT' })
  let body: z.infer<typeof input>
  try {
    body = input.parse(await readJsonBodyWithLimit(request, 2 * 1024 * 1024, request.signal))
  } catch (error) {
    return respond(error instanceof RequestBodyTooLargeError ? 413 : 400, {
      error: 'INVALID_INPUT',
    })
  }
  if (
    body.action !== 'context' &&
    request.headers.get('x-course-transfer-profile') !== deps.service.profileHash
  )
    return respond(409, { error: 'COURSE_TRANSFER_PROFILE_CHANGED' })
  try {
    request.signal.throwIfAborted()
    if (body.action === 'verify') {
      await deps.service.verify(body.task, body.result)
      return respond(200, { environment: 'production', result: { verified: true } })
    }
    const result =
      body.action === 'context'
        ? deps.service.context(body.salesPageUrl)
        : await deps.service.execute(body.task)
    return respond(200, { environment: 'production', result })
  } catch (error) {
    return error instanceof CourseTransferPendingError
      ? respond(202, { environment: 'production', pending: true })
      : respond(422, { error: 'COURSE_TRANSFER_NOT_READY' })
  }
}
