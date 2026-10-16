import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { rejects } from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import {
  type ArtRecipeId,
  type AssetManifest,
  type ContextRequest,
  contextRequestSchema,
  createPieceBatch,
  type EditorialProposal,
  type ExecutionRun,
  renderInputHash,
  videoAdaptationSeed,
  videoSchema,
} from '@sistemazero/marketing-contracts'
import { sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { defaultArt } from '../../marketing-production/src/art-props'
import { editorialRecipe } from '../../marketing-production/src/editorial-recipes'
import type { Actor } from '../src/application/actor'
import { ExecutionService } from '../src/application/workspace/execution.service'
import { WorkspaceService } from '../src/application/workspace/workspace.service'
import { createDbConnection, type DbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { DrizzleExecutionRepository } from '../src/infrastructure/persistence/drizzle/execution.repository'
import { DrizzleWorkspaceRepository } from '../src/infrastructure/persistence/drizzle/workspace.repository'
import { editorialAssets } from '../src/infrastructure/persistence/drizzle/workspace-schema'

const url = process.env.MARKETING_TEST_DATABASE_URL,
  suite = url ? describe : describe.skip
suite('execução PostgreSQL: concessão, tentativas e contexto', () => {
  let connection: DbConnection, workspace: WorkspaceService, execution: ExecutionService
  const owner: Actor = {
    userId: randomUUID(),
    displayName: 'Editor',
    role: 'staff',
    status: 'active',
  }
  const computerA = { ...owner, desktopDeviceId: randomUUID() },
    computerB = { ...owner, desktopDeviceId: randomUUID() }
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
  }, 30000)
  afterAll(async () => connection?.close())
  test('pedido em componente inclui formato, briefing e fontes da peça sem carregar peças alheias', async () => {
    const projectId = randomUUID(),
      sourceId = randomUUID()
    await workspace.create(owner, {
      schemaVersion: 1,
      id: projectId,
      operationId: randomUUID(),
      name: 'Contexto por componente',
      product: 'Sistema Zero',
    })
    await workspace.apply(owner, {
      schemaVersion: 1,
      projectId,
      operationId: randomUUID(),
      entityId: sourceId,
      baseRevisionId: null,
      action: 'save',
      document: {
        schemaVersion: 1,
        kind: 'evidence',
        title: 'Referência',
        body: 'Aprender construindo um jogo',
        classification: 'reference',
        source: { label: 'Documento da equipe' },
        product: 'Sistema Zero',
        validity: 'current',
        tags: [],
      },
    })
    const batch = createPieceBatch({
      projectId,
      title: 'Story da semana',
      brief: 'Convidar para conhecer o jogo',
      format: 'story',
      medium: 'image',
    })
    const piece = batch.changes.find((change) => change.document?.kind === 'piece')
    if (piece?.document?.kind !== 'piece') throw new Error('Peça ausente')
    piece.document.evidenceIds = [sourceId]
    const result = await workspace.applyBatch(owner, batch)
    if (result.status !== 'applied') throw new Error('Conflito inesperado')
    const component = result.items.find((item) => item.kind === 'component')
    if (!component) throw new Error('Componente ausente')
    const input: ContextRequest = {
      schemaVersion: 1,
      projectId,
      entityId: component.id,
      revisionId: component.revisionId,
      intent: 'adjust',
      capability: 'copy',
      provider: 'codex',
      instruction: 'Melhore a abertura',
      selection: [],
      protectedIds: [],
      limits: { timeoutMs: 360000, maxCalls: 1, maxVariants: 1, maxRepairs: 0 },
    }
    const context = await execution.context(owner, input)
    expect(context.context.ancestors.map((revision) => revision.document.kind)).toEqual([
      'representation',
      'piece',
    ])
    expect(context.context.evidence.map((revision) => revision.entityId)).toEqual([sourceId])
    expect(context.context.selected).toHaveLength(0)
    const created = await execution.create(owner, {
      ...input,
      id: randomUUID(),
      operationId: randomUUID(),
      contextHash: context.hash,
    })
    const handoff = await workspace.createHandoff(owner, {
      schemaVersion: 1,
      projectId,
      entityId: component.id,
      revisionId: component.revisionId,
      selection: [],
      intent: 'adjust',
      runId: created.request.id,
    })
    expect((await workspace.resolveHandoff(owner, handoff.id)).runId).toBe(created.request.id)
    await rejects(
      () =>
        workspace.createHandoff(owner, {
          schemaVersion: 1,
          projectId,
          entityId: component.id,
          revisionId: component.revisionId,
          selection: [],
          intent: 'adjust',
          runId: randomUUID(),
        }),
      { code: 'OBJECT_INACCESSIBLE' },
    )
  })
  async function fixture() {
    const projectId = randomUUID(),
      entityId = randomUUID()
    await workspace.create(owner, {
      schemaVersion: 1,
      id: projectId,
      operationId: randomUUID(),
      name: 'Execução',
      product: 'Sistema Zero',
    })
    const saved = await workspace.apply(owner, {
      schemaVersion: 1,
      projectId,
      entityId,
      operationId: randomUUID(),
      baseRevisionId: null,
      action: 'save',
      document: {
        schemaVersion: 1,
        kind: 'direction',
        title: 'Voz',
        body: 'Aprender criando',
        objective: 'Ensinar',
        audience: 'Famílias',
        voice: 'Direta',
        referenceIds: [],
        protectedTerms: [],
      },
    })
    if (saved.status !== 'applied') throw new Error('Fixture inválida')
    const request: ContextRequest = {
      schemaVersion: 1,
      projectId,
      entityId,
      revisionId: saved.revisionId,
      intent: 'adjust',
      capability: 'copy',
      provider: 'codex',
      instruction: 'Melhore a clareza',
      selection: [],
      protectedIds: [],
      limits: { timeoutMs: 360000, maxCalls: 1, maxVariants: 1, maxRepairs: 1 },
    }
    const context = await execution.context(owner, request)
    const input = {
      ...request,
      id: randomUUID(),
      operationId: randomUUID(),
      contextHash: context.hash,
    }
    return { input, request, run: await execution.create(owner, input), projectId, saved }
  }
  function attempt(run: ExecutionRun) {
    if (!run.attempt) throw new Error('Tentativa ausente')
    return run.attempt
  }
  test('resumo usa revisões exatas, sai do contexto ao mudar a fonte e conserva histórico', async () => {
    const f = await fixture(),
      entityId = randomUUID()
    const document = {
      schemaVersion: 1,
      kind: 'analysis',
      title: 'Resumo da voz',
      body: 'Ensinar criando.',
      analysisType: 'summary',
      objective: 'Guiar copy',
      evidenceIds: [],
      hypothesis: '',
      proposedPieceId: null,
      basis: [{ entityId: f.saved.entityId, revisionId: f.saved.revisionId }],
    }
    const first = await workspace.apply(owner, {
      schemaVersion: 1,
      projectId: f.projectId,
      operationId: randomUUID(),
      entityId,
      baseRevisionId: null,
      action: 'save',
      document,
    })
    if (first.status !== 'applied') throw new Error('Resumo não gravado')
    expect(
      (await execution.context(owner, f.request)).context.memory.map((item) => item.entityId),
    ).toEqual([entityId])
    const changed = await workspace.apply(owner, {
      schemaVersion: 1,
      projectId: f.projectId,
      operationId: randomUUID(),
      entityId: f.saved.entityId,
      baseRevisionId: f.saved.revisionId,
      action: 'save',
      document: { ...f.saved.item.document, title: 'Voz atualizada' },
    })
    if (changed.status !== 'applied') throw new Error('Direção não gravada')
    const updatedInput = { ...f.request, revisionId: changed.revisionId }
    expect((await execution.context(owner, updatedInput)).context.memory).toHaveLength(0)
    await workspace.apply(owner, {
      schemaVersion: 1,
      projectId: f.projectId,
      operationId: randomUUID(),
      entityId,
      baseRevisionId: first.revisionId,
      action: 'save',
      document: {
        ...document,
        body: 'Resumo revisado.',
        basis: [{ entityId: changed.entityId, revisionId: changed.revisionId }],
      },
    })
    expect((await execution.context(owner, updatedInput)).context.memory[0]?.document.title).toBe(
      'Resumo da voz',
    )
    expect(await workspace.history(owner, f.projectId, entityId)).toHaveLength(2)
  })
  const success = {
    status: 'succeeded' as const,
    text: 'Texto revisado',
    assetIds: [],
    mode: 'chatgpt',
    durationMs: 1000,
    inputTokens: null,
    outputTokens: null,
  }
  async function editorialFixture(
    intent: 'adjust' | 'alternatives' | 'adapt' = 'adjust',
    twoComponents = false,
    capability: ContextRequest['capability'] = 'copy',
    withFinal = false,
    artRecipeId?: ArtRecipeId,
  ) {
    const projectId = randomUUID()
    await workspace.create(owner, {
      schemaVersion: 1,
      id: projectId,
      operationId: randomUUID(),
      name: 'Edição por IA',
      product: 'Sistema Zero',
    })
    const batch = createPieceBatch({
      projectId,
      title: 'Story',
      brief: 'Mostrar o jogo sem prometer resultados',
      format: 'story',
      medium: 'image',
    })
    const componentChange = batch.changes.find((change) => change.document?.kind === 'component')
    if (componentChange?.document?.kind !== 'component') throw new Error('Componente ausente')
    componentChange.document.body = 'Ela disse: "Eu criei." Conheça a atividade.'
    componentChange.document.protectedText = ['Eu criei.']
    if (capability === 'video-adapt' && !withFinal)
      componentChange.document.composition = { ...defaultArt.composition, height: 1920 }
    if (withFinal) {
      const manifest: AssetManifest = {
        schemaVersion: 1,
        id: randomUUID(),
        projectId,
        name: 'story-original.png',
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
      // Persistence fixture only: this suite verifies editorial identity, not object storage.
      await connection.db.insert(editorialAssets).values({
        id: manifest.id,
        projectId,
        manifest,
        storageKey: `review/${manifest.id}`,
        confirmed: true,
        createdBy: owner.userId,
      })
      componentChange.document.assetIds = [manifest.id]
    }
    if (twoComponents) {
      const id = randomUUID(),
        representation = batch.changes.find((change) => change.document?.kind === 'representation')
      if (representation?.document?.kind !== 'representation') throw new Error('Formato ausente')
      representation.document.componentIds.push(id)
      batch.changes.push({
        entityId: id,
        baseRevisionId: null,
        action: 'save',
        document: {
          ...componentChange.document,
          title: 'Segundo slide',
          body: 'Outro slide',
          protectedText: [],
        },
      })
    }
    const saved = await workspace.applyBatch(owner, batch)
    if (saved.status !== 'applied') throw new Error('Fixture não gravada')
    const component = saved.items.find((item) => item.kind === 'component'),
      piece = saved.items.find((item) => item.kind === 'piece')
    if (!component || !piece) throw new Error('Peça incompleta')
    const input: ContextRequest = {
      schemaVersion: 1,
      projectId,
      entityId: component.id,
      revisionId: component.revisionId,
      intent,
      capability,
      ...(artRecipeId ? { artRecipeId } : {}),
      provider: 'codex',
      instruction: 'Melhore a abertura e preserve a fala',
      selection: [],
      protectedIds: [],
      limits: {
        timeoutMs: 360000,
        maxCalls: 1,
        maxVariants: intent === 'alternatives' ? 3 : 1,
        maxRepairs: 0,
      },
    }
    const context = await execution.context(owner, input)
    const run = await execution.create(owner, {
      ...input,
      id: randomUUID(),
      operationId: randomUUID(),
      contextHash: context.hash,
    })
    const claimed = await execution.claim(computerA, projectId, run.request.id, {
      operationId: randomUUID(),
      expectedEpoch: 0,
    })
    const claim = attempt(claimed)
    const proposal = (value: string): EditorialProposal => ({
      schemaVersion: 1,
      kind: 'copy',
      summary: 'Abertura revisada',
      variants: [{ label: 'Direta', changes: [{ entityId: component.id, field: 'body', value }] }],
    })
    const finish = async (editorial: EditorialProposal) => {
      const request = {
        operationId: randomUUID(),
        attemptId: claim.id,
        epoch: claim.epoch,
        outcome: { ...success, editorial },
      }
      return { run: await execution.finish(computerA, projectId, run.request.id, request), request }
    }
    return { projectId, component, piece, run, claimed, proposal, finish }
  }
  test('imagem vira vídeo no mesmo lugar da sequência, conserva a outra peça, compartilha histórico e permite desfazer', async () => {
    for (const raster of [false, true]) {
      const f = await editorialFixture('adapt', true, 'video-adapt', raster)
      const before = await workspace.snapshot(owner, f.projectId)
      const representation = before.items.find((item) => item.kind === 'representation')
      const other = before.items.find(
        (item) => item.kind === 'component' && item.id !== f.component.id,
      )
      if (representation?.document.kind !== 'representation' || !other)
        throw new Error('Sequência ausente')
      const timeline = await videoAdaptationSeed(f.run.context.source, f.run.context.assets ?? [])
      timeline.durationInFrames = 90
      if (!timeline.clips[0]) throw new Error('Cena ausente')
      timeline.clips[0].durationInFrames = 90
      timeline.clips[0].effect = 'slide'
      const completed = await execution.finish(computerA, f.projectId, f.run.request.id, {
        operationId: randomUUID(),
        attemptId: attempt(f.claimed).id,
        epoch: f.claimed.epoch,
        outcome: {
          ...success,
          video: {
            schemaVersion: 1,
            kind: 'video',
            summary: 'Animação',
            variants: [
              { label: 'Story animado', videoId: f.component.id, timeline, finalAssetId: null },
            ],
          },
        },
      })
      expect(completed.application?.error).toBeNull()
      expect(completed.application?.result?.status).toBe('applied')
      const snapshot = await workspace.snapshot(owner, f.projectId)
      const video = snapshot.items.find((item) => item.kind === 'video')
      if (video?.document.kind !== 'video') throw new Error('Vídeo ausente')
      expect(video.document).toMatchObject({ sourceRevisionId: f.component.revisionId, timeline })
      expect(snapshot.items.find((item) => item.id === f.component.id)?.archived).toBe(true)
      expect(snapshot.items.find((item) => item.id === other.id)).toEqual(other)
      expect(snapshot.items.find((item) => item.id === representation.id)?.document).toMatchObject({
        medium: 'mixed',
        componentIds: representation.document.componentIds.map((id) =>
          id === f.component.id ? video.id : id,
        ),
      })
      expect(
        (await execution.list(owner, f.projectId, { entityId: video.id })).items.map(
          (item) => item.request.id,
        ),
      ).toContain(f.run.request.id)
      expect(
        (await execution.undo(owner, f.projectId, f.run.request.id)).application?.undo?.status,
      ).toBe('applied')
      const restored = await workspace.snapshot(owner, f.projectId)
      expect(restored.items.find((item) => item.id === f.component.id)?.document).toEqual(
        f.component.document,
      )
      expect(restored.items.find((item) => item.id === f.component.id)?.archived).toBe(false)
      expect(restored.items.find((item) => item.id === representation.id)?.document).toEqual(
        representation.document,
      )
      expect(restored.items.find((item) => item.id === video.id)?.archived).toBe(true)
    }
  })
  test('adaptação atrasada não substitui sequência editada nem aceita adulterar a copy da arte', async () => {
    for (const invalidCopy of [false, true]) {
      const f = await editorialFixture('adapt', true, 'video-adapt')
      const representation = f.run.context.ancestors.find(
        (item) => item.document.kind === 'representation',
      )
      if (!representation) throw new Error('Formato ausente')
      const timeline = await videoAdaptationSeed(f.run.context.source, f.run.context.assets ?? [])
      if (invalidCopy) {
        if (!timeline.clips[0]?.art) throw new Error('Arte ausente')
        timeline.clips[0].art.body += ' Uma promessa inventada.'
      } else {
        await workspace.apply(owner, {
          schemaVersion: 1,
          projectId: f.projectId,
          operationId: randomUUID(),
          entityId: representation.entityId,
          baseRevisionId: representation.id,
          action: 'save',
          document: { ...representation.document, title: 'Outra pessoa revisou' },
        })
      }
      const completed = await execution.finish(computerA, f.projectId, f.run.request.id, {
        operationId: randomUUID(),
        attemptId: attempt(f.claimed).id,
        epoch: f.claimed.epoch,
        outcome: {
          ...success,
          video: {
            schemaVersion: 1,
            kind: 'video',
            summary: 'Animação',
            variants: [{ label: 'Story', videoId: f.component.id, timeline, finalAssetId: null }],
          },
        },
      })
      if (invalidCopy) expect(completed.application?.error?.code).toBe('INVALID_RESULT')
      else expect(completed.application?.result?.status).toBe('conflict')
      const snapshot = await workspace.snapshot(owner, f.projectId)
      expect(snapshot.items.some((item) => item.kind === 'video')).toBe(false)
      expect(snapshot.items.find((item) => item.id === f.component.id)?.archived).toBe(false)
    }
  })
  test('copy nova invalida final, mantém original como referência e desfazer recupera a edição exata', async () => {
    const f = await editorialFixture('adjust', false, 'copy', true)
    if (f.component.document.kind !== 'component') throw new Error('Componente ausente')
    expect(f.run.context.assets).toHaveLength(1)
    expect(f.run.context.assets?.[0]).toMatchObject({
      id: f.component.document.assetIds[0],
      name: 'story-original.png',
      mime: 'image/png',
      width: 1080,
    })
    const finished = await f.finish(f.proposal('"Eu criei." Veja a atividade.'))
    expect(finished.run.application?.result?.status).toBe('applied')
    const updated = (await workspace.snapshot(owner, f.projectId)).items.find(
      (item) => item.id === f.component.id,
    )
    expect(updated?.document).toMatchObject({
      assetIds: [],
      referenceAssetIds: f.component.document.assetIds,
    })
    expect(
      (await execution.undo(owner, f.projectId, f.run.request.id)).application?.undo?.status,
    ).toBe('applied')
    const restored = (await workspace.snapshot(owner, f.projectId)).items.find(
      (item) => item.id === f.component.id,
    )
    expect(restored?.document).toEqual(f.component.document)
    if (!restored) throw new Error('Componente não restaurado')
    const stale = {
      schemaVersion: 1,
      operationId: randomUUID(),
      projectId: f.projectId,
      entityId: restored.id,
      baseRevisionId: restored.revisionId,
      action: 'save',
      document: { ...restored.document, body: '"Eu criei." Copy diferente.' },
    }
    await rejects(() => workspace.apply(owner, stale), /arte final/)
    await rejects(
      () =>
        workspace.applyBatch(owner, {
          schemaVersion: 1,
          operationId: randomUUID(),
          projectId: f.projectId,
          changes: [
            {
              entityId: stale.entityId,
              baseRevisionId: stale.baseRevisionId,
              action: 'save',
              document: stale.document,
            },
          ],
        }),
      /arte final/,
    )
    expect(
      (await workspace.snapshot(owner, f.projectId)).items.find(
        (item) => item.id === f.component.id,
      )?.revisionId,
    ).toBe(restored.revisionId)
  })
  test('receita autoriza somente seus rótulos, exige escolha explícita e protege a identificação depois de aplicada', async () => {
    for (const selected of [true, false]) {
      const f = await editorialFixture(
        'adjust',
        false,
        'layout',
        false,
        selected ? 'cdc-cover-v1' : undefined,
      )
      if (f.component.document.kind !== 'component') throw new Error('Componente ausente')
      const composition = editorialRecipe('cdc-cover-v1', {
        body: f.component.document.body,
        format: 'story',
        imageAssetIds: [],
      })
      const result = await execution.finish(computerA, f.projectId, f.run.request.id, {
        operationId: randomUUID(),
        attemptId: attempt(f.claimed).id,
        epoch: f.claimed.epoch,
        outcome: {
          ...success,
          art: {
            schemaVersion: 1,
            kind: 'art',
            summary: 'Receita do acervo',
            variants: [
              {
                label: 'Abertura',
                componentId: f.component.id,
                composition,
                finalAssetId: null,
                alt: '',
              },
            ],
          },
        },
      })
      if (selected) {
        expect(result.application?.result?.status).toBe('applied')
        expect(
          (await execution.undo(owner, f.projectId, f.run.request.id)).application?.undo?.status,
        ).toBe('applied')
      } else {
        expect(result.application?.result).toBeNull()
        expect(result.application?.error?.code).toBe('INVALID_RESULT')
      }
    }
  })
  test('montagem vinculada aplica e desfaz sem alterar copy; resultado visual não cabe em pedido de copy', async () => {
    const f = await editorialFixture('adjust', false, 'layout')
    const art = {
      schemaVersion: 1,
      kind: 'art',
      summary: 'Texto legível',
      variants: [
        {
          label: 'Montagem',
          componentId: f.component.id,
          composition: defaultArt.composition,
          finalAssetId: null,
          alt: 'Atividade',
        },
      ],
    }
    const completed = await execution.finish(computerA, f.projectId, f.run.request.id, {
      operationId: randomUUID(),
      attemptId: attempt(f.claimed).id,
      epoch: f.claimed.epoch,
      outcome: { ...success, art },
    })
    expect(completed.application?.result?.status).toBe('applied')
    const changed = (await workspace.snapshot(owner, f.projectId)).items.find(
      (item) => item.id === f.component.id,
    )
    expect(changed?.document).toMatchObject({
      ...f.component.document,
      composition: defaultArt.composition,
    })
    expect(
      (await execution.undo(owner, f.projectId, f.run.request.id)).application?.undo?.status,
    ).toBe('applied')
    const copy = await editorialFixture()
    await rejects(
      () =>
        execution.finish(computerA, copy.projectId, copy.run.request.id, {
          operationId: randomUUID(),
          attemptId: attempt(copy.claimed).id,
          epoch: copy.claimed.epoch,
          outcome: {
            ...success,
            art: { ...art, variants: [{ ...art.variants[0], componentId: copy.component.id }] },
          },
        }),
      /não autorizado/,
    )
  })
  test('montagem não omite parágrafos, introduz alegações literais ou usa asset fora do contexto', async () => {
    for (const mode of ['omission', 'literal', 'asset']) {
      const f = await editorialFixture('adjust', false, 'layout'),
        composition = structuredClone(defaultArt.composition)
      const text = composition.layers[0]
      if (text?.kind !== 'text') throw new Error('Receita sem texto')
      if (mode === 'omission') text.source = 'title'
      if (mode === 'literal') {
        text.source = 'literal'
        text.text = 'Resultado garantido'
      }
      if (mode === 'asset')
        composition.layers.push({
          id: randomUUID(),
          kind: 'image',
          assetId: randomUUID(),
          fit: 'contain',
          radius: 0,
          frame: { x: 0, y: 0, width: 100, height: 100 },
          protected: false,
          opacity: 1,
        })
      const completed = await execution.finish(computerA, f.projectId, f.run.request.id, {
        operationId: randomUUID(),
        attemptId: attempt(f.claimed).id,
        epoch: f.claimed.epoch,
        outcome: {
          ...success,
          art: {
            schemaVersion: 1,
            kind: 'art',
            summary: 'Montagem inválida',
            variants: [
              {
                label: 'Proposta',
                componentId: f.component.id,
                composition,
                finalAssetId: null,
                alt: '',
              },
            ],
          },
        },
      })
      expect(completed.application?.result).toBeNull()
      expect(completed.application?.error).not.toBeNull()
      expect(
        (await workspace.snapshot(owner, f.projectId)).items.find(
          (item) => item.id === f.component.id,
        )?.document,
      ).toEqual(f.component.document)
    }
  })
  test('duas revisões de slides distintos preservam ambas as mudanças', async () => {
    const f = await editorialFixture('adjust', true),
      snapshot = await workspace.snapshot(owner, f.projectId),
      second = snapshot.items.find(
        (item) => item.kind === 'component' && item.id !== f.component.id,
      )
    if (!second) throw new Error('Segundo slide ausente')
    const input = {
      ...f.run.request,
      id: randomUUID(),
      operationId: randomUUID(),
      entityId: second.id,
      revisionId: second.revisionId,
    }
    const context = await execution.context(owner, contextRequestSchema.strip().parse(input)),
      run = await execution.create(owner, { ...input, contextHash: context.hash }),
      claimed = await execution.claim(computerB, f.projectId, run.request.id, {
        operationId: randomUUID(),
        expectedEpoch: 0,
      })
    await f.finish(f.proposal('"Eu criei." Slide um.'))
    const completed = await execution.finish(computerB, f.projectId, run.request.id, {
      operationId: randomUUID(),
      attemptId: attempt(claimed).id,
      epoch: claimed.epoch,
      outcome: {
        ...success,
        editorial: {
          schemaVersion: 1,
          kind: 'copy',
          summary: 'Segundo slide',
          variants: [
            {
              label: 'Ajuste',
              changes: [{ entityId: second.id, field: 'body', value: 'Slide dois atualizado.' }],
            },
          ],
        },
      },
    })
    expect(completed.application?.result?.status).toBe('applied')
    const after = await workspace.snapshot(owner, f.projectId)
    expect(after.items.find((item) => item.id === f.component.id)?.document).toMatchObject({
      body: '"Eu criei." Slide um.',
    })
    expect(after.items.find((item) => item.id === second.id)?.document).toMatchObject({
      body: 'Slide dois atualizado.',
    })
  })
  test('ajuste e resultado são atômicos, replay não duplica e desfazer conserva histórico', async () => {
    const f = await editorialFixture(),
      completed = await f.finish(f.proposal('"Eu criei." Descubra a atividade.'))
    expect(completed.run.application?.result?.status).toBe('applied')
    const before = await workspace.snapshot(owner, f.projectId)
    expect(before.items.find((item) => item.id === f.component.id)?.document).toMatchObject({
      body: '"Eu criei." Descubra a atividade.',
    })
    await execution.finish(computerA, f.projectId, f.run.request.id, completed.request)
    expect((await workspace.snapshot(owner, f.projectId)).cursor).toBe(before.cursor)
    expect(
      (await execution.undo(owner, f.projectId, f.run.request.id)).application?.undo?.status,
    ).toBe('applied')
    expect(
      (await workspace.snapshot(owner, f.projectId)).items.find(
        (item) => item.id === f.component.id,
      )?.document,
    ).toEqual(f.component.document)
    expect(await workspace.history(owner, f.projectId, f.component.id)).toHaveLength(3)
  })
  test('alternativas aguardam escolha e duas escolhas concorrentes não substituem uma à outra', async () => {
    const f = await editorialFixture('alternatives'),
      proposal = f.proposal('"Eu criei." Opção A.')
    if (proposal.kind !== 'copy') throw new Error('Tipo inesperado')
    proposal.variants.push({
      label: 'B',
      changes: [{ entityId: f.component.id, field: 'body', value: '"Eu criei." Opção B.' }],
    })
    expect((await f.finish(proposal)).run.application).toBeNull()
    expect(await workspace.history(owner, f.projectId, f.component.id)).toHaveLength(1)
    const choices = await Promise.allSettled(
      [0, 1].map((variantIndex) =>
        execution.apply(owner, f.projectId, f.run.request.id, { variantIndex }),
      ),
    )
    expect(choices.filter((choice) => choice.status === 'fulfilled')).toHaveLength(1)
    expect(await workspace.history(owner, f.projectId, f.component.id)).toHaveLength(2)
  })
  test('resposta atrasada diante de novo briefing conserva proposta sem aplicar', async () => {
    const f = await editorialFixture()
    await workspace.apply(owner, {
      schemaVersion: 1,
      operationId: randomUUID(),
      projectId: f.projectId,
      entityId: f.piece.id,
      baseRevisionId: f.piece.revisionId,
      action: 'save',
      document: { ...f.piece.document, title: 'Outro objetivo' },
    })
    const result = await f.finish(f.proposal('"Eu criei." Nova abertura.'))
    expect(result.run.application?.result?.status).toBe('conflict')
    expect(await workspace.history(owner, f.projectId, f.component.id)).toHaveLength(1)
    expect(result.run.outcome?.status).toBe('succeeded')
  })
  test('violação de texto protegido permanece registrada e não altera rascunho', async () => {
    const f = await editorialFixture(),
      result = await f.finish(f.proposal('Uma fala inventada.'))
    expect(result.run.application?.error?.code).toBe('PROTECTED_CONTENT')
    expect(result.run.application?.result).toBeNull()
    expect(await workspace.history(owner, f.projectId, f.component.id)).toHaveLength(1)
  })
  test('adaptação cria formato derivado e desfazer arquiva só a derivação', async () => {
    const f = await editorialFixture('adapt')
    const result = await f.finish({
      schemaVersion: 1,
      kind: 'adapt',
      summary: 'Story em vídeo',
      variants: [
        {
          label: 'Vídeo',
          title: 'Story animado',
          format: 'story',
          medium: 'video',
          caption: '',
          cta: 'Conheça a atividade',
          alt: 'Atividade',
          components: [
            {
              title: 'Cena 1',
              componentType: 'scene',
              body: '"Eu criei." Conheça a atividade.',
              sourceComponentId: f.component.id,
            },
          ],
        },
      ],
    })
    expect(result.run.application?.result?.status).toBe('applied')
    const snapshot = await workspace.snapshot(owner, f.projectId)
    expect(
      snapshot.items.filter((item) => item.kind === 'representation' && !item.archived),
    ).toHaveLength(2)
    expect(snapshot.items.find((item) => item.id === f.component.id)?.revisionId).toBe(
      f.component.revisionId,
    )
    expect(
      (await execution.undo(owner, f.projectId, f.run.request.id)).application?.undo?.status,
    ).toBe('applied')
    expect(
      (await workspace.snapshot(owner, f.projectId)).items.filter(
        (item) => item.kind === 'representation' && !item.archived,
      ),
    ).toHaveLength(1)
  })
  test('histórico de pedidos pagina por componente sem perder datas iguais', async () => {
    const f = await editorialFixture()
    for (let index = 0; index < 21; index++)
      await execution.create(owner, {
        ...f.run.request,
        id: randomUUID(),
        operationId: randomUUID(),
      })
    await connection.db.execute(
      sql`update marketing.editorial_runs set created_at='2026-10-15 12:00:00.123456+00' where project_id=${f.projectId}`,
    )
    const first = await execution.list(owner, f.projectId, { entityId: f.component.id })
    expect(first.items).toHaveLength(20)
    expect(first.nextCursor).not.toBeNull()
    const second = await execution.list(owner, f.projectId, {
      entityId: f.component.id,
      before: first.nextCursor,
    })
    expect(second.items).toHaveLength(2)
    expect(new Set([...first.items, ...second.items].map((run) => run.request.id)).size).toBe(22)
    expect(
      (await execution.list(owner, f.projectId, { entityId: randomUUID() })).items,
    ).toHaveLength(0)
  }, 30000)
  test('adaptação não pode omitir a origem para remover uma citação protegida', async () => {
    const f = await editorialFixture('adapt')
    const result = await f.finish({
      schemaVersion: 1,
      kind: 'adapt',
      summary: 'Story',
      variants: [
        {
          label: 'Vídeo',
          title: 'Story',
          format: 'story',
          medium: 'video',
          caption: '',
          cta: '',
          alt: '',
          components: [
            {
              title: 'Cena',
              componentType: 'scene',
              body: 'Uma fala inventada',
              sourceComponentId: null,
            },
          ],
        },
      ],
    })
    expect(result.run.application?.error?.code).toBe('PROTECTED_CONTENT')
    expect(
      (await workspace.snapshot(owner, f.projectId)).items.filter(
        (item) => item.kind === 'representation',
      ),
    ).toHaveLength(1)
  })
  test('desfazer após edição de colega conserva a edição posterior e retorna conflito', async () => {
    const f = await editorialFixture()
    const applied = await f.finish(f.proposal('"Eu criei." Primeira revisão.'))
    const current = applied.run.application?.result
    if (current?.status !== 'applied') throw new Error('Não aplicado')
    const item = current.items.find((item) => item.id === f.component.id)
    if (item?.document.kind !== 'component') throw new Error('Componente ausente')
    const later = await workspace.apply(owner, {
      schemaVersion: 1,
      operationId: randomUUID(),
      projectId: f.projectId,
      entityId: item.id,
      baseRevisionId: item.revisionId,
      action: 'save',
      document: { ...item.document, body: '"Eu criei." Revisão posterior.' },
    })
    expect(
      (await execution.undo(owner, f.projectId, f.run.request.id)).application?.undo?.status,
    ).toBe('conflict')
    if (later.status !== 'applied') throw new Error('Edição posterior não gravada')
    expect(
      (await workspace.snapshot(owner, f.projectId)).items.find((value) => value.id === item.id)
        ?.revisionId,
    ).toBe(later.revisionId)
  })
  test('web prepara, apenas desktop reivindica; dois computadores não executam juntos', async () => {
    const f = await fixture()
    await rejects(
      async () =>
        execution.claim(owner, f.projectId, f.run.request.id, {
          operationId: randomUUID(),
          expectedEpoch: 0,
        }),
      { code: 'DESKTOP_REQUIRED' },
    )
    const outcomes = await Promise.allSettled(
      [computerA, computerB].map((actor) =>
        execution.claim(actor, f.projectId, f.run.request.id, {
          operationId: randomUUID(),
          expectedEpoch: 0,
        }),
      ),
    )
    expect(outcomes.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(outcomes.filter((result) => result.status === 'rejected')).toHaveLength(1)
    expect((await execution.get(owner, f.projectId, f.run.request.id)).epoch).toBe(1)
    expect(await execution.create(owner, f.input)).toEqual(f.run)
  })
  test('passagem de tarefa exige a assinatura do destinatário, mantendo autoria do pedido', async () => {
    const f = await fixture(),
      colleague = { ...owner, userId: randomUUID(), desktopDeviceId: randomUUID() }
    await workspace.setMember(owner, f.projectId, {
      operationId: randomUUID(),
      userId: colleague.userId,
      permissions: ['read', 'edit', 'execute'],
    })
    const assigned = await execution.create(owner, {
      ...f.input,
      id: randomUUID(),
      operationId: randomUUID(),
      assignedTo: colleague.userId,
    })
    await rejects(
      () =>
        execution.claim(computerA, f.projectId, assigned.request.id, {
          operationId: randomUUID(),
          expectedEpoch: 0,
        }),
      { code: 'OBJECT_INACCESSIBLE' },
    )
    const claimed = await execution.claim(colleague, f.projectId, assigned.request.id, {
      operationId: randomUUID(),
      expectedEpoch: 0,
    })
    expect(claimed.createdBy).toBe(owner.userId)
    expect(claimed.attempt?.deviceId).toBe(colleague.desktopDeviceId)
    expect(
      (
        await execution.finish(colleague, f.projectId, claimed.request.id, {
          operationId: randomUUID(),
          attemptId: attempt(claimed).id,
          epoch: claimed.epoch,
          outcome: success,
        })
      ).state,
    ).toBe('succeeded')
  })
  test('concessão recusa conta inexistente ou inativa no serviço canônico', async () => {
    const f = await fixture(),
      strictWorkspace = new WorkspaceService(new DrizzleWorkspaceRepository(connection.db), {
        async lookup() {
          return []
        },
      })
    await rejects(
      () =>
        strictWorkspace.setMember(owner, f.projectId, {
          operationId: randomUUID(),
          userId: randomUUID(),
          permissions: ['read'],
        }),
      { code: 'VALIDATION_ERROR' },
    )
    expect((await workspace.team(owner, f.projectId)).map((member) => member.id)).toEqual([
      owner.userId,
    ])
  })
  test('expiração requer decisão explícita; tentativa antiga não confirma resultado tardio', async () => {
    const f = await fixture(),
      runId = f.run.request.id
    const first = await execution.claim(computerA, f.projectId, runId, {
      operationId: randomUUID(),
      expectedEpoch: 0,
    })
    await connection.sql`update marketing.editorial_attempts set lease_expires_at=now()-interval '1 second' where id=${attempt(first).id}`
    await rejects(
      () =>
        execution.claim(computerB, f.projectId, runId, {
          operationId: randomUUID(),
          expectedEpoch: 1,
          retry: false,
        }),
      { code: 'RETRY_REQUIRES_USER' },
    )
    const second = await execution.claim(computerB, f.projectId, runId, {
      operationId: randomUUID(),
      expectedEpoch: 1,
      retry: true,
    })
    await rejects(
      () =>
        execution.finish(computerA, f.projectId, runId, {
          operationId: randomUUID(),
          attemptId: attempt(first).id,
          epoch: 1,
          outcome: success,
        }),
      { code: 'LEASE_EXPIRED' },
    )
    const finish = {
      operationId: randomUUID(),
      attemptId: attempt(second).id,
      epoch: 2,
      outcome: success,
    }
    const completed = await execution.finish(computerB, f.projectId, runId, finish)
    expect(completed.state).toBe('succeeded')
    expect(await execution.finish(computerB, f.projectId, runId, finish)).toEqual(completed)
    await rejects(() => execution.finish(computerA, f.projectId, runId, finish), {
      code: 'OPERATION_REUSED',
    })
  })
  test('contexto congelado, cancelamento e permissão revogada bloqueiam nova gravação', async () => {
    const f = await fixture(),
      runId = f.run.request.id
    await workspace.apply(owner, {
      schemaVersion: 1,
      projectId: f.projectId,
      entityId: f.input.entityId,
      operationId: randomUUID(),
      baseRevisionId: f.saved.revisionId,
      action: 'save',
      document: { ...f.saved.item.document, title: 'Direção alterada' },
    })
    await rejects(
      () =>
        execution.claim(computerA, f.projectId, runId, {
          operationId: randomUUID(),
          expectedEpoch: 0,
        }),
      { code: 'CONTEXT_CHANGED' },
    )
    const g = await fixture(),
      claimed = await execution.claim(computerA, g.projectId, g.run.request.id, {
        operationId: randomUUID(),
        expectedEpoch: 0,
      })
    await execution.cancel(owner, g.projectId, g.run.request.id, { operationId: randomUUID() })
    await rejects(
      () =>
        execution.finish(computerA, g.projectId, g.run.request.id, {
          operationId: randomUUID(),
          attemptId: attempt(claimed).id,
          epoch: 1,
          outcome: success,
        }),
      { code: 'LEASE_EXPIRED' },
    )
    await workspace.setMember(owner, g.projectId, {
      operationId: randomUUID(),
      userId: owner.userId,
      permissions: ['read', 'edit', 'admin'],
    })
    await rejects(() => execution.create(owner, g.input), { code: 'OBJECT_INACCESSIBLE' })
  })
  test('resultado com mídia pendente não é anunciado como concluído', async () => {
    const f = await fixture(),
      run = await execution.claim(computerA, f.projectId, f.run.request.id, {
        operationId: randomUUID(),
        expectedEpoch: 0,
      })
    await rejects(
      () =>
        execution.finish(computerA, f.projectId, run.request.id, {
          operationId: randomUUID(),
          attemptId: attempt(run).id,
          epoch: 1,
          outcome: { ...success, assetIds: [randomUUID()] },
        }),
      { code: 'ASSET_UNCONFIRMED' },
    )
    expect((await execution.get(owner, f.projectId, run.request.id)).state).toBe('running')
  })
  test('vídeo: transcrição, leitura por colega, conflito, desfazer e render fixado à revisão', async () => {
    const projectId = randomUUID(),
      sourceId = randomUUID(),
      colleague: Actor = { ...owner, userId: randomUUID(), displayName: 'Outra editora' }
    await workspace.create(owner, {
      schemaVersion: 1,
      id: projectId,
      operationId: randomUUID(),
      name: 'Vídeo colaborativo',
      product: 'Sistema Zero',
    })
    await workspace.setMember(owner, projectId, {
      operationId: randomUUID(),
      userId: colleague.userId,
      permissions: ['read', 'edit'],
    })
    const manifest: AssetManifest = {
      schemaVersion: 1,
      id: sourceId,
      projectId,
      name: 'Gravação web.mp4',
      sha256: 'a'.repeat(64),
      size: 10000,
      mime: 'video/mp4',
      role: 'original',
      sourceAssetId: null,
      width: null,
      height: null,
      durationMs: null,
      codec: null,
      rotation: null,
    }
    // Confirmed storage fixture; this test proves transactions and permissions, not R2 transfer.
    await connection.db.insert(editorialAssets).values({
      id: sourceId,
      projectId,
      manifest,
      storageKey: `review/${sourceId}`,
      confirmed: true,
      createdBy: owner.userId,
    })
    const batch = createPieceBatch({
      projectId,
      title: 'Gravação',
      brief: 'Mostrar criação',
      format: 'story',
      medium: 'video',
    })
    const change = batch.changes.find((change) => change.document?.kind === 'video')
    if (change?.document?.kind !== 'video') throw new Error('Vídeo ausente')
    const fixedCaption = {
      id: randomUUID(),
      assetId: sourceId,
      startMs: 0,
      endMs: 1000,
      text: 'Eu criei.',
      corrected: true,
    }
    change.document.timeline = videoSchema.parse({
      ...change.document.timeline,
      durationInFrames: 180,
      clips: [
        {
          id: randomUUID(),
          trackId: change.document.timeline.tracks[0]?.id,
          assetId: sourceId,
          kind: 'video',
          startFrame: 0,
          durationInFrames: 180,
        },
      ],
      captions: [fixedCaption],
    })
    change.document.referenceAssetIds = [sourceId]
    const saved = await workspace.applyBatch(owner, batch)
    if (saved.status !== 'applied') throw new Error('Vídeo não salvo')
    const videoId = change.entityId
    const current = async () => {
      const item = (await workspace.snapshot(owner, projectId)).items.find(
        (item) => item.id === videoId,
      )
      if (item?.document.kind !== 'video') throw new Error('Vídeo indisponível')
      return { ...item, document: item.document }
    }
    const start = async (capability: 'video-edit' | 'transcribe' | 'render' | 'prepare-media') => {
      const item = await current()
      const input = contextRequestSchema.parse({
        schemaVersion: 1,
        projectId,
        entityId: item.id,
        revisionId: item.revisionId,
        intent: 'adjust',
        capability,
        provider: 'codex',
        ...(['transcribe', 'prepare-media'].includes(capability)
          ? { sourceAssetId: sourceId }
          : {}),
        instruction: 'Pedido de verificação',
        selection: [],
        protectedIds: [],
        limits: {},
      })
      const frozen = await execution.context(owner, input)
      const created = await execution.create(owner, {
        ...input,
        id: randomUUID(),
        operationId: randomUUID(),
        contextHash: frozen.hash,
      })
      return execution.claim(computerA, projectId, created.request.id, {
        operationId: randomUUID(),
        expectedEpoch: 0,
      })
    }
    const inspection = {
      version: 'ffmpeg-remotion-4.0.535-v1' as const,
      assetId: sourceId,
      sha256: manifest.sha256,
      metadata: {
        width: 1080,
        height: 1920,
        durationMs: 6000,
        codec: 'h264',
        rotation: 0,
        hasAudio: true,
      },
      silence: [],
      samples: [],
    }
    const finish = (run: ExecutionRun, timeline: ReturnType<typeof videoSchema.parse>) =>
      execution.finish(computerA, projectId, run.request.id, {
        operationId: randomUUID(),
        attemptId: attempt(run).id,
        epoch: run.epoch,
        outcome: {
          ...success,
          recordingAnalysis: [inspection],
          video: {
            schemaVersion: 1,
            kind: 'video',
            summary: 'Revisão',
            variants: [{ label: 'Revisão', videoId, timeline, finalAssetId: null }],
          },
        },
      })
    const transcribe = await start('transcribe'),
      initial = await current()
    const captions = [
      ...initial.document.timeline.captions,
      {
        id: randomUUID(),
        assetId: sourceId,
        startMs: 2000,
        endMs: 3000,
        text: 'Veja o jogo.',
        corrected: false,
      },
    ]
    const transcribed = await finish(transcribe, { ...initial.document.timeline, captions })
    expect(transcribed.application?.result?.status).toBe('applied')
    const shared = (await workspace.snapshot(colleague, projectId)).items.find(
      (item) => item.id === videoId,
    )
    expect(shared?.document.kind === 'video' && shared.document.timeline.captions).toEqual(captions)
    expect((await current()).document.timeline.captions[0]).toEqual(fixedCaption)
    const editing = await start('video-edit'),
      beforeConflict = await current()
    await workspace.apply(colleague, {
      schemaVersion: 1,
      operationId: randomUUID(),
      projectId,
      entityId: videoId,
      baseRevisionId: beforeConflict.revisionId,
      action: 'save',
      document: { ...beforeConflict.document, title: 'Título revisto pela colega' },
    })
    const conflicted = await finish(editing, beforeConflict.document.timeline)
    expect(conflicted.application?.result?.status).toBe('conflict')
    expect((await current()).document.title).toBe('Título revisto pela colega')
    const adjustment = await start('video-edit'),
      before = await current()
    const edited = await finish(adjustment, {
      ...before.document.timeline,
      durationInFrames: 150,
      clips: before.document.timeline.clips.map((clip) => ({ ...clip, durationInFrames: 150 })),
    })
    expect(edited.application?.result?.status).toBe('applied')
    expect(
      (await execution.undo(owner, projectId, adjustment.request.id)).application?.undo?.status,
    ).toBe('applied')
    expect((await current()).document).toEqual(before.document)
    const rendering = await start('render'),
      finalId = randomUUID(),
      outputSha = 'b'.repeat(64),
      rendered = await current()
    const final: AssetManifest = {
      ...manifest,
      id: finalId,
      name: 'final.mp4',
      sha256: outputSha,
      role: 'final',
      width: 1080,
      height: 1920,
      durationMs: 6000,
      codec: 'h264',
      rotation: 0,
    }
    await connection.db.insert(editorialAssets).values({
      id: finalId,
      projectId,
      manifest: final,
      storageKey: `review/${finalId}`,
      confirmed: true,
      createdBy: owner.userId,
    })
    const completed = await execution.finish(computerA, projectId, rendering.request.id, {
      operationId: randomUUID(),
      attemptId: attempt(rendering).id,
      epoch: rendering.epoch,
      outcome: {
        ...success,
        assetIds: [finalId],
        recordingAnalysis: [inspection],
        render: {
          schemaVersion: 1,
          sourceRevisionId: rendering.context.source.id,
          inputSha256: await renderInputHash(
            rendering.context.source,
            rendering.context.assets ?? [],
          ),
          outputAssetId: finalId,
          outputSha256: outputSha,
          engine: {
            name: 'remotion',
            version: '4.0.535',
            bundleSha256: 'c'.repeat(64),
            workerSha256: 'd'.repeat(64),
            platform: 'win32',
            architecture: 'x64',
          },
        },
        video: {
          schemaVersion: 1,
          kind: 'video',
          summary: 'Render',
          variants: [
            {
              label: 'Render',
              videoId,
              timeline: rendered.document.timeline,
              finalAssetId: finalId,
            },
          ],
        },
      },
    })
    expect(completed.application?.result?.status).toBe('applied')
    expect((await current()).document.assetIds).toEqual([finalId])
    expect(completed.context.assets?.find((asset) => asset.id === sourceId)?.durationMs).toBeNull()
    const preparing = await start('prepare-media'),
      prepared = await current(),
      proxyId = randomUUID(),
      thumbnailId = randomUUID()
    for (const derived of [
      { ...final, id: proxyId, role: 'proxy' as const, sourceAssetId: sourceId },
      {
        ...final,
        id: thumbnailId,
        role: 'thumbnail' as const,
        sourceAssetId: sourceId,
        mime: 'image/png' as const,
        codec: 'png',
        durationMs: null,
      },
    ])
      await connection.db.insert(editorialAssets).values({
        id: derived.id,
        projectId,
        manifest: derived,
        storageKey: `review/${derived.id}`,
        confirmed: true,
        createdBy: owner.userId,
      })
    const preparedResult = await execution.finish(computerA, projectId, preparing.request.id, {
      operationId: randomUUID(),
      attemptId: attempt(preparing).id,
      epoch: preparing.epoch,
      outcome: {
        ...success,
        assetIds: [proxyId, thumbnailId],
        mediaPreparation: {
          schemaVersion: 1,
          sourceAssetId: sourceId,
          sourceSha256: manifest.sha256,
          metadata: inspection.metadata,
          proxyAssetId: proxyId,
          thumbnailAssetId: thumbnailId,
          waveformAssetId: null,
        },
        video: {
          schemaVersion: 1,
          kind: 'video',
          summary: 'Prévia preparada',
          variants: [
            {
              label: 'Preparação',
              videoId,
              timeline: prepared.document.timeline,
              finalAssetId: null,
            },
          ],
        },
      },
    })
    expect(preparedResult.application?.result?.status).toBe('applied')
    const preparedByColleague = (await workspace.snapshot(colleague, projectId)).items.find(
      (item) => item.id === videoId,
    )
    expect(preparedByColleague?.document).toMatchObject({
      assetIds: [finalId],
      preparations: [
        { sourceAssetId: sourceId, proxyAssetId: proxyId, thumbnailAssetId: thumbnailId },
      ],
    })
    expect(
      (await execution.undo(owner, projectId, preparing.request.id)).application?.undo?.status,
    ).toBe('applied')
    expect((await current()).document).toEqual(prepared.document)
  })
})

import { fixtureDirectory } from './helpers/staff-directory'
