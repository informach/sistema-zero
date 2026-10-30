import { expect, test } from 'bun:test'
import { type CoresConquistadas, CoresConquistadasSchema } from '../src/cores-conquistadas'

test('cores aceitam somente posições únicas e limitadas, sem recompensas ou identidade do cliente', () => {
  const valida: CoresConquistadas = { versao: 1, ilhas: [{ id: 'bosque', quadros: [1, 3, 6] }] }
  expect(CoresConquistadasSchema.parse(valida)).toEqual(valida)
  for (const quadros of [[0], [7], [1.2], [1, 1], ['1'], [1, 2, 3, 4, 5, 6, 6]])
    expect(
      CoresConquistadasSchema.safeParse({ ...valida, ilhas: [{ id: 'bosque', quadros }] }).success,
    ).toBe(false)
  for (const valor of [
    { ...valida, versao: 2 },
    { ...valida, moedas: 20 },
    { ...valida, jogador: 'outra-pessoa' },
    { ...valida, ilhas: [...valida.ilhas, ...valida.ilhas] },
    { ...valida, ilhas: [{ id: 'inventada', quadros: [] }] },
    { ...valida, ilhas: [{ id: 'bosque', quadros: [], total: 6 }] },
  ])
    expect(CoresConquistadasSchema.safeParse(valor).success).toBe(false)
})
