import { useContext } from 'react'
import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import {
  type LogKind,
  PREVIEW_MAX_ERROR_CHARS,
  PREVIEW_MAX_LOG_PART_CHARS,
  PREVIEW_MAX_LOG_PARTS,
  type PreviewMessage,
} from '#preview'
import { StudioStoresContext } from './storesContext'

export const MAX_LOG_TEXT_CHARS = 16_000
export const MAX_LOG_ENTRIES = 500
export const LOG_RATE_LIMIT_WINDOW_MS = 1_000
export const LOG_RATE_LIMIT_MAX_MESSAGES = 180

/**
 * O que conta como ERRO de verdade. Vive aqui (e não no Console) porque mais de
 * um consumidor precisa da MESMA régua: o Console pinta, o Zappy diagnostica.
 * ⚠️ `console.error` explícito é raro no código gerado — quem carrega o erro que
 * a criança vê é `runtimeError`/`unhandledRejection`. Filtrar só por `'error'`
 * deixa passar exatamente os que têm stack.
 */
export const ERROR_LOG_KINDS: ReadonlySet<LogKind> = new Set([
  'error',
  'runtimeError',
  'unhandledRejection',
])

export interface LogEntry {
  id: number
  kind: LogKind
  text: string
  timestamp: number
  errorStack?: string
  /**
   * Linha/coluna do erro no script.js do ALUNO — só preenchidas quando o
   * interceptor confirmou `userCode` (erro de extensão/extra não mapeia para
   * bloco). O Console usa para o chip "Ver o bloco".
   */
  errorLine?: number
  errorCol?: number
}

interface LogsStore {
  entries: LogEntry[]
  push: (m: PreviewMessage) => void
  clear: () => void
}

function truncateLogText(text: string): string {
  if (text.length <= MAX_LOG_TEXT_CHARS) return text
  return `${text.slice(0, MAX_LOG_TEXT_CHARS)}... [truncado]`
}

function truncatePart(text: string): string {
  if (text.length <= PREVIEW_MAX_LOG_PART_CHARS) return text
  return `${text.slice(0, PREVIEW_MAX_LOG_PART_CHARS)}... [truncado]`
}

function truncateErrorStack(stack: string | undefined): string | undefined {
  if (!stack) return undefined
  if (stack.length <= PREVIEW_MAX_ERROR_CHARS) return stack
  return `${stack.slice(0, PREVIEW_MAX_ERROR_CHARS)}... [truncado]`
}

/** Linha/coluna vêm do iframe (não confiável): só inteiro positivo razoável. */
function sanitizeLineNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  const n = Math.floor(value)
  return n >= 1 && n <= 10_000_000 ? n : undefined
}

export function createLogsStore(): StoreApi<LogsStore> {
  // Contadores no CLOSURE da factory (eram variáveis de módulo): cada
  // instância do <Studio> tem o próprio rate-limit, e montagens novas nascem
  // zeradas.
  let counter = 0
  let rateWindowStartedAt = 0
  let rateWindowCount = 0
  let rateWindowDropNoticeSent = false

  function resetLogRateLimit(now = Date.now()): void {
    rateWindowStartedAt = now
    rateWindowCount = 0
    rateWindowDropNoticeSent = false
  }

  function admitLogMessage(now: number): 'accept' | 'notice' | 'drop' {
    if (now - rateWindowStartedAt >= LOG_RATE_LIMIT_WINDOW_MS) {
      resetLogRateLimit(now)
    }
    if (rateWindowCount < LOG_RATE_LIMIT_MAX_MESSAGES) {
      rateWindowCount += 1
      return 'accept'
    }
    if (!rateWindowDropNoticeSent) {
      rateWindowDropNoticeSent = true
      return 'notice'
    }
    return 'drop'
  }

  function createLogEntry(m: PreviewMessage): LogEntry {
    counter += 1
    const safeParts = m.parts.slice(0, PREVIEW_MAX_LOG_PARTS + 1).map((part) => truncatePart(part))
    const text = truncateLogText(safeParts.join(' '))
    const line = m.error?.userCode === true ? sanitizeLineNumber(m.error.line) : undefined
    return {
      id: counter,
      kind: m.kind,
      text,
      timestamp: m.timestamp,
      errorStack: truncateErrorStack(m.error?.stack),
      errorLine: line,
      errorCol: line !== undefined ? sanitizeLineNumber(m.error?.col) : undefined,
    }
  }

  function createRateLimitNotice(now: number): LogEntry {
    counter += 1
    return {
      id: counter,
      kind: 'warn',
      text: 'Muitas mensagens do preview em pouco tempo; novas mensagens foram agrupadas para manter a IDE responsiva.',
      timestamp: now,
    }
  }

  function appendLogEntry(entries: LogEntry[], entry: LogEntry): { entries: LogEntry[] } {
    return { entries: [...entries.slice(-(MAX_LOG_ENTRIES - 1)), entry] }
  }

  return createStore<LogsStore>((set) => ({
    entries: [],
    push: (m) => {
      const now = Date.now()
      set((s) => {
        if (s.entries.length === 0) resetLogRateLimit(now)
        const admission = admitLogMessage(now)
        if (admission === 'drop') return s
        const entry = admission === 'notice' ? createRateLimitNotice(now) : createLogEntry(m)
        return appendLogEntry(s.entries, entry)
      })
    },
    clear: () => {
      resetLogRateLimit()
      set({ entries: [] })
    },
  }))
}

const defaultLogsStore = createLogsStore()

type BoundUseLogsStore = (<T>(selector: (s: LogsStore) => T) => T) & StoreApi<LogsStore>

/** Hook por instância (ver uiStore.ts para o contrato default/estáticas). */
export const useLogsStore: BoundUseLogsStore = Object.assign(function useLogsStoreHook<T>(
  selector: (s: LogsStore) => T,
): T {
  const stores = useContext(StudioStoresContext)
  return useStore(stores?.logs ?? defaultLogsStore, selector)
}, defaultLogsStore)
