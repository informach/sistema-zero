import { createHash } from 'node:crypto'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  canonicalJson,
  captionSchema,
  runViewSchema,
  videoSchema,
} from '@sistemazero/marketing-contracts'
import { z } from 'zod'
import { videoBatch } from '../../marketing/src/domain/workspace/video-proposal'
import { editVideo } from '../src/main/execution/video-edit'
import { analyzeRecording } from '../src/main/media/analyze-recording'

const directory = path.resolve('.cache/speech-proof/pause-edit'),
  file = path.resolve('.cache/speech-proof/fala-verificacao.wav')
await mkdir(directory, { recursive: true })
const evidence = z
  .object({ captions: z.array(captionSchema) })
  .parse(JSON.parse(await readFile('.cache/speech-proof/evidence.json', 'utf8')))
const original = await readFile(file),
  sha256 = createHash('sha256').update(original).digest('hex'),
  analysis = await analyzeRecording(file, 'audio/wav', directory, AbortSignal.timeout(30000), false)
if (!analysis.metadata.durationMs) throw new Error('Duração ausente')
const id = () => crypto.randomUUID(),
  projectId = id(),
  entityId = id(),
  actor = id(),
  revisionId = id(),
  assetId = id(),
  audioTrack = id(),
  visualTrack = id()
const durationInFrames = Math.floor((analysis.metadata.durationMs * 30) / 1000)
const timeline = videoSchema.parse({
  schemaVersion: 1,
  recipeVersion: 'marketing-timeline-v1',
  width: 1080,
  height: 1920,
  fps: { numerator: 30, denominator: 1 },
  durationInFrames,
  tracks: [
    { id: audioTrack, kind: 'audio' },
    { id: visualTrack, kind: 'visual' },
  ],
  clips: [
    {
      id: id(),
      trackId: audioTrack,
      assetId,
      kind: 'audio',
      startFrame: 0,
      durationInFrames,
      showCaptions: true,
    },
    {
      id: id(),
      trackId: visualTrack,
      kind: 'text',
      text: 'Crie seu jogo',
      startFrame: 0,
      durationInFrames,
      position: 'top',
    },
  ],
  captions: evidence.captions.map((caption) => ({ ...caption, assetId })),
  background: '#172a46',
  accent: '#ffdb56',
})
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
    provider: 'claude',
    instruction:
      'Retire as pausas identificadas na análise acústica, conservando 100 ms de margem nas bordas. Preserve toda a fala, volume, velocidade e texto das legendas. Ajuste a duração da montagem e do título para acompanhar os cortes; não mude o estilo.',
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
        title: 'Prova de pausas',
        representationId: id(),
        timeline,
      },
    },
    selected: [],
    directions: [],
    evidence: [],
    protectedIds: [],
    assets: [
      {
        schemaVersion: 1,
        id: assetId,
        projectId,
        name: 'Fala sintética de verificação.wav',
        sha256,
        size: (await stat(file)).size,
        mime: 'audio/wav',
        role: 'original',
        sourceAssetId: null,
        ...analysis.metadata,
      },
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
const outcome = await editVideo(run, directory, AbortSignal.timeout(360000), console.log, {
  images: [],
  observations: [
    {
      version: 'ffmpeg-remotion-4.0.535-v1',
      assetId,
      sha256,
      metadata: analysis.metadata,
      silence: analysis.silence,
      samples: [],
    },
  ],
})
await writeFile(path.join(directory, 'outcome.json'), JSON.stringify(outcome, null, 2))
const batch = await videoBatch({ ...run, outcome }, 0),
  changed = batch.changes[0]?.document
if (changed?.kind !== 'video') throw new Error('Montagem ausente')
const captions = (value: typeof timeline) =>
  value.captions.map(({ id, assetId, startMs, endMs, text, corrected }) => ({
    id,
    assetId,
    startMs,
    endMs,
    text,
    corrected,
  }))
if (
  canonicalJson(captions(changed.timeline)) !== canonicalJson(captions(timeline)) ||
  canonicalJson(changed.timeline.fps) !== canonicalJson(timeline.fps)
)
  throw new Error('A edição mudou legendas ou FPS')
if (changed.timeline.durationInFrames >= durationInFrames - 10)
  throw new Error('A IA não retirou as pausas')
const clips = changed.timeline.clips
  .filter((clip) => clip.kind === 'audio')
  .sort((a, b) => a.startFrame - b.startFrame)
const removed: Array<{ from: number; to: number }> = []
let sourceEnd = 0,
  outputEnd = 0
for (const clip of clips) {
  if (
    clip.assetId !== assetId ||
    clip.playbackRate !== 1 ||
    clip.volume !== 1 ||
    clip.startFrame !== outputEnd ||
    clip.sourceStartMs < sourceEnd - 1
  )
    throw new Error('A edição alterou ordem, velocidade, volume ou continuidade')
  if (clip.sourceStartMs > sourceEnd + 1) removed.push({ from: sourceEnd, to: clip.sourceStartMs })
  sourceEnd = clip.sourceStartMs + (clip.durationInFrames * 1000) / 30
  outputEnd += clip.durationInFrames
}
if (sourceEnd < (durationInFrames * 1000) / 30 - 1)
  removed.push({ from: sourceEnd, to: (durationInFrames * 1000) / 30 })
for (const interval of removed)
  if (
    !analysis.silence.some(
      (silence) =>
        interval.from >= silence.startMs + 65 &&
        interval.to <=
          silence.endMs - (interval.to >= (durationInFrames * 1000) / 30 - 35 ? -35 : 65),
    )
  )
    throw new Error(
      'Um corte saiu dos intervalos de silêncio verificados ou não preservou margem junto à fala',
    )
if (
  createHash('sha256')
    .update(await readFile(file))
    .digest('hex') !== sha256
)
  throw new Error('O original mudou')
await writeFile(
  path.join(directory, 'evidence.json'),
  JSON.stringify(
    {
      source: 'fala sintética de verificação',
      removed,
      originalFrames: durationInFrames,
      editedFrames: changed.timeline.durationInFrames,
      originalPreserved: true,
      batch,
    },
    null,
    2,
  ),
)
console.log(
  JSON.stringify({
    pauseEditPassed: true,
    removed,
    originalFrames: durationInFrames,
    editedFrames: changed.timeline.durationInFrames,
  }),
)
