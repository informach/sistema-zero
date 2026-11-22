import { expect, mock, test } from 'bun:test'
import { createHash, randomUUID } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { CreateBucketCommand, S3Client } from '@aws-sdk/client-s3'
import { PINTA_PALETTE_LIBRARY_ITEM_ID as itemId } from '@sistemazero/core/creations'
import { PINTA_PALETTE_WRITE_PROTOCOL as protocol } from '@sistemazero/core/creations/pinta-palette-writer'
import { SignJWT } from 'jose'
import { createApplication as createGateway } from '../../api-gateway/src/composition-root'
import { loadEnv as gatewayEnv } from '../../api-gateway/src/infrastructure/config/env'
import { pintaCausalRoutes } from '../../api-gateway/src/infrastructure/config/pinta-causal-routes'
import { createApplication as createMembers } from '../../members/src/composition-root'
import { loadEnv as membersEnv } from '../../members/src/infrastructure/config/env'
import {
  kidsJourneyTestTarget,
  openKidsJourneyTestDatabase,
} from '../../members/tests/db/kids-journey-database'
import type { SessionModule } from '../src/server/session'

mock.module('server-only', () => ({}))
const { createCreationsRoutes } = await import('../src/routes/creations')
const { createPintaPaletteWrites } = await import('../src/routes/pinta-palette-writes')
const { createGatewayModule } = await import('../src/server/gateway')
const { createMembersClient } = await import('../src/server/clients')

const endpoint = process.env.R2_S3_ENDPOINT
const bucket = process.env.R2_UGC_BUCKET
const database = process.env.PINTA_PALETTE_TEST_DATABASE_URL
if (endpoint !== 'http://127.0.0.1:5578' || !bucket?.startsWith('pinta-causal-qa-') || !database)
  throw new Error('Configure the disposable QA bucket and database.')
const pg = kidsJourneyTestTarget(database)
if (pg.port !== '55553' || pg.pathname !== '/kids_journey_pinta_palette_scope_v2')
  throw new Error('Use the dedicated Pinta palette database.')

const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
const sample = (hex: string, updatedAt: number) => ({
  version: 1,
  updatedAt,
  palettes: [{ id: 'vila', name: 'Vila', colors: ['', ...Array(15).fill(hex)], updatedAt }],
  removed: [],
})
type Ticket = {
  revision: number
  uploadUrl: string
  headers: Record<string, string>
  paletteWrite?: { protocol: typeof protocol; nonce: string }
}
type Head = { generation: string | null; revision: number; exists: boolean; adopted: boolean }

test('palette confirmation keeps its exact sealed bytes through legacy replay, delete and recreate', async () => {
  const prepared = await openKidsJourneyTestDatabase(database)
  const internalToken = randomUUID()
  const HMAC = randomUUID()
  const jwtSecret = randomUUID() + randomUUID()
  const user = {
    id: randomUUID(),
    role: 'staff',
    status: 'active',
    email: 'pinta-qa@example.test',
    firstName: 'QA',
    lastName: 'Pinta',
  }
  const profile = { audience: 'adult' as const, userId: user.id, accountId: user.id }
  const profiles = JSON.stringify([profile])
  const access = await new SignJWT({
    role: user.role,
    status: user.status,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(new TextEncoder().encode(jwtSecret))
  const verify = async (value: string) =>
    value === access ? { ok: true, user } : { ok: false, expired: false }
  const session = {
    audience: 'adult',
    getSession: async () => user,
    getAccessToken: async () => access,
    getRefreshToken: async () => 'private-qa-refresh',
    verifyAccessToken: verify,
    verifyAccessTokenLocally: verify,
  } as unknown as SessionModule
  process.env.GATEWAY_URL = 'http://127.0.0.1:5598'
  process.env.JWT_HS256_SECRET = jwtSecret
  process.env.MEMBER_SHELL_HMAC_SECRET = HMAC
  process.env.PINTA_PALETTE_WRITE_CANDIDATE = '1'
  process.env.PINTA_CAUSAL_QA_PROFILES = profiles

  const members = await createMembers(
    membersEnv({
      NODE_ENV: 'test',
      DATABASE_URL: database,
      HOST: '127.0.0.1',
      PORT: '5597',
      INTERNAL_API_TOKEN: internalToken,
      GATEWAY_HMAC_SECRET: randomUUID(),
      PINTA_PALETTE_WRITE_CANDIDATE: '1',
      PINTA_CAUSAL_QA_PROFILES: profiles,
    }),
  )
  const transforms = [
    { type: 'header-inject' as const, options: { headers: { 'x-internal-token': internalToken } } },
  ]
  const ordinary = [
    ['GET', '/members/creations/:tool'],
    ['POST', '/members/creations/:tool/:itemId/upload'],
    ['POST', '/members/creations/:tool/:itemId/commit'],
    ['GET', '/members/creations/:tool/:itemId/download'],
    ['DELETE', '/members/creations/:tool/:itemId'],
  ] as const
  const gateway = await createGateway(
    gatewayEnv({
      NODE_ENV: 'test',
      PORT: '5598',
      LOG_LEVEL: 'info',
      SHUTDOWN_DRAIN_MS: '0',
      TRUST_PROXY: 'true',
      TRUSTED_PROXY_HOPS: '1',
      JWT_HS256_SECRET: jwtSecret,
    }),
    {
      rawConfig: {
        consumers: [{ id: 'member-shell', hmacSecret: HMAC, allowedCidrs: ['127.0.0.1/32'] }],
        services: {
          members: {
            name: 'members',
            upstreamGroups: { default: [{ id: 'members', url: 'http://127.0.0.1:5597' }] },
          },
        },
        routes: [
          ...pintaCausalRoutes(transforms),
          ...ordinary.map(([method, pathPattern], index) => ({
            id: `legacy-palette-${index}`,
            methods: [method],
            pathPattern,
            service: 'members',
            auth: { required: true, mode: 'any' as const, strategies: ['jwt' as const] },
            authorize: { statuses: ['active'] },
            transforms,
          })),
        ],
      },
    },
  )
  const s3 = new S3Client({
    endpoint,
    region: 'auto',
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
  let gatewaySocket: ReturnType<typeof Bun.serve> | undefined
  let bffSocket: ReturnType<typeof Bun.serve> | undefined
  try {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }))
    await members.start()
    gatewaySocket = Bun.serve({
      hostname: '127.0.0.1',
      port: 5598,
      fetch(req, socket) {
        const forwarded = new Headers(req.headers)
        const address = socket.requestIP(req)?.address
        if (!address) return new Response(null, { status: 503 })
        forwarded.set('x-forwarded-for', address)
        return gateway.handle(new Request(req, { headers: forwarded }))
      },
    })
    const transport = createGatewayModule(session)
    const api = createCreationsRoutes({
      members: createMembersClient(transport, { audience: 'adult' }),
      session,
      palette: createPintaPaletteWrites({ gateway: transport, session }),
    })
    bffSocket = Bun.serve({
      hostname: '127.0.0.1',
      port: 5599,
      fetch(req) {
        const suffix = new URL(req.url).pathname.split('/').at(-1)
        const context = { params: Promise.resolve({ tool: 'pinta', itemId }) }
        if (req.method === 'GET' && suffix === 'download')
          return api.creationsDownloadUrl.GET(req, context)
        if (req.method === 'POST' && suffix === 'upload')
          return api.creationsUploadUrl.POST(req, context)
        if (req.method === 'POST' && suffix === 'commit')
          return api.creationsCommit.POST(req, context)
        if (req.method === 'DELETE' && suffix === itemId)
          return api.creationsDelete.DELETE(req, context)
        return new Response(null, { status: 404 })
      },
    })

    const base = `http://127.0.0.1:5599/api/creations/pinta/${itemId}`
    const call = (suffix: string, method = 'GET', body?: unknown) =>
      fetch(base + suffix, {
        method,
        headers: {
          'content-type': 'application/json',
          'x-sz-viewer': user.id,
          'x-sz-viewer-audience': 'adult',
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })
    const reserve = async (
      body: ReturnType<typeof sample>,
      zipped: Uint8Array,
      baseRevision: number,
      head?: Head,
    ) => {
      const result = await call('/upload', 'POST', {
        name: 'Paletas do Pinta',
        kind: 'palette-library',
        formatVersion: 1,
        itemUpdatedAt: new Date(body.updatedAt).toISOString(),
        bytes: zipped.byteLength,
        baseRevision,
        ...(head ? { paletteWrite: { protocol, baseGeneration: head.generation } } : {}),
      })
      if (result.status !== 200) {
        const denied = await result.json().catch(() => null)
        throw new Error(`Reserve failed with HTTP ${result.status} ${denied?.error?.code ?? ''}`)
      }
      return (await result.json()) as Ticket
    }
    const put = (ticket: Ticket, bytes: Uint8Array) =>
      fetch(ticket.uploadUrl, {
        method: 'PUT',
        headers: ticket.headers,
        body: new Uint8Array(bytes),
      })
    const confirm = (ticket: Ticket) =>
      call('/commit', 'POST', {
        revision: ticket.revision,
        ...(ticket.paletteWrite
          ? { paletteWrite: { protocol, nonce: ticket.paletteWrite.nonce } }
          : {}),
      })
    const read = async (negotiated = true) => {
      const r = await call(`/download${negotiated ? `?paletteWrite=${protocol}` : ''}`)
      expect(r.status).toBe(200)
      const announced = await r.json()
      const obj = await fetch(announced.downloadUrl)
      expect(obj.status).toBe(200)
      return {
        head: announced.paletteHead as Head,
        digest: sha(new Uint8Array(await obj.arrayBuffer())),
      }
    }

    const start = Date.now()
    const legacy = sample('#CC2200', start)
    const legacyBytes = gzipSync(JSON.stringify(legacy))
    const legacyTicket = await reserve(legacy, legacyBytes, 0)
    expect((await put(legacyTicket, legacyBytes)).status).toBe(200)
    expect((await confirm(legacyTicket)).status).toBe(200)
    const before = await read()
    expect(before.digest).toBe(sha(legacyBytes))
    expect(before.head.adopted).toBe(false)
    const oldPending = await reserve(legacy, legacyBytes, legacyTicket.revision)

    const regional = sample('#113355', start + 1)
    const good = gzipSync(JSON.stringify(regional))
    const superseded = await reserve(regional, good, before.head.revision, before.head)
    const candidate = await reserve(regional, good, before.head.revision, before.head)
    expect(superseded.paletteWrite?.nonce).not.toBe(candidate.paletteWrite?.nonce)
    expect((await confirm(superseded)).status).toBe(409)
    expect((await confirm(oldPending)).status).toBe(409)
    expect(await (await confirm(candidate)).json()).toMatchObject({
      error: { code: 'PINTA_PALETTE_UPLOAD_MISSING' },
    })
    expect(candidate.headers['if-none-match']).toBe('*')
    expect((await put(candidate, good)).status).toBe(200)
    expect((await put(candidate, good)).status).toBe(412)
    const stored = await confirm(candidate)
    expect(stored.status).toBe(200)
    const ack = await stored.json()
    expect(ack.paletteWrite.nonce).toBe(candidate.paletteWrite?.nonce)
    expect(ack.paletteHead).toMatchObject({
      adopted: true,
      exists: true,
      revision: candidate.revision,
    })
    expect(ack.paletteHead.generation).not.toBe(before.head.generation)
    expect(await (await confirm(candidate)).json()).toEqual(ack)
    // The old authenticated PUT can still write only its numbered staging address.
    expect((await put(oldPending, legacyBytes)).status).toBe(200)
    expect((await confirm(oldPending)).status).toBe(409)
    expect((await read(false)).digest).toBe(sha(good))
    expect((await read()).digest).toBe(sha(good))

    expect((await call('', 'DELETE', { baseRevision: candidate.revision })).status).toBe(409)
    const deletion = await call('', 'DELETE', {
      baseRevision: candidate.revision,
      paletteWrite: { protocol, baseGeneration: ack.paletteHead.generation },
    })
    expect(deletion.status).toBe(200)
    const afterDelete = (await deletion.json()).paletteHead as Head
    expect(afterDelete).toMatchObject({ exists: false, adopted: true, revision: 0 })
    expect(afterDelete.generation).not.toBe(ack.paletteHead.generation)
    const absent = await call(`/download?paletteWrite=${protocol}`)
    expect(absent.status).toBe(404)
    expect((await absent.json()).paletteHead).toEqual(afterDelete)
    const rebuilt = await reserve(regional, good, 0, afterDelete)
    expect((await put(rebuilt, good)).status).toBe(200)
    expect((await confirm(rebuilt)).status).toBe(200)
    expect((await read()).head.generation).toBe(afterDelete.generation)
    expect((await read(false)).digest).toBe(sha(good))
    console.info(`palette gzip SHA-256 ${sha(good)}`)
  } finally {
    await bffSocket?.stop(true)
    await gatewaySocket?.stop(true)
    await gateway.stop()
    await members.stop()
    await prepared.close()
    s3.destroy()
  }
}, 60_000)
