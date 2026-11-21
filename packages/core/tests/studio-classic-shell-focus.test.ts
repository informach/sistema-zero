import { describe, expect, it } from 'bun:test'
import { buildClassicShellPage } from '../src/studio/classic-shell'

/**
 * O foco do teclado dentro da casca da prévia do Clássico. A página da casca é uma string que roda
 * em outro site; aqui o script dela roda sobre uma janela de mentira que imita o WebKit: soltar o
 * quadro do jogo que tem o foco devolve o foco à casca (o `focus` da janela da casca dispara) e
 * focar o quadro tira o foco da casca (o `blur` dela dispara). Homologação 44833799563 (WebKit do
 * Linux): o jogo registrou o foco centenas de vezes por segundo e a seta apertada não chegou.
 */

const HOST = 'https://studio.test'

function shellScript(): string {
  const page = buildClassicShellPage([HOST])
  const match = /<script>([\s\S]*)<\/script>/.exec(page)
  if (!match?.[1]) throw new Error('A página da casca não tem o script.')
  return match[1]
}

function harness() {
  const listeners = new Map<string, ((event: unknown) => void)[]>()
  const fire = (type: string, event: unknown = {}) => {
    for (const listener of listeners.get(type) ?? []) listener(event)
  }
  const timers: (() => void)[] = []
  /** Onde está o foco do teclado: no editor (fora da casca), na própria casca ou no jogo. */
  let focused: 'editor' | 'casca' | 'jogo' = 'editor'
  let gameFocus = 0
  interface FakeFrame {
    loads: (() => void)[]
    contentWindow: { postMessage(): void }
    srcdoc: string
    setAttribute(): void
    addEventListener(type: string, listener: () => void): void
    remove(): void
    focus(): void
    blur(): void
  }
  const document: {
    activeElement: FakeFrame | null
    body: { append(): void }
    hasFocus(): boolean
    createElement(): FakeFrame
  } = {
    activeElement: null,
    body: { append: () => {} },
    hasFocus: () => focused !== 'editor',
    createElement() {
      const frame: FakeFrame = {
        loads: [],
        contentWindow: { postMessage: () => {} },
        srcdoc: '',
        setAttribute: () => {},
        addEventListener: (type, listener) => {
          if (type === 'load') frame.loads.push(listener)
        },
        remove: () => {
          if (document.activeElement === frame) document.activeElement = null
        },
        focus: () => {
          if (focused === 'jogo' && document.activeElement === frame) return
          const before = focused
          document.activeElement = frame
          focused = 'jogo'
          gameFocus++
          if (before === 'casca') fire('blur')
        },
        blur: () => {
          if (document.activeElement !== frame) return
          document.activeElement = null
          if (focused === 'jogo') {
            focused = 'casca'
            fire('focus')
          }
        },
      }
      return frame
    },
  }
  const frames: FakeFrame[] = []
  const create = document.createElement
  document.createElement = () => {
    const frame = create()
    frames.push(frame)
    return frame
  }
  const parent = { postMessage: () => {} }
  new Function('addEventListener', 'document', 'parent', 'setTimeout', shellScript())(
    (type: string, listener: (event: unknown) => void) =>
      listeners.set(type, [...(listeners.get(type) ?? []), listener]),
    document,
    parent,
    (callback: () => void) => timers.push(callback),
  )
  /** Roda as tarefas agendadas, no máximo `rounds` voltas (o laço reagendaria sem fim). */
  const flush = (rounds = 50) => {
    for (let round = 0; round < rounds && timers.length > 0; round++) {
      const due = timers.splice(0)
      for (const timer of due) timer()
    }
  }
  return {
    fire,
    flush,
    frames,
    pending: () => timers.length,
    gameFocus: () => gameFocus,
    focused: () => focused,
    setFocused: (value: 'editor' | 'casca' | 'jogo') => {
      focused = value
    },
    load(seq: number) {
      fire('message', {
        source: parent,
        origin: HOST,
        data: { type: 'sz-shell:load', document: '<p>jogo</p>', seq },
      })
      for (const listener of frames.at(-1)?.loads ?? []) listener()
    },
  }
}

describe('o foco do teclado na casca da prévia', () => {
  it('o editor foca a casca depois de Rodar: o jogo recebe o foco uma vez só', () => {
    const shell = harness()
    shell.load(1)
    // O editor passa o foco ao quadro da casca quando o jogo carrega.
    shell.setFocused('casca')
    shell.fire('focus')
    shell.flush()
    expect(shell.focused()).toBe('jogo')
    expect(shell.gameFocus()).toBe(1)
    expect(shell.pending()).toBe(0)
  })

  it('o foco que o próprio soltar-e-focar devolve à casca não vira um laço', () => {
    const shell = harness()
    shell.load(1)
    shell.setFocused('casca')
    shell.fire('focus')
    shell.flush()
    // Com o jogo já focado, o WebKit avisa o foco na casca de novo (o editor focou o quadro dela).
    shell.fire('focus')
    shell.flush()
    expect(shell.focused()).toBe('jogo')
    expect(shell.pending()).toBe(0)
    expect(shell.gameFocus()).toBeLessThanOrEqual(2)
  })

  it('o jogo novo herda o foco que o jogo de antes tinha', () => {
    const shell = harness()
    shell.load(1)
    shell.setFocused('casca')
    shell.fire('focus')
    shell.flush()
    expect(shell.focused()).toBe('jogo')
    // Rodar de novo com o foco ainda no jogo: o quadro novo entra no lugar e recebe o foco.
    shell.load(2)
    shell.flush()
    expect(shell.focused()).toBe('jogo')
    expect(shell.pending()).toBe(0)
  })
})
