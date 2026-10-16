import {
  batchOperationSchema,
  canonicalJson,
  type ExecutionRun,
  stableEditorialId,
  videoAdaptationSeed,
} from '@sistemazero/marketing-contracts'
import { WorkspaceError } from './workspace-error'

export async function videoAdaptationBatch(run: ExecutionRun, index: number) {
  const outcome = run.outcome?.status === 'succeeded' ? run.outcome : undefined,
    proposal = outcome?.video,
    variant = proposal?.variants[index],
    source = run.context.source
  const representation = run.context.ancestors.find(
    (revision) => revision.document.kind === 'representation',
  )
  if (
    run.request.capability !== 'video-adapt' ||
    run.request.intent !== 'adapt' ||
    source.document.kind !== 'component' ||
    representation?.document.kind !== 'representation' ||
    !variant ||
    proposal?.variants.length !== 1 ||
    variant.videoId !== source.entityId ||
    variant.finalAssetId ||
    !representation.document.componentIds.includes(source.entityId)
  )
    throw new WorkspaceError('INVALID_RESULT', 'A adaptação não corresponde à arte selecionada')
  if (run.context.protectedIds.includes(source.entityId))
    throw new WorkspaceError('PROTECTED_CONTENT', 'Esta arte está protegida')
  const seed = await videoAdaptationSeed(
    source,
    run.context.assets ?? [],
    run.request.sourceAssetId,
  )
  const before = seed.clips[0],
    after = variant.timeline.clips[0]
  if (!before || !after) throw new WorkspaceError('INVALID_RESULT', 'A cena da arte está ausente')
  const withoutMotion = (timeline: typeof seed) => ({
    ...timeline,
    durationInFrames: 0,
    clips: timeline.clips.map(
      ({
        durationInFrames: _duration,
        fadeInFrames: _in,
        fadeOutFrames: _out,
        effect: _effect,
        ...clip
      }) => clip,
    ),
  })
  if (
    canonicalJson(withoutMotion(seed)) !== canonicalJson(withoutMotion(variant.timeline)) ||
    after.durationInFrames !== variant.timeline.durationInFrames ||
    !['none', 'fade', 'slide', 'zoom'].includes(after.effect)
  )
    throw new WorkspaceError(
      'INVALID_RESULT',
      'A conversão só pode animar a arte e ajustar sua duração; copy e layout devem permanecer',
    )
  const entityId = await stableEditorialId(`${run.request.projectId}:video-adapt:${run.request.id}`)
  return batchOperationSchema.parse({
    schemaVersion: 1,
    projectId: run.request.projectId,
    operationId: await stableEditorialId(
      `${run.request.projectId}:video-adapt:${run.request.id}:save`,
    ),
    changes: [
      { entityId: source.entityId, baseRevisionId: source.id, action: 'archive' },
      {
        entityId: representation.entityId,
        baseRevisionId: representation.id,
        action: 'save',
        document: {
          ...representation.document,
          medium: representation.document.componentIds.length === 1 ? 'video' : 'mixed',
          componentIds: representation.document.componentIds.map((id) =>
            id === source.entityId ? entityId : id,
          ),
        },
      },
      {
        entityId,
        baseRevisionId: null,
        action: 'save',
        document: {
          schemaVersion: 1,
          kind: 'video',
          title: source.document.title,
          representationId: representation.entityId,
          sourceRevisionId: source.id,
          timeline: variant.timeline,
          assetIds: [],
          referenceAssetIds: [
            ...new Set([...source.document.assetIds, ...(source.document.referenceAssetIds ?? [])]),
          ],
        },
      },
    ],
  })
}
