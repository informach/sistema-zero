import { afterAll, beforeAll, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { avatarProblems, AVATAR_CATALOG as C } from '@sistemazero/core/avatar'
import {
  AVATAR_REFUND_SOURCE_ID,
  bankAvatar,
  bankIndexFor,
  swapAvatars,
} from '../../src/infrastructure/persistence/drizzle/avatar-swap'
import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { openKidsJourneyTestDatabase } from './kids-journey-database'

/**
 * A troca do avatar antigo pelo do pack (`scripts/swap-avatar.ts`) no SQL de verdade, num banco
 * descartável com as migrations reais. É o único teste que alcança esse SQL.
 */
const url = process.env.KIDS_JOURNEY_TEST_DATABASE_URL
let connection: DbConnection
beforeAll(async () => {
  if (url) connection = await openKidsJourneyTestDatabase(url)
})
afterAll(async () => {
  await connection?.close()
})

const AGORA = new Date('2026-11-14T03:00:00.000Z')
const PAGA_NOVA = Object.entries(C.parts).find(([, p]) => p.tier === 'coins')?.[0] ?? ''

async function perfil(sql: DbConnection['sql'], userId: string, saldo: number) {
  await sql`insert into members.gamification_profiles
      (user_id, account_id, audience, coin_balance, created_at, updated_at)
    values (${userId}, ${userId}, 'kids', ${saldo}, now(), now())`
}

async function compra(sql: DbConnection['sql'], userId: string, chave: string, preco: number) {
  await sql`insert into members.coin_events
      (id, user_id, audience, source_type, source_id, amount, balance_after, created_at)
    values (${randomUUID()}, ${userId}, 'kids', 'spend_cosmetic', ${chave}, ${-preco}, 0, now())`
}

test.skipIf(!url)(
  'devolve as moedas do avatar antigo uma vez, limpa o inventário e troca o avatar',
  async () => {
    const sql = connection.sql
    const antigo = randomUUID()
    const novo = randomUUID()
    await perfil(sql, antigo, 10)
    await perfil(sql, novo, 30)
    // Duas compras do avatar antigo (60 + 120) e uma do pack, que NÃO volta.
    await compra(sql, antigo, `avatar-buy:${antigo}:hair-04`, 60)
    await compra(sql, antigo, `avatar-buy:${antigo}:glasses-04`, 120)
    await compra(sql, novo, `avatar-buy-v3:${novo}:${PAGA_NOVA}`, 50)
    for (const [userId, peca] of [
      [antigo, 'hair-04'],
      [antigo, 'glasses-04'],
      [novo, PAGA_NOVA],
    ] as const)
      await sql`insert into members.avatar_inventory (id, user_id, audience, part_id, acquired_at)
      values (${randomUUID()}, ${userId}, 'kids', ${peca}, now())`
    await sql`insert into members.avatar_configs
      (id, user_id, account_id, audience, equipped, photo_url, created_at, updated_at)
    values (${randomUUID()}, ${antigo}, ${antigo}, 'kids',
      ${JSON.stringify({ version: 2, style: 'char-v1', slots: { head: { asset: 'head-01' } } })}::jsonb,
      'https://cdn.exemplo/antiga.webp', now(), now())`

    const ensaio = await swapAvatars(sql, { dryRun: true, now: AGORA })
    expect(ensaio.refunds.find((r) => r.userId === antigo)?.coins).toBe(180)
    expect(ensaio.refunds.some((r) => r.userId === novo)).toBe(false)
    const [{ saldo: antes } = { saldo: 0 }] =
      await sql`select coin_balance as saldo from members.gamification_profiles where user_id = ${antigo}`
    expect(antes).toBe(10)

    const indice = bankIndexFor(antigo)
    const fotos = new Map([[indice, 'https://cdn.exemplo/sorteado.webp']])
    const feito = await swapAvatars(sql, { dryRun: false, now: AGORA, photos: fotos })
    expect(feito.refunds.find((r) => r.userId === antigo)?.coins).toBe(180)

    const [conta] =
      await sql`select coin_balance from members.gamification_profiles where user_id = ${antigo}`
    expect(conta?.coin_balance).toBe(190)
    const [extrato] = await sql`select amount, balance_after from members.coin_events
     where user_id = ${antigo} and source_id = ${AVATAR_REFUND_SOURCE_ID}`
    expect(extrato).toMatchObject({ amount: 180, balance_after: 190 })

    const inventario = await sql`select user_id, part_id from members.avatar_inventory
     where user_id in (${antigo}, ${novo}) order by part_id`
    expect(inventario.map((l) => l.part_id)).toEqual([PAGA_NOVA])

    const [cfg] =
      await sql`select equipped, photo_url from members.avatar_configs where user_id = ${antigo}`
    expect(cfg?.photo_url).toBe('https://cdn.exemplo/sorteado.webp')
    expect(cfg?.equipped).toEqual(JSON.parse(JSON.stringify(bankAvatar(indice))))
    expect(avatarProblems(C, (cfg?.equipped as { slots: Record<string, string> }).slots)).toEqual(
      [],
    )

    // Rodar de novo não devolve outra vez nem troca o avatar já trocado.
    const deNovo = await swapAvatars(sql, { dryRun: false, now: AGORA })
    expect(deNovo.refunds.some((r) => r.userId === antigo)).toBe(false)
    const [depois] =
      await sql`select coin_balance from members.gamification_profiles where user_id = ${antigo}`
    expect(depois?.coin_balance).toBe(190)
    const [cfg2] = await sql`select photo_url from members.avatar_configs where user_id = ${antigo}`
    expect(cfg2?.photo_url).toBe('https://cdn.exemplo/sorteado.webp')
  },
)

test('o banco de sorteados: o mesmo perfil cai sempre no mesmo, e todos são válidos e de menino', () => {
  expect(bankIndexFor('perfil-x')).toBe(bankIndexFor('perfil-x'))
  for (let i = 0; i < 200; i++) {
    const a = bankAvatar(i)
    expect(a.filter).toBe('boy')
    expect(avatarProblems(C, a.slots)).toEqual([])
    const rosto = C.parts[a.slots.rosto ?? '']
    expect(rosto?.audience).toBe('boy')
  }
})
