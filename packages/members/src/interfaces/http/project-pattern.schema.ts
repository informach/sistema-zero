import { t } from 'elysia'

const values = () =>
  t.Record(
    t.String({ minLength: 1, maxLength: 200 }),
    t.Union([t.String({ maxLength: 200 }), t.Number(), t.Boolean()]),
    { maxProperties: 20 },
  )
const base = () => ({
  // Empty selections are valid drafts; publication requires a selected block.
  blockType: t.String({ maxLength: 200 }),
  fields: t.Optional(values()),
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
