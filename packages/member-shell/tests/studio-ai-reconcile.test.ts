import { afterEach, beforeEach, expect, mock, spyOn, test } from 'bun:test'

mock.module('server-only', () => ({}))
process.env.JWT_HS256_SECRET ??= 'test-jwt-secret-with-32-characters'
const secret = 'local-studio-reconciliation-test-only'
const env = await import('../src/lib/env')
const actualEnv = env.getEnv()
beforeEach(() =>
  spyOn(env, 'getEnv').mockReturnValue({ ...actualEnv, STUDIO_AI_RECONCILE_CRON_SECRET: secret }),
)
const { createStudioAiReconcileRoutes } = await import('../src/routes/studio-ai-reconcile')
afterEach(() => mock.restore())
const fetchDouble = (
  fn: (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>,
): typeof fetch => Object.assign(fn, { preconnect: globalThis.fetch.preconnect })
const job = {
  actor: { accountId: crypto.randomUUID(), userId: crypto.randomUUID(), privileged: false },
  runId: crypto.randomUUID(),
  attempt: 1,
  claimId: crypto.randomUUID(),
  generationId: 'gen-reconcile',
  source: 'openrouter',
  apiKey: 'external-secret-test-only',
}
const request = (secret?: string) =>
  new Request('https://kids.test/api/internal/studio-ai/reconcile', {
    method: 'POST',
    headers: secret ? { Authorization: `Bearer ${secret}` } : {},
  })
test('cron requires its own server credential and never exposes keys or account identifiers', async () => {
  const actions: unknown[] = []
  const { studioAiReconcileWorker } = createStudioAiReconcileRoutes({
    members: {
      studioBuilderCleanup: async () => ({ status: 200, body: { deleted: 2 } }),
      studioAiReconcile: async (action: { operation: string }) => {
        actions.push(action)
        return { status: 200, body: action.operation === 'claim' ? { jobs: [job] } : { ok: true } }
      },
      studioAiUsage: async (_actor: unknown, action: unknown) => {
        actions.push(action)
        return { status: 200, body: { ok: true } }
      },
    } as never,
  })
  const fetched = spyOn(globalThis, 'fetch').mockImplementation(
    fetchDouble(async (_url: unknown, init: RequestInit = {}) => {
      expect((init.headers as Record<string, string>).Authorization).toBe(
        'Bearer external-secret-test-only',
      )
      return Response.json({
        data: {
          id: job.generationId,
          total_cost: 0.000004,
          native_tokens_prompt: 12,
          native_tokens_completion: 2,
        },
      })
    }),
  )
  expect((await studioAiReconcileWorker.POST(request())).status).toBe(401)
  expect(actions).toHaveLength(0)
  const response = await studioAiReconcileWorker.POST(request(secret))
  expect(await response.json()).toEqual({ confirmed: 1, pending: 0, expiredBuilderJobs: 2 })
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  expect(fetched).toHaveBeenCalledTimes(1)
  expect(actions[1]).toMatchObject({
    operation: 'settle',
    settlement: { actualMicroUsd: 4, generationId: job.generationId },
  })
  expect(actions[2]).toMatchObject({ operation: 'release', claimId: job.claimId })
})
test('unavailable generation is released for bounded backoff without confirming zero', async () => {
  let settlements = 0,
    releases = 0
  const { studioAiReconcileWorker } = createStudioAiReconcileRoutes({
    members: {
      studioBuilderCleanup: async () => ({ status: 200, body: { deleted: 0 } }),
      studioAiReconcile: async (action: { operation: string }) => {
        if (action.operation === 'release') releases++
        return { status: 200, body: action.operation === 'claim' ? { jobs: [job] } : { ok: true } }
      },
      studioAiUsage: async () => {
        settlements++
        return { status: 200, body: { ok: true } }
      },
    } as never,
  })
  spyOn(globalThis, 'fetch').mockImplementation(
    fetchDouble(async () => new Response('', { status: 404 })),
  )
  expect(await (await studioAiReconcileWorker.POST(request(secret))).json()).toEqual({
    confirmed: 0,
    pending: 1,
    expiredBuilderJobs: 0,
  })
  expect(settlements).toBe(0)
  expect(releases).toBe(1)
})
