import { describe, expect, it } from 'bun:test'
import { bmp, rows } from '../testing/fixtures'
import { flipHorizontal } from './ops'
import {
  cropBitmap,
  extractSelection,
  hasPaintedPixel,
  normalizeRect,
  stampSelection,
} from './selection'

describe('seleção retangular', () => {
  it('normalizeRect clampa e aceita cantos em qualquer ordem', () => {
    const base = bmp(['...', '...', '...'])
    expect(normalizeRect(base, { x: 5, y: 5 }, { x: 1, y: 1 })).toEqual({
      x: 1,
      y: 1,
      width: 2,
      height: 2,
    })
  })

  it('extract deixa o buraco; stamp devolve (round-trip)', () => {
    const base = bmp(['12.', '34.', '...'])
    const rect = { x: 0, y: 0, width: 2, height: 2 }
    const { remaining, floating } = extractSelection(base, rect)
    expect(rows(remaining)).toEqual(['...', '...', '...'])
    expect(rows(floating.bitmap)).toEqual(['12', '34'])
    expect(rows(stampSelection(remaining, floating))).toEqual(rows(base))
  })

  it('stamp em outra posição, transparente não apaga o fundo', () => {
    const base = bmp(['1.', '..'])
    const { remaining, floating } = extractSelection(base, { x: 0, y: 0, width: 2, height: 1 })
    const background = bmp(['55', '55'])
    void remaining
    const stamped = stampSelection(background, { ...floating, x: 0, y: 1 })
    expect(rows(stamped)).toEqual(['55', '15'])
  })

  it('stamp corta o que sai dos limites', () => {
    const floating = { bitmap: bmp(['11', '11']), x: 1, y: 1 }
    const out = stampSelection(bmp(['..', '..']), floating)
    expect(rows(out)).toEqual(['..', '.1'])
  })

  it('crop copia o pedaço SEM furar a origem (o copiar)', () => {
    const base = bmp(['12.', '34.', '...'])
    const cut = cropBitmap(base, { x: 0, y: 0, width: 2, height: 2 })
    expect(rows(cut)).toEqual(['12', '34'])
    // O desenho continua inteiro — é cópia, não recorte.
    expect(rows(base)).toEqual(['12.', '34.', '...'])
  })

  it('área só de fundo não conta como pedaço selecionável', () => {
    const base = bmp(['1...', '....', '....'])
    expect(hasPaintedPixel(base, { x: 0, y: 0, width: 2, height: 2 })).toBe(true)
    expect(hasPaintedPixel(base, { x: 2, y: 0, width: 2, height: 3 })).toBe(false)
  })

  it('copiar → espelhar → colar do lado monta o outro lado do desenho', () => {
    // A asa da nave: metade desenhada, a outra sai de duplicar + espelhar.
    const base = bmp(['12..', '34..', '....'])
    const wing = cropBitmap(base, { x: 0, y: 0, width: 2, height: 2 })
    const mirrored = flipHorizontal(wing)
    expect(rows(mirrored)).toEqual(['21', '43'])
    expect(rows(stampSelection(base, { bitmap: mirrored, x: 2, y: 0 }))).toEqual([
      '1221',
      '3443',
      '....',
    ])
  })
})
