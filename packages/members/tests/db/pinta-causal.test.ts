import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  PintaCausalArchiveItemSchema,
  PintaCausalArchivePageSchema,
  type PintaCausalAttestation,
  type PintaCausalIntent,
  type PintaCausalManifest,
  type PintaCausalMember,
  type PintaCausalRead,
  PintaCausalSnapshotPageSchema,
  pintaCausalBlobKey,
  pintaCausalIntentHash,
} from '@sistemazero/core/creations/pinta-causal'
import { Elysia } from 'elysia'
import { CREATION_LIMITS } from '../../src/domain/creations/creation'
import { DrizzleCreationsRepository } from '../../src/infrastructure/persistence/drizzle/creations.repository'
import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzlePintaRetirementRepository } from '../../src/infrastructure/persistence/drizzle/pinta-causal-retirement'
import { DrizzlePintaCausalRepository } from '../../src/infrastructure/persistence/drizzle/pinta-causal-units.repository'
import { pintaCausalRoutes } from '../../src/interfaces/http/routes/pinta-causal.routes'
import { kidsJourneyTestTarget, openKidsJourneyTestDatabase } from './kids-journey-database'

const url = process.env.PINTA_CAUSAL_TEST_DATABASE_URL
if (url) kidsJourneyTestTarget(url)
const time = '2026-11-22T12:00:00.000Z'
async function rejection<T>(p: Promise<T>) {
  try {
    await p
  } catch (error) {
    return error
  }
  throw Error('expected rejection')
}
const sha = (n: number) => n.toString(16).padStart(64, '0')
const slots = (v: number) => v.toString(16).padStart(2, '0') + '00'.repeat(31)
function actor() {
  return { userId: randomUUID(), accountId: randomUUID(), audience: 'kids' as const }
}
const put = (
  id: string,
  n: number,
  kind: PintaCausalManifest['kind'] = 'pixel-sprite',
  baseRevision = 0,
): Extract<PintaCausalMember, { action: 'put' }> => ({
  action: 'put',
  itemId: id,
  name: id,
  kind,
  bytes: 5,
  sha256: sha(n),
  itemUpdatedAt: time,
  formatVersion: 6,
  baseRevision,
  operation: { type: baseRevision ? 'update' : 'create' },
})
const manifest = (
  m: Extract<PintaCausalMember, { action: 'put' }>,
  rest: Partial<PintaCausalManifest> = {},
): PintaCausalManifest => ({
  version: 1,
  itemId: m.itemId,
  name: m.name,
  kind: m.kind,
  nativeSchema: 7,
  requiredNativeSchema: 1,
  backupVersion: 7,
  refs: [],
  doorSelectors: [],
  ...rest,
})
const intent = (
  epoch: string,
  members: PintaCausalMember[],
  readSet: PintaCausalRead[] = [],
): PintaCausalIntent => ({
  protocol: 1,
  opId: randomUUID(),
  baseEpoch: epoch,
  reader: 6,
  members,
  readSet,
})
const reservePage = async (i: PintaCausalIntent) => ({
  ...i,
  page: 0,
  pages: 1,
  intentHash: await pintaCausalIntentHash(i),
})
describe.skipIf(!url)('Pinta causal over the real migration and existing quota lock', () => {
  let conn: DbConnection, db: DrizzlePintaCausalRepository, legacy: DrizzleCreationsRepository
  beforeAll(async () => {
    conn = await openKidsJourneyTestDatabase(url!)
    db = new DrizzlePintaCausalRepository(conn.db)
    legacy = new DrizzleCreationsRepository(conn.db)
  }, 60_000)
  afterAll(() => conn?.close())
  async function reserve(a: ReturnType<typeof actor>, i: PintaCausalIntent) {
    const { status } = await db.reserve(a, await reservePage(i))
    if (status.state !== 'reserved') throw Error('expected live reservation')
    return status.tickets
  }
  async function complete(
    a: ReturnType<typeof actor>,
    i: PintaCausalIntent,
    contents: (PintaCausalManifest | null)[],
    transitions: PintaCausalAttestation['transitions'][] = [],
  ) {
    const tickets = await reserve(a, i)
    for (const [n, binding] of tickets.entries())
      await db.attest(a, {
        purpose: 'pinta-unit-content-v1',
        binding,
        manifest: contents[n]!,
        transitions: transitions[n] ?? [],
      })
    return db.commit(a, { opId: i.opId })
  }
  test('paged intent never publishes prefixes, and a changed index invalidates a later page', async () => {
    const a = actor(),
      first = put('A', 3),
      last = put('z', 4)
    // Seed only owner-scoped, independent index rows to exercise a 100-entry snapshot boundary.
    await conn.sql`insert into members.creations (id,user_id,account_id,audience,tool,item_id,name,kind,item_updated_at,revision,storage_ref,bytes,created_at,synced_at)
     select gen_random_uuid(),${a.userId},${a.accountId},'kids','pinta','s'||n,'s'||n,'pixel-sprite',now(),1,'fixture/'||n,1,now(),now() from generate_series(1,99) n`
    const i = intent('99', [first, last])
    const page = await reservePage(i)
    const one = { ...page, page: 1, pages: 2, members: [last] },
      zero = { ...page, page: 0, pages: 2, members: [first] }
    const prep = await db.reserve(a, one)
    expect(prep.status.state).toBe('collecting')
    expect((await db.reserve(a, one)).status).toEqual(prep.status)
    expect(
      await rejection(db.reserve(a, { ...one, members: [{ ...last, bytes: 99 }] })),
    ).toMatchObject({ reason: 'operation-conflict' })
    expect((await db.page(a, { reader: 6 })).entries).toHaveLength(99)
    const reserved = await db.reserve(a, zero)
    if (reserved.status.state !== 'reserved') throw Error('reservation missing')
    expect(reserved.uploadBytes).toEqual({ A: 5, z: 5 })
    for (const [n, binding] of reserved.status.tickets.entries())
      await db.attest(a, {
        purpose: 'pinta-unit-content-v1',
        binding,
        manifest: manifest([first, last][n]!),
        transitions: [],
      })
    await db.commit(a, i)
    const rawFailure = await rejection(
      Promise.resolve(
        conn.sql`update members.creations set name='old protocol' where user_id=${a.userId} and item_id='z'`,
      ),
    )
    expect(rawFailure).toMatchObject({ code: '23514' })
    const head = await db.page(a, { reader: 6 })
    expect(head.entries).toHaveLength(100)
    expect(head.entries[0]?.itemId).toBe('A')
    expect(
      (await db.page(a, { reader: 6, epoch: head.epoch, cursor: head.nextCursor! })).entries.map(
        (r) => r.itemId,
      ),
    ).toEqual(['z'])
    const p = put('new', 5)
    await complete(a, intent(head.epoch, [p]), [manifest(p)])
    expect(
      await rejection(db.page(a, { reader: 6, epoch: head.epoch, cursor: head.nextCursor! })),
    ).toMatchObject({ reason: 'epoch-changed' })
  })
  test('net quota, compacted tombstone, account deletion fence and expired nonce', async () => {
    const a = actor(),
      old = put('old', 1),
      i = intent('0', [old])
    await complete(a, i, [manifest(old)])
    // Other tools share the authoritative 1 GiB byte budget.
    await conn.sql`insert into members.creations (id,user_id,account_id,audience,tool,item_id,name,kind,item_updated_at,revision,storage_ref,bytes,created_at,synced_at)
     values (gen_random_uuid(),${a.userId},${a.accountId},'kids','studio','quota','quota','classic',now(),1,'fixture',${CREATION_LIMITS.maxTotalBytes - 5},now(),now())`
    const fresh = put('fresh', 2)
    expect(await rejection(reserve(a, intent('1', [fresh])))).toMatchObject({ reason: 'quota' })
    const del = { action: 'delete' as const, itemId: 'old', baseRevision: 1 },
      swap = intent('1', [fresh, del])
    await complete(a, swap, [manifest(fresh), null])
    const ack = (await db.status(a, swap)).status
    expect(ack.state).toBe('committed')
    expect((await db.page(a, { reader: 6 })).entries.map((e) => e.itemId)).toEqual(['fresh'])
    const [tomb] =
      await conn.sql`delete from members.creations where user_id=${a.userId} and item_id='old' and deleted_at is not null returning revision`
    expect(tomb?.revision).toBe(2)
    expect((await db.commit(a, swap)).status).toEqual(ack)
    const free = intent('2', [{ action: 'delete', itemId: 'fresh', baseRevision: 1 }])
    const [oldBinding] = await reserve(a, free)
    const expired = new DrizzlePintaCausalRepository(
      conn.db,
      () => new Date(Date.now() + 24 * 3600000),
    )
    expect((await expired.status(a, free)).status.state).toBe('expired')
    expect(
      await rejection(
        expired.attest(a, {
          purpose: 'pinta-unit-content-v1',
          binding: oldBinding!,
          manifest: null,
          transitions: [],
        }),
      ),
    ).toMatchObject({ reason: 'unverified-content' })
    await conn.sql`insert into members.account_deletion_fences values (${a.accountId},now())`
    expect(await rejection(db.commit(a, free))).toMatchObject({ reason: 'account-deleting' })
  })
  test('retirement releases only expired exact keys and preserves the confirmed seal', async () => {
    const a = actor(),
      m = put('owned', 7),
      i = intent('0', [m])
    const [b] = await reserve(a, i)
    await db.attest(a, {
      purpose: 'pinta-unit-content-v1',
      binding: b!,
      manifest: manifest(m),
      transitions: [],
    })
    await db.commit(a, i)
    // Only this fixture is due, without advancing the worker clock into unrelated fixtures.
    await conn.sql`update members.pinta_causal_objects set not_before='2000-01-01' where user_id=${a.userId}`
    const at = new Date('2001-01-01'),
      queue = new DrizzlePintaRetirementRepository(conn.db)
    const job = await queue.claim(at, new Date(0))
    expect(job?.objectKeys).toEqual([pintaCausalBlobKey(b!, 'upload')])
    expect(job?.scope).toBe('pinta')
    expect(job?.prefixes).toEqual([])
    expect(await queue.claim(at, new Date(0))).toBeNull()
    expect(await queue.fail(job!.id, at)).toBe(true)
    const retry = await queue.claim(at, new Date(0))
    expect(retry?.attempts).toBe(2)
    expect(await queue.complete(job!.id)).toBe(true)
    expect(await queue.claim(at, new Date(0))).toBeNull()
    expect(
      (await db.item(a, { reader: 6, epoch: '1', itemId: m.itemId, revision: 1 })).storageRef,
    ).toBe(pintaCausalBlobKey(b!, 'sealed'))
  })
  test('internal routes require both gateway credentials and reject browser-supplied facts and mixed adult identities', async () => {
    const a = actor(),
      token = 'owned-test-internal-token'
    const reserveUpload = {
      assertPersonalWrite: async () => {
        throw Error('No product entitlement')
      },
    }
    const app = new Elysia()
      .onError(
        ({ error }) =>
          new Response(null, {
            status:
              error instanceof Error && /consumer|token|gateway/i.test(error.message) ? 401 : 403,
          }),
      )
      .use(pintaCausalRoutes({ causal: db, internalToken: token, reserveUpload }))
      .compile()
    const call = (path: string, body: unknown, headers: Record<string, string> = {}) =>
      app.handle(
        new Request(`http://localhost/members/internal/creations/pinta/${path}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...headers },
          body: JSON.stringify(body),
        }),
      )
    const gateway = { 'x-internal-token': token, 'x-consumer-id': 'member-shell' }
    expect(
      (await call('graph/page', { ...a, payload: { reader: 6 } }, { 'x-internal-token': token }))
        .status,
    ).toBe(401)
    expect(
      (
        await call(
          'graph/page',
          { ...a, payload: { reader: 6 } },
          { 'x-consumer-id': 'member-shell' },
        )
      ).status,
    ).toBe(401)
    expect(
      (await call('graph/page', { ...a, audience: 'adult', payload: { reader: 6 } }, gateway))
        .status,
    ).toBe(422)
    expect(
      (await call('units/attest', { ...a, payload: { manifest: {}, verified: true } }, gateway))
        .status,
    ).toBe(422)
    const response = await call('graph/page', { ...a, payload: { reader: 6 } }, gateway)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ epoch: '0', entries: [] })
    const page = await reservePage(intent('0', [put('x', 1)]))
    expect((await call('units/reserve', { ...a, payload: page }, gateway)).status).toBe(403)
    expect(await rejection(db.status(a, page))).toMatchObject({ reason: 'not-found' })
  })
  test('unknown legacy resource allows proven paint/append but blocks structural changes', async () => {
    const a = actor()
    await conn.sql`insert into members.creations(id,user_id,account_id,tool,item_id,kind,name,item_updated_at,revision,format_version,storage_ref,bytes,created_at,synced_at)
     values(gen_random_uuid(),${a.userId},${a.accountId},'pinta','unknown','tilemap','Unknown',now(),1,6,'unknown.gz',5,now(),now())`
    const s = put('sheet', 1, 'tileset'),
      sheet = (m: typeof s, count: number) => manifest(m, { sheet: { tileSize: 8, count } })
    await complete(a, intent('1', [s]), [sheet(s, 3)])
    const paint = {
      ...s,
      baseRevision: 1,
      sha256: sha(2),
      operation: { type: 'paint' as const, slots: slots(6) },
    }
    await complete(a, intent('2', [paint]), [sheet(paint, 3)])
    const append = {
      ...s,
      baseRevision: 2,
      sha256: sha(3),
      operation: { type: 'append' as const, count: 4 },
    }
    await complete(a, intent('3', [append]), [sheet(append, 4)])
    expect((await visible(a)).entries.find((e) => e.itemId === 'sheet')?.layoutRevision).toBe('2')
    const remap = {
      ...s,
      baseRevision: 3,
      sha256: sha(4),
      operation: { type: 'remap' as const, count: 3, oldToNew: [-1, 0, 1, 2] },
    }
    expect(await rejection(complete(a, intent('4', [remap]), [sheet(remap, 3)]))).toMatchObject({
      reason: 'unknown-consumer',
      itemId: 'unknown',
    })
    expect((await visible(a)).epoch).toBe('4')
    expect(
      await rejection(db.page({ ...a, accountId: randomUUID() }, { reader: 6 })),
    ).toMatchObject({ reason: 'not-found' })
  })
  test('name door cannot silently retarget; a set cannot drop a live external art resource', async () => {
    const a = actor(),
      map = put('a', 1, 'tilemap'),
      other = { ...put('b', 2, 'tilemap'), name: 'Vila' },
      art = put('c', 3)
    const set = put('d', 4, 'map-set'),
      reads: PintaCausalRead[] = [
        { source: 'unit', consumerId: 'a', targetId: 'b' },
        { source: 'unit', consumerId: 'd', targetId: 'c' },
      ]
    const state = intent('0', [map, other, art, set], reads)
    await complete(a, state, [
      manifest(map, { doorSelectors: ['Vila'] }),
      manifest(other),
      manifest(art),
      manifest(set, { refs: [{ id: 'c', roles: ['art'], implicitArtSlotZero: true }] }),
    ])
    const duplicate = { ...put('new-map', 5, 'tilemap'), name: 'Vila' }
    const dupe = intent('1', [duplicate])
    expect(await rejection(complete(a, dupe, [manifest(duplicate)]))).toMatchObject({
      reason: 'missing-consumer',
      itemId: 'a',
    })
    await db.abort(a, dupe)
    const drop = intent('1', [{ action: 'delete', itemId: 'c', baseRevision: 1 }])
    expect(await rejection(complete(a, drop, [null]))).toMatchObject({
      reason: 'missing-consumer',
      itemId: 'd',
    })
    await db.abort(a, drop)
    const both = intent('1', [
      { action: 'delete', itemId: 'c', baseRevision: 1 },
      { ...set, baseRevision: 1, operation: { type: 'update' }, sha256: sha(6) },
    ])
    await complete(a, both, [null, manifest(set)])
    expect((await visible(a)).entries.map((e) => e.itemId)).toEqual(['a', 'b', 'd'])
  })
  test('an inverse binds every before/after digest across a disappeared slot and rejects a new consumer', async () => {
    const a = actor(),
      map = put('map', 1, 'tilemap'),
      sheet = put('sheet', 2, 'tileset')
    const read: PintaCausalRead = { source: 'unit', consumerId: 'map', targetId: 'sheet' }
    const m1 = manifest(map, {
        refs: [{ id: 'sheet', roles: ['default-sheet'], indices: slots(3) }],
      }),
      s1 = manifest(sheet, { sheet: { tileSize: 8, count: 2 } })
    await complete(a, intent('0', [map, sheet], [read]), [m1, s1])
    const m2 = { ...map, baseRevision: 1, sha256: sha(3), operation: { type: 'update' as const } },
      s2 = {
        ...sheet,
        baseRevision: 1,
        sha256: sha(4),
        operation: { type: 'remap' as const, count: 1, oldToNew: [-1, 0] },
      }
    const cut = intent('1', [m2, s2], [read])
    await complete(
      a,
      cut,
      [
        manifest(m2, { refs: [{ id: 'sheet', roles: ['default-sheet'], indices: slots(1) }] }),
        manifest(s2, { sheet: { tileSize: 8, count: 1 } }),
      ],
      [[{ sheetId: 'sheet', mode: 'mapped' }], []],
    )
    const origMap = { ...map, baseRevision: 2, operation: { type: 'update' as const } },
      origSheet = {
        ...sheet,
        baseRevision: 2,
        operation: { type: 'remap' as const, count: 2, oldToNew: [1] },
      }
    const wrong = {
      ...intent('2', [{ ...origMap, sha256: sha(5) }, origSheet], [read]),
      inverseOf: cut.opId,
    }
    expect(await rejection(complete(a, wrong, [m1, s1]))).toMatchObject({
      reason: 'stale-base',
      itemId: 'map',
    })
    await db.abort(a, wrong)
    const newMap = put('other', 6, 'map-set'),
      newRead: PintaCausalRead = {
        consumerId: 'other',
        targetId: 'sheet',
        source: 'snapshot',
        revision: 2,
        sha256: sha(4),
        layoutRevision: '2',
      }
    await complete(a, intent('2', [newMap], [newRead]), [
      manifest(newMap, { refs: [{ id: 'sheet', roles: ['art'], implicitArtSlotZero: true }] }),
    ])
    for (const operation of [
      { type: 'append', count: 2 },
      { type: 'update' },
      { type: 'remap', count: 2, oldToNew: [0] },
    ] as const) {
      const sheetOperation =
        operation.type === 'remap' ? { ...operation, oldToNew: [0] } : operation
      const mislabeled = {
        ...intent('3', [origMap, { ...origSheet, operation: sheetOperation }], [read]),
        inverseOf: cut.opId,
      }
      expect(await rejection(complete(a, mislabeled, [m1, s1]))).toMatchObject({
        reason: 'unverified-content',
        itemId: 'sheet',
      })
      await db.abort(a, mislabeled)
      expect((await visible(a)).epoch).toBe('3')
    }
    const blocked = { ...intent('3', [origMap, origSheet], [read]), inverseOf: cut.opId }
    expect(await rejection(complete(a, blocked, [m1, s1]))).toMatchObject({
      reason: 'missing-consumer',
      itemId: 'other',
    })
    await db.abort(a, blocked)
    await complete(a, intent('3', [{ action: 'delete', itemId: 'other', baseRevision: 1 }]), [null])
    const restore = { ...intent('4', [origMap, origSheet], [read]), inverseOf: cut.opId }
    await complete(a, restore, [m1, s1])
    expect((await visible(a)).entries.map((e) => e.sha256)).toEqual([map.sha256, sheet.sha256])
  })
  test('undo of append drops only the former suffix and preserves later users of the prefix', async () => {
    const a = actor(),
      sheet = put('sheet', 1, 'tileset'),
      before = manifest(sheet, { sheet: { tileSize: 8, count: 2 } })
    await complete(a, intent('0', [sheet]), [before])
    const grown = {
      ...sheet,
      baseRevision: 1,
      sha256: sha(2),
      operation: { type: 'append' as const, count: 3 },
    }
    const append = intent('1', [grown])
    await complete(a, append, [manifest(grown, { sheet: { tileSize: 8, count: 3 } })])
    const consumer = put('later', 3, 'tilemap')
    const read: PintaCausalRead = {
      source: 'snapshot',
      consumerId: 'later',
      targetId: 'sheet',
      sha256: grown.sha256,
      revision: 2,
      layoutRevision: '1',
    }
    await complete(a, intent('2', [consumer], [read]), [
      manifest(consumer, { refs: [{ id: 'sheet', roles: ['art'], indices: slots(3) }] }),
    ])
    const undo = (mapping: number[]) => ({
      ...intent('3', [
        { ...sheet, baseRevision: 2, operation: { type: 'remap', oldToNew: mapping, count: 2 } },
      ]),
      inverseOf: append.opId,
    })
    const wrong = undo([-1, 0, 1])
    expect(await rejection(complete(a, wrong, [before]))).toMatchObject({
      reason: 'unverified-content',
      itemId: 'sheet',
    })
    await db.abort(a, wrong)
    await complete(a, undo([0, 1, -1]), [before])
    expect(await visible(a)).toMatchObject({
      epoch: '4',
      entries: [
        { itemId: 'later', revision: 1, sha256: consumer.sha256 },
        { itemId: 'sheet', sha256: sheet.sha256 },
      ],
    })
  })
  test('inverse of a compacted creation cannot delete a recreated identical revision and digest', async () => {
    const a = actor(),
      doc = put('same', 5),
      first = intent('0', [doc])
    await complete(a, first, [manifest(doc)])
    await complete(a, intent('1', [{ action: 'delete', itemId: 'same', baseRevision: 1 }]), [null])
    await conn.sql`delete from members.creations where user_id=${a.userId} and item_id='same' and deleted_at is not null`
    await complete(a, intent('2', [doc]), [manifest(doc)])
    const inverse = {
      ...intent('3', [{ action: 'delete', itemId: 'same', baseRevision: 1 }]),
      inverseOf: first.opId,
    }
    expect(await rejection(complete(a, inverse, [null]))).toMatchObject({
      reason: 'stale-base',
      itemId: 'same',
    })
    expect(await visible(a)).toMatchObject({
      epoch: '3',
      entries: [{ revision: 1, sha256: doc.sha256 }],
    })
  })
  test('opaque future bytes have an explicit owner archive and cannot be admitted or mutated by reader 7', async () => {
    const a = actor()
    await conn.sql`insert into members.creations(id,user_id,account_id,tool,item_id,kind,name,item_updated_at,revision,format_version,storage_ref,bytes,created_at,synced_at)
     values(gen_random_uuid(),${a.userId},${a.accountId},'pinta','future','tilemap','Future',now(),1,99,'old-numbered.gz',530,now(),now())`
    const original = await db.archivePage(a, {})
    expect(PintaCausalArchivePageSchema.safeParse(original).success).toBe(true)
    expect(PintaCausalSnapshotPageSchema.safeParse(original).success).toBe(false)
    expect(original.archive.requiredFormat).toBe(99)
    expect(original.archive.entries[0]?.coverage).toBe('unknown')
    const pin = { epoch: original.archive.epoch, itemId: 'future', revision: 1 }
    const recovered = await db.archiveItem(a, pin)
    expect(PintaCausalArchiveItemSchema.safeParse(recovered).success).toBe(true)
    expect(recovered.archive.storageRef).toBe('old-numbered.gz')
    expect(await rejection(db.page(a, { reader: 7 }))).toMatchObject({ reason: 'client-outdated' })
    expect(await rejection(db.item(a, { ...pin, reader: 7 }))).toMatchObject({
      reason: 'client-outdated',
    })
    expect(await rejection(db.archiveItem(actor(), pin))).toMatchObject({ reason: 'epoch-changed' })
    expect(
      await rejection(reserve(a, { ...intent(pin.epoch, [put('sprite', 2)]), reader: 7 })),
    ).toMatchObject({ reason: 'client-outdated' })
    expect(await db.archivePage(a, {})).toEqual(original)
  })
  test('an old SQL commit already waiting on the quota lock observes adoption before its write', async () => {
    const a = actor(),
      legacyInput = {
        ...a,
        tool: 'pinta' as const,
        itemId: 'queued',
        kind: 'pixel-sprite',
        name: 'queued',
        itemUpdatedAt: new Date(time),
        bytes: 5,
        thumb: null,
        now: new Date(time),
        limits: CREATION_LIMITS,
        formatVersion: 6,
        maxReadFormatVersion: 6,
      }
    await legacy.reserveUpload(legacyInput)
    await legacy.commit({ ...legacyInput, revision: 1, storageRef: 'original.gz' })
    const old = await legacy.reserveUpload({ ...legacyInput, baseRevision: 1 })
    expect(old).toMatchObject({ ok: true, revision: 2 })
    const fresh = put('independent', 2),
      i = intent('1', [fresh]),
      [binding] = await reserve(a, i)
    await db.attest(a, {
      purpose: 'pinta-unit-content-v1',
      binding: binding!,
      manifest: manifest(fresh),
      transitions: [],
    })
    let acquired!: (pid: number) => void, release!: () => void
    const locked = new Promise<number>((r) => {
        acquired = r
      }),
      unlocked = new Promise<void>((r) => {
        release = r
      })
    const holder = conn.sql.begin(async (tx) => {
      const [r] =
        await tx`select pg_backend_pid() as pid,pg_advisory_xact_lock(hashtextextended(${`creation-quota:${a.userId}`},0))`
      acquired(Number(r!.pid))
      await unlocked
    })
    const pid = await locked
    const commit = db.commit(a, i)
    let oldWriter: Promise<unknown> | undefined
    try {
      await waitForAdvisoryWaiters(pid, 1)
      oldWriter =
        conn.sql`update members.creations set revision=pending_revision,storage_ref='old-upload.gz',pending_revision=null
      where user_id=${a.userId} and audience='kids' and tool='pinta' and item_id='queued' and pending_revision=2`.then(
          () => null,
          (error) => error,
        )
      await waitForAdvisoryWaiters(pid, 2)
    } finally {
      release()
      await holder
    }
    expect((await commit).status.state).toBe('committed')
    expect(await oldWriter).toMatchObject({ code: '23514' })
    const epoch = (await db.page(a, { reader: 6 })).epoch
    expect(epoch).toBe('2')
    expect(
      (await db.archiveItem(a, { epoch, itemId: 'queued', revision: 1 })).archive.storageRef,
    ).toBe('original.gz')
    expect(
      await rejection(legacy.commit({ ...legacyInput, revision: 2, storageRef: 'old-upload.gz' })),
    ).toMatchObject({ reason: 'protocol-required' })
    expect((await db.page(a, { reader: 6 })).epoch).toBe(epoch)
  })
  test('restoring a deleted sheet may recompress only an authoring document proven by the original receipt', async () => {
    const a = actor(),
      file = put('file', 3, 'tileset'),
      content = manifest(file, {
        sheet: { tileSize: 8, count: 2 },
        authoredFingerprint: { version: 1, sha256: sha(100) },
      })
    const made = intent('0', [file])
    await complete(a, made, [content])
    const remove = {
      ...intent('1', [{ action: 'delete', itemId: 'file', baseRevision: 1 }]),
      inverseOf: made.opId,
    }
    await complete(a, remove, [null])
    const member = {
      ...file,
      baseRevision: 2,
      sha256: sha(4),
      itemUpdatedAt: '2026-11-22T13:00:00.000Z',
      operation: { type: 'update' as const },
    }
    const ordinary = intent('2', [member])
    expect(await rejection(complete(a, ordinary, [content]))).toMatchObject({
      reason: 'unverified-content',
    })
    await db.abort(a, ordinary)
    const forged = { ...intent('2', [member]), inverseOf: remove.opId }
    expect(
      await rejection(
        complete(a, forged, [
          { ...content, authoredFingerprint: { version: 1, sha256: sha(101) } },
        ]),
      ),
    ).toMatchObject({ reason: 'stale-base' })
    await db.abort(a, forged)
    const restore = { ...intent('2', [member]), inverseOf: remove.opId }
    await reserve(a, restore)
    const plan = await db.member(a, { opId: restore.opId, itemId: 'file' })
    expect(plan.baseEntry).toBeNull()
    expect(plan.inverse).toEqual({
      baseRevision: 2,
      baseSha256: null,
      restoredSha256: file.sha256,
      restoredAuthoredFingerprint: content.authoredFingerprint,
    })
    await complete(a, restore, [content])
    expect((await visible(a)).entries).toMatchObject([
      { itemId: 'file', sha256: member.sha256, layoutRevision: '3' },
    ])
  })
  test('compacting and recreating an ID never revives its previous revision-one object', async () => {
    const a = actor(),
      first = put('reused', 91),
      i = intent('0', [first])
    const [one] = await reserve(a, i)
    await complete(a, i, [manifest(first)])
    await complete(a, intent('1', [{ action: 'delete', itemId: first.itemId, baseRevision: 1 }]), [
      null,
    ])
    await conn.sql`delete from members.creations where user_id=${a.userId} and item_id=${first.itemId} and deleted_at is not null`
    const fresh = put('reused', 92),
      j = intent('2', [fresh]),
      [two] = await reserve(a, j)
    expect(two!.revision).toBe(one!.revision)
    expect(two!.nonce).not.toBe(one!.nonce)
    expect(
      await rejection(
        db.attest(a, {
          purpose: 'pinta-unit-content-v1',
          binding: one!,
          manifest: manifest(first),
          transitions: [],
        }),
      ),
    ).toMatchObject({ reason: 'unverified-content' })
    await complete(a, j, [manifest(fresh)])
    expect((await db.commit(a, i)).status.state).toBe('committed')
    const current = await db.item(a, { reader: 6, epoch: '3', itemId: 'reused', revision: 1 })
    expect(current.storageRef).toBe(pintaCausalBlobKey(two!, 'sealed'))
    expect(current.entry.sha256).toBe(fresh.sha256)
  })
  async function waitForAdvisoryWaiters(pid: number, n: number) {
    const until = Date.now() + 2_000
    while (Date.now() < until) {
      const [r] =
        await conn.sql`select count(*)::int as count from pg_locks mine join pg_locks waiter using(locktype,classid,objid,objsubid)
       where mine.locktype='advisory' and mine.pid=${pid} and mine.granted and not waiter.granted`
      if (Number(r?.count) >= n) return
      await Bun.sleep(5)
    }
    throw Error(`Expected queued PostgreSQL advisory-lock waiters: ${n}`)
  }
  const visible = (a: ReturnType<typeof actor>) => db.page(a, { reader: 6 })

  test('account purge fences a first collecting page before any creation row exists', async () => {
    const a = actor(),
      i = intent('0', [put('first', 1)])
    let acquired!: (pid: number) => void, release!: () => void
    const locked = new Promise<number>((r) => {
        acquired = r
      }),
      unlocked = new Promise<void>((r) => {
        release = r
      })
    const holder = conn.sql.begin(async (tx) => {
      const [owner] =
        await tx`select pg_backend_pid() as pid,pg_advisory_xact_lock(hashtextextended(${`members-account:${a.accountId}`},0))`
      await tx`insert into members.account_deletion_fences(account_id,created_at) values (${a.accountId},now())`
      acquired(Number(owner!.pid))
      await unlocked
    })
    const pid = await locked
    const pending = db.reserve(a, { ...(await reservePage(i)), pages: 2 }).then(
      () => null,
      (e) => e,
    )
    try {
      await waitForAdvisoryWaiters(pid, 1)
    } finally {
      release()
      await holder
    }
    expect(await pending).toMatchObject({ reason: 'account-deleting' })
    expect(
      await conn.sql`select op_id from members.pinta_causal_units where user_id=${a.userId}`,
    ).toHaveLength(0)
  })
  test('A,B,C: omitted remote consumer, failed second upload, idempotent promotion and sealed snapshot', async () => {
    const a = actor(),
      s = put('sheet', 1, 'tileset'),
      m = put('map', 2, 'tilemap')
    const read: PintaCausalRead = { source: 'unit', consumerId: 'map', targetId: 'sheet' }
    const m1 = manifest(m, { refs: [{ id: 'sheet', roles: ['default-sheet'], indices: slots(2) }] })
    const s1 = manifest(s, { sheet: { tileSize: 16, count: 3 } })
    const initial = intent('0', [m, s], [read])
    const created = await complete(a, initial, [m1, s1])
    expect(created.status.state).toBe('committed')
    const sheet2 = {
      ...s,
      baseRevision: 1,
      operation: { type: 'remap' as const, oldToNew: [-1, 0, 1], count: 2 },
      sha256: sha(3),
    }
    const s2 = manifest(sheet2, { sheet: { tileSize: 16, count: 2 } })
    const missing = intent('1', [sheet2])
    expect(await rejection(complete(a, missing, [s2]))).toMatchObject({
      reason: 'missing-consumer',
      itemId: 'map',
    })
    expect((await visible(a)).entries.map((e) => e.sha256)).toEqual([m.sha256, s.sha256])
    await db.abort(a, missing)
    const map2 = { ...m, baseRevision: 1, operation: { type: 'update' as const }, sha256: sha(4) }
    const unit = intent('1', [map2, sheet2], [read]),
      [bMap, bSheet] = await reserve(a, unit)
    await db.attest(a, {
      purpose: 'pinta-unit-content-v1',
      binding: bMap!,
      manifest: manifest(map2, {
        refs: [{ id: 'sheet', roles: ['default-sheet'], indices: slots(1) }],
      }),
      transitions: [{ sheetId: 'sheet', mode: 'mapped' }],
    })
    expect(await rejection(db.commit(a, unit))).toMatchObject({ reason: 'unverified-content' })
    expect((await visible(a)).epoch).toBe('1')
    expect(
      await rejection(
        db.attest(a, {
          purpose: 'pinta-unit-content-v1',
          binding: { ...bSheet!, nonce: randomUUID() },
          manifest: s2,
          transitions: [],
        }),
      ),
    ).toMatchObject({ reason: 'unverified-content' })
    await db.attest(a, {
      purpose: 'pinta-unit-content-v1',
      binding: bSheet!,
      manifest: s2,
      transitions: [],
    })
    const committed = await db.commit(a, unit)
    expect(await db.commit(a, unit)).toEqual(committed)
    const restarted = new DrizzlePintaCausalRepository(conn.db)
    const page = await restarted.page(a, { reader: 6 })
    expect(page.epoch).toBe('2')
    expect(page.entries.map((e) => e.sha256)).toEqual([map2.sha256, sheet2.sha256])
    expect(page.entries[1]?.layoutRevision).toBe('2')
    expect(
      (
        await restarted.item(a, {
          epoch: '2',
          reader: 6,
          revision: bSheet!.revision,
          itemId: 'sheet',
        })
      ).storageRef,
    ).toBe(pintaCausalBlobKey(bSheet!, 'sealed'))
    expect(
      await rejection(restarted.item(a, { epoch: '1', reader: 6, revision: 1, itemId: 'map' })),
    ).toMatchObject({ reason: 'epoch-changed' })
    expect((await restarted.status(a, unit)).status.state).toBe('committed')
    expect(await rejection(legacy.list(a.userId, 'pinta'))).toMatchObject({
      reason: 'protocol-required',
    })
    expect(await legacy.list(a.userId, 'molda')).toEqual([])
  })
  test('new consumer racing structural change has exactly one visible winner; other actor/audience isolated', async () => {
    const a = actor(),
      s = put('s', 12, 'tileset'),
      start = intent('0', [s])
    await complete(a, start, [manifest(s, { sheet: { tileSize: 8, count: 3 } })])
    const sheet2 = {
        ...s,
        baseRevision: 1,
        sha256: sha(13),
        operation: { type: 'remap' as const, count: 2, oldToNew: [-1, 0, 1] },
      },
      m = put('m', 14, 'map-set')
    const ri = intent('1', [sheet2]),
      mi = intent(
        '1',
        [m],
        [
          {
            source: 'snapshot',
            consumerId: 'm',
            targetId: 's',
            revision: 1,
            sha256: s.sha256,
            layoutRevision: '1',
          },
        ],
      )
    const [rb] = await reserve(a, ri),
      [mb] = await reserve(a, mi)
    for (const [binding, content] of [
      [rb!, manifest(sheet2, { sheet: { tileSize: 8, count: 2 } })],
      [mb!, manifest(m, { refs: [{ id: 's', roles: ['art'], indices: slots(2) }] })],
    ] as const)
      await db.attest(a, {
        purpose: 'pinta-unit-content-v1',
        binding,
        manifest: content,
        transitions: [],
      })
    const outcomes = await Promise.allSettled([db.commit(a, ri), db.commit(a, mi)])
    expect(outcomes.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(outcomes.filter((r) => r.status === 'rejected').map((r) => r.reason.reason)).toEqual([
      'epoch-changed',
    ])
    expect((await visible(a)).epoch).toBe('2')
    expect((await visible(actor())).entries).toEqual([])
    expect((await db.page({ ...a, audience: 'adult' }, { reader: 6 })).epoch).toBe('0')
    expect(await rejection(db.status(actor(), ri))).toMatchObject({ reason: 'not-found' })
  })
  test('legacy before adoption gets sealed by revision and epoch; pending old writer cannot cross adoption', async () => {
    const a = actor(),
      u = {
        ...a,
        tool: 'pinta' as const,
        itemId: 'old',
        kind: 'pixel-sprite',
        name: 'old',
        itemUpdatedAt: new Date(time),
        bytes: 5,
        thumb: null,
        now: new Date(time),
        limits: CREATION_LIMITS,
        formatVersion: 6,
        maxReadFormatVersion: 6,
      }
    expect((await legacy.reserveUpload(u)).ok).toBe(true)
    expect((await legacy.commit({ ...u, revision: 1, storageRef: 'legacy-upload' })).ok).toBe(true)
    const pending = await legacy.reserveUpload({ ...u, itemId: 'queued', name: 'queued' })
    expect(pending.ok).toBe(true)
    const snapshot = await visible(a)
    expect(snapshot.epoch).toBe('1')
    expect(snapshot.entries[0]?.coverage).toBe('unknown')
    expect(
      await rejection(db.item(a, { epoch: '1', itemId: 'old', revision: 1, reader: 6 })),
    ).toMatchObject({ reason: 'unverified-content' })
    const { binding } = await db.backfillTicket(a, {
      epoch: '1',
      itemId: 'old',
      revision: 1,
      reader: 6,
    })
    const p = {
      purpose: 'pinta-backfill-content-v1' as const,
      binding,
      sha256: sha(7),
      manifest: manifest(put('old', 7)),
    }
    await db.backfillAttest(a, p)
    expect((await db.backfillAttest(a, p)).entry.sha256).toBe(sha(7))
    expect(
      (await db.item(a, { epoch: '2', itemId: 'old', revision: 1, reader: 6 })).storageRef,
    ).not.toBe('legacy-upload')
    const fresh = put('new', 8),
      i = intent('2', [fresh])
    await complete(a, i, [manifest(fresh)])
    expect(
      await rejection(
        legacy.commit({ ...u, itemId: 'queued', revision: 1, storageRef: 'stale-upload' }),
      ),
    ).toMatchObject({ reason: 'protocol-required' })
    expect((await visible(a)).entries.map((e) => e.itemId)).toEqual(['new', 'old'])
  })
})
