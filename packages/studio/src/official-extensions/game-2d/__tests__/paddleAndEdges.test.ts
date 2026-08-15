import { describe, expect, it } from 'bun:test'
import { gameTwoDRuntime } from '../runtime'

/**
 * Os cinco facilitadores que faltavam para o gênero do Pong/Breakout existir em
 * blocos: rebater na raquete, quicar só num par de bordas, a largura e a altura da
 * tela, e mover com as setas ↑ ↓.
 *
 * ⭐ O rebate é o que mais importa: no exemplo Pong ele eram ~220 linhas de IR na
 * mão, e as três coisas que faziam ele funcionar por acaso (guarda de aproximação,
 * correção de posição, teto de velocidade) agora estão no motor e têm teste.
 */

interface Sprite {
  x: number
  y: number
  w: number
  h: number
  vx?: number
  vy?: number
}

interface Api {
  setupStage: (w: number, h: number, bg: string) => void
  createSprite: (o: Partial<Sprite>) => Sprite
  paddleBounce: (bola: Sprite, raquete: Sprite, acelerar: number) => void
  bounceOnEdgePair: (s: Sprite, ctx: unknown, bordas: string) => void
  arrowsY: (s: Sprite, velocidade: number) => void
  stageWidth: () => number
  stageHeight: () => number
  fitScreen: (percent: number) => void
  keys: Record<string, boolean>
}

function carregar() {
  const ouvintes: Record<string, Array<(ev: unknown) => void>> = {}
  const win = {
    addEventListener(nome: string, fn: (ev: unknown) => void) {
      ouvintes[nome] ??= []
      ouvintes[nome].push(fn)
    },
    performance: { now: () => 0 },
    devicePixelRatio: 1,
    SZGame2D: undefined,
  } as unknown as Record<string, unknown>
  new Function('window', 'requestAnimationFrame', gameTwoDRuntime)(win, () => 0)
  const api = (win as { SZGame2D: Api }).SZGame2D
  /** Dispara a tecla DE VERDADE, para exercitar o mapa físico → semântico. */
  const teclar = (key: string, tipo: 'keydown' | 'keyup' = 'keydown') => {
    for (const fn of ouvintes[tipo] ?? []) fn({ key, code: key, preventDefault() {} })
  }
  return Object.assign(api, { teclar })
}

/** Um `ctx` com palco de 400×300, que é o que os quiques leem. */
function palco(api: Api) {
  api.setupStage(400, 300, '#000')
  return { canvas: { width: 400, height: 300 } }
}

const velocidade = (s: Sprite) => Math.hypot(s.vx ?? 0, s.vy ?? 0)

describe('rebater na raquete', () => {
  /** Raquete em pé à esquerda (Pong) e a bola chegando por cima dela. */
  function pong(deslocamento = 16, vx = -4) {
    const api = carregar()
    const raquete = api.createSprite({ x: 20, y: 100, w: 12, h: 44 })
    const bola = api.createSprite({ x: 26, y: 100 + deslocamento, w: 12, h: 12 })
    bola.vx = vx
    bola.vy = 0
    return { api, raquete, bola }
  }

  it('devolve a bola e a EMPURRA para fora da raquete', () => {
    const { api, raquete, bola } = pong()
    api.paddleBounce(bola, raquete, 0)
    expect(bola.vx ?? 0).toBeGreaterThan(0)
    // Correção de posição: ela não fica meio quadro dentro da raquete.
    expect(bola.x).toBe(raquete.x + raquete.w)
  })

  it('⭐ chamado DUAS vezes no mesmo contato não gruda a bola', () => {
    // Sem a guarda de aproximação o segundo quadro inverteria de novo e a bola
    // ficaria vibrando dentro da raquete — o sintoma clássico de Pong travado.
    const { api, raquete, bola } = pong()
    api.paddleBounce(bola, raquete, 0)
    const depoisDoPrimeiro = bola.vx ?? 0
    api.paddleBounce(bola, raquete, 0)
    expect(bola.vx ?? 0).toBe(depoisDoPrimeiro)
  })

  it('⭐ o ângulo sai do PONTO do impacto', () => {
    const naBeirada = pong(-6)
    naBeirada.api.paddleBounce(naBeirada.bola, naBeirada.raquete, 0)
    const noMeio = pong(16)
    noMeio.api.paddleBounce(noMeio.bola, noMeio.raquete, 0)
    const naOutra = pong(38)
    naOutra.api.paddleBounce(naOutra.bola, naOutra.raquete, 0)

    expect(naBeirada.bola.vy ?? 0).toBeLessThan(0)
    expect(naOutra.bola.vy ?? 0).toBeGreaterThan(0)
    expect(Math.abs(noMeio.bola.vy ?? 0)).toBeLessThan(Math.abs(naBeirada.bola.vy ?? 0))
    expect(Math.abs(noMeio.bola.vy ?? 0)).toBeLessThan(Math.abs(naOutra.bola.vy ?? 0))
  })

  it('acelerar N% aumenta a velocidade; 0 preserva', () => {
    const parado = pong()
    const antes = velocidade(parado.bola)
    parado.api.paddleBounce(parado.bola, parado.raquete, 0)
    expect(velocidade(parado.bola)).toBeCloseTo(antes, 5)

    const rapido = pong()
    rapido.api.paddleBounce(rapido.bola, rapido.raquete, 25)
    expect(velocidade(rapido.bola)).toBeCloseTo(antes * 1.25, 5)
  })

  it('⭐⭐ o teto de velocidade impede a bola de ATRAVESSAR a raquete', () => {
    // 200 rebatidas acelerando 50% cada: sem teto a bola passaria de 24 px por
    // quadro (a espessura da raquete + o lado da bola) e sumiria do jogo.
    const { api, raquete, bola } = pong()
    for (let vez = 0; vez < 200; vez += 1) {
      bola.x = raquete.x + raquete.w - 2
      bola.y = raquete.y + 16
      bola.vx = -Math.abs(bola.vx ?? 4)
      api.paddleBounce(bola, raquete, 50)
    }
    expect(velocidade(bola)).toBeLessThanOrEqual(raquete.w + bola.w)
  })

  it('raquete DEITADA reflete no outro eixo (é o Breakout)', () => {
    const api = carregar()
    const raquete = api.createSprite({ x: 100, y: 260, w: 60, h: 12 })
    const bola = api.createSprite({ x: 124, y: 254, w: 12, h: 12 })
    bola.vx = 0
    bola.vy = 4
    api.paddleBounce(bola, raquete, 0)
    expect(bola.vy ?? 0).toBeLessThan(0)
    expect(bola.y).toBe(raquete.y - bola.h)
  })

  /**
   * ⚠️ O que a criança faz e nenhum teste "normal" cobre. Todos passaram na
   * primeira medição; ficam travados porque a próxima mexida no rebate pode
   * quebrá-los sem quebrar mais nada.
   */
  it('⭐ casos degenerados não produzem NaN nem prendem a bola', () => {
    const api = carregar()

    // Bola PARADA encostando: sai a 1 de velocidade, empurrada para fora.
    const raquete = api.createSprite({ x: 20, y: 100, w: 12, h: 44 })
    const parada = api.createSprite({ x: 26, y: 118, w: 12, h: 12 })
    parada.vx = 0
    parada.vy = 0
    api.paddleBounce(parada, raquete, 4)
    expect(Number.isFinite(parada.vx ?? Number.NaN)).toBe(true)
    expect(velocidade(parada)).toBeGreaterThan(0)
    expect(parada.x).toBe(raquete.x + raquete.w)

    // Raquete QUADRADA: o empate manda pelo eixo em que a bola vinha mais rápido.
    const quadrada = api.createSprite({ x: 100, y: 100, w: 20, h: 20 })
    const rasante = api.createSprite({ x: 92, y: 105, w: 12, h: 12 })
    rasante.vx = 5
    rasante.vy = 1
    api.paddleBounce(rasante, quadrada, 0)
    expect(rasante.vx ?? 0).toBeLessThan(0)

    // Bola MAIOR que a raquete (acontece quando ela mexe nos tamanhos).
    const pequena = api.createSprite({ x: 100, y: 100, w: 8, h: 8 })
    const gigante = api.createSprite({ x: 96, y: 96, w: 40, h: 40 })
    gigante.vx = -3
    gigante.vy = 0
    api.paddleBounce(gigante, pequena, 4)
    expect(gigante.vx ?? 0).toBeGreaterThan(0)
    expect(Number.isFinite(gigante.x)).toBe(true)

    // Velocidade absurda digitada no soquete: o teto anti-túnel segura.
    const foguete = api.createSprite({ x: 26, y: 118, w: 12, h: 12 })
    foguete.vx = -9999
    foguete.vy = 0
    api.paddleBounce(foguete, raquete, 50)
    // O teto é "espessura da raquete + lado da bola": o deslocamento máximo em que
    // ela ainda não consegue pular por cima da raquete entre dois quadros.
    expect(velocidade(foguete)).toBeCloseTo(raquete.w + foguete.w, 6)
  })

  it('sem encostar, não faz nada', () => {
    const api = carregar()
    const raquete = api.createSprite({ x: 20, y: 100, w: 12, h: 44 })
    const bola = api.createSprite({ x: 300, y: 100, w: 12, h: 12 })
    bola.vx = -4
    bola.vy = 1
    api.paddleBounce(bola, raquete, 30)
    expect(bola.vx).toBe(-4)
    expect(bola.vy).toBe(1)
    expect(bola.x).toBe(300)
  })
})

describe('quicar só num par de bordas', () => {
  it('no teto e no chão: devolve, CORRIGE a posição e não toca no eixo x', () => {
    const api = carregar()
    const ctx = palco(api)
    const bola = api.createSprite({ x: 100, y: -5, w: 12, h: 12 })
    bola.vx = 3
    bola.vy = -4
    api.bounceOnEdgePair(bola, ctx, 'top-bottom')
    expect(bola.y).toBe(0)
    expect(bola.vy).toBe(4)
    // O par aberto é a razão de o bloco existir: é por ele que a bola sai e vira ponto.
    expect(bola.x).toBe(100)
    expect(bola.vx).toBe(3)

    bola.y = 300 - 12 + 3
    bola.vy = 5
    api.bounceOnEdgePair(bola, ctx, 'top-bottom')
    expect(bola.y + bola.h).toBe(300)
    expect(bola.vy).toBe(-5)
  })

  it('nas laterais: o espelho, sem tocar no eixo y', () => {
    const api = carregar()
    const ctx = palco(api)
    const bola = api.createSprite({ x: -4, y: 150, w: 12, h: 12 })
    bola.vx = -3
    bola.vy = 2
    api.bounceOnEdgePair(bola, ctx, 'left-right')
    expect(bola.x).toBe(0)
    expect(bola.vx).toBe(3)
    expect(bola.y).toBe(150)
    expect(bola.vy).toBe(2)
  })

  it('⚠️ a bola NUNCA fica fora do palco, mesmo indo rápido', () => {
    // É o defeito que o quique feito à mão tinha: sem correção de posição ela
    // vazava `|vy| − 1` px, e piorava conforme acelerava.
    const api = carregar()
    const ctx = palco(api)
    const bola = api.createSprite({ x: 100, y: 150, w: 12, h: 12 })
    bola.vx = 0
    bola.vy = -19
    for (let quadro = 0; quadro < 120; quadro += 1) {
      bola.y += bola.vy ?? 0
      api.bounceOnEdgePair(bola, ctx, 'top-bottom')
      expect(bola.y).toBeGreaterThanOrEqual(0)
      expect(bola.y + bola.h).toBeLessThanOrEqual(300)
    }
  })
})

describe('a largura e a altura da tela', () => {
  it('devolvem o tamanho do "Preparar o jogo"', () => {
    const api = carregar()
    palco(api)
    expect(api.stageWidth()).toBe(400)
    expect(api.stageHeight()).toBe(300)
  })

  it('⭐ continuam LÓGICAS depois do fitScreen (não viram o buffer)', () => {
    // Com a tela ampliada o canvas real fica maior para ganhar nitidez; a criança
    // precisa do número em que ela desenha, não do número de pixels da tela dela.
    const api = carregar()
    palco(api)
    api.fitScreen(100)
    expect(api.stageWidth()).toBe(400)
    expect(api.stageHeight()).toBe(300)
  })
})

describe('mover com as setas ↑ ↓', () => {
  it('sobe, desce e grava a velocidade; parado é zero', () => {
    const api = carregar()
    const raquete = api.createSprite({ x: 20, y: 100, w: 12, h: 44 })

    api.keys.up = true
    api.arrowsY(raquete, 5)
    expect(raquete.y).toBe(95)
    expect(raquete.vy).toBe(-5)
    api.keys.up = false

    api.keys.down = true
    api.arrowsY(raquete, 5)
    expect(raquete.y).toBe(100)
    expect(raquete.vy).toBe(5)
    api.keys.down = false

    api.arrowsY(raquete, 5)
    expect(raquete.y).toBe(100)
    expect(raquete.vy).toBe(0)
  })

  it('⭐ vale para W e S também — é a camada semântica, não a tecla crua', () => {
    // O Pong de hoje lê `keyDown('ArrowUp')` direto, então no WASD (e no pad de
    // toque) a raquete não anda. Aqui a tecla é disparada DE VERDADE.
    const api = carregar()
    const raquete = api.createSprite({ x: 20, y: 100, w: 12, h: 44 })

    api.teclar('w')
    api.arrowsY(raquete, 4)
    expect(raquete.y).toBe(96)
    api.teclar('w', 'keyup')

    api.teclar('s')
    api.arrowsY(raquete, 4)
    expect(raquete.y).toBe(100)
  })

  it('a seta de verdade também move (o caminho de sempre segue valendo)', () => {
    const api = carregar()
    const raquete = api.createSprite({ x: 20, y: 100, w: 12, h: 44 })
    api.teclar('ArrowUp')
    api.arrowsY(raquete, 5)
    expect(raquete.y).toBe(95)
  })

  it('não mexe no eixo x', () => {
    const api = carregar()
    const raquete = api.createSprite({ x: 20, y: 100, w: 12, h: 44 })
    api.keys.up = true
    api.arrowsY(raquete, 5)
    expect(raquete.x).toBe(20)
    expect(raquete.vx ?? 0).toBe(0)
  })
})
