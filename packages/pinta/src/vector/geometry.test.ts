import { describe, expect, it } from 'bun:test'
import {
  alignShapes,
  boundsCenter,
  boundsIntersect,
  boundsUnion,
  parsePathD,
  rotatePoint,
  rotateShapesAround,
  rotateShapeTo,
  scaleShape,
  setTextAlign,
  shapeBounds,
  translateShape,
} from './geometry'
import type { VectorShape } from './model'

const base = { id: 's1', fill: '#ff0000', stroke: null, opacity: 1, rotation: 0 }

const rect: VectorShape = { ...base, type: 'rect', x: 10, y: 20, w: 30, h: 40, rx: 0 }
const ellipse: VectorShape = { ...base, type: 'ellipse', cx: 50, cy: 50, rx: 10, ry: 20 }
const line: VectorShape = { ...base, type: 'line', x1: 0, y1: 0, x2: 10, y2: 10 }
const polygon: VectorShape = {
  ...base,
  type: 'polygon',
  points: [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 5, y: 10 },
  ],
}
const path: VectorShape = { ...base, type: 'path', d: 'M 0 0 C 1 1 2 2 10 10' }
const text: VectorShape = { ...base, type: 'text', x: 5, y: 30, text: 'oi', fontSize: 20 }

describe('parsePathD', () => {
  it('aceita o NOSSO formato (M/L/C/Z absolutos)', () => {
    expect(parsePathD('M 0 0 L 5 5 Z')?.commands).toHaveLength(3)
  })

  it('recusa comandos relativos/desconhecidos (fica quieto)', () => {
    expect(parsePathD('m 0 0 l 5 5')).toBeNull()
    expect(parsePathD('M 0 0 Q 1 1 2 2')).toBeNull()
  })
})

describe('shapeBounds', () => {
  it('caixa por tipo', () => {
    expect(shapeBounds(rect)).toEqual({ x: 10, y: 20, width: 30, height: 40 })
    expect(shapeBounds(ellipse)).toEqual({ x: 40, y: 30, width: 20, height: 40 })
    expect(shapeBounds(polygon)).toEqual({ x: 0, y: 0, width: 10, height: 10 })
    expect(shapeBounds(path)).toEqual({ x: 0, y: 0, width: 10, height: 10 })
    expect(boundsCenter(shapeBounds(rect))).toEqual({ x: 25, y: 40 })
  })
})

describe('translateShape', () => {
  it('move todos os tipos (inclusive o `d` do path)', () => {
    expect(translateShape(rect, 5, -5)).toMatchObject({ x: 15, y: 15 })
    expect(translateShape(ellipse, 1, 1)).toMatchObject({ cx: 51, cy: 51 })
    expect(translateShape(line, 2, 3)).toMatchObject({ x1: 2, y1: 3, x2: 12, y2: 13 })
    const movedPolygon = translateShape(polygon, 1, 1)
    expect(movedPolygon.type === 'polygon' && movedPolygon.points[0]).toEqual({ x: 1, y: 1 })
    const movedPath = translateShape(path, 10, 0)
    expect(movedPath.type === 'path' && movedPath.d).toBe('M 10 0 C 11 1 12 2 20 10')
    expect(translateShape(text, 5, 5)).toMatchObject({ x: 10, y: 35 })
  })
})

describe('scaleShape', () => {
  it('escala em torno da âncora', () => {
    const scaled = scaleShape(rect, { x: 10, y: 20 }, 2, 0.5)
    expect(scaled).toMatchObject({ x: 10, y: 20, w: 60, h: 20 })
    const scaledPath = scaleShape(path, { x: 0, y: 0 }, 2, 2)
    expect(scaledPath.type === 'path' && scaledPath.d).toBe('M 0 0 C 2 2 4 4 20 20')
  })

  it('fator degenerado não colapsa (mínimo 5%)', () => {
    const scaled = scaleShape(rect, { x: 10, y: 20 }, 0, 0)
    expect(scaled.type === 'rect' && scaled.w).toBeGreaterThan(0)
  })

  it('texto escala o fontSize com teto', () => {
    const scaled = scaleShape(text, { x: 0, y: 0 }, 100, 100)
    expect(scaled.type === 'text' && scaled.fontSize).toBe(200)
  })
})

describe('rotateShapeTo', () => {
  it('normaliza para 0–360', () => {
    expect(rotateShapeTo(rect, 370).rotation).toBe(10)
    expect(rotateShapeTo(rect, -90).rotation).toBe(270)
  })
})

describe('rotatePoint', () => {
  it('gira em torno do centro (90° leva (1,0)→(0,1) relativo)', () => {
    const p = rotatePoint({ x: 1, y: 0 }, { x: 0, y: 0 }, 90)
    expect(p.x).toBeCloseTo(0, 5)
    expect(p.y).toBeCloseTo(1, 5)
  })

  it('0° devolve cópia igual', () => {
    expect(rotatePoint({ x: 3, y: 4 }, { x: 1, y: 1 }, 0)).toEqual({ x: 3, y: 4 })
  })
})

describe('rotateShapesAround (girar a seleção inteira)', () => {
  /** Dois quadrados lado a lado: A em (0..20), B em (40..60), mesma altura. */
  const a: VectorShape = { ...base, id: 'a', type: 'rect', x: 0, y: 0, w: 20, h: 20, rx: 0 }
  const b: VectorShape = { ...base, id: 'b', type: 'rect', x: 40, y: 0, w: 20, h: 20, rx: 0 }
  const pair = [a, b]
  const pivot = boundsCenter(boundsUnion(pair.map(shapeBounds)))

  it('180° troca os dois de lugar e soma 180 na rotação de cada um', () => {
    const [ra, rb] = rotateShapesAround(pair, ['a', 'b'], pivot, 180) as [VectorShape, VectorShape]
    expect(boundsCenter(shapeBounds(ra))).toEqual(boundsCenter(shapeBounds(b)))
    expect(boundsCenter(shapeBounds(rb))).toEqual(boundsCenter(shapeBounds(a)))
    expect(ra.rotation).toBe(180)
    expect(rb.rotation).toBe(180)
  })

  it('cada centro vai parar exatamente onde o rotatePoint manda', () => {
    const out = rotateShapesAround(pair, ['a', 'b'], pivot, 90)
    for (const [i, shape] of out.entries()) {
      const original = pair[i]
      if (!original) throw new Error('fixture')
      const esperado = rotatePoint(boundsCenter(shapeBounds(original)), pivot, 90)
      const obtido = boundsCenter(shapeBounds(shape))
      expect(obtido.x).toBeCloseTo(esperado.x, 6)
      expect(obtido.y).toBeCloseTo(esperado.y, 6)
    }
  })

  it('COMPÕE com quem já estava girado (40 + 25 = 65)', () => {
    const girado: VectorShape = { ...a, rotation: 40 }
    const [out] = rotateShapesAround([girado, b], ['a'], pivot, 25) as [VectorShape]
    expect(out.rotation).toBe(65)
    // Folga de 0.01: o deslocamento é arredondado em 2 casas (round2), a mesma
    // régua do translateShape — meio centésimo de pixel não existe no desenho.
    const esperado = rotatePoint(boundsCenter(shapeBounds(girado)), pivot, 25)
    expect(boundsCenter(shapeBounds(out)).x).toBeCloseTo(esperado.x, 2)
  })

  it('com UMA forma é o rotateShapeTo de sempre: a geometria não é tocada', () => {
    // O pivô É o centro dela, então não há órbita — este é o caminho do giro
    // individual, que não pode ter mudado.
    const soA = boundsCenter(shapeBounds(a))
    const [out] = rotateShapesAround([a], ['a'], soA, 30) as [VectorShape]
    expect(out).toEqual(rotateShapeTo(a, 30))
    // Identidade preservada nos campos de geometria (nada foi re-serializado).
    if (out.type !== 'rect') throw new Error('tipo')
    expect([out.x, out.y, out.w, out.h]).toEqual([0, 0, 20, 20])
  })

  it('quem está fora da lista sai IDÊNTICO (mesma referência)', () => {
    const out = rotateShapesAround(pair, ['a'], pivot, 45)
    expect(out[1]).toBe(b)
  })

  it('0° não mexe em nada', () => {
    const out = rotateShapesAround(pair, ['a', 'b'], pivot, 0)
    expect(out[0]).toBe(a)
    expect(out[1]).toBe(b)
  })

  it('um traço continua no nosso dialeto depois de orbitar', () => {
    const p: VectorShape = { ...path, id: 'p' }
    const [out] = rotateShapesAround([p], ['p'], { x: 100, y: 100 }, 90) as [VectorShape]
    if (out.type !== 'path') throw new Error('tipo')
    expect(parsePathD(out.d)).not.toBeNull()
    expect(out.rotation).toBe(90)
  })
})

describe('flipShape', () => {
  it('espelha rect/linha em torno do centro e inverte a rotação', async () => {
    const { flipShape, shapeBounds, boundsCenter } = await import('./geometry')
    const rect = {
      id: 'r',
      type: 'rect' as const,
      x: 0,
      y: 0,
      w: 10,
      h: 4,
      rx: 0,
      fill: '#ff2121',
      stroke: null,
      opacity: 1,
      rotation: 30,
    }
    const center = boundsCenter(shapeBounds(rect))
    const flipped = flipShape(rect, 'h', center)
    // Em torno do próprio centro, o rect volta ao MESMO box; a rotação inverte.
    expect(shapeBounds(flipped)).toEqual(shapeBounds(rect))
    expect(flipped.rotation).toBe(330)

    const line = {
      id: 'l',
      type: 'line' as const,
      x1: 0,
      y1: 0,
      x2: 10,
      y2: 4,
      fill: 'none',
      stroke: { color: '#000000', width: 2 },
      opacity: 1,
      rotation: 0,
    }
    const flippedLine = flipShape(line, 'h', { x: 5, y: 2 })
    if (flippedLine.type !== 'line') throw new Error('linha esperada')
    expect(flippedLine.x1).toBe(10)
    expect(flippedLine.x2).toBe(0)
    expect(flippedLine.y1).toBe(0)
  })
})

describe('boundsUnion / boundsIntersect (seleção múltipla e laço)', () => {
  it('união envolve todas as caixas', () => {
    const union = boundsUnion([
      { x: 10, y: 20, width: 30, height: 40 },
      { x: 50, y: 0, width: 10, height: 10 },
    ])
    expect(union).toEqual({ x: 10, y: 0, width: 50, height: 60 })
  })

  it('união de lista vazia é a caixa nula', () => {
    expect(boundsUnion([])).toEqual({ x: 0, y: 0, width: 0, height: 0 })
  })

  it('intersecção detecta sobreposição e borda encostada; separadas não', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 }
    expect(boundsIntersect(a, { x: 5, y: 5, width: 10, height: 10 })).toBe(true)
    expect(boundsIntersect(a, { x: 10, y: 0, width: 5, height: 5 })).toBe(true)
    expect(boundsIntersect(a, { x: 11, y: 0, width: 5, height: 5 })).toBe(false)
  })
})

describe('alignShapes (alinhar seleção)', () => {
  const target = { x: 0, y: 0, width: 100, height: 100 }

  it('alinha duas formas na esquerda do alvo', () => {
    const a: VectorShape = { ...base, id: 'a', type: 'rect', x: 10, y: 0, w: 10, h: 10, rx: 0 }
    const b: VectorShape = { ...base, id: 'b', type: 'rect', x: 40, y: 20, w: 20, h: 10, rx: 0 }
    const result = alignShapes([a, b], ['a', 'b'], 'left', target)
    expect(result[0]).toMatchObject({ x: 0 })
    expect(result[1]).toMatchObject({ x: 0 })
  })

  it('centraliza uma forma na largura da tela', () => {
    const a: VectorShape = { ...base, id: 'a', type: 'rect', x: 10, y: 0, w: 20, h: 10, rx: 0 }
    const result = alignShapes([a], ['a'], 'centerH', target)
    expect(result[0]).toMatchObject({ x: 40 })
  })

  it('alinha embaixo e no meio da altura', () => {
    const a: VectorShape = { ...base, id: 'a', type: 'rect', x: 0, y: 10, w: 10, h: 20, rx: 0 }
    expect(alignShapes([a], ['a'], 'bottom', target)[0]).toMatchObject({ y: 80 })
    expect(alignShapes([a], ['a'], 'middleV', target)[0]).toMatchObject({ y: 40 })
  })

  it('grupo é transladado INTEIRO (offsets internos preservados)', () => {
    const a: VectorShape = {
      ...base,
      id: 'a',
      groupId: 'g',
      type: 'rect',
      x: 20,
      y: 0,
      w: 10,
      h: 10,
      rx: 0,
    }
    const b: VectorShape = {
      ...base,
      id: 'b',
      groupId: 'g',
      type: 'rect',
      x: 40,
      y: 0,
      w: 10,
      h: 10,
      rx: 0,
    }
    const result = alignShapes([a, b], ['a', 'b'], 'left', target)
    // O cluster (20..50) vai para 0: a→0, b→20 (distância interna de 20 mantida).
    expect(result[0]).toMatchObject({ x: 0 })
    expect(result[1]).toMatchObject({ x: 20 })
  })

  it('forma fora da seleção não se move', () => {
    const a: VectorShape = { ...base, id: 'a', type: 'rect', x: 10, y: 0, w: 10, h: 10, rx: 0 }
    const c: VectorShape = { ...base, id: 'c', type: 'rect', x: 70, y: 0, w: 10, h: 10, rx: 0 }
    const result = alignShapes([a, c], ['a'], 'left', target)
    expect(result[1]).toMatchObject({ x: 70 })
  })
})

describe('caixa do texto: várias linhas e âncora', () => {
  const t = (over: Partial<Extract<VectorShape, { type: 'text' }>> = {}): VectorShape => ({
    ...base,
    type: 'text',
    x: 100,
    y: 50,
    text: 'oi',
    fontSize: 20,
    ...over,
  })

  it('uma linha em Nunito usa o fator determinístico da família', () => {
    const b = shapeBounds(t({ text: 'abcd' }))
    expect(b).toEqual({ x: 100, y: 30, width: 4 * 20 * 0.56, height: 20 * 1.2 })
  })

  it('a linha mais LARGA manda na largura e a altura conta as linhas', () => {
    const b = shapeBounds(t({ text: 'ab\nabcdef\nabc' }))
    expect(b.width).toBe(6 * 20 * 0.56)
    expect(b.height).toBe(3 * 20 * 1.2)
  })

  it('a âncora desloca a caixa: esquerda, meio e direita', () => {
    const largura = 4 * 20 * 0.56
    expect(shapeBounds(t({ text: 'abcd' })).x).toBe(100)
    expect(shapeBounds(t({ text: 'abcd', align: 'center' })).x).toBe(100 - largura / 2)
    expect(shapeBounds(t({ text: 'abcd', align: 'right' })).x).toBe(100 - largura)
  })

  it('famílias largas e estreitas produzem bounds diferentes', () => {
    const nunito = shapeBounds(t({ text: 'abcd', fontFamily: 'nunito' }))
    const pixel = shapeBounds(t({ text: 'abcd', fontFamily: 'press-start-2p' }))
    expect(pixel.width).toBeGreaterThan(nunito.width)
  })

  it('setTextAlign preserva a CAIXA: o bloco não pula de lugar', () => {
    const esquerda = t({ text: 'abcd' })
    const antes = shapeBounds(esquerda)
    for (const align of ['center', 'right', 'left'] as const) {
      const depois = shapeBounds(setTextAlign(esquerda, align))
      expect(depois).toEqual(antes)
    }
  })

  it("voltar para 'left' remove a chave (o padrão não se escreve)", () => {
    const centro = setTextAlign(t({ text: 'abcd' }), 'center')
    expect('align' in centro).toBe(true)
    expect('align' in setTextAlign(centro, 'left')).toBe(false)
  })

  it('espelhar um texto à DIREITA espelha a caixa, não solta o texto', async () => {
    const { flipShape } = await import('./geometry')
    const direita = t({ text: 'abcd', align: 'right' })
    const centro = { x: 200, y: 0 }
    const b = shapeBounds(direita)
    const espelhado = shapeBounds(flipShape(direita, 'h', centro))
    expect(espelhado.x).toBeCloseTo(2 * centro.x - (b.x + b.width), 6)
    expect(espelhado.width).toBe(b.width)
  })
})
