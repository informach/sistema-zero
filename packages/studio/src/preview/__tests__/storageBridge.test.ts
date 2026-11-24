import { describe, expect, it } from 'bun:test'
import { buildStorageBridgeRuntime } from '../storageBridge'
import {
  PREVIEW_STORAGE_MAX_KEY_CHARS,
  PREVIEW_STORAGE_MAX_KEYS,
  PREVIEW_STORAGE_MAX_TOTAL_CHARS,
  PREVIEW_STORAGE_MAX_VALUE_CHARS,
  sanitizePreviewStorageData,
} from '../types'

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

type FakeWindow = { localStorage: Storage; sessionStorage: Storage; name: string }

/**
 * Executa o IIFE do bridge num `window`/`parent` falsos (params sombreiam os
 * globais) e devolve o window resultante + as mensagens postadas ao parent.
 * `initialName` semeia `window.name` (canal de reload); começa vazio por padrão.
 */
function runBridge(
  runtime: string,
  initialName = '',
): {
  win: FakeWindow
  posted: CapturedMessage[]
} {
  const posted: CapturedMessage[] = []
  const win = { name: initialName } as FakeWindow
  const parent = {
    postMessage: (msg: CapturedMessage['msg'], origin: string) => posted.push({ msg, origin }),
  }
  // eslint-disable-next-line no-new-func
  new Function('window', 'parent', runtime)(win, parent)
  return { win, posted }
}

/** Monta o envelope que o bridge grava em `window.name` (namespaced por projeto). */
function nameEnvelope(projectId: string, data: Record<string, string>): string {
  return JSON.stringify({ __szStorage: { p: projectId, d: data } })
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

  it('os literais de limite inlinados espelham types.ts (MAX_KEYS/MAX_TOTAL_CHARS)', () => {
    const runtime = buildStorageBridgeRuntime()
    expect(runtime).toContain(`var MAX_KEYS = ${PREVIEW_STORAGE_MAX_KEYS};`)
    expect(runtime).toContain(`var MAX_TOTAL_CHARS = ${PREVIEW_STORAGE_MAX_TOTAL_CHARS};`)
  })

  it('setItem lança QuotaExceededError ao estourar a quantidade de chaves', () => {
    const { win } = runBridge(buildStorageBridgeRuntime())
    for (let i = 0; i < PREVIEW_STORAGE_MAX_KEYS; i++) win.localStorage.setItem(`k${i}`, '')
    expect(win.localStorage.length).toBe(PREVIEW_STORAGE_MAX_KEYS)
    let thrown: unknown
    try {
      win.localStorage.setItem('overflow', 'x')
    } catch (e) {
      thrown = e
    }
    expect((thrown as { name?: string })?.name).toBe('QuotaExceededError')
    // A chave que estourou NÃO entrou (estado preservado).
    expect(win.localStorage.getItem('overflow')).toBeNull()
    expect(win.localStorage.length).toBe(PREVIEW_STORAGE_MAX_KEYS)
  })

  it('substituir uma chave existente NÃO conta como chave nova (não estoura por contagem)', () => {
    const { win } = runBridge(buildStorageBridgeRuntime())
    for (let i = 0; i < PREVIEW_STORAGE_MAX_KEYS; i++) win.localStorage.setItem(`k${i}`, '')
    // Reescrever uma chave já presente é permitido mesmo no limite de contagem.
    expect(() => win.localStorage.setItem('k0', 'novo')).not.toThrow()
    expect(win.localStorage.getItem('k0')).toBe('novo')
  })

  // Enche o total com valores no limite de cada um: nove chaves de 100 mil (900.018 caracteres).
  const encherQuaseTudo = (storage: Storage) => {
    for (let i = 0; i < 9; i++)
      storage.setItem(`k${i}`, 'a'.repeat(PREVIEW_STORAGE_MAX_VALUE_CHARS))
    return PREVIEW_STORAGE_MAX_TOTAL_CHARS - 9 * (2 + PREVIEW_STORAGE_MAX_VALUE_CHARS)
  }

  it('setItem lança QuotaExceededError ao estourar o total de caracteres', () => {
    const { win } = runBridge(buildStorageBridgeRuntime())
    const sobra = encherQuaseTudo(win.localStorage)
    let thrown: unknown
    try {
      win.localStorage.setItem('k9', 'a'.repeat(sobra - 2 + 1))
    } catch (e) {
      thrown = e
    }
    expect((thrown as { name?: string })?.name).toBe('QuotaExceededError')
    expect((thrown as { message?: string })?.message).toBe('Cota do armazenamento excedida.')
    expect(win.localStorage.getItem('k9')).toBeNull()
  })

  it('o cap de total desconta o valor antigo ao substituir (troca por valor menor cabe)', () => {
    const { win } = runBridge(buildStorageBridgeRuntime())
    const sobra = encherQuaseTudo(win.localStorage)
    win.localStorage.setItem('k9', 'a'.repeat(sobra - 2 - 10))
    // Substituir por algo do mesmo tamanho só cabe porque o valor antigo sai da conta.
    expect(() =>
      win.localStorage.setItem('k0', 'b'.repeat(PREVIEW_STORAGE_MAX_VALUE_CHARS)),
    ).not.toThrow()
    expect(() => win.localStorage.setItem('k9', 'pequeno')).not.toThrow()
    expect(win.localStorage.getItem('k9')).toBe('pequeno')
  })

  it('valor acima do limite é recusado na hora, com a frase, em vez de ser cortado ao guardar', () => {
    const { win, posted } = runBridge(
      buildStorageBridgeRuntime({ parentOrigin: 'https://app.test' }),
    )
    let thrown: unknown
    try {
      win.localStorage.setItem('jogo', 'a'.repeat(PREVIEW_STORAGE_MAX_VALUE_CHARS + 1))
    } catch (e) {
      thrown = e
    }
    expect((thrown as { name?: string })?.name).toBe('QuotaExceededError')
    expect((thrown as { message?: string })?.message).toBe(
      'Isso é grande demais para guardar de uma vez (até 100.000 caracteres).',
    )
    expect(win.localStorage.getItem('jogo')).toBeNull()
    expect(posted).toHaveLength(0)
  })

  it('nome de chave acima do limite é recusado na hora, com a frase', () => {
    const { win } = runBridge(buildStorageBridgeRuntime())
    let thrown: unknown
    try {
      win.localStorage.setItem('n'.repeat(PREVIEW_STORAGE_MAX_KEY_CHARS + 1), 'x')
    } catch (e) {
      thrown = e
    }
    expect((thrown as { message?: string })?.message).toBe(
      'Esse nome é grande demais para guardar (até 256 letras).',
    )
    expect(win.localStorage.length).toBe(0)
  })

  it('o que a ponte aceita volta igual depois de guardado (nada é cortado)', () => {
    const { win } = runBridge(buildStorageBridgeRuntime())
    const nome = 'n'.repeat(PREVIEW_STORAGE_MAX_KEY_CHARS)
    const valor = 'v'.repeat(PREVIEW_STORAGE_MAX_VALUE_CHARS)
    win.localStorage.setItem(nome, valor)
    expect(sanitizePreviewStorageData({ [nome]: win.localStorage.getItem(nome) })[nome]).toBe(valor)
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

  // --- Canal de reload (window.name): sobrevive a location.reload() interno ---

  it('espelha o store local em window.name (namespaced por projectId)', () => {
    const { win } = runBridge(
      buildStorageBridgeRuntime({ projectId: 'proj-42', parentOrigin: 'https://app.exemplo.com' }),
    )
    win.localStorage.setItem('recorde', '150')
    expect(win.name).toBe(nameEnvelope('proj-42', { recorde: '150' }))
  })

  it('no boot PREFERE window.name ao SEED quando o projeto bate (simula reload)', () => {
    // Simula um location.reload(): o srcdoc reabre com o SEED estático do build
    // ({recorde:'0'}), mas window.name guarda a gravação fresca da sessão.
    const { win } = runBridge(
      buildStorageBridgeRuntime({ projectId: 'proj-42', localSnapshot: { recorde: '0' } }),
      nameEnvelope('proj-42', { recorde: '150' }),
    )
    expect(win.localStorage.getItem('recorde')).toBe('150')
  })

  it('ignora window.name de OUTRO projeto e cai no SEED (anti cross-project)', () => {
    const { win } = runBridge(
      buildStorageBridgeRuntime({ projectId: 'proj-NOVO', localSnapshot: { recorde: '0' } }),
      nameEnvelope('proj-ANTIGO', { recorde: '999' }),
    )
    expect(win.localStorage.getItem('recorde')).toBe('0')
  })

  it('window.name corrompido/estranho é ignorado (cai no SEED, sem quebrar)', () => {
    const { win } = runBridge(
      buildStorageBridgeRuntime({ projectId: 'proj-42', localSnapshot: { recorde: '0' } }),
      'não é json {{{',
    )
    expect(win.localStorage.getItem('recorde')).toBe('0')
  })

  it('SEM projectId (player público) NÃO lê nem escreve window.name', () => {
    // O envelope existente NÃO é usado como seed...
    const { win } = runBridge(
      buildStorageBridgeRuntime({ localSnapshot: { recorde: '0' } }),
      nameEnvelope('proj-42', { recorde: '150' }),
    )
    expect(win.localStorage.getItem('recorde')).toBe('0')
    // ...e uma mutação NÃO reescreve window.name (fica intacto).
    const before = win.name
    win.localStorage.setItem('recorde', '5')
    expect(win.name).toBe(before)
  })

  it('removeItem e clear atualizam window.name (store reduzido/vazio)', () => {
    const { win } = runBridge(
      buildStorageBridgeRuntime({ projectId: 'proj-42', localSnapshot: { a: '1', b: '2' } }),
    )
    win.localStorage.removeItem('a')
    expect(win.name).toBe(nameEnvelope('proj-42', { b: '2' }))
    win.localStorage.clear()
    expect(win.name).toBe(nameEnvelope('proj-42', {}))
  })

  it('espelha em window.name mesmo SEM parentOrigin (independe do mirror do parent)', () => {
    const { win, posted } = runBridge(
      buildStorageBridgeRuntime({ projectId: 'proj-42', localSnapshot: { recorde: '0' } }),
    )
    win.localStorage.setItem('recorde', '9')
    // Sem parentOrigin: nada postado ao parent, mas window.name atualiza.
    expect(posted).toHaveLength(0)
    expect(win.name).toBe(nameEnvelope('proj-42', { recorde: '9' }))
  })
})
