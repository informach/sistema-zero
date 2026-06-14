import { describe, expect, it } from 'bun:test'
import { buildStorageBridgeRuntime } from '../storageBridge'
import { PREVIEW_STORAGE_MAX_KEY_CHARS } from '../types'

interface CapturedMessage {
  msg: {
    source: string
    kind: string
    store: string
    data: Record<string, string>
    projectId?: string | null
  }
  origin: string
}

/**
 * Executa o IIFE do bridge num `window`/`parent` falsos (params sombreiam os
 * globais) e devolve o window resultante + as mensagens postadas ao parent.
 */
function runBridge(runtime: string): {
  win: { localStorage: Storage; sessionStorage: Storage }
  posted: CapturedMessage[]
} {
  const posted: CapturedMessage[] = []
  const win = {} as { localStorage: Storage; sessionStorage: Storage }
  const parent = {
    postMessage: (msg: CapturedMessage['msg'], origin: string) => posted.push({ msg, origin }),
  }
  // eslint-disable-next-line no-new-func
  new Function('window', 'parent', runtime)(win, parent)
  return { win, posted }
}

describe('buildStorageBridgeRuntime', () => {
  it('instala shims de localStorage e sessionStorage', () => {
    const { win } = runBridge(buildStorageBridgeRuntime())
    expect(typeof win.localStorage.getItem).toBe('function')
    expect(typeof win.sessionStorage.getItem).toBe('function')
    expect(typeof win.localStorage.setItem).toBe('function')
  })

  it('semeia o snapshot local e o devolve por getItem', () => {
    const { win } = runBridge(
      buildStorageBridgeRuntime({ localSnapshot: { fome: '7', nome: 'Rex' } }),
    )
    expect(win.localStorage.getItem('fome')).toBe('7')
    expect(win.localStorage.getItem('nome')).toBe('Rex')
    expect(win.localStorage.getItem('inexistente')).toBeNull()
    expect(win.localStorage.length).toBe(2)
  })

  it('espelha mutações do localStorage ao parent (snapshot autoritativo)', () => {
    const { win, posted } = runBridge(
      buildStorageBridgeRuntime({
        localSnapshot: { fome: '7' },
        parentOrigin: 'https://app.exemplo.com',
      }),
    )
    win.localStorage.setItem('fome', '3')
    expect(win.localStorage.getItem('fome')).toBe('3')
    const last = posted.at(-1)
    expect(last?.msg.source).toBe('sz-preview')
    expect(last?.msg.kind).toBe('storageWrite')
    expect(last?.msg.store).toBe('local')
    expect(last?.msg.data).toEqual({ fome: '3' })
  })

  it('coage chave/valor para string como o Storage real', () => {
    const { win, posted } = runBridge(
      buildStorageBridgeRuntime({ parentOrigin: 'https://app.exemplo.com' }),
    )
    // setItem aceitando number → string ("código sagrado": setItem(k, n) é comum)
    ;(win.localStorage.setItem as (k: unknown, v: unknown) => void)('pontos', 10)
    expect(win.localStorage.getItem('pontos')).toBe('10')
    expect(posted.at(-1)?.msg.data).toEqual({ pontos: '10' })
  })

  it('removeItem e clear espelham o store reduzido', () => {
    const { win, posted } = runBridge(
      buildStorageBridgeRuntime({
        localSnapshot: { a: '1', b: '2' },
        parentOrigin: 'https://app.exemplo.com',
      }),
    )
    win.localStorage.removeItem('a')
    expect(posted.at(-1)?.msg.data).toEqual({ b: '2' })
    win.localStorage.clear()
    expect(win.localStorage.length).toBe(0)
    expect(posted.at(-1)?.msg.data).toEqual({})
  })

  it('sessionStorage funciona mas NÃO é espelhado (efêmero por execução)', () => {
    const { win, posted } = runBridge(buildStorageBridgeRuntime())
    win.sessionStorage.setItem('temp', 'x')
    expect(win.sessionStorage.getItem('temp')).toBe('x')
    expect(posted).toHaveLength(0)
  })

  it('clampa o snapshot semeado (chave fora do limite some)', () => {
    const longKey = 'k'.repeat(PREVIEW_STORAGE_MAX_KEY_CHARS + 1)
    const runtime = buildStorageBridgeRuntime({
      localSnapshot: { ok: '1', [longKey]: 'x', '': 'y' } as Record<string, string>,
    })
    const { win } = runBridge(runtime)
    expect(win.localStorage.getItem('ok')).toBe('1')
    expect(win.localStorage.getItem(longKey)).toBeNull()
    expect(win.localStorage.length).toBe(1)
  })

  it('usa targetOrigin do parentOrigin quando informado', () => {
    const { win, posted } = runBridge(
      buildStorageBridgeRuntime({ parentOrigin: 'https://app.exemplo.com' }),
    )
    win.localStorage.setItem('x', '1')
    expect(posted.at(-1)?.origin).toBe('https://app.exemplo.com')
  })

  it('carimba o projectId do doc em cada storageWrite (anti cross-project)', () => {
    const { win, posted } = runBridge(
      buildStorageBridgeRuntime({ projectId: 'proj-42', parentOrigin: 'https://app.exemplo.com' }),
    )
    win.localStorage.setItem('x', '1')
    expect(posted.at(-1)?.msg.projectId).toBe('proj-42')
  })

  it('SEM parentOrigin não espelha o estado salvo ao parent (não vaza para "*")', () => {
    // O store local segue funcional dentro do sandbox, mas sem uma origem
    // conhecida da app o snapshot do aluno NÃO é postado (evita targetOrigin '*').
    const { win, posted } = runBridge(buildStorageBridgeRuntime({ localSnapshot: { fome: '7' } }))
    win.localStorage.setItem('fome', '3')
    expect(win.localStorage.getItem('fome')).toBe('3')
    expect(posted).toHaveLength(0)
  })

  it('preserva uma chave literal "__proto__" no seed e no espelho', () => {
    // Construído via JSON.parse: um literal `{ __proto__: ... }` definiria o
    // protótipo em vez de criar a chave própria.
    const snapshot = JSON.parse('{"__proto__":"pol","ok":"1"}') as Record<string, string>
    const { win, posted } = runBridge(
      buildStorageBridgeRuntime({
        localSnapshot: snapshot,
        parentOrigin: 'https://app.exemplo.com',
      }),
    )
    // Seed: __proto__ é chave PRÓPRIA (não vira protótipo).
    expect(win.localStorage.getItem('__proto__')).toBe('pol')
    expect(win.localStorage.getItem('ok')).toBe('1')
    // Espelho enviado ao parent também carrega __proto__ como chave própria.
    win.localStorage.setItem('ok', '2')
    const mirror = posted.at(-1)?.msg.data ?? {}
    expect(Object.hasOwn(mirror, '__proto__')).toBe(true)
    expect(JSON.stringify(mirror)).toContain('"__proto__":"pol"')
  })
})
