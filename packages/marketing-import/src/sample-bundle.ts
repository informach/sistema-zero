import {
  batchOperationSchema,
  type EditorialBatch,
  type EditorialDocument,
  stableEditorialId,
} from '@sistemazero/marketing-contracts'
import { parseInstagramCalendar, parseInstagramCopy } from './editorial-markdown'

type Source = { key: string; text: string; sha256: string }
/** Preparatory sample. Media is deliberately incomplete until original/final manifests are reconciled. */
export async function instagramSample(
  projectId: string,
  input: {
    direction: Source
    research: Source
    calendar: Source
    copies: Source[]
    selectedCopies: string[]
  },
): Promise<EditorialBatch[]> {
  const id = (key: string) => stableEditorialId(`${projectId}:instagram:${key}`)
  const evidence = await Promise.all(
    [input.direction, input.research, input.calendar, ...input.copies].map(async (source) => ({
      source,
      id: await id(source.key),
    })),
  )
  const evidenceChange = (value: (typeof evidence)[number]): EditorialBatch['changes'][number] => ({
    entityId: value.id,
    baseRevisionId: null,
    action: 'save',
    document: {
      schemaVersion: 1,
      kind: 'evidence',
      title: value.source.key.split('/').at(-1) ?? value.source.key,
      body: value.source.text,
      classification: 'reference',
      source: { label: value.source.key, sourceKey: value.source.key, sha256: value.source.sha256 },
      product: 'Comunidade dos Criadores',
      validity: 'unverified',
      tags: ['acervo', 'carga-preparatoria'],
    },
  })
  const directionEvidence = evidence.find((value) => value.source.key === input.direction.key)
  if (!directionEvidence) throw new Error('Fonte da direção ausente')
  const batches: EditorialBatch[] = [
    batchOperationSchema.parse({
      schemaVersion: 1,
      projectId,
      operationId: await id('sample-context-v1'),
      changes: [
        ...evidence.map(evidenceChange),
        {
          entityId: await id('direction'),
          baseRevisionId: null,
          action: 'save',
          document: {
            schemaVersion: 1,
            kind: 'direction',
            title: 'Instagram · posicionamento e execução',
            body: input.direction.text,
            objective: 'Preservar o posicionamento e a direção de escrita já produzidos.',
            audience: 'Responsáveis por crianças de 9 a 14 anos',
            voice: 'Conforme o documento de direção, sem inventar promessas ou resultados.',
            protectedTerms: [],
            referenceIds: [directionEvidence.id],
            status: 'current',
          },
        },
      ],
    }),
  ]
  const copies = input.copies.flatMap((source) =>
    parseInstagramCopy(source.text).map((copy) => ({ copy, source })),
  )
  for (const entry of parseInstagramCalendar(input.calendar.text)) {
    const pieceId = await id(`piece:${entry.sourceId}`),
      representationId = await id(`representation:${entry.sourceId}`)
    const found = input.selectedCopies.includes(entry.sourceId)
      ? copies.find((value) => value.copy.sourceId === entry.sourceId)
      : undefined
    const components = found?.copy.components ?? [],
      componentIds = await Promise.all(
        components.map((_value, index) => id(`component:${entry.sourceId}:${index}`)),
      )
    const sourceEvidence = found
      ? evidence.find((value) => value.source.key === found.source.key)
      : undefined
    const documents: Array<{ id: string; document: EditorialDocument }> = [
      {
        id: pieceId,
        document: {
          schemaVersion: 1,
          kind: 'piece',
          title: `${entry.sourceId} · ${entry.title}`.slice(0, 300),
          brief:
            found?.copy.raw ??
            `Pauta do calendário existente. A copy e as mídias serão reconciliadas na carga completa.\nOrigem: ${entry.sourceLink}`,
          objective: 'Conforme a direção e o calendário de origem',
          cta: '',
          week: entry.week,
          position: entry.position,
          editorialDate: null,
          representationIds: [representationId],
          evidenceIds: [
            ...evidence
              .filter((value) =>
                [input.calendar.key, input.research.key].includes(value.source.key),
              )
              .map((value) => value.id),
            ...(sourceEvidence ? [sourceEvidence.id] : []),
          ],
          sourceKey: `instagram:${entry.sourceId}`,
          state: 'incomplete',
        },
      },
      {
        id: representationId,
        document: {
          schemaVersion: 1,
          kind: 'representation',
          title: entry.sourceId,
          pieceId,
          format: entry.format,
          medium: entry.medium,
          componentIds,
          sourceRevisionId: null,
          caption: components
            .filter((component) => component.type === 'caption')
            .map((component) => component.body)
            .join('\n\n'),
          alt: '',
          cta: '',
        },
      },
      ...components.map((component, index) => {
        const componentId = componentIds[index]
        if (!componentId) throw new Error('Componente sem identidade')
        return {
          id: componentId,
          document: {
            schemaVersion: 1 as const,
            kind: 'component' as const,
            title: component.title,
            representationId,
            componentType: component.type,
            body: component.body,
            assetIds: [],
            protectedText: [],
            sourceRevisionId: null,
          },
        }
      }),
    ]
    batches.push(
      batchOperationSchema.parse({
        schemaVersion: 1,
        projectId,
        operationId: await id(`sample-piece-v1:${entry.sourceId}`),
        changes: documents.map((value) => ({
          entityId: value.id,
          baseRevisionId: null,
          action: 'save',
          document: value.document,
        })),
      }),
    )
  }
  return batches
}
