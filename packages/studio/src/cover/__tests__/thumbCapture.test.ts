import { afterEach, describe, expect, it } from 'bun:test'
import { downscaleToThumb } from '../thumbCapture'

/**
 * A redução do print para a miniatura do card.
 *
 * ⚠️ O JPEG do fim NÃO tem canal alfa: sem um fundo opaco antes do desenho, toda
 * área transparente do print vira PRETO. Foi assim que a capa de um jogo de fundo
 * laranja saiu preta — o fundo do palco é CSS, então o canvas cru vem transparente.
 *
 * happy-dom não tem canvas (`getContext` devolve null), então trocamos o
 * `createElement` e o `Image` por dublês que gravam a ordem das chamadas.
 */

const criarOriginal = document.createElement.bind(document)
const ImageOriginal = globalThis.Image

afterEach(() => {
  document.createElement = criarOriginal as typeof document.createElement
  globalThis.Image = ImageOriginal
})

/** Instala os dublês e devolve o diário do que o código pediu ao canvas. */
function instalarCanvasFalso(): { ordem: string[]; tipos: unknown[] } {
  const ordem: string[] = []
  const tipos: unknown[] = []
  let fill = ''
  const ctx = {
    set fillStyle(v: string) {
      fill = v
    },
    get fillStyle() {
      return fill
    },
    fillRect(_x: number, _y: number, w: number, h: number) {
      ordem.push(`fillRect ${fill} ${w}x${h}`)
    },
    drawImage() {
      ordem.push('drawImage')
    },
  }
  document.createElement = ((tag: string) =>
    tag === 'canvas'
      ? {
          width: 0,
          height: 0,
          getContext: () => ctx,
          toDataURL: (tipo?: string, q?: number) => {
            tipos.push([tipo, q])
            return 'data:image/jpeg;base64,AAAA'
          },
        }
      : criarOriginal(tag)) as unknown as typeof document.createElement

  class ImagemFalsa {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    width = 800
    height = 480
    set src(_v: string) {
      queueMicrotask(() => this.onload?.())
    }
  }
  globalThis.Image = ImagemFalsa as unknown as typeof Image
  return { ordem, tipos }
}

describe('miniatura do card', () => {
  it('⭐ pinta um fundo OPACO antes de desenhar (senão o JPEG achata para preto)', async () => {
    const { ordem } = instalarCanvasFalso()
    await downscaleToThumb('data:image/png;base64,AAAA')

    // A ordem é o teste: fundo primeiro, print por cima.
    expect(ordem).toEqual(['fillRect #ffffff 320x192', 'drawImage'])
  })

  it('o fundo cobre a miniatura INTEIRA, não só onde o print cai', async () => {
    // Print de proporção diferente deixaria faixas descobertas — que virariam
    // preto exatamente como o resto.
    const { ordem } = instalarCanvasFalso()
    await downscaleToThumb('data:image/png;base64,AAAA')
    expect(ordem[0]).toContain('320x192')
  })

  it('continua exportando JPEG (é o formato do card, não uma regressão a corrigir)', async () => {
    const { tipos } = instalarCanvasFalso()
    await downscaleToThumb('data:image/png;base64,AAAA')
    expect(tipos[0]).toEqual(['image/jpeg', 0.75])
  })
})
