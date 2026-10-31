import { afterAll, beforeAll, expect, test } from 'bun:test'
import { createHash, randomUUID } from 'node:crypto'
import { mkdtemp, rmdir, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { CompraHistoricaDaGaleria } from '@sistemazero/arquipelago-contracts'
import { GALERIA, ITEM_DA_APARENCIA } from '@sistemazero/arquipelago-contracts'
import { adotarGaleria } from '../../scripts/adopt-arquipelago-gallery'
import { ArquipelagoInventoryRepository } from '../../src/infrastructure/persistence/drizzle/arquipelago-inventory.repository'
import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleGamificationRepository } from '../../src/infrastructure/persistence/drizzle/gamification.repository'
import { DrizzleRoomRepository } from '../../src/infrastructure/persistence/drizzle/room.repository'
import { openKidsJourneyTestDatabase } from './kids-journey-database'

const url = process.env.ARQUIPELAGO_INVENTORY_TEST_DATABASE_URL
let c: DbConnection
beforeAll(async () => {
  if (url) c = await openKidsJourneyTestDatabase(url)
}, 120_000)
afterAll(async () => {
  await c?.close()
})

async function pessoa(audience: 'kids' | 'adult', saldo = 200) {
  const userId = randomUUID(),
    accountId = audience === 'adult' ? userId : randomUUID()
  await c.sql`insert into members.gamification_profiles(id,user_id,account_id,audience,coin_balance,created_at,updated_at)
    values(${randomUUID()},${userId},${accountId},${audience},${saldo},now(),now())`
  return { userId, accountId, audience }
}

test.skipIf(!url)(
  'quarto e jogo compram juntos uma única posse e cobram uma única vez',
  async () => {
    const repo = new ArquipelagoInventoryRepository(c.db)
    const coins = new DrizzleGamificationRepository(c.db)
    const room = new DrizzleRoomRepository(c.db)
    for (const audience of ['kids', 'adult'] as const) {
      const dono = await pessoa(audience)
      const aparencia = 'fliperama-classico',
        itemId = ITEM_DA_APARENCIA[aparencia]
      const results = await Promise.all(
        Array.from({ length: 12 }, (_, i) =>
          i % 2
            ? repo.comprar({ ...dono, aparencia, equipe: false })
            : coins.spendCoins({
                userId: dono.userId,
                audience,
                amount: GALERIA[aparencia].preco,
                reason: 'spend_room',
                idempotencyKey: `room-buy:${dono.userId}:${itemId}`,
                now: new Date(),
                grantInventory: { scope: 'room', itemId },
              }),
        ),
      )
      expect(results).toHaveLength(12)
      expect(await repo.ler(dono)).toEqual({ versao: 1, saldo: 130, possuidas: [aparencia] })
      expect(await room.listInventory(dono.userId, audience)).toEqual([itemId])
      const [events] =
        await c.sql`select count(*)::int n, sum(amount)::int amount from members.coin_events
      where user_id=${dono.userId} and audience=${audience}`
      expect(events).toMatchObject({ n: 1, amount: -70 })
      // Resposta perdida: outra leitura e outro pedido não refazem o gasto.
      expect(await repo.comprar({ ...dono, aparencia, equipe: false })).toMatchObject({
        ok: true,
        jaPossuia: true,
        posse: { saldo: 130 },
      })
    }
  },
)

test.skipIf(!url)(
  'posse existente por outra chave não cobra, saldo curto não concede e públicos não vazam',
  async () => {
    const repo = new ArquipelagoInventoryRepository(c.db)
    const dono = await pessoa('kids', 10)
    expect(await repo.comprar({ ...dono, aparencia: 'aquario-classico', equipe: false })).toEqual({
      ok: false,
      codigo: 'SALDO_INSUFICIENTE',
    })
    expect((await repo.ler(dono))?.possuidas).toEqual([])
    await new DrizzleRoomRepository(c.db).addToInventory(dono.userId, 'kids', 'aquario', new Date())
    expect(
      await repo.comprar({ ...dono, aparencia: 'aquario-classico', equipe: false }),
    ).toMatchObject({ ok: true, jaPossuia: true, posse: { saldo: 10 } })
    expect(await repo.ler({ ...dono, accountId: randomUUID() })).toBeNull()
    expect(await repo.ler({ ...dono, audience: 'adult' })).toBeNull()
    expect(await repo.ler({ ...dono, accountId: dono.userId, audience: 'adult' })).toEqual({
      versao: 1,
      saldo: 0,
      possuidas: [],
    })
    const [events] =
      await c.sql`select count(*)::int n from members.coin_events where user_id=${dono.userId}`
    expect(events?.n).toBe(0)
  },
)

test.skipIf(!url)(
  'equipe sem perfil ganha só o item pedido, com vínculo e sem saldo fictício',
  async () => {
    const repo = new ArquipelagoInventoryRepository(c.db)
    const userId = randomUUID(),
      dono = { userId, accountId: userId, audience: 'adult' as const }
    expect(
      await repo.comprar({ ...dono, aparencia: 'forno-classico', equipe: true }),
    ).toMatchObject({ ok: true, posse: { saldo: 0, possuidas: ['forno-classico'] } })
    expect(await new DrizzleRoomRepository(c.db).listInventory(userId, 'adult')).toEqual([
      'arquipelago:forno-classico',
    ])
    const [events] =
      await c.sql`select count(*)::int n, sum(amount)::int amount from members.coin_events where user_id=${userId}`
    expect(events).toMatchObject({ n: 1, amount: 0 })
  },
)

test.skipIf(!url)(
  'débito antigo do quarto sem inventário é recuperado sem cobrar diferença',
  async () => {
    const repo = new ArquipelagoInventoryRepository(c.db)
    const dono = await pessoa('kids', 60)
    await c.sql`insert into members.coin_events(id,user_id,audience,source_type,source_id,amount,balance_after,created_at)
    values(${randomUUID()},${dono.userId},'kids','spend_room',${`room-buy:${dono.userId}:fliperama`},-140,60,now())`
    expect(
      await repo.comprar({ ...dono, aparencia: 'fliperama-classico', equipe: false }),
    ).toMatchObject({
      ok: true,
      jaPossuia: true,
      posse: { saldo: 60, possuidas: ['fliperama-classico'] },
    })
  },
)

test.skipIf(!url)(
  'adoção paga e pendente debitada preserva saldo, origem e idempotência',
  async () => {
    const repo = new ArquipelagoInventoryRepository(c.db)
    for (const situacao of ['paga', 'pendente'] as const) {
      const dono = await pessoa('kids', 45)
      const compra: CompraHistoricaDaGaleria = {
        jogadorId: dono.userId,
        contaId: dono.accountId,
        publico: 'kids',
        aparencia: 'aquario-classico',
        moedas: 70,
        chave: randomUUID(),
        situacao,
        criadaEm: '2026-10-29T12:00:00Z',
        pagaEm: situacao === 'paga' ? '2026-10-29T12:00:02Z' : null,
      }
      await c.sql`insert into members.coin_events(id,user_id,audience,source_type,source_id,amount,balance_after,created_at)
      values(${randomUUID()},${dono.userId},'kids','arquipelago_debit',${compra.chave},-70,45,now())`
      expect(await repo.adotar(compra)).toMatchObject({ situacao: 'adotavel', gravada: false })
      expect((await repo.ler(dono))?.possuidas).toEqual([])
      expect(await repo.adotar(compra, true)).toMatchObject({ situacao: 'adotavel', gravada: true })
      expect(await repo.adotar(compra, true)).toMatchObject({
        situacao: 'ja-possuida',
        gravada: true,
      })
      expect(await repo.ler(dono)).toEqual({
        versao: 1,
        saldo: 45,
        possuidas: ['aquario-classico'],
      })
      const [eventos] =
        await c.sql`select count(*)::int n, sum(amount)::int amount from members.coin_events where user_id=${dono.userId}`
      expect(eventos).toMatchObject({ n: 2, amount: -70 })
      expect(
        await repo.comprar({ ...dono, aparencia: compra.aparencia, equipe: false }),
      ).toMatchObject({ ok: true, jaPossuia: true, posse: { saldo: 45 } })
    }
  },
)

test.skipIf(!url)('adoção não inventa débito, público, conta ou prova de equipe', async () => {
  const repo = new ArquipelagoInventoryRepository(c.db)
  const dono = await pessoa('adult', 55)
  const compra: CompraHistoricaDaGaleria = {
    jogadorId: dono.userId,
    contaId: null,
    publico: 'adulto',
    aparencia: 'aquario-classico',
    moedas: 70,
    chave: randomUUID(),
    situacao: 'paga',
    criadaEm: '2026-10-29T12:00:00Z',
    pagaEm: '2026-10-29T12:00:02Z',
  }
  expect(await repo.adotar(compra, true)).toMatchObject({
    situacao: 'impedida',
    codigo: 'DEBITO_AUSENTE',
  })
  expect(await repo.adotar({ ...compra, situacao: 'pendente', pagaEm: null }, true)).toEqual({
    situacao: 'nao-cobrada',
  })
  expect(await repo.adotar({ ...compra, moedas: 0, publico: null }, true)).toMatchObject({
    situacao: 'impedida',
    codigo: 'EQUIPE_SEM_COMPROVACAO',
  })
  expect(await repo.adotar({ ...compra, moedas: 0, contaId: randomUUID() }, true)).toMatchObject({
    situacao: 'impedida',
    codigo: 'CONTA_DIVERGENTE',
  })
  await c.sql`insert into members.coin_events(id,user_id,audience,source_type,source_id,amount,balance_after,created_at)
    values(${randomUUID()},${dono.userId},'adult','arquipelago_debit',${compra.chave},-60,55,now())`
  expect(await repo.adotar(compra, true)).toMatchObject({
    situacao: 'impedida',
    codigo: 'DEBITO_DIVERGENTE',
  })
  expect((await repo.ler(dono))?.possuidas).toEqual([])
  expect(await repo.adotar({ ...compra, moedas: 60, publico: 'kids' }, true)).toMatchObject({
    situacao: 'impedida',
    codigo: 'DEBITO_DIVERGENTE',
  })
})

test.skipIf(!url)(
  'equipe histórica com identidade comprovada adota sem moedas nem conquista nova',
  async () => {
    const repo = new ArquipelagoInventoryRepository(c.db)
    const userId = randomUUID()
    const compra: CompraHistoricaDaGaleria = {
      jogadorId: userId,
      contaId: null,
      publico: 'adulto',
      aparencia: 'forno-classico',
      moedas: 0,
      chave: randomUUID(),
      situacao: 'paga',
      criadaEm: '2026-10-29T12:00:00Z',
      pagaEm: '2026-10-29T12:00:02Z',
    }
    expect(await repo.adotar(compra, true)).toMatchObject({ situacao: 'adotavel', gravada: true })
    expect(await repo.ler({ userId, accountId: userId, audience: 'adult' })).toEqual({
      versao: 1,
      saldo: 0,
      possuidas: ['forno-classico'],
    })
    const [profile] =
      await c.sql`select coin_balance,lifetime_coins_earned,xp from members.gamification_profiles where user_id=${userId}`
    expect(profile).toMatchObject({ coin_balance: 0, lifetime_coins_earned: 0, xp: 0 })
  },
)

test.skipIf(!url)(
  'a mesma chave histórica não concede dois objetos, mesmo com o mesmo preço',
  async () => {
    const repo = new ArquipelagoInventoryRepository(c.db)
    const dono = await pessoa('kids', 20)
    const compra: CompraHistoricaDaGaleria = {
      jogadorId: dono.userId,
      contaId: dono.accountId,
      publico: 'kids',
      aparencia: 'aquario-classico',
      moedas: 70,
      chave: randomUUID(),
      situacao: 'paga',
      criadaEm: '2026-10-29T12:00:00Z',
      pagaEm: '2026-10-29T12:00:02Z',
    }
    await c.sql`insert into members.coin_events(id,user_id,audience,source_type,source_id,amount,balance_after,created_at)
    values(${randomUUID()},${dono.userId},'kids','arquipelago_debit',${compra.chave},-70,20,now())`
    expect(await repo.adotar(compra, true)).toMatchObject({ situacao: 'adotavel' })
    expect(await repo.adotar({ ...compra, aparencia: 'fliperama-classico' }, true)).toMatchObject({
      situacao: 'impedida',
      codigo: 'CHAVE_JA_ADOTADA',
    })
    expect((await repo.ler(dono))?.possuidas).toEqual(['aquario-classico'])
  },
)

test.skipIf(!url)(
  'operador confere SHA e todas as linhas antes da adoção, sem cobrar na repetição',
  async () => {
    const pasta = await mkdtemp(path.join(tmpdir(), 'sz-gallery-adoption-'))
    const arquivo = path.join(pasta, 'compras.json')
    const userId = randomUUID(),
      outro = randomUUID()
    const compra: CompraHistoricaDaGaleria = {
      jogadorId: userId,
      contaId: null,
      publico: 'adulto',
      aparencia: 'planta-interior-classica',
      moedas: 0,
      chave: randomUUID(),
      situacao: 'paga',
      criadaEm: '2026-10-29T12:00:00Z',
      pagaEm: '2026-10-29T12:00:02Z',
    }
    const preparar = async (compras: CompraHistoricaDaGaleria[]) => {
      const texto = JSON.stringify({
        formato: 'arquipelago-posse',
        versao: 1,
        exportadoEm: '2026-10-30T12:00:00Z',
        compras,
      })
      await writeFile(arquivo, texto)
      return createHash('sha256').update(texto).digest('hex')
    }
    try {
      const repo = new ArquipelagoInventoryRepository(c.db)
      let sha256 = await preparar([
        compra,
        { ...compra, jogadorId: outro, chave: randomUUID(), moedas: 30 },
      ])
      await expect(
        adotarGaleria({
          arquivo,
          sha256: 'nao-confere',
          databaseUrl: 'nao-conectar',
          aplicar: true,
        }),
      ).rejects.toThrow('SHA conferido')
      expect(
        await adotarGaleria({ arquivo, sha256, databaseUrl: url!, aplicar: true }),
      ).toMatchObject({ aplicado: false, impedimentos: 1 })
      expect((await repo.ler({ userId, accountId: userId, audience: 'adult' }))?.possuidas).toEqual(
        [],
      )
      sha256 = await preparar([compra])
      expect(
        await adotarGaleria({ arquivo, sha256, databaseUrl: url!, aplicar: false }),
      ).toMatchObject({ aplicado: false, impedimentos: 0 })
      expect((await repo.ler({ userId, accountId: userId, audience: 'adult' }))?.possuidas).toEqual(
        [],
      )
      for (let i = 0; i < 2; i++)
        expect(
          await adotarGaleria({ arquivo, sha256, databaseUrl: url!, aplicar: true }),
        ).toMatchObject({ aplicado: true, impedimentos: 0 })
      expect(await repo.ler({ userId, accountId: userId, audience: 'adult' })).toEqual({
        versao: 1,
        saldo: 0,
        possuidas: ['planta-interior-classica'],
      })
    } finally {
      await unlink(arquivo).catch(() => {})
      await rmdir(pasta)
    }
  },
)

test.skipIf(!url)(
  'as versões retrô e moderna (B8) são posses à parte, só do Arquipélago, cobradas uma vez cada',
  async () => {
    const repo = new ArquipelagoInventoryRepository(c.db)
    const room = new DrizzleRoomRepository(c.db)
    const dono = await pessoa('kids')
    for (const aparencia of ['geladeira-retro', 'geladeira-moderna', 'geladeira-retro'] as const)
      await repo.comprar({ ...dono, aparencia, equipe: false })
    const lido = await repo.ler(dono)
    if (!lido) throw new Error('sem a galeria')
    expect(lido.possuidas.sort()).toEqual(['geladeira-moderna', 'geladeira-retro'])
    expect(lido.saldo).toBe(
      200 - GALERIA['geladeira-retro'].preco - GALERIA['geladeira-moderna'].preco,
    )
    // O quarto da plataforma não ganha a geladeira (o item é `arquipelago:`).
    expect(ITEM_DA_APARENCIA['geladeira-retro'].startsWith('arquipelago:')).toBe(true)
    expect((await room.listInventory(dono.userId, 'kids')).sort()).toEqual(
      ['arquipelago:geladeira-moderna', 'arquipelago:geladeira-retro'].sort(),
    )
  },
)
