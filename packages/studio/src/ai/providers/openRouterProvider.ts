import type { IDEMode } from '#core'
import type { SZIR } from '#ir'
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
}

const DEFAULT_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'
const DEFAULT_MAX_TOKENS = 900
/** Tempo máximo sem receber tokens antes de desistir do stream (ms). */
const STREAM_IDLE_TIMEOUT_MS = 60_000

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
    const wireMessages: OpenRouterMessageWire[] = options.messages.map((m, i) => {
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
    const response = await this.fetchImpl(DEFAULT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.opts.apiKey}`,
        'HTTP-Referer': this.opts.referer ?? 'https://sistema-zero-studio.dev',
        'X-OpenRouter-Title': this.opts.appTitle ?? 'Sistema Zero Studio',
      },
      body: JSON.stringify(body),
      signal: options.signal,
    })

    if (!response.ok) {
      const text = await safeText(response)
      throw new OpenRouterError(
        `OpenRouter erro ${response.status}: ${text || response.statusText}`,
        response.status,
      )
    }

    if (options.onToken && response.body) {
      return consumeSSEStream(response.body, options.onToken, {
        signal: options.signal,
        idleTimeoutMs: STREAM_IDLE_TIMEOUT_MS,
      })
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    return data.choices?.[0]?.message?.content ?? ''
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
  async convertIdeaToBlocks(_idea: string, _options?: AIRequestOptions): Promise<SZIR> {
    return { html: [], css: [], js: [], extensions: [] }
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
