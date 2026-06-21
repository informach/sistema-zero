import { describe, expect, test } from 'bun:test'
import { BuyRoomItemService } from '../../src/application/room/buy-room-item.service'
import { InsufficientCoinsError } from '../../src/domain/gamification/coins.errors'
import { RoomItemFreeError, RoomItemNotFoundError } from '../../src/domain/room/room.errors'
import {
  canonicalizeRoomState,
  DEFAULT_ROOM_THEME,
  ROOM_GRID,
  ROOM_ITEMS,
  ROOM_THEMES,
  type RoomState,
} from '../../src/domain/room/room-catalog'
import { InMemoryGamificationRepository, InMemoryRoomRepository } from '../fakes/in-memory'

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

describe('canonicalizeRoomState — campos novos (rot/paredes/piso/luz)', () => {
  test('rotação válida é preservada; rot 0/ausente é omitido', () => {
    const s = canonicalizeRoomState(
      {
        theme: DEFAULT_ROOM_THEME,
        placedItems: [
          { itemId: 'cama', x: 0, y: 0 }, // sem rot → fica sem rot
          { itemId: 'cadeira', x: 5, y: 0, rot: 2 }, // rot válido → preservado
        ],
        pet: null,
      },
      new Set(),
    )
    expect(s.placedItems).toEqual([
      { itemId: 'cama', x: 0, y: 0 },
      { itemId: 'cadeira', x: 5, y: 0, rot: 2 },
    ])
  })

  test('footprint girado (90°) respeita os limites da grade; rot inválido → 0', () => {
    // cama 2×3 girada 90° vira 3×2 → em x=10 estoura a largura (10+3>12) e DESCARTA.
    // a outra cama com rot inválido (5) normaliza p/ 0 (cabe → fica, sem o campo rot).
    const raw = {
      theme: DEFAULT_ROOM_THEME,
      placedItems: [
        { itemId: 'cama', x: 0, y: 0, rot: 5 },
        { itemId: 'cama', x: 10, y: 0, rot: 1 },
      ],
      pet: null,
    } as unknown as RoomState
    expect(canonicalizeRoomState(raw, new Set()).placedItems).toEqual([
      { itemId: 'cama', x: 0, y: 0 },
    ])
  })

  test('paredes: cor da paleta entra (case-insensitive); fora da paleta cai', () => {
    const s = canonicalizeRoomState(
      {
        theme: DEFAULT_ROOM_THEME,
        placedItems: [],
        pet: null,
        wallColors: { left: '#A9D6E8', right: '#123456' },
      },
      new Set(),
    )
    expect(s.wallColors).toEqual({ left: '#a9d6e8' })
  })

  test('paredes: nenhuma cor válida → wallColors omitido', () => {
    const s = canonicalizeRoomState(
      { theme: DEFAULT_ROOM_THEME, placedItems: [], pet: null, wallColors: { left: '#000000' } },
      new Set(),
    )
    expect(s.wallColors).toBeUndefined()
  })

  test('piso/luz: grátis entra; pago não possuído cai; pago possuído entra', () => {
    const base = { theme: DEFAULT_ROOM_THEME, placedItems: [], pet: null }
    const free = canonicalizeRoomState(
      { ...base, floor: 'piso-madeira-clara', lighting: 'dia' },
      new Set(),
    )
    expect([free.floor, free.lighting]).toEqual(['piso-madeira-clara', 'dia'])

    const unowned = canonicalizeRoomState(
      { ...base, floor: 'piso-tapete', lighting: 'noite' },
      new Set(),
    )
    expect([unowned.floor, unowned.lighting]).toEqual([undefined, undefined])

    const owned = canonicalizeRoomState(
      { ...base, floor: 'piso-tapete', lighting: 'noite' },
      new Set(['piso-tapete', 'noite']),
    )
    expect([owned.floor, owned.lighting]).toEqual(['piso-tapete', 'noite'])
  })

  test('quarto legado (só tema) não ganha campos novos', () => {
    const s = canonicalizeRoomState(
      { theme: 'aconchego', placedItems: [{ itemId: 'cama', x: 0, y: 0 }], pet: null },
      new Set(),
    )
    expect(s).toEqual({
      theme: 'aconchego',
      placedItems: [{ itemId: 'cama', x: 0, y: 0 }],
      pet: null,
    })
  })
})

describe('BuyRoomItemService reconhece piso/luz', () => {
  const make = () =>
    new BuyRoomItemService(
      new InMemoryRoomRepository(),
      new InMemoryGamificationRepository(),
      () => new Date('2026-06-21T12:00:00Z'),
    )

  test('piso grátis → RoomItemFreeError (roomThing acha o piso)', async () => {
    await expect(make().execute('u1', 'kids', 'piso-madeira-clara')).rejects.toBeInstanceOf(
      RoomItemFreeError,
    )
  })
  test('luz paga sem saldo → InsufficientCoinsError (roomThing acha a luz)', async () => {
    await expect(make().execute('u1', 'kids', 'neon-rosa')).rejects.toBeInstanceOf(
      InsufficientCoinsError,
    )
  })
  test('id inexistente → RoomItemNotFoundError', async () => {
    await expect(make().execute('u1', 'kids', 'nada')).rejects.toBeInstanceOf(RoomItemNotFoundError)
  })
})
