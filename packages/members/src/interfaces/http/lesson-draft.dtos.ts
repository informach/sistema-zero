import { ValidationError } from '@sistemazero/core/errors'
import type { LessonDraftCommand } from '@sistemazero/core/learning'
import { getSchemaValidator, type TSchema, t } from 'elysia'
import type { LessonBlockContent } from '../../domain/course/lesson-block'
import { LESSON_BLOCK_KINDS } from '../../domain/course/lesson-block'
import { LessonBlockContentSchema } from './dtos'
import { LessonSectionSchema } from './learning.dtos'

/** Keep the editor's structural contract while allowing unfinished text, choices and URLs. */
function authoringSchema(schema: TSchema): TSchema {
  const result = { ...schema }
  delete result.minLength
  delete result.minItems
  delete result.pattern
  delete result.format
  if (schema.properties)
    result.properties = Object.fromEntries(
      Object.entries<TSchema>(schema.properties).map(([key, value]) => [
        key,
        authoringSchema(value),
      ]),
    )
  if (schema.items && !Array.isArray(schema.items)) result.items = authoringSchema(schema.items)
  for (const key of ['anyOf', 'allOf', 'oneOf'])
    if (schema[key]) result[key] = schema[key].map(authoringSchema)
  if (schema.patternProperties)
    result.patternProperties = Object.fromEntries(
      Object.entries<TSchema>(schema.patternProperties).map(([key, value]) => [
        key,
        authoringSchema(value),
      ]),
    )
  return result
}
const draftBlockValidator = getSchemaValidator(authoringSchema(LessonBlockContentSchema))

const Id = t.String({ format: 'uuid' })
const DraftSection = t.Object({
  ...LessonSectionSchema.properties,
  title: t.String({ maxLength: 200 }),
})
const Attachment = t.Object({
  id: Id,
  label: t.String({ maxLength: 200 }),
  url: t.String({ maxLength: 4000 }),
  fileType: t.Union([t.String({ maxLength: 100 }), t.Null()]),
  sizeBytes: t.Union([t.Integer({ minimum: 0, maximum: 2147483647 }), t.Null()]),
})
const Video = t.Object({
  blockId: Id,
  instructions: t.String({ maxLength: 5000 }),
  videoId: t.Union([t.String({ pattern: '^[0-9]{1,20}$' }), t.Null()]),
})
export const DraftCommandSchema = t.Object({
  expectedRevision: Id,
  operationId: Id,
  change: t.Union([
    t.Object({
      type: t.Literal('block'),
      block: t.Object({
        id: Id,
        content: t.Object(
          { kind: t.Union(LESSON_BLOCK_KINDS.map((kind) => t.Literal(kind))) },
          { additionalProperties: true },
        ),
      }),
      sectionId: t.Optional(t.Union([Id, t.Null()])),
    }),
    t.Object({ type: t.Literal('remove-block'), blockId: Id }),
    t.Object({
      type: t.Literal('structure'),
      sections: t.Array(DraftSection, { maxItems: 60 }),
      supportBlockIds: t.Array(Id, { maxItems: 200 }),
    }),
    t.Object({
      type: t.Literal('metadata'),
      title: t.String({ maxLength: 200 }),
      slug: t.String({ maxLength: 200 }),
      estimatedMinutes: t.Union([t.Integer({ minimum: 0, maximum: 10000 }), t.Null()]),
    }),
    t.Object({
      type: t.Literal('attachments'),
      attachments: t.Array(Attachment, { maxItems: 100 }),
    }),
    t.Object({
      type: t.Literal('planned-videos'),
      plannedVideos: t.Array(Video, { maxItems: 200 }),
    }),
  ]),
})
export const DraftPublishSchema = t.Object({
  expectedRevision: Id,
  operationId: Id,
  /** Server BFF checks Vimeo processing before forwarding these ids. */
  readyVideoIds: t.Array(t.String({ pattern: '^[0-9]{1,20}$' }), { maxItems: 200 }),
})
const publishedBlockValidator = getSchemaValidator(LessonBlockContentSchema)
export function parsePublishedLessonBlock(value: unknown): LessonBlockContent {
  // Legacy embed metadata is ignored by the player; validate its current HTML contract.
  if (value && typeof value === 'object' && 'kind' in value && value.kind === 'embed') {
    value = Object.fromEntries(
      Object.entries(value).filter(([key]) => !['embedType', 'src', 'height'].includes(key)),
    )
  }
  const result = publishedBlockValidator.safeParse(value)
  if (!result.success)
    throw new ValidationError('Preencha os campos obrigatórios deste bloco antes de publicar.')
  return result.data
}
// The JSON object remains open while authoring, but its discriminant is always retained.
export function draftCommand(value: typeof DraftCommandSchema.static): LessonDraftCommand {
  if (value.change.type === 'block' && !draftBlockValidator.Check(value.change.block.content))
    throw new ValidationError(
      'O bloco precisa manter os campos do seu tipo. Textos e respostas podem ficar vazios no rascunho.',
    )
  return value
}
