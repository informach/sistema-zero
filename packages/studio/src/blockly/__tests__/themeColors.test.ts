import { describe, expect, it } from 'bun:test'
import { cssColorToHex, mixHex, readSzPalette, SZ_BLOCKLY_FALLBACK } from '../themeColors'

describe('cssColorToHex', () => {
  it('aceita hex e rgb/rgba (o caminho barato, sem canvas)', () => {
    expect(cssColorToHex('#AABBCC')).toBe('#aabbcc')
    expect(cssColorToHex('rgb(240, 248, 255)')).toBe('#f0f8ff')
    expect(cssColorToHex('rgba(0, 0, 0, 0.5)')).toBe('#000000')
    expect(cssColorToHex('rgb(100% 0% 0%)')).toBe('#ff0000')
  })

  it('devolve null para vazio e para o que não dá para converter', () => {
    expect(cssColorToHex('')).toBeNull()
    expect(cssColorToHex('   ')).toBeNull()
    // Sem canvas 2D (happy-dom) os formatos modernos caem no null, e o chamador
    // usa a reserva — é o contrato que mantém o Blockly funcionando nos testes.
    expect(cssColorToHex('oklch(0.975 0.012 245)')).toBeNull()
  })
})

describe('mixHex', () => {
  it('mistura em sRGB pelas pontas e pelo meio', () => {
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#000000')
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#ffffff')
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080')
  })

  it('devolve a primeira cor quando alguma não é hex (fail-soft)', () => {
    expect(mixHex('#123456', 'oklch(0.5 0 0)', 0.5)).toBe('#123456')
  })
})

describe('readSzPalette', () => {
  it('sem root (ou sem DOM que resolva a cor) devolve a reserva do tema', () => {
    expect(readSzPalette(null, 'light')).toEqual(SZ_BLOCKLY_FALLBACK.light)
    expect(readSzPalette(null, 'dark')).toEqual(SZ_BLOCKLY_FALLBACK.dark)
  })

  it('no happy-dom (sem canvas) cai na reserva sem lançar e não deixa sonda no DOM', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    try {
      expect(readSzPalette(host, 'light')).toEqual(SZ_BLOCKLY_FALLBACK.light)
      expect(host.childElementCount).toBe(0)
    } finally {
      host.remove()
    }
  })
})
