/**
 * Forma → anéis (08/2026). Aqui se cobram DOIS números: quantos segmentos uma
 * curva vira (a resolução) e onde fica o pivô da rotação (que tem que ser o
 * mesmo do render, senão a mistura não bate com o desenho).
 */
import { describe, expect, it } from 'bun:test'
import { arcSegments, CHORD_TOLERANCE, cubicSegments, shapeToPoly } from './flatten'
import { boundsCenter, rotatePoint, shapeBounds } from './geometry'
import type { VectorShape } from './model'
import { signedArea } from './polygonClip'

const base = { id: 's1', fill: '#ff2121', stroke: null, opacity: 1, rotation: 0 } as const

function ok(shape: VectorShape, tol = CHORD_TOLERANCE) {
  const r = shapeToPoly(shape, tol)
  if (!r.ok) throw new Error(`esperava achatar, veio ${r.reason}`)
  return r.poly
}

describe('a régua de segmentos', () => {
  it('⭐ um círculo de 100px vira 50 segmentos', () => {
    // O número da mesa: raio 50, tolerância 0.1 → Δθ = √(0.8/50) = 0.1265 rad.
    expect(arcSegments(50, Math.PI * 2, 0.1)).toBe(50)
    const poly = ok({ ...base, type: 'ellipse', cx: 50, cy: 50, rx: 50, ry: 50 })
    expect(poly[0]).toHaveLength(50)
  })

  it('⚠️ ANTI-VÁCUO: a tolerância MANDA no número de segmentos', () => {
    // Se o argumento fosse ignorado, os dois dariam 50 e o teste de cima
    // estaria provando só que a elipse vira algum polígono.
    const grosso = ok({ ...base, type: 'ellipse', cx: 50, cy: 50, rx: 50, ry: 50 }, 0.4)
    expect(grosso[0]).toHaveLength(25)
    expect(grosso[0]?.length).toBeLessThan(50)
  })

  it('a corda fica DENTRO da tolerância prometida', () => {
    const poly = ok({ ...base, type: 'ellipse', cx: 0, cy: 0, rx: 50, ry: 50 })
    const ring = poly[0] ?? []
    for (let i = 0; i < ring.length; i += 1) {
      const a = ring[i]
      const b = ring[(i + 1) % ring.length]
      if (!a || !b) continue
      const meio = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      // A sagita é o quanto o meio da corda afunda para dentro do círculo.
      expect(50 - Math.hypot(meio.x, meio.y)).toBeLessThanOrEqual(CHORD_TOLERANCE)
    }
  })

  it('a cúbica reta não gasta segmento à toa', () => {
    const reta = cubicSegments(
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
      { x: 30, y: 0 },
      0.1,
    )
    expect(reta).toBe(1)
    const torta = cubicSegments(
      { x: 0, y: 0 },
      { x: 0, y: 60 },
      { x: 60, y: 60 },
      { x: 60, y: 0 },
      0.1,
    )
    expect(torta).toBeGreaterThan(10)
  })
})

describe('cada forma vira anel', () => {
  it('o retângulo vira 4 pontos, no sentido de área POSITIVA', () => {
    const poly = ok({ ...base, type: 'rect', x: 10, y: 20, w: 30, h: 40, rx: 0 })
    expect(poly[0]).toEqual([
      { x: 10, y: 20 },
      { x: 40, y: 20 },
      { x: 40, y: 60 },
      { x: 10, y: 60 },
    ])
    expect(signedArea(poly[0] ?? [])).toBe(1200)
  })

  it('⭐ cantos arredondados viram arcos e a CAIXA continua exata', () => {
    // As pontas do arco são os pontos de tangência, então a caixa do anel bate
    // com o retângulo declarado. É uma asserção forte e de graça.
    const poly = ok({ ...base, type: 'rect', x: 0, y: 0, w: 100, h: 60, rx: 10 })
    const ring = poly[0] ?? []
    expect(ring.length).toBeGreaterThan(20)
    const xs = ring.map((p) => p.x)
    const ys = ring.map((p) => p.y)
    expect(Math.min(...xs)).toBeCloseTo(0, 6)
    expect(Math.max(...xs)).toBeCloseTo(100, 6)
    expect(Math.min(...ys)).toBeCloseTo(0, 6)
    expect(Math.max(...ys)).toBeCloseTo(60, 6)
    // E o canto arredondado tira área do quadrado: (4-π)r² = 21.46.
    // ⚠️ O anel é INSCRITO no arco, então ele fica um tiquinho MENOR que a
    // conta exata: cada gomo perde (r²/2)(θ - sen θ), e são 24 gomos = 3.58.
    // Cobrar igualdade exata aqui seria cobrar que o achatamento não achata.
    const exato = 6000 - (4 - Math.PI) * 100
    expect(signedArea(ring)).toBeLessThan(exato)
    expect(1 - signedArea(ring) / exato).toBeLessThan(0.001)
  })

  it('o traço com vários sub-caminhos vira vários anéis', () => {
    // É assim que um resultado de mistura (com furo) volta a ser operando.
    const poly = ok({
      ...base,
      type: 'path',
      d: 'M 0 0 L 10 0 L 10 10 L 0 10 Z M 3 3 L 7 3 L 7 7 L 3 7 Z',
    })
    expect(poly).toHaveLength(2)
    expect(poly[0]).toHaveLength(4)
    expect(poly[1]).toHaveLength(4)
  })

  it('traço ABERTO fecha sozinho, como o SVG faz ao pintar', () => {
    const poly = ok({ ...base, type: 'path', d: 'M 0 0 L 10 0 L 10 10' })
    expect(poly[0]).toHaveLength(3)
    expect(Math.abs(signedArea(poly[0] ?? []))).toBe(50)
  })

  it('linha, texto e figura são RECUSADOS', () => {
    const linha = shapeToPoly({ ...base, type: 'line', x1: 0, y1: 0, x2: 10, y2: 10 })
    expect(linha).toEqual({ ok: false, reason: 'no-area' })
    const texto = shapeToPoly({ ...base, type: 'text', x: 0, y: 0, text: 'oi', fontSize: 12 })
    expect(texto).toEqual({ ok: false, reason: 'unsupported-shape' })
    const figura = shapeToPoly({
      ...base,
      type: 'image',
      x: 0,
      y: 0,
      w: 8,
      h: 8,
      src: 'data:image/png;base64,AA',
    })
    expect(figura).toEqual({ ok: false, reason: 'unsupported-shape' })
  })

  it('`d` fora do dialeto é recusado em vez de virar caixa zerada', () => {
    expect(shapeToPoly({ ...base, type: 'path', d: 'M 0 0 A 5 5 0 0 1 10 10' })).toEqual({
      ok: false,
      reason: 'bad-path',
    })
  })
})

describe('⭐⭐ a rotação é ASSADA, com o pivô do render', () => {
  it('o retângulo girado sai nas coordenadas que o svg.ts desenharia', () => {
    const girado: VectorShape = {
      ...base,
      type: 'rect',
      x: 0,
      y: 0,
      w: 40,
      h: 20,
      rx: 0,
      rotation: 30,
    }
    const pivo = boundsCenter(shapeBounds(girado))
    const poly = ok(girado)
    const esperado = [
      { x: 0, y: 0 },
      { x: 40, y: 0 },
      { x: 40, y: 20 },
      { x: 0, y: 20 },
    ].map((p) => rotatePoint(p, pivo, 30))
    poly[0]?.forEach((p, i) => {
      expect(p.x).toBeCloseTo(esperado[i]?.x ?? 0, 9)
      expect(p.y).toBeCloseTo(esperado[i]?.y ?? 0, 9)
    })
    // ⚠️ ANTI-VÁCUO: girar 30 graus TEM que mover os pontos.
    expect(poly[0]?.[0]?.x).not.toBeCloseTo(0, 3)
  })

  it('⚠️ o pivô é o do `shapeBounds`, INCLUSIVE quando ele mente', () => {
    // O `shapeBounds` de um traço inclui os pontos de CONTROLE, então a caixa
    // dele é maior que a curva. Isso é "errado" no abstrato e CERTO aqui: o
    // render usa a mesma caixa, e a mistura precisa bater com o desenho.
    // Esta rede reprova no dia em que alguém "consertar" o shapeBounds.
    const curva: VectorShape = {
      ...base,
      type: 'path',
      d: 'M 0 0 C 0 100 100 100 100 0',
      rotation: 90,
    }
    const pivoDoRender = boundsCenter(shapeBounds(curva))
    expect(pivoDoRender.y).toBeCloseTo(50, 6) // casco dos controles: 0..100
    const poly = ok(curva)
    const primeiro = poly[0]?.[0]
    const esperado = rotatePoint({ x: 0, y: 0 }, pivoDoRender, 90)
    expect(primeiro?.x).toBeCloseTo(esperado.x, 6)
    expect(primeiro?.y).toBeCloseTo(esperado.y, 6)
    // ⚠️ ANTI-VÁCUO: o pivô da curva DE VERDADE (altura 75) daria outro ponto.
    const pivoDaCurva = { x: 50, y: 37.5 }
    const outro = rotatePoint({ x: 0, y: 0 }, pivoDaCurva, 90)
    expect(primeiro?.y).not.toBeCloseTo(outro.y, 3)
  })

  it('sem rotação, os pontos saem intactos (nada de conta à toa)', () => {
    const poly = ok({
      ...base,
      type: 'polygon',
      points: [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
        { x: 5, y: 1 },
      ],
    })
    expect(poly[0]).toEqual([
      { x: 1, y: 2 },
      { x: 3, y: 4 },
      { x: 5, y: 1 },
    ])
  })
})
