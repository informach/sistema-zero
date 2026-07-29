import type { IDEMode } from '#core'
import type { SZIRV2 } from '#ir'
import type {
  AIChallengeLevel,
  AIFreeFormRequest,
  AIProvider,
  AIRequestOptions,
  ProjectContext,
} from '../contracts'
import {
  buildBlockExplainPrompt,
  buildChallengePrompt,
  buildCodeExplainPrompt,
  buildErrorExplainPrompt,
  buildFreeFormProjectPrompt,
  buildSuggestNextStepPrompt,
  buildSystemPrompt,
  CHILD_SAFETY_CLAUSE,
} from '../prompts'
import { consumeSSEStream } from '../streaming'

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * Formato estendido (multi-block) usado para passar `cache_control` por
 * segmento em modelos Claude/Anthropic compatíveis com prompt caching.
 */
type OpenRouterContentBlock = {
  type: 'text'
  text: string
  cache_control?: { type: 'ephemeral' }
}
type OpenRouterMessageWire = {
  role: 'system' | 'user' | 'assistant'
  content: string | OpenRouterContentBlock[]
}

export interface OpenRouterChatOptions {
  /** Modelo (slug, ex.: `~anthropic/claude-sonnet-latest`). */
  model: string
  messages: OpenRouterMessage[]
  /** Se definido, recebe cada token à medida que chega. Stream automático. */
  onToken?: (token: string) => void
  /** Temperatura. Default 0.4 (resposta focada). */
  temperature?: number
  signal?: AbortSignal
  maxTokens?: number
}

export interface OpenRouterProviderOptions {
  apiKey: string
  model: string
  /** Modo atual do IDE — usado para system prompt. */
  mode: IDEMode
  /** Concatenação dos `promptContext` das extensões instaladas. */
  extensionContext?: string
  /** Permite injetar fetch (útil em testes). Default: global fetch. */
  fetchImpl?: typeof fetch
  /** Referer + Title — bons cidadãos no leaderboard OpenRouter. */
  referer?: string
  appTitle?: string
  /** Limite padrão de saída para evitar respostas longas demais no painel. */
  defaultMaxTokens?: number
  /**
   * Relógio de parede (ms) para o handshake/headers e para o `response.json()`
   * do caminho não-streaming. Default {@link CONNECT_TIMEOUT_MS}. Exposto p/
   * permitir um valor curto nos testes (handshake travado sem esperar 30s).
   */
  connectTimeoutMs?: number
}

const DEFAULT_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'
const DEFAULT_MAX_TOKENS = 900
/**
 * Substituto exibível quando o upstream conclui COM SUCESSO mas devolve texto
 * vazio (stream sem deltas / `message.content` ausente). Sem isso o painel
 * renderizava uma bolha em branco. O AIPanel também tem sua própria salvaguarda
 * (o stream alimenta a bolha por tokens, não pelo retorno) — defesa em camadas.
 */
export const AI_EMPTY_RESPONSE_FALLBACK = 'A IA não retornou conteúdo. Tente novamente.'
/** Tempo máximo sem receber tokens antes de desistir do stream (ms). */
const STREAM_IDLE_TIMEOUT_MS = 60_000
/**
 * Tempo máximo (relógio de parede) para o handshake/headers da request E para
 * o `response.json()` do caminho não-streaming. O `idleTimeoutMs` do stream só
 * começa a contar DEPOIS de `response.body`, então um handshake travado ou uma
 * resposta que manda headers e "pendura" deixaria a promise pendente p/ sempre
 * (painel travado em "busy" até reload). Cancela-se após os headers chegarem
 * para NÃO matar um stream saudável e longo.
 */
const CONNECT_TIMEOUT_MS = 30_000

/**
 * Garante que a cláusula de segurança infantil esteja SEMPRE no início da
 * mensagem de sistema, em QUALQUER caminho. O `ask()` deixa o `systemHint`
 * SUBSTITUIR o system prompt inteiro — então não dá para confiar só no
 * {@link buildSystemPrompt}. Aplicado aqui, no `chat()`, blinda todos os
 * caminhos de uma vez (explain/suggest/challenge/refactor/ask). Idempotente:
 * se a cláusula já está presente (caso comum, via buildSystemPrompt), não
 * duplica. Mensagens não-sistema passam intactas.
 */
function ensureSafetyClause(messages: OpenRouterMessage[]): OpenRouterMessage[] {
  return messages.map((m) => {
    if (m.role !== 'system') return m
    if (m.content.includes(CHILD_SAFETY_CLAUSE)) return m
    return { ...m, content: `${CHILD_SAFETY_CLAUSE}\n\n${m.content}` }
  })
}

function makeTimeoutError(ms: number): Error {
  const err = new Error(`OpenRouter sem resposta após ${ms}ms (handshake/headers)`)
  err.name = 'TimeoutError'
  return err
}

function makeAbortError(message: string): Error {
  if (typeof DOMException !== 'undefined') {
    return new DOMException(message, 'AbortError')
  }
  const err = new Error(message)
  err.name = 'AbortError'
  return err
}

/**
 * Implementação `AIProvider` usando OpenRouter como gateway. Adapta o
 * contrato `AIProvider` para chamadas chat completions OpenAI-compatible.
 *
 * IMPORTANTE: BYOK (Bring Your Own Key). A chave NÃO sai do navegador além
 * da request ao endpoint OpenRouter. Documentado em docs/AI.md.
 */
export class OpenRouterProvider implements AIProvider {
  private readonly fetchImpl: typeof fetch

  constructor(private readonly opts: OpenRouterProviderOptions) {
    this.fetchImpl = opts.fetchImpl ?? fetch.bind(globalThis)
  }

  async chat(options: OpenRouterChatOptions): Promise<string> {
    const shouldApplyPromptCache = supportsAnthropicPromptCache(options.model)
    // Blindagem central: TODA mensagem de sistema leva a cláusula de segurança
    // infantil, mesmo o `systemHint` cru do `ask()`. Impossível stripar.
    const safeMessages = ensureSafetyClause(options.messages)
    const wireMessages: OpenRouterMessageWire[] = safeMessages.map((m, i) => {
      if (
        shouldApplyPromptCache &&
        m.role === 'system' &&
        i === 0 &&
        typeof m.content === 'string' &&
        m.content.length > 0
      ) {
        return {
          role: 'system',
          content: [{ type: 'text', text: m.content, cache_control: { type: 'ephemeral' } }],
        }
      }
      return m
    })

    const body = {
      model: options.model,
      messages: wireMessages,
      stream: Boolean(options.onToken),
      temperature: options.temperature ?? 0.4,
      max_tokens: options.maxTokens ?? this.opts.defaultMaxTokens ?? DEFAULT_MAX_TOKENS,
    }
    // Relógio de parede do handshake: um AbortController PRÓPRIO encadeado ao
    // `options.signal`. Abortar este controller cancela o fetch (rejeita o
    // await abaixo) — assim um handshake travado não pendura a promise. O timer
    // é zerado assim que os headers chegam (clearTimeout) p/ não matar stream.
    const connectTimeoutMs = this.opts.connectTimeoutMs ?? CONNECT_TIMEOUT_MS
    const connectController = new AbortController()
    let connectTimer: ReturnType<typeof setTimeout> | undefined
    // Relógio de parede do handshake como PROMISE: ao disparar (a) aborta o
    // controller p/ cancelar a conexão real E (b) REJEITA a corrida abaixo —
    // assim um `fetchImpl` que IGNORE o AbortSignal (mock de teste, polyfill
    // antigo) ainda é limitado e nunca pendura a promise (painel travado em
    // "busy"). Desarmado assim que os headers chegam.
    const connectTimeoutPromise = new Promise<never>((_, reject) => {
      connectTimer = setTimeout(() => {
        connectController.abort()
        reject(makeTimeoutError(connectTimeoutMs))
      }, connectTimeoutMs)
    })
    const clearConnectTimer = () => {
      if (connectTimer !== undefined) {
        clearTimeout(connectTimer)
        connectTimer = undefined
      }
    }
    // Propaga o abort do caller (UI) para o nosso controller. Se o caller já
    // abortou, o controller nasce abortado.
    const onCallerAbort = () => connectController.abort()
    if (options.signal) {
      if (options.signal.aborted) connectController.abort()
      else options.signal.addEventListener('abort', onCallerAbort, { once: true })
    }

    let response: Response
    try {
      response = await Promise.race([
        this.fetchImpl(DEFAULT_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.opts.apiKey}`,
            'HTTP-Referer': this.opts.referer ?? 'https://sistema-zero-studio.dev',
            'X-OpenRouter-Title': this.opts.appTitle ?? 'Sistema Zero Studio',
          },
          body: JSON.stringify(body),
          signal: connectController.signal,
        }),
        connectTimeoutPromise,
      ])
    } catch (err) {
      clearConnectTimer()
      options.signal?.removeEventListener('abort', onCallerAbort)
      // O timer rejeita com makeTimeoutError; o caller rejeita com AbortError —
      // ambos sobem como `err` p/ o painel surfaçar a causa e liberar o "busy".
      throw err
    }
    // Headers chegaram: desarma o relógio do handshake. Um stream longo e
    // saudável NÃO é mais limitado por ele (o idleTimeout do stream assume).
    clearConnectTimer()

    if (!response.ok) {
      options.signal?.removeEventListener('abort', onCallerAbort)
      const text = await safeText(response)
      throw new OpenRouterError(
        `OpenRouter erro ${response.status}: ${text || response.statusText}`,
        response.status,
      )
    }

    if (options.onToken && response.body) {
      options.signal?.removeEventListener('abort', onCallerAbort)
      const streamed = await consumeSSEStream(response.body, options.onToken, {
        signal: options.signal,
        idleTimeoutMs: STREAM_IDLE_TIMEOUT_MS,
      })
      return streamed.trim() ? streamed : AI_EMPTY_RESPONSE_FALLBACK
    }

    // Caminho não-streaming (explicar/sugerir/desafio): `response.json()` pode
    // pendurar se o servidor mandou headers e parou de enviar o corpo. Corremos
    // a leitura contra uma rejeição explícita por timeout — a corrida garante
    // que o await sempre acerta o `finally` (que libera o "busy" no painel),
    // mesmo que o runtime não propague o abort a um Response já resolvido.
    // `connectController.abort()` ainda tenta liberar a conexão subjacente.
    let jsonTimer: ReturnType<typeof setTimeout> | undefined
    const timeoutPromise = new Promise<never>((_, reject) => {
      jsonTimer = setTimeout(() => {
        connectController.abort()
        reject(makeTimeoutError(connectTimeoutMs))
      }, connectTimeoutMs)
    })
    // Espelha o braço de abort do caminho de streaming: um abort do caller
    // DURANTE a leitura do corpo (já passados os headers) não chegava a
    // `response.json()` — o `connectController.signal` foi pro fetch, não pro
    // body já resolvido. Sem este braço o await ficaria pendente até o timeout.
    let abortListener: (() => void) | undefined
    const abortPromise = new Promise<never>((_, reject) => {
      const sig = options.signal
      if (!sig) return
      if (sig.aborted) {
        reject(makeAbortError('Requisição de IA abortada'))
        return
      }
      abortListener = () => reject(makeAbortError('Requisição de IA abortada'))
      sig.addEventListener('abort', abortListener, { once: true })
    })
    try {
      const data = (await Promise.race([response.json(), timeoutPromise, abortPromise])) as {
        choices?: Array<{ message?: { content?: string } }>
      }
      const content = data.choices?.[0]?.message?.content ?? ''
      return content.trim() ? content : AI_EMPTY_RESPONSE_FALLBACK
    } finally {
      if (jsonTimer !== undefined) clearTimeout(jsonTimer)
      if (abortListener) options.signal?.removeEventListener('abort', abortListener)
      options.signal?.removeEventListener('abort', onCallerAbort)
    }
  }

  // ---------- AIProvider implementation ----------

  async explainSelectedBlock(
    blockJson: object,
    mode: IDEMode,
    options?: AIRequestOptions,
  ): Promise<string> {
    return this.chat({
      model: this.opts.model,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt({ mode, extensionContext: this.opts.extensionContext }),
        },
        {
          role: 'user',
          content: buildBlockExplainPrompt(JSON.stringify(blockJson, null, 2)),
        },
      ],
      signal: options?.signal,
      maxTokens: options?.maxTokens,
    })
  }

  async explainSelectedCode(
    code: string,
    lang: 'html' | 'css' | 'js',
    mode: IDEMode,
    options?: AIRequestOptions,
  ): Promise<string> {
    return this.chat({
      model: this.opts.model,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt({ mode, extensionContext: this.opts.extensionContext }),
        },
        { role: 'user', content: buildCodeExplainPrompt(code, lang) },
      ],
      signal: options?.signal,
      maxTokens: options?.maxTokens,
    })
  }

  async explainError(
    err: { message: string; stack?: string },
    options?: AIRequestOptions,
  ): Promise<string> {
    return this.chat({
      model: this.opts.model,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt({
            mode: this.opts.mode,
            extensionContext: this.opts.extensionContext,
          }),
        },
        { role: 'user', content: buildErrorExplainPrompt(err.message, err.stack) },
      ],
      signal: options?.signal,
      maxTokens: options?.maxTokens,
    })
  }

  async suggestNextStep(context: ProjectContext, options?: AIRequestOptions): Promise<string> {
    return this.chat({
      model: this.opts.model,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt({
            mode: context.mode,
            extensionContext: this.opts.extensionContext,
          }),
        },
        { role: 'user', content: buildSuggestNextStepPrompt(context) },
      ],
      signal: options?.signal,
      maxTokens: options?.maxTokens,
    })
  }

  async generateChallenge(level: AIChallengeLevel, options?: AIRequestOptions): Promise<string> {
    return this.chat({
      model: this.opts.model,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt({
            mode: this.opts.mode,
            extensionContext: this.opts.extensionContext,
          }),
        },
        { role: 'user', content: buildChallengePrompt(level) },
      ],
      signal: options?.signal,
      maxTokens: options?.maxTokens,
    })
  }

  async refactorCode(
    code: string,
    lang: 'html' | 'css' | 'js',
    options?: AIRequestOptions,
  ): Promise<string> {
    return this.chat({
      model: this.opts.model,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt({
            mode: this.opts.mode,
            extensionContext: this.opts.extensionContext,
          }),
        },
        {
          role: 'user',
          content: `Sugira uma refatoração curta para este ${lang.toUpperCase()}, mantendo
comportamento. Mostre apenas o trecho refatorado em bloco de código.\n\n\`\`\`${lang}\n${code}\n\`\`\``,
        },
      ],
      signal: options?.signal,
      maxTokens: options?.maxTokens,
    })
  }

  /**
   * Implementação placeholder — converter ideia natural em SZIR é uma feature
   * mais ambiciosa. Por ora respondemos texto explicando o que o aluno deveria
   * fazer; a app trata como mensagem normal.
   */
  async convertIdeaToBlocks(_idea: string, _options?: AIRequestOptions): Promise<SZIRV2> {
    return {
      version: 2,
      html: [],
      css: [],
      behavior: { start: [], events: [], loops: [] },
      extensions: [],
    }
  }

  async ask(req: AIFreeFormRequest): Promise<string> {
    const mode = req.context?.mode ?? this.opts.mode
    return this.chat({
      model: this.opts.model,
      messages: [
        {
          role: 'system',
          content:
            req.systemHint ??
            buildSystemPrompt({
              mode,
              extensionContext: this.opts.extensionContext,
            }),
        },
        {
          role: 'user',
          content: req.context
            ? buildFreeFormProjectPrompt(req.question, req.context)
            : req.question,
        },
      ],
      onToken: req.onToken,
      signal: req.signal,
      maxTokens: req.maxTokens,
    })
  }
}

export class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'OpenRouterError'
  }
}

async function safeText(response: Response): Promise<string> {
  try {
    return await response.text()
  } catch {
    return ''
  }
}

function supportsAnthropicPromptCache(model: string): boolean {
  const normalized = model.trim().replace(/^~/, '').toLowerCase()
  return normalized.startsWith('anthropic/') && normalized.includes('claude')
}
