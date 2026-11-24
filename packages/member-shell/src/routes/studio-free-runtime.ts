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
  members: Pick<MembersClient, 'studioFreeOptions' | 'authorizeFreeRuntime' | 'studioStudentTests'>,
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
    /**
     * "Meus testes" no Pro (proposta aprovada em 20/11/2026): repassa um lote de testes e o
     * projeto ao members, que confere o acesso ao Pro e roda no executor do servidor. Quem pode e
     * o que cabe é o members que decide; aqui só a forma e o tamanho.
     */
    tests: {
      POST: async (request: Request) => {
        const signal = AbortSignal.any([request.signal, AbortSignal.timeout(170_000)])
        if (
          request.headers.has('content-encoding') ||
          !/^application\/json(?:;|$)/i.test(request.headers.get('content-type') ?? '')
        )
          return json({ error: { code: 'INVALID_INPUT' } }, 400)
        try {
          const body = await awaitWithSignal(
            () => readJsonBodyWithLimit(request, 2_000_000),
            signal,
          )
          if (
            typeof body !== 'object' ||
            body === null ||
            !('project' in body) ||
            typeof body.project !== 'object' ||
            body.project === null ||
            !('tests' in body) ||
            !Array.isArray(body.tests) ||
            body.tests.length === 0 ||
            body.tests.length > 8
          )
            return json({ error: { code: 'INVALID_INPUT' } }, 400)
          const response = await awaitWithSignal(
            () =>
              members.studioStudentTests(
                { project: body.project, tests: body.tests as unknown[] },
                { signal },
              ),
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
