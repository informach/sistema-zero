import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test'
import type { StudioAiActor, StudioAiUsageAction } from '@sistemazero/core/ai-credits'
import { z } from 'zod'

mock.module('server-only', () => ({}))
process.env.JWT_HS256_SECRET ??= 'test-jwt-secret-with-32-characters'
process.env.OPENROUTER_API_KEY ??= 'platform-test-only'
const { createStudioAiTransport, providerUsage, readProviderJson } = await import(
  '../src/server/studio-ai-transport'
)
const { completePensaJson } = await import('../src/server/pensa-llm')
afterEach(() => mock.restore())
const fetchDouble = (
  fn: (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>,
): typeof fetch => Object.assign(fn, { preconnect: globalThis.fetch.preconnect })

const actor: StudioAiActor = {
  accountId: crypto.randomUUID(),
  userId: crypto.randomUUID(),
  privileged: false,
}
const request = {
  runId: crypto.randomUUID(),
  projectId: 'project',
  purpose: 'tutor' as const,
  model: 'test/model',
  inputBytes: 10_000,
  maxOutputTokens: 100,
  maxAttempts: 3,
}
const body = {
  model: request.model,
  messages: [{ role: 'user' as const, content: 'A private game question' }],
  stream: false as const,
  temperature: 0.3,
  max_tokens: 100,
  response_format: {},
}
const payload = (content = '{"text":"ok"}') => ({
  id: 'gen-ledger-test',
  choices: [{ message: { content } }],
  usage: { cost: 0.000002, prompt_tokens: 10, completion_tokens: 5 },
})
function execution(
  options: {
    source?: 'platform' | 'openrouter'
    signal?: AbortSignal
    action?: (action: StudioAiUsageAction) => unknown
  } = {},
) {
  const actions: StudioAiUsageAction[] = []
  const source = options.source ?? 'openrouter'
  const members = {
    studioAiUsage: async (_actor: StudioAiActor, action: StudioAiUsageAction) => {
      actions.push(action)
      const custom = options.action?.(action)
      if (custom) return custom
      return {
        status: 200,
        body:
          action.operation === 'dispatch'
            ? {
                dispatch: {
                  source,
                  apiKey: source === 'openrouter' ? 'adult-test-key-only' : null,
                },
              }
            : { ok: true },
      }
    },
  }
  return {
    actions,
    ...createStudioAiTransport({
      members: members as never,
      actor,
      request,
      signal: options.signal,
      reservation: {
        allowed: true,
        source,
        priceCaps: { prompt: 1, completion: 4, request: 0 },
        credits: {} as never,
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
      },
    }),
  }
}
describe('Studio provider accounting', () => {
  test('external key and enforced price caps stay in server fetch; usage settles before parsing content', async () => {
    const calls: RequestInit[] = []
    spyOn(globalThis, 'fetch').mockImplementation(
      fetchDouble(async (_url: unknown, init: RequestInit = {}) => {
        calls.push(init)
        return Response.json(payload())
      }),
    )
    const run = execution()
    const data = await run.transport(body, 1000)
    await run.finish()
    expect(calls).toHaveLength(1)
    expect((calls[0]!.headers as Record<string, string>).Authorization).toBe(
      'Bearer adult-test-key-only',
    )
    expect(JSON.parse(calls[0]!.body as string).provider).toEqual({
      require_parameters: true,
      max_price: { prompt: 1, completion: 4, request: 0 },
    })
    expect(run.actions.map((a) => a.operation)).toEqual(['dispatch', 'settle', 'finish'])
    expect(run.actions[1]).toMatchObject({
      settlement: { status: 'confirmed', actualMicroUsd: 2, generationId: 'gen-ledger-test' },
    })
    expect(JSON.stringify(data)).not.toContain('adult-test-key')
  })
  test('bad model JSON is accounted, and its repair receives a second one-use permit', async () => {
    let fetched = 0
    spyOn(globalThis, 'fetch').mockImplementation(
      fetchDouble(async () =>
        Response.json(payload(++fetched === 1 ? '{broken' : '{"text":"fixed"}')),
      ),
    )
    const run = execution()
    const result = await completePensaJson({
      system: 'help',
      user: 'question',
      model: request.model,
      schema: z.object({ text: z.string() }),
      jsonSchema: {},
      schemaName: 'test',
      maxTokens: 100,
      transport: run.transport,
    })
    expect(result.text).toBe('fixed')
    expect(run.actions.filter((a) => a.operation === 'dispatch').map((a) => a.attempt)).toEqual([
      1, 2,
    ])
    expect(run.actions.filter((a) => a.operation === 'settle')).toHaveLength(2)
  })
  test('failed or ambiguous dispatch never sends a provider request or retries dispatch', async () => {
    const fetched = spyOn(globalThis, 'fetch').mockImplementation(
      fetchDouble(async () => {
        throw new Error('must not fetch')
      }),
    )
    const run = execution({ action: () => ({ status: 503, body: null }) })
    const result = await Promise.allSettled([run.transport(body, 100)])
    expect(result[0]?.status).toBe('rejected')
    expect(fetched).not.toHaveBeenCalled()
    expect(run.actions).toHaveLength(1)
  })
  test('402 never falls back to platform key and never retries inference', async () => {
    const fetched = spyOn(globalThis, 'fetch').mockImplementation(
      fetchDouble(async () => new Response('secret-provider-error', { status: 402 })),
    )
    const run = execution()
    const result = await Promise.allSettled([
      completePensaJson({
        system: 'help',
        user: 'question',
        model: request.model,
        schema: z.object({ text: z.string() }),
        jsonSchema: {},
        schemaName: 'test',
        maxTokens: 100,
        transport: run.transport,
      }),
    ])
    expect(result[0]?.status).toBe('rejected')
    expect(fetched).toHaveBeenCalledTimes(1)
    expect(run.actions[1]).toMatchObject({ settlement: { status: 'rejected' } })
    if (result[0]?.status === 'rejected')
      expect(result[0].reason.message).not.toContain('secret-provider-error')
  })
  test('network failure retains uncertain cost and does not retry even with JSON repairs enabled', async () => {
    const fetched = spyOn(globalThis, 'fetch').mockImplementation(
      fetchDouble(async () => {
        throw new Error('network')
      }),
    )
    const run = execution()
    await Promise.allSettled([
      completePensaJson({
        system: 'help',
        user: 'question',
        model: request.model,
        schema: z.object({ text: z.string() }),
        jsonSchema: {},
        schemaName: 'test',
        maxTokens: 100,
        transport: run.transport,
      }),
    ])
    expect(fetched).toHaveBeenCalledTimes(1)
    expect(run.actions[1]).toMatchObject({ settlement: { status: 'uncertain' } })
  })
  test('abort during body cancels socket and preserves uncertain accounting', async () => {
    const caller = new AbortController()
    let socketSignal: AbortSignal | undefined
    spyOn(globalThis, 'fetch').mockImplementation(
      fetchDouble(async (_url: unknown, init: RequestInit = {}) => {
        socketSignal = init.signal as AbortSignal
        queueMicrotask(() => caller.abort())
        return new Response(new ReadableStream())
      }),
    )
    const run = execution({ signal: caller.signal })
    const result = await Promise.allSettled([run.transport(body, 100)])
    expect(result[0]?.status).toBe('rejected')
    expect(socketSignal?.aborted).toBe(true)
    expect(run.actions[1]).toMatchObject({ settlement: { status: 'uncertain' } })
  })
  test('only the idempotent settlement is retried after a lost acknowledgement', async () => {
    let settlements = 0
    const fetched = spyOn(globalThis, 'fetch').mockImplementation(
      fetchDouble(async () => Response.json(payload())),
    )
    const run = execution({
      action: (action) =>
        action.operation === 'settle' && ++settlements === 1
          ? { status: 503, body: null }
          : undefined,
    })
    await run.transport(body, 100)
    expect(fetched).toHaveBeenCalledTimes(1)
    expect(run.actions.map((a) => a.operation)).toEqual(['dispatch', 'settle', 'settle'])
  })
  test('usage preserves zero, rejects invalid cost/id, and understands generation lookup', () => {
    expect(providerUsage({ usage: { cost: 0 } })).toMatchObject({
      status: 'confirmed',
      actualMicroUsd: 0,
    })
    expect(providerUsage({ id: 'https://secret', usage: { cost: -1 } })).toMatchObject({
      status: 'uncertain',
    })
    expect(providerUsage({ usage: { cost: Number.NaN } }).actualMicroUsd).toBeUndefined()
    expect(
      providerUsage(
        { data: { id: 'gen-real', total_cost: 0.000003, native_tokens_prompt: 20 } },
        true,
      ),
    ).toMatchObject({
      status: 'confirmed',
      actualMicroUsd: 3,
      generationId: 'gen-real',
      promptTokens: 20,
    })
  })
  test('oversized provider body is cancelled', async () => {
    let cancelled = false
    const response = new Response(
      new ReadableStream({
        start(c) {
          c.enqueue(new Uint8Array(2 * 1024 * 1024 + 1))
        },
        cancel() {
          cancelled = true
        },
      }),
    )
    const result = await Promise.allSettled([
      readProviderJson(response, new AbortController().signal),
    ])
    expect(result[0]?.status).toBe('rejected')
    expect(cancelled).toBe(true)
  })
})
