import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { runViewSchema } from '@sistemazero/marketing-contracts'
import { videoAdaptationBatch } from '../../marketing/src/domain/workspace/video-adaptation'
import { defaultArt } from '../../marketing-production/src/art-props'
import { adaptVideo } from '../src/main/execution/video-adapt'

const directory = path.resolve('.cache/video-adaptation-proof')
await mkdir(directory, { recursive: true })
const only = process.argv.find((arg) => arg.startsWith('--provider='))?.split('=')[1]
for (const provider of ['codex', 'claude'] as const) {
  if (only && only !== provider) continue
  const id = () => crypto.randomUUID(),
    projectId = id(),
    entityId = id(),
    revisionId = id(),
    actor = id(),
    representationId = id(),
    now = new Date().toISOString()
  const revision = { projectId, parentRevisionId: null, createdBy: actor, createdAt: now }
  const run = runViewSchema.parse({
    request: {
      schemaVersion: 1,
      operationId: id(),
      id: id(),
      projectId,
      entityId,
      revisionId,
      intent: 'adapt',
      capability: 'video-adapt',
      provider,
      instruction:
        'Transforme este item em um story de vídeo de três segundos com uma entrada suave. Preserve cada palavra e o layout. Não acrescente áudio.',
      selection: [],
      protectedIds: [],
      contextHash: 'a'.repeat(64),
      limits: {},
    },
    context: {
      schemaVersion: 1,
      source: {
        ...revision,
        id: revisionId,
        entityId,
        document: {
          schemaVersion: 1,
          kind: 'component',
          componentType: 'art',
          sourceRevisionId: null,
          title: 'A criação é dela',
          representationId,
          body: 'Ela disse: “Eu criei.”\n\nConheça a atividade.',
          alt: 'Copy de verificação',
          protectedText: ['Eu criei.'],
          assetIds: [],
          composition: { ...defaultArt.composition, height: 1920 },
        },
      },
      ancestors: [
        {
          ...revision,
          id: id(),
          entityId: representationId,
          document: {
            schemaVersion: 1,
            kind: 'representation',
            title: 'Sequência',
            pieceId: id(),
            format: 'story',
            medium: 'image',
            sourceRevisionId: null,
            caption: '',
            alt: '',
            cta: '',
            componentIds: [entityId, id()],
          },
        },
      ],
      selected: [],
      directions: [],
      evidence: [],
      protectedIds: [],
      assets: [],
    },
    state: 'running',
    epoch: 1,
    createdBy: actor,
    createdAt: now,
    attempt: null,
    leaseExpired: false,
    outcome: null,
  })
  const outcome = await adaptVideo(
    run,
    path.join(directory, provider),
    AbortSignal.timeout(360000),
    console.log,
  )
  await writeFile(
    path.join(directory, `${provider}-outcome.json`),
    JSON.stringify(outcome, null, 2),
  )
  const batch = await videoAdaptationBatch({ ...run, outcome }, 0),
    video = batch.changes.find((change) => change.document?.kind === 'video')?.document
  if (
    video?.kind !== 'video' ||
    video.timeline.durationInFrames !== 90 ||
    video.timeline.clips[0]?.kind !== 'art'
  )
    throw new Error('A conversão não preservou a arte ou a duração solicitada')
  await writeFile(
    path.join(directory, `${provider}-evidence.json`),
    JSON.stringify({ provider, passed: true, run: { ...run, outcome }, batch }, null, 2),
  )
  console.log(
    JSON.stringify({
      provider,
      passed: true,
      frames: video.timeline.durationInFrames,
      editableArt: true,
    }),
  )
}
