import 'server-only'
import { getEnv } from '../lib/env'
import {
  isHallucinatedTranscript,
  SPOKEN_TEXT_MAX_CHARS,
  type SpokenAudioFormat,
  TRANSCRIBE_KEYWORDS,
  tidyTranscript,
  transcribePrompt,
} from '../lib/voice/transcription'

/**
 * Transcrição da fala da criança pelo OpenRouter (voz → texto para a equipe, 14/10/2026).
 *
 * ⚠️ A voz NUNCA é guardada: os bytes vivem só na memória deste pedido e vão ao OpenRouter num
 * JSON (base64). Nenhum log, erro ou contexto do Sentry leva o áudio, o texto transcrito ou o
 * corpo da resposta do provedor: as falhas viram um `reason` fixo. Não copie o padrão do
 * `pensa-llm.ts`, que embute a resposta do provedor na mensagem de erro.
 *
 * O modelo é o `openai/gpt-transcribe` (escolha dela depois da sondagem de 14/10/2026: acertou o
 * vocabulário da plataforma), com `data_collection: 'deny'` (só provedores que não treinam com os
 * dados). Sem `zdr`: com ele o OpenRouter não acha rota para nenhum modelo da OpenAI (404 "No
 * endpoints found matching your data policy"), porque a OpenAI não é listada como retenção zero.
 * Reserva: `openai/gpt-4o-mini-transcribe`.
 */

const ENDPOINT = 'https://openrouter.ai/api/v1/audio/transcriptions'
export const DEFAULT_TRANSCRIBE_MODEL = 'openai/gpt-transcribe'
export const DEFAULT_TRANSCRIBE_FALLBACK_MODEL = 'openai/gpt-4o-mini-transcribe'

/** Prazo do pedido inteiro (tentativas somadas). */
const DEADLINE_MS = 30_000
/** Prazo de UMA chamada ao OpenRouter. */
const ATTEMPT_TIMEOUT_MS = 20_000
/** Menos que isso de prazo não vale começar outra chamada. */
const MIN_ATTEMPT_MS = 3_000
const RETRY_BACKOFF_MS = 400

export type TranscribeFailure = 'empty' | 'unavailable' | 'timeout' | 'aborted'

/** Falha da transcrição. A mensagem é fixa de propósito: nada do provedor nem da fala. */
export class TranscribeError extends Error {
  constructor(readonly reason: TranscribeFailure) {
    super(`Transcrição falhou: ${reason}`)
    this.name = 'TranscribeError'
  }
}

/** A fala da criança está ligada neste servidor (interruptor + chave). */
export function isVoiceInputConfigured(): boolean {
  const env = getEnv()
  return env.VOICE_INPUT_ENABLED && Boolean(env.OPENROUTER_API_KEY)
}

export interface TranscribeInput {
  audio: Uint8Array
  format: SpokenAudioFormat
  /** Onde a criança está (título da fase e da parte), já limpo. */
  context?: string
  /** O teto do texto (`spokenTextMaxChars`); sem ele, os 1000 de sempre. */
  maxChars?: number
  /** O pedido do navegador: se ele vai embora, a chamada ao OpenRouter para junto. */
  signal?: AbortSignal
}

export interface TranscribeConfig {
  apiKey: string
  model: string
  fallbackModel: string
  referer?: string
}

export interface TranscribeDeps {
  fetch?: typeof fetch
  now?: () => number
  sleep?: (ms: number) => Promise<void>
  /** Sem ela, a env. Os testes passam a config inteira e não tocam a env. */
  config?: TranscribeConfig
}

type AttemptResult =
  | { ok: true; text: string }
  | { ok: false; kind: 'transient' | 'model' | 'fatal' | 'timeout' | 'aborted'; status?: number }

function configFromEnv(): TranscribeConfig {
  const env = getEnv()
  return {
    apiKey: env.OPENROUTER_API_KEY ?? '',
    model: env.OPENROUTER_TRANSCRIBE_MODEL || DEFAULT_TRANSCRIBE_MODEL,
    fallbackModel: env.OPENROUTER_TRANSCRIBE_FALLBACK_MODEL || DEFAULT_TRANSCRIBE_FALLBACK_MODEL,
    referer: env.OPENROUTER_REFERER,
  }
}

/** O que cada status do OpenRouter quer dizer para a próxima tentativa. */
function classify(status: number): 'transient' | 'model' | 'fatal' {
  // Chave, crédito ou permissão: outra tentativa com a mesma chave não muda nada.
  if (status === 401 || status === 402 || status === 403) return 'fatal'
  if (status === 408 || status === 429 || status >= 500) return 'transient'
  // 400/404/413/422: o modelo (ou a rota dele) não aceitou este pedido; a reserva pode aceitar.
  return 'model'
}

/**
 * Transcreve a fala. Uma chamada ao modelo principal; em 429/5xx/rede, uma segunda; e, se o
 * modelo recusar ou continuar falhando, a reserva. Tudo dentro de um prazo único.
 */
export async function transcribeSpeech(
  input: TranscribeInput,
  deps: TranscribeDeps = {},
): Promise<{ text: string; model: string }> {
  const config = deps.config ?? configFromEnv()
  if (!config.apiKey) throw new TranscribeError('unavailable')
  const doFetch = deps.fetch ?? fetch
  const now = deps.now ?? Date.now
  const sleep = deps.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)))
  const deadline = now() + DEADLINE_MS
  // Sem copiar os bytes de novo (o áudio já vive em duas cópias neste pedido).
  const data = Buffer.from(
    input.audio.buffer,
    input.audio.byteOffset,
    input.audio.byteLength,
  ).toString('base64')
  /** O último modelo que de fato recebeu uma chamada (para o registro da falha). */
  let chamado = config.model

  const attempt = async (
    model: string,
    openai: Record<string, unknown>,
  ): Promise<AttemptResult> => {
    if (input.signal?.aborted) return { ok: false, kind: 'aborted' }
    const remaining = deadline - now()
    if (remaining < MIN_ATTEMPT_MS) return { ok: false, kind: 'timeout' }
    chamado = model
    const controller = new AbortController()
    let timedOut = false
    const timer = setTimeout(
      () => {
        timedOut = true
        controller.abort()
      },
      Math.min(ATTEMPT_TIMEOUT_MS, remaining),
    )
    const onAbort = () => controller.abort()
    input.signal?.addEventListener('abort', onAbort, { once: true })
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'X-Title': 'Sistema Zero',
      }
      if (config.referer) headers['HTTP-Referer'] = config.referer
      const res = await doFetch(ENDPOINT, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          model,
          input_audio: { data, format: input.format },
          language: 'pt',
          temperature: 0,
          // `deny`: só provedores que não usam os dados para treinar. O prompt e as palavras-chave
          // vão ao provedor que atende (a OpenAI) com os nomes de campo dele.
          provider: { data_collection: 'deny', options: { openai } },
        }),
      })
      if (!res.ok) {
        // O corpo de erro pode ecoar o pedido: descartado sem ler.
        await res.body?.cancel().catch(() => undefined)
        return { ok: false, kind: classify(res.status), status: res.status }
      }
      let body: unknown
      try {
        body = await res.json()
      } catch {
        return { ok: false, kind: 'model', status: res.status }
      }
      const text = (body as { text?: unknown } | null)?.text
      if (typeof text !== 'string') return { ok: false, kind: 'model', status: res.status }
      return { ok: true, text }
    } catch {
      if (input.signal?.aborted) return { ok: false, kind: 'aborted' }
      if (timedOut) return { ok: false, kind: 'timeout' }
      return { ok: false, kind: 'transient' }
    } finally {
      clearTimeout(timer)
      input.signal?.removeEventListener('abort', onAbort)
    }
  }

  // Principal: o prompt e as palavras-chave do vocabulário da plataforma.
  const primary = () =>
    attempt(config.model, {
      prompt: transcribePrompt(input.context),
      keywords: [...TRANSCRIBE_KEYWORDS],
    })
  let result = await primary()
  if (!result.ok && result.kind === 'transient') {
    await sleep(RETRY_BACKOFF_MS)
    result = await primary()
  }
  const useFallback =
    !result.ok &&
    result.kind !== 'fatal' &&
    result.kind !== 'aborted' &&
    Boolean(config.fallbackModel) &&
    config.fallbackModel !== config.model
  if (useFallback) {
    // A reserva não tem `keywords`: o vocabulário vai no texto do prompt.
    result = await attempt(config.fallbackModel, {
      prompt: transcribePrompt(input.context, true),
    })
  }

  if (!result.ok) {
    if (result.kind !== 'aborted')
      console.warn('[voz] transcrição falhou', {
        model: chamado,
        kind: result.kind,
        status: result.status,
      })
    throw new TranscribeError(
      result.kind === 'aborted' ? 'aborted' : result.kind === 'timeout' ? 'timeout' : 'unavailable',
    )
  }
  // Teto POR PADRÃO (1000); só o formulário que pediu o do Pensa recebe mais.
  const text = tidyTranscript(result.text, input.maxChars ?? SPOKEN_TEXT_MAX_CHARS)
  if (!text || isHallucinatedTranscript(text)) throw new TranscribeError('empty')
  return { text, model: chamado }
}
