import { expect, test } from 'bun:test'
import {
  acender,
  criarObjetoMaterial,
  molhar,
  passoDosMateriais,
} from '../src/sistemas/estados-dos-materiais'

const vento = { x: 0.8, z: 0 }
test('água sempre apaga, lenha molhada não acende e só volta a secar com o tempo', () => {
  const o = criarObjetoMaterial('madeira', 0, 0, 1),
    calor = new Float64Array(1)
  expect(acender(o)).toBe(true)
  molhar(o)
  expect(o.estado).toBe('apagado')
  expect(acender(o)).toBe(false)
  for (let i = 0; i < 60; i++) passoDosMateriais([o], calor, vento, 1 / 60)
  expect(o.umidade).toBeGreaterThan(0)
  expect(acender(o)).toBe(false)
  for (let i = 0; i < 1801; i++) passoDosMateriais([o], calor, vento, 1 / 60)
  expect(o.estado).toBe('seco')
  expect(acender(o)).toBe(true)
})
test('calor segue o vento, não atravessa o recinto, não acende pedra nem madeira molhada', () => {
  const origem = criarObjetoMaterial('palha', 0, 0, 1)
  const frente = criarObjetoMaterial('madeira', 0.7, 0, 1),
    atras = criarObjetoMaterial('madeira', -0.7, 0, 1)
  const fora = criarObjetoMaterial('palha', 0.1, 0, 2),
    pedra = criarObjetoMaterial('pedra', 0, 0.1, 1),
    molhada = criarObjetoMaterial('madeira', 0.1, 0, 1)
  const lista = [origem, frente, atras, fora, pedra, molhada],
    calor = new Float64Array(lista.length)
  molhar(molhada)
  acender(origem)
  for (let i = 0; i < 45; i++) passoDosMateriais(lista, calor, vento, 1 / 60)
  expect(frente.calor).toBeGreaterThan(atras.calor)
  for (let i = 0; i < 120; i++) passoDosMateriais(lista, calor, vento, 1 / 60)
  expect(frente.estado).toBe('queimando')
  expect(fora.estado).toBe('seco')
  expect(pedra.estado).toBe('seco')
  expect(molhada.estado).toBe('molhado')
  expect(acender(pedra)).toBe(false)
})
test('queima termina e a ordem das células não muda a propagação', () => {
  const a = [criarObjetoMaterial('palha', 0, 0, 1), criarObjetoMaterial('palha', 0.6, 0, 1)]
  const b = a.map((o) => ({ ...o })).reverse()
  acender(a[0]!)
  acender(b[1]!)
  const ca = new Float64Array(2),
    cb = new Float64Array(2)
  for (let i = 0; i < 1200; i++) {
    passoDosMateriais(a, ca, vento, 1 / 60)
    passoDosMateriais(b, cb, vento, 1 / 60)
  }
  expect(a).toEqual(b.reverse())
  expect(a[0]!.estado).toBe('queimado')
  expect(acender(a[0]!)).toBe(false)
})
