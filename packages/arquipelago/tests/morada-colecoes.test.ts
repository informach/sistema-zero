import { expect, test } from 'bun:test'
import {
  BIT_DO_FOSSIL,
  criarSalvamentoInicial,
  FOSSEIS_DO_VALE,
} from '@sistemazero/arquipelago-contracts'
import { MORADA_CATALOG } from '@sistemazero/avatar-quarto/morada/catalog'
import { PEIXES_DO_AQUARIO } from '../src/sistemas/corais-do-recife'
import {
  MORADA_AQUARIUM_FISH,
  MORADA_FOSSIL,
  moradaAquariumExhibits,
  moradaMuseumExhibits,
} from '../src/sistemas/morada-colecoes'

test('as seis descobertas têm equivalentes reais Morada e mantêm identidade, posição e desbloqueio independentes', () => {
  expect(Object.keys(MORADA_FOSSIL)).toEqual([...FOSSEIS_DO_VALE])
  const save = criarSalvamentoInicial(new Date('2026-11-14T12:00:00Z'))
  expect(moradaMuseumExhibits(save)).toEqual([])
  for (const [index, id] of FOSSEIS_DO_VALE.entries()) {
    const piece = MORADA_CATALOG.pieces[MORADA_FOSSIL[id]]
    expect(piece).toBeDefined()
    expect(piece!.id).toStartWith('moveis/')
    expect(piece!.file).toMatch(/^models\/.+\.glb$/)
    save.vale.fosseis = BIT_DO_FOSSIL[id]
    expect(moradaMuseumExhibits(save)).toEqual([{ id, index, pieceId: piece!.id }])
  }
  save.vale.fosseis = 63
  expect(moradaMuseumExhibits(save).map((e) => e.id)).toEqual([...FOSSEIS_DO_VALE])
})
test('os quatro peixes usam arte Morada e continuam aparecendo somente pelo coral correspondente', () => {
  expect(MORADA_CATALOG.pieces[MORADA_AQUARIUM_FISH]).toBeDefined()
  expect(moradaAquariumExhibits(0)).toEqual([])
  for (let index = 0; index < 4; index++)
    expect(moradaAquariumExhibits(1 << index)).toEqual([
      { id: PEIXES_DO_AQUARIO[index]!, index, pieceId: MORADA_AQUARIUM_FISH },
    ])
  expect(moradaAquariumExhibits(15)).toHaveLength(4)
})
