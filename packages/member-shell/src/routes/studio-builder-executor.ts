import 'server-only'
import { timingSafeEqual } from 'node:crypto'
import { readJsonBodyWithLimit } from '@sistemazero/core/http'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getEnv } from '../lib/env'
import type { MembersClient } from '../server/clients'
import { advanceStudioBuilder } from '../server/studio-builder'

const delivery = z
  .object({
    id: z.string().uuid(),
    projectId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
    parentOrigin: z
      .string()
      .max(2048)
      .url()
      .refine(
        (value) =>
          ['http:', 'https:'].includes(new URL(value).protocol) && new URL(value).origin === value,
      ),
    actor: z
      .object({ userId: z.string().uuid(), accountId: z.string().uuid(), privileged: z.boolean() })
      .strict(),
  })
  .strict()

/** Service-only bounded step. Cookies and browser claims never authorize this endpoint. */
export function createStudioBuilderExecutorRoutes(deps: {
  members: MembersClient
  advance?: typeof advanceStudioBuilder
}) {
  return {
    studioBuilderExecutor: {
      POST: async (request: Request) => {
        const env = getEnv(),
          headers = { 'Cache-Control': 'no-store' }
        const reply = (status: number) =>
          NextResponse.json({ ok: status === 200 }, { status, headers })
        if (
          !env.STUDIO_BUILDER_EXECUTOR_SECRET ||
          !env.STUDIO_PRO_RUNTIME_URL ||
          !env.STUDIO_PRO_RUNTIME_TOKEN
        )
          return reply(503)
        const expected = Buffer.from(`Bearer ${env.STUDIO_BUILDER_EXECUTOR_SECRET}`),
          supplied = Buffer.from(request.headers.get('authorization') ?? '')
        if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied))
          return reply(401)
        let input: z.infer<typeof delivery>
        try {
          input = delivery.parse(await readJsonBodyWithLimit(request, 4096))
        } catch {
          return reply(400)
        }
        try {
          await (deps.advance ?? advanceStudioBuilder)({
            ...input,
            members: deps.members,
            runtimeUrl: env.STUDIO_PRO_RUNTIME_URL,
            runtimeToken: env.STUDIO_PRO_RUNTIME_TOKEN,
            signal: request.signal,
          })
          return reply(200)
        } catch (error) {
          console.error('[studio-builder-executor] step unavailable', {
            name: error instanceof Error ? error.name : 'Error',
          })
          return reply(503)
        }
      },
    },
  }
}
