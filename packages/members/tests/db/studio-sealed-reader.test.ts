import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { creationStorageKey } from '@sistemazero/core/creations'
import {
  STUDIO_SEALED_STORAGE_PROTOCOL,
  STUDIO_SEALED_STORAGE_READER,
  type StudioSealedPartRef,
  type StudioSealedReceipt,
  studioSealedBlobKey,
} from '@sistemazero/core/creations/studio-sealed-storage'
import { sql } from 'drizzle-orm'
import { createApplication } from '../../src/composition-root'
import { loadEnv } from '../../src/infrastructure/config/env'
import type { Database } from '../../src/infrastructure/persistence/drizzle/db'
import { creations } from '../../src/infrastructure/persistence/drizzle/schema'
import { authorizeStudioTransaction } from '../../src/infrastructure/persistence/drizzle/studio-sealed-write-state'
import { kidsJourneyTestTarget, openKidsJourneyTestDatabase } from './kids-journey-database'
import { nativePensa } from './pensa-native-fixture'

const target = process.env.STUDIO_SEALED_TEST_DATABASE_URL
if (target) kidsJourneyTestTarget(target)
const token = 'studio-sealed-reader-http-fixture'
const itemId = 'studio-sealed-qa'

describe.skipIf(!target)('Studio reader against real Members and PostgreSQL', () => {
  let db: Awaited<ReturnType<typeof openKidsJourneyTestDatabase>>
  let app: Awaited<ReturnType<typeof createApplication>>
  let origin: string

  beforeAll(async () => {
    db = await openKidsJourneyTestDatabase(target!)
    const listener = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch: () => new Response(null) })
    const port = listener.port!
    await listener.stop(true)
    origin = `http://127.0.0.1:${port}`
    app = await createApplication(
      loadEnv({
        NODE_ENV: 'test',
        DATABASE_URL: target,
        HOST: '127.0.0.1',
        PORT: String(port),
        GATEWAY_HMAC_SECRET: 'studio-sealed-reader-fixture-secret',
        INTERNAL_API_TOKEN: token,
      }),
    )
    await app.start()
  }, 90_000)
  afterAll(async () => {
    await app?.stop()
    await db?.close()
  })

  function fixtureWrite<T>(change: (tx: Pick<Database, 'execute' | 'insert'>) => Promise<T>) {
    return db.db.transaction(async (tx) => {
      await authorizeStudioTransaction(tx)
      return change(tx)
    })
  }

  async function seed(audience: 'kids' | 'adult') {
    const userId = randomUUID()
    const owner = {
      userId,
      accountId: audience === 'kids' ? randomUUID() : userId,
      audience,
      itemId,
    }
    const receipt: StudioSealedReceipt = {
      protocol: STUDIO_SEALED_STORAGE_PROTOCOL,
      nonce: randomUUID(),
      requirements: { envelopeVersion: 2, projectFormat: 2, materials: 'legacy' },
      gzipSha256: 'a'.repeat(64),
      jsonSha256: 'b'.repeat(64),
      manifestBytes: 100,
    }
    const part: StudioSealedPartRef = {
      protocol: STUDIO_SEALED_STORAGE_PROTOCOL,
      nonce: randomUUID(),
      hash: 'c'.repeat(64),
      gzipSha256: 'd'.repeat(64),
      bytes: 50,
    }
    const storageRef = studioSealedBlobKey(owner, receipt.nonce, 'sealed')
    const now = new Date()
    await fixtureWrite(async (tx) =>
      tx.insert(creations).values({
        ...owner,
        id: randomUUID(),
        tool: 'studio',
        kind: 'classic',
        name: 'Jogo selado',
        itemUpdatedAt: now,
        syncedAt: now,
        createdAt: now,
        formatVersion: 2,
        revision: 4,
        lastReservedRevision: 4,
        bytes: 150,
        storageRef,
        studioSealReceipt: receipt,
        parts: [part],
      }),
    )
    const request = (suffix: string, method = 'GET', body?: unknown, accountId = owner.accountId) =>
      fetch(
        `${origin}/members/creations/studio/${itemId}${suffix}${suffix.includes('?') ? '&' : '?'}audience=${audience}`,
        {
          method,
          headers: {
            'content-type': 'application/json',
            'x-internal-token': token,
            'x-consumer-id': 'member-shell',
            'x-auth-user-id': owner.userId,
            'x-auth-account-id': accountId,
            'x-auth-user-role': 'staff',
            'x-auth-user-status': 'active',
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        },
      )
    return { owner, receipt, part, storageRef, request }
  }

  test('negotiates the independent Studio reader and resolves only the confirmed audience', async () => {
    for (const audience of ['kids', 'adult'] as const) {
      const fixture = await seed(audience)
      const denied = await fixture.request('/download')
      expect(denied.status).toBe(409)
      expect(await denied.json()).toMatchObject({
        error: { code: 'STUDIO_STORAGE_PROTOCOL_REQUIRED' },
      })
      const accepted = await fixture.request(
        `/download?studioReader=${STUDIO_SEALED_STORAGE_READER}`,
      )
      expect(accepted.status).toBe(200)
      expect(await accepted.json()).toMatchObject({
        storageKey: fixture.storageRef,
        revision: 4,
        studioSealReceipt: fixture.receipt,
        parts: [
          {
            ...fixture.part,
            storageKey: studioSealedBlobKey(
              fixture.owner,
              fixture.part.nonce,
              'sealed',
              fixture.part.hash,
            ),
          },
        ],
      })
      const anotherAccount = await fixture.request(
        `/download?studioReader=${STUDIO_SEALED_STORAGE_READER}`,
        'GET',
        undefined,
        randomUUID(),
      )
      expect(anotherAccount.status).toBe(audience === 'adult' ? 403 : 404)
    }
  }, 15_000)

  test('legacy reserve, commit and delete leave sealed or future revisions intact', async () => {
    const { owner, request, storageRef } = await seed('kids')
    const update = {
      name: 'Jogo antigo',
      kind: 'classic',
      bytes: 100,
      itemUpdatedAt: new Date().toISOString(),
      formatVersion: 2,
      baseRevision: 4,
    }
    expect((await request('/upload', 'POST', update)).status).toBe(409)
    expect(
      (
        await request('/commit', 'POST', {
          revision: 4,
          verifiedPartHashes: [],
          verifiedFormatVersion: 2,
        })
      ).status,
    ).toBe(409)
    expect((await request('', 'DELETE', { baseRevision: 4, maxFormatVersion: 3 })).status).toBe(409)

    await fixtureWrite(async (tx) =>
      tx.execute(sql`update members.creations
      set studio_seal_receipt = jsonb_set(studio_seal_receipt, '{requirements,envelopeVersion}', '3'::jsonb)
      where user_id = ${owner.userId} and tool = 'studio' and item_id = ${itemId}`),
    )
    expect((await request(`/download?studioReader=${STUDIO_SEALED_STORAGE_READER}`)).status).toBe(
      409,
    )
    const [row] =
      await db.sql`select storage_ref, revision, pending_revision, deleted_at from members.creations
      where user_id = ${owner.userId} and tool = 'studio' and item_id = ${itemId}`
    expect(row).toMatchObject({
      storage_ref: storageRef,
      revision: 4,
      pending_revision: null,
      deleted_at: null,
    })

    await fixtureWrite(async (tx) =>
      tx.execute(sql`update members.creations set studio_seal_receipt = null, parts = '[]'::jsonb
      where user_id = ${owner.userId} and tool = 'studio' and item_id = ${itemId}`),
    )
    expect((await request(`/download?studioReader=${STUDIO_SEALED_STORAGE_READER}`)).status).toBe(
      409,
    )
    const legacy = creationStorageKey(owner.userId, 'studio', itemId, 4)
    await db.sql`update members.creations set storage_ref = ${legacy}
      where user_id = ${owner.userId} and tool = 'studio' and item_id = ${itemId}`
    expect(await (await request('/download')).json()).toMatchObject({
      storageKey: legacy,
      revision: 4,
    })
  }, 15_000)

  test('Pensa keeps the existing checkpoint and sealed head when it cannot copy or restore them', async () => {
    const fixture = await nativePensa(
      'pensa_studio_reader_fixture',
      false,
      false,
      'kids',
      async () => db,
    )
    const view = await fixture.accept()
    const game = await fixture.savedGame()
    const baseRevisionId = view.revision!.id
    const checkpointId = randomUUID()
    const protect = (action: Parameters<typeof fixture.checkpoints.protect>[2]) =>
      fixture.checkpoints.protect(fixture.actor, fixture.projectId, action, fixture.capabilities)
    async function rejectedProtection(action: Parameters<typeof protect>[0]) {
      try {
        await protect(action)
      } catch (error) {
        return error
      }
      throw new Error('O Pensa aceitou uma revisão que não pode proteger.')
    }
    await protect({ type: 'prepare', id: checkpointId, baseRevisionId, saveRevision: '1' })
    await protect({ type: 'commit', id: checkpointId })

    const nonce = randomUUID()
    const storageRef = studioSealedBlobKey(
      {
        userId: fixture.actor.profileId,
        audience: 'kids',
        itemId: game.creationId,
      },
      nonce,
      'sealed',
    )
    const receipt: StudioSealedReceipt = {
      protocol: STUDIO_SEALED_STORAGE_PROTOCOL,
      nonce,
      requirements: { envelopeVersion: 2, projectFormat: 2, materials: 'legacy' },
      gzipSha256: 'a'.repeat(64),
      jsonSha256: 'b'.repeat(64),
      manifestBytes: 100,
    }
    await fixtureWrite(async (tx) =>
      tx.execute(sql`update members.creations set storage_ref = ${storageRef}, studio_seal_receipt = ${JSON.stringify(receipt)}::jsonb,
      revision = 2, last_reserved_revision = 2, bytes = 100, format_version = 2
      where user_id = ${fixture.actor.profileId} and tool = 'studio' and item_id = ${game.creationId}`),
    )

    expect(
      await rejectedProtection({
        type: 'prepare',
        id: randomUUID(),
        baseRevisionId,
        saveRevision: '2',
      }),
    ).toMatchObject({ code: 'REVISION_CONFLICT' })
    expect(
      await rejectedProtection({
        type: 'restore_prepare',
        id: randomUUID(),
        checkpointId,
        baseRevisionId,
        saveRevision: '2',
      }),
    ).toMatchObject({ code: 'REVISION_CONFLICT' })
    expect(
      (await fixture.checkpoints.list(fixture.actor, fixture.projectId)).map(
        (checkpoint) => checkpoint.id,
      ),
    ).toEqual([checkpointId])
    const [row] = await db.sql`select storage_ref, revision, pending_revision from members.creations
      where user_id = ${fixture.actor.profileId} and tool = 'studio' and item_id = ${game.creationId}`
    expect(row).toEqual({ storage_ref: storageRef, revision: 2, pending_revision: null })
  }, 15_000)
})
