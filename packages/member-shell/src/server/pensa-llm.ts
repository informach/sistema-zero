import 'server-only'
import type { ZodType } from 'zod'
import { getEnv } from '../lib/env'

/** Structured OpenRouter transport shared by Pensa planning and the Studio tutor. */

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'
const CONNECT_TIMEOUT_MS = 30_000

export class PensaLlmError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    /** Timeout de corpo não re-tenta: a repetição esperaria o relógio inteiro de novo. */
    readonly retryable: boolean = true,
  ) {
    super(message)
    this.name = 'PensaLlmError'
  }
}

export interface PensaWireMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** Há chave configurada? (sem chave o chat do Pensa não funciona — não há fallback). */
export function pensaLlmAvailable(): boolean {
  return Boolean(getEnv().OPENROUTER_API_KEY)
}

/**
 * Modelo das SÍNTESES PESADAS (spec/missões) — mais capaz quando configurado via
 * `OPENROUTER_PENSA_SYNTHESIS_MODEL` (planos de jogos grandes valem um modelo mais
 * forte); senão cai no modelo do Pensa (chat) e, por fim, no genérico.
 */
export function pensaSynthesisModel(): string {
  const env = getEnv()
  return env.OPENROUTER_PENSA_SYNTHESIS_MODEL || env.OPENROUTER_PENSA_MODEL || env.OPENROUTER_MODEL
}

function baseHeaders(apiKey: string): Record<string, string> {
  const env = getEnv()
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'X-Title': 'Sistema Zero Pensa',
    ...(env.OPENROUTER_REFERER ? { 'HTTP-Referer': env.OPENROUTER_REFERER } : {}),
  }
}

/**
 * Conecta e devolve também o `abort` do controller interno: quem espera o CORPO
 * depois dos headers precisa conseguir derrubar o socket (o timeout de corpo do
 * `completePensaJson` rejeitava a Promise mas deixava a conexão pendurada).
 */
async function connectWithTimeout(
  body: unknown,
  signal?: AbortSignal,
): Promise<{ res: Response; abort: () => void }> {
  const env = getEnv()
  const apiKey = env.OPENROUTER_API_KEY
  if (!apiKey) throw new PensaLlmError('IA não configurada', 503)

  const controller = new AbortController()
  const onCallerAbort = () => controller.abort()
  if (signal) {
    if (signal.aborted) controller.abort()
    else signal.addEventListener('abort', onCallerAbort, { once: true })
  }
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort()
      reject(new PensaLlmError(`OpenRouter sem resposta após ${CONNECT_TIMEOUT_MS}ms`))
    }, CONNECT_TIMEOUT_MS)
  })
  try {
    const res = await Promise.race([
      fetch(ENDPOINT, {
        method: 'POST',
        headers: baseHeaders(apiKey),
        body: JSON.stringify(body),
        signal: controller.signal,
      }),
      timeout,
    ])
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new PensaLlmError(`OpenRouter erro ${res.status}: ${text.slice(0, 300)}`, res.status)
    }
    return { res, abort: () => controller.abort() }
  } finally {
    if (timer) clearTimeout(timer)
    signal?.removeEventListener('abort', onCallerAbort)
  }
}

/** Nudge da 2ª tentativa (JSON cortado/fora do schema) — ver o loop de retry. */
const JSON_REPAIR_NUDGE =
  'Sua resposta anterior veio CORTADA ou fora do formato. Responda AGORA um ÚNICO objeto JSON VÁLIDO e COMPLETO que obedeça ao schema do começo ao fim, sem cortar no meio. Se precisar caber, seja mais ENXUTO no texto de cada campo (menos palavras) — mas não remova campos obrigatórios nem itens essenciais do plano.'

export type PensaJsonTransport = (
  body: {
    model: string
    messages: PensaWireMessage[]
    stream: false
    temperature: number
    max_tokens: number
    response_format: unknown
  },
  bodyTimeoutMs: number,
  signal?: AbortSignal,
) => Promise<unknown>

/**
 * Saída ESTRUTURADA validada: `response_format: json_schema` (OpenRouter é
 * OpenAI-compatible) + parse Zod. 1 retry em JSON/shape inválido (com nudge de
 * reparo); segunda falha → `PensaLlmError`. Não-streaming (sínteses são chamadas
 * curtas de servidor).
 */
export async function completePensaJson<T>(opts: {
  system: string
  user: string
  schema: ZodType<T>
  jsonSchema: Record<string, unknown>
  schemaName: string
  model?: string
  maxTokens?: number
  temperature?: number
  /** Alguns fluxos cobram uma chamada exata e não podem reparar com nova geração. */
  maxAttempts?: 1 | 2
  /**
   * Prazo para LER O CORPO após os headers (default CONNECT_TIMEOUT_MS). Sem
   * stream, o provider entrega o JSON só ao FIM da geração — sínteses longas
   * (planos com maxTokens 8000) precisam de folga maior que 30s.
   */
  bodyTimeoutMs?: number
  transport?: PensaJsonTransport
  signal?: AbortSignal
}): Promise<T> {
  const model = opts.model ?? pensaSynthesisModel()
  const baseMessages = [
    { role: 'system' as const, content: opts.system },
    { role: 'user' as const, content: opts.user },
  ]
  const responseFormat = {
    type: 'json_schema' as const,
    json_schema: { name: opts.schemaName, strict: true, schema: opts.jsonSchema },
  }

  let lastError: unknown
  const maxAttempts = opts.maxAttempts ?? 2
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    // 2ª tentativa: o 1º erro de um plano grande costuma ser JSON CORTADO (estourou
    // os tokens) ou fora do schema. Em vez de repetir o MESMO corpo cru, pede um JSON
    // válido e mais enxuto — recupera a geração sem desistir com 502.
    const messages =
      attempt === 0
        ? baseMessages
        : [...baseMessages, { role: 'user' as const, content: JSON_REPAIR_NUDGE }]
    const body = {
      model,
      messages,
      stream: false as const,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 1600,
      response_format: responseFormat,
    }
    try {
      if (opts.signal?.aborted) throw new PensaLlmError('Operação abortada', undefined, false)
      if (opts.transport) {
        const data = (await opts.transport(
          body,
          opts.bodyTimeoutMs ?? CONNECT_TIMEOUT_MS,
          opts.signal,
        )) as { choices?: Array<{ message?: { content?: unknown } }> }
        const content = data?.choices?.[0]?.message?.content
        if (typeof content !== 'string' || !content.trim())
          throw new PensaLlmError('IA devolveu resposta vazia')
        const parsed = opts.schema.safeParse(JSON.parse(content))
        if (!parsed.success) throw new PensaLlmError('IA devolveu JSON fora do contrato')
        return parsed.data
      }
      const { res, abort } = await connectWithTimeout(body)
      let timer: ReturnType<typeof setTimeout> | undefined
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          // Derruba o socket junto com o relógio — sem isto o fetch seguia
          // pendurado consumindo a conexão mesmo após a rejeição.
          abort()
          reject(new PensaLlmError('OpenRouter pendurou o corpo da resposta', undefined, false))
        }, opts.bodyTimeoutMs ?? CONNECT_TIMEOUT_MS)
      })
      try {
        const data = (await Promise.race([res.json(), timeout])) as {
          choices?: Array<{ message?: { content?: unknown } }>
        }
        const content = data.choices?.[0]?.message?.content
        if (typeof content !== 'string' || !content.trim()) {
          throw new PensaLlmError('IA devolveu resposta vazia')
        }
        const parsed = opts.schema.safeParse(JSON.parse(content))
        if (!parsed.success) throw new PensaLlmError('IA devolveu JSON fora do contrato')
        return parsed.data
      } finally {
        if (timer) clearTimeout(timer)
      }
    } catch (err) {
      lastError = err
      // 4xx do upstream (chave inválida/modelo inexistente) não melhora com retry,
      // e timeout de corpo re-tentado só faria a criança esperar o relógio 2x.
      if (err instanceof PensaLlmError && !err.retryable) throw err
      if (err instanceof PensaLlmError && err.status && err.status < 500 && err.status !== 429) {
        throw err
      }
    }
  }
  throw lastError instanceof Error ? lastError : new PensaLlmError('IA indisponível')
}
