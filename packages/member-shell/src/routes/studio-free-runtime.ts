import 'server-only'
import {
  awaitWithSignal,
  InvalidJsonBodyError,
  RequestBodyTooLargeError,
  readJsonBodyWithLimit,
} from '@sistemazero/core/http'
import { StudioFreeRuntimeRequestSchema } from '@sistemazero/core/studio/runtime-authorization'
import { NextResponse } from 'next/server'
import type { MembersClient } from '../server/clients'

export function createStudioFreeRuntimeRoutes(
  members: Pick<MembersClient, 'studioFreeOptions' | 'authorizeFreeRuntime'>,
  audience: 'kids' | 'adult',
) {
  const json = (body: unknown, status: number) =>
    NextResponse.json(body, {
      status,
      headers: { 'Cache-Control': 'private, no-store' },
    })
  return {
    options: {
      GET: async (request?: Request) => {
        const signal = AbortSignal.any([
          ...(request ? [request.signal] : []),
          AbortSignal.timeout(15_000),
        ])
        const response = await awaitWithSignal(() => members.studioFreeOptions({ signal }), signal)
        return json(response.body, response.status)
      },
    },
    runtime: {
      POST: async (request: Request) => {
        const signal = AbortSignal.any([request.signal, AbortSignal.timeout(15_000)])
        if (
          request.headers.has('content-encoding') ||
          !/^application\/json(?:;|$)/i.test(request.headers.get('content-type') ?? '')
        )
          return json({ error: { code: 'INVALID_INPUT' } }, 400)
        try {
          const parsed = StudioFreeRuntimeRequestSchema.safeParse(
            await awaitWithSignal(() => readJsonBodyWithLimit(request, 2_000_000), signal),
          )
          if (!parsed.success) return json({ error: { code: 'INVALID_INPUT' } }, 400)
          if (parsed.data.context.audience !== audience)
            return json({ error: { code: 'ACCESS_DENIED' } }, 403)
          const response = await awaitWithSignal(
            () => members.authorizeFreeRuntime(parsed.data, { signal }),
            signal,
          )
          return json(response.body, response.status)
        } catch (error) {
          if (error instanceof RequestBodyTooLargeError)
            return json({ error: { code: 'PAYLOAD_TOO_LARGE' } }, 413)
          if (error instanceof InvalidJsonBodyError)
            return json({ error: { code: 'INVALID_INPUT' } }, 400)
          throw error
        }
      },
    },
  }
}
