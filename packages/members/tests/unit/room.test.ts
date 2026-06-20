import { describe, expect, test } from 'bun:test'
import {
  canonicalizeRoomState,
  DEFAULT_ROOM_THEME,
  ROOM_GRID,
  ROOM_ITEMS,
  ROOM_THEMES,
} from '../../src/domain/room/room-catalog'

describe('room-catalog', () => {
  test('ids únicos; itens/temas grátis têm preço 0', () => {
    const ids = [...ROOM_ITEMS.map((i) => i.id), ...ROOM_THEMES.map((t) => t.id)]
    expect(new Set(ids).size).toBe(ids.length)
    for (const i of ROOM_ITEMS) expect(i.tier === 'free' ? i.price === 0 : i.price > 0).toBe(true)
  })
})

describe('canonicalizeRoomState', () => {
  test('estado vazio/nulo → tema default, sem itens, sem pet', () => {
    const s = canonicalizeRoomState(null, new Set())
    expect(s).toEqual({ theme: DEFAULT_ROOM_THEME, placedItems: [], pet: null })
  })

  test('mantém item grátis válido; descarta desconhecido, não possuído e fora da grade', () => {
    const s = canonicalizeRoomState(
      {
        theme: DEFAULT_ROOM_THEME,
        placedItems: [
          { itemId: 'cama', x: 0, y: 0 }, // grátis, dentro da grade → fica
          { itemId: 'sofa', x: 0, y: 0 }, // pago não possuído → cai
          { itemId: 'inexistente', x: 0, y: 0 }, // desconhecido → cai
          { itemId: 'cama', x: ROOM_GRID.cols, y: 0 }, // fora da grade → cai
        ],
        pet: null,
      },
      new Set(),
    )
    expect(s.placedItems).toEqual([{ itemId: 'cama', x: 0, y: 0 }])
  })

  test('item pago POSSUÍDO entra; tema pago não possuído → default', () => {
    const s = canonicalizeRoomState(
      { theme: 'floresta', placedItems: [{ itemId: 'sofa', x: 1, y: 1 }], pet: null },
      new Set(['sofa']), // possui sofá, mas não o tema floresta
    )
    expect(s.theme).toBe(DEFAULT_ROOM_THEME)
    expect(s.placedItems).toEqual([{ itemId: 'sofa', x: 1, y: 1 }])
  })

  test('pet só se for categoria pet E possuído; pet na grade é ignorado', () => {
    const owned = new Set(['pet-gato'])
    expect(
      canonicalizeRoomState({ theme: 'aconchego', placedItems: [], pet: 'pet-gato' }, owned).pet,
    ).toBe('pet-gato')
    // pet não possuído → null
    expect(
      canonicalizeRoomState({ theme: 'aconchego', placedItems: [], pet: 'pet-cachorro' }, owned)
        .pet,
    ).toBeNull()
    // item não-pet no campo pet → null
    expect(
      canonicalizeRoomState({ theme: 'aconchego', placedItems: [], pet: 'cama' }, owned).pet,
    ).toBeNull()
    // pet NÃO entra na grade (placedItems só de chão/parede)
    expect(
      canonicalizeRoomState(
        { theme: 'aconchego', placedItems: [{ itemId: 'pet-gato', x: 0, y: 0 }], pet: null },
        owned,
      ).placedItems,
    ).toEqual([])
  })
})
