import { afterEach, describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { defaultProjectControls } from '@sistemazero/studio/controls'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import {
  CtrlBar,
  DPad,
  directionsAtPoint,
  FaceButtons,
  StripButtons,
} from '../src/components/kids/console-controls'

const CRUZ = { left: 0, top: 0, width: 132, height: 132 }
const meio = 66

describe('a cruz aponta para onde o dedo está', () => {
  it('o centro é zona morta: encostar no meio não anda', () => {
    expect(directionsAtPoint(CRUZ, meio, meio)).toEqual([])
  })

  it('cada braço pede a sua direção', () => {
    expect(directionsAtPoint(CRUZ, meio, 4)).toEqual(['up'])
    expect(directionsAtPoint(CRUZ, meio, 128)).toEqual(['down'])
    expect(directionsAtPoint(CRUZ, 4, meio)).toEqual(['left'])
    expect(directionsAtPoint(CRUZ, 128, meio)).toEqual(['right'])
  })

  it('⭐ o CANTO pede as duas: é a diagonal que os jogos já sabem fazer', () => {
    // Com um botão por braço, cada um capturando o ponteiro, o dedo nunca
    // alcançava dois braços — e andar em 4 direções, voo livre e nado normalizam
    // movimento diagonal desde sempre, sem ninguém conseguir usar.
    expect(directionsAtPoint(CRUZ, 8, 8).sort()).toEqual(['left', 'up'])
    expect(directionsAtPoint(CRUZ, 124, 8).sort()).toEqual(['right', 'up'])
    expect(directionsAtPoint(CRUZ, 8, 124).sort()).toEqual(['down', 'left'])
    expect(directionsAtPoint(CRUZ, 124, 124).sort()).toEqual(['down', 'right'])
  })

  it('cruz sem medida ainda não responde (antes do layout)', () => {
    expect(directionsAtPoint({ left: 0, top: 0, width: 0, height: 0 }, 5, 5)).toEqual([])
  })
})

/** Um iframe de verdade, com o postMessage espionado. */
function palcoDeTeste() {
  const iframeRef = createRef<HTMLIFrameElement>()
  const enviadas: Array<{ action: string; key: string; code: string }> = []
  const view = render(<iframe ref={iframeRef} title="Jogo de teste" />)
  const janela = iframeRef.current?.contentWindow
  if (!janela) throw new Error('iframe de teste não montou')
  janela.postMessage = ((msg: unknown) => {
    const d = msg as { type?: string; action?: string; key?: string; code?: string }
    if (d?.type === 'sz:gamepad') {
      enviadas.push({ action: d.action ?? '', key: d.key ?? '', code: d.code ?? '' })
    }
  }) as typeof janela.postMessage
  return { iframeRef, enviadas, view }
}

function preparaCruz(el: HTMLElement) {
  el.getBoundingClientRect = () => ({
    ...CRUZ,
    right: 132,
    bottom: 132,
    x: 0,
    y: 0,
    toJSON: () => '',
  })
  el.setPointerCapture = () => {}
  el.releasePointerCapture = () => {}
  el.hasPointerCapture = () => true
}

describe('a cruz manda as teclas do jogo', () => {
  it('solta a direção do teclado quando o botão perde foco', () => {
    const { iframeRef, enviadas } = palcoDeTeste()
    const controles = defaultProjectControls()
    render(<DPad iframeRef={iframeRef} directions={controles.directions} />)
    const label = controles.directions.up[0]?.label ?? 'up'
    const up = screen.getByRole('button', { name: label })

    fireEvent.keyDown(up, { key: 'Enter' })
    fireEvent.blur(up)

    expect(enviadas).toEqual([
      { action: 'keydown', key: 'ArrowUp', code: 'ArrowUp' },
      { action: 'keyup', key: 'ArrowUp', code: 'ArrowUp' },
    ])
  })

  it('a diagonal manda as DUAS direções, e soltar solta as duas', () => {
    const { iframeRef, enviadas } = palcoDeTeste()
    const controles = defaultProjectControls()
    render(<DPad iframeRef={iframeRef} directions={controles.directions} />)
    const cruz = screen.getByRole('group', { name: 'Direcional' })
    preparaCruz(cruz)

    fireEvent.pointerDown(cruz, { clientX: 124, clientY: 8, pointerId: 1 })
    expect(enviadas).toEqual([
      { action: 'keydown', key: 'ArrowUp', code: 'ArrowUp' },
      { action: 'keydown', key: 'ArrowRight', code: 'ArrowRight' },
    ])

    enviadas.length = 0
    fireEvent.pointerUp(cruz, { clientX: 124, clientY: 8, pointerId: 1 })
    expect(enviadas.map((e) => `${e.action} ${e.key}`).sort()).toEqual([
      'keyup ArrowRight',
      'keyup ArrowUp',
    ])
  })

  it('rolar o dedo de um braço para o outro troca a direção sem levantar', () => {
    const { iframeRef, enviadas } = palcoDeTeste()
    const controles = defaultProjectControls()
    render(<DPad iframeRef={iframeRef} directions={controles.directions} />)
    const cruz = screen.getByRole('group', { name: 'Direcional' })
    preparaCruz(cruz)

    fireEvent.pointerDown(cruz, { clientX: 4, clientY: meio, pointerId: 1 })
    enviadas.length = 0
    fireEvent.pointerMove(cruz, { clientX: 128, clientY: meio, pointerId: 1 })

    // Solta a esquerda e aperta a direita, sem a criança tirar o dedo.
    expect(enviadas).toEqual([
      { action: 'keyup', key: 'ArrowLeft', code: 'ArrowLeft' },
      { action: 'keydown', key: 'ArrowRight', code: 'ArrowRight' },
    ])
  })

  it('quando o jogo lê a tecla A, a cruz manda a seta E a letra', () => {
    const { iframeRef, enviadas } = palcoDeTeste()
    const controles = defaultProjectControls()
    controles.directions.left.push({ label: 'Para a esquerda', key: 'a', code: 'KeyA' })
    render(<DPad iframeRef={iframeRef} directions={controles.directions} />)
    const cruz = screen.getByRole('group', { name: 'Direcional' })
    preparaCruz(cruz)

    fireEvent.pointerDown(cruz, { clientX: 4, clientY: meio, pointerId: 1 })
    expect(enviadas).toEqual([
      { action: 'keydown', key: 'ArrowLeft', code: 'ArrowLeft' },
      // ⚠️ `KeyA`, não `a`: o 3D lê event.code CRU.
      { action: 'keydown', key: 'a', code: 'KeyA' },
    ])
  })
})

describe('o diamante A/B/X/Y', () => {
  it('a face mostra a LETRA e o significado vai no rótulo acessível', () => {
    const { iframeRef } = palcoDeTeste()
    const face = {
      ...defaultProjectControls().face,
      Y: { label: 'Soltar fogo', key: 'f', code: 'KeyF' },
    }
    render(<FaceButtons iframeRef={iframeRef} face={face} />)

    const y = screen.getByRole('button', { name: 'Soltar fogo (Y)' })
    expect(y.textContent).toBe('Y')
    expect(screen.getByRole('button', { name: 'Pular (A)' }).textContent).toBe('A')
  })

  it('casa que o jogo não usa fica desabilitada e fora do Tab', () => {
    const { iframeRef } = palcoDeTeste()
    render(<FaceButtons iframeRef={iframeRef} face={defaultProjectControls().face} />)

    // O padrão traz só A e B; X e Y ficam apagados.
    const apagados = screen
      .getAllByRole('button', { hidden: true })
      .filter((b) => (b as HTMLButtonElement).disabled)
    expect(apagados).toHaveLength(2)
    expect(apagados.every((b) => b.getAttribute('tabindex') === '-1')).toBe(true)
  })

  it('apertar manda a tecla derivada com o code certo', () => {
    const { iframeRef, enviadas } = palcoDeTeste()
    const face = {
      ...defaultProjectControls().face,
      Y: { label: 'Soltar fogo', key: 'f', code: 'KeyF' },
    }
    render(<FaceButtons iframeRef={iframeRef} face={face} />)
    const y = screen.getByRole('button', { name: 'Soltar fogo (Y)' })
    y.setPointerCapture = () => {}
    y.releasePointerCapture = () => {}

    fireEvent.pointerDown(y, { pointerId: 1 })
    fireEvent.pointerUp(y, { pointerId: 1 })
    expect(enviadas).toEqual([
      { action: 'keydown', key: 'f', code: 'KeyF' },
      { action: 'keyup', key: 'f', code: 'KeyF' },
    ])
  })

  it('Enter pelo teclado segura e solta a face', () => {
    const { iframeRef, enviadas } = palcoDeTeste()
    render(<FaceButtons iframeRef={iframeRef} face={defaultProjectControls().face} />)
    const a = screen.getByRole('button', { name: 'Pular (A)' })

    fireEvent.keyDown(a, { key: 'Enter' })
    fireEvent.keyUp(a, { key: 'Enter' })

    expect(enviadas).toEqual([
      { action: 'keydown', key: ' ', code: 'Space' },
      { action: 'keyup', key: ' ', code: 'Space' },
    ])
  })
})

describe('a tira SELECT / START', () => {
  it('Espaço pelo teclado segura e solta START', () => {
    const { iframeRef, enviadas } = palcoDeTeste()
    render(<StripButtons iframeRef={iframeRef} strip={defaultProjectControls().strip} />)
    const start = screen.getByRole('button', { name: 'Começar (START)' })

    fireEvent.keyDown(start, { key: ' ' })
    fireEvent.keyUp(start, { key: ' ' })

    expect(enviadas).toEqual([
      { action: 'keydown', key: 'Enter', code: 'Enter' },
      { action: 'keyup', key: 'Enter', code: 'Enter' },
    ])
  })
})

describe('a seta gravada na cruz precisa CONTRASTAR com a cruz', () => {
  const raizDoPacote = new URL('..', import.meta.url)
  const css = readFileSync(new URL('src/app/globals.css', raizDoPacote), 'utf8')
  const componente = readFileSync(
    new URL('src/components/kids/console-controls.tsx', raizDoPacote),
    'utf8',
  )

  it('a seta usa a tinta da CRUZ, não a tinta de texto', () => {
    // ⚠️ Com `--snes-ink` (que é escuro no tema claro, porque serve a texto sobre
    // o corpo claro) a seta ficava escura sobre um braço escuro: contraste medido
    // em ~1,2:1, ou seja, invisível. Relato dela.
    expect(componente).toContain('fill={C.crossInk}')
    expect(componente).not.toContain('fill={C.ink}')
  })

  it('a tinta da cruz é definida nos DOIS temas, e com valores diferentes', () => {
    const valores = [...css.matchAll(/--snes-cross-ink:\s*([^;]+);/g)].map((m) => m[1]?.trim())
    // Um valor só significa que um dos temas herdou o do outro — e a cruz troca de
    // claridade entre eles, então a tinta tem de trocar junto.
    expect(valores).toHaveLength(2)
    expect(valores[0]).not.toBe(valores[1])
  })
})

describe('a cruz atende UM dedo por vez', () => {
  it('um segundo toque não solta a direção que o primeiro dedo segura', () => {
    const { iframeRef, enviadas } = palcoDeTeste()
    render(<DPad iframeRef={iframeRef} directions={defaultProjectControls().directions} />)
    const cruz = screen.getByRole('group', { name: 'Direcional' })
    preparaCruz(cruz)

    fireEvent.pointerDown(cruz, { clientX: 4, clientY: meio, pointerId: 1 })
    enviadas.length = 0

    // O polegar da outra mão raspa no console e sai.
    fireEvent.pointerDown(cruz, { clientX: meio, clientY: meio, pointerId: 2 })
    fireEvent.pointerUp(cruz, { clientX: meio, clientY: meio, pointerId: 2 })

    // ⚠️ Sem a trava de ponteiro isto soltava a esquerda e a criança parava de
    // andar com o dedo ainda apertado. Antes cada braço era um botão com captura
    // própria, então era regressão.
    expect(enviadas).toEqual([])

    // E o primeiro dedo continua mandando: soltar ELE é que encerra.
    fireEvent.pointerUp(cruz, { clientX: 4, clientY: meio, pointerId: 1 })
    expect(enviadas).toEqual([{ action: 'keyup', key: 'ArrowLeft', code: 'ArrowLeft' }])
  })
})

describe('o botão de tela cheia vira botão de VOLTAR', () => {
  function fingirTelaCheia(elemento: Element | null) {
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: elemento })
    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'))
    })
  }

  afterEach(() => {
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null })
  })

  it('troca de rótulo e de ícone conforme o navegador entra e sai', () => {
    const { iframeRef } = palcoDeTeste()
    const alvo = createRef<HTMLDivElement>()
    render(
      <>
        <div ref={alvo} />
        <CtrlBar iframeRef={iframeRef} fullscreenTargetRef={alvo} onRestart={() => {}} />
      </>,
    )

    expect(screen.getByRole('button', { name: 'Tela cheia' })).toBeTruthy()

    fingirTelaCheia(document.createElement('div'))
    expect(screen.getByRole('button', { name: 'Sair da tela cheia' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Tela cheia' })).toBeNull()
  })

  it('⚠️ volta a dizer "Tela cheia" quando o navegador sai SOZINHO', () => {
    const { iframeRef } = palcoDeTeste()
    const alvo = createRef<HTMLDivElement>()
    render(
      <>
        <div ref={alvo} />
        <CtrlBar iframeRef={iframeRef} fullscreenTargetRef={alvo} onRestart={() => {}} />
      </>,
    )

    fingirTelaCheia(document.createElement('div'))
    expect(screen.getByRole('button', { name: 'Sair da tela cheia' })).toBeTruthy()

    // A criança aperta Esc, usa o gesto do sistema ou o voltar do Android: ninguém
    // avisa o botão. É a metade que reprova a versão que guarda o estado no clique.
    fingirTelaCheia(null)
    expect(screen.getByRole('button', { name: 'Tela cheia' })).toBeTruthy()
  })

  it('o botão não é remontado ao trocar de rótulo, senão o foco se perde', () => {
    const { iframeRef } = palcoDeTeste()
    const alvo = createRef<HTMLDivElement>()
    render(
      <>
        <div ref={alvo} />
        <CtrlBar iframeRef={iframeRef} fullscreenTargetRef={alvo} onRestart={() => {}} />
      </>,
    )
    const antes = screen.getByRole('button', { name: 'Tela cheia' })

    fingirTelaCheia(document.createElement('div'))

    // Mesmo ELEMENTO: com a `key` saindo do rótulo, o React trocava o botão e
    // quem clicou pelo teclado ficava sem foco no ato.
    expect(screen.getByRole('button', { name: 'Sair da tela cheia' })).toBe(antes)
  })

  it('já nasce dizendo "Sair" quando a tela cheia começou ANTES de ele montar', () => {
    // Acontece de verdade: a criança entra em tela cheia pelo cabeçalho (modo sem
    // console) e depois MOSTRA os controles — a barra monta com a tela já cheia.
    // Sem a leitura inicial, ela nasceria oferecendo "Tela cheia" de novo.
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: document.createElement('div'),
    })
    const { iframeRef } = palcoDeTeste()
    const alvo = createRef<HTMLDivElement>()
    render(
      <>
        <div ref={alvo} />
        <CtrlBar iframeRef={iframeRef} fullscreenTargetRef={alvo} onRestart={() => {}} />
      </>,
    )

    expect(screen.getByRole('button', { name: 'Sair da tela cheia' })).toBeTruthy()
  })
})
