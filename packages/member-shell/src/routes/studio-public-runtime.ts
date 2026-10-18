import 'server-only'
import {
  InvalidJsonBodyError,
  RequestBodyTooLargeError,
  readJsonBodyWithLimit,
} from '@sistemazero/core/http'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { HubClient, MembersClient } from '../server/clients'
import { authorizeStudioPublicPython } from '../server/studio-public-python'
import { StudioPublicationError } from '../server/studio-publication'

const Input = z.strictObject({
  playId: z.uuid(),
  publicationRevision: z.string().regex(/^[a-f0-9]{64}$/),
})
export function createStudioPublicRuntimeRoute(deps: {
  hub: Pick<HubClient, 'resolveStudioPlay'>
  members: Pick<MembersClient, 'authorizePublicRuntime'>
}) {
  const json = (body: unknown, status: number) =>
    NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
  return {
    POST: async (request: Request) => {
      if (
        request.headers.has('content-encoding') ||
        !/^application\/json(?:;|$)/i.test(request.headers.get('content-type') ?? '')
      )
        return json({ error: { code: 'INVALID_INPUT' } }, 400)
      try {
        const parsed = Input.safeParse(await readJsonBodyWithLimit(request, 1024))
        if (!parsed.success) return json({ error: { code: 'INVALID_INPUT' } }, 400)
        return json(
          await authorizeStudioPublicPython({ ...deps, ...parsed.data, signal: request.signal }),
          200,
        )
      } catch (error) {
        if (error instanceof InvalidJsonBodyError)
          return json({ error: { code: 'INVALID_INPUT' } }, 400)
        if (error instanceof RequestBodyTooLargeError)
          return json({ error: { code: 'PAYLOAD_TOO_LARGE' } }, 413)
        if (error instanceof StudioPublicationError)
          return json(
            { error: { code: 'PUBLIC_RUNTIME_UNAVAILABLE', message: error.message } },
            error.status,
          )
        return json({ error: { code: 'PUBLIC_RUNTIME_UNAVAILABLE' } }, 503)
      }
    },
  }
}
