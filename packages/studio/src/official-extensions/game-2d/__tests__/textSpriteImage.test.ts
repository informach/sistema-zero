import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { compileStatements } from '#generators'
import { parseJS } from '../../../parsers/js'
import { gameTwoDToolboxCategory } from '../blocks'
import { gameTwoDRuntime } from '../runtime'

/**
 * Fundo de IMAGEM no sprite de texto (placa, botão, balão de fala).
 *
 * A promessa é estreita e é ela que se testa aqui: **a imagem manda no tamanho**
 * do sprite, sem deformar, e o texto é escrito por cima, quebrando linha na
 * largura dela menos a margem. O `bun test` roda com um `ctx` dublê, então o que
 * se prova é a GEOMETRIA (medidas, argumentos de `drawImage`, `y` de cada linha);
 * cor e composição só um navegador de verdade prova.
 */

interface FakeImage {
  naturalWidth: number
  naturalHeight: number
  chegou(w: number, h: number): void
  falhou(): void
}

/** Toda imagem criada pelo runtime nesta execução, na ordem. */
let criadas: FakeImage[] = []

class ImagemDeMentira {
  naturalWidth = 0
  naturalHeight = 0
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  private valorSrc = ''
  private ouvintes = new Map<string, Array<() => void>>()

  set src(valor: string) {
    this.valorSrc = valor
    criadas.push(this as unknown as FakeImage)
  }
  get src() {
    return this.valorSrc
  }
  addEventListener(tipo: string, fn: () => void) {
    const lista = this.ouvintes.get(tipo) ?? []
    lista.push(fn)
    this.ouvintes.set(tipo, lista)
  }
  removeEventListener(tipo: string, fn: () => void) {
    this.ouvintes.set(
      tipo,
      (this.ouvintes.get(tipo) ?? []).filter((f) => f !== fn),
    )
  }
  private dispara(tipo: string) {
    for (const fn of [...(this.ouvintes.get(tipo) ?? [])]) fn()
  }
  /** A imagem terminou de carregar com este tamanho natural. */
  chegou(w: number, h: number) {
    this.naturalWidth = w
    this.naturalHeight = h
    this.onload?.()
    this.dispara('load')
  }
  falhou() {
    this.onerror?.()
    this.dispara('error')
  }
}

/** Pincel espião: guarda o que foi pedido, na ordem. */
interface Desenho {
  drawImage: Array<{ w: number; h: number }>
  fillRect: number
  fillText: Array<{ texto: string; x: number; y: number }>
}
function pincel() {
  const feito: Desenho = { drawImage: [], fillRect: 0, fillText: [] }
  const ctx = {
    canvas: { width: 800, height: 480 },
    globalAlpha: 1,
    font: '',
    fillStyle: '',
    textAlign: '',
    textBaseline: '',
    imageSmoothingEnabled: true,
    save() {},
    restore() {},
    translate() {},
    scale() {},
    rotate() {},
    clearRect() {},
    measureText: (t: string) => ({ width: t.length * 10 }),
    fillRect() {
      feito.fillRect += 1
    },
    fillText(texto: string, x: number, y: number) {
      feito.fillText.push({ texto, x, y })
    },
    drawImage(_img: unknown, _x: number, _y: number, w: number, h: number) {
      feito.drawImage.push({ w, h })
    },
  }
  return { ctx, feito }
}

interface Sprite {
  x: number
  y: number
  w: number
  h: number
  textAppearance?: { measuredW: number; measuredH: number; lines: string[] }
  _hitboxArt?: unknown
}
interface Api {
  createTextSprite(texto: unknown, x: number, y: number): Sprite
  setSpriteText(sprite: Sprite, texto: unknown): void
  setTextStyle(sprite: Sprite, tamanho: number, cor: string): void
  setTextBox(sprite: Sprite, largura: number, align: string, margem: number, fundo: string): void
  setTextImage(sprite: Sprite, imagem: string, valign: string): void
  createSprite(opcoes?: Record<string, unknown>): Sprite
  setImage(sprite: Sprite, nome: string): void
  drawSprite(ctx: unknown, sprite: Sprite): void
}

const avisos: string[] = []
function carrega(): Api {
  criadas = []
  avisos.length = 0
  const console = { warn: (...a: unknown[]) => avisos.push(a.join(' ')) }
  const win = {
    addEventListener() {},
    performance: { now: () => 0 },
    requestAnimationFrame: () => 0,
    console,
    __SZGAME_ASSETS: {
      placa: 'data:image/png;base64,PLACA',
      selo: 'data:image/png;base64,SELO',
    },
    // A caixa que o Pinta mediu na arte, em fração do quadro. Sem ela o
    // `_hitboxArt` seria null dos dois lados e a asserção da caixa não provaria nada.
    __SZGAME_ASSET_META: { placa: { hitbox: { x: 0.1, y: 0.2, w: 0.8, h: 0.6 } } },
    SZGame2D: undefined,
  } as unknown as Record<string, unknown>
  new Function('window', 'requestAnimationFrame', 'console', gameTwoDRuntime)(win, () => 0, console)
  return win.SZGame2D as Api
}

/** A última imagem pedida ao runtime. */
const ultimaImagem = () => criadas[criadas.length - 1] as FakeImage

const getContextOriginal = HTMLCanvasElement.prototype.getContext
const ImageOriginal = globalThis.Image

beforeAll(() => {
  // Um pincel de MEDIÇÃO determinístico (10 px por caractere). Sem ele o
  // happy-dom devolve null, o runtime cai na estimativa e a layoutKey nunca é
  // preenchida — e o cache, que é metade do que se testa aqui, ficaria de fora.
  HTMLCanvasElement.prototype.getContext = (() => ({
    font: '',
    measureText: (t: string) => ({ width: t.length * 10 }),
  })) as unknown as typeof getContextOriginal
  globalThis.Image = ImagemDeMentira as unknown as typeof Image
})

// ⚠️ O registro de módulos do bun NÃO é isolado por arquivo: um dublê vazado
// daqui já quebrou teste distante (a Image do Jogo 2D Avançado).
afterAll(() => {
  HTMLCanvasElement.prototype.getContext = getContextOriginal
  globalThis.Image = ImageOriginal
})

let api: Api
beforeEach(() => {
  api = carrega()
})

/**
 * O layout é PREGUIÇOSO: ele roda no desenho (e no redraw que a chegada da imagem
 * agenda). Quem afere medida sem desenhar está olhando o estado anterior.
 */
function desenha(sprite: Sprite) {
  const { ctx, feito } = pincel()
  api.drawSprite(ctx, sprite)
  return feito
}

/** Uma placa pronta: sprite de texto com a imagem já carregada e já desenhada. */
function comPlaca(texto = 'JOGAR', valign = 'middle', w = 200, h = 80) {
  const sprite = api.createTextSprite(texto, 10, 20)
  api.setTextImage(sprite, 'placa', valign)
  ultimaImagem().chegou(w, h)
  desenha(sprite)
  return sprite
}

describe('a imagem manda no tamanho do sprite de texto', () => {
  it('o sprite fica do tamanho da imagem, e o desenho sai 1:1 (não deforma)', () => {
    const sprite = comPlaca()
    const { ctx, feito } = pincel()
    api.drawSprite(ctx, sprite)

    expect({ w: sprite.w, h: sprite.h }).toEqual({ w: 200, h: 80 })
    expect(feito.drawImage).toEqual([{ w: 200, h: 80 }])
  })

  it('texto comprido não estica a placa: ela continua do tamanho da imagem', () => {
    const sprite = comPlaca('Aperte aqui para começar a aventura')
    expect({ w: sprite.w, h: sprite.h }).toEqual({ w: 200, h: 80 })
  })

  it('o texto quebra na largura da imagem menos a margem', () => {
    const sprite = api.createTextSprite('aa bb cc dd ee ff', 0, 0)
    api.setTextBox(sprite, 0, 'left', 10, 'transparent')
    api.setTextImage(sprite, 'placa', 'top')
    ultimaImagem().chegou(100, 200)
    desenha(sprite)
    // 100 de largura menos 2 margens de 10 = 80 px úteis, a 10 px por caractere.
    const linhas = sprite.textAppearance?.lines ?? []
    expect(linhas.length).toBeGreaterThan(1)
    for (const linha of linhas) expect(linha.length).toBeLessThanOrEqual(8)
  })

  it('anti-vácuo: SEM imagem quem manda é o texto, como antes', () => {
    const sprite = api.createTextSprite('oi', 0, 0)
    expect(sprite.w).toBeLessThan(200)
    expect(sprite.h).toBeLessThan(80)
  })
})

describe('a altura do texto dentro da placa', () => {
  const yDaLinha = (valign: string) => {
    const sprite = comPlaca('JOGAR', valign)
    const { ctx, feito } = pincel()
    api.drawSprite(ctx, sprite)
    return feito.fillText[0]?.y ?? Number.NaN
  }

  it('em cima é a margem de sempre (o desenho de antes deste campo existir)', () => {
    // margem 4 (a de fábrica) + meia linha de 32 * 1.3.
    expect(yDaLinha('top')).toBeCloseTo(4 + 0.5 * 32 * 1.3, 5)
  })

  it('no meio centraliza o bloco de texto na altura da placa', () => {
    expect(yDaLinha('middle')).toBeCloseTo((80 - 32 * 1.3) / 2 + 0.5 * 32 * 1.3, 5)
  })

  it('embaixo encosta na margem de baixo', () => {
    expect(yDaLinha('bottom')).toBeCloseTo(80 - 4 - 32 * 1.3 + 0.5 * 32 * 1.3, 5)
  })

  it('os três são diferentes entre si (a escolha faz alguma coisa)', () => {
    const cima = yDaLinha('top')
    const meio = yDaLinha('middle')
    const baixo = yDaLinha('bottom')
    expect(new Set([cima, meio, baixo]).size).toBe(3)
    expect(cima).toBeLessThan(meio)
    expect(meio).toBeLessThan(baixo)
  })
})

describe('a placa chega depois (a imagem carrega de forma assíncrona)', () => {
  it('enquanto carrega o sprite segue medido pelo texto, e nada é desenhado', () => {
    const sprite = api.createTextSprite('JOGAR', 0, 0)
    api.setTextImage(sprite, 'placa', 'middle')
    const { ctx, feito } = pincel()
    api.drawSprite(ctx, sprite)
    expect(feito.drawImage).toEqual([])
    expect(sprite.w).toBeLessThan(200)
  })

  it('quando a imagem chega, a medida é REFEITA (a chave do cache invalidou)', () => {
    const sprite = api.createTextSprite('JOGAR', 0, 0)
    api.setTextImage(sprite, 'placa', 'middle')
    const antes = sprite.w
    ultimaImagem().chegou(200, 80)
    const { ctx } = pincel()
    api.drawSprite(ctx, sprite)
    expect(antes).toBeLessThan(200)
    expect({ w: sprite.w, h: sprite.h }).toEqual({ w: 200, h: 80 })
  })

  it('a escala REANCORA: um sprite redimensionado à mão não vira lixo', () => {
    const sprite = api.createTextSprite('JOGAR', 0, 0)
    api.setTextImage(sprite, 'placa', 'middle')
    // A criança ajustou o tamanho enquanto a placa ainda vinha.
    sprite.w = 60
    sprite.h = 30
    ultimaImagem().chegou(200, 80)
    const { ctx } = pincel()
    api.drawSprite(ctx, sprite)
    // Sem a reancoragem daria 200 * (60 / largura-do-texto): um número qualquer.
    expect({ w: sprite.w, h: sprite.h }).toEqual({ w: 200, h: 80 })
  })

  it('trocar o TEXTO no meio da carga não mata o redraw da placa', () => {
    // ⚠️ O cancelamento do `setSpriteText` é da IMAGEM FIXA, que está sendo
    // descartada. Cancelar sem olhar deixava o botão sem moldura num jogo sem laço.
    const sprite = api.createTextSprite('JOGAR', 0, 0)
    api.setTextImage(sprite, 'placa', 'middle')
    const { ctx, feito } = pincel()
    api.drawSprite(ctx, sprite)
    api.setSpriteText(sprite, 'SAIR')
    ultimaImagem().chegou(200, 80)
    expect(feito.drawImage).toEqual([{ w: 200, h: 80 }])
  })

  it('trocar de placa no meio da carga reagenda para a SEGUNDA', () => {
    // ⚠️⚠️ Com um booleano por sprite (a 1ª versão), os dois donos de imagem
    // dividiam um estado só: a segunda placa não agendava nada e não aparecia.
    const sprite = api.createTextSprite('JOGAR', 0, 0)
    api.setTextImage(sprite, 'placa', 'middle')
    const { ctx, feito } = pincel()
    api.drawSprite(ctx, sprite)
    api.setTextImage(sprite, 'selo', 'middle')
    api.drawSprite(ctx, sprite)
    ultimaImagem().chegou(64, 64)
    expect(feito.drawImage).toEqual([{ w: 64, h: 64 }])
  })

  it('anti-vácuo: a imagem FIXA segue agendando o redraw dela', () => {
    const sprite = api.createSprite({ x: 0, y: 0 })
    api.setImage(sprite, 'placa')
    const { ctx, feito } = pincel()
    api.drawSprite(ctx, sprite)
    expect(feito.drawImage).toEqual([])
    ultimaImagem().chegou(200, 80)
    expect(feito.drawImage.length).toBe(1)
  })

  it('num jogo sem "a cada quadro", a chegada da placa repinta sozinha', () => {
    const sprite = api.createTextSprite('JOGAR', 0, 0)
    api.setTextImage(sprite, 'placa', 'middle')
    const { ctx, feito } = pincel()
    api.drawSprite(ctx, sprite)
    expect(feito.drawImage).toEqual([])
    ultimaImagem().chegou(200, 80)
    expect(feito.drawImage).toEqual([{ w: 200, h: 80 }])
  })
})

describe('a placa e o resto do sprite de texto convivem', () => {
  it('trocar o texto preserva a placa E a caixa de colisão dela', () => {
    const sprite = comPlaca('JOGAR')
    const antes = sprite._hitboxArt
    // Anti-vácuo: a caixa da arte existe de verdade (senão seria null dos dois lados).
    expect(antes).toEqual({ x: 0.1, y: 0.2, w: 0.8, h: 0.6 })
    api.setSpriteText(sprite, 'SAIR')
    const { ctx, feito } = pincel()
    api.drawSprite(ctx, sprite)
    expect(feito.drawImage).toEqual([{ w: 200, h: 80 }])
    expect(sprite._hitboxArt).toEqual(antes)
    expect(feito.fillText[0]?.texto).toBe('SAIR')
  })

  it('imagem vazia volta ao fundo de cor', () => {
    const sprite = comPlaca('JOGAR')
    api.setTextImage(sprite, '', 'middle')
    const feito = desenha(sprite)
    expect(feito.drawImage).toEqual([])
    expect(sprite.w).toBeLessThan(200)
  })

  it('trocar de placa troca o tamanho', () => {
    const sprite = comPlaca('JOGAR', 'middle', 200, 80)
    api.setTextImage(sprite, 'selo', 'middle')
    ultimaImagem().chegou(64, 64)
    desenha(sprite)
    expect({ w: sprite.w, h: sprite.h }).toEqual({ w: 64, h: 64 })
  })

  it('o bloco recusa um sprite que não é de texto, e avisa', () => {
    const sprite = api.createSprite({ x: 0, y: 0 })
    api.setTextImage(sprite, 'placa', 'middle')
    expect(avisos.join(' ')).toContain('sprite de TEXTO')
  })
})

describe('o fundo de COR só pinta quando é para pintar', () => {
  const pinta = (cor: string) => {
    const sprite = api.createTextSprite('oi', 0, 0)
    api.setTextBox(sprite, 0, 'left', 4, cor)
    const { ctx, feito } = pincel()
    api.drawSprite(ctx, sprite)
    return feito.fillRect > 0
  }

  it('"transparent" não pinta (o padrão histórico continua valendo)', () => {
    expect(pinta('transparent')).toBe(false)
  })

  it('cor invisível do seletor novo não pinta', () => {
    expect(pinta('rgba(0, 0, 0, 0)')).toBe(false)
  })

  it('valor que não é cor não derruba o jogo (o soquete aceita qualquer coisa)', () => {
    // ⚠️ O Canvas sempre ignorou um fillStyle que não fosse cor. A régua nova lê a
    // string para achar alfa 0, e sem guarda um número encaixado por engano
    // quebrava a partida inteira com um erro de runtime.
    for (const valor of [123, true, {}, ['a'], null, undefined]) {
      const sprite = api.createTextSprite('oi', 0, 0)
      expect(() => {
        api.setTextBox(sprite, 0, 'left', 4, valor as unknown as string)
        desenha(sprite)
      }).not.toThrow()
    }
  })

  it('anti-vácuo: cor sólida PINTA', () => {
    expect(pinta('rgba(59, 130, 246, 1)')).toBe(true)
    expect(pinta('#3b82f6')).toBe(true)
  })
})

describe('texto que não cabe na placa', () => {
  it('transborda e avisa UMA vez, dizendo onde mexer', () => {
    const sprite = api.createTextSprite('uma frase bem comprida para não caber', 0, 0)
    api.setTextImage(sprite, 'placa', 'middle')
    ultimaImagem().chegou(80, 20)
    const { ctx, feito } = pincel()
    api.drawSprite(ctx, sprite)
    api.drawSprite(ctx, sprite)
    const cabe = avisos.filter((a) => a.includes('não cabe na imagem'))
    expect(cabe).toHaveLength(1)
    expect(cabe[0]).toContain('tamanho')
    // Transbordar é visível; cortar esconderia o texto em silêncio.
    expect(feito.fillText.length).toBeGreaterThan(0)
  })

  it('NÃO avisa enquanto a imagem carrega (ali a medida ainda é a do texto)', () => {
    const sprite = api.createTextSprite('uma frase bem comprida para não caber', 0, 0)
    api.setTextImage(sprite, 'placa', 'middle')
    const { ctx } = pincel()
    api.drawSprite(ctx, sprite)
    expect(avisos.filter((a) => a.includes('não cabe na imagem'))).toHaveLength(0)
  })
})

describe('a Ponte leva o bloco inteiro de volta', () => {
  const linha = (valign: string) => `SZGame2D.setTextImage(botao, "placa", "${valign}");`

  for (const valign of ['top', 'middle', 'bottom']) {
    it(`${valign} volta como bloco e o código sai igual ao que entrou`, () => {
      const ir = parseJS(linha(valign))
      expect(ir.map((s) => s.type)).toEqual(['g2d:setTextImage'])
      expect(compileStatements(ir, 0).trim()).toBe(linha(valign))
    })
  }

  it('altura fora do menu NÃO vira bloco (não é coagida para a 1ª opção)', () => {
    // ⚠️ O FieldDropdown coage valor desconhecido para a primeira opção: aceitar
    // aqui trocaria em silêncio a escolha da criança. É a armadilha que esta
    // extensão já pagou nos comportamentos de inimigo. Recusado, o trecho volta
    // como chamada genérica e ela vê o que escreveu, sem coerção.
    const ir = parseJS(linha('meio'))
    expect(ir.map((s) => s.type)).toEqual(['memberCall'])
    expect(compileStatements(ir, 0).trim()).toBe(linha('meio'))
  })

  it('aridade errada também é recusada', () => {
    const ir = parseJS('SZGame2D.setTextImage(botao, "placa");')
    expect(ir.map((s) => s.type)).toEqual(['memberCall'])
  })
})

describe('o fundo do "Caixa de texto" nasce com o SELETOR de cor', () => {
  interface NoDaToolbox {
    kind?: string
    type?: string
    contents?: NoDaToolbox[]
    inputs?: Record<string, { shadow?: { type: string; fields?: Record<string, unknown> } }>
  }
  const acha = (no: NoDaToolbox, tipo: string): NoDaToolbox | undefined => {
    if (no.type === tipo) return no
    for (const filho of no.contents ?? []) {
      const achado = acha(filho, tipo)
      if (achado) return achado
    }
  }

  it('é um bloco de cor com transparência, não um bloco de texto para digitar o código', () => {
    const bloco = acha(gameTwoDToolboxCategory as NoDaToolbox, 'sz_g2d_set_text_box')
    expect(bloco?.inputs?.BACKGROUND?.shadow?.type).toBe('sz_val_color_alpha')
  })

  it('e nasce INVISÍVEL: o padrão continua sendo sem fundo', () => {
    const bloco = acha(gameTwoDToolboxCategory as NoDaToolbox, 'sz_g2d_set_text_box')
    // ⚠️ O campo mede OPACIDADE apesar do rótulo: 0% = invisível, 100% = sólida.
    expect(bloco?.inputs?.BACKGROUND?.shadow?.fields?.ALPHA).toBe(0)
  })

  it('e a cor que ele produz de fábrica não pinta nada', () => {
    const sprite = api.createTextSprite('oi', 0, 0)
    api.setTextBox(sprite, 240, 'left', 12, 'rgba(0, 0, 0, 0)')
    expect(desenha(sprite).fillRect).toBe(0)
  })
})
