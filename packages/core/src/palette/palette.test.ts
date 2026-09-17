import { describe, expect, test } from 'bun:test'
import {
  DEFAULT_PALETTE,
  isPalette,
  PALETTE_LABELS,
  PALETTES,
  readPalette,
  renderedPalette,
} from './palette'

describe('catálogo', () => {
  test('os ids são únicos e em minúscula com hífen', () => {
    expect(new Set(PALETTES).size).toBe(PALETTES.length)
    for (const palette of PALETTES) expect(palette).toMatch(/^[a-z0-9-]{1,32}$/)
  })

  test('todo swatch tem rótulo em português, e nenhum rótulo sobra', () => {
    for (const palette of PALETTES) expect(PALETTE_LABELS[palette]?.length).toBeGreaterThan(0)
    expect(Object.keys(PALETTE_LABELS).sort()).toEqual([...PALETTES].sort())
  })

  test('a cor da casa é uma só, e é um swatch do catálogo', () => {
    expect(isPalette(DEFAULT_PALETTE)).toBe(true)
    expect(DEFAULT_PALETTE).toBe('blue')
  })

  test('o tema pink de hoje continua sendo o id `pink` — trocá-lo seria migrar dados', () => {
    expect(PALETTES).toContain('pink')
    expect(PALETTE_LABELS.pink).toBe('Rosa')
  })
})

describe('leitura tolerante', () => {
  test('reconhece todo swatch do catálogo', () => {
    for (const palette of PALETTES) expect(readPalette(palette)).toBe(palette)
  })

  test('o desconhecido vira a cor da casa, e nunca lança', () => {
    for (const lixo of ['padrao', 'roxo', 'PINK', '', ' blue', null, undefined, 7, {}, []]) {
      expect(readPalette(lixo)).toBeNull()
      expect(isPalette(lixo)).toBe(false)
    }
  })

  test('o protótipo não é um swatch', () => {
    expect(isPalette('constructor')).toBe(false)
    expect(isPalette('toString')).toBe(false)
  })
})

describe('paleta renderizada', () => {
  test('sem escolha, pinta a cor da casa', () => {
    for (const nada of [null, undefined, 'padrao', 'roxo', '']) {
      expect(renderedPalette(nada)).toBe(DEFAULT_PALETTE)
    }
  })

  test('a escolha vence a cor da casa', () => {
    for (const palette of PALETTES) expect(renderedPalette(palette)).toBe(palette)
  })

  test('nunca devolve nulo — é o que deixa o servidor sempre emitir o atributo', () => {
    expect(isPalette(renderedPalette(null))).toBe(true)
  })
})
