import { describe, expect, test } from 'bun:test'
import { ATALHOS_DOS_TELHADOS, lugaresDosAtalhos } from '../src/mundo/atalhos-dos-telhados'
import {
  type AncorasDosTelhados,
  NOMES_DAS_ANCORAS_DOS_TELHADOS,
  telhadosNoModelo,
} from '../src/mundo/telhados'
import type { Ponto } from '../src/sistemas/cipo'
import {
  criarCorrida,
  estrelasDaCorrida,
  indiceDoSegredo,
  PERCURSO_DOS_TELHADOS,
  passoDaCorrida,
} from '../src/sistemas/percurso'
import { arquivoDaIlha, carregarGlb } from './ajuda-colisores'

/**
 * A corrida pelos atalhos dos telhados (A41, arte de 31/10/2026): a entrega não é em ordem, então
 * pela prancha (casinha 1 para a 3) ou pela escada de caixotes (direto para a casinha 2) ela chega
 * ao terraço e conta o tempo; os confeitos do caminho pulado ficam para trás.
 */
const vila = await carregarGlb(arquivoDaIlha('vila-doce.glb'))
const ancoras = Object.fromEntries(
  NOMES_DAS_ANCORAS_DOS_TELHADOS.map((n) => {
    const p = vila.getObjectByName(n)?.position
    if (!p) throw new Error(`sem ${n}`)
    return [n, { x: p.x, y: p.y, z: p.z }]
  }),
) as AncorasDosTelhados
const pontos = telhadosNoModelo(ancoras)

/** A corrida passando, em cima, pelos deques dados e depois pela chegada. */
function correrPor(deques: number[]) {
  const segredo = indiceDoSegredo(pontos.largada, pontos.chegada, pontos.vagalumes)
  const c = criarCorrida(pontos.vagalumes.length, segredo)
  const passar = (p: Ponto) =>
    passoDaCorrida(
      c,
      { x: p.x, y: p.y + 0.95, z: p.z, pes: p.y + 0.05, noChaoDaIlha: false },
      pontos,
      500,
      PERCURSO_DOS_TELHADOS,
    )
  for (const i of deques) {
    const d = pontos.deques[i]
    if (!d) throw new Error(`sem o deque ${i}`)
    expect(passar(d)).toEqual({ tipo: 'deque', indice: i })
  }
  expect(passar(pontos.chegada)).toEqual({ tipo: 'chegou' })
  return c
}

describe('os atalhos da entrega pelos telhados', () => {
  test('pela prancha (casinha 1 para a 3) a entrega chega, sem os confeitos do meio', () => {
    const c = correrPor([0, 1, 3])
    expect(c.pegos.every((p) => !p)).toBe(true)
    expect(estrelasDaCorrida(c, PERCURSO_DOS_TELHADOS).chegada).toBe(true)
  })

  test('pela escada de caixotes (direto para a casinha 2) também chega', () => {
    const c = correrPor([2, 3])
    expect(c.situacao).toBe('chegou')
  })

  test('cada atalho tem a dica no lugar dele, e o texto segue a regra', () => {
    const lugares = lugaresDosAtalhos(vila, { x: 0, y: 0, z: 0 }, 0)
    expect(lugares.map((l) => l.id)).toEqual(ATALHOS_DOS_TELHADOS.map((a) => a.id))
    for (const a of ATALHOS_DOS_TELHADOS) expect(a.fala).not.toMatch(/[—–!]/)
  })
})
