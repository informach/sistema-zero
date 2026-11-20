import { expect, test } from 'bun:test'
import { aneisSeCruzam, segmentosSeCruzam } from '../src/poligonos'
import { poligonoSimples } from '../src/validacao'

type P = { x: number; z: number }
function exato(p: readonly P[]): boolean {
  const n = p.length
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      if (j === i + 1 || (i === 0 && j === n - 1)) continue
      if (segmentosSeCruzam(p[i]!, p[(i + 1) % n]!, p[j]!, p[(j + 1) % n]!)) return false
    }
  return true
}
function sorteio(semente: number) {
  let s = semente
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

test('a grade decide igual ao teste exato em polígonos grandes, simples ou não', () => {
  const r = sorteio(7)
  let simples = 0,
    cruzados = 0
  for (let caso = 0; caso < 60; caso++) {
    const n = 65 + Math.floor(r() * 200),
      ruido = caso % 2 ? 0.02 : 0.6
    // Estrela irregular: simples com pouco ruído, cruzada com muito.
    const p = Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2,
        raio = 10 + (r() - 0.5) * ruido * 30
      return { x: Math.cos(a) * raio, z: Math.sin(a) * raio }
    })
    // Metade dos casos troca dois vértices de lugar: costuma cruzar lados distantes.
    if (caso % 2) {
      const i = Math.floor(r() * n),
        j = Math.floor(r() * n)
      ;[p[i], p[j]] = [p[j]!, p[i]!]
    }
    expect(poligonoSimples(p)).toBe(exato(p))
    if (exato(p)) simples++
    else cruzados++
  }
  expect(simples).toBeGreaterThan(10)
  expect(cruzados).toBeGreaterThan(10)
})

test('contorno de 16 mil pontos e ilha grande são conferidos em pouco tempo', () => {
  const n = 16384,
    grande = Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2
      return { x: Math.cos(a) * 500, z: Math.sin(a) * 500 }
    }),
    ilha = grande.map((v) => ({ x: v.x * 0.5, z: v.z * 0.5 }))
  const inicio = performance.now()
  expect(poligonoSimples(grande)).toBe(true)
  expect(aneisSeCruzam(ilha, grande)).toBe(false)
  const cruzada = [...grande.slice(0, 100), { x: 0, z: 600 }, ...grande.slice(100)]
  expect(poligonoSimples(cruzada)).toBe(false)
  expect(performance.now() - inicio).toBeLessThan(3000)
})
