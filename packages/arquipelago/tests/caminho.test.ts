import { describe, expect, test } from 'bun:test'
import {
  acharCaminho,
  comprimentoDoCaminho,
  criarGrade,
  pontoNoCaminho,
} from '../src/sistemas/caminho'

/** Uma parede em x = 5, de z = 0 até z = 8, com a passagem em z = 9 e 10 (grade de 0 a 10). */
const comParede = (x: number, z: number) => !(Math.abs(x - 5) < 0.5 && z <= 8)

function passaPorDentro(
  caminho: { x: number; z: number }[],
  livre: (x: number, z: number) => boolean,
) {
  for (let i = 1; i < caminho.length; i++) {
    const a = caminho[i - 1]
    const b = caminho[i]
    if (!a || !b) continue
    for (let t = 0; t <= 1; t += 0.01) {
      if (!livre(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) return true
    }
  }
  return false
}

describe('caminho pelo chão', () => {
  test('sem nada no meio, vai reto (só as duas pontas)', () => {
    const g = criarGrade({ x: 0, z: 0 }, { x: 10, z: 10 }, 1, () => true)
    expect(acharCaminho(g, { x: 1, z: 1 }, { x: 9, z: 7 })).toEqual([
      { x: 1, z: 1 },
      { x: 9, z: 7 },
    ])
  })

  test('contorna a parede pela passagem, sem atravessar', () => {
    const g = criarGrade({ x: 0, z: 0 }, { x: 10, z: 10 }, 1, comParede)
    const c = acharCaminho(g, { x: 1, z: 1 }, { x: 9, z: 1 })
    expect(c).not.toBeNull()
    if (!c) return
    expect(c[0]).toEqual({ x: 1, z: 1 })
    expect(c.at(-1)).toEqual({ x: 9, z: 1 })
    expect(c.some((p) => p.z >= 9)).toBe(true)
    expect(passaPorDentro(c, comParede)).toBe(false)
    // Encurtado: poucos pontos, e não muito mais longo que o caminho ideal (~19).
    expect(c.length).toBeLessThanOrEqual(5)
    expect(comprimentoDoCaminho(c)).toBeLessThan(21)
  })

  test('não corta quina na diagonal', () => {
    // Duas casas ocupadas que só se tocam pela quina: a diagonal entre elas não passa.
    const livre = (x: number, z: number) => !((x === 1 && z === 0) || (x === 0 && z === 1))
    const g = criarGrade({ x: 0, z: 0 }, { x: 2, z: 2 }, 1, livre)
    expect(acharCaminho(g, { x: 0, z: 0 }, { x: 1, z: 1 })).toBeNull()
  })

  test('sem saída, devolve nulo', () => {
    const fechado = (x: number, _z: number) => !(Math.abs(x - 5) < 0.5)
    const g = criarGrade({ x: 0, z: 0 }, { x: 10, z: 10 }, 1, fechado)
    expect(acharCaminho(g, { x: 1, z: 5 }, { x: 9, z: 5 })).toBeNull()
  })

  test('começar dentro de um obstáculo sai pela casa livre mais perto', () => {
    const g = criarGrade({ x: 0, z: 0 }, { x: 10, z: 10 }, 1, comParede)
    const c = acharCaminho(g, { x: 5, z: 4 }, { x: 9, z: 4 })
    expect(c).not.toBeNull()
    expect(c?.[0]).toEqual({ x: 5, z: 4 })
  })

  test('o ponto a uma distância do começo anda pelo caminho e para no fim', () => {
    const c = [
      { x: 0, z: 0 },
      { x: 0, z: 4 },
      { x: 3, z: 4 },
    ]
    expect(pontoNoCaminho(c, 2)).toMatchObject({ x: 0, z: 2, fim: false })
    expect(pontoNoCaminho(c, 2).rumo).toBeCloseTo(0)
    const dobra = pontoNoCaminho(c, 5)
    expect(dobra.x).toBeCloseTo(1)
    expect(dobra.z).toBeCloseTo(4)
    expect(dobra.rumo).toBeCloseTo(Math.PI / 2)
    expect(pontoNoCaminho(c, 99)).toMatchObject({ x: 3, z: 4, fim: true })
  })
})
