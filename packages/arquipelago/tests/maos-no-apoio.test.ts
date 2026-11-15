import { describe, expect, test } from 'bun:test'
import { AVATAR_CATALOG } from '@sistemazero/avatar-quarto/avatar/pack-catalog'
import { Bone, Group, Object3D, Vector3 } from 'three'
import {
  apoioDaEscada,
  type BracosDoAvatar,
  CORRECAO_MAXIMA,
  maoAgarrada,
  maoNoApoio,
  pontoMaisPerto,
} from '../src/personagem/maos-no-apoio'

const clipe = (id: string) => AVATAR_CATALOG.base.skeleton.game.clips.find((c) => c.id === id)

describe('que mão está agarrada no quadro do clipe', () => {
  test('pendurada na borda, as duas mãos o tempo todo', () => {
    const c = clipe('pendurar_borda')
    for (const t of [0, 0.5, 1.9]) {
      expect(maoAgarrada(c, t, 'esquerda')).toBe(true)
      expect(maoAgarrada(c, t, 'direita')).toBe(true)
    }
  })

  test('janela que dá a volta no laço, e clipe sem mãos', () => {
    const laco = {
      id: 'x',
      duration: 1,
      loop: true,
      stride: 0,
      rise: 0,
      frames: 40,
      feet: [],
      hands: [{ hand: 'right' as const, on: 30, off: 10 }],
    }
    expect(maoAgarrada(laco as never, 0.9, 'direita')).toBe(true) // quadro 36
    expect(maoAgarrada(laco as never, 0.1, 'direita')).toBe(true) // quadro 4
    expect(maoAgarrada(laco as never, 0.5, 'direita')).toBe(false) // quadro 20
    expect(maoAgarrada(laco as never, 0.9, 'esquerda')).toBe(false)
    expect(maoAgarrada(clipe('parado_relaxado'), 1, 'direita')).toBe(false)
    expect(maoAgarrada(undefined, 1, 'direita')).toBe(false)
  })
})

describe('os apoios', () => {
  test('o ponto do segmento mais perto (dentro e nas pontas)', () => {
    const a = { x: 0, y: 1, z: 0 }
    const b = { x: 2, y: 1, z: 0 }
    expect(pontoMaisPerto(a, b, { x: 1, y: 2, z: 3 }, new Vector3()).toArray()).toEqual([1, 1, 0])
    expect(pontoMaisPerto(a, b, { x: -5, y: 0, z: 0 }, new Vector3()).toArray()).toEqual([0, 1, 0])
    expect(pontoMaisPerto(a, a, { x: 3, y: 3, z: 3 }, new Vector3()).toArray()).toEqual([0, 1, 0])
  })

  test('a escada: os dois montantes, a meia largura do eixo, de baixo a cima', () => {
    const { segmentos } = apoioDaEscada({
      base: { x: 0, y: 0, z: 0 },
      topo: { x: 0, y: 3, z: 1 },
      largura: 0.6,
    })
    expect(segmentos).toHaveLength(2)
    const xs = segmentos.map((s) => s.a.x).sort()
    expect(xs[0]).toBeCloseTo(-0.3)
    expect(xs[1]).toBeCloseTo(0.3)
    for (const s of segmentos) {
      expect(s.a.y).toBe(0)
      expect(s.b.y).toBe(3)
      expect(s.b.z).toBeCloseTo(1)
    }
  })
})

/** Um braço de 0,3 + 0,25 para baixo, com a palma 0,05 além do punho. */
function bracos(): { raiz: Group; b: BracosDoAvatar; palma: Object3D } {
  const raiz = new Group()
  const fazer = (x: number): [Bone, Bone, Bone, Object3D] => {
    const ombro = new Bone()
    const cotovelo = new Bone()
    const punho = new Bone()
    const palma = new Object3D()
    ombro.position.set(x, 1.5, 0)
    cotovelo.position.set(0, -0.3, 0)
    punho.position.set(0, -0.25, 0)
    palma.position.set(0, -0.05, 0)
    raiz.add(ombro)
    ombro.add(cotovelo)
    cotovelo.add(punho)
    punho.add(palma)
    return [ombro, cotovelo, punho, palma]
  }
  const b = { esquerda: fazer(0.2), direita: fazer(-0.2) }
  raiz.updateMatrixWorld(true)
  return { raiz, b, palma: b.direita[3] }
}

describe('a mão vai ao apoio', () => {
  test('perto: a palma chega à linha; sem peso, nada muda', () => {
    const { raiz, b, palma } = bracos()
    const antes = palma.getWorldPosition(new Vector3())
    // A palma está em (-0.2, 0.9, 0); a linha passa 0,1 acima, na frente do corpo.
    const apoio = { segmentos: [{ a: { x: -1, y: 1, z: 0.05 }, b: { x: 1, y: 1, z: 0.05 } }] }
    expect(maoNoApoio(b, 'direita', raiz, apoio, 0)).toBe(0)
    expect(palma.getWorldPosition(new Vector3()).distanceTo(antes)).toBeLessThan(1e-9)
    expect(maoNoApoio(b, 'direita', raiz, apoio, 1)).toBeGreaterThan(0)
    const depois = palma.getWorldPosition(new Vector3())
    expect(depois.y).toBeCloseTo(1, 2)
    expect(depois.z).toBeCloseTo(0.05, 2)
  })

  test('longe demais (mais que a correção máxima): é outro apoio, a pose fica', () => {
    const { raiz, b, palma } = bracos()
    const antes = palma.getWorldPosition(new Vector3())
    const y = antes.y + CORRECAO_MAXIMA + 0.1
    const apoio = { segmentos: [{ a: { x: -1, y, z: 0 }, b: { x: 1, y, z: 0 } }] }
    expect(maoNoApoio(b, 'direita', raiz, apoio, 1)).toBe(0)
    expect(palma.getWorldPosition(new Vector3()).distanceTo(antes)).toBeLessThan(1e-9)
  })
})
