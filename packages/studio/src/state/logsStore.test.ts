import { afterEach, beforeEach, describe, expect, it, setSystemTime } from 'bun:test'
import { PREVIEW_MAX_ERROR_CHARS, PREVIEW_MAX_LOG_PARTS } from '#preview'
import {
  LOG_RATE_LIMIT_MAX_MESSAGES,
  LOG_RATE_LIMIT_WINDOW_MS,
  MAX_LOG_ENTRIES,
  MAX_LOG_TEXT_CHARS,
  useLogsStore,
} from './logsStore'

describe('logsStore', () => {
  beforeEach(() => {
    useLogsStore.getState().clear()
  })

  afterEach(() => {
    setSystemTime()
  })

  it('trunca mensagens gigantes vindas do preview', () => {
    useLogsStore.getState().push({
      source: 'sz-preview',
      kind: 'log',
      parts: ['x'.repeat(MAX_LOG_TEXT_CHARS + 100)],
      timestamp: 1,
    })

    const entry = useLogsStore.getState().entries[0]
    expect(entry?.text.length).toBeLessThan(MAX_LOG_TEXT_CHARS + 100)
    expect(entry?.text).toContain('[truncado]')
  })

  it('mantém no máximo 500 mensagens', () => {
    for (let index = 0; index < 510; index += 1) {
      // index + 1: epoch 0 faria o setSystemTime RESETAR para o relógio real.
      setSystemTime(new Date((index + 1) * LOG_RATE_LIMIT_WINDOW_MS))
      useLogsStore.getState().push({
        source: 'sz-preview',
        kind: 'log',
        parts: [`msg ${index}`],
        timestamp: index,
      })
    }

    const entries = useLogsStore.getState().entries
    expect(entries).toHaveLength(MAX_LOG_ENTRIES)
    expect(entries[0]?.text).toBe('msg 10')
  })

  it('limita flood de logs por janela de tempo', () => {
    setSystemTime(new Date(1_000))

    for (let index = 0; index < LOG_RATE_LIMIT_MAX_MESSAGES + 20; index += 1) {
      useLogsStore.getState().push({
        source: 'sz-preview',
        kind: 'log',
        parts: [`msg ${index}`],
        timestamp: index,
      })
    }

    const entries = useLogsStore.getState().entries
    expect(entries).toHaveLength(LOG_RATE_LIMIT_MAX_MESSAGES + 1)
    expect(entries.at(-1)?.kind).toBe('warn')
    expect(entries.at(-1)?.text).toContain('Muitas mensagens do preview')
    expect(entries.some((entry) => entry.text === `msg ${LOG_RATE_LIMIT_MAX_MESSAGES + 5}`)).toBe(
      false,
    )
  })

  it('limita partes e stack mesmo quando push recebe payload não validado', () => {
    useLogsStore.getState().push({
      source: 'sz-preview',
      kind: 'runtimeError',
      parts: Array.from({ length: PREVIEW_MAX_LOG_PARTS + 20 }, (_, index) => `msg ${index}`),
      error: { message: 'erro', stack: 's'.repeat(PREVIEW_MAX_ERROR_CHARS + 100) },
      timestamp: 1,
    })

    const entry = useLogsStore.getState().entries[0]
    expect(entry?.text).not.toContain(`msg ${PREVIEW_MAX_LOG_PARTS + 1}`)
    expect(entry?.errorStack?.length).toBeLessThan(PREVIEW_MAX_ERROR_CHARS + 100)
    expect(entry?.errorStack).toContain('[truncado]')
  })
})
