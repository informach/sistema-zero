import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { rejects } from 'node:assert/strict'
import {
  assetManifestSchema,
  clipSchema,
  contextRequestSchema,
  createPieceBatch,
} from '@sistemazero/marketing-contracts'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import type { Actor } from '../src/application/actor'
import { ApprovalService } from '../src/application/workspace/approval.service'
import { ExecutionService } from '../src/application/workspace/execution.service'
import { WorkspaceService } from '../src/application/workspace/workspace.service'
import { DrizzleApprovalRepository } from '../src/infrastructure/persistence/drizzle/approval.repository'
import { createDbConnection, type DbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { DrizzleExecutionRepository } from '../src/infrastructure/persistence/drizzle/execution.repository'
import { DrizzleWorkspaceRepository } from '../src/infrastructure/persistence/drizzle/workspace.repository'
import { editorialAssets } from '../src/infrastructure/persistence/drizzle/workspace-schema'
import { fixtureDirectory } from './helpers/staff-directory'

const url = process.env.MARKETING_TEST_DATABASE_URL
const suite = url ? describe : describe.skip
suite('demonstração integrada: fontes, contexto e aprovação', () => {
  let connection: DbConnection,
    workspace: WorkspaceService,
    execution: ExecutionService,
    approval: ApprovalService
  const id = () => crypto.randomUUID()
  const owner: Actor = {
    userId: id(),
    displayName: 'Editor da demonstração',
    role: 'staff',
    status: 'active',
  }
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
    execution = new ExecutionService(new DrizzleExecutionRepository(connection.db))
    approval = new ApprovalService(new DrizzleApprovalRepository(connection.db))
  }, 30000)
  afterAll(async () => connection?.close())

  async function fixture(rotation: number | null = 0) {
    const projectId = id()
    await workspace.create(owner, {
      schemaVersion: 1,
      operationId: id(),
      id: projectId,
      name: 'Demonstração',
      product: 'Studio',
    })
    const image = assetManifestSchema.parse({
      schemaVersion: 1,
      id: id(),
      projectId,
      name: 'captura.png',
      sha256: 'a'.repeat(64),
      size: 1234,
      mime: 'image/png',
      role: 'original',
      sourceAssetId: null,
      width: 800,
      height: 600,
      durationMs: null,
      codec: null,
      rotation,
    })
    const final = assetManifestSchema.parse({
      ...image,
      id: id(),
      name: 'final.mp4',
      sha256: 'b'.repeat(64),
      mime: 'video/mp4',
      role: 'final',
      width: 1080,
      height: 1920,
      durationMs: 5000,
      codec: 'h264',
      rotation: 0,
    })
    // Confirmed-storage fixtures test persistence, not a real transfer or render.
    for (const manifest of [image, final])
      await connection.db.insert(editorialAssets).values({
        id: manifest.id,
        projectId,
        manifest,
        storageKey: `review/${manifest.id}`,
        confirmed: true,
        createdBy: owner.userId,
      })
    const fact = await workspace.apply(owner, {
      schemaVersion: 1,
      operationId: id(),
      projectId,
      entityId: id(),
      baseRevisionId: null,
      action: 'save',
      document: {
        schemaVersion: 1,
        kind: 'evidence',
        title: 'Comparação observada',
        body: 'A posição mudou; os demais parâmetros foram preservados.',
        assetIds: [image.id],
        classification: 'fact',
        validity: 'current',
        product: 'Studio',
        tags: [],
        source: { label: 'Registro da captura', sha256: image.sha256 },
      },
    })
    if (fact.status !== 'applied') throw new Error('Conflito inesperado')
    const batch = createPieceBatch({
      projectId,
      title: 'Uma decisão',
      brief: 'Mostrar o que mudou',
      format: 'story',
      medium: 'video',
    })
    const video = batch.changes.find((change) => change.document?.kind === 'video')
    const representation = batch.changes.find(
      (change) => change.document?.kind === 'representation',
    )
    if (video?.document?.kind !== 'video' || representation?.document?.kind !== 'representation')
      throw new Error('Peça ausente')
    representation.document.alt = 'Captura de uma execução do jogo'
    video.document.assetIds = [final.id]
    video.document.timeline.clips.push(
      clipSchema.parse({
        id: id(),
        trackId: video.document.timeline.tracks[0]?.id,
        kind: 'image',
        assetId: image.id,
        startFrame: 0,
        durationInFrames: 150,
        fit: 'contain',
        demonstration: {
          schemaVersion: 1,
          recipeId: 'detail-context-v1',
          headline: 'Uma decisão, um teste',
          sources: [
            {
              id: id(),
              assetId: image.id,
              sha256: image.sha256,
              width: image.width,
              height: image.height,
              evidenceId: fact.entityId,
              evidenceRevisionId: fact.revisionId,
              label: 'Estado observado',
              focus: { x: 0.2, y: 0.2, width: 0.5, height: 0.5 },
            },
          ],
        },
      }),
    )
    const saved = await workspace.applyBatch(owner, batch)
    if (saved.status !== 'applied') throw new Error('Conflito inesperado')
    const item = saved.items.find((item) => item.kind === 'video')
    if (item?.document.kind !== 'video') throw new Error('Vídeo ausente')
    return { projectId, fact, item, representationId: representation.entityId }
  }

  test('gravação direta rejeita hash adulterado e contexto inclui a fonte mesmo fora da pauta', async () => {
    const f = await fixture()
    const input = contextRequestSchema.parse({
      schemaVersion: 1,
      projectId: f.projectId,
      entityId: f.item.id,
      revisionId: f.item.revisionId,
      capability: 'video-edit',
      provider: 'codex',
      intent: 'adjust',
      instruction: 'Mude só o título',
      selection: [],
      protectedIds: [],
      limits: {},
    })
    const { context } = await execution.context(owner, input)
    expect(context.evidence.map((revision) => revision.id)).toContain(f.fact.revisionId)
    expect(context.basis?.map((revision) => revision.id)).toContain(f.fact.revisionId)
    expect(context.assets).toHaveLength(2)
    const changed = structuredClone(f.item.document)
    if (changed.kind !== 'video') throw new Error('Vídeo ausente')
    changed.assetIds = []
    const source = changed.timeline.clips[0]?.demonstration?.sources[0]
    if (!source) throw new Error('Fonte ausente')
    source.sha256 = 'f'.repeat(64)
    await rejects(
      () =>
        workspace.apply(owner, {
          schemaVersion: 1,
          operationId: id(),
          projectId: f.projectId,
          entityId: f.item.id,
          baseRevisionId: f.item.revisionId,
          action: 'save',
          document: changed,
        }),
      /demonstração/,
    )
    const snapshot = await workspace.snapshot(owner, f.projectId)
    expect(snapshot.items.find((item) => item.id === f.item.id)?.revisionId).toBe(f.item.revisionId)
    await rejects(() => execution.context({ ...owner, userId: id() }, input), /disponível/)
  })

  test('gravação em lote rejeita imagem rotacionada ou sem orientação verificada', async () => {
    await rejects(() => fixture(90), /normalizada/)
    await rejects(() => fixture(null), /normalizada/)
  })

  test('aprovação fixa a fonte da cena; invalidação bloqueia novo aceite e preserva a edição antiga', async () => {
    const f = await fixture()
    const preview = await approval.preview(owner, f.projectId, f.representationId)
    expect(preview.snapshot.revisions.some((revision) => revision.id === f.fact.revisionId)).toBe(
      true,
    )
    const edition = await approval.approve(owner, f.projectId, {
      schemaVersion: 1,
      operationId: id(),
      representationId: f.representationId,
      expectedHash: preview.hash,
      checks: { copy: true, visual: true, destination: true },
    })
    const evidence = f.fact.item.document
    if (evidence.kind !== 'evidence') throw new Error('Evidência ausente')
    await workspace.apply(owner, {
      schemaVersion: 1,
      operationId: id(),
      projectId: f.projectId,
      entityId: f.fact.entityId,
      baseRevisionId: f.fact.revisionId,
      action: 'save',
      document: { ...evidence, validity: 'unverified' },
    })
    await rejects(
      () => approval.preview(owner, f.projectId, f.representationId),
      /fonte da demonstração mudou/,
    )
    expect((await approval.get(owner, f.projectId, edition.id)).hash).toBe(edition.hash)
  })
})
