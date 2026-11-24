import { expect, mock, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import { CreateBucketCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import {
  STUDIO_SEALED_LEGACY_READER,
  STUDIO_SEALED_STORAGE_READER,
} from '@sistemazero/core/creations/studio-sealed-storage'
import { z } from 'zod'
import { gzipText } from '../src/lib/creations-cloud'
import { buildStudioCloudSnapshot } from '../src/lib/studio-cloud'
import { createStudioSealedCloud } from '../src/lib/studio-sealed-cloud'
import { studioSealedFixture } from './fixtures/studio-sealed.fixture'

mock.module('server-only', () => ({}))
const { createStudioSealedWrites } = await import('../src/routes/studio-sealed-writes')
const { createGatewayModule } = await import('../src/server/gateway')
const { createSessionModule } = await import('../src/server/session')

const database = process.env.STUDIO_SEALED_JOURNEY_DATABASE_URL
const endpoint = process.env.R2_S3_ENDPOINT
const bucket = process.env.R2_UGC_BUCKET
const enabled = Boolean(database && endpoint && bucket)
const downloadSchema = z.object({
  storageKey: z.string(),
  revision: z.number(),
  parts: z.array(z.object({ storageKey: z.string(), hash: z.string() })),
})

interface OwnedQaProcess {
  kill(): void
  exited: Promise<number>
  readonly exitCode: number | null
}
async function waitForListener(port: number, process: OwnedQaProcess) {
  const deadline = Date.now() + 15_000
  while (Date.now() < deadline && process.exitCode === null) {
    try {
      await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(500) })
      return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }
  throw new Error(`The isolated QA listener on ${port} did not start.`)
}

test.skipIf(!enabled)(
  'real BFF, HMAC Gateway, PostgreSQL and MinIO preserve regional bytes through ACK loss, two writers and deletion',
  async () => {
    if (!database || endpoint !== 'http://127.0.0.1:19004' || !bucket?.startsWith('lg04-proof'))
      throw new Error('Use only the isolated LG04 database and loopback MinIO.')
    const f = await studioSealedFixture({ regional: true })
    const owner = f.ticket.scope
    const token = randomUUID(),
      secret = randomUUID()
    const membersPort = 19005,
      gatewayPort = 19006
    const user = {
      id: owner.userId,
      role: 'staff',
      status: 'active',
      email: '',
      firstName: 'QA',
      lastName: 'LG04',
      activeProfile: { accountId: owner.accountId },
      kids: {
        kind: 'student' as const,
        sessionId: randomUUID(),
        deviceId: randomUUID(),
        grantId: randomUUID(),
      },
    }
    process.env.GATEWAY_URL = `http://127.0.0.1:${gatewayPort}`
    process.env.MEMBER_SHELL_HMAC_SECRET = secret
    const s3 = new S3Client({
      endpoint,
      region: 'auto',
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
      },
    })
    const children: OwnedQaProcess[] = []
    const errors: string[] = []
    try {
      await s3.send(new CreateBucketCommand({ Bucket: bucket }))
      const members = Bun.spawn(
        [
          process.execPath,
          '--no-env-file',
          fileURLToPath(
            new URL('../../members/tests/db/studio-sealed-journey-server.ts', import.meta.url),
          ),
        ],
        {
          env: {
            ...process.env,
            NODE_ENV: 'test',
            DATABASE_URL: database,
            HOST: '127.0.0.1',
            PORT: String(membersPort),
            GATEWAY_HMAC_SECRET: randomUUID(),
            INTERNAL_API_TOKEN: token,
            LOG_LEVEL: 'warn',
          },
          stdout: 'inherit',
          stderr: 'inherit',
          windowsHide: true,
        },
      )
      children.push(members)
      await waitForListener(membersPort, members)
      const gateway = Bun.spawn(
        [
          process.execPath,
          '--no-env-file',
          fileURLToPath(
            new URL('../../api-gateway/tests/fixtures/studio-sealed-qa-server.ts', import.meta.url),
          ),
        ],
        {
          env: {
            ...process.env,
            NODE_ENV: 'test',
            LG04_GATEWAY_SECRET: secret,
            LG04_INTERNAL_TOKEN: token,
          },
          stdout: 'inherit',
          stderr: 'inherit',
          windowsHide: true,
        },
      )
      children.push(gateway)
      await waitForListener(gatewayPort, gateway)
      const session = createSessionModule(
        { accessCookie: 'lg04-access', refreshCookie: 'lg04-refresh' },
        'lg04-palette',
        'kids',
      )
      const routes = createStudioSealedWrites({
        gateway: createGatewayModule(session),
        enabled: () => true,
        session: {
          audience: 'kids',
          getAccessToken: async () => 'lg04-access',
          getRefreshToken: async () => 'lg04-refresh',
          verifyAccessToken: async () => ({ ok: true, user }),
        },
      })
      let lostAck = false,
        corruptUpload = false
      let corruptUsed = false,
        failNextPut = false
      const writer = () =>
        createStudioSealedCloud({
          viewerId: owner.userId,
          gzip: gzipText,
          async api(path, init) {
            const match = /^\/([^/]+)\/seal\/([^/]+)$/.exec(path)
            if (!match?.[1] || !match[2]) throw new Error('Invalid writer path.')
            const response = await routes.studioSealedWrite.POST(
              new Request(`http://127.0.0.1${path}`, {
                ...init,
                headers: {
                  'content-type': 'application/json',
                  'x-sz-viewer': owner.userId,
                  'x-sz-viewer-audience': 'kids',
                  'x-sz-session': user.kids.sessionId,
                },
              }),
              { params: Promise.resolve({ itemId: match[1], operation: match[2] }) },
            )
            const body: unknown = await response.json()
            if (!response.ok) {
              const parsed = z
                .object({ error: z.object({ code: z.string() }), details: z.unknown().optional() })
                .parse(body)
              errors.push(parsed.error.code)
              throw Object.assign(new Error(parsed.error.code), {
                code: parsed.error.code,
                status: response.status,
                details: parsed.details,
              })
            }
            if (match[2] === 'commit' && lostAck) {
              lostAck = false
              throw new TypeError('LG04 lost ACK')
            }
            return body
          },
          async put(url, method, headers, bytes) {
            if (failNextPut) {
              failNextPut = false
              throw new TypeError('Offline before PUT')
            }
            const body = new Uint8Array(bytes)
            if (corruptUpload && !corruptUsed) {
              body[0] = (body[0] ?? 0) ^ 1
              corruptUsed = true
            }
            const response = await fetch(url, { method, headers, body })
            if (!response.ok)
              throw Object.assign(new Error('PUT failed'), {
                status: response.status,
                code: 'STORAGE_PUT_FAILED',
              })
          },
        })
      const upload = async (
        client: ReturnType<typeof writer>,
        baseRevision = 0,
        project = f.project,
      ) => {
        const snapshot = await buildStudioCloudSnapshot(project)
        return client.upload(
          {
            itemId: project.id,
            name: project.name,
            kind: 'classic',
            updatedAt: project.updatedAt,
            formatVersion: 2,
            baseRevision,
          },
          snapshot.json,
          snapshot.parts ?? [],
        )
      }
      const download = (reader = STUDIO_SEALED_STORAGE_READER) =>
        fetch(
          `http://127.0.0.1:${membersPort}/members/creations/studio/${f.project.id}/download?audience=kids&studioReader=${reader}`,
          {
            headers: {
              'x-internal-token': token,
              'x-consumer-id': 'member-shell',
              'x-auth-user-id': owner.userId,
              'x-auth-account-id': owner.accountId,
              'x-auth-user-role': 'staff',
              'x-auth-user-status': 'active',
            },
          },
        )
      const first = writer(),
        second = writer()
      lostAck = true
      await expect(upload(first)).rejects.toThrow('LG04 lost ACK')
      expect(await upload(first)).toEqual({ revision: 1 })
      expect((await download(STUDIO_SEALED_LEGACY_READER)).status).toBe(409)
      const received = downloadSchema.parse(await (await download()).json())
      expect(received.revision).toBe(1)
      const object = await s3.send(
        new GetObjectCommand({ Bucket: bucket, Key: received.storageKey }),
      )
      if (!object.Body) throw new Error('The sealed manifest must exist in MinIO.')
      const manifest = JSON.parse(gunzipSync(await object.Body.transformToByteArray()).toString())
      expect(manifest.program.id).toBe(f.project.id)
      expect(received.parts).toHaveLength(1)
      for (const part of received.parts) {
        const content = await s3.send(
          new GetObjectCommand({ Bucket: bucket, Key: part.storageKey }),
        )
        if (!content.Body) throw new Error('The sealed material must exist in MinIO.')
        expect(
          JSON.parse(gunzipSync(await content.Body.transformToByteArray()).toString()),
        ).toEqual(f.project.assets[0])
      }
      await expect(upload(second)).rejects.toMatchObject({ code: 'CREATION_STALE_BASE' })
      expect(
        await upload(second, 1, {
          ...f.project,
          name: 'Vila editada',
          updatedAt: f.project.updatedAt + 1,
        }),
      ).toEqual({ revision: 2 })
      // A damaged staging upload cannot advance the SQL head.
      corruptUpload = true
      await expect(
        upload(first, 2, { ...f.project, updatedAt: f.project.updatedAt + 2 }),
      ).rejects.toMatchObject({ code: 'STUDIO_SEALED_CONTENT_INVALID' })
      expect(downloadSchema.parse(await (await download()).json()).revision).toBe(2)
      expect(await second.remove(f.project.id, 2)).toEqual({ revision: 0 })
      await expect(upload(first)).rejects.toMatchObject({ code: 'CREATION_REOPEN_REQUIRED' })
      expect((await download()).status).toBe(404)
      const pendingProject = { ...f.project, id: 'pending-regional' },
        third = writer()
      corruptUpload = false
      failNextPut = true
      await expect(upload(third, 0, pendingProject)).rejects.toThrow('Offline before PUT')
      expect(await second.remove(pendingProject.id, 0)).toEqual({ revision: 0 })
      await expect(upload(third, 0, pendingProject)).rejects.toMatchObject({
        code: 'CREATION_REOPEN_REQUIRED',
      })
      expect(await second.remove('never-uploaded', 0)).toEqual({ revision: 0 })
      console.info(
        `LG04 real storage: ACK replay revision 1; conflict preserved; revision 2; corrupted staging refused; deletion fenced. ${errors.length} expected refusals.`,
      )
    } finally {
      for (const child of children) child.kill()
      await Promise.allSettled(children.map((child) => child.exited))
      s3.destroy()
    }
  },
  90_000,
)
