import { describe, expect, it } from 'bun:test'
import { PREVIEW_MAX_LOG_PARTS } from '#preview'
import { buildProConsoleBridgeScript, isProConsoleMessage } from './proConsoleBridge'

describe('proConsoleBridge — script injetado', () => {
  it('embute o targetOrigin do host via JSON (nunca interpolação crua) + marker + guard', () => {
    const script = buildProConsoleBridgeScript('https://kids.sistemazero.com.br')
    expect(script).toContain('"https://kids.sistemazero.com.br"')
    expect(script).toContain('sz-pro-console')
    // Idempotente por página (o HTML pode ser injetado mais de uma vez).
    expect(script).toContain('__szProConsole')
    // postMessage sempre com targetOrigin (regra 8) — nunca curinga.
    expect(script).not.toContain("'*'")
  })
})

describe('proConsoleBridge — isProConsoleMessage', () => {
  const valid = { source: 'sz-pro-console', kind: 'log', parts: ['olá'] }

  it('aceita a forma válida (todos os kinds do bridge)', () => {
    for (const kind of ['log', 'info', 'warn', 'error']) {
      expect(isProConsoleMessage({ ...valid, kind })).toBe(true)
    }
  })

  it('rejeita source/kind/parts fora do contrato', () => {
    expect(isProConsoleMessage(null)).toBe(false)
    expect(isProConsoleMessage({ ...valid, source: 'sz-preview' })).toBe(false)
    // 'debug' não cruza a ponte (o bridge o converte p/ 'log' ainda no iframe).
    expect(isProConsoleMessage({ ...valid, kind: 'debug' })).toBe(false)
    expect(isProConsoleMessage({ ...valid, kind: 'runtimeError' })).toBe(false)
    expect(isProConsoleMessage({ ...valid, parts: 'olá' })).toBe(false)
    expect(isProConsoleMessage({ ...valid, parts: ['ok', 42] })).toBe(false)
  })

  it('rejeita contagem de parts acima do teto (+1 da parte-resumo)', () => {
    const cheio = Array.from({ length: PREVIEW_MAX_LOG_PARTS + 1 }, (_, i) => `p${i}`)
    expect(isProConsoleMessage({ ...valid, parts: cheio })).toBe(true)
    expect(isProConsoleMessage({ ...valid, parts: [...cheio, 'excedente'] })).toBe(false)
  })
})
