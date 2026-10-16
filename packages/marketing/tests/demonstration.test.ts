import { expect, test } from 'bun:test'
import {
  assetManifestSchema,
  demonstrationSchema,
  revisionSchema,
  runViewSchema,
  videoSchema,
} from '@sistemazero/marketing-contracts'
import {
  demonstrationCandidates,
  demonstrationGuide,
} from '../../marketing-production/src/demonstration-guide'
import { validateDemonstrationSources } from '../src/domain/workspace/demonstration'
import { references } from '../src/domain/workspace/references'
import { videoBatch } from '../src/domain/workspace/video-proposal'

function fixture() {
  const projectId = crypto.randomUUID(),
    assetId = crypto.randomUUID(),
    evidenceId = crypto.randomUUID()
  const evidence = revisionSchema.parse({
    id: crypto.randomUUID(),
    entityId: evidenceId,
    projectId,
    parentRevisionId: null,
    createdBy: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    document: {
      schemaVersion: 1,
      kind: 'evidence',
      title: 'Comparação observada',
      body: 'Apenas a posição mudou.',
      classification: 'fact',
      validity: 'current',
      product: 'Studio',
      tags: [],
      source: { label: 'Captura real' },
      assetIds: [assetId],
    },
  })
  const asset = assetManifestSchema.parse({
    schemaVersion: 1,
    id: assetId,
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
    rotation: 0,
  })
  const demonstration = demonstrationSchema.parse({
    schemaVersion: 1,
    recipeId: 'detail-context-v1',
    headline: 'Observe a mudança',
    sources: [
      {
        id: crypto.randomUUID(),
        assetId,
        sha256: asset.sha256,
        width: asset.width,
        height: asset.height,
        evidenceId,
        evidenceRevisionId: evidence.id,
        label: 'Captura verificada',
        focus: { x: 0.2, y: 0.2, width: 0.5, height: 0.5 },
      },
    ],
  })
  const trackId = crypto.randomUUID()
  const timeline = videoSchema.parse({
    schemaVersion: 1,
    recipeVersion: 'marketing-timeline-v1',
    width: 1080,
    height: 1920,
    fps: { numerator: 30, denominator: 1 },
    durationInFrames: 120,
    tracks: [{ id: trackId, kind: 'visual' }],
    clips: [
      {
        id: crypto.randomUUID(),
        trackId,
        assetId,
        kind: 'image',
        demonstration,
        fit: 'contain',
        startFrame: 0,
        durationInFrames: 120,
      },
    ],
    captions: [],
    background: '#172a46',
    accent: '#ffdb56',
  })
  return { projectId, asset, evidence, timeline }
}
test('fonte da demonstração exige fato confirmado, mídia e revisão do mesmo projeto', () => {
  const f = fixture()
  expect(() =>
    validateDemonstrationSources(f.timeline, f.projectId, [f.evidence], [f.asset]),
  ).not.toThrow()
  for (const kind of [
    'hash',
    'project',
    'mime',
    'asset',
    'classification',
    'validity',
    'revision',
  ] as const) {
    const changed = structuredClone(f)
    if (kind === 'hash') changed.asset.sha256 = 'b'.repeat(64)
    if (kind === 'project') changed.evidence.projectId = crypto.randomUUID()
    if (kind === 'mime') changed.asset.mime = 'video/mp4'
    if (kind === 'revision') changed.evidence.id = crypto.randomUUID()
    if (changed.evidence.document.kind !== 'evidence') throw new Error('Fixture sem evidência')
    if (kind === 'asset') changed.evidence.document.assetIds = []
    if (kind === 'classification') changed.evidence.document.classification = 'hypothesis'
    if (kind === 'validity') changed.evidence.document.validity = 'unverified'
    expect(() =>
      validateDemonstrationSources(
        changed.timeline,
        changed.projectId,
        [changed.evidence],
        [changed.asset],
      ),
    ).toThrow('demonstração')
  }
})
test('grafo conserva evidência, revisão e mídia para retenção e aprovação', () => {
  const f = fixture()
  const refs = references({
    schemaVersion: 1,
    kind: 'video',
    title: 'Teste',
    representationId: crypto.randomUUID(),
    timeline: f.timeline,
  })
  expect(refs.items).toContain(f.evidence.entityId)
  expect(refs.revisions).toContain(f.evidence.id)
  expect(refs.assets).toEqual([f.asset.id])
})

function executionFixture() {
  const f = fixture()
  const source = revisionSchema.parse({
    ...f.evidence,
    id: crypto.randomUUID(),
    entityId: crypto.randomUUID(),
    document: {
      schemaVersion: 1,
      kind: 'video',
      title: 'Demonstração',
      representationId: crypto.randomUUID(),
      timeline: f.timeline,
    },
  })
  const run = runViewSchema.parse({
    request: {
      schemaVersion: 1,
      id: crypto.randomUUID(),
      operationId: crypto.randomUUID(),
      projectId: f.projectId,
      entityId: source.entityId,
      revisionId: source.id,
      intent: 'adjust',
      capability: 'video-edit',
      provider: 'codex',
      instruction: 'Mude somente o título da demonstração',
      selection: [],
      protectedIds: [],
      contextHash: 'c'.repeat(64),
      limits: {},
      videoTarget: { clipId: f.timeline.clips[0]?.id, part: 'text' },
    },
    context: {
      schemaVersion: 1,
      source,
      selected: [],
      directions: [],
      evidence: [f.evidence],
      protectedIds: [],
      assets: [f.asset],
    },
    state: 'succeeded',
    epoch: 1,
    createdBy: f.evidence.createdBy,
    createdAt: f.evidence.createdAt,
    attempt: null,
    leaseExpired: false,
    outcome: {
      status: 'succeeded',
      text: 'Título ajustado',
      assetIds: [],
      mode: 'fixture',
      durationMs: 1,
      inputTokens: null,
      outputTokens: null,
      video: {
        schemaVersion: 1,
        kind: 'video',
        summary: 'Título ajustado',
        variants: [
          {
            label: 'Ajuste',
            videoId: source.entityId,
            timeline: structuredClone(f.timeline),
            finalAssetId: null,
          },
        ],
      },
    },
  })
  return { f, run }
}
test('ajuste de texto da demonstração não altera foco; ajuste de efeito não altera texto ou origem', async () => {
  const { run } = executionFixture()
  if (run.outcome?.status !== 'succeeded') throw new Error('Resultado ausente')
  const clip = run.outcome.video?.variants[0]?.timeline.clips[0]
  const scene = clip?.demonstration,
    source = scene?.sources[0]
  if (!scene || !source || !run.request.videoTarget) throw new Error('Cena ausente')
  scene.headline = 'Apenas o título mudou'
  expect((await videoBatch(run, 0)).changes[0]?.baseRevisionId).toBe(run.context.source.id)
  source.focus.x = 0.1
  await expect(videoBatch(run, 0)).rejects.toThrow('mais que o texto')
  source.focus.x = 0.2
  run.request.videoTarget.part = 'effect'
  await expect(videoBatch(run, 0)).rejects.toThrow('mais que o texto')
  scene.headline = 'Observe a mudança'
  source.focus.x = 0.1
  expect((await videoBatch(run, 0)).changes).toHaveLength(1)
  source.sha256 = 'f'.repeat(64)
  await expect(videoBatch(run, 0)).rejects.toThrow('demonstração')
})
test('guia usa somente fontes factuais com mídia confirmada e não cria capacidade inexistente', () => {
  const { run } = executionFixture()
  expect(demonstrationCandidates(run.context)).toHaveLength(1)
  expect(demonstrationGuide(run.context)).toContain('detail-context-v1')
  expect(demonstrationGuide(run.context)).toContain(run.context.assets?.[0]?.sha256 ?? 'missing')
  const evidence = run.context.evidence[0]
  if (evidence?.document.kind !== 'evidence') throw new Error('Evidência ausente')
  evidence.document.classification = 'hypothesis'
  expect(demonstrationCandidates(run.context)).toEqual([])
  expect(demonstrationGuide(run.context)).toContain('Não há imagem factual elegível')
  evidence.document.classification = 'fact'
  evidence.projectId = crypto.randomUUID()
  const asset = run.context.assets?.[0]
  if (!asset) throw new Error('Arquivo ausente')
  asset.projectId = evidence.projectId
  expect(demonstrationCandidates(run.context)).toEqual([])
})
