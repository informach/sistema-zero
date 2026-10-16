import { t } from 'elysia'
import { PensaJourneyGuideSchema, PensaTasksReplaceBody } from './dtos'

const id = t.String({ format: 'uuid' })
const text = (max = 2000) => t.String({ minLength: 1, maxLength: max })
const strings = (max = 80) => t.Array(text(200), { maxItems: max })
const nullableText = t.Union([text(), t.Null()])
const idea = t.Object({
  id: text(100),
  text: text(),
  origin: t.Union([t.Literal('child'), t.Literal('zappy')]),
})
const destination = t.Union([t.Literal('studio'), t.Literal('pinta'), t.Literal('molda')])
const dimension = t.Union([t.Literal('2d'), t.Literal('3d')])
const capability = t.Object({
  profileId: id,
  rank: text(100),
  studio: t.Boolean(),
  studioAuthoring: t.Optional(t.Union([t.Literal('blocks'), t.Literal('code')])),
  pinta: t.Boolean(),
  molda: t.Boolean(),
  dimensions: t.Array(dimension, { maxItems: 2 }),
  blockIds: strings(2000),
  extensionIds: strings(),
  moldaTools: strings(),
  tutor: t.Boolean(),
  fingerprint: text(128),
})
export const PensaProposalDto = t.Object({
  id,
  title: text(120),
  summary: text(800),
  firstResult: text(500),
  essentials: strings(5),
  suggestions: strings(8),
  later: t.Array(idea, { maxItems: 30 }),
  dimension,
  capabilities: capability,
  missions: t.Array(
    t.Object({
      key: text(100),
      destination,
      title: text(200),
      result: text(500),
      dependencies: strings(12),
      blockIds: strings(),
      extensionIds: strings(20),
      mechanicIds: strings(20),
      toolIds: strings(40),
      asset: t.Union([
        t.Null(),
        t.Object({
          id: text(100),
          kind: t.Union([
            t.Literal('sprite'),
            t.Literal('background'),
            t.Literal('tileset'),
            t.Literal('tilemap'),
            t.Literal('model'),
            t.Literal('texture'),
            t.Literal('sky'),
          ]),
          source: t.Union([t.Literal('new'), t.Literal('existing'), t.Literal('editor')]),
          creationId: nullableText,
          description: text(),
        }),
      ]),
    }),
    { minItems: 1, maxItems: 12 },
  ),
  test: t.Object({ action: text(500), expected: text(500) }),
  references: t.Array(
    t.Object({
      kind: t.Union([t.Literal('lesson'), t.Literal('help'), t.Literal('manual')]),
      id: text(200),
      title: text(200),
      href: nullableText,
    }),
    { maxItems: 12 },
  ),
})

export const PensaJourneyCommandDto = t.Union([
  t.Object({ type: t.Literal('pause') }),
  t.Object({ type: t.Literal('resume') }),
  t.Object({ type: t.Literal('retry') }),
  t.Object({ type: t.Literal('observe') }),
  t.Object({ type: t.Literal('repair') }),
  t.Object({ type: t.Literal('revise') }),
  t.Object({ type: t.Literal('accept'), proposalId: id }),
  t.Object({
    type: t.Literal('record_test'),
    test: t.Object({
      id,
      result: t.Union([t.Literal('met'), t.Literal('needs_adjustment'), t.Literal('inconclusive')]),
      source: t.Literal('child'),
      note: t.String({ maxLength: 2000 }),
      creationId: text(120),
      saveRevision: text(120),
      at: text(40),
    }),
  }),
  t.Object({
    type: t.Literal('close'),
    reason: t.Union([t.Literal('met'), t.Literal('incomplete')]),
  }),
  t.Object({ type: t.Literal('keep_idea'), idea }),
  t.Object({ type: t.Literal('remove_idea'), ideaId: text(100) }),
])

const taskProps = PensaTasksReplaceBody.properties.tasks.items.properties
const { key: _key, ...taskProperties } = taskProps
const newTask = t.Object({
  ...taskProperties,
  // O guia do legado não carrega mais a marca; o da jornada a exige.
  guide: PensaJourneyGuideSchema,
  id,
  position: t.Integer({ minimum: 0, maximum: 20 }),
  summary: t.Union([t.String({ maxLength: 2000 }), t.Null()]),
  dependencies: t.Array(id, { maxItems: 12 }),
  revision: t.Optional(t.Integer({ minimum: 1 })),
  supersedesTaskId: t.Optional(t.Union([id, t.Null()])),
})
export const PensaStepResultDto = t.Union([
  t.Object({
    type: t.Literal('step'),
    step: t.Literal('review'),
    output: t.Record(t.String(), t.Unknown()),
  }),
  t.Object({ type: t.Literal('proposal'), proposal: PensaProposalDto }),
  t.Object({ type: t.Literal('question'), text: text(6000) }),
  t.Object({ type: t.Literal('answer'), text: text(6000) }),
  t.Object({ type: t.Literal('plan'), tasks: t.Array(newTask, { minItems: 1, maxItems: 12 }) }),
])
export const PensaJourneyParams = t.Object({ projectId: id })
export const PensaOperationParams = t.Object({ projectId: id, operationId: id })
export const PensaGenerationStartDto = t.Object({
  id,
  expectedRevision: t.Integer({ minimum: 0 }),
  message: text(4000),
  kind: t.Union([t.Literal('planning'), t.Literal('help'), t.Literal('repair')]),
  context: t.Record(t.String(), t.Unknown()),
})
