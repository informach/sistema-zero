import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  assetManifestSchema,
  canonicalJson,
  runViewSchema,
  videoSchema,
} from '@sistemazero/marketing-contracts'
import { z } from 'zod'
import { videoBatch } from '../../marketing/src/domain/workspace/video-proposal'
import { editVideo } from '../src/main/execution/video-edit'

const directory = path.resolve('.cache/timeline-proof/native')
await mkdir(directory, { recursive: true })
const evidence = z
  .object({ timeline: videoSchema, sourceSha256: z.string() })
  .parse(JSON.parse(await readFile('.cache/timeline-proof/evidence.json', 'utf8')))
const id = () => crypto.randomUUID(),
  projectId = id(),
  entityId = id(),
  actor = id(),
  revisionId = id()
const sourceId = evidence.timeline.clips[0]?.assetId
if (!sourceId) throw new Error('Gravação de prova ausente')
const timeline = evidence.timeline
for (const clip of timeline.clips) if (clip.kind !== 'text') clip.protected = true
const request = {
  schemaVersion: 1,
  operationId: id(),
  id: id(),
  projectId,
  entityId,
  revisionId,
  intent: 'adjust',
  capability: 'video-edit',
  provider: 'codex',
  instruction:
    'Mude somente o texto do encerramento para “Conheça a comunidade”. Não mude tempos, vídeo, áudio, legendas ou estilo.',
  selection: [],
  protectedIds: [],
  contextHash: 'a'.repeat(64),
  limits: {},
}
for (const provider of ['codex', 'claude'] as const) {
  const run = runViewSchema.parse({
    request: { ...request, provider },
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
          title: 'Prova de montagem',
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
          id: sourceId,
          projectId,
          name: 'Vídeo sintético de prova',
          sha256: evidence.sourceSha256,
          size: 64141,
          mime: 'video/mp4',
          role: 'original',
          sourceAssetId: null,
          width: 320,
          height: 240,
          durationMs: 6006,
          codec: 'h264',
          rotation: 0,
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
    AbortSignal.timeout(360000),
    console.log,
    'checkpoint',
  )
  const completed = { ...run, outcome },
    batch = await videoBatch(completed, 0)
  const changed = batch.changes[0]?.document
  if (changed?.kind !== 'video') throw new Error('Montagem ausente')
  const text = changed.timeline.clips.find((clip) => clip.kind === 'text')
  if (text?.text !== 'Conheça a comunidade') throw new Error('Encerramento diferente do solicitado')
  // Canonical native transport can materialize null caption confidence/timestamp values.
  const withoutText = (value: typeof timeline) => ({
    ...value,
    clips: value.clips.filter((clip) => clip.kind !== 'text'),
    captions: value.captions.map((caption) => ({
      ...caption,
      timestampMs: caption.timestampMs ?? null,
      confidence: caption.confidence ?? null,
    })),
  })
  if (canonicalJson(withoutText(changed.timeline)) !== canonicalJson(withoutText(timeline)))
    throw new Error('A IA mudou outra parte da montagem')
  await writeFile(
    path.join(directory, `${provider}-evidence.json`),
    JSON.stringify({ outcome, batch, onlyEndingChanged: true }, null, 2),
  )
  console.log(JSON.stringify({ provider, onlyEndingChanged: true, protectedClipsPreserved: true }))
}
