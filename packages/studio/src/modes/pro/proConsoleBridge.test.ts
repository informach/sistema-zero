import { describe, expect, it } from 'bun:test'
import { PREVIEW_MAX_LOG_PARTS } from '#preview'
import {
  buildProConsoleBridgeScript,
  isProConsoleMessage,
  proPageLoadedAt,
} from './proConsoleBridge'

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

// Achado no ensaio do Pro com dependência (21/11/2026): o erro de uma página anterior seguia na aba
// Problemas depois de o Vite recarregar o jogo consertado.
describe('proConsoleBridge — o começo da página', () => {
  it('a ponte avisa o começo da página ao host, com o relógio da página', () => {
    const posted: Array<{ data: unknown; origin: string }> = []
    const fakeWindow = {
      parent: { postMessage: (data: unknown, origin: string) => posted.push({ data, origin }) },
    }
    const fakeConsole = { log() {}, info() {}, warn() {}, error() {}, debug() {} }
    new Function('window', 'console', buildProConsoleBridgeScript('https://host.test'))(
      fakeWindow,
      fakeConsole,
    )
    const page = posted.find(
      (entry) => (entry.data as { source?: string }).source === 'sz-pro-page',
    )
    expect(page?.origin).toBe('https://host.test')
    expect(typeof (page?.data as { at?: unknown }).at).toBe('number')
  })

  it('o horário vale limitado ao de chegada, e outra forma não é aviso de começo', () => {
    expect(proPageLoadedAt({ source: 'sz-pro-page', at: 1_000 }, 5_000)).toBe(1_000)
    // Um horário no futuro (o código da criança forjando) não esconde os erros que chegarem.
    expect(proPageLoadedAt({ source: 'sz-pro-page', at: 9_999_999 }, 5_000)).toBe(5_000)
    expect(proPageLoadedAt({ source: 'sz-pro-console', at: 1_000 }, 5_000)).toBeNull()
    expect(proPageLoadedAt({ source: 'sz-pro-page', at: 'agora' }, 5_000)).toBeNull()
    expect(proPageLoadedAt(null, 5_000)).toBeNull()
  })
})
