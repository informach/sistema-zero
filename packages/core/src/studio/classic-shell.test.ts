import { describe, expect, it } from 'bun:test'
import {
  buildClassicShellPage,
  CLASSIC_SHELL_GAME_SANDBOX,
  CLASSIC_SHELL_LOAD,
  CLASSIC_SHELL_LOADED,
  classicShellHeaders,
  classicShellLoadedSeq,
  classicShellUrlFromEnv,
  isClassicShellReady,
  parseClassicShellParentOrigins,
} from './classic-shell'

/** Roda o script da página da casca com uma janela e um documento falsos. */
function runShell(origins: string[], focus = { has: false }) {
  const page = buildClassicShellPage(origins)
  const script = page.slice(page.indexOf('<script>') + 8, page.lastIndexOf('</script>'))
  const windowListeners = new Map<string, (event: unknown) => void>()
  const frames: { listeners: Map<string, () => void>; removed: boolean; focused: number }[] = []
  const parentMessages: { data: unknown; target: string }[] = []
  const parent = {
    postMessage: (data: unknown, target: string) => parentMessages.push({ data, target }),
  }
  const document = {
    createElement: () => {
      const frame = {
        listeners: new Map<string, () => void>(),
        removed: false,
        setAttribute: () => undefined,
        addEventListener(type: string, listener: () => void) {
          this.listeners.set(type, listener)
        },
        remove() {
          this.removed = true
        },
        focused: 0,
        // O elemento, como a prévia direta: `contentWindow.focus()` o navegador ignora sem gesto.
        focus() {
          this.focused += 1
        },
        blur: () => undefined,
        contentWindow: { postMessage: () => undefined },
        srcdoc: '',
      }
      frames.push(frame)
      return frame
    },
    body: { append: () => undefined },
    hasFocus: () => focus.has,
    activeElement: null,
  }
  const addEventListener = (type: string, listener: (event: unknown) => void) =>
    windowListeners.set(type, listener)
  new Function('parent', 'document', 'addEventListener', script)(parent, document, addEventListener)
  const host = origins[0] as string
  const load = (data: Record<string, unknown>) =>
    windowListeners.get('message')?.({
      source: parent,
      origin: host,
      data: { type: CLASSIC_SHELL_LOAD, ...data },
    })
  return { frames, parentMessages, load, host }
}

describe('casca da prévia do Clássico', () => {
  it('aceita só origens http(s) exatas, sem caminho nem credencial', () => {
    expect(
      parseClassicShellParentOrigins(
        'https://www.sistemazero.com.br, http://localhost:5195  https://a.test/caminho javascript:alert(1) https://u:p@b.test',
      ),
    ).toEqual(['https://www.sistemazero.com.br', 'http://localhost:5195'])
    expect(parseClassicShellParentOrigins(undefined)).toEqual([])
  })

  it('a página usa o mesmo sandbox da prévia direta e nunca allow-same-origin', () => {
    const page = buildClassicShellPage(['https://a.test'])
    expect(page).toContain(JSON.stringify(CLASSIC_SHELL_GAME_SANDBOX))
    expect(page).not.toContain('allow-same-origin')
    expect(page).toContain('"https://a.test"')
    // O script é JavaScript válido (é uma string; o TypeScript não olha dentro).
    const script = page.slice(page.indexOf('<script>') + 8, page.indexOf('</script>'))
    expect(() => new Function(script.replaceAll('\\u003c', '<'))).not.toThrow()
  })

  it('os cabeçalhos só restringem quem embute: um srcdoc herda a CSP da casca', () => {
    const headers = classicShellHeaders(['https://a.test', 'https://b.test'])
    expect(headers['content-security-policy']).toBe('frame-ancestors https://a.test https://b.test')
    expect(headers['cross-origin-embedder-policy']).toBe('credentialless')
    expect(headers['cross-origin-resource-policy']).toBe('cross-origin')
    expect(classicShellHeaders([])['content-security-policy']).toBe("frame-ancestors 'none'")
  })

  it('reconhece o aviso de pronta', () => {
    expect(isClassicShellReady({ type: 'sz-shell:ready' })).toBe(true)
    expect(isClassicShellReady('sz-shell:ready')).toBe(false)
  })
})

describe('classicShellUrlFromEnv: a casca só liga com a chave e um runtime válido', () => {
  const runtime = 'https://runtime-staging.exemplo.test'
  it('liga com a chave e o endereço do runtime, sem barra dupla', () => {
    expect(
      classicShellUrlFromEnv({
        STUDIO_CLASSIC_SHELL_ENABLED: '1',
        STUDIO_PRO_RUNTIME_URL: `${runtime}/`,
      }),
    ).toBe(`${runtime}/v1/classic-shell/1.html`)
  })
  it('sem a chave, sem runtime ou com endereço inseguro, não liga', () => {
    expect(classicShellUrlFromEnv({ STUDIO_PRO_RUNTIME_URL: runtime })).toBeNull()
    expect(
      classicShellUrlFromEnv({
        STUDIO_CLASSIC_SHELL_ENABLED: '0',
        STUDIO_PRO_RUNTIME_URL: runtime,
      }),
    ).toBeNull()
    expect(classicShellUrlFromEnv({ STUDIO_CLASSIC_SHELL_ENABLED: '1' })).toBeNull()
    expect(
      classicShellUrlFromEnv({
        STUDIO_CLASSIC_SHELL_ENABLED: '1',
        STUDIO_PRO_RUNTIME_URL: 'http://runtime.exemplo.test',
      }),
    ).toBeNull()
    expect(
      classicShellUrlFromEnv({ STUDIO_CLASSIC_SHELL_ENABLED: '1', STUDIO_PRO_RUNTIME_URL: 'nada' }),
    ).toBeNull()
  })
  it('o computador local pode usar http', () => {
    expect(
      classicShellUrlFromEnv({
        STUDIO_CLASSIC_SHELL_ENABLED: '1',
        STUDIO_PRO_RUNTIME_URL: 'http://127.0.0.1:8787',
      }),
    ).toBe('http://127.0.0.1:8787/v1/classic-shell/1.html')
  })

  it('o "carregou" devolve o número do documento, e o de um documento trocado não sai', () => {
    // Achado E7 da revisão de 20/11: sem o número, o aviso do documento antigo passava pelo novo.
    const shell = runShell(['https://kids.exemplo.test'])
    shell.load({ document: '<p>um</p>', seq: 7 })
    shell.load({ document: '<p>dois</p>', seq: 8 })
    const [antigo, novo] = shell.frames
    antigo?.listeners.get('load')?.()
    novo?.listeners.get('load')?.()
    const avisos = shell.parentMessages.filter(
      (message) => (message.data as { type?: string }).type === CLASSIC_SHELL_LOADED,
    )
    expect(avisos).toEqual([{ data: { type: CLASSIC_SHELL_LOADED, seq: 8 }, target: shell.host }])
    expect(antigo?.removed).toBe(true)
  })

  it('sem número no pedido (editor antigo), o aviso sai como antes', () => {
    const shell = runShell(['https://kids.exemplo.test'])
    shell.load({ document: '<p>um</p>' })
    shell.frames[0]?.listeners.get('load')?.()
    expect(shell.parentMessages.at(-1)).toEqual({
      data: { type: CLASSIC_SHELL_LOADED },
      target: shell.host,
    })
  })

  it('lê o número do aviso só quando é inteiro', () => {
    expect(classicShellLoadedSeq({ type: CLASSIC_SHELL_LOADED, seq: 3 })).toBe(3)
    expect(classicShellLoadedSeq({ type: CLASSIC_SHELL_LOADED })).toBeNull()
    expect(classicShellLoadedSeq({ type: CLASSIC_SHELL_LOADED, seq: 1.5 })).toBeNull()
    expect(classicShellLoadedSeq({ type: CLASSIC_SHELL_LOADED, seq: '3' })).toBeNull()
    expect(classicShellLoadedSeq({ type: 'outro', seq: 3 })).toBeNull()
  })

  it('com a casca em foco, o jogo novo herda o foco ao carregar (as setas chegam depois de Rodar)', () => {
    // Conferência em staging, 20/11: o editor focava o quadro da casca, a casca trocava o quadro do
    // jogo e as setas iam para a casca vazia.
    const focus = { has: true }
    const shell = runShell(['https://kids.exemplo.test'], focus)
    shell.load({ document: '<p>um</p>', seq: 1 })
    shell.frames[0]?.listeners.get('load')?.()
    expect(shell.frames[0]?.focused).toBe(1)
  })

  it('sem foco na casca (a criança no editor), o jogo novo não rouba o foco', () => {
    const shell = runShell(['https://kids.exemplo.test'], { has: false })
    shell.load({ document: '<p>um</p>', seq: 1 })
    shell.frames[0]?.listeners.get('load')?.()
    expect(shell.frames[0]?.focused).toBe(0)
  })
})
