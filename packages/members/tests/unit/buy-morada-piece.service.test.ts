import { describe, expect, test } from 'bun:test'
import {
  MORADA_CATALOG,
  MORADA_PRICES,
  MORADA_TROPHY_SHELF,
  moradaPrice,
} from '@sistemazero/core/morada'
import { AwardGamificationService } from '../../src/application/gamification/award-gamification.service'
import { BuyMoradaPieceService } from '../../src/application/room/buy-morada-piece.service'
import { MoradaHouseService } from '../../src/application/room/morada-house.service'
import type { CourseAudience } from '../../src/domain/course/course'
import { InsufficientCoinsError } from '../../src/domain/gamification/coins.errors'
import type { GamificationProfileRecord } from '../../src/domain/ports/gamification-repository.port'
import type {
  MoradaHouseRecord,
  MoradaHouseRepository,
} from '../../src/domain/ports/morada-house-repository.port'
import {
  RoomItemFreeError,
  RoomItemNotFoundError,
  RoomItemNotPurchasableError,
} from '../../src/domain/room/room.errors'
import {
  InMemoryCourseRepository,
  InMemoryEntitlementRepository,
  InMemoryGamificationRepository,
  InMemoryRoomRepository,
  silentLogger,
} from '../fakes/in-memory'

class MemoryHouses implements MoradaHouseRepository {
  rows = new Map<string, MoradaHouseRecord>()
  async get(user: string, audience: CourseAudience) {
    return structuredClone(this.rows.get(`${user}:${audience}`) ?? null)
  }
  async compareAndSwap() {
    return null
  }
}

const paga = Object.keys(MORADA_PRICES).find((id) => MORADA_PRICES[id]?.tier === 'coins') ?? ''
const gratis = Object.keys(MORADA_PRICES).find((id) => MORADA_PRICES[id]?.tier === 'free') ?? ''

function montar(saldo = 0) {
  const clock = () => new Date('2026-11-14T12:00:00Z')
  const room = new InMemoryRoomRepository()
  const coins = new InMemoryGamificationRepository({
    entitlements: new InMemoryEntitlementRepository(),
    courses: new InMemoryCourseRepository(),
    room,
  })
  if (saldo > 0)
    coins.profiles.set('u1:kids', {
      userId: 'u1',
      accountId: 'u1',
      xp: 0,
      streakCurrent: 0,
      streakBest: 0,
      lastActivityDate: null,
      coinBalance: saldo,
      streakFreezes: 0,
    } as GamificationProfileRecord)
  const morada = new MoradaHouseService(new MemoryHouses(), room, clock)
  const buy = new BuyMoradaPieceService(
    coins,
    new AwardGamificationService(coins, clock, silentLogger),
    clock,
    morada,
  )
  return { buy, room, coins, morada }
}

describe('comprar peça da Morada com moedas', () => {
  test('há peça paga e grátis no catálogo', () => {
    expect(MORADA_CATALOG.pieces[paga]).toBeDefined()
    expect(MORADA_CATALOG.pieces[gratis]).toBeDefined()
  })

  test('desconhecida, grátis, troféu e a estante de troféus não se compram', async () => {
    const { buy } = montar(1000)
    await expect(buy.execute('u1', 'kids', 'moveis/nao/existe')).rejects.toBeInstanceOf(
      RoomItemNotFoundError,
    )
    await expect(buy.execute('u1', 'kids', gratis)).rejects.toBeInstanceOf(RoomItemFreeError)
    await expect(buy.execute('u1', 'kids', 'construcao/parede_4m')).rejects.toBeInstanceOf(
      RoomItemFreeError,
    )
    await expect(buy.execute('u1', 'kids', 'trophy/trofeu-chama')).rejects.toBeInstanceOf(
      RoomItemNotPurchasableError,
    )
    await expect(buy.execute('u1', 'kids', MORADA_TROPHY_SHELF)).rejects.toBeInstanceOf(
      RoomItemNotPurchasableError,
    )
  })

  test('peça só do adulto não existe para o Kids', async () => {
    const { buy } = montar(1000)
    await expect(
      buy.execute('u1', 'kids', 'moveis/livros/livro_cassino_pacote'),
    ).rejects.toBeInstanceOf(RoomItemNotFoundError)
  })

  test('sem saldo: 402 e nada entra no inventário', async () => {
    const { buy, room } = montar(0)
    await expect(buy.execute('u1', 'kids', paga)).rejects.toBeInstanceOf(InsufficientCoinsError)
    expect(await room.listInventory('u1', 'kids')).not.toContain(paga)
  })

  test('com saldo: cobra o preço, entrega a peça e a segunda compra não cobra', async () => {
    const preco = moradaPrice(paga).price
    const { buy, room, morada } = montar(1000)
    const r = await buy.execute('u1', 'kids', paga)
    expect(r).toEqual({ alreadyOwned: false, balance: 1000 - preco })
    expect(await room.listInventory('u1', 'kids')).toContain(paga)
    expect((await morada.read('u1', 'kids')).owned).toContain(paga)
    const de_novo = await buy.execute('u1', 'kids', paga)
    expect(de_novo).toEqual({ alreadyOwned: true, balance: 1000 - preco })
  })

  test('equipe recebe sem gastar moeda', async () => {
    const { buy, room } = montar(0)
    const r = await buy.execute('u1', 'kids', paga, true)
    expect(r.unlimited).toBe(true)
    expect(await room.listInventory('u1', 'kids')).toContain(paga)
  })
})
