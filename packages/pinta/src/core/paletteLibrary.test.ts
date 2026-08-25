import { describe, expect, it } from 'bun:test'
import {
  emptyPaletteLibrary,
  MAX_SAVED_PALETTES,
  mergePaletteLibraries,
  type PaletteLibrary,
  sanitizePaletteLibrary,
} from './paletteLibrary'

function palette(id: string, updatedAt: number, color = '#123456') {
  return {
    id,
    updatedAt,
    name: `Paleta ${id}`,
    colors: ['', color, ...Array.from({ length: 14 }, () => '')],
  }
}

describe('sanitizePaletteLibrary', () => {
  it('registro válido round-trippa; paleta sem cor pintável cai', () => {
    const lib: PaletteLibrary = {
      version: 1,
      updatedAt: 10,
      palettes: [palette('a', 5), { ...palette('b', 6), colors: ['', 'lixo'] }],
    }
    const out = sanitizePaletteLibrary(lib)
    expect(out?.palettes.map((p) => p.id)).toEqual(['a'])
    expect(out?.updatedAt).toBe(10)
    // A paleta que sobrou está na forma canônica (16 posições).
    expect(out?.palettes[0]?.colors).toHaveLength(16)
  })

  it('forma irreconhecível → null; biblioteca VAZIA é válida', () => {
    expect(sanitizePaletteLibrary(null)).toBeNull()
    expect(sanitizePaletteLibrary({ updatedAt: 1 })).toBeNull()
    expect(sanitizePaletteLibrary(emptyPaletteLibrary())?.palettes).toEqual([])
  })

  it('id duplicado ganha id novo; corta no teto', () => {
    const lots = Array.from({ length: MAX_SAVED_PALETTES + 5 }, (_, i) => palette(`p${i}`, i))
    const out = sanitizePaletteLibrary({ version: 1, updatedAt: 0, palettes: lots })
    expect(out?.palettes).toHaveLength(MAX_SAVED_PALETTES)
    const dup = sanitizePaletteLibrary({
      version: 1,
      updatedAt: 0,
      palettes: [palette('mesmo', 1), palette('mesmo', 2)],
    })
    expect(dup?.palettes).toHaveLength(2)
    expect(new Set(dup?.palettes.map((p) => p.id)).size).toBe(2)
  })
})

describe('mergePaletteLibraries — nuvem ↔ local por id + updatedAt', () => {
  it('o updatedAt maior vence por paleta; só-remotas entram no fim', () => {
    const local: PaletteLibrary = {
      version: 1,
      updatedAt: 100,
      palettes: [palette('a', 5, '#111111'), palette('b', 9, '#222222')],
    }
    const remote: PaletteLibrary = {
      version: 1,
      updatedAt: 120,
      palettes: [palette('a', 7, '#aaaaaa'), palette('c', 3, '#cccccc')],
    }
    const merged = mergePaletteLibraries(local, remote)
    expect(merged.updatedAt).toBe(120)
    expect(merged.palettes.map((p) => [p.id, p.colors[1]])).toEqual([
      ['a', '#aaaaaa'],
      ['b', '#222222'],
      ['c', '#cccccc'],
    ])
  })

  it('empate de updatedAt: a LOCAL vence (determinístico)', () => {
    const merged = mergePaletteLibraries(
      { version: 1, updatedAt: 1, palettes: [palette('a', 5, '#111111')] },
      { version: 1, updatedAt: 1, palettes: [palette('a', 5, '#999999')] },
    )
    expect(merged.palettes[0]?.colors[1]).toBe('#111111')
  })
})
