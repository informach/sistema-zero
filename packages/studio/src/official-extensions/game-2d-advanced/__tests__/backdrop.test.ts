import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { inferBlockContract } from '../../../blockly/blockContracts'
import { gameKitBlocks } from '../blocks'
import { type CanvasSpy, installCanvasSpy, loadRuntime, startPlaying } from './kitHarness'

/**
 * Cenário de fundo no Jogo 2D Avançado: o desenho do Pinta cobrindo a tela.
 *
 * Aqui o cenário é do MOTOR (pintado no `render()`, antes do translate da
 * câmera) e não de um gancho de desenho: se dependesse de a criança lembrar de
 * desenhá-lo primeiro, um bloco fora de ordem apagaria o fundo dela sem
 * explicação. Os números da geometria estão cravados porque "cobrir sem
 * deformar" é uma promessa visual que nenhum tipo protege.
 */

/** Imagem que "carrega" na hora — happy-dom não busca a URL de verdade. */
class FakeImage {
  naturalWidth = 0
  naturalHeight = 0
  width = 0
  height = 0
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  set src(_value: string) {
    this.naturalWidth = FakeImage.nextWidth
    this.naturalHeight = FakeImage.nextHeight
    this.onload?.()
  }
  static nextWidth = 32
  static nextHeight = 24
}

const realImage = globalThis.Image
let spy: CanvasSpy & { restore: () => void }

const ASSETS = { __SZGAME_ASSETS: { cenario: 'data:image/svg+xml;base64,PHN2Zy8+' } }

beforeAll(() => {
  spy = installCanvasSpy()
})

afterAll(() => {
  spy.restore()
})

beforeEach(() => {
  document.body.innerHTML = ''
  spy.clear()
  FakeImage.nextWidth = 32
  FakeImage.nextHeight = 24
  ;(globalThis as { Image: unknown }).Image = FakeImage
})

afterEach(() => {
  ;(globalThis as { Image: unknown }).Image = realImage
})

describe('Jogo 2D Avançado — o cenário cobre a tela sem deformar', () => {
  it('o motor repinta o cenário a cada quadro, sem bloco de desenho nenhum', async () => {
    const h = loadRuntime(ASSETS)
    await startPlaying(h, 800, 480)
    h.api.setBackdrop('cenario')
    spy.clear()
    h.nextFrame(16)

    // 32x24 (4:3) num palco 800x480 (5:3): a escala manda pela largura
    // (800/32 = 25 > 480/24 = 20), o desenho vira 800x600 e sobra 60px de céu
    // e 60px de chão para fora. Estes números SÃO o contrato.
    expect(spy.images).toContainEqual([0, -60, 800, 600])
  })

  it('cenário na mesma proporção da tela encaixa exatinho, sem corte', async () => {
    FakeImage.nextWidth = 960
    FakeImage.nextHeight = 540
    const h = loadRuntime(ASSETS)
    await startPlaying(h, 1280, 720)
    h.api.setBackdrop('cenario')
    spy.clear()
    h.nextFrame(16)

    expect(spy.images).toContainEqual([0, 0, 1280, 720])
  })

  it('o bloco por quadro desenha a MESMA geometria do fixo', async () => {
    const h = loadRuntime(ASSETS)
    await startPlaying(h, 800, 480)
    spy.clear()
    h.api.drawBackdrop('cenario')

    expect(spy.images).toEqual([[0, -60, 800, 600]])
  })

  it('sem cenário, nenhuma imagem entra no quadro', async () => {
    const h = loadRuntime(ASSETS)
    await startPlaying(h, 800, 480)
    spy.clear()
    h.nextFrame(16)

    expect(spy.images).toEqual([])
  })

  it('nome vazio apaga o cenário sem quebrar o quadro', async () => {
    const h = loadRuntime(ASSETS)
    await startPlaying(h, 800, 480)
    h.api.setBackdrop('cenario')
    h.api.setBackdrop('')
    spy.clear()
    h.nextFrame(16)

    expect(spy.images).toEqual([])
  })
})

describe('Jogo 2D Avançado — o fundo chapado tapa o cenário, e o motor avisa', () => {
  it('avisa uma vez quando "Pintar o fundo" cobre o cenário escolhido', async () => {
    const avisos: string[] = []
    const real = console.warn
    console.warn = (...args: unknown[]) => avisos.push(String(args[0]))
    try {
      const h = loadRuntime(ASSETS)
      await startPlaying(h, 800, 480)
      h.api.setBackdrop('cenario')
      h.api.drawBackground('#000000', false)
      h.api.drawBackground('#000000', false)
    } finally {
      console.warn = real
    }

    // Dedupado: sairia de dentro do laço de desenho, 60x por segundo.
    expect(avisos.filter((a) => a.includes('tapando o seu cenário'))).toHaveLength(1)
  })

  it('sem cenário escolhido, "Pintar o fundo" não avisa nada', async () => {
    const avisos: string[] = []
    const real = console.warn
    console.warn = (...args: unknown[]) => avisos.push(String(args[0]))
    try {
      const h = loadRuntime(ASSETS)
      await startPlaying(h, 800, 480)
      h.api.drawBackground('#000000', false)
    } finally {
      console.warn = real
    }

    expect(avisos.filter((a) => a.includes('tapando o seu cenário'))).toEqual([])
  })
})

describe('Jogo 2D Avançado — o encaixe é a trava contra pegar o bloco errado', () => {
  const definition = (type: string) => {
    const found = gameKitBlocks.find((block) => block.type === type)
    if (!found) throw new Error(`bloco ausente: ${type}`)
    return found
  }

  it('o fixo só encaixa em "Ao iniciar"', () => {
    const contract = inferBlockContract(definition('sz_gk_set_backdrop'))
    expect(contract.placement?.root).toEqual(['start'])
    expect(contract.placement?.nested).toEqual([])
  })

  it('o por-quadro NÃO encaixa em "Ao iniciar" — só em corpo de desenho ou laço', () => {
    const contract = inferBlockContract(definition('sz_gk_draw_backdrop'))
    expect(contract.placement?.root).toEqual([])
    expect(contract.placement?.nested).toContain('draw-world')
    expect(contract.placement?.nested).toContain('loop-body')
  })
})
