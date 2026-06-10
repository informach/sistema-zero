import { create } from 'zustand'
import {
  type LogKind,
  PREVIEW_MAX_ERROR_CHARS,
  PREVIEW_MAX_LOG_PART_CHARS,
  PREVIEW_MAX_LOG_PARTS,
  type PreviewMessage,
} from '#preview'

export const MAX_LOG_TEXT_CHARS = 16_000
export const MAX_LOG_ENTRIES = 500
export const LOG_RATE_LIMIT_WINDOW_MS = 1_000
export const LOG_RATE_LIMIT_MAX_MESSAGES = 180

export interface LogEntry {
  id: number
  kind: LogKind
  text: string
  timestamp: number
  errorStack?: string
}

interface LogsStore {
  entries: LogEntry[]
  push: (m: PreviewMessage) => void
  clear: () => void
}

let counter = 0
let rateWindowStartedAt = 0
let rateWindowCount = 0
let rateWindowDropNoticeSent = false

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

export const useLogsStore = create<LogsStore>((set) => ({
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

function createLogEntry(m: PreviewMessage): LogEntry {
  counter += 1
  const safeParts = m.parts.slice(0, PREVIEW_MAX_LOG_PARTS + 1).map((part) => truncatePart(part))
  const text = truncateLogText(safeParts.join(' '))
  return {
    id: counter,
    kind: m.kind,
    text,
    timestamp: m.timestamp,
    errorStack: truncateErrorStack(m.error?.stack),
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

function resetLogRateLimit(now = Date.now()): void {
  rateWindowStartedAt = now
  rateWindowCount = 0
  rateWindowDropNoticeSent = false
}
