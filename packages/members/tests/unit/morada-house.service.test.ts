import { describe, expect, test } from 'bun:test'
import { ITEM_DA_APARENCIA } from '@sistemazero/arquipelago-contracts'
import {
  createMoradaHouse,
  MORADA_CATALOG,
  MORADA_PRICES,
  MORADA_TROPHY_SHELF,
  type MoradaHouse,
  validateMoradaHouse,
} from '@sistemazero/core/morada'
import {
  MoradaConflictError,
  MoradaHouseService,
  MoradaInvalidError,
  moradaOwned,
} from '../../src/application/room/morada-house.service'
import type { CourseAudience } from '../../src/domain/course/course'
import type {
  MoradaHouseRecord,
  MoradaHouseRepository,
} from '../../src/domain/ports/morada-house-repository.port'
import type { RoomRepository } from '../../src/domain/ports/room-repository.port'
import { migrateLegacyRoom, PRESERVED_ROOM_TROPHIES } from '../../src/domain/room/morada-migration'
import { retiredRoomIds } from '../../src/infrastructure/persistence/drizzle/morada-swap'

class MemoryHouses implements MoradaHouseRepository {
  rows = new Map<string, MoradaHouseRecord>()
  async get(user: string, audience: CourseAudience) {
    return structuredClone(this.rows.get(`${user}:${audience}`) ?? null)
  }
  async compareAndSwap(
    user: string,
    _account: string,
    audience: CourseAudience,
    revision: number,
    house: MoradaHouse,
  ) {
    const key = `${user}:${audience}`
    if ((this.rows.get(key)?.revision ?? 0) !== revision) return null
    const value = { house: structuredClone(house), revision: revision + 1 }
    this.rows.set(key, value)
    return structuredClone(value)
  }
}
const room: RoomRepository = {
  getState: async () => null,
  listInventory: async () => [],
  upsertState: async () => {},
  addToInventory: async () => ({ added: true }),
}
const setup = (inventory: string[] = []) => {
  const repo = new MemoryHouses()
  return {
    repo,
    service: new MoradaHouseService(
      repo,
      { ...room, listInventory: async () => inventory },
      () => new Date('2026-11-14T12:00:00Z'),
    ),
  }
}

describe('casa canônica Members', () => {
  test('salvar em cliente sem marcador não apaga a importação idempotente do jogo', async () => {
    const { service } = setup()
    const initial = await service.read('pessoa', 'kids')
    initial.house.migrations = ['arquipelago-functions-v1']
    const saved = await service.save('pessoa', 'conta', 'kids', initial)
    delete saved.house.migrations
    const result = await service.save('pessoa', 'conta', 'kids', { ...saved, scope: 'house' })
    expect(result.house.migrations).toEqual(['arquipelago-functions-v1'])
  })
  test('leitura omite peça retirada, descendentes órfãos e pet retirado sem alterar a casa guardada', async () => {
    const { repo, service } = setup()
    const house = createMoradaHouse()
    const valid = house.instances.find((i) => i.id === 'cadeira-inicial')!
    house.instances = [
      valid,
      { ...valid, id: 'pai-retirado', pieceId: 'moveis/retirado' },
      { ...valid, id: 'filho', parentId: 'pai-retirado', slotId: 'nicho' },
    ]
    house.pet = 'pets/retirado'
    repo.rows.set('pessoa:kids', { house, revision: 7 })
    const read = await service.read('pessoa', 'kids')
    expect(read.revision).toBe(7)
    expect(read.house.instances.map((i) => i.id)).toEqual(['cadeira-inicial'])
    expect(read.house.pet).toBeNull()
    expect(repo.rows.get('pessoa:kids')?.house.instances).toHaveLength(3)
    await expect(
      service.save('pessoa', 'conta', 'kids', { house, revision: 7 }),
    ).rejects.toBeInstanceOf(MoradaInvalidError)
    const saved = await service.save('pessoa', 'conta', 'kids', read)
    expect(saved.revision).toBe(8)
    expect(saved.house.instances.map((i) => i.id)).toEqual(['cadeira-inicial'])
  })
  test('duas escritas da mesma revisão não se sobrescrevem', async () => {
    const { service } = setup()
    const first = await service.read('pessoa', 'kids')
    const attempts = await Promise.allSettled([
      service.save('pessoa', 'conta', 'kids', first),
      service.save('pessoa', 'conta', 'kids', first),
    ])
    expect(attempts.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    const failure = attempts.find((r) => r.status === 'rejected')
    expect(failure?.status === 'rejected' && failure.reason).toBeInstanceOf(MoradaConflictError)
    expect((await service.read('pessoa', 'kids')).revision).toBe(1)
    expect((await service.read('pessoa', 'adult')).revision).toBe(0)
  })
  test('editor do quarto conserva quintal, outro cômodo e origem', async () => {
    const { service } = setup()
    const initial = await service.read('pessoa', 'kids')
    initial.house.rooms.push({ id: 'sala', label: 'Sala', origin: [8, 0, 0], size: [4, 4] })
    initial.house.instances.push({
      id: 'cadeira-sala',
      pieceId: 'moveis/cadeiras/cadeira_escritorio_rosa_pacote',
      roomId: 'sala',
      position: [0, 0, 0],
      rotation: 0,
    })
    const saved = await service.save('pessoa', 'conta', 'kids', initial)
    const edit = structuredClone(saved)
    edit.house.rooms = [{ ...edit.house.rooms[0]!, origin: [10, 0, 10] }]
    edit.house.instances = edit.house.instances.filter(
      (i) => i.roomId === 'quarto' && i.id !== 'cadeira-inicial',
    )
    edit.house.lot.size = [500, 500]
    const result = await service.save('pessoa', 'conta', 'kids', { ...edit, scope: 'room' })
    expect(result.house.rooms.find((r) => r.id === 'sala')).toEqual(saved.house.rooms[1])
    expect(result.house.rooms[0]!.origin).toEqual([0, 0, 0])
    expect(result.house.instances.find((i) => i.id === 'cadeira-sala')).toEqual(
      saved.house.instances.at(-1),
    )
    expect(result.house.lot.size).toEqual([30, 30])
  })
  test('troféu exige conquista e cliente antigo não salva após migração', async () => {
    const { service } = setup()
    const initial = await service.read('pessoa', 'kids')
    initial.house.instances.push({
      id: 'premio-inventado',
      pieceId: 'trophy/trofeu-chama',
      position: [0, 0, 0],
      rotation: 0,
      roomId: 'quarto',
    })
    await expect(service.save('pessoa', 'conta', 'kids', initial)).rejects.toBeInstanceOf(
      MoradaInvalidError,
    )
    initial.house.instances.pop()
    await service.save('pessoa', 'conta', 'kids', initial)
    await expect(service.assertLegacyWritable('pessoa', 'kids')).rejects.toMatchObject({
      code: 'MORADA_CLIENT_OUTDATED',
    })
  })
  test('preserva oito conquistas e espécie, sem pássaro', () => {
    for (const [legacy, species] of [
      ['pet-gato', 'cat'],
      ['pet-cachorro', 'dog'],
    ] as const) {
      const house = migrateLegacyRoom({ theme: 'aconchego', placedItems: [], pet: legacy }, [
        ...PRESERVED_ROOM_TROPHIES,
        legacy,
      ])
      expect(house.instances.filter((i) => i.pieceId.startsWith('trophy/'))).toHaveLength(8)
      expect(validateMoradaHouse(house)).toEqual([])
      expect(house.instances.find((i) => i.pieceId === 'trophy/trofeu-diploma')?.position[1]).toBe(
        1.5,
      )
      expect(house.pet && MORADA_CATALOG.pieces[house.pet]?.species).toBe(species)
    }
    expect(
      migrateLegacyRoom({ theme: 'aconchego', placedItems: [], pet: 'pet-passaro' }, [
        'pet-passaro',
      ]).pet,
    ).toBeNull()
    const colored = migrateLegacyRoom(
      {
        theme: 'aconchego',
        placedItems: [],
        pet: null,
        lighting: 'neon-ciano',
        wallColors: { left: '#123456', right: '#abcdef' },
      },
      [],
    )
    expect(colored.rooms[0]?.lighting).toBe('neon-ciano')
    expect(
      colored.instances.find((i) => i.id === 'parede-esq-longa')?.materials?.face_a?.color,
    ).toBe('#123456')
  })
  test('mapeamento legado ausente no catálogo é omitido sem impedir a migração', () => {
    const catalog = {
      ...MORADA_CATALOG,
      pieces: Object.fromEntries(
        Object.entries(MORADA_CATALOG.pieces).filter(
          ([id, piece]) =>
            id !== 'construcao/chao_4m' &&
            id !== 'trophy/trofeu-diploma' &&
            piece.species !== 'cat',
        ),
      ),
    }
    const house = migrateLegacyRoom(
      { theme: 'aconchego', placedItems: [], pet: 'pet-gato' },
      ['pet-gato', 'trofeu-diploma', 'trofeu-chama'],
      catalog,
    )
    expect(house.pet).toBeNull()
    expect(house.instances.some((i) => i.id === 'cadeira-inicial')).toBe(true)
    expect(house.instances.some((i) => i.pieceId === 'trophy/trofeu-chama')).toBe(true)
    expect(house.instances.some((i) => i.pieceId === 'trophy/trofeu-diploma')).toBe(false)
    expect(validateMoradaHouse(house, catalog)).toEqual([])
  })
  test('peça paga só entra comprada; a que já estava na casa continua dela', async () => {
    // Uma peça paga pequena, de chão (cabe no meio do quarto).
    const paga = Object.keys(MORADA_PRICES).find((id) => {
      const p = MORADA_CATALOG.pieces[id]
      return (
        MORADA_PRICES[id]?.tier === 'coins' &&
        p?.mount === 'floor' &&
        p.size[0] < 0.8 &&
        p.size[2] < 0.8
      )
    })
    if (!paga) throw new Error('sem peça paga')
    const sofa = (id: string) => ({
      id,
      pieceId: paga,
      position: [1, 0, 1] as [number, number, number],
      rotation: 0,
      roomId: 'quarto',
    })
    // Sem comprar: recusa.
    const { repo, service } = setup()
    const initial = await service.read('pessoa', 'kids')
    expect(initial.owned).not.toContain(paga)
    initial.house.instances.push(sofa('sofa-novo'))
    await expect(service.save('pessoa', 'conta', 'kids', initial)).rejects.toThrow(
      /ainda não comprada/,
    )
    // Comprada (no inventário): entra.
    const comprada = setup([paga])
    const lida = await comprada.service.read('pessoa', 'kids')
    expect(lida.owned).toContain(paga)
    lida.house.instances.push(sofa('sofa-comprado'))
    await comprada.service.save('pessoa', 'conta', 'kids', lida)
    // Casa convertida (ou posta antes de haver preço) com a peça: continua dela, e ela pode tirar
    // e pôr de novo no mesmo salvamento.
    const antiga = createMoradaHouse()
    antiga.instances.push(sofa('sofa-antigo'))
    repo.rows.set('pessoa:kids', { house: antiga, revision: 3 })
    const relida = await service.read('pessoa', 'kids')
    expect(relida.owned).toContain(paga)
    relida.house.instances = relida.house.instances.filter((i) => i.id !== 'sofa-antigo')
    relida.house.instances.push(sofa('sofa-de-volta'))
    expect((await service.save('pessoa', 'conta', 'kids', relida)).revision).toBe(4)
  })
  test('a estante de troféus vem com a estante-trofeus do primeiro troféu', async () => {
    const sem = await setup().service.read('pessoa', 'kids')
    expect(sem.owned).not.toContain(MORADA_TROPHY_SHELF)
    const com = await setup(['trofeu-chama', 'estante-trofeus']).service.read('pessoa', 'kids')
    expect(com.owned).toEqual(expect.arrayContaining(['trophy/trofeu-chama', MORADA_TROPHY_SHELF]))
    const { service } = setup(['trofeu-chama', 'estante-trofeus'])
    const casa = await service.read('pessoa', 'kids')
    casa.house.instances.push({
      id: 'estante',
      pieceId: MORADA_TROPHY_SHELF,
      position: [-2, 0, -2],
      rotation: 0,
      roomId: 'quarto',
    })
    await service.save('pessoa', 'conta', 'kids', casa)
    const semEstante = setup(['trofeu-chama'])
    const outra = await semEstante.service.read('pessoa', 'kids')
    outra.house.instances.push({
      id: 'estante',
      pieceId: MORADA_TROPHY_SHELF,
      position: [-2, 0, -2],
      rotation: 0,
      roomId: 'quarto',
    })
    await expect(semEstante.service.save('pessoa', 'conta', 'kids', outra)).rejects.toThrow(
      /Troféu ainda não conquistado/,
    )
  })
  test('moradaOwned: troféus, estante, compradas e as da casa; nunca as grátis', () => {
    const house = createMoradaHouse()
    const owned = moradaOwned(['trofeu-foguete', 'estante-trofeus', 'sofa', 'nao-existe'], house)
    expect(owned).toEqual(expect.arrayContaining(['trophy/trofeu-foguete', MORADA_TROPHY_SHELF]))
    expect(owned).not.toContain('sofa')
    for (const i of house.instances) expect(owned).not.toContain(i.pieceId)
  })
  test('não retira direitos da Galeria nem troféus e não aceita documento corrompido', async () => {
    const ids = retiredRoomIds()
    expect(Object.values(ITEM_DA_APARENCIA).some((id) => ids.includes(id))).toBe(false)
    expect(PRESERVED_ROOM_TROPHIES.some((id) => ids.includes(id))).toBe(false)
    expect(ids).toContain('pet-passaro')
    const { repo, service } = setup()
    const house = createMoradaHouse()
    house.roomId = 'comodo-inexistente'
    repo.rows.set('pessoa:kids', { house, revision: 1 })
    await expect(service.read('pessoa', 'kids')).rejects.toBeInstanceOf(MoradaInvalidError)
  })
})
