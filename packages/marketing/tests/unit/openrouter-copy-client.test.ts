import { afterEach, describe, expect, it } from 'bun:test'
import { z } from 'zod'
import type { AiCopyError } from '../../src/infrastructure/gateways/ai/ai-copy.port'
import { OpenRouterCopyClient } from '../../src/infrastructure/gateways/ai/openrouter-copy-client'

const schema = z.object({ caption: z.string() })
const jsonSchema = { type: 'object', properties: { caption: { type: 'string' } } }

const config = {
  apiKey: 'sk-test',
  model: 'openai/gpt-4.1',
  referer: null,
  maxTokens: 500,
  timeoutMs: 5000,
}

const realFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = realFetch
})

/** Enfileira respostas p/ as chamadas sucessivas do fetch. */
function stubFetch(responses: Array<{ ok?: boolean; status?: number; body: unknown }>) {
  const calls: Array<{ url: string; body: unknown }> = []
  let i = 0
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init.body)) })
    const r = responses[Math.min(i, responses.length - 1)]
    i += 1
    return {
      ok: r?.ok ?? true,
      status: r?.status ?? 200,
      json: async () => r?.body,
      text: async () => JSON.stringify(r?.body),
    } as Response
  }) as typeof fetch
  return calls
}

describe('OpenRouterCopyClient', () => {
  it('monta o response_format json_schema strict e devolve o objeto validado', async () => {
    const calls = stubFetch([
      { body: { choices: [{ message: { content: '{"caption":"Legenda pronta"}' } }] } },
    ])
    const client = new OpenRouterCopyClient(config)
    const out = await client.complete({
      system: 'sys',
      user: 'usr',
      schema,
      jsonSchema,
      schemaName: 'caption',
    })
    expect(out).toEqual({ caption: 'Legenda pronta' })
    const sent = calls[0]?.body as {
      model: string
      response_format: { type: string; json_schema: { strict: boolean; name: string } }
    }
    expect(sent.model).toBe('openai/gpt-4.1')
    expect(sent.response_format.type).toBe('json_schema')
    expect(sent.response_format.json_schema.strict).toBe(true)
    expect(sent.response_format.json_schema.name).toBe('caption')
  })

  it('JSON cortado no 1º giro → 1 retry com nudge → sucesso', async () => {
    const calls = stubFetch([
      { body: { choices: [{ message: { content: '{"caption":"corta' } }] } }, // JSON inválido
      { body: { choices: [{ message: { content: '{"caption":"agora vai"}' } }] } },
    ])
    const client = new OpenRouterCopyClient(config)
    const out = await client.complete({
      system: 's',
      user: 'u',
      schema,
      jsonSchema,
      schemaName: 'c',
    })
    expect(out).toEqual({ caption: 'agora vai' })
    expect(calls).toHaveLength(2)
    // O 2º giro leva o nudge de reparo (mensagem extra do usuário).
    const retryMessages = (calls[1]?.body as { messages: unknown[] }).messages
    expect(retryMessages).toHaveLength(3)
  })

  it('sem chave → not_configured (o service traduz p/ 503)', async () => {
    const client = new OpenRouterCopyClient({ ...config, apiKey: '' })
    await expect(
      client.complete({ system: 's', user: 'u', schema, jsonSchema, schemaName: 'c' }),
    ).rejects.toMatchObject({ kind: 'not_configured' } satisfies Partial<AiCopyError>)
  })

  it('4xx do upstream (chave inválida) NÃO re-tenta → unavailable', async () => {
    const calls = stubFetch([{ ok: false, status: 401, body: { error: { message: 'bad key' } } }])
    const client = new OpenRouterCopyClient(config)
    await expect(
      client.complete({ system: 's', user: 'u', schema, jsonSchema, schemaName: 'c' }),
    ).rejects.toMatchObject({ kind: 'unavailable' })
    expect(calls).toHaveLength(1) // erro HTTP não leva nudge de reparo
  })

  it('5xx do upstream → unavailable', async () => {
    stubFetch([{ ok: false, status: 503, body: { error: { message: 'down' } } }])
    const client = new OpenRouterCopyClient(config)
    await expect(
      client.complete({ system: 's', user: 'u', schema, jsonSchema, schemaName: 'c' }),
    ).rejects.toMatchObject({ kind: 'unavailable' })
  })
})
