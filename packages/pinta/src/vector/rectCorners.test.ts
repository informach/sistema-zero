/**
 * Os cantos do retângulo, canto a canto (30/09/2026). O que se cobra aqui: a normalização
 * (iguais → só `rx`, diferentes → `corners` + `rx` = o maior), o clamp, a identidade quando
 * nada muda, e a geometria dos quatro arcos que `svg.ts`, `pathNodes.ts` e `flatten.ts` compõem.
 */
import { describe, expect, it } from 'bun:test'
import type { VectorShape } from './model'
import {
  ALL_CORNERS,
  clampCornerRadii,
  maskFromRadii,
  QUARTER_CIRCLE_KAPPA,
  radiiForMask,
  radiiFromMask,
  rectCornerArcs,
  rectCornerFields,
  rectCornerRadii,
  toggleCornerMask,
  withRectCorners,
} from './rectCorners'

type RectShape = Extract<VectorShape, { type: 'rect' }>

const base = { id: 'r1', fill: '#78dc52', stroke: null, opacity: 1, rotation: 0 } as const

function rect(over: Partial<RectShape> = {}): RectShape {
  return { ...base, type: 'rect', x: 0, y: 0, w: 100, h: 60, rx: 0, ...over }
}

describe('rectCornerFields (o normalizador único)', () => {
  it('quatro raios iguais viram só `rx`, sem a chave `corners`', () => {
    const fields = rectCornerFields([4, 4, 4, 4], 100, 60)
    expect(fields.rx).toBe(4)
    // ⚠️ `undefined` explícito já seria uma chave no JSON: a chave tem que NÃO existir.
    expect('corners' in fields).toBe(false)
  })

  it('raios diferentes guardam a tupla e o `rx` vira o MAIOR (um leitor antigo arredonda os quatro com ele)', () => {
    const input = [4, 0, 4, 0] as const
    const fields = rectCornerFields(input, 100, 60)
    expect(fields.rx).toBe(4)
    expect(fields.corners).toEqual([4, 0, 4, 0])
    // Tupla NOVA: o clone raso dos quadros compartilha arrays, então nunca devolvemos a de entrada.
    expect(fields.corners).not.toBe(input)
  })

  it('clampa cada raio à metade do menor lado, e o clamp pode igualar os quatro', () => {
    expect(clampCornerRadii([50, 10, -3, Number.NaN], 100, 20)).toEqual([10, 10, 0, 0])
    // 40 e 99 passam dos 10 de teto: os quatro viram 10 e colapsam em `rx`.
    const fields = rectCornerFields([40, 99, 10, 10], 100, 20)
    expect(fields).toEqual({ rx: 10 })
  })
})

describe('rectCornerRadii (os raios efetivos)', () => {
  it('sem `corners`, os quatro são o `rx` clampado', () => {
    expect(rectCornerRadii(rect({ rx: 8 }))).toEqual([8, 8, 8, 8])
    expect(rectCornerRadii(rect({ rx: 99, w: 10, h: 30 }))).toEqual([5, 5, 5, 5])
  })

  it('com `corners`, são eles (clampados)', () => {
    expect(rectCornerRadii(rect({ rx: 8, corners: [8, 0, 0, 0] }))).toEqual([8, 0, 0, 0])
  })
})

describe('withRectCorners', () => {
  it('devolve a MESMA referência quando nada muda (o updateFree não grava desfazer vazio)', () => {
    const uniform = rect({ rx: 8 })
    expect(withRectCorners(uniform, [8, 8, 8, 8])).toBe(uniform)
    const mixed = rect({ rx: 8, corners: [8, 0, 8, 0] })
    expect(withRectCorners(mixed, [8, 0, 8, 0])).toBe(mixed)
  })

  it('tira a chave `corners` quando os raios voltam a ser iguais', () => {
    const mixed = rect({ rx: 8, corners: [8, 0, 8, 0] })
    const back = withRectCorners(mixed, [8, 8, 8, 8])
    expect(back).not.toBe(mixed)
    expect(back.rx).toBe(8)
    expect('corners' in back).toBe(false)
  })

  it('escreve `corners` e o `rx` maior quando passam a diferir', () => {
    const next = withRectCorners(rect({ rx: 8 }), [8, 8, 0, 8])
    expect(next.rx).toBe(8)
    expect(next.corners).toEqual([8, 8, 0, 8])
  })
})

describe('máscara ⇄ raios', () => {
  it('radiiFromMask dá o raio aos ligados e zero aos desligados; maskFromRadii lê de volta', () => {
    const radii = radiiFromMask([true, false, true, false], 6)
    expect(radii).toEqual([6, 0, 6, 0])
    expect(maskFromRadii(radii)).toEqual([true, false, true, false])
    expect(radiiFromMask(ALL_CORNERS, 3)).toEqual([3, 3, 3, 3])
  })

  it('toggleCornerMask inverte UM canto e devolve tupla nova', () => {
    const toggled = toggleCornerMask(ALL_CORNERS, 'br')
    expect(toggled).toEqual([true, true, false, true])
    expect(ALL_CORNERS).toEqual([true, true, true, true])
    expect(toggleCornerMask(toggled, 'br')).toEqual(ALL_CORNERS)
  })

  it('radiiForMask mantém o raio de quem já era redondo, dá o fallback a quem liga e zera quem desliga', () => {
    expect(radiiForMask([8, 0, 8, 0], [true, true, false, false], 12)).toEqual([8, 12, 0, 0])
  })
})

describe('rectCornerArcs (a geometria que svg/pathNodes/flatten compõem)', () => {
  it('canto redondo: tangências, controles com o kappa, centro e ângulo de partida', () => {
    const [tl, tr, br, bl] = rectCornerArcs(rect({ rx: 10, corners: [10, 0, 0, 0] }))
    expect(tl.corner).toBe('tl')
    expect(tl.radius).toBe(10)
    expect(tl.point).toEqual({ x: 0, y: 0 })
    expect(tl.from).toEqual({ x: 0, y: 10 })
    expect(tl.to).toEqual({ x: 10, y: 0 })
    expect(tl.center).toEqual({ x: 10, y: 10 })
    expect(tl.startAngle).toBe(Math.PI)
    const k = 10 * QUARTER_CIRCLE_KAPPA
    expect(tl.c1).toEqual({ x: 0, y: 10 - k })
    expect(tl.c2).toEqual({ x: 10 - k, y: 0 })
    // Cantos retos: tudo cai na própria quina.
    for (const arc of [tr, br, bl]) {
      expect(arc.radius).toBe(0)
      expect(arc.from).toEqual(arc.point)
      expect(arc.to).toEqual(arc.point)
    }
    expect(tr.point).toEqual({ x: 100, y: 0 })
    expect(br.point).toEqual({ x: 100, y: 60 })
    expect(bl.point).toEqual({ x: 0, y: 60 })
  })

  it('os quatro redondos batem com o retângulo de sempre (mesmos centros do anel antigo)', () => {
    const [tl, tr, br, bl] = rectCornerArcs(rect({ rx: 10 }))
    expect(tr.center).toEqual({ x: 90, y: 10 })
    expect(tr.startAngle).toBe(-Math.PI / 2)
    expect(br.center).toEqual({ x: 90, y: 50 })
    expect(br.startAngle).toBe(0)
    expect(bl.center).toEqual({ x: 10, y: 50 })
    expect(bl.startAngle).toBe(Math.PI / 2)
    expect(tl.center).toEqual({ x: 10, y: 10 })
    // O fim de cada arco é o começo da aresta que leva ao próximo (sentido horário).
    expect(tl.to).toEqual({ x: 10, y: 0 })
    expect(tr.from).toEqual({ x: 90, y: 0 })
    expect(tr.to).toEqual({ x: 100, y: 10 })
    expect(br.from).toEqual({ x: 100, y: 50 })
    expect(br.to).toEqual({ x: 90, y: 60 })
    expect(bl.from).toEqual({ x: 10, y: 60 })
    expect(bl.to).toEqual({ x: 0, y: 50 })
    expect(tl.from).toEqual({ x: 0, y: 10 })
  })

  it('caixa invertida (w ou h negativos) é normalizada antes', () => {
    const [tl] = rectCornerArcs(rect({ x: 100, y: 60, w: -100, h: -60, rx: 10 }))
    expect(tl.point).toEqual({ x: 0, y: 0 })
    expect(tl.to).toEqual({ x: 10, y: 0 })
  })
})
