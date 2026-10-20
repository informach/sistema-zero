import { ValidationError } from '@sistemazero/core/errors'
import { isProjectBlockPattern } from '@sistemazero/core/learning'
import { t } from 'elysia'

const values = () =>
  t.Record(
    t.String({ minLength: 1, maxLength: 200 }),
    t.Union([t.String({ maxLength: 200 }), t.Number(), t.Boolean()]),
    { maxProperties: 20 },
  )
/**
 * Accepted names for a field (e.g. the lit lighthouse images). Declared explicitly: without it the
 * Elysia normalization dropped the list in silence and the rule accepted any value. The core guard
 * (`isProjectBlockPattern`) still rejects a key present in both `fields` and `fieldOptions`.
 */
export const fieldOptionsSchema = () =>
  t.Record(
    t.String({ minLength: 1, maxLength: 200 }),
    t.Array(t.String({ minLength: 1, maxLength: 200 }), { minItems: 1, maxItems: 50 }),
    { maxProperties: 20 },
  )
// Keep the raw maps until the canonical guard checks them: normalization must not
// remove a misspelled bound or flag and silently widen an objective.
export const fieldRangesSchema = () =>
  t
    .Transform(t.Unknown())
    .Decode((value) => {
      const pattern = { blockType: '', fieldRanges: value }
      if (!isProjectBlockPattern(pattern))
        throw new ValidationError('O intervalo do campo é inválido.')
      return pattern.fieldRanges
    })
    .Encode((value) => value)
export const fieldTextSchema = () =>
  t
    .Transform(t.Unknown())
    .Decode((value) => {
      const pattern = { blockType: '', fieldText: value }
      if (!isProjectBlockPattern(pattern))
        throw new ValidationError('O critério de texto do campo é inválido.')
      return pattern.fieldText
    })
    .Encode((value) => value)
const base = () => ({
  // Empty selections are valid drafts; publication requires a selected block.
  blockType: t.String({ maxLength: 200 }),
  fields: t.Optional(values()),
  fieldOptions: t.Optional(fieldOptionsSchema()),
  fieldRanges: t.Optional(fieldRangesSchema()),
  fieldText: t.Optional(fieldTextSchema()),
  inputs: t.Optional(values()),
  beforeBlock: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
})
// The core guard also limits the entire pattern to 64 nodes and rejects literal/socket conflicts.
const pattern = () => t.Object(base())
// Declare this forbidden property explicitly: Elysia removes unknown properties
// during normalization, which would otherwise silently weaken a deep criterion.
const p4 = t.Object({ ...base(), inputBlocks: t.Optional(t.Never()) })
const nested = <T extends ReturnType<typeof pattern>>(child: T) =>
  t.Object({
    ...base(),
    inputBlocks: t.Optional(
      t.Record(t.String({ minLength: 1, maxLength: 200 }), child, { maxProperties: 20 }),
    ),
  })
const p3 = nested(p4)
const p2 = nested(p3)
const p1 = nested(p2)
export const ProjectBlockRelationshipsSchema = {
  count: t.Optional(t.Integer({ minimum: 0, maximum: 200_000 })),
  beforeBlock: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
  inputBlocks: t.Optional(
    t.Record(t.String({ minLength: 1, maxLength: 200 }), p1, { maxProperties: 20 }),
  ),
}
