import { describe, expect, mock, test } from 'bun:test'
import { ArquipelagoRoomService } from '../../src/application/arquipelago/arquipelago-room.service'
import { DEFAULT_ROOM_THEME, type RoomState } from '../../src/domain/room/room-catalog'

const TOM = '22222222-2222-4222-8222-222222222222'

describe('o quarto de um perfil para a visita no Arquipélago (30/10/2026)', () => {
  test('é o quarto dele conferido contra o que ele tem, como o Meu quarto mostra', async () => {
    const guardado: RoomState = {
      theme: DEFAULT_ROOM_THEME,
      placedItems: [
        { itemId: 'cama', x: 0, y: 1 },
        { itemId: 'cadeira-gamer', x: 8, y: 1 },
        { itemId: 'letreiro-neon', x: 4, y: 2, wall: 'right' },
      ],
      pet: null,
    }
    const getState = mock(async () => guardado)
    const listInventory = mock(async () => ['cadeira-gamer'])
    const quarto = await new ArquipelagoRoomService({ getState, listInventory }).quarto(TOM, 'kids')
    expect(getState).toHaveBeenCalledWith(TOM, 'kids')
    expect(listInventory).toHaveBeenCalledWith(TOM, 'kids')
    // A cama é de todo mundo e a cadeira ele comprou; o letreiro pago que não é dele sai.
    expect(quarto.placedItems.map((p) => p.itemId)).toEqual(['cama', 'cadeira-gamer'])
  })

  test('quem nunca arrumou o quarto recebe o quarto de começo', async () => {
    const quarto = await new ArquipelagoRoomService({
      getState: async () => null,
      listInventory: async () => [],
    }).quarto(TOM, 'kids')
    expect(quarto.theme).toBe(DEFAULT_ROOM_THEME)
  })
})
