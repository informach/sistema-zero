import { afterAll, beforeAll, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { ITEM_DA_APARENCIA } from '@sistemazero/arquipelago-contracts'
import { createMoradaHouse } from '@sistemazero/core/morada'
import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { spendCoinsInTransaction } from '../../src/infrastructure/persistence/drizzle/gamification.repository'
import { DrizzleMoradaHouseRepository } from '../../src/infrastructure/persistence/drizzle/morada-house.repository'
import {
  MORADA_REFUND_SOURCE,
  swapMorada,
} from '../../src/infrastructure/persistence/drizzle/morada-swap'
import { openKidsJourneyTestDatabase } from './kids-journey-database'

// Banco próprio, local e descartável. O harness recusa hosts remotos e nomes não kids_journey_*.
const url = process.env.MORADA_TEST_DATABASE_URL
let connection: DbConnection
beforeAll(async () => {
  if (url) connection = await openKidsJourneyTestDatabase(url)
}, 120_000)
afterAll(async () => {
  await connection?.close()
})
const now = new Date('2026-11-14T12:00:00Z')

test.skipIf(!url)(
  'CLI exporta backup consistente sem converter nem alterar carteiras',
  async () => {
    const [before] =
      await connection.sql`select sum(coin_balance)::text as balance from members.gamification_profiles`
    const child = Bun.spawn(
      [
        process.execPath,
        fileURLToPath(new URL('../../scripts/swap-morada.ts', import.meta.url)),
        '--backup-json',
      ],
      {
        env: { ...process.env, DATABASE_URL: url!, APP_ENV: 'test' },
        stdout: 'pipe',
        stderr: 'pipe',
      },
    )
    const output = await new Response(child.stdout).text()
    const error = await new Response(child.stderr).text()
    expect(await child.exited, error).toBe(0)
    const backup = JSON.parse(output)
    expect(backup.version).toBe(1)
    expect(backup.environment).toBe('test')
    for (const table of ['profiles', 'roomState', 'inventory', 'coinEvents', 'houses'])
      expect(Array.isArray(backup[table])).toBe(true)
    const [after] =
      await connection.sql`select sum(coin_balance)::text as balance from members.gamification_profiles`
    expect(after?.balance).toBe(before?.balance)
  },
)

test.skipIf(!url)(
  'perfil infantil com conta responsável diferente avança a revisão migrada e não alcança outro perfil',
  async () => {
    const child = randomUUID()
    const account = randomUUID()
    const repository = new DrizzleMoradaHouseRepository(connection.db)
    const house = createMoradaHouse()
    // Estado histórico com a conta incorretamente preenchida pelo próprio perfil.
    await repository.compareAndSwap(child, child, 'kids', 0, house, now)
    const current = await repository.get(child, 'kids')
    expect(current?.revision).toBe(1)
    // Repro mínimo do filtro antigo: a leitura encontra a revisão, mas o predicado
    // adicional da conta do responsável não encontra a mesma linha histórica.
    const legacyMatch =
      await connection.sql`select id from members.morada_houses where user_id=${child} and audience='kids' and account_id=${account} and revision=1`
    expect(legacyMatch).toHaveLength(0)
    expect(
      (await repository.compareAndSwap(child, account, 'kids', current!.revision, house, now))
        ?.revision,
    ).toBe(2)
    const [row] =
      await connection.sql`select account_id from members.morada_houses where user_id=${child} and audience='kids'`
    expect(row?.account_id).toBe(account)
    expect(await repository.compareAndSwap(randomUUID(), account, 'kids', 2, house, now)).toBeNull()
    expect(await repository.get(child, 'adult')).toBeNull()
  },
)

test.skipIf(!url)('CAS no Postgres preserva escrita vencedora e isola público', async () => {
  const user = randomUUID()
  const repository = new DrizzleMoradaHouseRepository(connection.db)
  const house = createMoradaHouse()
  const results = await Promise.all([
    repository.compareAndSwap(user, user, 'kids', 0, house, now),
    repository.compareAndSwap(user, user, 'kids', 0, house, now),
  ])
  expect(results.filter(Boolean)).toHaveLength(1)
  expect((await repository.get(user, 'kids'))?.revision).toBe(1)
  expect(await repository.get(user, 'adult')).toBeNull()
  expect(await repository.compareAndSwap(user, user, 'kids', 0, house, now)).toBeNull()
  expect((await repository.compareAndSwap(user, user, 'kids', 1, house, now))?.revision).toBe(2)
})

test.skipIf(!url)(
  'ensaio não escreve; reembolso usa gasto real, preserva Galeria e conquista, e repetir não paga de novo',
  async () => {
    const sql = connection.sql
    const user = randomUUID()
    const gallery = Object.values(ITEM_DA_APARENCIA)[0]!
    await sql`insert into members.gamification_profiles(id,user_id,account_id,audience,coin_balance,created_at,updated_at) values(${randomUUID()},${user},${user},'kids',10,now(),now())`
    for (const [item, amount] of [
      ['pet-gato', 123],
      [gallery, 47],
    ] as const) {
      await sql`insert into members.coin_events(id,user_id,audience,source_type,source_id,amount,balance_after,created_at) values(${randomUUID()},${user},'kids','spend_room',${`room-buy:${user}:${item}`},${-amount},10,now())`
      await sql`insert into members.room_inventory(id,user_id,audience,item_id,acquired_at) values(${randomUUID()},${user},'kids',${item},now())`
    }
    await sql`insert into members.room_inventory(id,user_id,audience,item_id,acquired_at) values(${randomUUID()},${user},'kids','trofeu-chama',now())`
    await sql`insert into members.room_state(id,user_id,account_id,audience,state,created_at,updated_at) values(${randomUUID()},${user},${user},'kids',${JSON.stringify({ theme: 'aconchego', placedItems: [], pet: 'pet-gato' })}::jsonb,now(),now())`
    const preview = await swapMorada(sql, { dryRun: true, now })
    expect(preview.refunds.find((r) => r.userId === user)?.coins).toBe(123)
    expect(await sql`select 1 from members.morada_houses where user_id=${user}`).toHaveLength(0)
    const applied = await swapMorada(sql, { dryRun: false, now })
    expect(applied.refunds.find((r) => r.userId === user)?.coins).toBe(123)
    const [profile] =
      await sql`select coin_balance from members.gamification_profiles where user_id=${user}`
    expect(profile?.coin_balance).toBe(133)
    await expect(
      connection.db.transaction((tx) =>
        spendCoinsInTransaction(tx, {
          userId: user,
          audience: 'kids',
          amount: 10,
          reason: 'spend_room',
          idempotencyKey: `room-buy:${user}:pet-cachorro`,
          now,
          grantInventory: { scope: 'room', itemId: 'pet-cachorro' },
        }),
      ),
    ).rejects.toMatchObject({ code: 'ROOM_ITEM_NOT_PURCHASABLE' })
    const inventory = await sql<
      { item_id: string }[]
    >`select item_id from members.room_inventory where user_id=${user}`
    expect(inventory.map((i) => i.item_id).sort()).toEqual([gallery, 'trofeu-chama'].sort())
    const [saved] = await sql`select house from members.morada_houses where user_id=${user}`
    expect(
      saved?.house.instances.some((i: { pieceId: string }) => i.pieceId === 'trophy/trofeu-chama'),
    ).toBe(true)
    await swapMorada(sql, { dryRun: false, now })
    expect(
      await sql`select 1 from members.coin_events where user_id=${user} and source_id=${MORADA_REFUND_SOURCE}`,
    ).toHaveLength(1)
  },
)
