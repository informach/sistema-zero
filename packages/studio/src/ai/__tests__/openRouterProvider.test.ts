import { afterEach, describe, expect, it, mock } from 'bun:test'
import {
  AI_EMPTY_RESPONSE_FALLBACK,
  OpenRouterError,
  OpenRouterProvider,
} from '../providers/openRouterProvider'

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

  it('encaminha maxTokens e propaga o abort da chamada para o fetch', async () => {
    const controller = new AbortController()
    // O fetch agora recebe um signal PRÓPRIO (encadeado ao relógio de parede),
    // não a identidade do signal do caller. O que importa é a propagação: abortar
    // o signal do caller deve abortar o signal que chega ao fetch.
    const fetchMock = mock(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body))
      const fetchSignal = init?.signal as AbortSignal | undefined
      expect(fetchSignal).toBeInstanceOf(AbortSignal)
      expect(fetchSignal?.aborted).toBe(false)
      controller.abort()
      expect(fetchSignal?.aborted).toBe(true)
      expect(body.max_tokens).toBe(111)
      return jsonResponse({ choices: [{ message: { content: 'ok' } }] })
    })
    const provider = new OpenRouterProvider({
      apiKey: 'k',
      model: 'm',
      mode: 'bridge',
      fetchImpl: fetchMock as unknown as typeof fetch,
    })

    // O fetch mock IGNORA o signal e devolve um Response ok mesmo após o abort;
    // como o caller abortou (durante o fetch), o caminho não-streaming agora
    // honra o abort e rejeita com AbortError (espelhando o caminho de streaming),
    // em vez de devolver 'ok'. As asserções de propagação ficam no próprio mock.
    await expect(
      provider.explainError({ message: 'boom' }, { signal: controller.signal, maxTokens: 111 }),
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('rejeita dentro do connectTimeout quando o fetch (handshake) nunca resolve', async () => {
    // fetch que nunca settla = handshake travado / headers que não chegam. Sem o
    // relógio de parede a promise ficaria pendente p/ sempre (painel em "busy").
    const fetchMock = mock(() => new Promise<Response>(() => {}))
    const provider = new OpenRouterProvider({
      apiKey: 'k',
      model: 'm',
      mode: 'blocks',
      fetchImpl: fetchMock as unknown as typeof fetch,
      connectTimeoutMs: 20,
    })
    const started = Date.now()
    await expect(
      provider.chat({ model: 'm', messages: [{ role: 'user', content: 'oi' }] }),
    ).rejects.toMatchObject({ name: 'TimeoutError' })
    // Settlou bem antes do default de 30s — provou que o timeout disparou.
    expect(Date.now() - started).toBeLessThan(2_000)
  })

  it('rejeita dentro do connectTimeout quando response.json() pendura (não-streaming)', async () => {
    // Headers chegam, mas o corpo nunca completa: `response.json()` fica pendente.
    const fetchMock = mock(async () => {
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        body: null,
        json: () => new Promise<unknown>(() => {}),
        text: async () => '',
      } as unknown as Response
    })
    const provider = new OpenRouterProvider({
      apiKey: 'k',
      model: 'm',
      mode: 'blocks',
      fetchImpl: fetchMock as unknown as typeof fetch,
      connectTimeoutMs: 20,
    })
    const started = Date.now()
    await expect(
      provider.chat({ model: 'm', messages: [{ role: 'user', content: 'oi' }] }),
    ).rejects.toMatchObject({ name: 'TimeoutError' })
    expect(Date.now() - started).toBeLessThan(2_000)
  })

  it('não mata um fetch saudável que demora além do connectTimeout antes dos headers… mas com headers ok responde', async () => {
    // Headers chegam rápido; o relógio do handshake é desarmado e a leitura curta
    // do JSON conclui normalmente — sem timeout espúrio.
    const fetchMock = mock(async () =>
      jsonResponse({ choices: [{ message: { content: 'tudo certo' } }] }),
    )
    const provider = new OpenRouterProvider({
      apiKey: 'k',
      model: 'm',
      mode: 'blocks',
      fetchImpl: fetchMock as unknown as typeof fetch,
      connectTimeoutMs: 50,
    })
    const result = await provider.chat({
      model: 'm',
      messages: [{ role: 'user', content: 'oi' }],
    })
    expect(result).toBe('tudo certo')
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

  it('aborta o stream SSE quando o corpo vem sem delimitador (remainder limitado)', async () => {
    // Corpo longo SEM `\n\n`: o `remainder` cresceria sem limite (re-split O(n²)).
    // A salvaguarda em consumeSSEStream deve abortar a leitura com erro em vez de
    // crescer/travar. Despejamos bem acima do teto default (512KB).
    const huge = `data: ${'x'.repeat(700 * 1024)}`
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(huge))
        controller.close()
      },
    })
    const fetchMock = mock(
      async () =>
        new Response(stream, {
          status: 200,
          headers: { 'content-type': 'text/event-stream' },
        }),
    )
    const provider = new OpenRouterProvider({
      apiKey: 'k',
      model: 'openai/gpt-4o-mini',
      mode: 'code',
      fetchImpl: fetchMock as unknown as typeof fetch,
    })
    const started = Date.now()
    await expect(
      provider.chat({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: 'hi' }],
        onToken: () => {},
      }),
    ).rejects.toThrow(/sem delimitador/)
    // Settlou rápido — não ficou re-splitando indefinidamente.
    expect(Date.now() - started).toBeLessThan(2_000)
  })

  it('rejeita prontamente quando o caller aborta durante o response.json() (não-streaming)', async () => {
    // Headers chegam (ok), mas o corpo nunca completa. Sem o braço de abort na
    // corrida, um abort do caller DURANTE a leitura ficaria pendente até o
    // connectTimeout. Com o braço, rejeita imediatamente com AbortError.
    const controller = new AbortController()
    const fetchMock = mock(async () => {
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        body: null,
        json: () => new Promise<unknown>(() => {}),
        text: async () => '',
      } as unknown as Response
    })
    const provider = new OpenRouterProvider({
      apiKey: 'k',
      model: 'm',
      mode: 'blocks',
      fetchImpl: fetchMock as unknown as typeof fetch,
      // Alto o bastante p/ provar que foi o ABORT (não o timeout) quem rejeitou.
      connectTimeoutMs: 5_000,
    })
    const started = Date.now()
    const promise = provider.chat({
      model: 'm',
      messages: [{ role: 'user', content: 'oi' }],
      signal: controller.signal,
    })
    controller.abort()
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
    // Bem antes do connectTimeout de 5s — provou que o abort cortou na hora.
    expect(Date.now() - started).toBeLessThan(2_000)
  })

  it('rejeita de imediato se o signal já estiver abortado antes do response.json()', async () => {
    const controller = new AbortController()
    controller.abort()
    const fetchMock = mock(async () => {
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        body: null,
        json: () => new Promise<unknown>(() => {}),
        text: async () => '',
      } as unknown as Response
    })
    const provider = new OpenRouterProvider({
      apiKey: 'k',
      model: 'm',
      mode: 'blocks',
      fetchImpl: fetchMock as unknown as typeof fetch,
      connectTimeoutMs: 5_000,
    })
    await expect(
      provider.chat({
        model: 'm',
        messages: [{ role: 'user', content: 'oi' }],
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('substitui resposta vazia (não-streaming) pelo placeholder amigável', async () => {
    const fetchMock = mock(async () => jsonResponse({ choices: [{ message: { content: '' } }] }))
    const provider = new OpenRouterProvider({
      apiKey: 'k',
      model: 'm',
      mode: 'blocks',
      fetchImpl: fetchMock as unknown as typeof fetch,
    })
    const result = await provider.chat({
      model: 'm',
      messages: [{ role: 'user', content: 'oi' }],
    })
    expect(result).toBe(AI_EMPTY_RESPONSE_FALLBACK)
  })

  it('substitui resposta vazia (streaming, só [DONE]) pelo placeholder amigável', async () => {
    // Stream que conclui com sucesso mas SEM nenhum delta de conteúdo: o painel
    // renderizaria uma bolha em branco. O provider devolve o placeholder.
    const fetchMock = mock(async () => streamResponse(['data: [DONE]\n\n']))
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
    expect(tokens).toEqual([])
    expect(result).toBe(AI_EMPTY_RESPONSE_FALLBACK)
  })

  it('NÃO substitui resposta não-vazia pelo placeholder', async () => {
    const fetchMock = mock(async () =>
      jsonResponse({ choices: [{ message: { content: 'conteúdo real' } }] }),
    )
    const provider = new OpenRouterProvider({
      apiKey: 'k',
      model: 'm',
      mode: 'blocks',
      fetchImpl: fetchMock as unknown as typeof fetch,
    })
    const result = await provider.chat({
      model: 'm',
      messages: [{ role: 'user', content: 'oi' }],
    })
    expect(result).toBe('conteúdo real')
  })
})

it('OpenRouterError preserva status code', () => {
  const err = new OpenRouterError('boom', 429)
  expect(err.status).toBe(429)
  expect(err.message).toBe('boom')
})
