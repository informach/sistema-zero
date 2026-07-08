import { describe, expect, it } from 'bun:test'
import { hexToHsv, hsvToHex, normalizeHex } from './color'

describe('normalizeHex', () => {
  it('deixa #rrggbb minúsculo', () => {
    expect(normalizeHex('#FF8800')).toBe('#ff8800')
    expect(normalizeHex('#abcdef')).toBe('#abcdef')
  })

  it('aceita sem # e com espaços', () => {
    expect(normalizeHex('ff8800')).toBe('#ff8800')
    expect(normalizeHex('  #FFFFFF  ')).toBe('#ffffff')
  })

  it('expande #rgb → #rrggbb', () => {
    expect(normalizeHex('#f80')).toBe('#ff8800')
    expect(normalizeHex('abc')).toBe('#aabbcc')
  })

  it('devolve null para lixo', () => {
    expect(normalizeHex('')).toBeNull()
    expect(normalizeHex('#12345')).toBeNull()
    expect(normalizeHex('nada')).toBeNull()
    expect(normalizeHex('#gggggg')).toBeNull()
  })
})

describe('hsvToHex — valores conhecidos', () => {
  it('primárias e neutros', () => {
    expect(hsvToHex({ h: 0, s: 1, v: 1 })).toBe('#ff0000')
    expect(hsvToHex({ h: 120, s: 1, v: 1 })).toBe('#00ff00')
    expect(hsvToHex({ h: 240, s: 1, v: 1 })).toBe('#0000ff')
    expect(hsvToHex({ h: 0, s: 0, v: 1 })).toBe('#ffffff')
    expect(hsvToHex({ h: 0, s: 0, v: 0 })).toBe('#000000')
  })

  it('corta componentes fora do range e normaliza a matiz', () => {
    expect(hsvToHex({ h: 360, s: 1, v: 1 })).toBe('#ff0000')
    expect(hsvToHex({ h: -120, s: 2, v: 5 })).toBe('#0000ff')
  })
})

describe('hexToHsv', () => {
  it('vermelho puro', () => {
    const hsv = hexToHsv('#ff0000')
    expect(hsv.h).toBeCloseTo(0)
    expect(hsv.s).toBeCloseTo(1)
    expect(hsv.v).toBeCloseTo(1)
  })

  it('entrada inválida vira preto', () => {
    expect(hexToHsv('lixo')).toEqual({ h: 0, s: 0, v: 0 })
  })
})

describe('ida e volta hex → hsv → hex', () => {
  const samples = [
    '#ff8135',
    '#249ca3',
    '#78dc52',
    '#8e2ec4',
    '#b63f16',
    '#000000',
    '#ffffff',
    '#123456',
  ]
  for (const hex of samples) {
    it(hex, () => {
      expect(hsvToHex(hexToHsv(hex))).toBe(hex)
    })
  }
})
