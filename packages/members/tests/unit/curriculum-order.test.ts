import { expect, test } from 'bun:test'
import { curriculumParkingPositions } from '../../src/domain/course/curriculum-order'

test('reordenação reserva posições abaixo das grades antigas sem alterar as arquivadas', () => {
  expect(
    curriculumParkingPositions([
      { id: 'a', sortOrder: 0, archivedAt: null },
      { id: 'b', sortOrder: 1, archivedAt: null },
      { id: 'old', sortOrder: -1000000, archivedAt: new Date() },
    ]),
  ).toEqual([
    { id: 'a', sortOrder: -1000001 },
    { id: 'b', sortOrder: -1000002 },
  ])
  expect(curriculumParkingPositions([])).toEqual([])
})

test('recusa estourar o inteiro do banco antes de reservar as posições', () => {
  expect(() =>
    curriculumParkingPositions([
      { id: 'a', sortOrder: 0, archivedAt: null },
      { id: 'old', sortOrder: -2147483648, archivedAt: new Date() },
    ]),
  ).toThrow('Limite de ordenação')
})
