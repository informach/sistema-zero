import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { assetManifestSchema, runViewSchema, videoSchema } from '@sistemazero/marketing-contracts'
import sharp from 'sharp'
import { videoBatch } from '../../marketing/src/domain/workspace/video-proposal'
import { LocalAssets } from '../src/main/assets'
import { editVideo } from '../src/main/execution/video-edit'
import { analyzeRecording } from '../src/main/media/analyze-recording'
import { mediaProcess } from '../src/main/media/media-process'

const directory = path.resolve('.cache/visual-video-proof')
await mkdir(directory, { recursive: true })
const signal = AbortSignal.timeout(720000),
  source = path.join(directory, 'recording.mp4')
for (let index = 0; index < 6; index++) {
  const output = path.join(directory, `frame-${index}.png`)
  if (index === 2 || index === 3)
    await sharp('.cache/studio-proof/P08-runtime.png').resize(640, 400).png().toFile(output)
  else
    await sharp({
      create: {
        width: 640,
        height: 400,
        channels: 3,
        background: index < 2 ? '#f0e5d5' : '#172a46',
      },
    })
      .png()
      .toFile(output)
}
await mediaProcess(
  'ffmpeg',
  [
    '-v',
    'error',
    '-y',
    '-framerate',
    '1',
    '-i',
    path.join(directory, 'frame-%d.png'),
    '-r',
    '30',
    '-c:v',
    'libx264',
    '-threads',
    '2',
    '-pix_fmt',
    'yuv420p',
    '-t',
    '6',
    source,
  ],
  signal,
)
const assets = new LocalAssets(path.join(directory, 'assets'))
await assets.start()
try {
  const original = await assets.importFile(source),
    analysis = await analyzeRecording(source, 'video/mp4', directory, signal, true)
  const images: string[] = [],
    samples: Array<{ assetId: string; atMs: number }> = []
  for (const frame of analysis.frames) {
    const asset = await assets.importFile(frame.file)
    images.push((await assets.verify(asset.id)).path)
    samples.push({ assetId: asset.id, atMs: frame.atMs })
  }
  const id = () => crypto.randomUUID(),
    projectId = id(),
    entityId = id(),
    revisionId = id(),
    actor = id(),
    trackId = id()
  const timeline = videoSchema.parse({
    schemaVersion: 1,
    recipeVersion: 'marketing-timeline-v1',
    width: 640,
    height: 400,
    fps: { numerator: 30, denominator: 1 },
    durationInFrames: 180,
    tracks: [{ id: trackId, kind: 'visual' }],
    clips: [
      {
        id: id(),
        trackId,
        kind: 'video',
        assetId: original.id,
        startFrame: 0,
        durationInFrames: 180,
      },
    ],
    captions: [],
    background: '#172a46',
    accent: '#ffdb56',
  })
  const only = process.argv.find((argument) => argument.startsWith('--provider='))?.split('=')[1]
  for (const provider of ['codex', 'claude'] as const) {
    if (only && provider !== only) continue
    const run = runViewSchema.parse({
      request: {
        schemaVersion: 1,
        operationId: id(),
        id: id(),
        projectId,
        entityId,
        revisionId,
        intent: 'adjust',
        capability: 'video-edit',
        provider,
        instruction:
          'Use somente o trecho em que mostro o jogo. Remova os trechos sem jogo, mantenha a velocidade e ajuste a duração da montagem. Não acrescente texto ou som. Se as amostras não permitem afirmar os limites exatos, escolha um intervalo conservador que elas comprovem e explique essa limitação.',
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
            title: 'Verificação visual',
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
            id: original.id,
            projectId,
            name: 'Gravação de verificação.mp4',
            sha256: original.sha256,
            size: original.size,
            mime: original.mime,
            role: 'original',
            sourceAssetId: null,
            ...analysis.metadata,
          }),
        ],
      },
      state: 'running',
      epoch: 1,
      createdBy: actor,
      createdAt: new Date().toISOString(),
      attempt: null,
      leaseExpired: false,
      outcome: null,
    })
    const outcome = await editVideo(
      run,
      path.join(directory, provider, run.request.id),
      signal,
      console.log,
      'checkpoint',
      {
        images,
        observations: [
          {
            version: 'ffmpeg-remotion-4.0.535-v1',
            scope: 'audio-and-frames',
            assetId: original.id,
            sha256: original.sha256,
            metadata: analysis.metadata,
            silence: analysis.silence,
            samples,
          },
        ],
      },
    )
    await writeFile(
      path.join(directory, `${provider}-outcome.json`),
      JSON.stringify(outcome, null, 2),
    )
    const batch = await videoBatch({ ...run, outcome }, 0),
      changed = batch.changes[0]?.document
    if (changed?.kind !== 'video') throw new Error('Resultado sem montagem')
    const clips = changed.timeline.clips
    if (
      !clips.length ||
      clips.some(
        (clip) =>
          clip.kind !== 'video' ||
          clip.assetId !== original.id ||
          clip.playbackRate !== 1 ||
          clip.sourceStartMs < 2000 ||
          clip.sourceStartMs + (clip.durationInFrames * 1000) / 30 > 4000,
      )
    )
      throw new Error('A seleção não corresponde ao intervalo em que o jogo está visível')
    if (changed.timeline.durationInFrames < 15 || changed.timeline.durationInFrames > 60)
      throw new Error('Duração selecionada inválida')
    await assets.verify(original.id)
    const evidence = {
      fixture:
        'Vídeo de verificação com captura real do Studio entre 2 e 4 s; demais frames de cor sólida. Não é gravação de usuário.',
      provider,
      onlyGameSelected: true,
      originalPreserved: true,
      samples,
      batch,
      summary: outcome.text,
    }
    await writeFile(
      path.join(directory, `${provider}-evidence.json`),
      JSON.stringify(evidence, null, 2),
    )
    console.log(
      JSON.stringify({
        provider,
        onlyGameSelected: true,
        selected: clips.map((clip) => ({
          fromMs: clip.sourceStartMs,
          durationFrames: clip.durationInFrames,
        })),
        summary: outcome.text,
      }),
    )
  }
} finally {
  assets.close()
}
