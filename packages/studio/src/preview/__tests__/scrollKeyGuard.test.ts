import { afterEach, describe, expect, it } from 'bun:test'
import { buildScrollKeyGuardRuntime } from '../scrollKeyGuard'

type Listener = (event: KeyboardEvent) => void

/**
 * Carrega a guarda com um `window` que só guarda o ouvinte (e conta se ele foi registrado na
 * CAPTURA) e o `document` do happy-dom. Devolve um disparador que diz se a tecla foi cancelada.
 */
function load() {
  const listeners: Array<{ fn: Listener; capture: boolean }> = []
  const fakeWindow = {
    addEventListener: (type: string, fn: Listener, capture?: boolean) => {
      if (type === 'keydown') listeners.push({ fn, capture: capture === true })
    },
    getComputedStyle: (el: Element) => window.getComputedStyle(el),
  }
  new Function('window', 'document', buildScrollKeyGuardRuntime())(fakeWindow, document)
  const dispatch = (event: KeyboardEvent, target: Element) => {
    Object.defineProperty(event, 'target', { value: target })
    for (const { fn } of listeners) fn(event)
  }
  const press = (key: string, target: Element = document.body, init: KeyboardEventInit = {}) => {
    const event = new KeyboardEvent('keydown', { key, cancelable: true, bubbles: true, ...init })
    dispatch(event, target)
    return event.defaultPrevented
  }
  return { press, dispatch, listeners }
}

const MEDIDAS = ['scrollHeight', 'clientHeight', 'scrollTop'] as const

/** Faz um elemento "medir" como rolável no eixo vertical (o happy-dom não tem layout). */
function tall(el: Element, scrollTop = 0) {
  Object.defineProperty(el, 'scrollHeight', { configurable: true, value: 900 })
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: 300 })
  Object.defineProperty(el, 'scrollTop', { configurable: true, value: scrollTop })
}

const raiz = () => document.scrollingElement ?? document.documentElement

afterEach(() => {
  document.body.innerHTML = ''
  document.documentElement.removeAttribute('style')
  document.body.removeAttribute('style')
  for (const el of [document.documentElement, document.scrollingElement].filter(Boolean)) {
    for (const medida of MEDIDAS) delete (el as unknown as Record<string, unknown>)[medida]
  }
})

describe('buildScrollKeyGuardRuntime', () => {
  it('é string pura e escuta na CAPTURA, para correr antes de quem pare a propagação', () => {
    const runtime = buildScrollKeyGuardRuntime()
    expect(runtime.startsWith('(function () {')).toBe(true)
    expect(runtime).not.toContain('import ')
    expect(load().listeners.map((l) => l.capture)).toEqual([true])
  })

  it('num jogo que não rola, setas, Espaço, PageDown e Home não sobem para a página de fora', () => {
    const { press } = load()
    const canvas = document.createElement('canvas')
    document.body.append(canvas)
    for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'PageDown', 'Home'])
      expect(press(key, canvas)).toBe(true)
    // A seta num botão do jogo (o "Jogar") também: seta não aperta botão.
    const botao = document.createElement('button')
    document.body.append(botao)
    expect(press('ArrowRight', botao)).toBe(true)
  })

  it('teclas que não rolam e atalhos com Ctrl/Alt/Cmd ficam como estão', () => {
    const { press } = load()
    expect(press('a')).toBe(false)
    expect(press('Enter')).toBe(false)
    expect(press('ArrowDown', document.body, { ctrlKey: true })).toBe(false)
    expect(press('ArrowDown', document.body, { altKey: true })).toBe(false)
  })

  it('campos e controles que usam as teclas continuam recebendo o comportamento padrão', () => {
    const { press } = load()
    document.body.innerHTML =
      '<input id="i"><textarea id="t"></textarea><div id="e" contenteditable="true"><b id="b">x</b></div><div id="s" role="slider"></div><video id="v" controls></video>'
    for (const id of ['i', 't', 'b', 's', 'v']) {
      const el = document.getElementById(id) as Element
      expect(press('ArrowLeft', el)).toBe(false)
      expect(press(' ', el)).toBe(false)
    }
  })

  it('o Espaço num botão ou link continua dando o clique', () => {
    const { press } = load()
    document.body.innerHTML =
      '<button id="b"><span id="dentro">Jogar</span></button><a id="a" href="#x">ir</a>'
    expect(press(' ', document.getElementById('b') as Element)).toBe(false)
    expect(press(' ', document.getElementById('dentro') as Element)).toBe(false)
    expect(press(' ', document.getElementById('a') as Element)).toBe(false)
  })

  it('uma página do aluno mais alta que o iframe rola enquanto há para onde rolar', () => {
    const { press } = load()
    tall(raiz())
    expect(press('ArrowDown')).toBe(false)
    expect(press('PageDown')).toBe(false)
    expect(press(' ')).toBe(false)
    // O eixo conta: a página rola na vertical, mas a seta para o lado não tem o que rolar.
    expect(press('ArrowRight')).toBe(true)
  })

  it('⭐ o SENTIDO conta: no topo, subir não sobe para a aula; no fim, descer também não', () => {
    const { press } = load()
    tall(raiz(), 0)
    expect(press('ArrowUp')).toBe(true)
    expect(press('Home')).toBe(true)
    // Shift+Espaço sobe.
    expect(press(' ', document.body, { shiftKey: true })).toBe(true)
    tall(raiz(), 600)
    expect(press('ArrowDown')).toBe(true)
    expect(press('End')).toBe(true)
    expect(press('ArrowUp')).toBe(false)
    expect(press(' ', document.body, { shiftKey: true })).toBe(false)
  })

  it('⭐ overflow hidden no html ou no body: o jogo não rola, mesmo com o canvas maior que a janela', () => {
    const { press } = load()
    tall(raiz())
    // Anti-vácuo: sem o hidden, a mesma medida deixa rolar.
    expect(press('ArrowDown')).toBe(false)
    document.body.style.overflowY = 'hidden'
    expect(press('ArrowDown')).toBe(true)
    document.body.removeAttribute('style')
    document.documentElement.style.overflowY = 'hidden'
    expect(press('ArrowDown')).toBe(true)
  })

  it('uma caixa rolável em volta do foco continua rolando, no sentido em que ainda dá', () => {
    const { press } = load()
    document.body.innerHTML =
      '<div id="caixa" style="overflow-y: auto"><p id="texto">longo</p></div>'
    const caixa = document.getElementById('caixa') as Element
    const texto = document.getElementById('texto') as Element
    tall(caixa)
    expect(press('ArrowDown', texto)).toBe(false)
    expect(press('ArrowUp', texto)).toBe(true)
    // Uma caixa de overflow hidden não rola pelo teclado.
    ;(caixa as HTMLElement).style.overflowY = 'hidden'
    expect(press('ArrowDown', texto)).toBe(true)
  })

  it('não mexe numa tecla que o jogo já cancelou', () => {
    const { dispatch } = load()
    const event = new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true })
    event.preventDefault()
    let chamadas = 0
    const original = event.preventDefault.bind(event)
    event.preventDefault = () => {
      chamadas += 1
      original()
    }
    dispatch(event, document.body)
    expect(chamadas).toBe(0)
    // Anti-vácuo: a mesma tecla sem cancelar passa pelo espião.
    const viva = new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true })
    let vivas = 0
    const originalViva = viva.preventDefault.bind(viva)
    viva.preventDefault = () => {
      vivas += 1
      originalViva()
    }
    dispatch(viva, document.body)
    expect(vivas).toBe(1)
  })
})
