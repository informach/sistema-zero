import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { type CanvasSpy, canvasEl, installCanvasSpy, loadRuntime, startGame } from './kitHarness'

let spy: CanvasSpy & { restore: () => void }

beforeAll(() => {
  spy = installCanvasSpy()
})

afterAll(() => {
  spy.restore()
})

beforeEach(() => {
  document.body.innerHTML = ''
  spy.clear()
})

function setCanvasContentBox(canvas: HTMLElement): void {
  Object.defineProperties(canvas, {
    clientLeft: { configurable: true, value: 40 },
    clientTop: { configurable: true, value: 40 },
    clientWidth: { configurable: true, value: 240 },
    clientHeight: { configurable: true, value: 120 },
  })
  canvas.getBoundingClientRect = () =>
    ({
      left: 100,
      top: 50,
      right: 420,
      bottom: 250,
      width: 320,
      height: 200,
      x: 100,
      y: 50,
      toJSON: () => ({}),
    }) as DOMRect
}

describe('Jogo 2D Avançado — ponteiro robusto no canvas', () => {
  it('desconta a borda CSS ao converter a posição para coordenadas do jogo', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 320, height: 200 })
    h.api.showStageBorder('#ffffff', 40)
    await startGame(h)

    const canvas = canvasEl()
    setCanvasContentBox(canvas)
    let click: number[] | null = null
    h.api.onGameClick((x: number, y: number, screenX: number, screenY: number) => {
      click = [x, y, screenX, screenY]
    })

    canvas.dispatchEvent(new MouseEvent('pointerdown', { clientX: 140, clientY: 90 }))

    expect(click as number[] | null).toEqual([0, 0, 0, 0])
  })

  it('solta o estado pressionado quando o ponteiro termina fora do canvas', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 320, height: 200 })
    await startGame(h)

    canvasEl().dispatchEvent(new MouseEvent('pointerdown', { clientX: 10, clientY: 10 }))
    expect(h.api.mouseDown()).toBe(true)

    h.fire('pointerup')

    expect(h.api.mouseDown()).toBe(false)
  })

  it('impede que gestos nativos do navegador cancelem o toque do jogo', async () => {
    const h = loadRuntime()
    await startGame(h)

    expect(canvasEl().style.touchAction).toBe('none')
  })
})

describe('Jogo 2D Avançado — acessibilidade do palco e das telas', () => {
  it('usa a descrição autoral como nome e descrição do canvas', async () => {
    const h = loadRuntime()
    h.api.setStageDescription('Pegue as moedas. Use as setas para andar.')
    await startGame(h)

    const canvas = canvasEl()
    const descriptionId = canvas.getAttribute('aria-describedby') ?? ''
    expect(canvas.getAttribute('aria-label')).toBe('Pegue as moedas. Use as setas para andar.')
    expect(document.getElementById(descriptionId)?.textContent).toBe(
      'Pegue as moedas. Use as setas para andar.',
    )
  })

  it('abre o menu como diálogo nomeado e leva o foco ao botão principal', async () => {
    const h = loadRuntime()
    await startGame(h)

    const menu = document.querySelector<HTMLElement>('[data-szgk-screen="menu"]')
    const titleId = menu?.getAttribute('aria-labelledby') ?? ''
    expect(menu?.getAttribute('role')).toBe('dialog')
    expect(menu?.getAttribute('aria-modal')).toBe('true')
    expect(menu?.getAttribute('aria-hidden')).toBe('false')
    expect(document.getElementById(titleId)?.textContent).toBe('Meu Jogo')
    expect(document.activeElement?.textContent).toBe('Jogar')
  })

  it('devolve o foco e a árvore acessível ao canvas quando a tela fecha', async () => {
    const h = loadRuntime()
    await startGame(h)

    h.api.setState('jogando')

    const menu = document.querySelector<HTMLElement>('[data-szgk-screen="menu"]')
    expect(menu?.getAttribute('aria-hidden')).toBe('true')
    expect(canvasEl().getAttribute('aria-hidden')).toBe('false')
    expect(document.activeElement).toBe(canvasEl())
  })
})
