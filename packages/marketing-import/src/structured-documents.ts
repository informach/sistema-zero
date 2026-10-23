import {
  documentSchema,
  type EditorialDocument,
  stableEditorialId,
} from '@sistemazero/marketing-contracts'
import type { SourcePiece } from './structured-copy'

/** IDs depend on source identity and section, not its bytes; updates keep editorial links intact. */
export async function structuredDocuments(input: {
  projectId: string
  origin: string
  sourcePath: string
  piece: SourcePiece
  evidence: Array<{ entityId: string; revisionId: string }>
  historical: boolean
  identities?: ReadonlyMap<string, string>
}) {
  const { piece } = input
  const namespace = `${input.projectId}:import-structure:${input.origin}:${input.sourcePath}:${piece.key}`
  const id = async (key: string) =>
    input.identities?.get(key) ?? stableEditorialId(`${namespace}:${key}`)
  const pieceId = await id('piece'),
    channels: Array<'main' | 'direct'> = ['main']
  if (piece.components.some((component) => component.channel === 'direct')) channels.push('direct')
  const representations = await Promise.all(
    channels.map(async (channel) => ({ channel, id: await id(channel) })),
  )
  const documents: Array<{ id: string; document: EditorialDocument }> = []
  documents.push({
    id: pieceId,
    document: documentSchema.parse({
      schemaVersion: 1,
      kind: 'piece',
      title: `${piece.key} · ${piece.title}`.slice(0, 300),
      brief: piece.raw,
      objective: 'Conforme a ficha de origem; conferir antes de produzir.',
      cta: '',
      week: null,
      position: 0,
      editorialDate: null,
      representationIds: representations.map((value) => value.id),
      evidenceIds: input.evidence.map((value) => value.entityId),
      sourceKey: `${input.origin}:${input.sourcePath}#${piece.key}`,
      state: input.historical ? 'historical' : 'incomplete',
    }),
  })
  for (const representation of representations) {
    const components = await Promise.all(
      piece.components
        .filter((component) => component.channel === representation.channel)
        .map(async (component) => ({
          component,
          id: await id(`${representation.channel}:${component.key}`),
        })),
    )
    documents.push({
      id: representation.id,
      document: documentSchema.parse({
        schemaVersion: 1,
        kind: 'representation',
        purpose: representation.channel === 'direct' ? 'direct' : 'publication',
        title: representation.channel === 'main' ? piece.key : `${piece.key} · Direct`,
        pieceId,
        format: representation.channel === 'main' ? piece.format : 'campaign',
        medium: representation.channel === 'main' ? piece.medium : 'text',
        componentIds: components.map((value) => value.id),
        sourceRevisionId: null,
        caption: '',
        alt: '',
        cta: '',
      }),
    })
    for (const { component, id: componentId } of components)
      documents.push({
        id: componentId,
        document: documentSchema.parse({
          schemaVersion: 1,
          kind: 'component',
          title: component.title,
          representationId: representation.id,
          componentType: component.type,
          body: component.body,
          productionNotes: component.productionNotes,
          assetIds: [],
          protectedText: [],
          sourceRevisionId: null,
        }),
      })
  }
  if (documents.length > 100) throw new Error('Peça excede o limite de 100 objetos por revisão')
  return { pieceId, documents }
}
