import { describe, expect, test } from 'bun:test'
import {
  criarCorrida,
  estrelasDaCorrida,
  indiceDoSegredo,
  PERCURSOS_DO_JOGO,
  SEGREDO,
  segredoAparece,
} from '../src/sistemas/percurso'

describe('a terceira estrela é o segredo do percurso (§6.28, A9)', () => {
  test('o segredo é a coisa mais longe da linha entre a largada e a chegada', () => {
    const coisas = [
      { x: 1, z: 0 },
      { x: 2, z: 3 },
      { x: 3, z: -1 },
    ]
    expect(indiceDoSegredo({ x: 0, z: 0 }, { x: 4, z: 0 }, coisas)).toBe(1)
    // Largada e chegada no mesmo lugar (uma volta): a mais longe da largada.
    expect(indiceDoSegredo({ x: 0, z: 0 }, { x: 0, z: 0 }, coisas)).toBe(1)
  })

  test('a estrela vem do segredo; as outras coisas não contam para ela', () => {
    const c = criarCorrida(3, 1)
    c.situacao = 'chegou'
    c.pegos = [true, false, true]
    expect(estrelasDaCorrida(c).vagalumes).toBe(false)
    c.pegos = [false, true, false]
    expect(estrelasDaCorrida(c).vagalumes).toBe(true)
    // Sem segredo (corridas de antes), vale pegar todas.
    const antiga = criarCorrida(2)
    antiga.situacao = 'chegou'
    antiga.pegos = [true, true]
    expect(estrelasDaCorrida(antiga).vagalumes).toBe(true)
  })

  test('o segredo só aparece de perto', () => {
    const p = { x: 0, y: 1, z: 0 }
    expect(segredoAparece(p, { x: SEGREDO.apareceA - 0.1, y: 1, z: 0 })).toBe(true)
    expect(segredoAparece(p, { x: SEGREDO.apareceA + 0.5, y: 1, z: 0 })).toBe(false)
    expect(segredoAparece(p, { x: 0, y: 6, z: 0 })).toBe(false)
  })

  test('as falas das três estrelas falam do segredo, nas regras da criança', () => {
    for (const config of Object.values(PERCURSOS_DO_JOGO)) {
      expect(config.falaDasTresEstrelas).toContain(config.escondido)
      expect(config.falaDasTresEstrelas).not.toMatch(/[—!]/)
    }
  })
})
