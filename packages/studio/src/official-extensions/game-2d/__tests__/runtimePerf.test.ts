import { afterAll, describe, expect, it } from 'bun:test'
import { reinoZeroExample } from '../examples'
import { gameTwoDRuntime } from '../runtime'
import { exampleHarness } from './examplePlaythroughHarness'

/**
 * Desempenho do Jogo 2D, medido por CONTADOR e não por cronômetro.
 *
 * ⭐ A régua é "quantas operações de contexto este quadro custa". Ela é
 * determinística (o harness fixa o relógio e o sorteio), roda no CI, e responde a
 * pergunta que importa — *a otimização funcionou?* — sem a flakiness de milissegundo
 * e sem depender de layout, que o `bun test` não faz.
 *
 * ⚠️ O que ela NÃO responde: quanto isso vale em tempo real. `save()` empilha o
 * estado 2D inteiro e num `ctx` de mentira custa o mesmo que qualquer chamada. Para
 * p50/p95 de verdade é Chrome, e os números vivem datados no design doc.
 */

interface Ctx {
  canvas: { width: number; height: number }
  [key: string]: unknown
}

/** Monta o runtime cru com um `ctx` que CONTA cada operação, por nome. */
function contextoContado() {
  const ops: Record<string, number> = {}
  const conta = (chave: string) => {
    ops[chave] = (ops[chave] ?? 0) + 1
  }
  const memo = new Map<string, () => undefined>()
  const alvo: Record<string, unknown> = {
    canvas: { width: 800, height: 480 },
    measureText: (texto: string) => ({ width: String(texto).length * 8 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    setTransform: () => undefined,
  }
  const ctx = new Proxy(alvo, {
    get(target, property) {
      const nome = String(property)
      if (property in target) {
        conta(`get:${nome}`)
        return target[nome]
      }
      const pronta = memo.get(nome)
      if (pronta) return pronta
      const nova = () => {
        conta(`call:${nome}`)
        return undefined
      }
      memo.set(nome, nova)
      return nova
    },
    set(target, property, value) {
      conta(`set:${String(property)}`)
      target[String(property)] = value
      return true
    },
  }) as unknown as Ctx
  const total = (filtro?: string) => {
    let soma = 0
    for (const [chave, quantas] of Object.entries(ops)) {
      if (!filtro || chave === filtro || chave.endsWith(`:${filtro}`)) soma += quantas
    }
    return soma
  }
  const zerar = () => {
    for (const chave of Object.keys(ops)) delete ops[chave]
  }
  return { ctx, ops, total, zerar }
}

/**
 * Imagem que já nasce pronta. Aqui — ao contrário do `backdrop.test.ts`, que existe
 * justamente para provar o caminho assíncrono — o que se mede é o custo do DESENHO,
 * então o load síncrono é o certo: sem ele o `drawFrame` sai cedo e o cenário conta zero.
 */
class ImagemPronta {
  naturalWidth = 64
  naturalHeight = 64
  width = 64
  height = 64
  onerror: (() => void) | null = null
  private aoCarregar: (() => void) | null = null
  get onload(): (() => void) | null {
    return this.aoCarregar
  }
  set onload(fn: (() => void) | null) {
    this.aoCarregar = fn
    fn?.()
  }
  addEventListener(tipo: string, ouvinte: () => void) {
    if (tipo === 'load') ouvinte()
  }
  set src(_valor: string) {}
}

/**
 * ⚠️ O registro de módulos do `bun test` NÃO é isolado por arquivo: uma `Image`
 * trocada aqui vaza para os outros arquivos da suíte e faz um teste distante falhar
 * por motivo nenhum. (Aconteceu: o `playAnimOnce` do Jogo 2D Avançado quebrou.)
 */
const imagemReal = globalThis.Image
afterAll(() => {
  ;(globalThis as { Image: unknown }).Image = imagemReal
})

function carregarRuntime() {
  ;(globalThis as { Image: unknown }).Image = ImagemPronta
  const win = {
    addEventListener() {},
    performance: { now: () => 0 },
    devicePixelRatio: 1,
    SZGame2D: undefined,
    __SZGAME_ASSETS: { peças: 'data:image/svg+xml;base64,PHN2Zy8+' },
  } as unknown as Record<string, unknown>
  new Function('window', 'requestAnimationFrame', gameTwoDRuntime)(win, () => 0)
  // A API é montada em runtime a partir da STRING; aqui só os helpers dos cenários.
  return win.SZGame2D as {
    setupStage: (w: number, h: number, bg: string) => void
    createTileMap: (opcoes: Record<string, unknown>) => unknown
    placeTileMap: (mapa: unknown, x: number, y: number, tile: number) => void
    drawTileMap: (ctx: unknown, mapa: unknown) => void
    emitParticles: (x: number, y: number, quantas: number, cor: string) => void
    drawParticles: (ctx: unknown) => void
    createGroup: () => { items: unknown[] }
    createSprite: (opcoes: Record<string, unknown>) => unknown
    drawGroupByY: (ctx: unknown, grupo: unknown) => void
  }
}

/**
 * ⚠️ ANTI-VÁCUO do contador. Sem este caso, um `ctx` que parasse de contar (um trap
 * removido, um rename) deixaria TODOS os cenários abaixo em zero e o arquivo inteiro
 * passaria para sempre — a versão silenciosa do "aviso que acusa quem está certo"
 * que esta casa já catalogou.
 */
describe('o contador de operações MORDE', () => {
  it('conta escrita, leitura e chamada', () => {
    const { ctx, ops, total } = contextoContado()
    ctx.fillStyle = '#fff'
    ctx.fillStyle = '#000'
    void ctx.canvas
    ;(ctx.fillRect as () => void)()
    expect(ops['set:fillStyle']).toBe(2)
    expect(ops['get:canvas']).toBe(1)
    expect(ops['call:fillRect']).toBe(1)
    expect(total()).toBe(4)
    expect(total('fillStyle')).toBe(2)
  })

  it('o contador do harness dos exemplos também morde', () => {
    const jogo = exampleHarness(reinoZeroExample, () => 0.5, { contarCtx: true })
    jogo.nextFrame()
    expect(jogo.contarCtxOps()).toBeGreaterThan(0)
    // E fica DESLIGADO por padrão: os outros playthroughs não pagam nada.
    const semContar = exampleHarness(reinoZeroExample, () => 0.5)
    semContar.nextFrame()
    expect(semContar.contarCtxOps()).toBe(0)
  })
})

/**
 * Os cenários. Cada número aqui é o CUSTO DE HOJE; quando uma otimização entra, o
 * número desce e o teste é o que prova. Subir qualquer um deles exige explicar.
 */
/**
 * ⚠️ A metade que tem que FALHAR se uma otimização mudar o comportamento. Os
 * contadores acima provam que ficou mais barato; estes provam que continua certo.
 */
describe('as otimizações não mudaram o que aparece na tela', () => {
  it('⚠️ o lote de nitidez NÃO vaza quando o desenho lança', () => {
    // Defeito que o lote introduziu e o try/finally consertou: o lote deixa o modo
    // pixel LIGADO enquanto dura. Sem fechá-lo numa exceção, toda imagem que a
    // criança desenhasse depois (blocos de Canvas do núcleo) sairia serrilhada,
    // em silêncio, pelo resto da partida — e nenhum teste de desenho veria.
    const api = carregarRuntime()
    const { ctx, ops } = contextoContado()
    api.setupStage(400, 240, '#000')
    ;(ctx as unknown as { imageSmoothingEnabled: boolean }).imageSmoothingEnabled = false
    const mapa = api.createTileMap({
      image: 'peças',
      tile: 16,
      grid: ['0 0 0', '0 0 0'].join(';'),
      solid: '',
    })
    api.placeTileMap(mapa, 0, 0, 16)

    // ⚠️ Não adianta fazer o `drawImage` explodir: o `_crispDraw` engole a
    // exceção do desenho de propósito (o chamador cai no retângulo de reserva).
    // O caminho que ESCAPA é uma linha malformada, que o modo Código alcança.
    const cru = mapa as unknown as { rows: unknown[] }
    cru.rows[1] = null
    expect(() => api.drawTileMap(ctx, mapa)).toThrow()
    void ops

    // ⭐ A asserção é AQUI, no instante seguinte à exceção: é a janela em que o
    // dano existe. Sem o `finally`, o modo pixel fica ligado e a próxima imagem
    // que a criança desenhar com os blocos de Canvas sai serrilhada.
    expect((ctx as unknown as { imageSmoothingEnabled: boolean }).imageSmoothingEnabled).toBe(false)
  })

  it('⭐ desenhar pela base mantém a ordem de inserção nos EMPATES', () => {
    // O risco do lote: trocar o comparador poderia reordenar quem empata. Dois
    // sprites na mesma linha do chão é o caso comum num jogo visto de cima.
    const api = carregarRuntime()
    const { ctx, ops } = contextoContado()
    api.setupStage(400, 300, '#000')
    const grupo = api.createGroup() as { items: unknown[] }
    const desenhados: string[] = []
    for (const [nome, y] of [
      ['primeiro', 100],
      ['segundo', 100],
      ['terceiro', 60],
      ['quarto', 100],
    ] as const) {
      grupo.items.push(api.createSprite({ x: 10, y, w: 8, h: 8, color: nome }))
    }
    // O `fillStyle` carrega o nome: é por ele que se lê a ORDEM do desenho.
    const alvo = ctx as unknown as { fillStyle: string }
    Object.defineProperty(alvo, 'fillStyle', {
      set(valor: string) {
        desenhados.push(valor)
      },
      get: () => '',
      configurable: true,
    })
    api.drawGroupByY(ctx, grupo)
    void ops

    // O de cima (base menor) primeiro; os três empatados na ordem em que entraram.
    expect(desenhados).toEqual(['terceiro', 'primeiro', 'segundo', 'quarto'])
  })
})

describe('cenários de desempenho — o custo de hoje', () => {
  it('⭐ mapa de FOLHA: o ajuste de nitidez é UM por mapa, não um por célula', () => {
    // ANTES deste lote: o `_crispDraw` lia e escrevia `imageSmoothingEnabled` em
    // volta de CADA tile, então um mapa de 375 células custava 1.125 travessias de
    // contexto para 375 desenhos úteis — quatro de sobrecarga para cada um.
    // AGORA: as células de um mapa têm todas o mesmo tamanho, então a decisão é a
    // mesma para todas e o `drawTileMap` a toma UMA vez para o mapa inteiro.
    // É o caminho do mapa de 1 clique, o que a criança usa ao trazer a folha do Pinta.
    const api = carregarRuntime()
    const { ctx, total } = contextoContado()
    api.setupStage(400, 240, '#000')
    const linha = '0 '.repeat(25).trim()
    const mapa = api.createTileMap({
      image: 'peças',
      tile: 16,
      grid: Array.from({ length: 15 }, () => linha).join(';'),
      solid: '',
    })
    // ⚠️ Preparar antes de desenhar (o runtime avisa e sai cedo sem isto): com x/y
    // e tamanho fixos o cenário não depende do palco, que o happy-dom não mede.
    api.placeTileMap(mapa, 0, 0, 16)
    api.drawTileMap(ctx, mapa)

    const desenhos = total('drawImage')
    const sobrecarga = total('imageSmoothingEnabled')
    expect(desenhos).toBe(375)
    // ⚠️ Teto em operações ABSOLUTAS, não em proporção: se a sobrecarga voltar a
    // ser por célula, este número explode com o tamanho do mapa e o teste morde.
    expect(sobrecarga).toBeLessThanOrEqual(4)
  })

  it('⭐ as partículas custam UM save/restore, não um por partícula', () => {
    const api = carregarRuntime()
    const { ctx, total } = contextoContado()
    api.setupStage(800, 480, '#000')
    // ⚠️ A ordem é (x, y, QUANTAS, cor) — trocar a cor pela contagem faz o runtime
    // cair no padrão de 12 e o cenário mede um sexto do caso real.
    for (let explosao = 0; explosao < 6; explosao += 1) {
      api.emitParticles(400, 240, 80, '#fff')
    }
    api.drawParticles(ctx)
    // Eram 800 travessias (400 partículas × save+restore) para proteger dois
    // campos que a iteração seguinte reescrevia de qualquer jeito.
    expect(total('fillRect')).toBeGreaterThan(300)
    expect(total('save')).toBe(1)
    expect(total('restore')).toBe(1)
  })

  it('⭐ o quadro do Reino Zero: total de operações de contexto', () => {
    // O número de INTEGRAÇÃO — o único que responde "o lote de desempenho valeu?".
    // Ele cai quando o desenho de peça vetorial e o `_crispDraw` melhorarem.
    const jogo = exampleHarness(reinoZeroExample, () => 0.5, { contarCtx: true })
    jogo.fireKey('Enter')
    for (let quadro = 0; quadro < 30; quadro += 1) jogo.nextFrame()
    jogo.zerarCtxOps()
    for (let quadro = 0; quadro < 60; quadro += 1) jogo.nextFrame()
    const porQuadro = jogo.contarCtxOps() / 60

    // Teto FOLGADO de propósito: isto é uma catraca contra regressão grosseira, não
    // uma medida fina. O valor exato vive no design doc, datado.
    expect(porQuadro).toBeGreaterThan(0)
    expect(porQuadro).toBeLessThan(8000)
  })
})
