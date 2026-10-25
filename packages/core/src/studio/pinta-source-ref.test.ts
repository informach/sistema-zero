import { describe, expect, test } from 'bun:test'
import { PINTA_EXAMPLE_NAME_PATTERN, PINTA_SOURCE_REF_PATTERN } from './pinta-source-ref'

/** A marca que o Estúdio pede e o Pinta grava: `example-<galeria>:<jogo>/<jogo>-<desenho>`. */
const exampleRef = (game: string, drawing: string) => `example-pygame:${game}/${game}-${drawing}`

describe('the source mark of a Pinta drawing — one rule for Studio and Pinta', () => {
  test('every example name the Studio accepts composes a mark Pinta keeps', () => {
    const longest = `a${'_'.repeat(31)}${'-'.repeat(31)}`
    const names = ['jogo', 'meu_jogo', 'super-pirate-world', 'player_idle', '0', longest]
    for (const name of names) expect(PINTA_EXAMPLE_NAME_PATTERN.test(name)).toBe(true)
    for (const game of names)
      for (const drawing of names)
        expect(PINTA_SOURCE_REF_PATTERN.test(exampleRef(game, drawing))).toBe(true)
  })

  test('what is not an example name is refused on both sides', () => {
    for (const bad of ['', '_jogo', '-jogo', 'Jogo', 'jogo velho', 'jogo:x', 'a'.repeat(64)])
      expect(PINTA_EXAMPLE_NAME_PATTERN.test(bad)).toBe(false)
    for (const bad of ['', 'sem-dois-pontos', 'Maiuscula:x', 'a: espaço', `a:${'x'.repeat(201)}`])
      expect(PINTA_SOURCE_REF_PATTERN.test(bad)).toBe(false)
  })
})
