import 'server-only'
import {
  InvalidJsonBodyError,
  RequestBodyTooLargeError,
  readJsonBodyWithLimit,
} from '@sistemazero/core/http'
import { StudioLessonRuntimeRequestSchema } from '@sistemazero/core/studio/runtime-authorization'
import { NextResponse } from 'next/server'
import type { MembersClient } from '../server/clients'

/** Same-origin transport only. The Members service resolves identity and current lesson rights. */
export function createStudioLessonRuntimeRoutes(
  members: Pick<MembersClient, 'authorizeLessonRuntime'>,
) {
  const json = (body: unknown, status: number) =>
    NextResponse.json(body, {
      status,
      headers: { 'Cache-Control': 'private, no-store' },
    })
  return {
    POST: async (
      request: Request,
      context: { params: Promise<{ lessonId: string; blockId: string }> },
    ) => {
      if (
        request.headers.has('content-encoding') ||
        !/^application\/json(?:;|$)/i.test(request.headers.get('content-type') ?? '')
      )
        return json(
          { error: { code: 'INVALID_INPUT', message: 'Pedido de execução inválido.' } },
          400,
        )
      let raw: unknown
      try {
        raw = await readJsonBodyWithLimit(request, 2_000_000)
      } catch (error) {
        if (error instanceof RequestBodyTooLargeError)
          return json(
            {
              error: {
                code: 'PAYLOAD_TOO_LARGE',
                message: 'A configuração excede o limite permitido.',
              },
            },
            413,
          )
        if (error instanceof InvalidJsonBodyError)
          return json(
            { error: { code: 'INVALID_INPUT', message: 'Pedido de execução inválido.' } },
            400,
          )
        throw error
      }
      const parsed = StudioLessonRuntimeRequestSchema.safeParse(raw)
      if (!parsed.success)
        return json(
          { error: { code: 'INVALID_INPUT', message: 'Pedido de execução inválido.' } },
          400,
        )
      const { lessonId, blockId } = await context.params
      const { status, body } = await members.authorizeLessonRuntime(lessonId, blockId, parsed.data)
      return json(body, status)
    },
  }
}
