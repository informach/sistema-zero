import { describe, expect, test } from 'bun:test'
import { PALETTES } from '@sistemazero/core/palette'
import {
  decodePaletteCookie,
  encodePaletteCookie,
  paletteCookieName,
  paletteValueOf,
} from '../src/lib/palette-cookie'

describe('nome do cookie', () => {
  test('ganha `__Host-` só em produção', () => {
    expect(paletteCookieName('sz_kids', false)).toBe('sz_kids_palette')
    expect(paletteCookieName('sz_kids', true)).toBe('__Host-sz_kids_palette')
  })

  test('kids e adulto não colidem — em dev os dois dividem o jar do localhost', () => {
    expect(paletteCookieName('sz_kids', false)).not.toBe(paletteCookieName('sz_member', false))
  })
})

describe('ida e volta', () => {
  test('toda cor do catálogo sobrevive', () => {
    for (const palette of PALETTES) {
      expect(decodePaletteCookie(encodePaletteCookie('u1', palette), 'u1')).toEqual({
        known: true,
        palette,
      })
    }
  })

  test('"escolhi nada" é DIFERENTE de "nunca perguntei"', () => {
    // O cookie presente com cor vazia diz "já perguntei, esta pessoa não escolheu" — e é o que
    // impede o proxy de ir ao gateway em toda navegação de quem nunca escolheu cor.
    expect(decodePaletteCookie(encodePaletteCookie('u1', null), 'u1')).toEqual({
      known: true,
      palette: null,
    })
    expect(decodePaletteCookie(undefined, 'u1')).toEqual({ known: false, palette: null })
  })
})

describe('⚠️ o dono faz parte do valor', () => {
  test('cookie de OUTRO perfil não é conhecido — é o que apaga o flash entre irmãos', () => {
    const doIrmao = encodePaletteCookie('irmao', 'pink')
    expect(decodePaletteCookie(doIrmao, 'eu')).toEqual({ known: false, palette: null })
    // E o dono certo continua lendo o dele.
    expect(decodePaletteCookie(doIrmao, 'irmao').palette).toBe('pink')
  })

  test('valor torto nunca vira cor', () => {
    for (const lixo of ['', 'pink', 'u1', 'u1.roxo', 'u1.PINK', '.pink', 'u1.pink.extra'])
      expect(decodePaletteCookie(lixo, 'u1').palette === 'pink').toBe(lixo === 'u1.pink')
  })

  test('sem dono, nada é conhecido', () => {
    expect(decodePaletteCookie(encodePaletteCookie('u1', 'blue'), '')).toEqual({
      known: false,
      palette: null,
    })
  })
})

describe('leitura do layout (sem conferir o dono)', () => {
  test('lê a cor de um valor bem formado', () => {
    expect(paletteValueOf(encodePaletteCookie('qualquer', 'teal'))).toBe('teal')
  })

  test('tolera ausência, vazio e cor fora do catálogo', () => {
    for (const lixo of [undefined, '', 'u1.', 'u1.roxo', 'lixo'])
      expect(paletteValueOf(lixo)).toBeNull()
  })
})
