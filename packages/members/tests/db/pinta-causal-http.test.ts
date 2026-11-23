import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  type PintaCausalIntent,
  type PintaCausalManifest,
  pintaCausalIntentHash,
} from '@sistemazero/core/creations/pinta-causal'
import { createApplication } from '../../src/composition-root'
import { loadEnv } from '../../src/infrastructure/config/env'
import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { openKidsJourneyTestDatabase, optInKidsJourneyDatabase } from './kids-journey-database'

// This suite starts the complete Members application on loopback using its real composition root.
// The profile and account UUIDs are private to each run. Existing database rows are preserved.
const target = optInKidsJourneyDatabase('PINTA_CAUSAL_HTTP_TEST_DATABASE_URL')
const token = 'owned-causal-http-test-token'
const gateway = { 'x-internal-token': token, 'x-consumer-id': 'member-shell' }

async function serving(
  flag: string | undefined,
  secret: string | undefined,
  profiles: string | undefined,
  inspect: (base: string) => Promise<void>,
) {
  const socket = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: () => new Response(null) })
  const port = socket.port!
  await socket.stop(true)
  const env = loadEnv({
    NODE_ENV: 'test',
    DATABASE_URL: target,
    HOST: '127.0.0.1',
    PORT: String(port),
    GATEWAY_HMAC_SECRET: 'owned-http-gateway-secret',
    INTERNAL_API_TOKEN: secret,
    PINTA_CAUSAL_CANDIDATE: flag,
    PINTA_CAUSAL_QA_PROFILES: profiles,
  })
  const app = await createApplication(env)
  await app.start()
  try {
    await inspect(`http://127.0.0.1:${port}`)
  } finally {
    await app.stop()
  }
}

describe.skipIf(!target)('Pinta causal through the full Members HTTP server and PostgreSQL', () => {
  let conn: DbConnection
  beforeAll(async () => {
    conn = await openKidsJourneyTestDatabase(target!)
  }, 60_000)
  afterAll(() => conn?.close())
  test('private flags, authenticated reservations, large proof, publication, archive and protected rollback', async () => {
    const actor = { userId: randomUUID(), accountId: randomUUID(), audience: 'kids' as const }
    const profiles = JSON.stringify([actor])
    const post = (
      base: string,
      path: string,
      payload: unknown,
      options: { actor?: object; headers?: Record<string, string> } = {},
    ) =>
      fetch(`${base}/members/internal/creations/pinta/${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(options.headers ?? gateway) },
        body: JSON.stringify({ ...actor, ...options.actor, payload }),
      })
    await conn.sql`insert into members.creations(id,user_id,account_id,tool,item_id,kind,name,item_updated_at,revision,format_version,storage_ref,bytes,created_at,synced_at)
      values(gen_random_uuid(),${actor.userId},${actor.accountId},'pinta','map','tilemap','Map',now(),1,6,'old/map.gz',120000,now(),now())`
    await conn.sql`insert into members.creations(id,user_id,account_id,tool,item_id,kind,name,item_updated_at,revision,format_version,storage_ref,bytes,created_at,synced_at)
      values(gen_random_uuid(),${actor.userId},${actor.accountId},'pinta','sz-pinta-palettes','palette-library','Minhas paletas',now(),1,1,'palettes/library.gz',100,now(),now())`
    const member = {
      itemId: 'map',
      name: 'Map',
      kind: 'tilemap' as const,
      action: 'put' as const,
      bytes: 120000,
      sha256: 'b'.repeat(64),
      formatVersion: 6,
      itemUpdatedAt: new Date().toISOString(),
      baseRevision: 1,
      operation: { type: 'update' as const },
    }
    const intent: PintaCausalIntent = {
      protocol: 1,
      opId: randomUUID(),
      baseEpoch: '2',
      reader: 6,
      readSet: [],
      members: [member],
    }
    const page = { ...intent, page: 0, pages: 1, intentHash: await pintaCausalIntentHash(intent) }
    // A legacy draft can contain unresolved external properties. Updating that same draft keeps them.
    const manifest: PintaCausalManifest = {
      version: 1,
      itemId: 'map',
      name: 'Map',
      kind: 'tilemap',
      backupVersion: 7,
      nativeSchema: 7,
      requiredNativeSchema: 1,
      doorSelectors: [],
      refs: Array.from({ length: 850 }, (_, i) => ({
        id: `missing-${String(i).padStart(3, '0')}-${'x'.repeat(64)}`,
        roles: ['property'],
      })),
    }
    expect(Buffer.byteLength(JSON.stringify(manifest))).toBeGreaterThan(64 * 1024)
    for (const [flag, secret, list] of [
      [undefined, token, profiles],
      ['1', undefined, profiles],
      ['1', token, undefined],
      ['1', token, '[malformed'],
    ] as const) {
      await serving(flag, secret, list, async (base) => {
        expect(
          (await post(base, 'units/reserve', page, { actor: { privileged: true } })).status,
        ).toBe(404)
      })
    }
    await serving('1', token, profiles, async (base) => {
      const status = { opId: intent.opId }
      for (const headers of [
        { 'x-consumer-id': 'member-shell', 'x-internal-token': 'wrong' },
        { 'x-consumer-id': 'another-service', 'x-internal-token': token },
      ])
        expect(
          (await post(base, 'units/reserve', page, { actor: { privileged: true }, headers }))
            .status,
        ).toBe(401)
      for (const other of [
        { userId: randomUUID(), privileged: true },
        { accountId: randomUUID(), privileged: true },
        { audience: 'adult', accountId: actor.userId, privileged: true },
      ]) {
        const denied = await post(base, 'units/reserve', page, { actor: other })
        expect(denied.status).toBe(404)
        expect(await denied.json()).toEqual({ reason: 'not-found' })
        expect((await post(base, 'graph/page', { reader: 6 }, { actor: other })).status).toBe(404)
      }
      expect((await post(base, 'units/reserve', { ...page, trusted: true })).status).toBe(422)
      expect(
        (await post(base, 'units/reserve', page, { actor: { audience: 'adult' } })).status,
      ).toBe(422)
      expect((await post(base, 'units/reserve', page)).status).toBe(403)
      expect((await post(base, 'units/status', status)).status).toBe(404)
      expect(
        await conn.sql`select op_id from members.pinta_causal_units where user_id=${actor.userId}`,
      ).toHaveLength(0)
      const sheets = Array.from({ length: 100 }, (_, i) => ({
        ...member,
        itemId: `sheet-${String(i).padStart(3, '0')}`,
        kind: 'tileset' as const,
        operation: {
          type: 'remap' as const,
          count: 256,
          oldToNew: Array.from({ length: 256 }, (_, slot) => 255 - slot),
        },
      }))
      const catalog: PintaCausalIntent = {
        ...intent,
        opId: randomUUID(),
        baseEpoch: '1',
        members: [...sheets, { ...member, itemId: 'zz-map' }],
      }
      const firstPage = {
        ...catalog,
        members: sheets,
        page: 0,
        pages: 2,
        intentHash: await pintaCausalIntentHash(catalog),
      }
      expect(Buffer.byteLength(JSON.stringify(firstPage))).toBeGreaterThan(64 * 1024)
      const collecting = await post(base, 'units/reserve', firstPage, {
        actor: { privileged: true },
      })
      expect(await collecting.json()).toMatchObject({
        status: { state: 'collecting', receivedPages: [0] },
      })
      const aborted = await post(base, 'units/abort', { opId: catalog.opId })
      expect(await aborted.json()).toMatchObject({ status: { state: 'aborted' } })
      const pin = { epoch: '1', itemId: 'map', revision: 1 }
      const opaque = await post(base, 'graph/item', { ...pin, mode: 'archive' })
      expect(await opaque.json()).toMatchObject({ archive: { storageRef: 'old/map.gz' } })
      expect((await post(base, 'graph/item', { ...pin, reader: 6 })).status).toBe(409)
      const ticket = await post(base, 'backfill/ticket', { ...pin, reader: 6 })
      const { binding } = await ticket.json()
      const backfill = {
        purpose: 'pinta-backfill-content-v1',
        binding,
        sha256: 'a'.repeat(64),
        manifest,
      }
      expect((await post(base, 'backfill/attest', backfill)).status).toBe(200)
      const reservation = await post(base, 'units/reserve', page, { actor: { privileged: true } })
      expect(reservation.status).toBe(200)
      const {
        status: { tickets },
      } = await reservation.json()
      expect((await post(base, 'units/member', { ...status, itemId: 'map' })).status).toBe(200)
      expect(
        (await post(base, 'units/status', status, { actor: { accountId: randomUUID() } })).status,
      ).toBe(404)
      expect(
        (
          await post(base, 'units/status', status, {
            actor: { audience: 'adult', accountId: actor.userId },
          })
        ).status,
      ).toBe(404)
      expect((await post(base, 'units/commit', status)).status).toBe(409)
      const proof = {
        purpose: 'pinta-unit-content-v1',
        binding: tickets[0],
        manifest,
        transitions: [],
      }
      expect((await post(base, 'units/attest', proof)).status).toBe(200)
      const ack = await post(base, 'units/commit', status)
      expect(await ack.json()).toMatchObject({
        status: {
          state: 'committed',
          result: { epoch: '3', members: [{ revision: 2, sha256: member.sha256 }] },
        },
      })
      const snapshot = await post(base, 'graph/page', { reader: 6 })
      expect(await snapshot.json()).toMatchObject({
        epoch: '3',
        entries: [{ itemId: 'map', coverage: 'certified' }],
      })
      const item = await post(base, 'graph/item', {
        epoch: '3',
        itemId: 'map',
        revision: 2,
        reader: 6,
      })
      expect((await item.json()).storageRef).toEndWith('/2.sealed.gz')
      expect(
        (await post(base, 'units/status', { ...status, unused: 'x'.repeat(80 * 1024) })).status,
      ).toBe(413)
      expect(
        (await post(base, 'units/attest', { ...proof, unused: 'x'.repeat(2 * 1024 * 1024) }))
          .status,
      ).toBe(413)
    })
    for (const [flag, list] of [
      ['0', profiles],
      ['1', JSON.stringify([{ ...actor, userId: randomUUID() }])],
    ]) {
      await serving(flag, token, list, async (base) => {
        expect((await post(base, 'graph/page', { reader: 6 })).status).toBe(404)
        const old = await fetch(`${base}/members/creations/pinta`, {
          headers: { ...gateway, 'x-auth-user-id': actor.userId },
        })
        expect(old.status).toBe(409)
        expect(await old.json()).toMatchObject({ reason: 'protocol-required' })
        const palette = await fetch(`${base}/members/creations/pinta/sz-pinta-palettes/download`, {
          headers: { ...gateway, 'x-auth-user-id': actor.userId },
        })
        expect(palette.status).toBe(200)
        expect(await palette.json()).toMatchObject({ storageKey: 'palettes/library.gz' })
        if (flag === '1') {
          // An unchanged legacy client still writes the reserved item with an observed current base.
          const endpoint = `${base}/members/creations/pinta/sz-pinta-palettes`
          const headers = {
            ...gateway,
            'content-type': 'application/json',
            'x-auth-user-id': actor.userId,
            'x-auth-account-id': actor.accountId,
            'x-auth-user-status': 'active',
            'x-auth-user-role': 'admin',
          }
          const upload = (baseRevision: number) =>
            fetch(`${endpoint}/upload`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                baseRevision,
                name: 'Minhas paletas',
                kind: 'palette-library',
                formatVersion: 1,
                itemUpdatedAt: new Date().toISOString(),
                bytes: 100,
              }),
            })
          expect((await upload(0)).status).toBe(409)
          const accepted = await upload(1)
          expect(accepted.status).toBe(200)
          const ticket = await accepted.json()
          expect(
            (
              await fetch(`${endpoint}/commit`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  revision: ticket.revision,
                  verifiedPartHashes: [],
                  verifiedFormatVersion: 1,
                }),
              })
            ).status,
          ).toBe(200)
          expect(await (await fetch(`${endpoint}/download`, { headers })).json()).toMatchObject({
            revision: ticket.revision,
          })
        }
        const otherProfile = await fetch(
          `${base}/members/creations/pinta/sz-pinta-palettes/download`,
          { headers: { ...gateway, 'x-auth-user-id': randomUUID() } },
        )
        expect(otherProfile.status).toBe(404)
      })
    }
  }, 60_000)
})
