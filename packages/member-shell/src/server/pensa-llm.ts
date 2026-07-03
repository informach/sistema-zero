import 'server-only'
import type { ZodType } from 'zod'
import { getEnv } from '../lib/env'

/**
 * Cliente OpenRouter do Pensa (SERVIDOR — a criança nunca tem BYOK). Duas capacidades:
 * - `streamPensaChat` — chat streaming (SSE do OpenRouter → deltas de texto), usado
 *   pela rota `/api/pensa/chat`.
 * - `completePensaJson` — saída ESTRUTURADA (`response_format: json_schema`) validada
 *   por Zod (1 retry em parse inválido), usada pelos agentes de síntese (ideia
 *   clarificada, evaluator das 5 perguntas, spec, missões).
 *
 * Erros viram `PensaLlmError` tipado — o handler traduz p/ 502 `PENSA_AI_UNAVAILABLE`.
 * O parser SSE é um porte enxuto do `ai/streaming.ts` do @sistemazero/studio (módulo
 * interno de lá — não exportado; duplicação deliberada e pequena).
 */

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'
const CONNECT_TIMEOUT_MS = 30_000
const STREAM_IDLE_TIMEOUT_MS = 60_000
const MAX_REMAINDER_BYTES = 512 * 1024

export class PensaLlmError extends Error {
  constructor(
    message: string,
    readonly status?: number,
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
 * Modelo do chat (conversa) — o MESMO das sínteses quando configurado: o modelo
 * barato genérico (OPENROUTER_MODEL) gerava sugestões vagas/genéricas no chat
 * com a criança (QA 02/07), e a conversa é a matéria-prima de TODO o plano.
 */
export function pensaChatModel(): string {
  const env = getEnv()
  return env.OPENROUTER_PENSA_MODEL || env.OPENROUTER_MODEL
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

// ── Parser SSE (formato OpenAI-compatible `data: {...}\n\n`) ─────────────────

interface ParseResult {
  events: string[]
  done: boolean
  remainder: string
}

function parseSSEChunk(chunk: string, prev = ''): ParseResult {
  const buffer = prev + chunk
  const events: string[] = []
  let done = false
  const blocks = buffer.split('\n\n')
  const remainder = blocks.pop() ?? ''
  for (const block of blocks) {
    for (const line of block.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (payload === '[DONE]') {
        done = true
        continue
      }
      try {
        const parsed = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>
        }
        const content = parsed.choices?.[0]?.delta?.content
        if (content) events.push(content)
      } catch {
        // Linha não-JSON (comentário SSE) — ignora.
      }
    }
  }
  return { events, done, remainder }
}

/** `reader.read()` com abort + timeout de ociosidade (espelha o streaming.ts do studio). */
function readWithGuards<T>(
  reader: ReadableStreamDefaultReader<T>,
  signal: AbortSignal | undefined,
  idleTimeoutMs: number,
): Promise<Awaited<ReturnType<ReadableStreamDefaultReader<T>['read']>>> {
  return new Promise((resolve, reject) => {
    let settled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const cleanup = () => {
      if (timer) clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }
    const finish = <V>(fn: (v: V) => void, value: V) => {
      if (settled) return
      settled = true
      cleanup()
      fn(value)
    }
    function onAbort() {
      finish(reject, new PensaLlmError('Chat abortado'))
    }
    if (signal?.aborted) {
      onAbort()
      return
    }
    timer = setTimeout(
      () => finish(reject, new PensaLlmError(`IA ociosa por mais de ${idleTimeoutMs}ms`)),
      idleTimeoutMs,
    )
    signal?.addEventListener('abort', onAbort, { once: true })
    reader.read().then(
      (v) => finish(resolve, v),
      (e) => finish(reject, e),
    )
  })
}

async function connectWithTimeout(body: unknown, signal?: AbortSignal): Promise<Response> {
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
    return res
  } finally {
    if (timer) clearTimeout(timer)
    signal?.removeEventListener('abort', onCallerAbort)
  }
}

/**
 * Chat streaming: emite cada delta de texto em `onDelta` e resolve com o texto
 * completo. Aborto do caller (criança fechou/cancelou) rejeita — o chamador NÃO
 * persiste o turno parcial.
 */
export async function streamPensaChat(opts: {
  messages: PensaWireMessage[]
  model?: string
  maxTokens?: number
  temperature?: number
  signal?: AbortSignal
  onDelta: (text: string) => void
}): Promise<string> {
  const res = await connectWithTimeout(
    {
      model: opts.model ?? pensaChatModel(),
      messages: opts.messages,
      stream: true,
      temperature: opts.temperature ?? 0.6,
      max_tokens: opts.maxTokens ?? 700,
    },
    opts.signal,
  )
  if (!res.body) throw new PensaLlmError('OpenRouter sem corpo de resposta')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ''
  let remainder = ''
  try {
    let reachedEof = false
    while (true) {
      const { value, done } = await readWithGuards(reader, opts.signal, STREAM_IDLE_TIMEOUT_MS)
      if (done) {
        reachedEof = true
        break
      }
      const result = parseSSEChunk(decoder.decode(value, { stream: true }), remainder)
      remainder = result.remainder
      if (remainder.length > MAX_REMAINDER_BYTES) {
        throw new PensaLlmError('Stream de IA sem delimitador (resposta malformada)')
      }
      for (const text of result.events) {
        full += text
        opts.onDelta(text)
      }
      if (result.done) break
    }
    remainder += decoder.decode()
    if (!reachedEof) await reader.cancel().catch(() => undefined)
    if (remainder.trim()) {
      const result = parseSSEChunk('\n\n', remainder)
      for (const text of result.events) {
        full += text
        opts.onDelta(text)
      }
    }
  } catch (err) {
    await reader.cancel().catch(() => undefined)
    throw err
  }
  return full
}

/** Nudge da 2ª tentativa (JSON cortado/fora do schema) — ver o loop de retry. */
const JSON_REPAIR_NUDGE =
  'Sua resposta anterior veio CORTADA ou fora do formato. Responda AGORA um ÚNICO objeto JSON VÁLIDO e COMPLETO que obedeça ao schema do começo ao fim, sem cortar no meio. Se precisar caber, seja mais ENXUTO no texto de cada campo (menos palavras) — mas não remova campos obrigatórios nem itens essenciais do plano.'

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
  for (let attempt = 0; attempt < 2; attempt += 1) {
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
      stream: false,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 1600,
      response_format: responseFormat,
    }
    try {
      const res = await connectWithTimeout(body)
      let timer: ReturnType<typeof setTimeout> | undefined
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new PensaLlmError('OpenRouter pendurou o corpo da resposta')),
          CONNECT_TIMEOUT_MS,
        )
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
      // 4xx do upstream (chave inválida/modelo inexistente) não melhora com retry.
      if (err instanceof PensaLlmError && err.status && err.status < 500 && err.status !== 429) {
        throw err
      }
    }
  }
  throw lastError instanceof Error ? lastError : new PensaLlmError('IA indisponível')
}
