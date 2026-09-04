import { describe, expect, it } from 'bun:test'
import { boundsUnion, shapeBounds } from '../../../vector/geometry'
import type { VectorShape } from '../../../vector/model'
import { DEFAULT_STYLE } from '../../../vector/shapes'
import {
  formatStrokeWidth,
  occupiedBoundsOf,
  offsetInsideDoc,
  STROKE_WIDTHS,
  strokeDotSize,
  strokeWidthIndex,
} from './vectorTools'

describe('espessuras do contorno (vetor)', () => {
  it('são seis degraus crescentes de meio em meio, e o default está entre eles', () => {
    expect([...STROKE_WIDTHS]).toEqual([0.5, 1, 1.5, 2, 2.5, 3])
    for (let i = 1; i < STROKE_WIDTHS.length; i += 1) {
      expect(STROKE_WIDTHS[i] as number).toBeGreaterThan(STROKE_WIDTHS[i - 1] as number)
    }
    const defaultWidth = DEFAULT_STYLE.stroke?.width
    expect(defaultWidth).toBeDefined()
    const widths: readonly number[] = STROKE_WIDTHS
    expect(widths).toContain(defaultWidth as number)
  })

  it('cada preset cai no próprio degrau e um valor entre dois arredonda para cima', () => {
    STROKE_WIDTHS.forEach((width, index) => {
      expect(strokeWidthIndex(width)).toBe(index)
    })
    expect(strokeWidthIndex(0.75)).toBe(1)
    expect(strokeWidthIndex(0.1)).toBe(0)
  })

  it('espessura de desenho antigo (4/6/8) clampa no ÚLTIMO degrau, nunca no primeiro', () => {
    // Anti-vácuo do bug do slider: o `findIndex` devolvia -1 e o `Math.max(-1, 0)`
    // mostrava o traço mais FINO para um traço grosso.
    for (const legacy of [4, 6, 8, 64]) {
      expect(strokeWidthIndex(legacy)).toBe(STROKE_WIDTHS.length - 1)
    }
  })

  it('formata com vírgula, sem casa decimal fantasma', () => {
    expect(formatStrokeWidth(0.5)).toBe('0,5')
    expect(formatStrokeWidth(1)).toBe('1')
    expect(formatStrokeWidth(1.5)).toBe('1,5')
    expect(formatStrokeWidth(8)).toBe('8')
    // Ruído de ponto flutuante de um legado "sujo" não vira rótulo.
    expect(formatStrokeWidth(0.1 + 0.2)).toBe('0,3')
  })

  it('as bolinhas da caixa crescem de 2 em 2 px e cabem no botão de 44px', () => {
    expect(STROKE_WIDTHS.map(strokeDotSize)).toEqual([6, 8, 10, 12, 14, 16])
  })
})

describe('offsetInsideDoc (a cópia nasce do lado, mas DENTRO do papel)', () => {
  const papel = { width: 32, height: 32 }

  it('cabendo, a cópia vai para +12,+12 (a régua de sempre)', () => {
    expect(offsetInsideDoc({ x: 2, y: 2, width: 8, height: 8 }, papel)).toEqual({ dx: 12, dy: 12 })
  })

  it('perto da borda direita/inferior, volta para -12 em vez de sair do papel', () => {
    // 20 + 8 + 12 = 40 > 32: para a direita sairia; 20 - 12 = 8 cabe.
    expect(offsetInsideDoc({ x: 20, y: 20, width: 8, height: 8 }, papel)).toEqual({
      dx: -12,
      dy: -12,
    })
  })

  it('os eixos são independentes', () => {
    expect(offsetInsideDoc({ x: 2, y: 20, width: 8, height: 8 }, papel)).toEqual({
      dx: 12,
      dy: -12,
    })
  })

  it('forma maior que o papel: fica +12 (parcialmente fora, mas não em cima do original)', () => {
    expect(offsetInsideDoc({ x: 0, y: 0, width: 32, height: 32 }, papel)).toEqual({
      dx: 12,
      dy: 12,
    })
  })

  it('num cenário grande a régua continua a de sempre', () => {
    expect(
      offsetInsideDoc({ x: 16, y: 16, width: 48, height: 48 }, { width: 480, height: 360 }),
    ).toEqual({ dx: 12, dy: 12 })
  })

  it('no meio de um papel pequeno anda a FOLGA que sobra (nem +12 nem -12 cabem)', () => {
    // Corpo de 16 em (8,8) num personagem de 32: 8+16+12 = 36 > 32 e 8-12 < 0.
    // Antes caía no "+12 mesmo" e a cópia nascia com 12 px para fora do papel.
    expect(offsetInsideDoc({ x: 8, y: 8, width: 16, height: 16 }, papel)).toEqual({ dx: 8, dy: 8 })
    // Peça de 16 px: 12×12 em (2,2) anda 2 e encosta na borda, inteira dentro.
    expect(
      offsetInsideDoc({ x: 2, y: 2, width: 12, height: 12 }, { width: 16, height: 16 }),
    ).toEqual({ dx: 2, dy: 2 })
    // Folga só para trás: encostada na frente, volta o que dá.
    expect(offsetInsideDoc({ x: 6, y: 6, width: 26, height: 26 }, papel)).toEqual({
      dx: -6,
      dy: -6,
    })
  })

  it('ninguém nasce EM CIMA de quem já está lá: a segunda cópia vai para o próximo lugar livre', () => {
    // O olho em (8,8) é a cópia do de (20,20): +12 cairia exatamente em cima do
    // original (a régua oscilava entre dois lugares e "duplicar não fazia nada").
    const olho = { x: 8, y: 8, width: 8, height: 8 }
    const original = { x: 20, y: 20, width: 8, height: 8 }
    expect(offsetInsideDoc(olho, papel, [original])).toEqual({ dx: -8, dy: -8 })
    // Cruzadas depois das diagonais: com (0,0) também ocupado, vai para (20,0).
    expect(offsetInsideDoc(olho, papel, [original, { ...original, x: 0, y: 0 }])).toEqual({
      dx: 12,
      dy: -8,
    })
    // Tudo ocupado: fica o primeiro candidato (em cima, mas visível e dentro).
    const todos = [original, { ...original, x: 0, y: 0 }, { ...original, x: 20, y: 0 }]
    expect(offsetInsideDoc(olho, papel, [...todos, { ...original, x: 0, y: 20 }])).toEqual({
      dx: 12,
      dy: 12,
    })
    // Caixa parecida não é caixa igual (tolerância de meio pixel).
    expect(offsetInsideDoc(olho, papel, [{ ...original, width: 9 }])).toEqual({ dx: 12, dy: 12 })
  })

  it('fora do papel, união vazia ou papel sem medida: degrada para o +12 de sempre', () => {
    // Pendurada à esquerda/em cima: +12 traz para dentro.
    expect(offsetInsideDoc({ x: -5, y: -5, width: 4, height: 4 }, papel)).toEqual({
      dx: 12,
      dy: 12,
    })
    // Inteira à direita/embaixo: só cabe voltar.
    expect(offsetInsideDoc({ x: 40, y: 40, width: 4, height: 4 }, papel)).toEqual({
      dx: -12,
      dy: -12,
    })
    expect(offsetInsideDoc(boundsUnion([]), papel)).toEqual({ dx: 12, dy: 12 })
    expect(
      offsetInsideDoc(
        { x: 2, y: 2, width: 8, height: 8 },
        { width: Number.NaN, height: Number.NaN },
      ),
    ).toEqual({ dx: 12, dy: 12 })
  })
})

describe('occupiedBoundsOf (as caixas que a cópia evita)', () => {
  const rect = (id: string, x: number, groupId?: string): VectorShape =>
    ({
      id,
      type: 'rect',
      x,
      y: 0,
      w: 10,
      h: 10,
      rx: 0,
      fill: '#000000',
      stroke: null,
      opacity: 1,
      rotation: 0,
      ...(groupId ? { groupId } : {}),
    }) as VectorShape

  it('cada forma e, por cima, a UNIÃO de cada grupo', () => {
    const caixas = occupiedBoundsOf([rect('a', 0), rect('b', 20, 'g'), rect('c', 40, 'g')])
    expect(caixas).toEqual([
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 20, y: 0, width: 10, height: 10 },
      { x: 40, y: 0, width: 10, height: 10 },
      { x: 20, y: 0, width: 30, height: 10 },
    ])
  })

  it('a cópia de um grupo não nasce em cima do próprio grupo', () => {
    const grupo = [rect('b', 20, 'g'), rect('c', 40, 'g')]
    const uniao = boundsUnion(grupo.map(shapeBounds))
    // +12 cabe (20+30+12 = 62 ≤ 480) e não coincide com ninguém: +12.
    expect(offsetInsideDoc(uniao, { width: 480, height: 360 }, occupiedBoundsOf(grupo))).toEqual({
      dx: 12,
      dy: 12,
    })
    // A cópia já existente em (32,12): a próxima vai para outro lugar (o grupo
    // encosta no topo, então só a coluna muda de lado).
    const copia = [rect('d', 32, 'h'), rect('e', 52, 'h')].map((s) => ({ ...s, y: 12 }))
    expect(
      offsetInsideDoc(uniao, { width: 480, height: 360 }, occupiedBoundsOf([...grupo, ...copia])),
    ).toEqual({ dx: -12, dy: 12 })
  })
})
