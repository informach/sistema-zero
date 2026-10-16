import { afterEach, describe, expect, it } from 'bun:test'
import type { AiAttemptView } from '@sistemazero/helpdesk-contracts'
import { z } from 'zod'
import { OpenRouterClient } from '../../src/infrastructure/gateways/openrouter/openrouter-client'

const originalFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = originalFetch
})
const client = () =>
  new OpenRouterClient({
    apiKey: 'test-key',
    model: 'test-model',
    referer: null,
    maxTokens: 100,
    timeoutMs: 1000,
  })
describe('OpenRouter: uso de cada tentativa', () => {
  it('contabiliza também a resposta inválida antes do reparo', async () => {
    let requests = 0
    globalThis.fetch = Object.assign(
      async () => {
        requests++
        return Response.json({
          id: `generation-${requests}`,
          model: 'test-model',
          choices: [{ message: { content: requests === 1 ? 'invalid' : '{"reply":"ok"}' } }],
          usage: { prompt_tokens: 10, completion_tokens: 5, cost: 0.001 },
        })
      },
      { preconnect: originalFetch.preconnect },
    )
    const events: AiAttemptView[] = []
    const value = await client().complete({
      system: 'test',
      user: 'test',
      schema: z.object({ reply: z.string() }),
      onAttempt: async (e) => {
        events.push(structuredClone(e))
      },
    })
    expect(value.reply).toBe('ok')
    expect(requests).toBe(2)
    expect(events.map((e) => e.outcome)).toEqual([
      'started',
      'invalid_output',
      'started',
      'completed',
    ])
    expect(events[1]?.costUsd).toBe(0.001)
    expect(events[3]?.providerId).toBe('generation-2')
  })
  it('limite de uma tentativa não dispara reparo oculto', async () => {
    let requests = 0
    globalThis.fetch = Object.assign(
      async () => {
        requests++
        return Response.json({ choices: [{ message: { content: 'invalid' } }] })
      },
      { preconnect: originalFetch.preconnect },
    )
    const events: AiAttemptView[] = []
    const failure = await client()
      .complete({
        system: 'test',
        user: 'test',
        schema: z.object({ reply: z.string() }),
        maxAttempts: 1,
        onAttempt: async (e) => {
          events.push(structuredClone(e))
        },
      })
      .then(
        () => null,
        (error: unknown) => error,
      )
    expect(failure).toBeInstanceOf(Error)
    expect(requests).toBe(1)
    expect(events.at(-1)?.costUsd).toBeNull()
  })
  it('não chama rede depois do prazo', async () => {
    let requests = 0
    globalThis.fetch = Object.assign(
      async () => {
        requests++
        return Response.json({})
      },
      { preconnect: originalFetch.preconnect },
    )
    const failure = await client()
      .complete({
        system: 'test',
        user: 'test',
        schema: z.object({ reply: z.string() }),
        deadline: new Date(0),
      })
      .then(
        () => null,
        (error: unknown) => error,
      )
    expect(failure).toBeInstanceOf(Error)
    expect(requests).toBe(0)
  })
})
