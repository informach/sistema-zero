import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { rejects } from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import {
  type AssetManifest,
  assetConfirmationSchema,
  assetStatusSchema,
  UPLOAD_PART_BYTES,
  type UploadedPart,
} from '@sistemazero/marketing-contracts'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { Elysia } from 'elysia'
import type { Actor } from '../src/application/actor'
import { WorkspaceService } from '../src/application/workspace/workspace.service'
import { WorkspaceAssetsService } from '../src/application/workspace/workspace-assets.service'
import {
  type MultipartStore,
  MultipartUploadMissingError,
} from '../src/domain/ports/multipart-store.port'
import { createDbConnection, type DbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { DrizzleWorkspaceRepository } from '../src/infrastructure/persistence/drizzle/workspace.repository'
import { DrizzleWorkspaceAssetsRepository } from '../src/infrastructure/persistence/drizzle/workspace-assets.repository'
import { WorkspaceAssetVerifier } from '../src/infrastructure/workers/workspace-asset-verifier'
import { workspaceAssetsRoutes } from '../src/interfaces/http/routes/workspace-assets.routes'
import { requireReviewDatabase } from './helpers/review-database'

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
    if (!upload) throw new MultipartUploadMissingError()
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
    requireReviewDatabase(url)
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
  test('sessão expirada retoma a mesma identidade, concilia dois pedidos e só confirma após hash', async () => {
    const f = await fixture()
    await f.service.start(owner, f.input)
    const old = await repo.get(owner.userId, f.projectId, f.manifest.id, true)
    if (!old.uploadId) throw new Error('Sessão da fixture ausente')
    f.store.uploads.delete(old.uploadId)
    const before = await f.service.get(owner, f.projectId, f.manifest.id)
    expect(before.state).toBe('uploading')
    expect(before.bytesReceived).toBe(false)
    expect(before.error).toContain('Retome')
    expect(f.store.uploads.size).toBe(0) // A consulta nunca inicia outro upload.
    const results = await Promise.all([
      f.service.start(owner, f.input),
      f.service.start(owner, f.input),
    ])
    expect(results.every((value) => value.manifest.id === f.manifest.id)).toBe(true)
    expect(results.every((value) => !value.bytesReceived && value.error === null)).toBe(true)
    expect(f.store.uploads.size).toBe(1)
    const current = await repo.get(owner.userId, f.projectId, f.manifest.id, true)
    expect(current.uploadId).not.toBe(old.uploadId)
    expect(
      (await repo.resetExpiredUpload(owner.userId, f.projectId, f.manifest.id, old.uploadId))
        .uploadId,
    ).toBe(current.uploadId)
    await rejects(
      () => repo.resetExpiredUpload(randomUUID(), f.projectId, f.manifest.id, old.uploadId ?? ''),
      { code: 'OBJECT_INACCESSIBLE' },
    )
    const upload = [...f.store.uploads.values()][0]
    if (!upload) throw new Error('Novo envio ausente')
    upload.parts.set(1, f.bytes)
    expect((await f.service.complete(owner, f.projectId, f.manifest.id)).state).toBe('verifying')
    await new WorkspaceAssetVerifier(repo, f.store, logger).tick()
    expect((await f.service.get(owner, f.projectId, f.manifest.id)).state).toBe('confirmed')
    expect(
      (
        await repo.resetExpiredUpload(
          owner.userId,
          f.projectId,
          f.manifest.id,
          current.uploadId ?? '',
        )
      ).state,
    ).toBe('confirmed')
    expect((await f.service.list(owner, f.projectId, {})).items).toHaveLength(1)
  })
  test('erro de rede não reinicia envio e objeto já completo conserva confirmação pendente', async () => {
    const f = await fixture()
    await f.service.start(owner, f.input)
    const original = await repo.get(owner.userId, f.projectId, f.manifest.id, true)
    const listParts = f.store.listParts.bind(f.store)
    f.store.listParts = async () => {
      throw new Error('Conexão indisponível')
    }
    await rejects(() => f.service.start(owner, f.input), /Conexão indisponível/)
    expect((await repo.get(owner.userId, f.projectId, f.manifest.id, true)).uploadId).toBe(
      original.uploadId,
    )
    expect(f.store.uploads.size).toBe(1)
    f.store.listParts = listParts
    if (!original.uploadId) throw new Error('Sessão ausente')
    f.store.uploads.delete(original.uploadId)
    f.store.objects.set(original.storageKey, { bytes: f.bytes, mime: f.manifest.mime })
    const resumed = await f.service.start(owner, f.input)
    expect(resumed.bytesReceived).toBe(true)
    expect(resumed.state).toBe('uploading')
    expect(f.store.uploads.size).toBe(0)
    expect((await f.service.complete(owner, f.projectId, f.manifest.id)).state).toBe('verifying')
    await new WorkspaceAssetVerifier(repo, f.store, logger).tick()
    expect((await f.service.get(owner, f.projectId, f.manifest.id)).state).toBe('confirmed')
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
  test('confirmação em lote retorna só arquivos verificados do projeto e revalida acesso', async () => {
    const f = await fixture(),
      other = await fixture()
    await f.service.start(owner, f.input)
    await other.service.start(owner, other.input)
    const pending = randomUUID(),
      absent = randomUUID()
    await f.service.start(owner, {
      operationId: randomUUID(),
      manifest: { ...f.manifest, id: pending },
    })
    const input = { ids: [f.manifest.id, pending, other.manifest.id, absent] }
    expect(await f.service.confirmed(owner, f.projectId, input)).toEqual({
      projectId: f.projectId,
      manifests: [],
    })
    const upload = [...f.store.uploads.values()].find((item) => item.key.includes(f.manifest.id))
    if (!upload) throw new Error('Upload da prova ausente')
    upload.parts.set(1, f.bytes)
    await f.service.complete(owner, f.projectId, f.manifest.id)
    expect((await f.service.confirmed(owner, f.projectId, input)).manifests).toHaveLength(0)
    await new WorkspaceAssetVerifier(repo, f.store, logger).tick()
    expect(await f.service.confirmed(owner, f.projectId, input)).toEqual({
      projectId: f.projectId,
      manifests: [f.manifest],
    })
    const api = new Elysia().use(
      workspaceAssetsRoutes({ assets: f.service, internalToken: 'test-assets-confirmed' }),
    )
    const response = await api.handle(
      new Request(`http://localhost/marketing/workspace/projects/${f.projectId}/assets/confirmed`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-internal-token': 'test-assets-confirmed',
          'x-auth-user-id': owner.userId,
          'x-auth-user-role': 'staff',
          'x-auth-user-status': 'active',
        },
        body: JSON.stringify(input),
      }),
    )
    expect(response.status).toBe(200)
    expect(assetConfirmationSchema.parse(await response.json()).manifests).toEqual([f.manifest])
    const statusResponse = await api.handle(
      new Request(`http://localhost/marketing/workspace/projects/${f.projectId}/assets/status`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-internal-token': 'test-assets-confirmed',
          'x-auth-user-id': owner.userId,
          'x-auth-user-role': 'staff',
          'x-auth-user-status': 'active',
        },
        body: JSON.stringify(input),
      }),
    )
    expect(statusResponse.status).toBe(200)
    const statuses = assetStatusSchema.parse(await statusResponse.json())
    expect(statuses.items).toHaveLength(2)
    expect(statuses.items.find((item) => item.manifest.id === f.manifest.id)?.state).toBe(
      'confirmed',
    )
    expect(statuses.items.find((item) => item.manifest.id === pending)?.state).toBe('uploading')
    for (const ids of [[], [pending, pending], Array.from({ length: 101 }, () => randomUUID())])
      await rejects(async () => f.service.confirmed(owner, f.projectId, { ids }), {
        code: 'VALIDATION_ERROR',
      })
    await rejects(
      async () => new WorkspaceAssetsService(repo, null).confirmed(owner, f.projectId, input),
      { code: 'MEDIA_NOT_CONFIGURED' },
    )
    await rejects(
      () => f.service.confirmed({ ...owner, userId: randomUUID() }, f.projectId, input),
      { code: 'OBJECT_INACCESSIBLE' },
    )
    const reader = { ...owner, userId: randomUUID() }
    await workspace.setMember(owner, f.projectId, {
      operationId: randomUUID(),
      userId: reader.userId,
      permissions: ['read'],
    })
    expect((await f.service.confirmed(reader, f.projectId, input)).manifests).toEqual([f.manifest])
    await workspace.setMember(owner, f.projectId, {
      operationId: randomUUID(),
      userId: reader.userId,
      permissions: [],
    })
    await rejects(() => f.service.confirmed(reader, f.projectId, input), {
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
  test('status polling returns only requested project files, including failures, and rechecks read access', async () => {
    const f = await fixture(),
      other = await fixture()
    await f.service.start(owner, f.input)
    await other.service.start(owner, other.input)
    const ids = [f.manifest.id, other.manifest.id, randomUUID()]
    const result = await f.service.status(owner, f.projectId, { ids })
    expect(result).toEqual({
      projectId: f.projectId,
      items: [{ manifest: f.manifest, state: 'uploading', error: null }],
    })
    await connection.sql`update marketing.editorial_uploads set state='failed',error='Hash divergente' where asset_id=${f.manifest.id}`
    expect((await f.service.status(owner, f.projectId, { ids })).items[0]?.error).toBe(
      'Hash divergente',
    )
    await rejects(
      () => f.service.status({ ...owner, userId: randomUUID() }, f.projectId, { ids }),
      { code: 'OBJECT_INACCESSIBLE' },
    )
    const reader = { ...owner, userId: randomUUID() }
    await workspace.setMember(owner, f.projectId, {
      operationId: randomUUID(),
      userId: reader.userId,
      permissions: ['read'],
    })
    expect((await f.service.status(reader, f.projectId, { ids })).items).toHaveLength(1)
    await workspace.setMember(owner, f.projectId, {
      operationId: randomUUID(),
      userId: reader.userId,
      permissions: [],
    })
    await rejects(() => f.service.status(reader, f.projectId, { ids }), {
      code: 'OBJECT_INACCESSIBLE',
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
