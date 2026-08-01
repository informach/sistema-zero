import { afterEach, describe, expect, it } from 'bun:test'
import { compileStatements } from '#generators'
import type { JSStatement } from '#ir'
import { parseJS } from '../../../parsers/js'
import { gameTwoDRuntime } from '../runtime'

/**
 * "Mostrar a borda da tela" (v0.54.0): moldura em volta do palco para ENSINAR
 * onde começa e termina a área do jogo.
 *
 * A borda vai no ELEMENTO (CSS), não no desenho — por isso o que se testa aqui é
 * o estilo aplicado no canvas, não pixels. O `box-sizing` é parte do contrato:
 * sem ele a moldura empurraria o layout (barra de rolagem) e, em tela cheia,
 * ficaria fora da janela.
 */

interface Api {
  showStageBorder: (color: string, width: number) => void
}

function load(): Api {
  const win = {
    addEventListener() {},
    SZGame2D: undefined,
    performance: { now: () => 0 },
    requestAnimationFrame: () => 0,
  } as unknown as Record<string, unknown>
  new Function('window', 'requestAnimationFrame', gameTwoDRuntime)(win, () => 0)
  return win.SZGame2D as Api
}

/** Canvas de verdade no documento (o runtime acha por querySelector). */
function withCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 240
  document.body.appendChild(canvas)
  return canvas
}

afterEach(() => {
  for (const c of [...document.querySelectorAll('canvas')]) c.remove()
})

describe('Mostrar a borda da tela', () => {
  it('aplica a moldura no canvas, por dentro da caixa (sem empurrar o layout)', () => {
    const canvas = withCanvas()
    load().showStageBorder('#e2e8f0', 4)
    expect(canvas.style.border).toBe('4px solid #e2e8f0')
    expect(canvas.style.boxSizing).toBe('border-box')
  })

  it('capa a espessura: um número enorme não engole o jogo', () => {
    const canvas = withCanvas()
    load().showStageBorder('#ff0000', 9999)
    expect(canvas.style.border).toBe('40px solid #ff0000')
  })

  it('espessura inválida cai no padrão de 4px', () => {
    const canvas = withCanvas()
    const api = load()
    api.showStageBorder('#ff0000', 0)
    expect(canvas.style.border).toBe('4px solid #ff0000')
    api.showStageBorder('#ff0000', Number.NaN)
    expect(canvas.style.border).toBe('4px solid #ff0000')
  })

  it('sem canvas nenhum não quebra o jogo', () => {
    expect(() => load().showStageBorder('#e2e8f0', 4)).not.toThrow()
  })

  it('ida e volta pelo código (gerador e Ponte)', () => {
    const ir: JSStatement = {
      type: 'g2d:stageBorder',
      color: '#e2e8f0',
      width: { type: 'num', value: 4 },
    } as JSStatement
    const code = compileStatements([ir], 0)
    expect(code).toBe('SZGame2D.showStageBorder("#e2e8f0", 4);')
    expect(parseJS(code)[0]).toMatchObject({
      type: 'g2d:stageBorder',
      color: '#e2e8f0',
      width: { type: 'num', value: 4 },
    })
  })
})
