import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { inferBlockContract } from '../../../blockly/blockContracts'
import { gameTwoDBlocks } from '../blocks'
import { gameTwoDRuntime } from '../runtime'

/**
 * Cenário de fundo: o desenho que a criança fez no Pinta virando o fundo do
 * jogo (dois blocos, o fixo e o por-quadro).
 *
 * A geometria está cravada em NÚMEROS porque "cobrir sem deformar" é uma
 * promessa visual: uma regressão que troque cobrir por esticar não quebra nada
 * em tipo nem em runtime, só deixa o boneco dela achatado. E os dois blocos
 * compartilham a MESMA função — o teste prova isso comparando as chamadas, não
 * lendo o código.
 */

interface Ctx {
  calls: string[]
  canvas: { width: number; height: number }
  imageSmoothingEnabled: boolean
  drawImage: (...args: unknown[]) => void
}

interface Api {
  setBackdrop: (name: string) => void
  drawBackdrop: (ctx: unknown, name: string) => void
  clear: () => void
}

/**
 * Imagem de mentira — happy-dom não busca a URL de verdade.
 *
 * ⚠️ Duas fidelidades que parecem detalhe e não são:
 *
 * 1. O load é ASSÍNCRONO. Um fake que dispara `onload` dentro do `set src` prova
 *    só o caminho "a imagem já estava em cache" e esconde o caso comum, que é a
 *    imagem chegar depois do "Ao iniciar". Use `aImagemChegar()`.
 * 2. Os ouvintes disparam na ORDEM DE REGISTRO, com o `onload` ocupando a vaga
 *    de quando foi definido pela PRIMEIRA vez (é o que a spec manda). O runtime
 *    depende disso: o `loadImage` define `onload` (que marca `loaded = true`) e
 *    o `setBackdrop` acrescenta o dele DEPOIS, contando com essa ordem para
 *    achar a imagem já pronta. Um fake que enfileira por tipo passaria verde com
 *    o runtime reordenado — e o cenário sumiria em produção.
 */
class FakeImage {
  naturalWidth = 0
  naturalHeight = 0
  width = 0
  height = 0
  onerror: (() => void) | null = null
  private aoCarregar: (() => void) | null = null
  private fila: Array<() => void> = []

  get onload(): (() => void) | null {
    return this.aoCarregar
  }
  set onload(fn: (() => void) | null) {
    // A vaga na fila é a do PRIMEIRO valor não-nulo; trocar depois só troca o
    // corpo, não a posição.
    if (this.aoCarregar === null && fn) this.fila.push(() => this.aoCarregar?.())
    this.aoCarregar = fn
  }
  addEventListener(tipo: string, ouvinte: () => void) {
    if (tipo === 'load') this.fila.push(ouvinte)
  }
  set src(_value: string) {
    const largura = FakeImage.nextWidth
    const altura = FakeImage.nextHeight
    FakeImage.pendentes.push(() => {
      this.naturalWidth = largura
      this.naturalHeight = altura
      for (const ouvinte of this.fila) ouvinte()
    })
  }
  static nextWidth = 32
  static nextHeight = 24
  static pendentes: Array<() => void> = []
}

/** Entrega as imagens pendentes, na ordem, como o navegador faria. */
async function aImagemChegar(): Promise<void> {
  for (const carga of FakeImage.pendentes.splice(0)) carga()
  await Promise.resolve()
}

const realImage = globalThis.Image

beforeEach(() => {
  FakeImage.nextWidth = 32
  FakeImage.nextHeight = 24
  FakeImage.pendentes = []
  ;(globalThis as { Image: unknown }).Image = FakeImage
})

afterEach(() => {
  ;(globalThis as { Image: unknown }).Image = realImage
  for (const canvas of [...document.querySelectorAll('canvas')]) canvas.remove()
})

function load(): Api {
  const win = {
    addEventListener() {},
    SZGame2D: undefined,
    performance: { now: () => 0 },
    devicePixelRatio: 1,
    // O manifesto que o assetsBridge semeia no preview: o nome do bloco vira URL.
    __SZGAME_ASSETS: { cenario: 'data:image/svg+xml;base64,PHN2Zy8+' },
  } as unknown as Record<string, unknown>
  new Function('window', 'requestAnimationFrame', gameTwoDRuntime)(win, () => 0)
  return win.SZGame2D as Api
}

function fakeCtx(width = 800, height = 480): Ctx {
  const calls: string[] = []
  return {
    calls,
    canvas: { width, height },
    imageSmoothingEnabled: true,
    drawImage: (_img: unknown, x: unknown, y: unknown, w: unknown, h: unknown) =>
      calls.push(`drawImage ${x} ${y} ${w} ${h}`),
  } as unknown as Ctx
}

/** Canvas de verdade: o `clear()` acha o palco por querySelector. */
function withStageCanvas(width = 800, height = 480): Ctx {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = fakeCtx(width, height)
  ;(ctx as unknown as { canvas: unknown }).canvas = canvas
  Object.assign(ctx, {
    clearRect: () => ctx.calls.push('clearRect'),
    setTransform: () => {},
  })
  ;(canvas as unknown as { getContext: () => Ctx }).getContext = () => ctx
  document.body.appendChild(canvas)
  return ctx
}

const imagens = (ctx: Ctx) => ctx.calls.filter((call) => call.startsWith('drawImage'))

describe('cenário de fundo: a geometria de cobrir', () => {
  it('cobre a tela sem deformar, centralizado, cortando o excedente', async () => {
    // 32x24 (4:3) num palco 800x480 (5:3): a escala manda pela largura
    // (800/32 = 25 > 480/24 = 20), o desenho vira 800x600 e sobra 60px de céu
    // e 60px de chão para fora. Estes números SÃO o contrato.
    const api = load()
    const ctx = fakeCtx(800, 480)
    api.drawBackdrop(ctx, 'cenario')
    await aImagemChegar()
    api.drawBackdrop(ctx, 'cenario')
    expect(imagens(ctx)).toEqual(['drawImage 0 -60 800 600'])
  })

  it('cenário na mesma proporção da tela encaixa exatinho, sem corte', async () => {
    FakeImage.nextWidth = 960
    FakeImage.nextHeight = 540
    const api = load()
    const ctx = fakeCtx(1280, 720)
    api.drawBackdrop(ctx, 'cenario')
    await aImagemChegar()
    api.drawBackdrop(ctx, 'cenario')
    expect(imagens(ctx)).toEqual(['drawImage 0 0 1280 720'])
  })

  it('corta nas laterais quando o cenário é mais largo que a tela', async () => {
    FakeImage.nextWidth = 64
    FakeImage.nextHeight = 24
    const api = load()
    const ctx = fakeCtx(320, 240)
    // 320/64 = 5, 240/24 = 10 → escala 10 → 640x240, sobra 160px de cada lado.
    api.drawBackdrop(ctx, 'cenario')
    await aImagemChegar()
    api.drawBackdrop(ctx, 'cenario')
    expect(imagens(ctx)).toEqual(['drawImage -160 0 640 240'])
  })

  it('o bloco fixo e o por-quadro produzem a MESMA geometria', async () => {
    const api = load()
    const stage = withStageCanvas(800, 480)
    api.setBackdrop('cenario')
    await aImagemChegar()
    const doFixo = imagens(stage)

    const porQuadro = fakeCtx(800, 480)
    api.drawBackdrop(porQuadro, 'cenario')

    expect(doFixo).toEqual(imagens(porQuadro))
  })
})

describe('cenário de fundo: o que acontece sem cenário', () => {
  it('sem cenário, o clear() não desenha imagem nenhuma', () => {
    const api = load()
    const stage = withStageCanvas()
    api.clear()
    expect(imagens(stage)).toEqual([])
  })

  it('depois de fixar, cada clear() repinta o cenário sozinho', async () => {
    const api = load()
    const stage = withStageCanvas(800, 480)
    api.setBackdrop('cenario')
    await aImagemChegar()
    stage.calls.length = 0
    api.clear()
    api.clear()
    expect(imagens(stage)).toEqual(['drawImage 0 -60 800 600', 'drawImage 0 -60 800 600'])
  })

  it('nome vazio apaga o cenário sem quebrar o quadro', async () => {
    const api = load()
    const stage = withStageCanvas(800, 480)
    api.setBackdrop('cenario')
    await aImagemChegar()
    api.setBackdrop('')
    stage.calls.length = 0
    api.clear()
    expect(imagens(stage)).toEqual([])
  })
})

describe('cenário de fundo: o jogo que ainda não tem laço', () => {
  it('a imagem chega DEPOIS do "Ao iniciar", e mesmo sem laço o cenário aparece', async () => {
    // A criança arrasta só "Pôr o cenário atrás de tudo" e roda. Sem 🔁 não há
    // clear() nenhum para repintar, e a imagem SEMPRE chega depois (o load é
    // assíncrono) — sem alguém esperando por ela, a tela fica em branco e o
    // bloco parece quebrado logo no primeiro uso.
    const api = load()
    const stage = withStageCanvas(800, 480)
    api.setBackdrop('cenario')
    expect(imagens(stage)).toEqual([]) // ainda carregando: não há o que pintar

    await aImagemChegar()
    expect(imagens(stage)).toEqual(['drawImage 0 -60 800 600'])
  })

  it('trocar de cenário antes de a imagem chegar não deixa a antiga pintar por cima', async () => {
    const api = load()
    const stage = withStageCanvas(800, 480)
    api.setBackdrop('cenario')
    api.setBackdrop('')
    await aImagemChegar()

    expect(imagens(stage)).toEqual([])
  })
})

describe('cenário de fundo: o encaixe é a trava contra pegar o bloco errado', () => {
  const definition = (type: string) => {
    const found = gameTwoDBlocks.find((block) => block.type === type)
    if (!found) throw new Error(`bloco ausente: ${type}`)
    return found
  }

  it('o fixo só encaixa em "Ao iniciar"', () => {
    const contract = inferBlockContract(definition('sz_g2d_set_backdrop'))
    expect(contract.placement?.root).toEqual(['start'])
    expect(contract.placement?.nested).toEqual([])
  })

  it('o por-quadro NÃO encaixa em "Ao iniciar" — só em laço, função ou método', () => {
    const contract = inferBlockContract(definition('sz_g2d_draw_backdrop'))
    expect(contract.placement?.root).toEqual([])
    expect(contract.placement?.nested).toContain('loop-body')
    expect(contract.placement?.nested).not.toContain('start')
  })
})
