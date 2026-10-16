import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { rejects } from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import {
  type AssetManifest,
  createPieceBatch,
  type Delivery,
} from '@sistemazero/marketing-contracts'
import { eq } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import type { Actor } from '../src/application/actor'
import { ApprovalService } from '../src/application/workspace/approval.service'
import { DeliveryService } from '../src/application/workspace/delivery.service'
import { ExecutionService } from '../src/application/workspace/execution.service'
import { WorkspaceService } from '../src/application/workspace/workspace.service'
import { DrizzleApprovalRepository } from '../src/infrastructure/persistence/drizzle/approval.repository'
import { DrizzleContentRepository } from '../src/infrastructure/persistence/drizzle/content.repository'
import { createDbConnection, type DbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { DrizzleDeliveryRepository } from '../src/infrastructure/persistence/drizzle/delivery.repository'
import { DrizzleExecutionRepository } from '../src/infrastructure/persistence/drizzle/execution.repository'
import { DrizzleMediaAssetRepository } from '../src/infrastructure/persistence/drizzle/media-asset.repository'
import { DrizzleMetricsRepository } from '../src/infrastructure/persistence/drizzle/metrics.repository'
import { DrizzlePublicationRepository } from '../src/infrastructure/persistence/drizzle/publication.repository'
import {
  metricPublicationSnapshots,
  publications,
  socialAccounts,
} from '../src/infrastructure/persistence/drizzle/schema'
import { DrizzleWorkspaceRepository } from '../src/infrastructure/persistence/drizzle/workspace.repository'
import { editorialAssets } from '../src/infrastructure/persistence/drizzle/workspace-schema'
import { FakeMediaStore } from './fakes/in-memory'
import { fixtureDirectory } from './helpers/staff-directory'

class ReviewStore extends FakeMediaStore {
  override async head(key: string) {
    const size = this.objects.get(key)
    return {
      exists: size !== undefined,
      sizeBytes: size ?? null,
      contentType: size === undefined ? null : 'image/png',
    }
  }
}
const url = process.env.MARKETING_TEST_DATABASE_URL,
  suite = url ? describe : describe.skip
suite('entrega PostgreSQL: edição aprovada, ACL, armazenamento e publicação', () => {
  let connection: DbConnection,
    workspace: WorkspaceService,
    approval: ApprovalService,
    delivery: DeliveryService,
    repository: DrizzleDeliveryRepository
  const owner: Actor = {
      userId: randomUUID(),
      displayName: 'Revisão',
      role: 'staff',
      status: 'active',
    },
    store = new ReviewStore(),
    now = () => new Date('2026-10-15T12:00:00Z')
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
    approval = new ApprovalService(new DrizzleApprovalRepository(connection.db))
    repository = new DrizzleDeliveryRepository(
      connection.db,
      store,
      new Set(['instagram', 'facebook']),
      now,
    )
    delivery = new DeliveryService(repository)
  })
  afterAll(async () => connection?.close())
  async function fixture(format: 'story' | 'feed' = 'story') {
    const projectId = randomUUID(),
      evidenceId = randomUUID()
    await workspace.create(owner, {
      schemaVersion: 1,
      id: projectId,
      operationId: randomUUID(),
      name: 'Entrega',
      product: 'Sistema Zero',
    })
    const evidence = {
      schemaVersion: 1 as const,
      kind: 'evidence' as const,
      title: 'Referência conferida',
      body: 'Uma observação da atividade',
      classification: 'fact' as const,
      source: { label: 'Revisão local', observedAt: now().toISOString() },
      product: 'Sistema Zero',
      validity: 'current' as const,
      tags: [],
    }
    // Source schema is validated by WorkspaceService; this is domain data, never a provider call.
    const sourceResult = await workspace.apply(owner, {
      schemaVersion: 1,
      projectId,
      operationId: randomUUID(),
      entityId: evidenceId,
      baseRevisionId: null,
      action: 'save',
      document: evidence,
    })
    const manifest: AssetManifest = {
        schemaVersion: 1,
        id: randomUUID(),
        projectId,
        name: 'final.png',
        sha256: 'a'.repeat(64),
        size: 1024,
        mime: 'image/png',
        role: 'final',
        sourceAssetId: null,
        width: 1080,
        height: format === 'story' ? 1920 : 1350,
        durationMs: null,
        codec: null,
        rotation: null,
      },
      key = `review/${randomUUID()}`
    await connection.db.insert(editorialAssets).values({
      id: manifest.id,
      projectId,
      manifest,
      storageKey: key,
      confirmed: true,
      createdBy: owner.userId,
    })
    store.objects.set(key, manifest.size)
    const batch = createPieceBatch({
      projectId,
      title: 'Uma atividade para criar',
      brief: 'Aprender criando',
      format,
      medium: 'image',
    })
    const piece = batch.changes.find((change) => change.document?.kind === 'piece'),
      component = batch.changes.find((change) => change.document?.kind === 'component'),
      representation = batch.changes.find((change) => change.document?.kind === 'representation')
    if (
      piece?.document?.kind !== 'piece' ||
      component?.document?.kind !== 'component' ||
      representation?.document?.kind !== 'representation'
    )
      throw new Error('Fixture incompleta')
    piece.document.evidenceIds = [evidenceId]
    component.document.body = 'Uma criação de cada vez.'
    component.document.alt = 'Exemplo de um jogo'
    component.document.assetIds = [manifest.id]
    representation.document.caption = 'Conheça a atividade.'
    const saved = await workspace.applyBatch(owner, batch)
    if (saved.status !== 'applied') throw new Error('Fixture não gravada')
    const preview = await approval.preview(owner, projectId, representation.entityId)
    const edition = await approval.approve(owner, projectId, {
      schemaVersion: 1,
      operationId: randomUUID(),
      representationId: representation.entityId,
      expectedHash: preview.hash,
      checks: { copy: true, visual: true, destination: true },
    })
    const input = {
      schemaVersion: 1,
      operationId: randomUUID(),
      editionId: edition.id,
      expectedHash: edition.hash,
      format: format === 'story' ? 'ig_story' : 'ig_feed',
      sourcePublicationId: null,
    }
    const created = await delivery.create(owner, projectId, input)
    return {
      projectId,
      representationId: representation.entityId,
      componentId: component.entityId,
      saved,
      manifest,
      key,
      edition,
      input,
      created,
      evidenceId,
      evidence,
      sourceResult,
    }
  }
  const action = (value: Delivery) => ({
    schemaVersion: 1,
    operationId: randomUUID(),
    version: value.version,
    expectedHash: value.editionHash,
  })
  const schedule = (value: Delivery) => ({
    ...action(value),
    action: 'schedule',
    scheduledAt: '2026-10-16T12:00:00Z',
    publishMode: 'manual',
    socialAccountId: null,
  })
  async function publication(id: string) {
    const [value] = await connection.db.select().from(publications).where(eq(publications.id, id))
    if (!value) throw new Error('Publicação ausente')
    return value
  }
  test('reconciliação é somente leitura externa, idempotente e preserva checkpoint; conta concorrente invalida confirmação', async () => {
    const f = await fixture('feed'),
      accountId = randomUUID(),
      checkpoint = { phase: 'ig_publishing', containerId: 'container-review' }
    await connection.db.insert(socialAccounts).values({
      id: accountId,
      network: 'instagram',
      externalId: randomUUID(),
      displayName: 'Conta da reconciliação',
      connectedBy: owner.userId,
      createdAt: now(),
      updatedAt: now(),
    })
    await connection.db
      .update(publications)
      .set({
        status: 'failed',
        publishMode: 'auto',
        socialAccountId: accountId,
        providerSession: checkpoint,
      })
      .where(eq(publications.id, f.created.id))
    let calls = 0,
      changeAccount = false
    const reconciling = new DeliveryService(
      new DrizzleDeliveryRepository(connection.db, store, new Set(['instagram']), now, {
        networks: new Set(['instagram']),
        async verify(network, id, url) {
          calls++
          expect(network).toBe('instagram')
          expect(id).toBe(accountId)
          if (changeAccount)
            await connection.db
              .update(socialAccounts)
              .set({ version: 1 })
              .where(eq(socialAccounts.id, accountId))
          return {
            externalPostId: 'verified-post',
            externalUrl: url,
            socialAccountId: accountId,
            accountVersion: 0,
          }
        },
      }),
    )
    const input = {
      ...action(f.created),
      action: 'reconcile-published',
      externalUrl: 'https://www.instagram.com/p/Verified/',
      socialAccountId: accountId,
      confirmedEdition: true,
    }
    await rejects(
      () => reconciling.act({ ...owner, userId: randomUUID() }, f.projectId, f.created.id, input),
      /não disponível/,
    )
    expect(calls).toBe(0)
    changeAccount = true
    await rejects(() => reconciling.act(owner, f.projectId, f.created.id, input), /conta mudou/)
    expect((await publication(f.created.id)).providerSession).toEqual(checkpoint)
    expect((await publication(f.created.id)).status).toBe('failed')
    changeAccount = false
    await connection.db
      .update(socialAccounts)
      .set({ version: 0 })
      .where(eq(socialAccounts.id, accountId))
    // Recording an already-published external result must remain possible after file loss.
    store.objects.delete(f.key)
    const confirmed = await reconciling.act(owner, f.projectId, f.created.id, input)
    expect(confirmed.status).toBe('published')
    expect(confirmed.externalPostId).toBe('verified-post')
    expect(await reconciling.act(owner, f.projectId, f.created.id, input)).toEqual(confirmed)
    expect(calls).toBe(2)
    const saved = await publication(f.created.id)
    expect(saved.providerSession).toEqual(checkpoint)
    expect(saved.metricsNextCollectAt).toEqual(now())
    await rejects(
      () => delivery.act(owner, f.projectId, f.created.id, schedule(confirmed)),
      /Reconcilie/,
    )
  })
  test('encerrar no app mantém checkpoint e não autoriza reagendamento; worker ativo impede reconciliação', async () => {
    const f = await fixture(),
      checkpoint = { phase: 'ig_publishing', containerId: 'uncertain' }
    await connection.db
      .update(publications)
      .set({ status: 'publishing', providerSession: checkpoint })
      .where(eq(publications.id, f.created.id))
    const input = {
      ...action(f.created),
      action: 'cancel-local',
      acknowledgeExternalUnchanged: true,
    }
    await rejects(() => delivery.act(owner, f.projectId, f.created.id, input), /aguarde/)
    await connection.db
      .update(publications)
      .set({ status: 'failed' })
      .where(eq(publications.id, f.created.id))
    const canceled = await delivery.act(owner, f.projectId, f.created.id, input)
    expect(canceled.status).toBe('canceled')
    expect((await publication(canceled.id)).providerSession).toEqual(checkpoint)
    await rejects(
      () => delivery.act(owner, f.projectId, canceled.id, schedule(canceled)),
      /Reconcilie/,
    )
  })
  test('última métrica é determinística por publicação, inclusive com timestamps empatados', async () => {
    const one = await fixture(),
      two = await fixture(),
      at = now()
    const samples = [one, two].flatMap((f) =>
      [0, 1, 2].map((views) => ({
        id: randomUUID(),
        publicationId: f.created.id,
        capturedAt: at,
        collectionVersion: 1,
        views,
      })),
    )
    await connection.db.insert(metricPublicationSnapshots).values(samples)
    const repository = new DrizzleMetricsRepository(connection.db)
    const latest = await repository.latestPublicationStats([one.created.id, two.created.id])
    expect(latest.size).toBe(2)
    for (const f of [one, two])
      expect(latest.get(f.created.id)?.id).toBe(
        samples
          .filter((sample) => sample.publicationId === f.created.id)
          .sort((a, b) => b.id.localeCompare(a.id))[0]?.id,
      )
  })
  test('um replay cria só uma entrega; um rascunho posterior não substitui arquivo/copy aprovados', async () => {
    const f = await fixture()
    expect(await delivery.create(owner, f.projectId, f.input)).toEqual(f.created)
    const draft = f.saved.items.find((item) => item.id === f.componentId)
    if (draft?.document.kind !== 'component') throw new Error('Componente ausente')
    await workspace.apply(owner, {
      schemaVersion: 1,
      projectId: f.projectId,
      operationId: randomUUID(),
      entityId: draft.id,
      baseRevisionId: draft.revisionId,
      action: 'save',
      document: {
        ...draft.document,
        body: 'Outro rascunho',
        assetIds: [],
        referenceAssetIds: [f.manifest.id],
      },
    })
    const request = schedule(f.created),
      scheduled = await delivery.act(owner, f.projectId, f.created.id, request)
    expect(scheduled.status).toBe('scheduled')
    const resolved = await repository.resolve(await publication(f.created.id))
    expect(resolved?.orderedAssetIds).toEqual([f.manifest.id])
    expect(resolved?.assets[0]?.r2Key).toBe(f.key)
    expect(scheduled.caption).toBe('Conheça a atividade.')
    store.objects.delete(f.key)
    expect(await delivery.act(owner, f.projectId, f.created.id, request)).toEqual(scheduled)
    expect((await delivery.list(owner, f.projectId, f.representationId)).items).toHaveLength(1)
    const current = await publication(scheduled.id)
    await rejects(() => repository.resolve(current), /armazenamento/)
  })
  test('arquivo indisponível, versão concorrente e edição trocada bloqueiam antes do envio', async () => {
    const f = await fixture()
    store.objects.delete(f.key)
    await rejects(
      () => delivery.act(owner, f.projectId, f.created.id, schedule(f.created)),
      /armazenamento/,
    )
    expect((await publication(f.created.id)).status).toBe('draft')
    store.objects.set(f.key, f.manifest.size)
    const attempts = await Promise.allSettled([
      delivery.act(owner, f.projectId, f.created.id, schedule(f.created)),
      delivery.act(owner, f.projectId, f.created.id, schedule(f.created)),
    ])
    expect(attempts.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(attempts.filter((result) => result.status === 'rejected')).toHaveLength(1)
    await rejects(
      () =>
        delivery.act(owner, f.projectId, f.created.id, {
          ...schedule(f.created),
          expectedHash: 'b'.repeat(64),
        }),
      /mudou/,
    )
  })
  test('evidência invalidada bloqueia agendamento e conferência do worker, preservando edição', async () => {
    const f = await fixture(),
      snapshot = await workspace.snapshot(owner, f.projectId)
    const evidence = snapshot.items.find((item) => item.id === f.evidenceId)
    if (evidence?.document.kind !== 'evidence') throw new Error('Evidência ausente')
    await workspace.apply(owner, {
      schemaVersion: 1,
      projectId: f.projectId,
      operationId: randomUUID(),
      entityId: evidence.id,
      baseRevisionId: evidence.revisionId,
      action: 'save',
      document: { ...evidence.document, validity: 'historical' },
    })
    await rejects(
      () => delivery.act(owner, f.projectId, f.created.id, schedule(f.created)),
      /evidência factual/,
    )
    const pub = await publication(f.created.id)
    await rejects(() => repository.resolve(pub), /evidência factual/)
    expect(await approval.get(owner, f.projectId, f.edition.id)).toEqual(f.edition)
  })
  test('permissões de projeto e acesso legado não permitem contornar a aprovação', async () => {
    const f = await fixture(),
      reader: Actor = { ...owner, userId: randomUUID() },
      outsider: Actor = { ...owner, userId: randomUUID() }
    await workspace.setMember(owner, f.projectId, {
      operationId: randomUUID(),
      userId: reader.userId,
      permissions: ['read', 'edit'],
    })
    expect((await delivery.list(reader, f.projectId, f.representationId)).items[0]?.id).toBe(
      f.created.id,
    )
    await rejects(
      () => delivery.act(reader, f.projectId, f.created.id, schedule(f.created)),
      /não disponível/,
    )
    await rejects(() => delivery.list(outsider, f.projectId, f.representationId), /não disponível/)
    const pub = await publication(f.created.id),
      legacy = new DrizzlePublicationRepository(connection.db),
      legacyContents = new DrizzleContentRepository(connection.db)
    expect(await legacy.byId(pub.id)).toBeNull()
    expect(await legacyContents.byId(pub.contentId)).toBeNull()
    expect(await legacy.listByContent(pub.contentId)).toEqual([])
    expect(
      (await legacy.listByWindow({ contentId: pub.contentId, limit: 100, offset: 0 })).total,
    ).toBe(0)
    expect(
      (
        await new DrizzleMediaAssetRepository(connection.db).list({
          contentId: pub.contentId,
          limit: 100,
          offset: 0,
        })
      ).items,
    ).toEqual([])
  })
  test('confirmação manual liga a edição certa; repostagem cria outra entrega sem cancelar histórico', async () => {
    const f = await fixture()
    await rejects(async () =>
      delivery.act(owner, f.projectId, f.created.id, {
        ...action(f.created),
        action: 'mark-published',
        externalUrl: 'https://www.instagram.com/stories/review/123/',
        externalPostId: null,
        confirmedEdition: false,
      }),
    )
    const published = await delivery.act(owner, f.projectId, f.created.id, {
      ...action(f.created),
      action: 'mark-published',
      externalUrl: 'https://www.instagram.com/stories/review/123/',
      externalPostId: null,
      confirmedEdition: true,
    })
    const second = await delivery.create(owner, f.projectId, {
      ...f.input,
      operationId: randomUUID(),
      sourcePublicationId: published.id,
    })
    expect(second.id).not.toBe(published.id)
    expect(second.sourcePublicationId).toBe(published.id)
    expect((await publication(published.id)).status).toBe('published')
    expect((await delivery.list(owner, f.projectId, f.representationId)).items).toHaveLength(2)
    await connection.db.insert(metricPublicationSnapshots).values([
      {
        id: randomUUID(),
        publicationId: published.id,
        capturedAt: new Date('2026-10-16T12:00:00Z'),
        collectionVersion: 0,
        views: 0,
        likes: 10,
        comments: 0,
        shares: 0,
        saves: 0,
      },
      {
        id: randomUUID(),
        publicationId: published.id,
        capturedAt: new Date('2026-10-17T12:00:00Z'),
        collectionVersion: 1,
        views: 0,
        likes: 12,
        comments: null,
        shares: null,
        saves: 0,
      },
    ])
    const metrics = await delivery.metrics(owner, f.projectId, published.id)
    const sample = metrics.snapshots[0]
    if (!sample) throw new Error('Coleta ausente')
    const analysisInput = {
      schemaVersion: 1,
      operationId: randomUUID(),
      snapshotId: sample.id,
      expectedHash: published.editionHash,
      objective: 'Planejar o próximo experimento',
    }
    await rejects(
      () => delivery.analyze(owner, f.projectId, second.id, analysisInput),
      /edição publicada/,
    )
    await rejects(
      () =>
        delivery.analyze(
          { ...owner, userId: randomUUID() },
          f.projectId,
          published.id,
          analysisInput,
        ),
      /não disponível/,
    )
    const analysis = await delivery.analyze(owner, f.projectId, published.id, analysisInput)
    expect(await delivery.analyze(owner, f.projectId, published.id, analysisInput)).toEqual(
      analysis,
    )
    if (analysis.status !== 'applied') throw new Error('Análise não criada')
    const observation = analysis.items.find((item) => item.document.kind === 'evidence'),
      work = analysis.items.find((item) => item.document.kind === 'analysis')
    if (!observation || !work) throw new Error('Observação ou análise ausente')
    expect(
      observation.document.kind === 'evidence' && observation.document.source.sourceKey,
    ).toContain(sample.id)
    expect(observation.document.kind === 'evidence' && observation.document.body).toContain(
      'Visualizações: 0',
    )
    expect(observation.document.kind === 'evidence' && observation.document.body).toContain(
      'Comentários: não fornecido',
    )
    const context = await new ExecutionService(
      new DrizzleExecutionRepository(connection.db),
    ).context(owner, {
      schemaVersion: 1,
      projectId: f.projectId,
      entityId: work.id,
      revisionId: work.revisionId,
      intent: 'adjust',
      capability: 'copy',
      provider: 'codex',
      instruction: 'Analisar estes resultados',
      selection: [],
      protectedIds: [],
      limits: {},
    })
    expect(context.context.basis?.map((row) => row.id).sort()).toEqual(
      f.edition.snapshot.revisions
        .filter((row) =>
          ['piece', 'representation', 'component', 'video'].includes(row.document.kind),
        )
        .map((row) => row.id)
        .sort(),
    )
    expect(context.context.evidence.some((row) => row.entityId === observation.id)).toBe(true)
    expect(
      metrics.snapshots.map((sample) => ({
        views: sample.views,
        status: sample.availability.views,
      })),
    ).toEqual([
      { views: 0, status: 'observed' },
      { views: null, status: 'legacy-unknown' },
    ])
    expect((await delivery.metrics(owner, f.projectId, second.id)).snapshots).toEqual([])
    await rejects(
      () => delivery.metrics({ ...owner, userId: randomUUID() }, f.projectId, published.id),
      /não disponível/,
    )
    await rejects(
      () =>
        delivery.act(owner, f.projectId, published.id, { ...action(published), action: 'cancel' }),
      /não pode ser cancelada/,
    )
  })
  test('checkpoint externo e conversão de formato não podem ser apagados por novo agendamento', async () => {
    const f = await fixture('feed'),
      at = now(),
      accountId = randomUUID()
    await connection.db.insert(socialAccounts).values({
      id: accountId,
      network: 'instagram',
      externalId: randomUUID(),
      displayName: 'Conta de teste sem token',
      scopes: ['instagram_basic', 'instagram_content_publish', 'pages_read_engagement'],
      connectedBy: owner.userId,
      createdAt: at,
      updatedAt: at,
    })
    await rejects(
      () =>
        delivery.act(owner, f.projectId, f.created.id, {
          ...schedule(f.created),
          publishMode: 'auto',
          socialAccountId: accountId,
        }),
      /JPEG/,
    )
    await rejects(
      () =>
        delivery.create(owner, f.projectId, {
          ...f.input,
          operationId: randomUUID(),
          format: 'ig_reels',
        }),
      /Adapte/,
    )
    const checkpoint = { containerId: 'external-id-test', phase: 'ig_publishing' }
    await connection.db
      .update(publications)
      .set({ providerSession: checkpoint, status: 'failed' })
      .where(eq(publications.id, f.created.id))
    await rejects(
      () => delivery.act(owner, f.projectId, f.created.id, schedule(f.created)),
      /Reconcilie/,
    )
    await rejects(
      () =>
        delivery.act(owner, f.projectId, f.created.id, { ...action(f.created), action: 'cancel' }),
      /Reconcilie/,
    )
    expect((await publication(f.created.id)).providerSession).toEqual(checkpoint)
  })
})
