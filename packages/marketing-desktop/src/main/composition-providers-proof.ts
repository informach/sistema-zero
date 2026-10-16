import assert from 'node:assert/strict'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { runViewSchema, videoSchema } from '@sistemazero/marketing-contracts'
import { app } from 'electron'
import { LocalAssets } from './assets'
import { createComposition } from './execution/composition'
import { mediaProcess } from './media/media-process'
import { renderTimeline } from './media/render-timeline'

/** Native subscriptions and isolated rendering. Server lease/R2 are exercised by connected proofs. */
export async function proveCompositionProviders() {
  if (app.isPackaged) throw new Error('Prova disponível somente no checkout')
  const resumeId = process.argv
    .find((value) => value.startsWith('--composition-proof='))
    ?.split('=')[1]
  if (resumeId && !/^[a-f0-9-]{36}$/.test(resumeId)) throw new Error('Identidade da prova inválida')
  const directory = path.join(
    app.getAppPath(),
    '.cache/composition-providers-proof',
    resumeId ?? crypto.randomUUID(),
  )
  await mkdir(directory, { recursive: true })
  const assets = new LocalAssets(path.join(directory, 'assets'))
  await assets.start()
  const resources = {
    assets,
    transport: {
      async request(): Promise<never> {
        throw new Error('Esta prova não usa transporte do servidor')
      },
    },
  }
  const id = () => crypto.randomUUID(),
    projectId = id(),
    entityId = id(),
    revisionId = id(),
    actor = id(),
    clipId = id(),
    trackId = id()
  const timeline = videoSchema.parse({
    schemaVersion: 1,
    recipeVersion: 'marketing-timeline-v1',
    width: 640,
    height: 360,
    fps: { numerator: 30, denominator: 1 },
    durationInFrames: 90,
    tracks: [{ id: trackId, kind: 'visual' }],
    clips: [
      {
        id: clipId,
        trackId,
        kind: 'text',
        text: 'Crie seu jogo',
        startFrame: 0,
        durationInFrames: 90,
      },
    ],
    captions: [],
    background: '#172a46',
    accent: '#ffdb56',
  })
  let run = runViewSchema.parse({
    request: {
      schemaVersion: 1,
      operationId: id(),
      id: id(),
      projectId,
      entityId,
      revisionId,
      intent: 'adjust',
      capability: 'composition',
      provider: 'codex',
      videoTarget: { clipId, part: 'scene' },
      instruction:
        'Anime a frase atual com entrada suave por opacidade, em Nunito legível, entre duas formas geométricas pequenas. Conserve a frase literalmente. Fundo transparente; a montagem já tem fundo azul #172a46. Composição clara e equilibrada, texto amarelo, com margem de pelo menos 24 px.',
      selection: [],
      protectedIds: [],
      contextHash: 'a'.repeat(64),
      limits: { timeoutMs: 600000, maxCalls: 1, maxVariants: 1, maxRepairs: 0 },
    },
    context: {
      schemaVersion: 1,
      source: {
        id: revisionId,
        entityId,
        projectId,
        parentRevisionId: null,
        createdBy: actor,
        createdAt: new Date().toISOString(),
        document: {
          schemaVersion: 1,
          kind: 'video',
          title: 'Prova de composição',
          representationId: id(),
          timeline,
        },
      },
      selected: [],
      directions: [],
      evidence: [],
      memory: [],
      protectedIds: [],
      assets: [],
    },
    state: 'running',
    epoch: 1,
    createdBy: actor,
    createdAt: new Date().toISOString(),
    attempt: null,
    leaseExpired: false,
    outcome: null,
  })
  const evidence: unknown[] = []
  try {
    for (const provider of ['codex', 'claude'] as const) {
      const folder = path.join(directory, provider)
      let preserved = false
      if (resumeId) {
        try {
          run = runViewSchema.parse(
            JSON.parse(await readFile(path.join(folder, 'run.json'), 'utf8')),
          )
          await stat(path.join(folder, 'provider-checkpoint.json'))
          preserved = true
        } catch (error) {
          if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
        }
      }
      run.request.provider = provider
      if (provider === 'claude') {
        const existing =
          run.context.source.document.kind === 'video'
            ? run.context.source.document.timeline.clips[0]
            : undefined
        if (!existing?.generated) throw new Error('A prova de edição exige a composição anterior')
        run.request.videoTarget = { clipId: existing.id, part: 'effect' }
        run.request.instruction =
          'Ajuste a animação criada anteriormente: faça as duas formas geométricas pulsarem suavemente enquanto a frase permanece legível. Preserve literalmente título e corpo. Não use loops, ferramentas ou novas dependências.'
      }
      const signal = AbortSignal.timeout(600000)
      await mkdir(folder, { recursive: true })
      await writeFile(path.join(folder, 'run.json'), JSON.stringify(run))
      const started = Date.now()
      const result = await createComposition(
        run,
        resources,
        folder,
        signal,
        (stage) => console.log(`${provider}: ${stage}`),
        preserved ? 'only' : 'checkpoint',
      )
      const durationMs = Date.now() - started,
        variant = result.video?.variants[0],
        generated = variant?.timeline.clips[0]?.generated
      assert(variant && generated)
      assert.equal(generated.input.body, 'Crie seu jogo')
      const receiptFile = path.join(folder, 'composition-0/generated-receipt.json'),
        receiptTime = (await stat(receiptFile)).mtimeMs
      const resumedAt = Date.now()
      const resumed = await createComposition(
        run,
        resources,
        folder,
        signal,
        (stage) => console.log(`${provider}: ${stage}`),
        'only',
      )
      assert.deepEqual(resumed.video, result.video)
      assert.equal((await stat(receiptFile)).mtimeMs, receiptTime)
      const resumeMs = Date.now() - resumedAt
      const checkpoint = JSON.parse(
        await readFile(path.join(folder, 'provider-checkpoint.json'), 'utf8'),
      )
      assert.equal(checkpoint.complete, true)
      const scene = (await assets.verify(generated.outputAssetId)).asset
      const final = await renderTimeline(
        { timeline: variant.timeline, assets: { [scene.id]: scene.url } },
        resources,
        path.join(folder, 'final'),
        signal,
      )
      const imageFile = path.join(folder, 'preview.png')
      await mediaProcess(
        'ffmpeg',
        [
          '-v',
          'error',
          '-y',
          '-ss',
          '1',
          '-i',
          (await assets.verify(final.id)).path,
          '-frames:v',
          '1',
          imageFile,
        ],
        signal,
      )
      await writeFile(path.join(folder, 'result.json'), JSON.stringify(result, null, 2))
      evidence.push({
        provider,
        mode: result.mode,
        durationMs,
        resumeMs,
        outputAssetId: scene.id,
        outputSha256: scene.sha256,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        imageFile,
        receiptFile,
        finalAssetId: final.id,
      })
      if (run.context.source.document.kind !== 'video') throw new Error('Montagem ausente')
      run.context.source.document.timeline = variant.timeline
      run.context.source.id = id()
      run.request.revisionId = run.context.source.id
      run.request.id = id()
      run.request.operationId = id()
    }
    await writeFile(
      path.join(directory, 'evidence.json'),
      JSON.stringify({ directory, evidence }, null, 2),
    )
    console.log(JSON.stringify({ directory, evidence }))
  } finally {
    assets.close()
  }
}
