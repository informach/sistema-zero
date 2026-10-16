import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { rejects } from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import {
  type AssetManifest,
  UPLOAD_PART_BYTES,
  type UploadedPart,
} from '@sistemazero/marketing-contracts'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import type { Actor } from '../src/application/actor'
import { WorkspaceService } from '../src/application/workspace/workspace.service'
import { WorkspaceAssetsService } from '../src/application/workspace/workspace-assets.service'
import type { MultipartStore } from '../src/domain/ports/multipart-store.port'
import { createDbConnection, type DbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { DrizzleWorkspaceRepository } from '../src/infrastructure/persistence/drizzle/workspace.repository'
import { DrizzleWorkspaceAssetsRepository } from '../src/infrastructure/persistence/drizzle/workspace-assets.repository'
import { WorkspaceAssetVerifier } from '../src/infrastructure/workers/workspace-asset-verifier'

class MemoryMultipart implements MultipartStore {
  uploads = new Map<string, { key: string; mime: string; parts: Map<number, Buffer> }>()
  objects = new Map<string, { bytes: Buffer; mime: string }>()
  aborted = 0
  loseCompletion = false
  async createMultipart(key: string, mime: string) {
    const id = randomUUID()
    this.uploads.set(id, { key, mime, parts: new Map() })
    return id
  }
  async signPart(input: {
    key: string
    uploadId: string
    number: number
    size: number
    md5: string
  }) {
    return `https://storage.example.test/${input.uploadId}/${input.number}?size=${input.size}&md5=${encodeURIComponent(input.md5)}`
  }
  async listParts(_key: string, id: string) {
    const upload = this.uploads.get(id)
    if (!upload) throw new Error('NoSuchUpload')
    return [...upload.parts]
      .sort(([a], [b]) => a - b)
      .map(([number, bytes]) => ({
        number,
        size: bytes.length,
        etag: `"${createHash('md5').update(bytes).digest('hex')}"`,
      }))
  }
  async completeMultipart(key: string, id: string, _parts: UploadedPart[]) {
    const upload = this.uploads.get(id)
    if (!upload) throw new Error('NoSuchUpload')
    this.objects.set(key, {
      bytes: Buffer.concat([...upload.parts].sort(([a], [b]) => a - b).map(([, bytes]) => bytes)),
      mime: upload.mime,
    })
    this.uploads.delete(id)
    if (this.loseCompletion) {
      this.loseCompletion = false
      throw new Error('Resposta perdida depois do commit')
    }
  }
  async abortMultipart(_key: string, id: string) {
    this.uploads.delete(id)
    this.aborted++
  }
  async head(key: string) {
    const object = this.objects.get(key)
    return {
      exists: Boolean(object),
      sizeBytes: object?.bytes.length ?? null,
      contentType: object?.mime ?? null,
    }
  }
  async getStream(key: string) {
    const object = this.objects.get(key)
    if (!object) throw new Error('NoSuchKey')
    const bytes = object.bytes
    let offset = 0
    return new ReadableStream<Uint8Array>({
      pull(controller) {
        if (offset >= bytes.length) {
          controller.close()
          return
        }
        controller.enqueue(bytes.subarray(offset, offset + 65536))
        offset += 65536
      },
    })
  }
  async presignGet({ key }: { key: string; expiresInSeconds: number }) {
    return `https://storage.example.test/${key}`
  }
}
const url = process.env.MARKETING_TEST_DATABASE_URL,
  suite = url ? describe : describe.skip
suite('arquivos editoriais: multipart, retomada e verificação', () => {
  let connection: DbConnection, workspace: WorkspaceService, repo: DrizzleWorkspaceAssetsRepository
  const owner: Actor = {
    userId: randomUUID(),
    displayName: 'Editor',
    role: 'staff',
    status: 'active',
  }
  const logger = { debug() {}, info() {}, warn() {}, error() {} }
  beforeAll(async () => {
    if (
      !url ||
      new URL(url).hostname !== '127.0.0.1' ||
      new URL(url).pathname !== '/marketing_review'
    )
      throw new Error('Banco exclusivo de revisão obrigatório')
    connection = createDbConnection(url)
    await migrate(connection.db, {
      migrationsFolder: 'src/infrastructure/persistence/drizzle/migrations',
      migrationsTable: 'marketing_migrations',
    })
    workspace = new WorkspaceService(
      new DrizzleWorkspaceRepository(connection.db),
      fixtureDirectory,
    )
    repo = new DrizzleWorkspaceAssetsRepository(connection.db)
  }, 30000)
  afterAll(async () => connection?.close())
  async function fixture(bytes = Buffer.from('Arquivo de referência')) {
    const projectId = randomUUID()
    await workspace.create(owner, {
      schemaVersion: 1,
      id: projectId,
      operationId: randomUUID(),
      name: 'Mídia',
      product: 'Zero',
    })
    const manifest: AssetManifest = {
      schemaVersion: 1,
      id: randomUUID(),
      projectId,
      name: 'origem.txt',
      sha256: createHash('sha256').update(bytes).digest('hex'),
      size: bytes.length,
      mime: 'text/plain',
      role: 'original',
      sourceAssetId: null,
      width: null,
      height: null,
      durationMs: null,
      codec: null,
      rotation: null,
    }
    const store = new MemoryMultipart(),
      service = new WorkspaceAssetsService(repo, store)
    const input = { operationId: randomUUID(), manifest }
    return { projectId, manifest, bytes, store, service, input }
  }
  test('duas inicializações convergem, envio incompleto não confirma e resposta perdida não duplica', async () => {
    const f = await fixture(Buffer.alloc(UPLOAD_PART_BYTES + 500, 42))
    const [a, b] = await Promise.all([
      f.service.start(owner, f.input),
      f.service.start(owner, f.input),
    ])
    expect(a.manifest.id).toBe(b.manifest.id)
    expect(f.store.uploads.size).toBe(1)
    const upload = [...f.store.uploads.values()][0]
    if (!upload) throw new Error('Fixture')
    upload.parts.set(1, f.bytes.subarray(0, UPLOAD_PART_BYTES))
    expect((await f.service.start(owner, f.input)).parts).toHaveLength(1)
    await rejects(() => f.service.complete(owner, f.projectId, f.manifest.id), {
      code: 'ASSET_UNCONFIRMED',
    })
    await rejects(() => f.service.download(owner, f.projectId, f.manifest.id), {
      code: 'ASSET_UNCONFIRMED',
    })
    upload.parts.set(2, f.bytes.subarray(UPLOAD_PART_BYTES))
    f.store.loseCompletion = true
    expect((await f.service.complete(owner, f.projectId, f.manifest.id)).state).toBe('verifying')
    await new WorkspaceAssetVerifier(repo, f.store, logger).tick()
    expect((await f.service.get(owner, f.projectId, f.manifest.id)).state).toBe('confirmed')
    expect((await f.service.download(owner, f.projectId, f.manifest.id)).manifest.sha256).toBe(
      f.manifest.sha256,
    )
    expect((await f.service.complete(owner, f.projectId, f.manifest.id)).state).toBe('confirmed')
  })
  test('biblioteca pagina sem duplicar e não expõe arquivos de outro projeto', async () => {
    const f = await fixture(),
      other = await fixture()
    await other.service.start(owner, other.input)
    for (let index = 0; index < 53; index++)
      await f.service.start(owner, {
        operationId: randomUUID(),
        manifest: { ...f.manifest, id: randomUUID(), name: `arquivo-${index}.txt` },
      })
    const first = await f.service.list(owner, f.projectId, {})
    expect(first.items.length).toBe(50)
    expect(first.nextCursor).not.toBeNull()
    const second = await f.service.list(owner, f.projectId, { after: first.nextCursor })
    expect(second.items.length).toBe(3)
    expect(second.nextCursor).toBeNull()
    expect(new Set([...first.items, ...second.items].map((item) => item.manifest.id)).size).toBe(53)
    expect(
      [...first.items, ...second.items].every((item) => item.manifest.projectId === f.projectId),
    ).toBe(true)
    await rejects(() => f.service.list({ ...owner, userId: randomUUID() }, f.projectId, {}), {
      code: 'OBJECT_INACCESSIBLE',
    })
  })
  test('hash divergente fica indisponível e verificador antigo não confirma após perder concessão', async () => {
    const f = await fixture()
    await f.service.start(owner, f.input)
    const upload = [...f.store.uploads.values()][0]
    if (!upload) throw new Error('Fixture')
    upload.parts.set(1, Buffer.alloc(f.bytes.length, 0))
    await f.service.complete(owner, f.projectId, f.manifest.id)
    const first = await repo.claimVerification()
    if (!first) throw new Error('Fixture')
    await connection.sql`update marketing.editorial_uploads set lease_expires_at=now()-interval '1 second' where asset_id=${f.manifest.id}`
    const second = await repo.claimVerification()
    if (!second) throw new Error('Fixture')
    expect(second.id).toBe(first.id)
    await repo.finishVerification(first, { valid: true, error: null, retryable: false })
    expect((await f.service.get(owner, f.projectId, f.manifest.id)).state).toBe('verifying')
    await connection.sql`update marketing.editorial_uploads set lease_expires_at=null where asset_id=${f.manifest.id}`
    await new WorkspaceAssetVerifier(repo, f.store, logger).tick()
    expect((await f.service.get(owner, f.projectId, f.manifest.id)).state).toBe('failed')
    await rejects(() => f.service.download(owner, f.projectId, f.manifest.id), {
      code: 'ASSET_UNCONFIRMED',
    })
  })
  test('partes vinculadas ao tamanho e MD5, sem atravessar projetos ou autorização revogada', async () => {
    const f = await fixture()
    await f.service.start(owner, f.input)
    const md5 = createHash('md5').update(f.bytes).digest('base64')
    const part = await f.service.part(owner, f.projectId, f.manifest.id, { number: 1, md5 })
    expect(part.size).toBe(f.bytes.length)
    expect(part.headers['content-md5']).toBe(md5)
    await rejects(() => f.service.part(owner, f.projectId, f.manifest.id, { number: 2, md5 }), {
      code: 'VALIDATION_ERROR',
    })
    await rejects(
      () => f.service.get({ ...owner, userId: randomUUID() }, f.projectId, f.manifest.id),
      { code: 'OBJECT_INACCESSIBLE' },
    )
    await workspace.setMember(owner, f.projectId, {
      operationId: randomUUID(),
      userId: owner.userId,
      permissions: ['read', 'admin'],
    })
    await rejects(() => f.service.start(owner, f.input), { code: 'OBJECT_INACCESSIBLE' })
  })
})

import { fixtureDirectory } from './helpers/staff-directory'
