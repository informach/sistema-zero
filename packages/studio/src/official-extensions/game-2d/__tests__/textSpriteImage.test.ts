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
  /** As medidas do fundo de cor: é por elas que se vê a caixa final do sprite. */
  fundos: Array<{ w: number; h: number }>
  /** Cada `ctx.font` escrito: prova o tamanho de letra que foi PARA A TELA. */
  fontes: string[]
  fillText: Array<{ texto: string; x: number; y: number }>
  /** ⚠️ Vazio é o contrato: o sprite de texto não escala mais nada. */
  scale: Array<{ x: number; y: number }>
}
function pincel() {
  const feito: Desenho = {
    drawImage: [],
    fillRect: 0,
    fundos: [],
    fontes: [],
    fillText: [],
    scale: [],
  }
  const ctx = {
    canvas: { width: 800, height: 480 },
    globalAlpha: 1,
    set font(valor: string) {
      feito.fontes.push(valor)
    },
    get font() {
      return feito.fontes[feito.fontes.length - 1] ?? ''
    },
    fillStyle: '',
    textAlign: '',
    textBaseline: '',
    imageSmoothingEnabled: true,
    save() {},
    restore() {},
    translate() {},
    scale(x: number, y: number) {
      feito.scale.push({ x, y })
    },
    rotate() {},
    clearRect() {},
    measureText: (t: string) => ({ width: t.length * 10 }),
    fillRect(_x: number, _y: number, w: number, h: number) {
      feito.fillRect += 1
      feito.fundos.push({ w, h })
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
  facing?: number
  textAppearance?: { measuredW: number; measuredH: number; lines: string[]; size: number }
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
  setSize(sprite: Sprite, largura: number, altura: number): void
  scaleSprite(sprite: Sprite, fator: number): void
  scaleTextSize(sprite: Sprite, fator: number): void
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

  it('⭐ o tamanho PEDIDO sobrevive à chegada da imagem', () => {
    // ⚠️ É a ordem natural dos blocos, e antes de 15/09 ela era a única que a
    // criança escrevia: num jogo sem laço tudo roda de uma vez e a placa chega
    // 1-2 quadros depois, apagando o tamanho. O tamanho deixou de ser uma RAZÃO
    // recuperada por divisão (que vira lixo quando a medida troca de dono) e
    // virou um número declarado, que a imagem não tem como corromper.
    const sprite = api.createTextSprite('JOGAR', 0, 0)
    api.setTextImage(sprite, 'placa', 'middle')
    api.setSize(sprite, 300, 120)
    ultimaImagem().chegou(200, 80)
    const feito = desenha(sprite)
    expect({ w: sprite.w, h: sprite.h }).toEqual({ w: 300, h: 120 })
    // A moldura PREENCHE o tamanho pedido, como em qualquer sprite de imagem.
    expect(feito.drawImage).toEqual([{ w: 300, h: 120 }])
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

describe('texto que não cabe na caixa', () => {
  it('transborda e avisa UMA vez, dizendo onde mexer', () => {
    const sprite = api.createTextSprite('uma frase bem comprida para não caber', 0, 0)
    api.setTextImage(sprite, 'placa', 'middle')
    ultimaImagem().chegou(80, 20)
    const { ctx, feito } = pincel()
    api.drawSprite(ctx, sprite)
    api.drawSprite(ctx, sprite)
    const cabe = avisos.filter((a) => a.includes('não cabe no sprite'))
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
    expect(avisos.filter((a) => a.includes('não cabe no sprite'))).toHaveLength(0)
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

/**
 * O tamanho do sprite de texto (15/09/2026).
 *
 * A promessa é a que o rótulo do bloco diz: **"Definir o tamanho do sprite:
 * largura ⟨300⟩"** entrega um sprite de 300, e ele continua 300. Sem pedido
 * nenhum, vale a medida — o texto, ou a imagem quando ela chega.
 *
 * ⚠️ Ninguém avisa o layout: ele guarda a PRÓPRIA saída e descobre a escrita de
 * fora comparando. É o que faz a regra valer para o bloco de definir, para o de
 * multiplicar, para os kits e para o modo Código, sem acoplar nenhum deles ao
 * sprite de texto.
 */
describe('o tamanho do sprite de texto', () => {
  it('sem pedido nenhum, quem manda é a medida (o texto)', () => {
    const sprite = api.createTextSprite('oi', 0, 0)
    desenha(sprite)
    const medido = { w: sprite.w, h: sprite.h }
    api.setSpriteText(sprite, 'um texto bem mais comprido')
    desenha(sprite)
    expect(sprite.w).toBeGreaterThan(medido.w)
  })

  it('⚠️ o sprite NÃO nasce com o tamanho de fábrica do createSprite travado', () => {
    // Um sprite nasce 32x32 antes de o texto ser medido. Se o layout lesse esses
    // 32 como um tamanho PEDIDO, todo sprite de texto nasceria travado em 32 e a
    // medida do texto nunca valeria para ninguém.
    const sprite = api.createTextSprite('um texto bem mais comprido', 0, 0)
    desenha(sprite)
    expect(sprite.w).toBeGreaterThan(32)
  })

  it('com fundo de COR o tamanho pedido é respeitado (o caminho que já funcionava)', () => {
    const sprite = api.createTextSprite('JOGAR', 0, 0)
    api.setTextBox(sprite, 0, 'left', 4, '#3b82f6')
    api.setSize(sprite, 300, 120)
    desenha(sprite)
    expect({ w: sprite.w, h: sprite.h }).toEqual({ w: 300, h: 120 })
  })

  it('⭐ o tamanho pedido MANDA: o texto crescer não estica mais o sprite', () => {
    // Decisão dela (15/09): "largura 300" quer dizer 300 e continua 300. Antes o
    // tamanho virava um zoom e o sprite crescia junto com o texto — o bloco "a
    // largura do sprite" respondia um número que ninguém tinha digitado.
    const sprite = api.createTextSprite('JOGAR', 0, 0)
    api.setSize(sprite, 300, 120)
    desenha(sprite)
    api.setSpriteText(sprite, 'SAIR PARA O MENU PRINCIPAL AGORA')
    desenha(sprite)
    expect({ w: sprite.w, h: sprite.h }).toEqual({ w: 300, h: 120 })
  })

  it('vale também na outra ordem: tamanho primeiro, imagem depois', () => {
    const sprite = api.createTextSprite('JOGAR', 0, 0)
    api.setSize(sprite, 300, 120)
    api.setTextImage(sprite, 'placa', 'middle')
    ultimaImagem().chegou(200, 80)
    desenha(sprite)
    expect({ w: sprite.w, h: sprite.h }).toEqual({ w: 300, h: 120 })
  })

  it('trocar de placa preserva o tamanho pedido', () => {
    const sprite = comPlaca('JOGAR', 'middle', 200, 80)
    api.setSize(sprite, 300, 120)
    desenha(sprite)
    api.setTextImage(sprite, 'selo', 'middle')
    ultimaImagem().chegou(64, 64)
    desenha(sprite)
    expect({ w: sprite.w, h: sprite.h }).toEqual({ w: 300, h: 120 })
  })

  it('"Multiplicar o tamanho" conta como pedido, e também sobrevive à imagem', () => {
    const sprite = api.createTextSprite('JOGAR', 0, 0)
    api.setTextImage(sprite, 'placa', 'middle')
    ultimaImagem().chegou(200, 80)
    desenha(sprite)
    api.scaleSprite(sprite, 2)
    desenha(sprite)
    api.setSpriteText(sprite, 'SAIR')
    desenha(sprite)
    expect({ w: sprite.w, h: sprite.h }).toEqual({ w: 400, h: 160 })
  })

  it('o modo Código (escrever em sprite.w direto) vale tanto quanto o bloco', () => {
    // ⚠️ A régua é a saída do PRÓPRIO layout, não uma marca que o setSize deixa:
    // é o que faz o caminho sem bloco nenhum funcionar igual.
    const sprite = api.createTextSprite('JOGAR', 0, 0)
    api.setTextImage(sprite, 'placa', 'middle')
    sprite.w = 150
    ultimaImagem().chegou(200, 80)
    desenha(sprite)
    expect(sprite.w).toBe(150)
    // A altura, que ninguém pediu, segue a imagem.
    expect(sprite.h).toBe(80)
  })

  it('largura 0 não muda nada (o soquete vazio do bloco continua inerte)', () => {
    const sprite = comPlaca('JOGAR', 'middle', 200, 80)
    api.setSize(sprite, 0, 0)
    desenha(sprite)
    expect({ w: sprite.w, h: sprite.h }).toEqual({ w: 200, h: 80 })
  })

  it('anti-vácuo: sem tamanho pedido, trocar de placa troca o tamanho', () => {
    const sprite = comPlaca('JOGAR', 'middle', 200, 80)
    api.setTextImage(sprite, 'selo', 'middle')
    ultimaImagem().chegou(64, 64)
    desenha(sprite)
    expect({ w: sprite.w, h: sprite.h }).toEqual({ w: 64, h: 64 })
  })
})

/**
 * A imagem se ESTICA, o texto se COMPÕE (15/09/2026, full review).
 *
 * O desenho não passa mais por um `ctx.scale`: o fundo (cor ou imagem) preenche o
 * tamanho do sprite, como em qualquer sprite de imagem do motor, e o texto é
 * escrito dentro dele no tamanho de letra escolhido. Antes, escalar o conjunto
 * deformava a letra (medido: 10,7 por 2,4 num "oi" de 300 por 120) e deixava o
 * bloco do tamanho da letra praticamente mudo — a medida natural crescia junto e a
 * escala desfazia na mesma proporção (letra 32 → 76,8 px na tela; letra 64 → 83,5).
 */
describe('a imagem se estica, o texto se compõe', () => {
  it('⭐⭐ o sprite de texto não escala NADA (é o que impede a letra de deformar)', () => {
    const sprite = api.createTextSprite('oi', 0, 0)
    api.setTextBox(sprite, 0, 'left', 4, '#3b82f6')
    api.setSize(sprite, 300, 120)
    expect(desenha(sprite).scale).toEqual([])
  })

  it('⚠️ anti-vácuo do teste acima: o pincel REGISTRA escala quando alguém escala', () => {
    // Sem esta metade, quebrar o espião de `scale` faria o teste de cima passar
    // para sempre — e ele é o que segura a promessa inteira deste lote. O espelho
    // do sprite virado é o caminho REAL do motor que usa ctx.scale(-1, 1).
    const sprite = api.createSprite({ x: 0, y: 0 })
    api.setImage(sprite, 'placa')
    ultimaImagem().chegou(200, 80)
    sprite.facing = -1
    expect(desenha(sprite).scale).toEqual([{ x: -1, y: 1 }])
  })

  it('o fundo de cor preenche o tamanho pedido', () => {
    const sprite = api.createTextSprite('oi', 0, 0)
    api.setTextBox(sprite, 0, 'left', 4, '#3b82f6')
    api.setSize(sprite, 300, 120)
    expect(desenha(sprite).fundos).toEqual([{ w: 300, h: 120 }])
  })

  it('⭐⭐ a letra vai para a tela no tamanho ESCOLHIDO, com o sprite travado', () => {
    // O defeito que este teste mata: com o tamanho travado, dobrar a letra rendia
    // 8,7% na tela. A criança mexia no bloco e nada acontecia.
    const tamanhoNaTela = (letra: number) => {
      const sprite = api.createTextSprite('oi', 0, 0)
      api.setSize(sprite, 300, 120)
      api.setTextStyle(sprite, letra, '#ffffff')
      const fontes = desenha(sprite).fontes
      return fontes[fontes.length - 1]
    }
    expect(tamanhoNaTela(32)).toContain('32px')
    expect(tamanhoNaTela(64)).toContain('64px')
  })

  it('a MOLDURA acompanha o tamanho pedido, mas a letra não estica junto', () => {
    const sprite = comPlaca('JOGAR', 'middle', 200, 80)
    api.setSize(sprite, 400, 160)
    const feito = desenha(sprite)
    expect(feito.drawImage).toEqual([{ w: 400, h: 160 }])
    expect(feito.fontes[feito.fontes.length - 1]).toContain('32px')
    expect(feito.scale).toEqual([])
  })

  it('a moldura de proporção diferente estica, como em qualquer sprite de imagem', () => {
    const sprite = comPlaca('JOGAR', 'middle', 200, 80)
    api.setSize(sprite, 300, 80)
    expect(desenha(sprite).drawImage).toEqual([{ w: 300, h: 80 }])
  })

  it('o texto REFLUI na largura pedida (o tamanho é a caixa, não um zoom)', () => {
    const sprite = api.createTextSprite('aa bb cc dd ee ff gg hh', 0, 0)
    api.setTextBox(sprite, 0, 'left', 4, 'transparent')
    api.setSize(sprite, 100, 200)
    desenha(sprite)
    // 100 de largura menos duas margens de 4 = 92 px úteis, a 10 px por caractere.
    const linhas = sprite.textAppearance?.lines ?? []
    expect(linhas.length).toBeGreaterThan(1)
    for (const linha of linhas) expect(linha.length).toBeLessThanOrEqual(9)
  })

  it('a altura do texto passa a valer sobre a caixa pedida', () => {
    const sprite = api.createTextSprite('JOGAR', 0, 0)
    api.setTextImage(sprite, 'placa', 'middle')
    ultimaImagem().chegou(200, 80)
    api.setSize(sprite, 400, 160)
    const feito = desenha(sprite)
    // Centrado em 160 (a altura PEDIDA), não em 80 (a da imagem).
    expect(feito.fillText[0]?.y).toBeCloseTo((160 - 32 * 1.3) / 2 + 0.5 * 32 * 1.3, 5)
  })

  it('⚠️ anti-regressão: sem tamanho pedido, o desenho é o de sempre', () => {
    // A aritmética antiga era `ctx.scale(sprite.w / measuredW, …)` com os dois
    // iguais, ou seja escala 1: quem não pede tamanho não pode ver diferença.
    const sprite = api.createTextSprite('oi', 0, 0)
    api.setTextBox(sprite, 0, 'left', 4, '#3b82f6')
    const feito = desenha(sprite)
    expect({ w: sprite.w, h: sprite.h }).toEqual({ w: 28, h: 50 })
    expect(feito.fundos).toEqual([{ w: 28, h: 50 }])
    expect(feito.fillText).toEqual([{ texto: 'oi', x: 4, y: 4 + 0.5 * 32 * 1.3 }])
  })

  it('⚠️ e com a placa, sem tamanho pedido, a moldura sai 1:1 como antes', () => {
    const sprite = comPlaca('JOGAR', 'top', 200, 80)
    const feito = desenha(sprite)
    expect(feito.drawImage).toEqual([{ w: 200, h: 80 }])
    expect(feito.fillText[0]?.y).toBeCloseTo(4 + 0.5 * 32 * 1.3, 5)
  })

  it('o aviso de não caber vale também sem imagem, na caixa pedida à mão', () => {
    const sprite = api.createTextSprite('uma frase bem comprida para não caber', 0, 0)
    api.setTextBox(sprite, 0, 'left', 4, 'transparent')
    api.setSize(sprite, 80, 20)
    desenha(sprite)
    desenha(sprite)
    expect(avisos.filter((a) => a.includes('não cabe no sprite'))).toHaveLength(1)
  })
})

/**
 * A receita que o manual e os tooltips ENSINAM (15/09, 2º full review).
 *
 * A primeira versão desta doc mandava "multiplicar o tamanho do sprite e o do
 * texto pelo mesmo número". Medido, isso funciona para CRESCER e falha para
 * ENCOLHER: a margem não escala junto, então a caixa fica ~4 px curta e o texto
 * quebra linha. Sem imagem a caixa é derivada da letra, então basta o bloco do
 * texto — e é isso que a doc diz agora.
 *
 * ⚠️ O pincel de teste mede `length * 10` seja qual for a fonte, então a LARGURA
 * não reage ao tamanho da letra aqui. Quem reage é a ALTURA, e é nela que estes
 * testes olham.
 */
describe('a receita ensinada para mudar o tamanho da letra', () => {
  it('sem imagem, multiplicar o TEXTO faz a caixa acompanhar sozinha', () => {
    const sprite = api.createTextSprite('oi', 0, 0)
    desenha(sprite)
    const antes = sprite.h
    api.scaleTextSize(sprite, 2)
    desenha(sprite)
    expect(sprite.h).toBeGreaterThan(antes)
    expect(avisos.filter((a) => a.includes('não cabe no sprite'))).toHaveLength(0)
  })

  it('e a letra vai à tela no tamanho multiplicado', () => {
    const sprite = api.createTextSprite('oi', 0, 0)
    api.scaleTextSize(sprite, 2)
    const feito = desenha(sprite)
    expect(feito.fontes[feito.fontes.length - 1]).toContain('64px')
  })

  it('o teto e o piso do tamanho da letra são os mesmos do bloco de estilo', () => {
    const sprite = api.createTextSprite('oi', 0, 0)
    api.scaleTextSize(sprite, 1000)
    desenha(sprite)
    expect(sprite.textAppearance?.size).toBe(512)
    api.scaleTextSize(sprite, 0)
    desenha(sprite)
    // Fator inválido vale 1: a letra não pode sumir por um número mal digitado.
    expect(sprite.textAppearance?.size).toBe(512)
  })

  it('⚠️ multiplicar o tamanho do SPRITE mexe na caixa, e o texto reflui nela', () => {
    // Mudança de comportamento deliberada deste lote, e é o que o tooltip do
    // bloco passou a dizer: antes o desenho inteiro era escalado.
    const sprite = api.createTextSprite('aa bb cc dd', 0, 0)
    api.setTextBox(sprite, 0, 'left', 4, 'transparent')
    desenha(sprite)
    expect(sprite.textAppearance?.lines).toEqual(['aa bb cc dd'])
    api.scaleSprite(sprite, 0.5)
    desenha(sprite)
    expect((sprite.textAppearance?.lines.length ?? 0) > 1).toBe(true)
  })
})

describe('centralizar o texto num botão SEM imagem', () => {
  it('o bloco da imagem com o seletor VAZIO grava só a altura do texto', () => {
    // Caminho não óbvio pelo nome do bloco, e que passou a importar quando a caixa
    // deixou de ser justa: sem ele, todo botão de cor com tamanho pedido fica com a
    // frase grudada no topo. O tooltip do bloco ensina isso desde 15/09.
    const sprite = api.createTextSprite('JOGAR', 0, 0)
    api.setTextBox(sprite, 0, 'left', 4, '#3b82f6')
    api.setSize(sprite, 300, 120)
    expect(desenha(sprite).fillText[0]?.y).toBeCloseTo(4 + 0.5 * 32 * 1.3, 5)
    api.setTextImage(sprite, '', 'middle')
    const feito = desenha(sprite)
    expect(feito.fillText[0]?.y).toBeCloseTo((120 - 32 * 1.3) / 2 + 0.5 * 32 * 1.3, 5)
    // Anti-vácuo: nenhuma imagem foi desenhada nesse caminho.
    expect(feito.drawImage).toEqual([])
  })
})
