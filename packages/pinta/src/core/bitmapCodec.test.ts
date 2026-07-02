import { describe, expect, it } from 'bun:test'
import { bmp, rows } from '../testing/fixtures'
import { decodeBitmap, encodeBitmap } from './bitmapCodec'
import { createBitmap } from './project'

describe('bitmapCodec (RLE + base64 do .pinta.json)', () => {
  it('round-trip de bitmap com desenho', () => {
    const original = bmp(['12321', '.....', 'fff..'])
    const decoded = decodeBitmap(encodeBitmap(original))
    expect(decoded).not.toBeNull()
    if (!decoded) return
    expect(rows(decoded)).toEqual(rows(original))
  })

  it('bitmap vazio grande fica MINÚSCULO em RLE', () => {
    const empty = createBitmap(480, 360)
    const encoded = encodeBitmap(empty)
    // 172800 pixels zerados → ~680 runs de 255 → ~1.4K chars em base64.
    expect(encoded.rle.length).toBeLessThan(3000)
    const decoded = decodeBitmap(encoded)
    expect(decoded?.data.length).toBe(480 * 360)
    expect(decoded?.data.every((v) => v === 0)).toBe(true)
  })

  it('run maior que 255 quebra em pedaços e round-trippa', () => {
    const wide = createBitmap(300, 1)
    wide.data.fill(7)
    const decoded = decodeBitmap(encodeBitmap(wide))
    expect(decoded?.data.every((v) => v === 7)).toBe(true)
  })

  it('registro corrompido → null (nunca lança)', () => {
    expect(decodeBitmap(null)).toBeNull()
    expect(decodeBitmap({ width: 2, height: 2 })).toBeNull()
    expect(decodeBitmap({ width: 2, height: 2, rle: '%%%inválido' })).toBeNull()
    // RLE que não fecha a conta de pixels.
    expect(decodeBitmap({ width: 10, height: 10, rle: btoa('\x02\x01') })).toBeNull()
  })
})
