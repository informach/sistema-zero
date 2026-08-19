import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { DrizzleCreationsRepository } from '../../src/infrastructure/persistence/drizzle/creations.repository'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { prepareTestDatabase } from './test-database'

/**
 * O índice "guardado na sua conta" contra Postgres real: a reserva sob advisory lock
 * (a primeira reserva de um item novo não tem linha para o `for update`), a quota
 * dentro da transação, o commit condicionado à revisão RESERVADA que PROMOVE os
 * `pending_*`, o contador monotônico, a idempotência, a lixeira lógica e o `usage`
 * agregado — os SQLs que o fake reimplementa em JS.
 */

const testDatabaseUrl = await prepareTestDatabase()
if (!testDatabaseUrl) {
  console.warn('[tests/db] Postgres indisponível (porta 5433?) — criações PULADO.')
}

const LIMITS = { maxItemBytes: 40 * 1024 * 1024, maxTotalBytes: 1000, maxItemsPerTool: 3 }

describe.skipIf(!testDatabaseUrl)('índice das criações (Postgres real)', () => {
  let conn: DbConnection
  let repo: DrizzleCreationsRepository
  const perfil = randomUUID()
  const conta = randomUUID()
  const now = new Date('2026-08-18T12:00:00.000Z')

  beforeAll(async () => {
    conn = createDbConnection(testDatabaseUrl as string)
    await conn.sql`create schema if not exists members`
    await conn.sql.unsafe(`do $$ begin
      if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                     where t.typname = 'creation_tool' and n.nspname = 'members') then
        create type members.creation_tool as enum ('studio', 'pinta');
      end if;
    end $$;`)
    // O mesmo DDL da migration 0067. ⚠️ Recria do zero: o banco de tests/db é compartilhado
    // e a `user-data-purge.test.ts` cria esta MESMA tabela com um DDL mínimo (sem as
    // colunas `pending_*`); com `if not exists` o primeiro a rodar venceria e este teste
    // quebraria por ORDEM de arquivos, não por lógica.
    await conn.sql.unsafe(`drop table if exists members.creations cascade`)
    await conn.sql.unsafe(`create table members.creations (
      id uuid primary key,
      user_id uuid not null,
      account_id uuid not null,
      tool members.creation_tool not null,
      item_id varchar(64) not null,
      name varchar(120) not null,
      kind varchar(40) not null,
      item_updated_at timestamptz not null,
      revision integer not null default 0,
      last_reserved_revision integer not null default 0,
      pending_revision integer,
      pending_bytes integer,
      pending_name varchar(120),
      pending_kind varchar(40),
      pending_item_updated_at timestamptz,
      pending_thumb text,
      parts jsonb not null default '[]'::jsonb,
      pending_parts jsonb,
      bytes integer not null default 0,
      storage_ref text,
      thumb text,
      deleted_at timestamptz,
      created_at timestamptz not null,
      synced_at timestamptz not null
    )`)
    await conn.sql.unsafe(
      `create unique index creations_user_tool_item_uq on members.creations (user_id, tool, item_id)`,
    )
    // O mesmo índice parcial da migration 0069 (quota por perfil em index-only scan).
    await conn.sql.unsafe(
      `create index creations_usage_idx on members.creations (user_id, tool, bytes) where deleted_at is null and storage_ref is not null`,
    )
    await conn.sql.unsafe(`create table if not exists members.account_deletion_fences (
      account_id uuid primary key,
      created_at timestamptz not null
    )`)
    repo = new DrizzleCreationsRepository(conn.db)
  })

  afterAll(async () => {
    await conn?.sql.end({ timeout: 5 })
  })

  const base = {
    userId: perfil,
    accountId: conta,
    tool: 'studio' as const,
    itemId: 'proj-1',
    name: 'Nave',
    kind: 'classic',
    itemUpdatedAt: now,
    bytes: 100,
    thumb: null,
    now,
    limits: LIMITS,
  }

  test('cerca de exclusão recusa reserva mesmo com credencial antiga', async () => {
    const fencedAccount = randomUUID()
    await conn.sql`
      insert into members.account_deletion_fences (account_id, created_at)
      values (${fencedAccount}, now())
      on conflict (account_id) do nothing`

    expect(
      await repo.reserveUpload({
        ...base,
        userId: randomUUID(),
        accountId: fencedAccount,
        itemId: 'depois-da-exclusao',
      }),
    ).toEqual({ ok: false, reason: 'account-deleting' })
  })
  const key = (rev: number) => `creations/${perfil}/studio/proj-1/${rev}.json.gz`

  test('reserva → commit promove os pendentes; commit errado recusado; lixeira; contador nunca volta; idempotência', async () => {
    const first = await repo.reserveUpload(base)
    expect(first).toEqual({ ok: true, revision: 1, missingParts: [] })
    // Reserva sem commit: fora da lista, fora do usage.
    expect(await repo.list(perfil, 'studio')).toHaveLength(0)
    expect((await repo.usage(perfil)).countByTool.studio).toBe(0)

    expect(await repo.commit({ ...base, revision: 7, storageRef: 'x' })).toEqual({ ok: false })
    expect(await repo.commit({ ...base, revision: 1, storageRef: key(1) })).toEqual({
      ok: true,
      alreadyCommitted: false,
      previousStorageRef: null,
      releasedPartRefs: [],
    })
    const listed = await repo.list(perfil, 'studio')
    expect(listed).toHaveLength(1)
    expect(listed[0]?.revision).toBe(1)
    expect(listed[0]?.bytes).toBe(100)

    // Revisão-base: quem conhece a 1 passa; base vencida (0, "nunca vi") ou futura é recusada
    // com a corrente; sem `baseRevision` não há conferência.
    expect(await repo.reserveUpload({ ...base, baseRevision: 0 })).toEqual({
      ok: false,
      reason: 'stale-base',
      currentRevision: 1,
    })
    // Reenvio: a reserva NÃO muda o que a lista mostra; o commit promove tudo.
    const later = new Date('2026-08-18T13:00:00.000Z')
    const second = await repo.reserveUpload({
      ...base,
      name: 'Nave 2',
      bytes: 250,
      itemUpdatedAt: later,
      baseRevision: 1,
    })
    expect(second).toEqual({ ok: true, revision: 2, missingParts: [] })
    const beforeCommit = (await repo.list(perfil, 'studio'))[0]
    expect(beforeCommit?.name).toBe('Nave')
    expect(beforeCommit?.bytes).toBe(100)
    expect(beforeCommit?.itemUpdatedAt.toISOString()).toBe(now.toISOString())
    // Um commit(1) repetido com a reserva 2 em voo é IDEMPOTENTE (1 já é a corrente): 200 sem
    // mexer em nada — nunca 409, senão o BFF apagaria o blob vivo como "recusado".
    expect(await repo.commit({ ...base, revision: 1, storageRef: key(1) })).toEqual({
      ok: true,
      alreadyCommitted: true,
      previousStorageRef: null,
      releasedPartRefs: [],
    })
    expect((await repo.list(perfil, 'studio'))[0]?.name).toBe('Nave')
    // O commit certo devolve a chave anterior para o BFF apagar.
    expect(await repo.commit({ ...base, revision: 2, storageRef: key(2) })).toEqual({
      ok: true,
      alreadyCommitted: false,
      previousStorageRef: key(1),
      releasedPartRefs: [],
    })
    const afterCommit = (await repo.list(perfil, 'studio'))[0]
    expect(afterCommit?.name).toBe('Nave 2')
    expect(afterCommit?.bytes).toBe(250)
    expect(afterCommit?.itemUpdatedAt.toISOString()).toBe(later.toISOString())
    const usage = await repo.usage(perfil)
    expect(usage.totalBytes).toBe(250)
    expect(usage.countByTool.studio).toBe(1)
    // Idempotente: confirmar de novo a corrente é ok, sem chave anterior.
    expect(await repo.commit({ ...base, revision: 2, storageRef: key(2) })).toEqual({
      ok: true,
      alreadyCommitted: true,
      previousStorageRef: null,
      releasedPartRefs: [],
    })

    // Duas reservas em voo → revisões diferentes; só a última confirma. E a revisão CORRENTE
    // (2) continua idempotente mesmo com as reservas em voo (o BFF apaga chaves "recusadas").
    const a = await repo.reserveUpload({ ...base, bytes: 10 })
    const b = await repo.reserveUpload({ ...base, bytes: 20 })
    expect(a).toEqual({ ok: true, revision: 3, missingParts: [] })
    expect(b).toEqual({ ok: true, revision: 4, missingParts: [] })
    expect(await repo.commit({ ...base, revision: 2, storageRef: key(2) })).toEqual({
      ok: true,
      alreadyCommitted: true,
      previousStorageRef: null,
      releasedPartRefs: [],
    })
    expect(await repo.commit({ ...base, revision: 3, storageRef: key(3) })).toEqual({ ok: false })
    expect((await repo.commit({ ...base, revision: 4, storageRef: key(4) })).ok).toBe(true)

    // Outro dono não enxerga.
    expect(await repo.list(randomUUID(), 'studio')).toHaveLength(0)

    // Lixeira lógica + idempotência; a reserva NÃO ressuscita, o commit sim; o contador segue.
    // A lixeira SOLTA o blob (devolve a chave para o BFF apagar) e zera `storage_ref`.
    expect(await repo.softDelete(perfil, 'studio', 'proj-1', now)).toEqual({
      deleted: true,
      storageRef: key(4),
      partRefs: [],
      revision: 4,
    })
    expect(await repo.softDelete(perfil, 'studio', 'proj-1', now)).toEqual({
      deleted: false,
      storageRef: null,
      partRefs: [],
      revision: 4,
    })
    expect((await repo.get(perfil, 'studio', 'proj-1'))?.storageRef).toBeNull()
    expect(await repo.list(perfil, 'studio')).toHaveLength(0)
    expect((await repo.usage(perfil)).totalBytes).toBe(0)
    const fifth = await repo.reserveUpload({ ...base, bytes: 10 })
    expect(fifth).toEqual({ ok: true, revision: 5, missingParts: [] })
    expect((await repo.get(perfil, 'studio', 'proj-1'))?.deletedAt).not.toBeNull()
    expect((await repo.commit({ ...base, revision: 5, storageRef: key(5) })).ok).toBe(true)
    expect((await repo.get(perfil, 'studio', 'proj-1'))?.deletedAt).toBeNull()
    expect(await repo.list(perfil, 'studio')).toHaveLength(1)
  })

  test('quota dentro da transação: total de bytes e itens por ferramenta; reservas concorrentes de item NOVO não dão 500', async () => {
    const dono = randomUUID()
    const item = (itemId: string, bytes: number) => ({
      ...base,
      userId: dono,
      itemId,
      bytes,
    })
    // 3 itens de 300 = 900 ≤ 1000; o 4º estoura o teto de itens (3).
    for (const id of ['a', 'b', 'c']) {
      const r = await repo.reserveUpload(item(id, 300))
      expect(r.ok).toBe(true)
      if (r.ok) {
        expect(
          (
            await repo.commit({
              ...item(id, 300),
              revision: r.revision,
              storageRef: `k/${id}/${r.revision}`,
            })
          ).ok,
        ).toBe(true)
      }
    }
    expect(await repo.reserveUpload(item('d', 1))).toEqual({ ok: false, reason: 'items-per-tool' })
    // Reenviar `a` com 400: 900 − 300 + 400 = 1000 cabe; com 401 não.
    expect(await repo.reserveUpload(item('a', 401))).toEqual({ ok: false, reason: 'total-bytes' })
    const a400 = await repo.reserveUpload(item('a', 400))
    expect(a400.ok).toBe(true)
    // Quota no COMMIT: `b` reserva 400 também (cabe sozinha: 900 − 300 + 400); depois de `a`
    // commitar 400 (total 1000), o commit de `b` estoura → recusa E mata a reserva de `b`.
    const b400 = await repo.reserveUpload(item('b', 400))
    expect(b400.ok).toBe(true)
    if (a400.ok) {
      expect(
        (await repo.commit({ ...item('a', 400), revision: a400.revision, storageRef: 'k/a/x' })).ok,
      ).toBe(true)
    }
    if (b400.ok) {
      expect(
        await repo.commit({ ...item('b', 400), revision: b400.revision, storageRef: 'k/b/x' }),
      ).toEqual({ ok: false, reason: 'total-bytes' })
      expect((await repo.get(dono, 'studio', 'b'))?.pending).toBeNull()
      // Sem reserva, o mesmo commit vira mismatch (o cliente reserva de novo).
      expect(
        await repo.commit({ ...item('b', 400), revision: b400.revision, storageRef: 'k/b/x' }),
      ).toEqual({ ok: false })
    }

    // Três reservas CONCORRENTES de um item que ainda não existe (duas abas reconciliando o
    // mesmo desenho só-local): o advisory lock serializa — uma linha só, três revisões, sem
    // violar a unique (antes: 23505 → 500 + Sentry).
    const outro = randomUUID()
    const concurrent = () => repo.reserveUpload({ ...base, userId: outro, itemId: 'zz', bytes: 1 })
    const results = await Promise.all([concurrent(), concurrent(), concurrent()])
    expect(results.every((r) => r.ok)).toBe(true)
    expect(results.map((r) => (r.ok ? r.revision : -1)).sort()).toEqual([1, 2, 3])
    expect((await repo.get(outro, 'studio', 'zz'))?.lastReservedRevision).toBe(3)

    // Dois itens diferentes reservaram antes de qualquer commit. Os commits
    // concorrentes são serializados pela quota do PERFIL: só um dos 60 bytes
    // cabe no teto de 100, independentemente de quem chegar primeiro.
    const lote = randomUUID()
    const tight = { maxItemBytes: 40 * 1024 * 1024, maxTotalBytes: 100, maxItemsPerTool: 10 }
    const pendingA = { ...base, userId: lote, itemId: 'lote-a', bytes: 60, limits: tight }
    const pendingB = { ...base, userId: lote, itemId: 'lote-b', bytes: 60, limits: tight }
    const [ticketA, ticketB] = await Promise.all([
      repo.reserveUpload(pendingA),
      repo.reserveUpload(pendingB),
    ])
    expect(ticketA.ok).toBe(true)
    expect(ticketB.ok).toBe(true)
    if (!ticketA.ok || !ticketB.ok) throw new Error('reservas do lote deveriam ser válidas')
    const committed = await Promise.all([
      repo.commit({ ...pendingA, revision: ticketA.revision, storageRef: 'k/lote-a/1' }),
      repo.commit({ ...pendingB, revision: ticketB.revision, storageRef: 'k/lote-b/1' }),
    ])
    expect(committed.filter((result) => result.ok)).toHaveLength(1)
    expect(committed.filter((result) => !result.ok)).toEqual([
      expect.objectContaining({ ok: false, reason: 'total-bytes' }),
    ])
    expect((await repo.usage(lote)).totalBytes).toBe(60)
  })

  test('PARTES no Postgres real: JSONB vai e volta com `rev`, commit exige as enviadas, idempotência não solta nada, `pending_parts` vira NULL, lixeira e ressurreição', async () => {
    const dono = randomUUID()
    const H = (c: string) => c.repeat(64)
    const item = { ...base, userId: dono, itemId: 'jogo' }
    const key = (rev: number) => `creations/${dono}/studio/jogo/${rev}.json.gz`
    // 1) reserva com 2 partes novas (com bytes): as duas faltam, com a revisão 1 na chave.
    const r1 = await repo.reserveUpload({
      ...item,
      bytes: 100,
      parts: [
        { hash: H('a'), bytes: 100 },
        { hash: H('b'), bytes: 200 },
      ],
    })
    expect(r1).toEqual({
      ok: true,
      revision: 1,
      missingParts: [
        { hash: H('a'), bytes: 100, rev: 1 },
        { hash: H('b'), bytes: 200, rev: 1 },
      ],
    })
    expect((await repo.get(dono, 'studio', 'jogo'))?.pending?.bytes).toBe(400)
    // 2) commit sem as partes enviadas: recusado, a reserva fica.
    expect(await repo.commit({ ...item, revision: 1, storageRef: key(1) })).toEqual({
      ok: false,
      reason: 'parts-missing',
      hashes: [H('a'), H('b')],
    })
    expect((await repo.get(dono, 'studio', 'jogo'))?.pending?.revision).toBe(1)
    // 3) commit com as partes: promove; `pending_parts` vira SQL NULL.
    expect(
      await repo.commit({
        ...item,
        revision: 1,
        storageRef: key(1),
        uploadedParts: [H('a'), H('b')],
      }),
    ).toEqual({ ok: true, alreadyCommitted: false, previousStorageRef: null, releasedPartRefs: [] })
    const rec = await repo.get(dono, 'studio', 'jogo')
    expect(rec?.parts).toEqual([
      { hash: H('a'), bytes: 100, rev: 1 },
      { hash: H('b'), bytes: 200, rev: 1 },
    ])
    expect(rec?.pending).toBeNull()
    expect(rec?.bytes).toBe(400)
    const nulls =
      await conn.sql`select (pending_parts is null) as sql_null from members.creations where user_id = ${dono}`
    expect(nulls[0]?.sql_null).toBe(true)
    // 4) re-commit da revisão corrente é idempotente e NÃO solta as partes correntes.
    expect(await repo.commit({ ...item, revision: 1, storageRef: key(1) })).toEqual({
      ok: true,
      alreadyCommitted: true,
      previousStorageRef: null,
      releasedPartRefs: [],
    })
    // 5) revisão 2: A conhecida (sem bytes; mantém rev 1), C nova (rev 2); B sai → solta B.
    const r2 = await repo.reserveUpload({
      ...item,
      bytes: 50,
      parts: [{ hash: H('a') }, { hash: H('c'), bytes: 30 }],
    })
    expect(r2).toEqual({
      ok: true,
      revision: 2,
      missingParts: [{ hash: H('c'), bytes: 30, rev: 2 }],
    })
    expect(
      await repo.commit({ ...item, revision: 2, storageRef: key(2), uploadedParts: [H('c')] }),
    ).toEqual({
      ok: true,
      alreadyCommitted: false,
      previousStorageRef: key(1),
      releasedPartRefs: [{ hash: H('b'), bytes: 200, rev: 1 }],
    })
    expect((await repo.get(dono, 'studio', 'jogo'))?.parts).toEqual([
      { hash: H('a'), bytes: 100, rev: 1 },
      { hash: H('c'), bytes: 30, rev: 2 },
    ])
    // 6) B volta: é faltante de novo (precisa de bytes) e sobe com chave NOVA (rev 3).
    expect(await repo.reserveUpload({ ...item, bytes: 1, parts: [{ hash: H('b') }] })).toEqual({
      ok: false,
      reason: 'parts-need-bytes',
      hashes: [H('b')],
    })
    const r3 = await repo.reserveUpload({
      ...item,
      bytes: 1,
      parts: [{ hash: H('b'), bytes: 200 }],
    })
    expect(r3).toEqual({
      ok: true,
      revision: 3,
      missingParts: [{ hash: H('b'), bytes: 200, rev: 3 }],
    })
    await repo.commit({ ...item, revision: 3, storageRef: key(3), uploadedParts: [H('b')] })
    // 7) lixeira devolve as partes correntes e zera; ressurreição trata tudo como faltante.
    const del = await repo.softDelete(dono, 'studio', 'jogo', now)
    expect(del).toEqual({
      deleted: true,
      storageRef: key(3),
      partRefs: [{ hash: H('b'), bytes: 200, rev: 3 }],
      revision: 3,
    })
    expect((await repo.get(dono, 'studio', 'jogo'))?.parts).toEqual([])
    expect(await repo.reserveUpload({ ...item, bytes: 1, parts: [{ hash: H('b') }] })).toEqual({
      ok: false,
      reason: 'parts-need-bytes',
      hashes: [H('b')],
    })
  })
})
