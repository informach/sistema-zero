import { expect, test } from 'bun:test'
import {
  PintaPaletteBaseSchema,
  PintaPaletteHeadSchema,
  PintaPaletteTicketSchema,
  pintaPaletteBlobKey,
  PINTA_PALETTE_WRITE_PROTOCOL as protocol,
} from './pinta-palette-writer'

const generation = '11111111-1111-4111-8111-111111111111'
const nonce = '22222222-2222-4222-8222-222222222222'

test('absence has a zero revision and preserves an adopted generation', () => {
  const absent = { protocol, generation: null, revision: 0, exists: false, adopted: false }
  expect(PintaPaletteHeadSchema.parse(absent)).toEqual(absent)
  expect(PintaPaletteHeadSchema.safeParse({ ...absent, adopted: true }).success).toBe(false)
  expect(PintaPaletteHeadSchema.safeParse({ ...absent, generation, adopted: true }).success).toBe(
    true,
  )
  expect(PintaPaletteHeadSchema.safeParse({ ...absent, revision: 1 }).success).toBe(false)
  expect(PintaPaletteHeadSchema.safeParse({ ...absent, exists: true, revision: 1 }).success).toBe(
    false,
  )
})

test('explicit write capability is separate from a confirmed read', () => {
  expect(PintaPaletteBaseSchema.safeParse({ baseGeneration: generation }).success).toBe(false)
  expect(PintaPaletteBaseSchema.safeParse({ protocol, generation }).success).toBe(false)
  expect(PintaPaletteBaseSchema.parse({ protocol, baseGeneration: null })).toEqual({
    protocol,
    baseGeneration: null,
  })
})

test('sealed and staging keys are scoped and avoid the legacy revision address', () => {
  const ticket = PintaPaletteTicketSchema.parse({
    protocol,
    nonce,
    baseGeneration: generation,
    baseRevision: 1,
    revision: 2,
    expiresAt: '2026-11-22T18:00:00.000Z',
    itemUpdatedAt: '2026-11-22T17:59:00.000Z',
    bytes: 200,
  })
  const actor = { userId: generation, audience: 'adult' } as const
  const prefix = `creations/adult/${generation}/pinta/sz-pinta-palettes/units/${nonce}`
  expect(pintaPaletteBlobKey(actor, ticket, 'upload')).toBe(`${prefix}/2.upload.gz`)
  expect(pintaPaletteBlobKey(actor, ticket, 'sealed')).toBe(`${prefix}/2.sealed.gz`)
  expect(pintaPaletteBlobKey({ ...actor, audience: 'kids' }, ticket, 'sealed')).not.toBe(
    `${prefix}/2.sealed.gz`,
  )
})
