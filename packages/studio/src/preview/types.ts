export type LogKind = 'log' | 'warn' | 'error' | 'info' | 'unhandledRejection' | 'runtimeError'
const LOG_KINDS: ReadonlySet<string> = new Set([
  'log',
  'warn',
  'error',
  'info',
  'unhandledRejection',
  'runtimeError',
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
