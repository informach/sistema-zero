export type LogKind =
  | 'log'
  | 'warn'
  | 'error'
  | 'info'
  | 'unhandledRejection'
  | 'runtimeError'
  // Loop síncrono cortado pela guarda de tempo (loopGuard). Vira entrada de
  // console com mensagem amigável.
  | 'loopStopped'
  // Sinal de vida do preview (watchdog de heartbeat). NÃO é log — o PreviewIframe
  // consome e NÃO encaminha ao logsStore.
  | 'heartbeat'
const LOG_KINDS: ReadonlySet<string> = new Set([
  'log',
  'warn',
  'error',
  'info',
  'unhandledRejection',
  'runtimeError',
  'loopStopped',
  'heartbeat',
])

export interface PreviewMessage {
  source: 'sz-preview'
  kind: LogKind
  /** Mensagens já como strings serializadas (sem cíclicos / sem funções). */
  parts: string[]
  /** Erro estruturado (apenas para kinds 'error' e 'runtimeError'). */
  error?: {
    message: string
    stack?: string
    line?: number
    col?: number
  }
  timestamp: number
}

export const PREVIEW_MESSAGE_SOURCE = 'sz-preview' as const
export const PREVIEW_MAX_LOG_PARTS = 20
export const PREVIEW_MAX_LOG_PART_CHARS = 8_000
export const PREVIEW_MAX_ERROR_CHARS = 8_000

// Limites do armazenamento persistente do preview (blocos "guardar/ler" →
// localStorage). O sandbox null-origin NÃO tem localStorage real; o bridge
// (src/preview/storageBridge.ts) shima a API e espelha o store `local` ao parent
// por postMessage. Como é código do ALUNO (não confiável), o parent valida e
// CLAMPA o payload antes de persistir — nunca confia no tamanho/forma recebidos.
export const PREVIEW_STORAGE_MAX_KEYS = 500
export const PREVIEW_STORAGE_MAX_KEY_CHARS = 256
export const PREVIEW_STORAGE_MAX_VALUE_CHARS = 100_000
export const PREVIEW_STORAGE_MAX_TOTAL_CHARS = 1_000_000

/**
 * Mensagem de escrita no armazenamento persistente, enviada pelo bridge dentro do
 * iframe a cada mutação do `localStorage` (set/remove/clear). Carrega o store
 * INTEIRO já reduzido (snapshot autoritativo) — o parent substitui o que tem.
 * Só `local` é espelhado; `session` é efêmero dentro do sandbox.
 */
export interface PreviewStorageWriteMessage {
  source: 'sz-preview'
  kind: 'storageWrite'
  store: 'local'
  data: Record<string, string>
  /**
   * Projeto para o qual o doc do preview foi construído. O receptor descarta a
   * mensagem se não casar com o projeto ATUAL — fecha a janela de troca de projeto
   * em que o programa ANTIGO (iframe ainda vivo) postaria no projeto NOVO.
   */
  projectId?: string
  timestamp: number
}

/**
 * Guard ESTRUTURAL do envelope de `storageWrite`. Proposital: valida só a casca
 * (origem/kind/store/objeto) — o CONTEÚDO de `data` é responsabilidade do
 * `sanitizePreviewStorageData`, sempre aplicado pelo receptor antes de persistir.
 */
export function isPreviewStorageWriteMessage(value: unknown): value is PreviewStorageWriteMessage {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const raw = value as Record<string, unknown>
  if (raw.source !== PREVIEW_MESSAGE_SOURCE) return false
  if (raw.kind !== 'storageWrite') return false
  if (raw.store !== 'local') return false
  if (!raw.data || typeof raw.data !== 'object' || Array.isArray(raw.data)) return false
  if (typeof raw.timestamp !== 'number' || !Number.isFinite(raw.timestamp)) return false
  return true
}

/**
 * Normaliza/CLAMPA um mapa de armazenamento vindo do sandbox (não confiável) ou
 * lido do IndexedDB. Mantém só pares string→string dentro dos limites de
 * quantidade, tamanho de chave/valor e total — descarta o excedente em silêncio
 * (em vez de estourar como o `QuotaExceededError` real). Determinístico: preserva
 * a ordem de inserção das chaves válidas.
 */
export function sanitizePreviewStorageData(raw: unknown): Record<string, string> {
  // Null-proto: uma chave literal `__proto__` (código de aluno válido) vira
  // propriedade PRÓPRIA em vez de cair no setter de Object.prototype (que a
  // descartaria silenciosamente) — e blinda contra qualquer poluição de protótipo.
  const out: Record<string, string> = Object.create(null)
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  let total = 0
  let count = 0
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (count >= PREVIEW_STORAGE_MAX_KEYS) break
    if (typeof key !== 'string' || typeof value !== 'string') continue
    if (key.length === 0 || key.length > PREVIEW_STORAGE_MAX_KEY_CHARS) continue
    const clampedValue =
      value.length > PREVIEW_STORAGE_MAX_VALUE_CHARS
        ? value.slice(0, PREVIEW_STORAGE_MAX_VALUE_CHARS)
        : value
    if (total + key.length + clampedValue.length > PREVIEW_STORAGE_MAX_TOTAL_CHARS) break
    out[key] = clampedValue
    total += key.length + clampedValue.length
    count++
  }
  return out
}

export function isPreviewMessage(value: unknown): value is PreviewMessage {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const raw = value as Record<string, unknown>
  if (raw.source !== PREVIEW_MESSAGE_SOURCE) return false
  if (typeof raw.kind !== 'string' || !LOG_KINDS.has(raw.kind)) return false
  if (
    !Array.isArray(raw.parts) ||
    raw.parts.length > PREVIEW_MAX_LOG_PARTS + 1 ||
    raw.parts.some((part) => typeof part !== 'string' || part.length > PREVIEW_MAX_LOG_PART_CHARS)
  ) {
    return false
  }
  if (typeof raw.timestamp !== 'number' || !Number.isFinite(raw.timestamp)) return false
  if (raw.error == null) return true
  if (!raw.error || typeof raw.error !== 'object' || Array.isArray(raw.error)) return false
  const error = raw.error as Record<string, unknown>
  return (
    typeof error.message === 'string' &&
    error.message.length <= PREVIEW_MAX_ERROR_CHARS &&
    (error.stack == null ||
      (typeof error.stack === 'string' && error.stack.length <= PREVIEW_MAX_ERROR_CHARS)) &&
    (error.line == null || (typeof error.line === 'number' && Number.isFinite(error.line))) &&
    (error.col == null || (typeof error.col === 'number' && Number.isFinite(error.col)))
  )
}
