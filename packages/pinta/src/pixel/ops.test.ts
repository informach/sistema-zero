import { describe, expect, it } from 'bun:test'
import { bmp, rows } from '../testing/fixtures'
import {
  clearBitmap,
  drawEllipse,
  drawLine,
  drawRect,
  drawStroke,
  flipHorizontal,
  flipVertical,
  floodFill,
  removeColorIndex,
  replaceColor,
  rotate90,
  shift,
} from './ops'

const empty5 = () => bmp(['.....', '.....', '.....', '.....', '.....'])

describe('drawStroke (lápis)', () => {
  it('ponto único com pincel 1', () => {
    const out = drawStroke(empty5(), { x: 2, y: 2 }, { x: 2, y: 2 }, { color: 1, size: 1 })
    expect(rows(out)).toEqual(['.....', '.....', '..1..', '.....', '.....'])
  })

  it('não muta a entrada (pura)', () => {
    const base = empty5()
    drawStroke(base, { x: 0, y: 0 }, { x: 4, y: 4 }, { color: 1, size: 1 })
    expect(rows(base)).toEqual(['.....', '.....', '.....', '.....', '.....'])
  })

  it('pincel 3 carimba 3×3 centrado', () => {
    const out = drawStroke(empty5(), { x: 2, y: 2 }, { x: 2, y: 2 }, { color: 2, size: 3 })
    expect(rows(out)).toEqual(['.....', '.222.', '.222.', '.222.', '.....'])
  })

  it('espelho ao vivo plota o gêmeo refletido', () => {
    const out = drawStroke(
      empty5(),
      { x: 1, y: 0 },
      { x: 1, y: 0 },
      { color: 1, size: 1, mirrorX: true },
    )
    expect(rows(out)).toEqual(['.1.1.', '.....', '.....', '.....', '.....'])
  })

  it('espelho vertical (mirrorY) reflete de cima pra baixo', () => {
    const out = drawStroke(
      empty5(),
      { x: 1, y: 0 },
      { x: 1, y: 0 },
      {
        color: 1,
        size: 1,
        mirrorY: true,
      },
    )
    expect(rows(out)).toEqual(['.1...', '.....', '.....', '.....', '.1...'])
  })

  it('mirrorX + mirrorY plota os 4 quadrantes', () => {
    const out = drawStroke(
      empty5(),
      { x: 1, y: 1 },
      { x: 1, y: 1 },
      {
        color: 1,
        size: 1,
        mirrorX: true,
        mirrorY: true,
      },
    )
    expect(rows(out)).toEqual(['.....', '.1.1.', '.....', '.1.1.', '.....'])
  })

  it('fora dos limites é no-op silencioso (bounds-check)', () => {
    const out = drawStroke(empty5(), { x: 0, y: 0 }, { x: 0, y: 0 }, { color: 1, size: 3 })
    expect(rows(out)).toEqual(['11...', '11...', '.....', '.....', '.....'])
  })
})

describe('drawLine', () => {
  it('diagonal de Bresenham', () => {
    const out = drawLine(empty5(), { x: 0, y: 0 }, { x: 4, y: 4 }, { color: 1, size: 1 })
    expect(rows(out)).toEqual(['1....', '.1...', '..1..', '...1.', '....1'])
  })

  it('horizontal', () => {
    const out = drawLine(empty5(), { x: 0, y: 2 }, { x: 4, y: 2 }, { color: 3, size: 1 })
    expect(rows(out)).toEqual(['.....', '.....', '33333', '.....', '.....'])
  })
})

describe('drawRect', () => {
  it('contorno', () => {
    const out = drawRect(empty5(), { x: 1, y: 1 }, { x: 3, y: 3 }, { color: 1, size: 1 })
    expect(rows(out)).toEqual(['.....', '.111.', '.1.1.', '.111.', '.....'])
  })

  it('preenchido, cantos em qualquer ordem', () => {
    const out = drawRect(
      empty5(),
      { x: 3, y: 3 },
      { x: 1, y: 1 },
      { color: 1, size: 1, filled: true },
    )
    expect(rows(out)).toEqual(['.....', '.111.', '.111.', '.111.', '.....'])
  })
})

describe('drawEllipse', () => {
  it('disco preenchido 5×5', () => {
    const out = drawEllipse(
      empty5(),
      { x: 0, y: 0 },
      { x: 4, y: 4 },
      { color: 1, size: 1, filled: true },
    )
    expect(rows(out)).toEqual(['..1..', '.111.', '11111', '.111.', '..1..'])
  })

  it('contorno 5×5 (anel de 1px)', () => {
    const out = drawEllipse(empty5(), { x: 0, y: 0 }, { x: 4, y: 4 }, { color: 1, size: 1 })
    expect(rows(out)).toEqual(['..1..', '.1.1.', '1...1', '.1.1.', '..1..'])
  })
})

describe('floodFill', () => {
  it('preenche região côncava (anel em volta do centro)', () => {
    const base = bmp(['11111', '1...1', '1.1.1', '1...1', '11111'])
    const out = floodFill(base, { x: 1, y: 1 }, 2)
    expect(rows(out)).toEqual(['11111', '12221', '12121', '12221', '11111'])
  })

  it('não vaza pela diagonal (conectividade-4)', () => {
    const base = bmp(['1.', '.1'])
    const out = floodFill(base, { x: 1, y: 0 }, 2)
    expect(rows(out)).toEqual(['12', '.1'])
  })

  it('cor igual à do alvo é no-op (mesma referência)', () => {
    const base = bmp(['1.', '..'])
    expect(floodFill(base, { x: 0, y: 0 }, 1)).toBe(base)
  })
})

describe('transformações de bitmap inteiro', () => {
  it('replaceColor troca sem contiguidade', () => {
    const out = replaceColor(bmp(['1.1', '.1.']), 1, 5)
    expect(rows(out)).toEqual(['5.5', '.5.'])
  })

  it('flipHorizontal / flipVertical', () => {
    const base = bmp(['12.', '..3'])
    expect(rows(flipHorizontal(base))).toEqual(['.21', '3..'])
    expect(rows(flipVertical(base))).toEqual(['..3', '12.'])
  })

  it('rotate90 horário troca largura/altura', () => {
    const base = bmp(['12', '34', '56'])
    const out = rotate90(base)
    expect(out.width).toBe(3)
    expect(out.height).toBe(2)
    expect(rows(out)).toEqual(['531', '642'])
  })

  it('shift com wrap', () => {
    const out = shift(bmp(['1..', '...', '..2']), 1, 1)
    expect(rows(out)).toEqual(['2..', '.1.', '...'])
  })

  it('clearBitmap zera tudo', () => {
    expect(rows(clearBitmap(bmp(['12', '34'])))).toEqual(['..', '..'])
  })

  it('removeColorIndex: igual vira transparente, maiores descem 1, menores intactos', () => {
    // Índices extras (≥16) não cabem no dialeto do bmp() — bitmap montado à mão.
    const base = { width: 5, height: 1, data: Uint8Array.from([3, 16, 17, 18, 0]) }
    const out = removeColorIndex(base, 17)
    expect(Array.from(out.data)).toEqual([3, 16, 0, 17, 0])
    // Original imutável.
    expect(Array.from(base.data)).toEqual([3, 16, 17, 18, 0])
  })
})
