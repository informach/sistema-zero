import { describe, expect, it } from 'bun:test'
import { DEFAULT_STYLE } from '../../../vector/shapes'
import {
  COPY_OFFSET,
  formatStrokeWidth,
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
    expect(COPY_OFFSET).toBe(12)
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
})
