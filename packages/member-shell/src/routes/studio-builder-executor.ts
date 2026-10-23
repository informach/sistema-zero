import 'server-only'
import { timingSafeEqual } from 'node:crypto'
import { readJsonBodyWithLimit } from '@sistemazero/core/http'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getEnv } from '../lib/env'
import type { MembersClient } from '../server/clients'
import { advanceStudioBuilder } from '../server/studio-builder'
import {
  studioBuilderRuntimeAvailable,
  studioBuilderRuntimeOptions,
} from '../server/studio-builder-runtime'

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
      .object({
        userId: z.string().uuid(),
        accountId: z.string().uuid(),
        privileged: z.boolean(),
        audience: z.enum(['kids', 'adult']).optional(),
      })
      .strict(),
  })
  .strict()

/** Service-only bounded step. Cookies and browser claims never authorize this endpoint. */
export function createStudioBuilderExecutorRoutes(deps: {
  members: Pick<MembersClient, 'studioBuilder' | 'studioAiUsage'>
  audience?: 'kids' | 'adult'
  advance?: typeof advanceStudioBuilder
}) {
  return {
    studioBuilderExecutor: {
      POST: async (request: Request) => {
        const env = getEnv(),
          headers = { 'Cache-Control': 'no-store' }
        const reply = (status: number) =>
          NextResponse.json({ ok: status === 200 }, { status, headers })
        if (!env.STUDIO_BUILDER_EXECUTOR_SECRET) return reply(503)
        const expected = Buffer.from(`Bearer ${env.STUDIO_BUILDER_EXECUTOR_SECRET}`),
          supplied = Buffer.from(request.headers.get('authorization') ?? '')
        if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied))
          return reply(401)
        let input: z.infer<typeof delivery>
        try {
          input = delivery.parse(await readJsonBodyWithLimit(request, 4096))
          if ((input.actor.audience ?? 'kids') !== (deps.audience ?? 'kids')) return reply(403)
        } catch {
          return reply(400)
        }
        try {
          const runtime = studioBuilderRuntimeOptions(env)
          const saved = await deps.members.studioBuilder(
            input.actor,
            {
              operation: 'get',
              id: input.id,
              projectId: input.projectId,
            },
            request.signal,
          )
          if (saved.status !== 200 || !saved.body) return reply(503)
          const base = saved.body.state?.job.base
          if (!base) return reply(200)
          const language =
            base.version === 2 ? base.configuration.programmingLanguage : 'javascript'
          // Configuration failure leaves the queued job untouched; it must not claim a lease.
          if (!studioBuilderRuntimeAvailable(runtime, language)) return reply(503)
          await (deps.advance ?? advanceStudioBuilder)({
            ...input,
            members: deps.members,
            ...runtime,
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
