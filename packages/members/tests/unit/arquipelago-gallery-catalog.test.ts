import { expect, test } from 'bun:test'
import {
  destinosDaAparencia,
  GALERIA,
  IDS_DA_GALERIA,
  ITEM_DA_APARENCIA,
} from '@sistemazero/arquipelago-contracts'
import { canonicalizeRoomState, ROOM_ITEMS_BY_ID } from '../../src/domain/room/room-catalog'

test('quarto cobra o preço único e só oferece modelos que existem nele', () => {
  for (const id of IDS_DA_GALERIA) {
    const itemId = ITEM_DA_APARENCIA[id]
    const room = ROOM_ITEMS_BY_ID.get(itemId)
    if (destinosDaAparencia(id).includes('quarto')) {
      expect(room?.price).toBe(GALERIA[id].preco)
      expect(room?.tier).toBe('coins')
    } else {
      expect(room).toBeUndefined()
      expect(
        canonicalizeRoomState(
          { theme: 'aconchego', pet: null, placedItems: [{ itemId, x: 0, y: 0 }] },
          new Set([itemId]),
        ).placedItems,
      ).toEqual([])
    }
  }
})
