import { describe, expect, it } from 'bun:test'
import { gameTwoDRuntime } from '../runtime'

/**
 * A CAIXA DE COLISÃO medida no desenho (08/2026).
 *
 * O caso que originou isto: uma nave de 128 × 32 desenhada num quadro 128 × 128
 * levava 96px de vazio para o jogo, e o vazio encostava sem encostar. O Pinta
 * mede onde de fato tem pixel e manda a caixa em FRAÇÃO do quadro pelo mesmo
 * `__SZGAME_ASSET_META` do mapa; aqui só se prova que o runtime a aplica.
 */

interface Sprite {
  x: number
  y: number
  w: number
  h: number
  facing?: number
  direction?: string
}
interface Api {
  createSprite: (o: Partial<Sprite> & { image?: string }) => Sprite
  setImage: (s: Sprite, name: string) => void
  setShape: (s: Sprite, name: string) => void
  defineShape: (name: string, draw: () => void) => void
  loadSpriteSheet: (name: string, w: number, h: number) => unknown
  setAnimation: (s: Sprite, sheet: unknown, from: number, to: number, fps: number) => void
  setHitboxScale: (s: Sprite, percent: number) => void
  isColliding: (a: Sprite, b: Sprite) => boolean
}

/** Uma nave deitada: 128 de largura por 32 de altura, centrada no quadro. */
const NAVE = { x: 0, y: 0.375, w: 1, h: 0.25 }

function load(meta?: Record<string, unknown>): Api {
  const win = {
    addEventListener() {},
    SZGame2D: undefined,
    performance: { now: () => 0 },
    __SZGAME_ASSETS: { nave: 'data:image/png;base64,AA', heroi: 'data:image/png;base64,AA' },
    __SZGAME_ASSET_META: meta,
    Image: class {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_v: string) {}
    },
  } as unknown as Record<string, unknown>
  new Function('window', 'requestAnimationFrame', gameTwoDRuntime)(win, () => 0)
  return win.SZGame2D as Api
}

describe('caixa de colisão medida no desenho', () => {
  it('⭐ o vazio do quadro deixa de encostar', () => {
    const api = load({ nave: { hitbox: NAVE } })
    const nave = api.createSprite({ x: 0, y: 0, w: 128, h: 128, image: 'nave' })
    // Tiro passando pela FAIXA VAZIA de cima (y 0..48 do quadro): não é acerto.
    const tiroPorCima = api.createSprite({ x: 60, y: 10, w: 4, h: 4 })
    // Tiro na altura da nave (y 48..80): é acerto.
    const tiroNoCasco = api.createSprite({ x: 60, y: 60, w: 4, h: 4 })
    expect(api.isColliding(nave, tiroPorCima)).toBe(false)
    expect(api.isColliding(nave, tiroNoCasco)).toBe(true)
  })

  it('⚠️ ANTI-VÁCUO: sem o metadado, o mesmo tiro por cima ACERTA', () => {
    // A metade que tem que falhar. Se esta passasse junto com a de cima, o teste
    // acima estaria medindo outra coisa (posição, tamanho) e não a caixa.
    const api = load()
    const nave = api.createSprite({ x: 0, y: 0, w: 128, h: 128, image: 'nave' })
    const tiroPorCima = api.createSprite({ x: 60, y: 10, w: 4, h: 4 })
    expect(api.isColliding(nave, tiroPorCima)).toBe(true)
  })

  it('⭐⭐ o dial "área de colisão de N%" VENCE a caixa automática', () => {
    // 100% é a ÚNICA saída de quem discorda da medição: volta ao quadro inteiro.
    const api = load({ nave: { hitbox: NAVE } })
    const nave = api.createSprite({ x: 0, y: 0, w: 128, h: 128, image: 'nave' })
    const tiroPorCima = api.createSprite({ x: 60, y: 10, w: 4, h: 4 })
    expect(api.isColliding(nave, tiroPorCima)).toBe(false)
    api.setHitboxScale(nave, 100)
    expect(api.isColliding(nave, tiroPorCima)).toBe(true)
  })

  it('a caixa acompanha o TAMANHO em que o sprite foi posto no jogo', () => {
    // Fração e não pixel: o mesmo desenho a 64 de lado tem a faixa na metade.
    const api = load({ nave: { hitbox: NAVE } })
    const pequena = api.createSprite({ x: 0, y: 0, w: 64, h: 64, image: 'nave' })
    const naFaixa = api.createSprite({ x: 30, y: 30, w: 2, h: 2 })
    const acimaDaFaixa = api.createSprite({ x: 30, y: 5, w: 2, h: 2 })
    expect(api.isColliding(pequena, naFaixa)).toBe(true)
    expect(api.isColliding(pequena, acimaDaFaixa)).toBe(false)
  })

  it('⭐ a caixa ESPELHA quando o herói olha para a esquerda', () => {
    // Espada só do lado direito do quadro: virar o herói tem que virar a caixa.
    const api = load({ heroi: { hitbox: { x: 0.5, y: 0, w: 0.5, h: 1 } } })
    const heroi = api.createSprite({ x: 0, y: 0, w: 100, h: 100, image: 'heroi' })
    const aDireita = api.createSprite({ x: 70, y: 40, w: 4, h: 4 })
    const aEsquerda = api.createSprite({ x: 20, y: 40, w: 4, h: 4 })
    expect(api.isColliding(heroi, aDireita)).toBe(true)
    expect(api.isColliding(heroi, aEsquerda)).toBe(false)

    heroi.facing = -1
    expect(api.isColliding(heroi, aDireita)).toBe(false)
    expect(api.isColliding(heroi, aEsquerda)).toBe(true)
  })

  it('⚠️ a caixa espelha pela MESMA regra do desenho, não por facing sozinho', () => {
    // Achado do full review. O renderizador vira por
    //   direction === 'left' || (!direction && facing === -1)
    // e os inimigos (enemies.ts:487,670,724,803,825) escrevem `facing` SOZINHO.
    // Um inimigo que já andou para a direita fica com direction 'right'; ao mirar
    // o herói ele põe facing = -1, o desenho NÃO vira, e a caixa não pode virar.
    const api = load({ heroi: { hitbox: { x: 0.5, y: 0, w: 0.5, h: 1 } } })
    const inimigo = api.createSprite({ x: 0, y: 0, w: 100, h: 100, image: 'heroi' })
    inimigo.direction = 'right'
    inimigo.facing = -1
    const aDireita = api.createSprite({ x: 70, y: 40, w: 4, h: 4 })
    expect(api.isColliding(inimigo, aDireita)).toBe(true)

    // E quando o desenho DE FATO vira (direction 'left'), a caixa vira junto.
    inimigo.direction = 'left'
    expect(api.isColliding(inimigo, aDireita)).toBe(false)
  })

  it('trocar de imagem troca a caixa; virar FIGURA volta ao quadro inteiro', () => {
    const api = load({ nave: { hitbox: NAVE } })
    const s = api.createSprite({ x: 0, y: 0, w: 128, h: 128 })
    const porCima = api.createSprite({ x: 60, y: 10, w: 4, h: 4 })
    expect(api.isColliding(s, porCima)).toBe(true)

    api.setImage(s, 'nave')
    expect(api.isColliding(s, porCima)).toBe(false)

    api.defineShape('bola', () => {})
    api.setShape(s, 'bola')
    expect(api.isColliding(s, porCima)).toBe(true)
  })

  it('a ANIMAÇÃO herda a caixa pelo nome da folha', () => {
    const api = load({ nave: { hitbox: NAVE } })
    const s = api.createSprite({ x: 0, y: 0, w: 128, h: 128 })
    const porCima = api.createSprite({ x: 60, y: 10, w: 4, h: 4 })
    expect(api.isColliding(s, porCima)).toBe(true)

    api.setAnimation(s, api.loadSpriteSheet('nave', 128, 128), 0, 1, 8)
    expect(api.isColliding(s, porCima)).toBe(false)
  })

  it('metadado torto é IGNORADO — o sprite volta a colidir pelo quadro', () => {
    // Degradar é melhor que uma caixa que ninguém consegue explicar. Cada linha
    // é um jeito de estar errado: fora do quadro, sem área, e não-número.
    const tortos = [
      { x: 0.5, y: 0, w: 0.9, h: 1 },
      { x: 0, y: 0, w: 0, h: 1 },
      { x: -0.1, y: 0, w: 0.5, h: 1 },
      { x: 'meio', y: 0, w: 0.5, h: 1 },
    ]
    for (const hitbox of tortos) {
      const api = load({ nave: { hitbox } })
      const nave = api.createSprite({ x: 0, y: 0, w: 128, h: 128, image: 'nave' })
      const canto = api.createSprite({ x: 120, y: 120, w: 4, h: 4 })
      expect(api.isColliding(nave, canto)).toBe(true)
    }
  })
})
