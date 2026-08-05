import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test'
import { z } from 'zod'

mock.module('server-only', () => ({}))

process.env.JWT_HS256_SECRET ??= 'test-jwt-secret-with-32-characters'
process.env.OPENROUTER_API_KEY ??= 'test-openrouter-key'

const { completePensaJson } = await import('../src/server/pensa-llm')
const { answerStudioZappy } = await import('../src/server/zappy-ai')
const { resolveStudioTier } = await import('../src/lib/studio-tier')

describe('completePensaJson', () => {
  const previousApiKey = process.env.OPENROUTER_API_KEY
  const previousJwtSecret = process.env.JWT_HS256_SECRET

  afterEach(() => {
    process.env.OPENROUTER_API_KEY = previousApiKey
    process.env.JWT_HS256_SECRET = previousJwtSecret
  })

  function fetchDouble(response: () => Response): typeof fetch {
    return Object.assign(async (..._args: Parameters<typeof fetch>) => response(), {
      preconnect: globalThis.fetch.preconnect,
    })
  }

  test('respeita maxAttempts=1 para fluxos com cardinalidade estrita', async () => {
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key'
    process.env.JWT_HS256_SECRET = 'test-jwt-secret-with-32-characters'
    let calls = 0
    const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(
      fetchDouble(() => {
        calls += 1
        return new Response(
          JSON.stringify({ choices: [{ message: { content: '{json-invalido' } }] }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        )
      }),
    )

    try {
      await expect(
        completePensaJson({
          system: 'system',
          user: 'user',
          schema: z.object({ ok: z.boolean() }),
          jsonSchema: {
            type: 'object',
            properties: { ok: { type: 'boolean' } },
            required: ['ok'],
            additionalProperties: false,
          },
          schemaName: 'single_attempt',
          maxAttempts: 1,
        }),
      ).rejects.toBeInstanceOf(Error)
      expect(calls).toBe(1)
    } finally {
      fetchSpy.mockRestore()
    }
  })

  test('bodyTimeoutMs dá folga a sínteses longas e o timeout de corpo NÃO re-tenta', async () => {
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key'
    process.env.JWT_HS256_SECRET = 'test-jwt-secret-with-32-characters'
    const slowBody = (delayMs: number) => {
      const response = new Response(null, { status: 200 })
      Object.defineProperty(response, 'json', {
        value: () =>
          new Promise((resolve) => {
            setTimeout(
              () => resolve({ choices: [{ message: { content: '{"ok":true}' } }] }),
              delayMs,
            )
          }),
      })
      return response
    }
    const opts = {
      system: 'system',
      user: 'user',
      schema: z.object({ ok: z.boolean() }),
      jsonSchema: {
        type: 'object',
        properties: { ok: { type: 'boolean' } },
        required: ['ok'],
        additionalProperties: false,
      },
      schemaName: 'slow_plan',
    }

    let calls = 0
    const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(
      fetchDouble(() => {
        calls += 1
        return slowBody(60)
      }),
    )
    try {
      // Corpo lento + prazo generoso → sucesso (o caso real do task_plan).
      await expect(completePensaJson({ ...opts, bodyTimeoutMs: 2_000 })).resolves.toEqual({
        ok: true,
      })
      // Prazo estourado → falha 'pendurou' SEM segunda tentativa (não faz a
      // criança esperar o relógio duas vezes).
      calls = 0
      await expect(completePensaJson({ ...opts, bodyTimeoutMs: 10 })).rejects.toThrow(
        'pendurou o corpo',
      )
      expect(calls).toBe(1)
    } finally {
      fetchSpy.mockRestore()
    }
  })

  test('timeout de corpo ABORTA o socket do fetch (não fica pendurado)', async () => {
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key'
    process.env.JWT_HS256_SECRET = 'test-jwt-secret-with-32-characters'
    let capturedSignal: AbortSignal | null | undefined
    const hangingBody = () => {
      const response = new Response(null, { status: 200 })
      Object.defineProperty(response, 'json', {
        // Corpo que NUNCA chega — o pior caso do provider pendurar a resposta.
        value: () => new Promise(() => {}),
      })
      return response
    }
    const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(
      Object.assign(
        async (...args: Parameters<typeof fetch>) => {
          capturedSignal = (args[1] as RequestInit | undefined)?.signal
          return hangingBody()
        },
        { preconnect: globalThis.fetch.preconnect },
      ),
    )
    try {
      await expect(
        completePensaJson({
          system: 'system',
          user: 'user',
          schema: z.object({ ok: z.boolean() }),
          jsonSchema: {
            type: 'object',
            properties: { ok: { type: 'boolean' } },
            required: ['ok'],
            additionalProperties: false,
          },
          schemaName: 'hung_body',
          bodyTimeoutMs: 10,
        }),
      ).rejects.toThrow('pendurou o corpo')
      // O relógio de corpo derruba o socket junto — sem isto a conexão seguia
      // viva consumindo o pool mesmo após a rejeição.
      expect(capturedSignal?.aborted).toBe(true)
    } finally {
      fetchSpy.mockRestore()
    }
  })

  test('substitui saída imprópria por fallback local sem segunda chamada', async () => {
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key'
    process.env.JWT_HS256_SECRET = 'test-jwt-secret-with-32-characters'
    let calls = 0
    const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(
      fetchDouble(() => {
        calls += 1
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    text: 'Aqui está conteúdo sexual impróprio.',
                    scope: 'concept',
                    blockReferences: [],
                    lessonReferences: [],
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        )
      }),
    )

    try {
      const response = await answerStudioZappy({
        question: 'Como funciona uma variável?',
        context: {
          projectId: 'project-1',
          mode: 'blocks',
          kind: 'classic',
          blocks: [],
          installedExtensions: [],
          selectedBlockId: null,
          lastError: null,
        },
        tier: resolveStudioTier('god', 'staff'),
        profileName: 'criador',
      })

      expect(response.text).toContain('Não consegui validar')
      expect(response.text).not.toContain('sexual')
      expect(calls).toBe(1)
    } finally {
      fetchSpy.mockRestore()
    }
  })
})
