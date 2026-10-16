import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { rejects } from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import {
  type ImportStart,
  type InventoryEntry,
  inventoryDigestInput,
} from '@sistemazero/marketing-contracts'
import { eq } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import type { Actor } from '../src/application/actor'
import { ImportService } from '../src/application/workspace/import.service'
import { WorkspaceService } from '../src/application/workspace/workspace.service'
import { createDbConnection, type DbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { DrizzleImportRepository } from '../src/infrastructure/persistence/drizzle/import.repository'
import { DrizzleWorkspaceRepository } from '../src/infrastructure/persistence/drizzle/workspace.repository'
import { editorialAssets } from '../src/infrastructure/persistence/drizzle/workspace-schema'
import { fixtureDirectory } from './helpers/staff-directory'

const url = process.env.MARKETING_TEST_DATABASE_URL,
  suite = url ? describe : describe.skip
suite('import inventory PostgreSQL', () => {
  let connection: DbConnection, workspace: WorkspaceService, imports: ImportService
  const owner: Actor = {
      userId: randomUUID(),
      displayName: 'Revisão',
      role: 'staff',
      status: 'active',
    },
    outsider: Actor = { ...owner, userId: randomUUID() }
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
    imports = new ImportService(new DrizzleImportRepository(connection.db))
  })
  afterAll(async () => connection?.close())
  async function fixture(count = 205) {
    const projectId = randomUUID()
    await workspace.create(owner, {
      schemaVersion: 1,
      id: projectId,
      operationId: randomUUID(),
      name: 'Acervo em preparação',
      product: 'Review',
    })
    const entries: InventoryEntry[] = Array.from({ length: count }, (_, i) => ({
      path: `output/instagram/${String(i).padStart(5, '0')}.md`,
      kind: 'file',
      product: 'comunidade-dos-criadores',
      category: 'copy',
      disposition: 'eligible',
      validity: 'unverified',
      reason: 'Fonte preservada',
      bytes: 10,
      sha256: 'a'.repeat(64),
    }))
    const input: ImportStart = {
      id: randomUUID(),
      origin: 'sistema-zero',
      policyVersion: 'marketing-acervo-v1',
      capturedAt: new Date().toISOString(),
      entryCount: count,
      digest: createHash('sha256')
        .update(
          inventoryDigestInput({
            origin: 'sistema-zero',
            entries,
            policyVersion: 'marketing-acervo-v1',
          }),
        )
        .digest('hex'),
    }
    return { projectId, entries, input }
  }
  async function sourceVersion(
    projectId: string,
    text: string,
    product = 'comunidade-dos-criadores',
  ) {
    const bytes = Buffer.from(text, 'utf8')
    const source: InventoryEntry = {
      path: 'docs/marketing/copy.md',
      kind: 'file',
      product,
      category: 'copy',
      disposition: 'eligible',
      validity: 'unverified',
      reason: 'Copy existente',
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    }
    const input: ImportStart = {
      id: randomUUID(),
      origin: 'sistema-zero',
      policyVersion: 'marketing-acervo-v1',
      capturedAt: new Date().toISOString(),
      entryCount: 1,
      digest: createHash('sha256')
        .update(
          inventoryDigestInput({
            origin: 'sistema-zero',
            entries: [source],
            policyVersion: 'marketing-acervo-v1',
          }),
        )
        .digest('hex'),
    }
    await imports.start(owner, projectId, input)
    await imports.chunk(owner, projectId, input.id, { offset: 0, entries: [source] })
    await imports.finish(owner, projectId, input.id)
    return {
      runId: input.id,
      request: {
        operationId: randomUUID(),
        ordinal: 0,
        content: { kind: 'text', base64: bytes.toString('base64') },
      },
    }
  }
  test('source loading preserves bytes, exact provenance and the team edits across reimports and changed files', async () => {
    const f = await fixture(1),
      original = '\uFEFFCopy já criada.\r\nSegunda linha.'
    const v1 = await sourceVersion(f.projectId, original)
    await rejects(
      imports.loadSource(owner, f.projectId, v1.runId, {
        ...v1.request,
        content: { kind: 'text', base64: Buffer.from('changed').toString('base64') },
      }),
      /bytes/,
    )
    const first = await imports.loadSource(owner, f.projectId, v1.runId, v1.request)
    expect(await imports.loadSource(owner, f.projectId, v1.runId, v1.request)).toEqual(first)
    const snapshot = await workspace.snapshot(owner, f.projectId),
      item = snapshot.items[0]
    if (item?.document.kind !== 'evidence') throw new Error('Referência não carregada')
    expect(item.document.body).toBe(original)
    expect(first.destinations).toEqual([{ entityId: item.id, revisionId: item.revisionId }])
    await workspace.apply(owner, {
      schemaVersion: 1,
      projectId: f.projectId,
      entityId: item.id,
      operationId: randomUUID(),
      baseRevisionId: item.revisionId,
      action: 'save',
      document: { ...item.document, body: 'Edição feita pela equipe' },
    })
    const same = await sourceVersion(f.projectId, original)
    const reused = await imports.loadSource(owner, f.projectId, same.runId, same.request)
    expect(reused.status).toBe('reused')
    expect(reused.destinations).toEqual(first.destinations)
    expect(reused.classificationReview).toBe(false)
    const reclassified = await sourceVersion(f.projectId, original, 'cade-todo-mundo')
    const classification = await imports.loadSource(
      owner,
      f.projectId,
      reclassified.runId,
      reclassified.request,
    )
    expect(classification.classificationReview).toBe(true)
    expect(classification.destinations).toEqual(first.destinations)
    const changed = await sourceVersion(f.projectId, 'Nova versão na origem')
    const next = await imports.loadSource(owner, f.projectId, changed.runId, changed.request)
    expect(next.previousSourceVersion).toBe(true)
    const final = await workspace.snapshot(owner, f.projectId)
    expect(final.items).toHaveLength(2)
    expect(final.items.find((i) => i.id === item.id)?.document).toMatchObject({
      body: 'Edição feita pela equipe',
    })
    expect((await imports.page(owner, f.projectId, changed.runId, 0)).entries[0]?.result).toEqual(
      next,
    )
    const history = await workspace.history(owner, f.projectId, item.id)
    expect(history.find((r) => r.id === item.revisionId)?.document).toMatchObject({
      body: original,
    })
    await rejects(
      imports.loadSource(outsider, f.projectId, v1.runId, {
        ...v1.request,
        operationId: randomUUID(),
      }),
      /disponível/,
    )
  })
  test('large text is split without loss and cannot introduce credentials as source evidence', async () => {
    const f = await fixture(1),
      text = `${'a'.repeat(98000)}\n${'b'.repeat(70000)}`
    const source = await sourceVersion(f.projectId, text)
    const result = await imports.loadSource(owner, f.projectId, source.runId, source.request)
    const snapshot = await workspace.snapshot(owner, f.projectId)
    const restored = result.destinations
      .map((destination) => {
        const doc = snapshot.items.find((i) => i.id === destination.entityId)?.document
        if (doc?.kind !== 'evidence') throw new Error('Fragmento ausente')
        return doc.body
      })
      .join('')
    expect(restored).toBe(text)
    expect(result.destinations).toHaveLength(2)
    const secret = await sourceVersion(f.projectId, `client_secret: "${'Z'.repeat(40)}"`)
    await rejects(
      imports.loadSource(owner, f.projectId, secret.runId, secret.request),
      /credencial/,
    )
  })
  test('original-file binding requires confirmed hash, size and project ownership', async () => {
    const f = await fixture(1),
      other = await fixture(1)
    const text = 'Fonte original preservada',
      source = await sourceVersion(f.projectId, text)
    const assetId = randomUUID(),
      bytes = Buffer.from(text)
    const manifest = {
      schemaVersion: 1 as const,
      id: assetId,
      projectId: f.projectId,
      name: 'copy.md',
      sha256: createHash('sha256').update(bytes).digest('hex'),
      size: bytes.length,
      mime: 'text/markdown' as const,
      role: 'original' as const,
      sourceAssetId: null,
      width: null,
      height: null,
      durationMs: null,
      codec: null,
      rotation: null,
    }
    const request = { operationId: randomUUID(), ordinal: 0, content: { kind: 'asset', assetId } }
    // Only the database authorization/binding boundary is exercised here; this is not an R2 upload proof.
    await connection.db.insert(editorialAssets).values({
      id: assetId,
      projectId: f.projectId,
      createdBy: owner.userId ?? '',
      storageKey: `review-only/${assetId}`,
      manifest,
      confirmed: false,
    })
    await rejects(imports.loadSource(owner, f.projectId, source.runId, request), /Confirme/)
    await connection.db
      .update(editorialAssets)
      .set({ confirmed: true, projectId: other.projectId })
      .where(eq(editorialAssets.id, assetId))
    await rejects(imports.loadSource(owner, f.projectId, source.runId, request), /Confirme/)
    await connection.db
      .update(editorialAssets)
      .set({ projectId: f.projectId, manifest: { ...manifest, size: bytes.length + 1 } })
      .where(eq(editorialAssets.id, assetId))
    await rejects(imports.loadSource(owner, f.projectId, source.runId, request), /mesmo hash/)
    await connection.db
      .update(editorialAssets)
      .set({ manifest })
      .where(eq(editorialAssets.id, assetId))
    const loaded = await imports.loadSource(owner, f.projectId, source.runId, request)
    expect(await imports.loadSource(owner, f.projectId, source.runId, request)).toEqual(loaded)
    const snapshot = await workspace.snapshot(owner, f.projectId)
    expect(snapshot.items).toHaveLength(1)
    expect(snapshot.items[0]?.document).toMatchObject({
      kind: 'evidence',
      assetIds: [assetId],
      validity: 'unverified',
    })
  })
  test('lost responses, repeated chunks and concurrent sealing preserve one immutable manifest', async () => {
    const f = await fixture()
    const a = await imports.start(owner, f.projectId, f.input)
    expect(await imports.start(owner, f.projectId, f.input)).toEqual(a)
    await rejects(imports.finish(owner, f.projectId, f.input.id), /incompleto/)
    await rejects(
      imports.chunk(owner, f.projectId, f.input.id, {
        offset: 1,
        entries: f.entries.slice(0, 100),
      }),
      /sequência/,
    )
    const first = { offset: 0, entries: f.entries.slice(0, 100) }
    const repeated = await Promise.all([
      imports.chunk(owner, f.projectId, f.input.id, first),
      imports.chunk(owner, f.projectId, f.input.id, first),
    ])
    expect(repeated.map((r) => r.received)).toEqual([100, 100])
    await rejects(
      imports.chunk(owner, f.projectId, f.input.id, {
        ...first,
        entries: first.entries.map((e) => ({ ...e, bytes: 11 })),
      }),
      /diferente/,
    )
    for (let i = 100; i < f.entries.length; i += 100)
      await imports.chunk(owner, f.projectId, f.input.id, {
        offset: i,
        entries: f.entries.slice(i, i + 100),
      })
    const finished = await Promise.all([
      imports.finish(owner, f.projectId, f.input.id),
      imports.finish(owner, f.projectId, f.input.id),
    ])
    expect(finished[0]).toEqual(finished[1])
    expect(finished[0]?.state).toBe('inventoried')
    expect((await imports.page(owner, f.projectId, f.input.id, 0)).nextCursor).toBe(100)
    expect((await imports.page(owner, f.projectId, f.input.id, 200)).entries).toHaveLength(5)
    expect((await workspace.snapshot(owner, f.projectId)).items).toHaveLength(0)
    expect(await imports.chunk(owner, f.projectId, f.input.id, first)).toEqual(finished[0])
    await rejects(
      imports.start(owner, f.projectId, { ...f.input, digest: 'f'.repeat(64) }),
      /outra origem/,
    )
  })
  test('wrong digest never seals; ACL and retirement preserve records without publishing or deleting', async () => {
    const f = await fixture(1),
      input = { ...f.input, digest: '0'.repeat(64) }
    await imports.start(owner, f.projectId, input)
    await imports.chunk(owner, f.projectId, input.id, { offset: 0, entries: f.entries })
    await rejects(imports.finish(owner, f.projectId, input.id), /hash/)
    await rejects(imports.page(outsider, f.projectId, input.id, 0), /disponível/)
    await rejects(imports.list(outsider, f.projectId, undefined), /disponível/)
    await imports.retire(owner, f.projectId, input.id)
    expect((await imports.page(owner, f.projectId, input.id, 0)).entries).toHaveLength(1)
    await rejects(imports.finish(owner, f.projectId, input.id), /desativado/)
    await rejects(
      imports.chunk(owner, f.projectId, input.id, { offset: 0, entries: f.entries }),
      /desativada/,
    )
    expect((await imports.list(owner, f.projectId, undefined))[0]?.state).toBe('retired')
  })
})
