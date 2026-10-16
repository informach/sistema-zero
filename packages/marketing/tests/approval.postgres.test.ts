import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { rejects } from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { type AssetManifest, createPieceBatch } from '@sistemazero/marketing-contracts'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import type { Actor } from '../src/application/actor'
import { ApprovalService } from '../src/application/workspace/approval.service'
import { WorkspaceService } from '../src/application/workspace/workspace.service'
import { deliveryCopy } from '../src/domain/workspace/delivery'
import { DrizzleApprovalRepository } from '../src/infrastructure/persistence/drizzle/approval.repository'
import { createDbConnection, type DbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { DrizzleWorkspaceRepository } from '../src/infrastructure/persistence/drizzle/workspace.repository'
import { editorialAssets } from '../src/infrastructure/persistence/drizzle/workspace-schema'
import { requireReviewDatabase } from './helpers/review-database'
import { fixtureDirectory } from './helpers/staff-directory'

const url = process.env.MARKETING_TEST_DATABASE_URL,
  suite = url ? describe : describe.skip
suite('aprovação PostgreSQL: edição exata e imutável', () => {
  let connection: DbConnection, workspace: WorkspaceService, approval: ApprovalService
  const owner: Actor = {
    userId: randomUUID(),
    displayName: 'Responsável',
    role: 'staff',
    status: 'active',
  }
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
    approval = new ApprovalService(new DrizzleApprovalRepository(connection.db))
  }, 30000) // A fresh database applies the entire migration history before the fixtures.
  afterAll(async () => connection?.close())
  async function fixture() {
    const projectId = randomUUID()
    await workspace.create(owner, {
      schemaVersion: 1,
      id: projectId,
      operationId: randomUUID(),
      name: 'Aprovação',
      product: 'Sistema Zero',
    })
    const manifest: AssetManifest = {
      schemaVersion: 1,
      id: randomUUID(),
      projectId,
      name: 'story-final.png',
      sha256: 'a'.repeat(64),
      size: 1024,
      mime: 'image/png',
      role: 'final',
      sourceAssetId: null,
      width: 1080,
      height: 1920,
      durationMs: null,
      codec: null,
      rotation: null,
    }
    // Storage fixture only; bytes and R2 transfer are covered by the asset protocol, not this test.
    await connection.db.insert(editorialAssets).values({
      id: manifest.id,
      projectId,
      manifest,
      storageKey: `review/${manifest.id}`,
      confirmed: true,
      createdBy: owner.userId,
    })
    const batch = createPieceBatch({
      projectId,
      title: 'Story final',
      brief: 'Aprender criando',
      format: 'story',
      medium: 'image',
    })
    const component = batch.changes.find((change) => change.document?.kind === 'component')
    const representation = batch.changes.find(
      (change) => change.document?.kind === 'representation',
    )
    if (
      component?.document?.kind !== 'component' ||
      representation?.document?.kind !== 'representation'
    )
      throw new Error('Fixture sem peças')
    component.document.body = 'Uma criação de cada vez.'
    component.document.alt = 'Exemplo de criação de um jogo'
    component.document.assetIds = [manifest.id]
    representation.document.caption = 'Conheça a atividade.'
    const saved = await workspace.applyBatch(owner, batch)
    if (saved.status !== 'applied') throw new Error('Fixture não gravada')
    return {
      projectId,
      componentId: component.entityId,
      representationId: representation.entityId,
      manifest,
      saved,
    }
  }
  const input = (representationId: string, expectedHash: string) => ({
    schemaVersion: 1,
    operationId: randomUUID(),
    representationId,
    expectedHash,
    checks: { copy: true, visual: true, destination: true },
  })
  test('legenda editável integra a edição e a entrega sem arquivo visual; direct não entra no publicador', async () => {
    const f = await fixture(),
      captionId = randomUUID()
    const representation = f.saved.items.find((item) => item.id === f.representationId)
    if (representation?.document.kind !== 'representation') throw new Error('Formato ausente')
    const updated = await workspace.applyBatch(owner, {
      schemaVersion: 1,
      projectId: f.projectId,
      operationId: randomUUID(),
      changes: [
        {
          entityId: representation.id,
          baseRevisionId: representation.revisionId,
          action: 'save',
          document: {
            ...representation.document,
            componentIds: [...representation.document.componentIds, captionId],
          },
        },
        {
          entityId: captionId,
          baseRevisionId: null,
          action: 'save',
          document: {
            schemaVersion: 1,
            kind: 'component',
            title: 'Legenda',
            representationId: representation.id,
            componentType: 'caption',
            body: 'Legenda literal editável.',
            assetIds: [],
            protectedText: [],
            sourceRevisionId: null,
          },
        },
      ],
    })
    if (updated.status !== 'applied') throw new Error('Conflito inesperado')
    const preview = await approval.preview(owner, f.projectId, f.representationId)
    expect(preview.snapshot.orderedAssets).toHaveLength(1)
    const edition = await approval.approve(
      owner,
      f.projectId,
      input(f.representationId, preview.hash),
    )
    expect(deliveryCopy(edition, 'ig_story').caption).toBe('Legenda literal editável.')
    const caption = updated.items.find((item) => item.id === captionId)
    if (caption?.document.kind !== 'component') throw new Error('Legenda ausente')
    await workspace.apply(owner, {
      schemaVersion: 1,
      projectId: f.projectId,
      operationId: randomUUID(),
      entityId: caption.id,
      baseRevisionId: caption.revisionId,
      action: 'save',
      document: { ...caption.document, body: 'Legenda nova.' },
    })
    await rejects(
      approval.approve(owner, f.projectId, input(f.representationId, preview.hash)),
      /mudou durante/,
    )
    expect(deliveryCopy(edition, 'ig_story').caption).toBe('Legenda literal editável.')
    const revised = await approval.preview(owner, f.projectId, f.representationId)
    expect(
      deliveryCopy(
        await approval.approve(owner, f.projectId, input(f.representationId, revised.hash)),
        'ig_story',
      ).caption,
    ).toBe('Legenda nova.')
    const current = updated.items.find((item) => item.id === representation.id)
    if (current?.document.kind !== 'representation') throw new Error('Formato ausente')
    await workspace.apply(owner, {
      schemaVersion: 1,
      projectId: f.projectId,
      operationId: randomUUID(),
      entityId: current.id,
      baseRevisionId: current.revisionId,
      action: 'save',
      document: { ...current.document, purpose: 'direct' },
    })
    await rejects(approval.preview(owner, f.projectId, f.representationId), /direct/)
  })
  test('consulta de confirmação é somente leitura, pertence ao autor e exige acesso atual', async () => {
    const f = await fixture(),
      preview = await approval.preview(owner, f.projectId, f.representationId),
      request = input(f.representationId, preview.hash)
    expect(await workspace.actionReceipt(owner, f.projectId, request.operationId)).toEqual({
      found: false,
    })
    const edition = await approval.approve(owner, f.projectId, request)
    expect(await workspace.actionReceipt(owner, f.projectId, request.operationId)).toEqual({
      found: true,
      result: edition,
    })
    const colleague = { ...owner, userId: randomUUID() }
    await workspace.setMember(owner, f.projectId, {
      operationId: randomUUID(),
      userId: colleague.userId,
      permissions: ['read'],
    })
    expect(await workspace.actionReceipt(colleague, f.projectId, request.operationId)).toEqual({
      found: false,
    })
    await rejects(
      () =>
        workspace.actionReceipt(
          { ...owner, userId: randomUUID() },
          f.projectId,
          request.operationId,
        ),
      /não disponível/,
    )
    expect((await approval.list(owner, f.projectId, f.representationId)).items).toHaveLength(1)
  })
  test('exportação verifica pertencimento e identidade antes de entregar URL e nome ordenado', async () => {
    const f = await fixture(),
      preview = await approval.preview(owner, f.projectId, f.representationId)
    const edition = await approval.approve(
      owner,
      f.projectId,
      input(f.representationId, preview.hash),
    )
    let calls = 0,
      corrupt = false
    const exporter = new ApprovalService(new DrizzleApprovalRepository(connection.db), {
      async download(_actor, projectId, assetId, filename) {
        calls++
        expect(projectId).toBe(f.projectId)
        expect(assetId).toBe(f.manifest.id)
        expect(filename).toBe(`001-${edition.id}.png`)
        return {
          manifest: { ...f.manifest, sha256: corrupt ? 'f'.repeat(64) : f.manifest.sha256 },
          url: 'https://storage.example.test/signed-object',
        }
      },
    })
    await rejects(
      () => exporter.download(owner, f.projectId, edition.id, randomUUID()),
      /não pertence/,
    )
    await rejects(
      () =>
        exporter.download(
          { ...owner, userId: randomUUID() },
          f.projectId,
          edition.id,
          f.componentId,
        ),
      /não disponível/,
    )
    expect(calls).toBe(0)
    const download = await exporter.download(owner, f.projectId, edition.id, f.componentId)
    expect(download.editionHash).toBe(edition.hash)
    expect(download.manifest).toEqual(f.manifest)
    corrupt = true
    await rejects(() => exporter.download(owner, f.projectId, edition.id, f.componentId), /diverge/)
  })
  test('guarda bytes/revisões conferidos, repete resposta perdida e preserva edição depois de novo rascunho', async () => {
    const f = await fixture(),
      preview = await approval.preview(owner, f.projectId, f.representationId)
    const request = input(f.representationId, preview.hash)
    const edition = await approval.approve(owner, f.projectId, request)
    expect(edition.snapshot.orderedAssets.map((item) => item.asset.sha256)).toEqual([
      f.manifest.sha256,
    ])
    expect(edition.snapshot.orderedAssets[0]?.revisionId).toBe(
      f.saved.items.find((item) => item.id === f.componentId)?.revisionId,
    )
    const component = f.saved.items.find((item) => item.id === f.componentId)
    if (component?.document.kind !== 'component') throw new Error('Componente ausente')
    await workspace.apply(owner, {
      schemaVersion: 1,
      projectId: f.projectId,
      operationId: randomUUID(),
      entityId: component.id,
      baseRevisionId: component.revisionId,
      action: 'save',
      document: {
        ...component.document,
        body: 'Outro rascunho',
        assetIds: [],
        referenceAssetIds: [f.manifest.id],
      },
    })
    expect(await approval.approve(owner, f.projectId, request)).toEqual(edition)
    const history = await approval.list(owner, f.projectId, f.representationId)
    expect(history.items.map((item) => ({ id: item.id, assetCount: item.assetCount }))).toEqual([
      { id: edition.id, assetCount: 1 },
    ])
    const saved = await approval.get(owner, f.projectId, edition.id)
    expect(saved).toEqual(edition)
    expect(
      saved.snapshot.revisions.find((revision) => revision.entityId === component.id)?.document,
    ).toEqual(component.document)
    await rejects(
      () => approval.preview(owner, f.projectId, f.representationId),
      /único arquivo final/,
    )
    await rejects(
      () => approval.approve(owner, f.projectId, { ...request, expectedHash: 'b'.repeat(64) }),
      /operação já foi usada/,
    )
  })
  test('revisão concorrente, aprovação incompleta e pessoa sem permissão não aprovam', async () => {
    const f = await fixture(),
      preview = await approval.preview(owner, f.projectId, f.representationId)
    const colleague: Actor = { ...owner, userId: randomUUID(), displayName: 'Editor' }
    await workspace.setMember(owner, f.projectId, {
      operationId: randomUUID(),
      userId: colleague.userId,
      permissions: ['read', 'edit'],
    })
    expect((await approval.preview(colleague, f.projectId, f.representationId)).hash).toBe(
      preview.hash,
    )
    await rejects(
      () => approval.approve(colleague, f.projectId, input(f.representationId, preview.hash)),
      /não disponível/,
    )
    await rejects(async () =>
      approval.approve(owner, f.projectId, {
        ...input(f.representationId, preview.hash),
        checks: { copy: true, visual: false, destination: true },
      }),
    )
    const representation = f.saved.items.find((item) => item.id === f.representationId)
    if (representation?.document.kind !== 'representation') throw new Error('Formato ausente')
    await workspace.apply(owner, {
      schemaVersion: 1,
      projectId: f.projectId,
      operationId: randomUUID(),
      entityId: representation.id,
      baseRevisionId: representation.revisionId,
      action: 'save',
      document: { ...representation.document, caption: 'Legenda revisada por outra pessoa' },
    })
    await rejects(
      () => approval.approve(owner, f.projectId, input(f.representationId, preview.hash)),
      /mudou durante/,
    )
    expect((await approval.list(owner, f.projectId, f.representationId)).items).toEqual([])
    const updated = await approval.preview(owner, f.projectId, f.representationId)
    expect(
      (await approval.approve(owner, f.projectId, input(f.representationId, updated.hash))).hash,
    ).toBe(updated.hash)
  })
})
