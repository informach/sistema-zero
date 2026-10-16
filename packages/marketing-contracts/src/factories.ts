import { batchOperationSchema, type EditorialBatch, type EditorialDocument } from './editorial'
import { videoSchema } from './video'
export function createPieceBatch(input: {
  projectId: string
  title: string
  brief: string
  format: Extract<EditorialDocument, { kind: 'representation' }>['format']
  medium: Extract<EditorialDocument, { kind: 'representation' }>['medium']
  editorialDate?: string | null
}): EditorialBatch {
  const pieceId = crypto.randomUUID(),
    representationId = crypto.randomUUID(),
    componentId = crypto.randomUUID()
  return batchOperationSchema.parse({
    schemaVersion: 1,
    operationId: crypto.randomUUID(),
    projectId: input.projectId,
    changes: [
      {
        entityId: pieceId,
        baseRevisionId: null,
        action: 'save',
        document: {
          schemaVersion: 1,
          kind: 'piece',
          title: input.title,
          brief: input.brief,
          objective: '',
          cta: '',
          week: null,
          position: 0,
          editorialDate: input.editorialDate ?? null,
          representationIds: [representationId],
          evidenceIds: [],
          sourceKey: null,
          state: 'draft',
        },
      },
      {
        entityId: representationId,
        baseRevisionId: null,
        action: 'save',
        document: {
          schemaVersion: 1,
          kind: 'representation',
          title: input.title,
          pieceId,
          format: input.format,
          medium: input.medium,
          componentIds: [componentId],
          sourceRevisionId: null,
          caption: '',
          alt: '',
          cta: '',
        },
      },
      {
        entityId: componentId,
        baseRevisionId: null,
        action: 'save',
        document:
          input.medium === 'video'
            ? {
                schemaVersion: 1,
                kind: 'video',
                title: 'Montagem do vídeo',
                representationId,
                assetIds: [],
                referenceAssetIds: [],
                timeline: videoSchema.parse({
                  schemaVersion: 1,
                  recipeVersion: 'marketing-timeline-v1',
                  width: input.format === 'long-video' ? 1920 : 1080,
                  height:
                    input.format === 'long-video' ? 1080 : input.format === 'feed' ? 1350 : 1920,
                  fps: { numerator: 30, denominator: 1 },
                  durationInFrames: 150,
                  tracks: [
                    { id: crypto.randomUUID(), kind: 'visual', muted: false },
                    { id: crypto.randomUUID(), kind: 'audio', muted: false },
                  ],
                  clips: [],
                  captions: [],
                  background: '#172a46',
                  accent: '#ffdb56',
                }),
              }
            : {
                schemaVersion: 1,
                kind: 'component',
                title: 'Texto principal',
                representationId,
                componentType: 'copy',
                body: '',
                assetIds: [],
                protectedText: [],
                sourceRevisionId: null,
              },
      },
    ],
  })
}
