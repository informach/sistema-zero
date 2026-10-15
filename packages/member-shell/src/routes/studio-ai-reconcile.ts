import 'server-only'
import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getEnv } from '../lib/env'
import type { MembersClient } from '../server/clients'
import { providerUsage, readProviderJson } from '../server/studio-ai-transport'

/** Four bounded read-only provider lookups per invocation. No prompt, key or account returned. */
export function createStudioAiReconcileRoutes(deps: { members: MembersClient }) {
  return {
    studioAiReconcileWorker: {
      POST: async (request: Request) => {
        const secret = getEnv().STUDIO_AI_RECONCILE_CRON_SECRET
        const headers = { 'Cache-Control': 'no-store' }
        if (!secret)
          return NextResponse.json(
            { error: { code: 'SERVICE_UNAVAILABLE' } },
            { status: 503, headers },
          )
        const supplied = Buffer.from(request.headers.get('authorization') ?? '')
        const expected = Buffer.from(`Bearer ${secret}`)
        if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected))
          return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401, headers })
        const claim = await deps.members.studioAiReconcile({ operation: 'claim' })
        if (claim.status !== 200 || !claim.body?.jobs)
          return NextResponse.json(
            { error: { code: 'UPSTREAM_UNAVAILABLE' } },
            { status: 502, headers },
          )
        let confirmed = 0,
          pending = 0
        // Parallel lookups are independent; each lease and settlement is atomic in Members.
        await Promise.all(
          claim.body.jobs.slice(0, 4).map(async (job) => {
            try {
              const key = job.source === 'openrouter' ? job.apiKey : getEnv().OPENROUTER_API_KEY
              if (!key) throw new Error('Missing provider credential')
              const controller = new AbortController()
              const timer = setTimeout(() => controller.abort(), 10_000)
              let usage: ReturnType<typeof providerUsage>
              try {
                const response = await fetch(
                  `https://openrouter.ai/api/v1/generation?id=${encodeURIComponent(job.generationId)}`,
                  {
                    headers: { Authorization: `Bearer ${key}` },
                    signal: controller.signal,
                    redirect: 'error',
                    cache: 'no-store',
                  },
                )
                if (!response.ok) {
                  await response.body?.cancel()
                  throw new Error('Provider usage unavailable')
                }
                usage = providerUsage(await readProviderJson(response, controller.signal), true)
              } finally {
                clearTimeout(timer)
                controller.abort()
              }
              if (usage.status !== 'confirmed' || usage.generationId !== job.generationId)
                throw new Error('Provider usage pending')
              const result = await deps.members.studioAiUsage(job.actor, {
                operation: 'settle',
                runId: job.runId,
                settlement: { ...usage, attempt: job.attempt },
              })
              if (result.status !== 200 || result.body?.ok !== true)
                throw new Error('Usage settlement pending')
              confirmed++
            } catch {
              pending++
            } finally {
              await deps.members
                .studioAiReconcile({
                  operation: 'release',
                  runId: job.runId,
                  attempt: job.attempt,
                  claimId: job.claimId,
                })
                .catch(() => undefined)
            }
          }),
        )
        let expiredBuilderJobs: number | null = null
        try {
          const cleanup = await deps.members.studioBuilderCleanup()
          if (cleanup.status === 200) expiredBuilderJobs = cleanup.body.deleted
          else
            console.error('[studio-builder] retention cleanup pending', { status: cleanup.status })
        } catch {
          console.error('[studio-builder] retention cleanup unavailable')
        }
        return NextResponse.json({ confirmed, pending, expiredBuilderJobs }, { headers })
      },
    },
  }
}
