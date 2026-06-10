import { describe, expect, it } from 'bun:test'
import {
  isPreviewMessage,
  PREVIEW_MAX_ERROR_CHARS,
  PREVIEW_MAX_LOG_PART_CHARS,
  PREVIEW_MAX_LOG_PARTS,
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
})
