import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  STUDIO_SEALED_STORAGE_PROTOCOL as protocol,
  STUDIO_SEALED_STORAGE_READER as reader,
  studioSealedBlobKey,
} from '@sistemazero/core/creations/studio-sealed-storage'
import {
  type StudioSealedCommitProof,
  type StudioSealedTicket,
  StudioSealedTicketSchema,
} from '@sistemazero/core/creations/studio-sealed-writer'
import { createApplication } from '../../src/composition-root'
import { loadEnv } from '../../src/infrastructure/config/env'
import { DrizzleCreationsRepository } from '../../src/infrastructure/persistence/drizzle/creations.repository'
import { DrizzleStudioSealedRetirementRepository } from '../../src/infrastructure/persistence/drizzle/studio-sealed-retirement'
import { openKidsJourneyTestDatabase, optInKidsJourneyDatabase } from './kids-journey-database'

const target = optInKidsJourneyDatabase('STUDIO_SEALED_TEST_DATABASE_URL')
const predecessor = process.env.STUDIO_SEALED_PREDECESSOR_ROOT
const secret = 'studio-sealed-test-authorization-token'
const profile = () => {
  const id = randomUUID()
  return { userId: id, accountId: id, audience: 'adult' as const }
}
const hash = 'a'.repeat(64)
const itemId = 'studio-sealed-jogo'
const requirements = { envelopeVersion: 2, projectFormat: 2, materials: 'legacy' } as const
const metadata = () => ({
  name: 'Jogo selado',
  kind: 'classic',
  bytes: 100,
  itemUpdatedAt: new Date().toISOString(),
})

async function server(
  owner: ReturnType<typeof profile>,
  flags: { enabled?: boolean; prior?: string } = {},
) {
  const listener = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch: () => new Response(null) })
  const port = listener.port!
  await listener.stop(true)
  const env = {
    NODE_ENV: 'test',
    DATABASE_URL: target,
    HOST: '127.0.0.1',
    PORT: String(port),
    GATEWAY_HMAC_SECRET: 'studio-sealed-test-gateway-fixture',
    INTERNAL_API_TOKEN: secret,
    STUDIO_SEALED_PARTS_CANDIDATE: flags.enabled ? '1' : undefined,
    STUDIO_SEALED_QA_PROFILES: JSON.stringify([owner]),
  }
  const app = flags.prior
    ? await (async () => {
        const module = (file: string) =>
          pathToFileURL(resolve(flags.prior!, 'packages/members/src', file)).href
        const [application, configuration] = await Promise.all([
          import(module('composition-root.ts')) as Promise<
            typeof import('../../src/composition-root')
          >,
          import(module('infrastructure/config/env.ts')) as Promise<
            typeof import('../../src/infrastructure/config/env')
          >,
        ])
        return application.createApplication(configuration.loadEnv(env))
      })()
    : await createApplication(loadEnv(env))
  await app.start()
  const transport = (path: string, method: string, body?: unknown, consumer = 'member-shell') =>
    fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        'x-internal-token': secret,
        'x-consumer-id': consumer,
        'x-auth-user-id': owner.userId,
        'x-auth-account-id': owner.accountId,
        'x-auth-user-role': 'staff',
        'x-auth-user-status': 'active',
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  return {
    inner: (
      command: string,
      payload: unknown,
      options: { privileged?: boolean; owner?: typeof owner; consumer?: string } = {},
    ) =>
      transport(
        `/members/internal/creations/studio/seal/${command}`,
        'POST',
        { ...(options.owner ?? owner), privileged: options.privileged ?? true, payload },
        options.consumer,
      ),
    outer: (suffix: string, method = 'GET', body?: unknown) =>
      transport(
        `/members/creations/studio/${itemId}${suffix}${suffix.includes('?') ? '&' : '?'}audience=adult`,
        method,
        body,
      ),
    stop: () => app.stop(),
  }
}

function proof(ticket: StudioSealedTicket): StudioSealedCommitProof {
  return {
    ticket,
    receipt: {
      protocol,
      nonce: ticket.nonce,
      requirements: ticket.requirements,
      manifestBytes: ticket.bytes,
      gzipSha256: 'c'.repeat(64),
      jsonSha256: 'd'.repeat(64),
    },
    parts: ticket.parts.map((part) => ({
      protocol,
      hash: part.hash,
      bytes: part.bytes,
      nonce: part.source === 'sealed' ? part.nonce : ticket.nonce,
      gzipSha256: part.source === 'sealed' ? part.gzipSha256 : 'b'.repeat(64),
    })),
  }
}

describe.skipIf(!target)('Studio sealed writer authority', () => {
  let db: Awaited<ReturnType<typeof openKidsJourneyTestDatabase>>
  beforeAll(async () => {
    db = await openKidsJourneyTestDatabase(target!)
  }, 90_000)
  afterAll(() => db?.close())

  test('negotiates, protects earlier tickets, requires current grants and preserves reused parts during GC', async () => {
    const owner = profile()
    const active = await server(owner, { enabled: true })
    const catalog = { protocol, itemId }
    try {
      expect((await active.inner('head', catalog, { consumer: 'other-service' })).status).toBe(401)
      expect((await active.inner('head', catalog, { owner: profile() })).status).toBe(404)
      const initial = await active.outer('/upload', 'POST', {
        ...metadata(),
        formatVersion: 2,
        baseRevision: 0,
        parts: [{ hash, bytes: 50 }],
      })
      expect(initial.status).toBe(200)
      const legacy = await initial.json()
      expect(
        (
          await active.outer('/commit', 'POST', {
            revision: legacy.revision,
            verifiedFormatVersion: 2,
            verifiedPartHashes: [hash],
            uploadedParts: [hash],
          })
        ).status,
      ).toBe(200)
      const head = (await (await active.inner('head', catalog)).json()).studioHead
      const command = {
        ...catalog,
        ...metadata(),
        baseGeneration: head.generation,
        baseRevision: head.revision,
        thumb: null,
        requirements,
        parts: [{ hash }],
      }
      const reservation = await active.inner('reserve', command)
      expect(reservation.status).toBe(200)
      const first = StudioSealedTicketSchema.parse((await reservation.json()).ticket)
      expect(first.parts).toEqual([{ hash, bytes: 50, rev: legacy.revision, source: 'legacy' }])
      expect(
        (
          await active.outer('/commit', 'POST', {
            revision: legacy.revision,
            verifiedFormatVersion: 2,
            verifiedPartHashes: [hash],
          })
        ).status,
      ).toBe(409)
      expect((await active.inner('commit', proof(first), { privileged: false })).status).toBe(403)
      const firstProof = proof(first)
      const written = await active.inner('commit', firstProof)
      expect(written.status).toBe(200)
      const result = await written.json()
      expect(result.studioHead).toMatchObject({
        adopted: true,
        exists: true,
        revision: first.revision,
      })
      expect(result.studioHead.generation).not.toBe(head.generation)
      expect(
        await (
          await active.inner('ticket', { ...catalog, nonce: first.nonce, revision: first.revision })
        ).json(),
      ).toEqual({ ...result, committed: true })
      expect(await (await active.inner('commit', firstProof)).json()).toEqual(result)
      expect(
        (
          await active.inner('commit', {
            ...firstProof,
            receipt: { ...firstProof.receipt, jsonSha256: 'e'.repeat(64) },
          })
        ).status,
      ).toBe(409)
      const second = StudioSealedTicketSchema.parse(
        (
          await (
            await active.inner('reserve', {
              ...command,
              baseGeneration: result.studioHead.generation,
              baseRevision: first.revision,
            })
          ).json()
        ).ticket,
      )
      const [firstPart] = firstProof.parts
      if (!firstPart) throw Error('A primeira gravação tem uma parte.')
      expect(second.parts).toEqual([{ ...firstPart, source: 'sealed' }])
      expect((await active.inner('commit', proof(second))).status).toBe(200)

      const locator = { ...owner, itemId }
      const cleanup = new DrizzleStudioSealedRetirementRepository(db.db)
      const due = new Date(Date.now() + 31 * 60_000)
      const retired: string[] = []
      for (let n = 0; n < 32; n++) {
        const removal = await cleanup.claim(due, due)
        if (!removal) break
        retired.push(...(removal.objectKeys ?? []))
        expect(await cleanup.complete(removal.id)).toBe(true)
      }
      expect(retired).toContain(studioSealedBlobKey(locator, first.nonce, 'sealed'))
      expect(retired).not.toContain(studioSealedBlobKey(locator, first.nonce, 'sealed', hash))
      expect(retired).not.toContain(studioSealedBlobKey(locator, second.nonce, 'sealed'))
      expect(
        (
          await active.outer('/upload', 'POST', {
            ...metadata(),
            formatVersion: 2,
            baseRevision: second.revision,
          })
        ).status,
      ).toBe(409)
    } finally {
      await active.stop()
    }
  }, 30_000)

  test.skipIf(!predecessor)(
    'rollback reader still downloads while predecessor writes fail after adoption and compaction',
    async () => {
      const owner = profile()
      const active = await server(owner, { enabled: true })
      const old = await server(owner, { prior: predecessor })
      try {
        const catalog = { protocol, itemId }
        const command = {
          ...catalog,
          ...metadata(),
          baseGeneration: null,
          baseRevision: 0,
          thumb: null,
          requirements,
          parts: [],
        }
        const created = await active.inner('reserve', command)
        expect(created.status).toBe(200)
        const first = StudioSealedTicketSchema.parse((await created.json()).ticket)
        const stored = await active.inner('commit', proof(first))
        expect(stored.status).toBe(200)
        const before = (await stored.json()).studioHead
        expect((await old.outer('/download')).status).toBe(409)
        const legacyRead = await old.outer(`/download?studioReader=${reader}`)
        expect(legacyRead.status).toBe(200)
        expect(await legacyRead.json()).toMatchObject({
          storageKey: studioSealedBlobKey({ ...owner, itemId }, first.nonce, 'sealed'),
          revision: first.revision,
        })
        expect(
          (
            await old.outer('/upload', 'POST', {
              ...metadata(),
              formatVersion: 2,
              baseRevision: first.revision,
            })
          ).status,
        ).toBeGreaterThanOrEqual(400)
        expect(
          (await old.outer('', 'DELETE', { maxFormatVersion: 3, baseRevision: first.revision }))
            .status,
        ).toBeGreaterThanOrEqual(400)
        const removed = await active.inner('delete', {
          ...catalog,
          baseRevision: first.revision,
          baseGeneration: before.generation,
        })
        expect(removed.status).toBe(200)
        const after = (await removed.json()).studioHead
        expect(after).toMatchObject({ adopted: true, revision: 0, exists: false })
        expect(after.generation).not.toBe(before.generation)
        const repo = new DrizzleCreationsRepository(db.db, 'adult')
        expect(await repo.compactTombstones(new Date(Date.now() + 1000), 10)).toBeGreaterThan(0)
        expect(
          (await old.outer('/upload', 'POST', { ...metadata(), formatVersion: 2, baseRevision: 0 }))
            .status,
        ).toBeGreaterThanOrEqual(400)
        const fresh = StudioSealedTicketSchema.parse(
          (
            await (
              await active.inner('reserve', { ...command, baseGeneration: after.generation })
            ).json()
          ).ticket,
        )
        expect(fresh.revision).toBe(first.revision)
        expect(fresh.nonce).not.toBe(first.nonce)
        expect((await active.inner('commit', proof(first))).status).toBe(409)
        expect((await active.inner('commit', proof(fresh))).status).toBe(200)
      } finally {
        await Promise.allSettled([old.stop(), active.stop()])
      }
    },
    45_000,
  )
})
