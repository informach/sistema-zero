import { describe, expect, it } from 'bun:test'
import {
  isPreviewMessage,
  isPreviewStorageWriteMessage,
  PREVIEW_MAX_ERROR_CHARS,
  PREVIEW_MAX_LOG_PART_CHARS,
  PREVIEW_MAX_LOG_PARTS,
  PREVIEW_STORAGE_MAX_KEY_CHARS,
  PREVIEW_STORAGE_MAX_KEYS,
  PREVIEW_STORAGE_MAX_VALUE_CHARS,
  sanitizePreviewStorageData,
} from '../types'

describe('isPreviewMessage', () => {
  it('aceita mensagens válidas do preview', () => {
    expect(
      isPreviewMessage({
        source: 'sz-preview',
        kind: 'runtimeError',
        parts: ['Erro'],
        error: { message: 'Erro', stack: 'stack', line: 1, col: 2 },
        timestamp: 123,
      }),
    ).toBe(true)
  })

  it('rejeita payloads malformados vindos do iframe', () => {
    expect(isPreviewMessage({ source: 'sz-preview', kind: 'log', parts: {}, timestamp: 1 })).toBe(
      false,
    )
    expect(
      isPreviewMessage({
        source: 'sz-preview',
        kind: 'log',
        parts: ['ok'],
        timestamp: Number.NaN,
      }),
    ).toBe(false)
    expect(
      isPreviewMessage({
        source: 'sz-preview',
        kind: 'unknown',
        parts: ['ok'],
        timestamp: 1,
      }),
    ).toBe(false)
  })

  it('rejeita mensagens que excedem limites de tamanho do receiver', () => {
    expect(
      isPreviewMessage({
        source: 'sz-preview',
        kind: 'log',
        parts: Array.from({ length: PREVIEW_MAX_LOG_PARTS + 2 }, () => 'ok'),
        timestamp: 1,
      }),
    ).toBe(false)

    expect(
      isPreviewMessage({
        source: 'sz-preview',
        kind: 'log',
        parts: ['x'.repeat(PREVIEW_MAX_LOG_PART_CHARS + 1)],
        timestamp: 1,
      }),
    ).toBe(false)

    expect(
      isPreviewMessage({
        source: 'sz-preview',
        kind: 'runtimeError',
        parts: ['erro'],
        error: { message: 'x'.repeat(PREVIEW_MAX_ERROR_CHARS + 1) },
        timestamp: 1,
      }),
    ).toBe(false)
  })

  it('NÃO confunde storageWrite com log (kinds disjuntos)', () => {
    const storageMsg = {
      source: 'sz-preview',
      kind: 'storageWrite',
      store: 'local',
      data: { fome: '3' },
      timestamp: 1,
    }
    expect(isPreviewMessage(storageMsg)).toBe(false)
    expect(isPreviewStorageWriteMessage(storageMsg)).toBe(true)
  })
})

describe('isPreviewStorageWriteMessage', () => {
  const base = { source: 'sz-preview', kind: 'storageWrite', store: 'local', timestamp: 1 }

  it('aceita o envelope válido', () => {
    expect(isPreviewStorageWriteMessage({ ...base, data: { a: '1' } })).toBe(true)
    expect(isPreviewStorageWriteMessage({ ...base, data: {} })).toBe(true)
  })

  it('rejeita envelopes inválidos', () => {
    expect(isPreviewStorageWriteMessage({ ...base, data: ['x'] })).toBe(false)
    expect(isPreviewStorageWriteMessage({ ...base, data: null })).toBe(false)
    expect(isPreviewStorageWriteMessage({ ...base, store: 'session', data: {} })).toBe(false)
    expect(isPreviewStorageWriteMessage({ ...base, source: 'outra', data: {} })).toBe(false)
    expect(isPreviewStorageWriteMessage({ ...base, kind: 'log', data: {} })).toBe(false)
    expect(isPreviewStorageWriteMessage({ ...base, data: {}, timestamp: Number.NaN })).toBe(false)
  })
})

describe('sanitizePreviewStorageData', () => {
  it('mantém só pares string→string', () => {
    expect(sanitizePreviewStorageData({ ok: 'x', num: 1, nulo: null, arr: [], obj: {} })).toEqual({
      ok: 'x',
    })
  })

  it('rejeita não-objetos e arrays', () => {
    expect(sanitizePreviewStorageData(null)).toEqual({})
    expect(sanitizePreviewStorageData(['x'])).toEqual({})
    expect(sanitizePreviewStorageData('x')).toEqual({})
  })

  it('descarta chave vazia ou acima do limite', () => {
    const longKey = 'k'.repeat(PREVIEW_STORAGE_MAX_KEY_CHARS + 1)
    expect(sanitizePreviewStorageData({ '': 'x', [longKey]: 'y', ok: 'z' })).toEqual({ ok: 'z' })
  })

  it('trunca valor acima do limite', () => {
    const out = sanitizePreviewStorageData({ k: 'v'.repeat(PREVIEW_STORAGE_MAX_VALUE_CHARS + 100) })
    expect(out.k?.length).toBe(PREVIEW_STORAGE_MAX_VALUE_CHARS)
  })

  it('clampa a quantidade de chaves', () => {
    const big: Record<string, string> = {}
    for (let i = 0; i < PREVIEW_STORAGE_MAX_KEYS + 50; i++) big[`k${i}`] = 'x'
    expect(Object.keys(sanitizePreviewStorageData(big)).length).toBe(PREVIEW_STORAGE_MAX_KEYS)
  })
})
