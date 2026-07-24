import { describe, expect, test } from 'bun:test'
import { AwardGamificationService } from '../../src/application/gamification/award-gamification.service'
import { BuyRoomItemService } from '../../src/application/room/buy-room-item.service'
import { InsufficientCoinsError } from '../../src/domain/gamification/coins.errors'
import {
  RoomItemFreeError,
  RoomItemNotFoundError,
  RoomItemNotPurchasableError,
} from '../../src/domain/room/room.errors'
import {
  canonicalizeRoomState,
  DEFAULT_ROOM_THEME,
  ROOM_GRID,
  ROOM_ITEMS,
  ROOM_ITEMS_BY_ID,
  ROOM_THEMES,
  type RoomState,
  TROPHY_SHELF_ITEM_ID,
} from '../../src/domain/room/room-catalog'
import {
  InMemoryCourseRepository,
  InMemoryEntitlementRepository,
  InMemoryGamificationRepository,
  InMemoryRoomRepository,
  silentLogger,
} from '../fakes/in-memory'

describe('room-catalog', () => {
  test('ids únicos; grátis/troféu têm preço 0 e pago tem preço > 0', () => {
    const ids = [...ROOM_ITEMS.map((i) => i.id), ...ROOM_THEMES.map((t) => t.id)]
    expect(new Set(ids).size).toBe(ids.length)
    for (const i of ROOM_ITEMS) {
      // Troféu (07/2026) é ganho por conquista: preço 0 mas NUNCA 'free' implícito.
      expect(i.tier === 'coins' ? i.price > 0 : i.price === 0).toBe(true)
    }
  })

  test('troféu não é comprável nem grátis implícito', () => {
    const trophies = ROOM_ITEMS.filter((i) => i.tier === 'trophy')
    expect(trophies.length).toBeGreaterThan(0)
    for (const t of trophies) expect(t.price).toBe(0)
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
  const make = () => {
    const clock = () => new Date('2026-06-21T12:00:00Z')
    const gamification = new InMemoryGamificationRepository()
    return new BuyRoomItemService(
      new InMemoryRoomRepository(),
      gamification,
      new AwardGamificationService(gamification, clock, silentLogger),
      clock,
    )
  }

  test('piso grátis → RoomItemFreeError (roomThing acha o piso)', async () => {
    await expect(make().execute('u1', 'kids', 'piso-madeira-clara')).rejects.toBeInstanceOf(
      RoomItemFreeError,
    )
  })
  test('troféu → RoomItemNotPurchasableError (ganho por conquista, nunca comprado)', async () => {
    await expect(make().execute('u1', 'kids', 'trofeu-primeiro-jogo')).rejects.toBeInstanceOf(
      RoomItemNotPurchasableError,
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

describe('canonicalizeRoomState — itens de PAREDE + colisão (sem sobreposição)', () => {
  test('item de parede dentro dos limites entra com `wall`; fora (largura/altura) cai', () => {
    const s = canonicalizeRoomState(
      {
        theme: DEFAULT_ROOM_THEME,
        placedItems: [
          { itemId: 'janela', x: 3, y: 1, wall: 'right' }, // 2×2 cabe (3+2≤12, 1+2≤4) → fica
          { itemId: 'janela', x: 11, y: 1, wall: 'right' }, // 11+2>12 → cai
          { itemId: 'janela', x: 0, y: 3, wall: 'right' }, // 3+2>4 (altura) → cai
        ],
        pet: null,
      },
      new Set(['janela']), // janela é paga → precisa possuir
    )
    expect(s.placedItems).toEqual([{ itemId: 'janela', x: 3, y: 1, wall: 'right' }])
  })

  test('item de parede sem `wall` → assume "right"', () => {
    const s = canonicalizeRoomState(
      { theme: DEFAULT_ROOM_THEME, placedItems: [{ itemId: 'quadro', x: 0, y: 0 }], pet: null },
      new Set(),
    )
    expect(s.placedItems).toEqual([{ itemId: 'quadro', x: 0, y: 0, wall: 'right' }])
  })

  test('colisão: dois itens de CHÃO sobrepostos → o segundo cai', () => {
    const s = canonicalizeRoomState(
      {
        theme: DEFAULT_ROOM_THEME,
        placedItems: [
          { itemId: 'cama', x: 0, y: 0 }, // 2×3 ocupa (0,0)-(1,2)
          { itemId: 'mesa', x: 1, y: 1 }, // sobrepõe (1,1) → CAI
          { itemId: 'mesa', x: 4, y: 0 }, // livre → fica
        ],
        pet: null,
      },
      new Set(),
    )
    expect(s.placedItems).toEqual([
      { itemId: 'cama', x: 0, y: 0 },
      { itemId: 'mesa', x: 4, y: 0 },
    ])
  })

  test('colisão: mesma parede sobrepõe (cai); outra parede OK; chão e parede não colidem', () => {
    const s = canonicalizeRoomState(
      {
        theme: DEFAULT_ROOM_THEME,
        placedItems: [
          { itemId: 'quadro', x: 0, y: 0, wall: 'right' }, // right (0,0)-(1,1)
          { itemId: 'estrela', x: 1, y: 1, wall: 'right' }, // sobrepõe right → CAI
          { itemId: 'estrela', x: 1, y: 1, wall: 'left' }, // outra parede → fica
          { itemId: 'mesa', x: 0, y: 0 }, // chão (namespace à parte) → fica
        ],
        pet: null,
      },
      new Set(),
    )
    expect(s.placedItems).toEqual([
      { itemId: 'quadro', x: 0, y: 0, wall: 'right' },
      { itemId: 'estrela', x: 1, y: 1, wall: 'left' },
      { itemId: 'mesa', x: 0, y: 0 },
    ])
  })
})

describe('canonicalizeRoomState — SUPERFÍCIES (filhos em nichos, 24/07)', () => {
  const base = { theme: DEFAULT_ROOM_THEME, pet: null }

  test('catálogo: mesa/mesa-estudo/estante/estante-trofeus têm nichos; estante é troféu', () => {
    expect(ROOM_ITEMS_BY_ID.get('mesa')?.surface).toBe(2)
    expect(ROOM_ITEMS_BY_ID.get('mesa-estudo')?.surface).toBe(1)
    expect(ROOM_ITEMS_BY_ID.get('estante')?.surface).toBe(3)
    const shelf = ROOM_ITEMS_BY_ID.get(TROPHY_SHELF_ITEM_ID)
    expect(shelf?.surface).toBe(6)
    expect(shelf?.tier).toBe('trophy')
    // Troféus de CHÃO são stackable; os de parede não.
    expect(ROOM_ITEMS_BY_ID.get('trofeu-primeiro-jogo')?.stackable).toBe(true)
    expect(ROOM_ITEMS_BY_ID.get('trofeu-diploma')?.stackable).toBeUndefined()
  })

  test('filho válido entra no nicho (canônico x/y=0) e NÃO ocupa célula de chão', () => {
    const s = canonicalizeRoomState(
      {
        ...base,
        placedItems: [
          { itemId: 'mesa', x: 4, y: 4 },
          { itemId: 'bola', x: 9, y: 9, on: 'mesa', slot: 0 }, // x/y crus ignorados
          { itemId: 'cama', x: 0, y: 0 }, // célula (0,0) segue livre p/ o chão
        ],
      },
      new Set(),
    )
    expect(s.placedItems).toEqual([
      { itemId: 'mesa', x: 4, y: 4 },
      { itemId: 'cama', x: 0, y: 0 },
      { itemId: 'bola', x: 0, y: 0, on: 'mesa', slot: 0 },
    ])
  })

  test('filho cai quando: não-stackable, pai ausente/sem nicho, slot inválido ou ocupado', () => {
    const s = canonicalizeRoomState(
      {
        ...base,
        placedItems: [
          { itemId: 'mesa', x: 4, y: 4 },
          { itemId: 'cadeira', x: 0, y: 0, on: 'mesa', slot: 0 }, // não-stackable com `on` → cai
          { itemId: 'bola', x: 0, y: 0, on: 'cama', slot: 0 }, // pai NÃO posicionado → cai
          { itemId: 'bola', x: 0, y: 0, on: 'sofa', slot: 0 }, // pai sem surface (nem posicionado) → cai
          { itemId: 'bola', x: 0, y: 0, on: 'mesa', slot: 2 }, // slot ≥ nichos (mesa tem 2) → cai
          { itemId: 'bola', x: 0, y: 0, on: 'mesa', slot: 1 }, // válido → fica
          { itemId: 'globo', x: 0, y: 0, on: 'mesa', slot: 1 }, // nicho ocupado → cai
        ],
      },
      new Set(['globo']),
    )
    expect(s.placedItems).toEqual([
      { itemId: 'mesa', x: 4, y: 4 },
      { itemId: 'bola', x: 0, y: 0, on: 'mesa', slot: 1 },
    ])
  })

  test('filho sem posse cai; filho sem slot cai; pai só de NICHO não vira pai de si', () => {
    const s = canonicalizeRoomState(
      {
        ...base,
        placedItems: [
          { itemId: 'mesa', x: 4, y: 4 },
          { itemId: 'ursinho', x: 0, y: 0, on: 'mesa', slot: 0 }, // pago NÃO possuído → cai
          { itemId: 'bola', x: 0, y: 0, on: 'mesa' }, // sem slot → cai
        ],
      },
      new Set(),
    )
    expect(s.placedItems).toEqual([{ itemId: 'mesa', x: 4, y: 4 }])
  })

  test('troféu possuído entra na estante de troféus (possuída e posicionada)', () => {
    const owned = new Set(['trofeu-primeiro-jogo', TROPHY_SHELF_ITEM_ID])
    const s = canonicalizeRoomState(
      {
        ...base,
        placedItems: [
          { itemId: TROPHY_SHELF_ITEM_ID, x: 0, y: 0 },
          { itemId: 'trofeu-primeiro-jogo', x: 0, y: 0, on: TROPHY_SHELF_ITEM_ID, slot: 5 },
        ],
      },
      owned,
    )
    expect(s.placedItems).toEqual([
      { itemId: TROPHY_SHELF_ITEM_ID, x: 0, y: 0 },
      { itemId: 'trofeu-primeiro-jogo', x: 0, y: 0, on: TROPHY_SHELF_ITEM_ID, slot: 5 },
    ])
  })
})

describe('award concede a ESTANTE DE TROFÉUS junto com o 1º troféu (24/07)', () => {
  test('badge com troféu mapeado → troféu + estante no inventário; idempotente', async () => {
    const now = new Date('2026-07-24T12:00:00Z')
    const room = new InMemoryRoomRepository()
    const repo = new InMemoryGamificationRepository({
      entitlements: new InMemoryEntitlementRepository(),
      courses: new InMemoryCourseRepository(),
      room,
    })
    const awardOnce = (sourceId: string) =>
      repo.award({
        userId: 'u1',
        accountId: 'u1',
        audience: 'kids',
        events: [{ sourceType: 'course_showcased', sourceId, amount: 0 }],
        now,
        today: '2026-07-24',
        privileged: false,
      })
    const first = await awardOnce('c1')
    expect(first.badgesUnlocked.map((b) => b.slug)).toContain('first-showcase')
    const inv = await room.listInventory('u1', 'kids')
    expect(inv).toContain('trofeu-primeiro-jogo')
    expect(inv).toContain(TROPHY_SHELF_ITEM_ID)
    // Repetir o award não duplica o inventário (dedupe do repo).
    await awardOnce('c2')
    const after = await room.listInventory('u1', 'kids')
    expect(after.filter((id) => id === TROPHY_SHELF_ITEM_ID)).toHaveLength(1)
  })
})
