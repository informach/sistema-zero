import { expect, test } from 'bun:test'
import {
  assetManifestSchema,
  clipSchema,
  renderInputHash,
  runViewSchema,
  videoSchema,
} from '@sistemazero/marketing-contracts'
import { defaultArt } from '../../marketing-production/src/art-props'
import { artBatch } from '../src/domain/workspace/art-proposal'
import { assertArtifactFreshness } from '../src/domain/workspace/artifact-freshness'
import { validateRenderResult } from '../src/domain/workspace/render-result'
import { videoBatch } from '../src/domain/workspace/video-proposal'
import {
  validateOutcomeCapability,
  validateVisualRequest,
} from '../src/domain/workspace/visual-request'

function fixture() {
  const id = () => crypto.randomUUID(),
    projectId = id(),
    entityId = id(),
    revisionId = id(),
    actor = id(),
    assetId = id(),
    trackId = id()
  const timeline = videoSchema.parse({
    schemaVersion: 1,
    recipeVersion: 'marketing-timeline-v1',
    width: 1080,
    height: 1920,
    fps: { numerator: 30000, denominator: 1001 },
    durationInFrames: 120,
    tracks: [{ id: trackId, kind: 'visual' }],
    clips: [
      {
        id: id(),
        trackId,
        assetId,
        kind: 'video',
        startFrame: 0,
        durationInFrames: 100,
        sourceStartMs: 1000,
        protected: true,
      },
    ],
    captions: [
      { id: id(), assetId, startMs: 1200, endMs: 1800, text: 'É o meu jogo.', corrected: true },
    ],
    background: '#172a46',
    accent: '#ffdb56',
  })
  return runViewSchema.parse({
    request: {
      schemaVersion: 1,
      operationId: id(),
      id: id(),
      projectId,
      entityId,
      revisionId,
      intent: 'adjust',
      capability: 'video-edit',
      provider: 'codex',
      instruction: 'Encurte o final sem mudar a fala',
      selection: [],
      protectedIds: [],
      contextHash: 'a'.repeat(64),
      limits: {},
    },
    context: {
      schemaVersion: 1,
      source: {
        id: revisionId,
        projectId,
        entityId,
        parentRevisionId: null,
        createdBy: actor,
        createdAt: new Date().toISOString(),
        document: {
          schemaVersion: 1,
          kind: 'video',
          title: 'Gravação',
          representationId: id(),
          timeline,
        },
      },
      selected: [],
      directions: [],
      evidence: [],
      protectedIds: [],
      assets: [
        assetManifestSchema.parse({
          schemaVersion: 1,
          id: assetId,
          projectId,
          name: 'original.mp4',
          sha256: 'b'.repeat(64),
          size: 1000,
          mime: 'video/mp4',
          role: 'original',
          sourceAssetId: null,
          width: 1080,
          height: 1920,
          durationMs: 5000,
          codec: 'h264',
          rotation: 0,
        }),
      ],
    },
    state: 'succeeded',
    epoch: 1,
    createdBy: actor,
    createdAt: new Date().toISOString(),
    attempt: null,
    leaseExpired: false,
    outcome: {
      status: 'succeeded',
      text: 'Fim ajustado',
      assetIds: [],
      mode: 'teste de domínio',
      durationMs: 1,
      inputTokens: null,
      outputTokens: null,
      video: {
        schemaVersion: 1,
        kind: 'video',
        summary: 'Fim ajustado',
        variants: [
          {
            label: 'Ajuste',
            videoId: entityId,
            timeline: { ...timeline, durationInFrames: 110 },
            finalAssetId: null,
          },
        ],
      },
    },
  })
}
test('edição preserva originais, fala protegida e legenda corrigida; rejeita mídia e tempos inválidos', async () => {
  const run = fixture(),
    before = structuredClone(run),
    batch = await videoBatch(run, 0)
  expect(batch.changes[0]?.baseRevisionId).toBe(run.context.source.id)
  expect(batch.changes[0]?.document?.kind).toBe('video')
  expect(run).toEqual(before)
  for (const change of ['clip', 'track', 'caption', 'file', 'interval', 'final'] as const) {
    const altered = structuredClone(run)
    if (altered.outcome?.status !== 'succeeded' || !altered.outcome.video)
      throw new Error('Resultado ausente')
    const variant = altered.outcome.video.variants[0]
    if (!variant?.timeline.clips[0] || !variant.timeline.captions[0] || !variant.timeline.tracks[0])
      throw new Error('Montagem ausente')
    if (change === 'clip') variant.timeline.clips[0].volume = 0
    if (change === 'track') variant.timeline.tracks[0].muted = true
    if (change === 'caption') variant.timeline.captions[0].text = 'Fala inventada'
    if (change === 'file')
      variant.timeline.captions.push({
        ...variant.timeline.captions[0],
        id: crypto.randomUUID(),
        assetId: crypto.randomUUID(),
        corrected: false,
      })
    if (change === 'interval')
      variant.timeline.clips.push({
        ...variant.timeline.clips[0],
        id: crypto.randomUUID(),
        protected: false,
        sourceStartMs: 4500,
      })
    if (change === 'final') variant.finalAssetId = crypto.randomUUID()
    await expect(videoBatch(altered, 0)).rejects.toThrow()
  }
  const source = run.context.source.document
  if (source.kind !== 'video') throw new Error('Vídeo ausente')
  const finalId = crypto.randomUUID()
  expect(() =>
    assertArtifactFreshness(
      { ...source, assetIds: [finalId] },
      { ...source, assetIds: [finalId], timeline: { ...source.timeline, durationInFrames: 110 } },
    ),
  ).toThrow('montagem mudou')
})

test('pedido de texto ou efeito não muda outras cenas nem a geometria e copy protegidas da arte', async () => {
  const run = fixture()
  if (
    run.context.source.document.kind !== 'video' ||
    run.outcome?.status !== 'succeeded' ||
    !run.outcome.video?.variants[0]
  )
    throw new Error('Fixture inválida')
  const original = run.context.source.document.timeline
  const overlayTrack = crypto.randomUUID(),
    overlayId = crypto.randomUUID()
  original.tracks.push({ id: overlayTrack, kind: 'visual', muted: false })
  original.clips.push(
    clipSchema.parse({
      id: overlayId,
      trackId: overlayTrack,
      kind: 'text',
      text: 'Conheça a atividade',
      startFrame: 100,
      durationInFrames: 20,
      effect: 'cta',
      position: 'bottom',
    }),
  )
  run.request.videoTarget = { clipId: overlayId, part: 'text' }
  const variant = run.outcome.video.variants[0]
  variant.timeline = structuredClone(original)
  const overlay = variant.timeline.clips.find((clip) => clip.id === overlayId)
  if (!overlay) throw new Error('CTA ausente')
  overlay.text = 'Crie seu primeiro jogo'
  await videoBatch(run, 0)
  overlay.effect = 'fade'
  await expect(videoBatch(run, 0)).rejects.toThrow('mais que')
  overlay.effect = 'cta'
  variant.timeline.background = '#ffffff'
  await expect(videoBatch(run, 0)).rejects.toThrow('só permite')
  variant.timeline = structuredClone(original)
  run.request.videoTarget = undefined
  const art = clipSchema.parse({
    id: crypto.randomUUID(),
    trackId: overlayTrack,
    kind: 'art',
    startFrame: 0,
    durationInFrames: 80,
    art: {
      composition: {
        ...defaultArt.composition,
        layers: defaultArt.composition.layers.map((layer) => ({ ...layer, protected: true })),
      },
      title: 'Arte',
      body: 'Fala original',
      protectedText: [],
      sourceRevisionId: crypto.randomUUID(),
    },
  })
  original.clips.push(art)
  variant.timeline.clips.push(structuredClone(art))
  await videoBatch(run, 0)
  const embedded = variant.timeline.clips.find((clip) => clip.id === art.id)?.art
  if (!embedded) throw new Error('Arte ausente')
  embedded.body = 'Fala adulterada'
  await expect(videoBatch(run, 0)).rejects.toThrow('camada protegida')
  embedded.body = 'Fala original'
  embedded.composition.height += 20
  await expect(videoBatch(run, 0)).rejects.toThrow('camada protegida')
})

test('render de vídeo exige revisão, mídia confirmada e identidade exatas; pedidos recusam opções de outro fluxo', async () => {
  const run = fixture()
  if (
    run.outcome?.status !== 'succeeded' ||
    !run.outcome.video ||
    run.context.source.document.kind !== 'video'
  )
    throw new Error('Fixture inválida')
  run.request.capability = 'render'
  expect(() => validateVisualRequest(run.request, run.context)).not.toThrow()
  expect(() => validateVisualRequest({ ...run.request, imageFormat: 'jpeg' }, run.context)).toThrow(
    'formato de imagem',
  )
  const source = run.context.source.document,
    finalId = crypto.randomUUID(),
    sha256 = 'c'.repeat(64)
  const variant = run.outcome.video.variants[0]
  if (!variant) throw new Error('Variante ausente')
  variant.timeline = structuredClone(source.timeline)
  variant.finalAssetId = finalId
  run.outcome.assetIds = [finalId]
  expect(() => validateOutcomeCapability(run.request, run.outcome!)).toThrow('identificar')
  run.outcome.render = {
    schemaVersion: 1,
    sourceRevisionId: run.context.source.id,
    inputSha256: await renderInputHash(run.context.source, run.context.assets ?? []),
    outputAssetId: finalId,
    outputSha256: sha256,
    engine: {
      name: 'remotion',
      version: '4.0.535',
      bundleSha256: 'd'.repeat(64),
      workerSha256: 'e'.repeat(64),
      platform: 'win32',
      architecture: 'x64',
    },
  }
  const final = assetManifestSchema.parse({
    schemaVersion: 1,
    id: finalId,
    projectId: run.request.projectId,
    name: 'final.mp4',
    sha256,
    size: 1000,
    mime: 'video/mp4',
    role: 'final',
    sourceAssetId: null,
    width: 1080,
    height: 1920,
    durationMs: 4004,
    codec: 'h264',
    rotation: 0,
  })
  expect(() => validateOutcomeCapability(run.request, run.outcome!)).not.toThrow()
  await validateRenderResult(run, [final])
  await videoBatch(run, 0)
  for (const change of ['hash', 'duration', 'kind', 'dimensions', 'role'] as const) {
    const changed = { ...final }
    if (change === 'hash') changed.sha256 = 'f'.repeat(64)
    if (change === 'duration') changed.durationMs = 3000
    if (change === 'kind') changed.mime = 'image/png'
    if (change === 'dimensions') changed.width = 720
    if (change === 'role') changed.role = 'original'
    await expect(validateRenderResult(run, [changed])).rejects.toThrow('não corresponde')
  }
  const changedRevision = structuredClone(run)
  changedRevision.context.source.id = crypto.randomUUID()
  await expect(validateRenderResult(changedRevision, [final])).rejects.toThrow('não corresponde')
  expect(() =>
    validateVisualRequest({ ...run.request, capability: 'transcribe' }, run.context),
  ).toThrow('gravação')
  expect(() =>
    validateVisualRequest(
      { ...run.request, capability: 'video-edit', sourceAssetId: crypto.randomUUID() },
      run.context,
    ),
  ).toThrow('gravação')
  expect(() =>
    validateVisualRequest(
      { ...run.request, capability: 'video-edit', captionSourceAssetId: crypto.randomUUID() },
      run.context,
    ),
  ).toThrow('SRT')
  expect(() =>
    validateOutcomeCapability({ ...run.request, capability: 'copy' }, run.outcome!),
  ).toThrow('não autorizado')
})

test('exportação JPEG tem identidade própria, conserva alt e rejeita PNG renomeado', async () => {
  const run = fixture(),
    finalId = crypto.randomUUID(),
    sha256 = 'c'.repeat(64)
  run.request.capability = 'render'
  run.request.imageFormat = 'jpeg'
  run.context.assets = []
  run.context.source.document = {
    schemaVersion: 1,
    kind: 'component',
    title: defaultArt.title,
    body: defaultArt.body,
    representationId: crypto.randomUUID(),
    componentType: 'art',
    assetIds: [],
    protectedText: [],
    sourceRevisionId: null,
    composition: defaultArt.composition,
    alt: 'Descrição revisada pela equipe',
  }
  if (run.outcome?.status !== 'succeeded') throw new Error('Resultado ausente')
  delete run.outcome.video
  run.outcome.art = {
    schemaVersion: 1,
    kind: 'art',
    summary: 'Exportação JPEG',
    variants: [
      {
        label: 'Arte final',
        componentId: run.context.source.entityId,
        composition: defaultArt.composition,
        finalAssetId: finalId,
        alt: run.context.source.document.alt ?? '',
      },
    ],
  }
  run.outcome.assetIds = [finalId]
  const inputSha256 = await renderInputHash(run.context.source, [], 'jpeg')
  expect(inputSha256).not.toBe(await renderInputHash(run.context.source, [], 'png'))
  expect(inputSha256).not.toBe(await renderInputHash(run.context.source, []))
  run.outcome.render = {
    schemaVersion: 1,
    sourceRevisionId: run.context.source.id,
    inputSha256,
    outputAssetId: finalId,
    outputSha256: sha256,
    engine: {
      name: 'remotion',
      version: '4.0.535',
      bundleSha256: 'd'.repeat(64),
      workerSha256: 'e'.repeat(64),
      platform: 'win32',
      architecture: 'x64',
    },
  }
  const asset = assetManifestSchema.parse({
    schemaVersion: 1,
    id: finalId,
    projectId: run.request.projectId,
    name: 'art.jpg',
    sha256,
    size: 1000,
    mime: 'image/jpeg',
    role: 'final',
    sourceAssetId: null,
    width: defaultArt.composition.width,
    height: defaultArt.composition.height,
    durationMs: null,
    codec: null,
    rotation: null,
  })
  validateVisualRequest(run.request, run.context)
  await validateRenderResult(run, [asset])
  await artBatch(run, 0, [run.context.source])
  await expect(validateRenderResult(run, [{ ...asset, mime: 'image/png' }])).rejects.toThrow(
    'não corresponde',
  )
  const variant = run.outcome.art.variants[0]
  if (!variant) throw new Error('Variante ausente')
  variant.alt = 'Outra descrição'
  await expect(artBatch(run, 0, [run.context.source])).rejects.toThrow('descrição alternativa')
  variant.alt = run.context.source.document.alt ?? ''
  delete run.context.source.document.composition
  const original = { ...asset, id: crypto.randomUUID(), mime: 'image/png' as const, name: 'original.png' }
  run.context.source.document.assetIds = [original.id]
  run.context.assets = [original]
  variant.composition = null
  validateVisualRequest(run.request, run.context)
  await expect(validateRenderResult(run, [asset])).rejects.toThrow('não corresponde')
  run.outcome.render.inputSha256 = await renderInputHash(run.context.source, [original], 'jpeg')
  await validateRenderResult(run, [asset])
  const applied = await artBatch(run, 0, [run.context.source])
  expect(applied.changes[0]?.document).toEqual({ ...run.context.source.document, assetIds: [finalId] })
  expect(() => validateVisualRequest({ ...run.request, sourceAssetId: crypto.randomUUID() }, run.context)).toThrow('imagem confirmada')
  expect(() => validateVisualRequest({ ...run.request, imageFormat: 'png' }, run.context)).toThrow('convertida para JPEG')
})
