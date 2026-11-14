import { describe, expect, test } from 'bun:test'
import {
  createMoradaHouse,
  MORADA_CATALOG,
  MORADA_PRICES,
  MORADA_TROPHY_SHELF,
} from '@sistemazero/core/morada'
import { paidPiecesInHouse } from '../../src/infrastructure/persistence/drizzle/morada-grant'

describe('posse das peças que já estão nas casas', () => {
  test('só as pagas: nem a casa inicial, nem troféu, nem a estante; o bichinho entra', () => {
    const paga = Object.keys(MORADA_PRICES).find((id) => MORADA_PRICES[id]?.tier === 'coins')
    const pet = Object.values(MORADA_CATALOG.pieces).find((p) => p.kind === 'pet')?.id
    if (!paga || !pet) throw new Error('sem peça paga ou bichinho')
    const house = createMoradaHouse()
    expect(paidPiecesInHouse(house)).toEqual([])
    house.instances.push(
      { ...house.instances[0]!, id: 'a', pieceId: paga },
      { ...house.instances[0]!, id: 'b', pieceId: paga },
      { ...house.instances[0]!, id: 'c', pieceId: 'trophy/trofeu-chama' },
      { ...house.instances[0]!, id: 'd', pieceId: MORADA_TROPHY_SHELF },
      { ...house.instances[0]!, id: 'e', pieceId: 'moveis/retirado' },
    )
    house.pet = pet
    expect(paidPiecesInHouse(house)).toEqual([paga, pet].sort())
  })
})
