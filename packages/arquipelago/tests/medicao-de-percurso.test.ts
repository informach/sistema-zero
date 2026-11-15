import { expect, test } from 'bun:test'
import { amostrarMedicao, criarMedicao } from '../src/sistemas/medicao-de-percurso'

test('a chegada da ferramenta não conta como caminhada; tempo e distância começam na saída', () => {
  const m = criarMedicao({ x: 0, z: 0 }, { x: 0, z: 10 })
  amostrarMedicao(m, { x: 0, y: 2, z: 70 }, 1, true)
  expect(m.estado).toBe('aguardando')
  amostrarMedicao(m, { x: 0, y: 2, z: 0 }, 3, false)
  amostrarMedicao(m, { x: 0, y: 2, z: 5 }, 5, false)
  amostrarMedicao(m, { x: 0, y: 2, z: 10 }, 7, false)
  expect(m.estado).toBe('concluida')
  expect(m.metros).toBe(10)
  expect(m.segundos).toBe(4)
})
test('teleporte interrompe a medida, sem acrescentar centenas de metros', () => {
  const m = criarMedicao({ x: 0, z: 0 }, { x: 0, z: 10 })
  amostrarMedicao(m, { x: 0, y: 2, z: 0 }, 0, false)
  amostrarMedicao(m, { x: 0, y: 2, z: 500 }, 1, false)
  expect(m.estado).toBe('cancelada')
  expect(m.metros).toBe(0)
})
