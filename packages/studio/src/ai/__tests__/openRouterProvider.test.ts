import { afterEach, describe, expect, it, mock } from 'bun:test'
import { OpenRouterError, OpenRouterProvider } from '../providers/openRouterProvider'

function jsonResponse(body: object, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  })
}

function streamResponse(chunks: string[]): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })
  return new Response(stream, {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  })
}

describe('OpenRouterProvider', () => {
  afterEach(() => {
    mock.restore()
  })

  it('faz POST com Authorization Bearer e devolve content em modo não-streaming', async () => {
    const fetchMock = mock(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body))
      expect(body.model).toBe('~anthropic/claude-sonnet-latest')
      expect(body.stream).toBe(false)
      expect(body.max_tokens).toBe(321)
      const headers = init?.headers as Record<string, string>
      expect(headers.Authorization).toBe('Bearer test-key')
      expect(headers['X-OpenRouter-Title']).toBe('Sistema Zero Studio')
      return jsonResponse({ choices: [{ message: { content: 'resposta' } }] })
    })

    const provider = new OpenRouterProvider({
      apiKey: 'test-key',
      model: '~anthropic/claude-sonnet-latest',
      mode: 'blocks',
      fetchImpl: fetchMock as unknown as typeof fetch,
      defaultMaxTokens: 321,
    })
    const result = await provider.chat({
      model: '~anthropic/claude-sonnet-latest',
      messages: [{ role: 'user', content: 'oi' }],
    })
    expect(result).toBe('resposta')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('consome SSE quando onToken é passado', async () => {
    const fetchMock = mock(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body))
      expect(body.stream).toBe(true)
      return streamResponse([
        'data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"lo"}}]}\n\n',
        'data: [DONE]\n\n',
      ])
    })
    const provider = new OpenRouterProvider({
      apiKey: 'k',
      model: 'openai/gpt-4o-mini',
      mode: 'code',
      fetchImpl: fetchMock as unknown as typeof fetch,
    })
    const tokens: string[] = []
    const result = await provider.chat({
      model: 'openai/gpt-4o-mini',
      messages: [{ role: 'user', content: 'hi' }],
      onToken: (t) => tokens.push(t),
    })
    expect(tokens).toEqual(['Hel', 'lo'])
    expect(result).toBe('Hello')
  })

  it('encaminha AbortSignal e maxTokens da chamada para o fetch', async () => {
    const controller = new AbortController()
    const fetchMock = mock(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body))
      expect(init?.signal).toBe(controller.signal)
      expect(body.max_tokens).toBe(111)
      return jsonResponse({ choices: [{ message: { content: 'ok' } }] })
    })
    const provider = new OpenRouterProvider({
      apiKey: 'k',
      model: 'm',
      mode: 'bridge',
      fetchImpl: fetchMock as unknown as typeof fetch,
    })

    await provider.explainError({ message: 'boom' }, { signal: controller.signal, maxTokens: 111 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('lança OpenRouterError com status quando upstream falha', async () => {
    const fetchMock = mock(
      async () => new Response('Unauthorized', { status: 401, statusText: 'Unauthorized' }),
    )
    const provider = new OpenRouterProvider({
      apiKey: 'bad',
      model: 'anything',
      mode: 'blocks',
      fetchImpl: fetchMock as unknown as typeof fetch,
    })
    await expect(
      provider.chat({
        model: 'x',
        messages: [{ role: 'user', content: 'x' }],
      }),
    ).rejects.toMatchObject({ name: 'OpenRouterError', status: 401 })
  })

  it('inclui cache_control no system prompt para modelos Claude compatíveis', async () => {
    const fetchMock = mock(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body))
      const systemMsg = body.messages[0]
      expect(systemMsg.role).toBe('system')
      // System message vira array com cache_control (Fase 2.2-refinada).
      expect(Array.isArray(systemMsg.content)).toBe(true)
      expect(systemMsg.content[0].text).toMatch(/MODO BLOCOS/)
      expect(systemMsg.content[0].cache_control).toEqual({ type: 'ephemeral' })
      return jsonResponse({ choices: [{ message: { content: 'ok' } }] })
    })
    const provider = new OpenRouterProvider({
      apiKey: 'k',
      model: '~anthropic/claude-sonnet-latest',
      mode: 'blocks',
      fetchImpl: fetchMock as unknown as typeof fetch,
    })
    await provider.explainSelectedBlock({ type: 'sz_html_h1' }, 'blocks')
  })

  it('envia contexto limitado do projeto na conversa livre', async () => {
    const fetchMock = mock(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body))
      expect(body.messages[0].content).toMatch(/MODO CÓDIGO/)
      expect(body.messages[1].content).toContain('Pergunta do aluno: o que faço agora?')
      expect(body.messages[1].content).toContain('"projectName": "Jogo"')
      expect(body.messages[1].content).toContain('"type": "consoleLog"')
      return jsonResponse({ choices: [{ message: { content: 'ok' } }] })
    })
    const provider = new OpenRouterProvider({
      apiKey: 'k',
      model: 'openai/gpt-4o-mini',
      mode: 'blocks',
      fetchImpl: fetchMock as unknown as typeof fetch,
    })

    await provider.ask({
      question: 'o que faço agora?',
      context: {
        projectName: 'Jogo',
        mode: 'code',
        installedExtensions: ['game-2d'],
        ir: {
          html: [],
          css: [],
          js: [{ type: 'consoleLog', value: { type: 'str', value: 'oi' } }],
          extensions: [{ extensionId: 'game-2d' }],
        },
      },
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('aplica cache_control só na primeira system message Claude; outras roles ficam string', async () => {
    const fetchMock = mock(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body))
      expect(Array.isArray(body.messages[0].content)).toBe(true)
      expect(typeof body.messages[1].content).toBe('string')
      return jsonResponse({ choices: [{ message: { content: 'ok' } }] })
    })
    const provider = new OpenRouterProvider({
      apiKey: 'k',
      model: 'anthropic/claude-sonnet-4.5',
      mode: 'blocks',
      fetchImpl: fetchMock as unknown as typeof fetch,
    })
    await provider.chat({
      model: 'anthropic/claude-sonnet-4.5',
      messages: [
        { role: 'system', content: 'system text estável' },
        { role: 'user', content: 'pergunta' },
      ],
    })
  })

  it.each([
    'openai/gpt-4o-mini',
    'google/gemini-2.0-flash-exp',
    'meta-llama/llama-3.3-70b-instruct',
  ])('mantém system message como string para modelo não-Claude %s', async (model: string) => {
    const fetchMock = mock(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body))
      expect(body.model).toBe(model)
      expect(typeof body.messages[0].content).toBe('string')
      expect(body.messages[0].content).toBe('system text estável')
      return jsonResponse({ choices: [{ message: { content: 'ok' } }] })
    })
    const provider = new OpenRouterProvider({
      apiKey: 'k',
      model,
      mode: 'blocks',
      fetchImpl: fetchMock as unknown as typeof fetch,
    })
    await provider.chat({
      model,
      messages: [
        { role: 'system', content: 'system text estável' },
        { role: 'user', content: 'pergunta' },
      ],
    })
  })
})

it('OpenRouterError preserva status code', () => {
  const err = new OpenRouterError('boom', 429)
  expect(err.status).toBe(429)
  expect(err.message).toBe('boom')
})
