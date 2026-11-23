import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { PINTA_PALETTE_LIBRARY_ITEM_ID as itemId } from '@sistemazero/core/creations'
import {
  type PintaPaletteTicket,
  pintaPaletteBlobKey,
  PINTA_PALETTE_WRITE_PROTOCOL as protocol,
} from '@sistemazero/core/creations/pinta-palette-writer'
import { DrizzleCreationsRepository } from '../../src/infrastructure/persistence/drizzle/creations.repository'
import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleUserDataPurgeRepository } from '../../src/infrastructure/persistence/drizzle/user-data-purge.repository'
import { openKidsJourneyTestDatabase, optInKidsJourneyDatabase } from './kids-journey-database'

const target = optInKidsJourneyDatabase('PINTA_PALETTE_TEST_DATABASE_URL')
const fixture = () => ({
  userId: randomUUID(),
  accountId: randomUUID(),
  audience: 'kids' as const,
})
const limits = { maxItemBytes: 10_000, maxTotalBytes: 50_000, maxItemsPerTool: 10 }
const sha256 = 'a'.repeat(64)
const tool = 'pinta' as const

/**
 * `await expect(promise).rejects` pendura o driver `postgres` dentro do `bun test` (inclusive
 * `rejects.toThrow`): a conexão fica `idle in transaction` logo depois do `begin` e o teste morre
 * com `CONNECTION_DESTROYED`, enquanto a mesma chamada com `await` comum recusa em milissegundos.
 */
async function failure(work: Promise<unknown>): Promise<string> {
  try {
    await work
  } catch (error) {
    if (error instanceof Error) return error.message
    throw error
  }
  throw new Error('expected rejection')
}

describe.skipIf(!target)('reserved palette writer authority', () => {
  let conn: DbConnection
  let repo: DrizzleCreationsRepository
  beforeAll(async () => {
    conn = await openKidsJourneyTestDatabase(target!)
    repo = new DrizzleCreationsRepository(conn.db)
  }, 60_000)
  afterAll(() => conn?.close())

  const reserve = (
    actor: ReturnType<typeof fixture>,
    baseRevision: number,
    baseGeneration?: string | null,
    now = new Date(),
  ) =>
    repo.reserveUpload({
      ...actor,
      itemId,
      tool,
      name: 'Minhas paletas',
      kind: 'palette-library',
      itemUpdatedAt: now,
      bytes: 100,
      thumb: null,
      baseRevision,
      now,
      limits,
      ...(baseGeneration === undefined ? {} : { paletteWrite: { protocol, baseGeneration } }),
    })

  const commit = (
    actor: ReturnType<typeof fixture>,
    revision: number,
    ticket?: PintaPaletteTicket,
  ) =>
    repo.commit({
      ...actor,
      itemId,
      tool,
      revision,
      storageRef: 'old/palette.gz',
      now: new Date(),
      limits,
      ...(ticket ? { paletteProof: { ticket, sha256, accountId: actor.accountId } } : {}),
    })

  test('holds earlier legacy reservations, then publishes sealed bytes with a sticky writer fence', async () => {
    const actor = fixture()
    const legacy = await reserve(actor, 0)
    if (!legacy.ok) throw new Error('legacy fixture reserve failed')
    expect((await commit(actor, legacy.revision)).ok).toBe(true)
    const before = (await repo.getPaletteHead(actor)).paletteHead
    expect(before).toMatchObject({ exists: true, adopted: false, revision: legacy.revision })

    const pending = await reserve(actor, legacy.revision)
    if (!pending.ok) throw new Error('pending legacy reserve failed')
    const modern = await reserve(actor, before.revision, before.generation)
    if (!modern.ok || !modern.paletteTicket) throw new Error('verified reserve failed')
    const ticket = modern.paletteTicket

    expect(await failure(reserve(actor, before.revision))).toContain('protocol-required')
    expect(await failure(commit(actor, pending.revision))).toContain('protocol-required')
    expect(
      await failure(repo.softDelete(actor.userId, tool, itemId, before.revision, new Date())),
    ).toContain('protocol-required')
    expect(
      await failure(
        (async () =>
          conn.sql`update members.creations set name = 'old worker' where user_id = ${actor.userId}`)(),
      ),
    ).toContain('verified writer')
    expect(
      await failure(commit(actor, ticket.revision, { ...ticket, nonce: randomUUID() })),
    ).toContain('ticket-invalid')
    expect(await repo.getPaletteTicket(actor, ticket.nonce, ticket.revision, new Date())).toEqual({
      committed: false,
      ticket,
    })
    const confirmed = await commit(actor, ticket.revision, ticket)
    if (!confirmed.ok) throw new Error('sealed commit failed')
    expect(confirmed.paletteHead).toMatchObject({
      adopted: true,
      exists: true,
      revision: ticket.revision,
    })
    expect(confirmed.paletteHead?.generation).not.toBe(before.generation)
    const confirmedRead = await repo.getPaletteHead(actor)
    expect(confirmedRead.paletteHead).toEqual(confirmed.paletteHead!)
    expect(confirmedRead.download?.storageKey).toBe(pintaPaletteBlobKey(actor, ticket, 'sealed'))
    expect((await repo.get(actor.userId, tool, itemId))?.storageRef).toBe(
      confirmedRead.download?.storageKey,
    )
    expect(await commit(actor, ticket.revision, ticket)).toMatchObject({
      ok: true,
      alreadyCommitted: true,
    })
    expect(await failure(commit(actor, ticket.revision))).toContain('protocol-required')
    expect(
      await failure(
        (async () =>
          conn.sql`update members.creation_inventory_floors set palette_generation = null where user_id = ${actor.userId}`)(),
      ),
    ).toContain('generation is permanent')
  })

  test('a lost and expired initial ticket cannot become a legacy commit; fresh legacy work can resume', async () => {
    const actor = fixture()
    const now = new Date(Date.now() - 12 * 60_000)
    const pending = await reserve(actor, 0, null, now)
    if (!pending.ok || !pending.paletteTicket) throw new Error('expired fixture not reserved')
    expect((await repo.getPaletteHead(actor)).paletteHead).toEqual({
      protocol,
      generation: null,
      exists: false,
      adopted: false,
      revision: 0,
    })
    expect(await failure(commit(actor, pending.revision, pending.paletteTicket))).toContain(
      'ticket-invalid',
    )
    expect(await failure(commit(actor, pending.revision))).toContain('protocol-required')
    expect(
      await failure(
        (async () =>
          conn.sql`update members.creations set revision = ${pending.revision}, storage_ref = 'expired' where user_id = ${actor.userId}`)(),
      ),
    ).toContain('reservation expired')
    const accepted = await reserve(actor, 0)
    if (!accepted.ok) throw new Error('legacy reopen failed')
    expect(accepted.revision).toBeGreaterThan(pending.revision)
    expect((await commit(actor, accepted.revision)).ok).toBe(true)
    expect((await repo.getPaletteHead(actor)).paletteHead.adopted).toBe(false)
  })

  test('a Pinta palette generation leaves coincident Studio identities independent', async () => {
    const actor = fixture()
    const now = new Date()
    const studio = { ...actor, tool: 'studio' as const, itemId }
    await conn.sql`
      insert into members.creations(id,user_id,account_id,tool,item_id,kind,name,
        item_updated_at,created_at,synced_at,revision,last_reserved_revision,format_version,bytes,storage_ref)
      values(gen_random_uuid(),${actor.userId},${actor.accountId},'studio',${itemId},
        'classic','Jogo legado',now(),now(),now(),1,1,2,100,'studio/legacy')
    `
    const initial = await reserve(actor, 0, null)
    if (!initial.ok || !initial.paletteTicket) throw new Error('verified reserve failed')
    expect((await commit(actor, initial.revision, initial.paletteTicket)).ok).toBe(true)

    await conn.sql`update members.creations set name = 'Jogo renomeado'
      where user_id = ${actor.userId} and tool = 'studio' and item_id = ${itemId}`
    expect(await repo.get(actor.userId, 'studio', itemId)).toMatchObject({
      name: 'Jogo renomeado',
      revision: 1,
      storageRef: 'studio/legacy',
    })
    const updated = await repo.reserveUpload({
      ...studio,
      kind: 'classic',
      name: 'Jogo atualizado',
      itemUpdatedAt: now,
      bytes: 200,
      thumb: null,
      baseRevision: 1,
      formatVersion: 2,
      limits,
      now,
    })
    if (!updated.ok) throw new Error(`Studio reserve failed: ${updated.reason}`)
    expect(
      await repo.commit({
        ...studio,
        revision: updated.revision,
        storageRef: 'studio/current',
        verifiedFormatVersion: 2,
        verifiedPartHashes: [],
        limits,
        now,
      }),
    ).toMatchObject({ ok: true })
    expect(await repo.get(actor.userId, 'studio', itemId)).toMatchObject({
      name: 'Jogo atualizado',
      storageRef: 'studio/current',
      revision: updated.revision,
    })
    expect(
      await failure(
        (async () => conn.sql`update members.creations set tool = 'pinta', kind = 'palette-library'
      where user_id = ${actor.userId} and tool = 'studio' and item_id = ${itemId}`)(),
      ),
    ).toContain('identity is immutable')
    expect(
      await repo.softDelete(actor.userId, 'studio', itemId, updated.revision, now, 2),
    ).toMatchObject({ ok: true, deleted: true })

    expect(
      await failure(
        (async () => conn.sql`update members.creations set tool = 'molda'
      where user_id = ${actor.userId} and tool = 'pinta' and item_id = ${itemId}`)(),
      ),
    ).toContain('identity is immutable')
    expect(
      await failure(
        (async () => conn.sql`update members.creations set item_id = 'palette-moved'
      where user_id = ${actor.userId} and tool = 'pinta' and item_id = ${itemId}`)(),
      ),
    ).toContain('identity are immutable')
    const reservedKind = await repo.reserveUpload({
      ...studio,
      itemId: 'outro-jogo',
      kind: 'palette-library',
      name: 'Paleta falsa',
      itemUpdatedAt: now,
      bytes: 100,
      thumb: null,
      baseRevision: 0,
      formatVersion: 2,
      limits,
      now,
    })
    expect(reservedKind).toEqual({ ok: false, reason: 'palette-library-identity' })
    const read = await repo.getPaletteHead(actor)
    expect(read.paletteHead).toMatchObject({ adopted: true, exists: true })
    expect(read.download?.storageKey).toBe(
      pintaPaletteBlobKey(actor, initial.paletteTicket, 'sealed'),
    )
  })

  test('a compacted expired ticket does not block a legitimate legacy revision with the same number', async () => {
    const actor = fixture()
    const now = new Date()
    const abandoned = await reserve(actor, 0, null, new Date(now.getTime() - 12 * 60_000))
    if (!abandoned.ok || !abandoned.paletteTicket) throw new Error('expired fixture not reserved')
    expect(abandoned.revision).toBe(1)
    expect(await failure(commit(actor, 1))).toContain('protocol-required')

    expect(await repo.softDelete(actor.userId, tool, itemId, 0, now, 1)).toMatchObject({ ok: true })
    expect(await repo.compactTombstones(new Date(now.getTime() + 1), 100)).toBeGreaterThan(0)
    expect(await repo.get(actor.userId, tool, itemId)).toBeNull()

    const legacy = await reserve(actor, 0)
    if (!legacy.ok) throw new Error(`legacy reserve failed: ${legacy.reason}`)
    expect(legacy.revision).toBe(1)
    const [pending] = await conn.sql`select pending_palette_write from members.creations
      where user_id = ${actor.userId} and tool = 'pinta' and item_id = ${itemId}`
    expect(pending?.pending_palette_write).toBeNull()
    expect(await failure(commit(actor, legacy.revision, abandoned.paletteTicket))).toContain(
      'ticket-invalid',
    )
    expect(await commit(actor, legacy.revision)).toMatchObject({
      ok: true,
      alreadyCommitted: false,
    })
    expect((await repo.getPaletteHead(actor)).paletteHead).toMatchObject({
      revision: 1,
      exists: true,
      adopted: false,
    })
  })

  test('an offline first save starts an incarnation; delete and compaction preserve its replacement', async () => {
    const actor = fixture()
    const first = await reserve(actor, 0, null)
    if (!first.ok || !first.paletteTicket) throw new Error('first offline reserve failed')
    const stored = await commit(actor, first.revision, first.paletteTicket)
    if (!stored.ok || !stored.paletteHead) throw new Error('first offline commit failed')
    const before = stored.paletteHead
    const deleted = await repo.softDelete(
      actor.userId,
      tool,
      itemId,
      before.revision,
      new Date(Date.now() - 24 * 3600_000),
      1,
      { protocol, baseGeneration: before.generation, accountId: actor.accountId },
    )
    if (!deleted.ok || !deleted.paletteHead) throw new Error('scoped delete failed')
    const absent = deleted.paletteHead
    expect(absent).toMatchObject({ exists: false, adopted: true, revision: 0 })
    expect(absent.generation).not.toBe(before.generation)
    expect(await repo.compactTombstones(new Date(), 100)).toBeGreaterThan(0)
    expect(await repo.getPaletteHead(actor)).toMatchObject({ paletteHead: absent, download: null })
    expect(await failure(reserve(actor, 0, before.generation))).toContain('head-changed')
    expect(await failure(reserve(actor, 0))).toContain('protocol-required')
    expect(
      await failure(
        (async () => conn.sql`
      insert into members.creations(id,user_id,account_id,tool,item_id,kind,name,item_updated_at,created_at,synced_at)
      values(gen_random_uuid(),${actor.userId},${actor.accountId},'pinta','sz-pinta-palettes','palette-library','old writer',now(),now(),now())
    `)(),
      ),
    ).toContain('verified writer')
    const newTicket = await reserve(actor, 0, absent.generation)
    if (!newTicket.ok || !newTicket.paletteTicket) throw new Error('replacement reserve failed')
    expect(newTicket.revision).toBe(first.revision)
    expect(await failure(commit(actor, first.revision, first.paletteTicket))).toContain(
      'ticket-invalid',
    )
    const next = await commit(actor, newTicket.revision, newTicket.paletteTicket)
    expect(next).toMatchObject({
      ok: true,
      paletteHead: { ...absent, exists: true, revision: newTicket.revision },
    })
    const purge = new DrizzleUserDataPurgeRepository(conn.db)
    await purge.purgeForUser({
      accountId: actor.accountId,
      userIds: [actor.userId],
      cleanup: {
        id: randomUUID(),
        prefixes: [`creations/${actor.userId}/`],
        notBefore: new Date(),
        createdAt: new Date(),
      },
    })
    expect(await purge.isFenced(actor.accountId)).toBe(true)
    expect(
      await conn.sql`select user_id from members.creations where user_id = ${actor.userId}`,
    ).toHaveLength(0)
    expect(
      await conn.sql`select user_id from members.creation_inventory_floors where user_id = ${actor.userId}`,
    ).toHaveLength(0)
    expect(await failure(repo.getPaletteHead(actor))).toContain('account-deleting')
  }, 20_000)

  test('reservation advances an older palette with a lagging allocation counter', async () => {
    const actor = fixture()
    const legacy = await reserve(actor, 0)
    if (!legacy.ok) throw new Error('legacy palette not reserved')
    expect((await commit(actor, legacy.revision)).ok).toBe(true)
    await conn.sql`update members.creations
      set revision = 10, pending_revision = 20, last_reserved_revision = 5
      where user_id = ${actor.userId} and tool = 'pinta' and item_id = ${itemId}`
    const head = (await repo.getPaletteHead(actor)).paletteHead
    expect(head).toMatchObject({ revision: 10, adopted: false, exists: true })
    const modern = await reserve(actor, head.revision, head.generation)
    if (!modern.ok || !modern.paletteTicket) throw new Error('palette writer not reserved')
    expect(modern.paletteTicket).toMatchObject({ revision: 21, baseRevision: 10 })
    expect(await failure(commit(actor, 20))).toContain('protocol-required')
    expect(await commit(actor, modern.revision, modern.paletteTicket)).toMatchObject({
      ok: true,
      paletteHead: { revision: 21, adopted: true, exists: true },
    })
  })
})
