import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { PINTA_PALETTE_LIBRARY_ITEM_ID as itemId } from '@sistemazero/core/creations'
import {
  PintaPaletteTicketSchema,
  pintaPaletteBlobKey,
  PINTA_PALETTE_WRITE_PROTOCOL as protocol,
} from '@sistemazero/core/creations/pinta-palette-writer'
import { createApplication } from '../../src/composition-root'
import { loadEnv } from '../../src/infrastructure/config/env'
import { DrizzleCreationsRepository } from '../../src/infrastructure/persistence/drizzle/creations.repository'
import { openKidsJourneyTestDatabase, optInKidsJourneyDatabase } from './kids-journey-database'

const target = optInKidsJourneyDatabase('PINTA_PALETTE_TEST_DATABASE_URL')
const legacy = process.env.PINTA_PALETTE_PREDECESSOR_ROOT
const oldId = `/members/creations/pinta/${itemId}`
const privatePath = '/members/internal/creations/pinta/palette/'
const token = 'local-palette-http-fixture-token'
const gateway = { 'x-internal-token': token, 'x-consumer-id': 'member-shell' }
const fixture = () => ({ userId: randomUUID(), accountId: randomUUID(), audience: 'kids' as const })

async function server(
  profile: ReturnType<typeof fixture>,
  options: { flag?: string; predecessor?: string } = {},
) {
  const socket = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: () => new Response(null) })
  const port = socket.port!
  await socket.stop(true)
  const env = {
    NODE_ENV: 'test',
    DATABASE_URL: target,
    HOST: '127.0.0.1',
    PORT: String(port),
    GATEWAY_HMAC_SECRET: 'local-verified-upstream-fixture',
    INTERNAL_API_TOKEN: token,
    PINTA_PALETTE_WRITE_CANDIDATE: options.flag,
    PINTA_CAUSAL_QA_PROFILES: JSON.stringify([profile]),
  }
  const previous = options.predecessor
  const app = previous
    ? await (async () => {
        const prior = (file: string) =>
          pathToFileURL(resolve(previous, 'packages/members/src', file)).href
        const [application, config] = await Promise.all([
          import(prior('composition-root.ts')) as Promise<
            typeof import('../../src/composition-root')
          >,
          import(prior('infrastructure/config/env.ts')) as Promise<
            typeof import('../../src/infrastructure/config/env')
          >,
        ])
        return application.createApplication(config.loadEnv(env))
      })()
    : await createApplication(loadEnv(env))
  await app.start()
  return {
    fetch: (path: string, init: RequestInit) => fetch(`http://127.0.0.1:${port}${path}`, init),
    stop: () => app.stop(),
  }
}

function clients(service: Awaited<ReturnType<typeof server>>, actor: ReturnType<typeof fixture>) {
  const external = (suffix: string, method: string, body?: unknown, itemPath = oldId) =>
    service.fetch(itemPath + suffix, {
      method,
      headers: {
        ...gateway,
        'content-type': 'application/json',
        'x-auth-user-id': actor.userId,
        'x-auth-account-id': actor.accountId,
        'x-auth-user-role': 'staff',
        'x-auth-user-status': 'active',
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  const internal = (suffix: string, payload: unknown, overrides?: Record<string, string>) =>
    service.fetch(privatePath + suffix, {
      method: 'POST',
      headers: { ...gateway, 'content-type': 'application/json', ...overrides },
      body: JSON.stringify({ ...actor, privileged: true, payload }),
    })
  return { external, internal }
}

describe.skipIf(!target)('palette writer across actual Members HTTP deployments', () => {
  let db: Awaited<ReturnType<typeof openKidsJourneyTestDatabase>>
  beforeAll(async () => {
    db = await openKidsJourneyTestDatabase(target!)
  }, 60_000)
  afterAll(() => db?.close())

  test('strict negotiation returns an adopted head and never reopens the legacy writer when disabled', async () => {
    const actor = fixture()
    const active = await server(actor, { flag: '1' })
    const current = clients(active, actor)
    const absent = { protocol, adopted: false, generation: null, exists: false, revision: 0 }
    const command = {
      protocol,
      baseGeneration: null,
      baseRevision: 0,
      bytes: 100,
      itemUpdatedAt: new Date().toISOString(),
    }
    const legacyInput = {
      ...command,
      kind: 'palette-library',
      name: 'Paletas do Pinta',
      formatVersion: 1,
    }
    const { protocol: _protocol, baseGeneration: _generation, ...beforeCapability } = legacyInput
    let receipt: { paletteHead: { generation: string; revision: number } }
    try {
      expect(await (await current.internal('head', {})).json()).toEqual({
        paletteHead: absent,
        download: null,
      })
      expect((await current.internal('head', {}, { 'x-consumer-id': 'unrelated' })).status).toBe(
        401,
      )
      expect(
        (await clients(active, { ...actor, userId: randomUUID() }).internal('head', {})).status,
      ).toBe(404)
      const early = await current.external('/upload', 'POST', beforeCapability)
      expect(early.status).toBe(200)
      const legacyRevision = (await early.json()).revision
      const reserved = await current.internal('reserve', command)
      expect(reserved.status).toBe(200)
      const ticket = PintaPaletteTicketSchema.parse((await reserved.json()).ticket)
      expect((await current.external('/commit', 'POST', { revision: legacyRevision })).status).toBe(
        409,
      )
      const attested = await current.internal('commit', { ticket, sha256: '8'.repeat(64) })
      expect(attested.status).toBe(200)
      receipt = await attested.json()
      expect(receipt.paletteHead).toMatchObject({
        adopted: true,
        revision: ticket.revision,
        exists: true,
      })
      expect(
        (
          await current.internal('ticket', {
            protocol,
            nonce: ticket.nonce,
            revision: ticket.revision,
          })
        ).status,
      ).toBe(200)
      expect(await (await current.external('/download', 'GET')).json()).toMatchObject({
        storageKey: pintaPaletteBlobKey(actor, ticket, 'sealed'),
      })
      const studioItem = `/members/creations/studio/${itemId}`
      const studioReserve = await current.external(
        '/upload',
        'POST',
        { ...beforeCapability, name: 'Projeto Studio', kind: 'classic', formatVersion: 2 },
        studioItem,
      )
      expect(studioReserve.status).toBe(200)
      const studioTicket = await studioReserve.json()
      expect(
        (
          await current.external(
            '/commit',
            'POST',
            { revision: studioTicket.revision, verifiedPartHashes: [], verifiedFormatVersion: 2 },
            studioItem,
          )
        ).status,
      ).toBe(200)
      expect(
        await (await current.external('/download', 'GET', undefined, studioItem)).json(),
      ).toMatchObject({ storageKey: studioTicket.storageKey })
      expect(
        (
          await current.external(
            '',
            'DELETE',
            { baseRevision: studioTicket.revision, maxFormatVersion: 2 },
            studioItem,
          )
        ).status,
      ).toBe(200)
      expect((await current.external('/download', 'GET', undefined, studioItem)).status).toBe(404)
      expect(await (await current.internal('head', {})).json()).toMatchObject({
        paletteHead: receipt.paletteHead,
      })
      expect(
        (
          await current.external('/upload', 'POST', {
            ...beforeCapability,
            baseRevision: ticket.revision,
          })
        ).status,
      ).toBe(409)
    } finally {
      await active.stop()
    }
    const disabled = await server(actor)
    try {
      const rolled = clients(disabled, actor)
      expect((await rolled.internal('head', {})).status).toBe(404)
      expect((await rolled.external('/download', 'GET')).status).toBe(200)
      expect(
        (
          await rolled.external('/upload', 'POST', {
            ...beforeCapability,
            baseRevision: receipt!.paletteHead.revision,
          })
        ).status,
      ).toBe(409)
      const other = clients(disabled, fixture())
      expect((await other.external('/upload', 'POST', beforeCapability)).status).toBe(200)
    } finally {
      await disabled.stop()
    }
  }, 45_000)

  test.skipIf(!legacy)(
    'a running predecessor can read but rolls back all SQL writes after adoption',
    async () => {
      const actor = fixture()
      const previous = await server(actor, { predecessor: legacy })
      const old = clients(previous, actor)
      const next = await server(actor, { flag: '1' })
      const current = clients(next, actor)
      const name = 'Paletas do Pinta'
      const when = new Date().toISOString()
      const meta = {
        name,
        kind: 'palette-library',
        bytes: 100,
        itemUpdatedAt: when,
        formatVersion: 1,
      }
      try {
        const returning = fixture()
        const older = clients(previous, returning)
        const expiredAt = new Date(Date.now() - 12 * 60_000)
        const expired = await new DrizzleCreationsRepository(db.db).reserveUpload({
          ...returning,
          ...meta,
          tool: 'pinta',
          itemId,
          itemUpdatedAt: expiredAt,
          now: expiredAt,
          thumb: null,
          baseRevision: 0,
          limits: {
            maxItemBytes: 40 * 1024 * 1024,
            maxTotalBytes: 40 * 1024 * 1024,
            maxItemsPerTool: 100,
          },
          paletteWrite: { protocol, baseGeneration: null },
        })
        if (!expired.ok || !expired.paletteTicket) throw new Error('expired fixture not reserved')
        expect(
          (await older.external('/commit', 'POST', { revision: expired.revision })).status,
        ).toBe(500)
        expect((await older.external('/download', 'GET')).status).toBe(404)
        // Uma linha histórica pode ter o contador abaixo da reserva. Exercita o
        // predecessor que aloca o mesmo número nesta linha após expirar.
        await db.sql`update members.creations set last_reserved_revision = 0
          where user_id = ${returning.userId} and tool = 'pinta' and item_id = ${itemId}`
        const retry = await older.external('/upload', 'POST', { ...meta, baseRevision: 0 })
        expect(retry.status).toBe(200)
        const reopened = (await retry.json()).revision
        expect(reopened).toBe(1)
        expect(reopened).toBe(expired.revision)
        const [physical] = await db.sql`select pending_palette_write from members.creations
          where user_id = ${returning.userId} and tool = 'pinta' and item_id = ${itemId}`
        expect(physical?.pending_palette_write).toBeNull()
        expect((await older.external('/commit', 'POST', { revision: reopened })).status).toBe(200)
        expect(await (await older.external('/download', 'GET')).json()).toMatchObject({
          revision: reopened,
        })

        const created = await old.external('/upload', 'POST', { ...meta, baseRevision: 0 })
        expect(created.status).toBe(200)
        const { revision } = await created.json()
        expect((await old.external('/commit', 'POST', { revision })).status).toBe(200)
        const { paletteHead } = await (await current.internal('head', {})).json()
        const before = await old.external('/upload', 'POST', { ...meta, baseRevision: revision })
        expect(before.status).toBe(200)
        const { revision: oldPending } = await before.json()
        const pending = await current.internal('reserve', {
          protocol,
          baseGeneration: paletteHead.generation,
          baseRevision: revision,
          bytes: 100,
          itemUpdatedAt: when,
        })
        expect(pending.status).toBe(200)
        const ticket = PintaPaletteTicketSchema.parse((await pending.json()).ticket)
        expect((await old.external('/commit', 'POST', { revision: oldPending })).status).toBe(409)
        expect((await current.internal('commit', { ticket, sha256: '9'.repeat(64) })).status).toBe(
          200,
        )
        const ready = await old.external('/download', 'GET')
        expect(ready.status).toBe(200)
        expect(await ready.json()).toMatchObject({
          revision: ticket.revision,
          storageKey: pintaPaletteBlobKey(actor, ticket, 'sealed'),
        })
        expect(
          (await old.external('/upload', 'POST', { ...meta, baseRevision: ticket.revision }))
            .status,
        ).toBe(500)
        expect(
          (await old.external('', 'DELETE', { baseRevision: ticket.revision, maxFormatVersion: 7 }))
            .status,
        ).toBe(500)
        expect(await (await old.external('/download', 'GET')).json()).toMatchObject({
          revision: ticket.revision,
        })
      } finally {
        await Promise.allSettled([previous.stop(), next.stop()])
      }
    },
    45_000,
  )
})
