import { z } from 'zod'

export const MORADA_LIMITS = { instances: 600, rooms: 64, bytes: 512 * 1024, extent: 1000 } as const
const id = z.string().min(1).max(160)
const coordinate = z.number().finite().min(-MORADA_LIMITS.extent).max(MORADA_LIMITS.extent)
const vector = z.tuple([coordinate, coordinate, coordinate])
const size = z.tuple([z.number().positive().max(500), z.number().positive().max(500)])
const color = z.string().regex(/^#[\da-fA-F]{6}$/)
export const MoradaHouseSchema = z.strictObject({
  migrations: z.array(z.literal('arquipelago-functions-v1')).max(1).optional(),
  version: z.literal(1),
  roomId: id,
  lot: z.strictObject({ size }),
  rooms: z
    .array(
      z.strictObject({
        id,
        label: z.string().min(1).max(100),
        origin: vector,
        size,
        lighting: z.enum(['dia', 'tarde', 'noite', 'neon-rosa', 'neon-ciano', 'festa']).optional(),
      }),
    )
    .min(1)
    .max(MORADA_LIMITS.rooms),
  instances: z
    .array(
      z.strictObject({
        id,
        pieceId: id,
        position: vector,
        rotation: z
          .number()
          .finite()
          .min(-Math.PI * 2)
          .max(Math.PI * 2),
        roomId: id.optional(),
        parentId: id.optional(),
        slotId: id.optional(),
        colors: z.record(z.string().max(100), color).optional(),
        materials: z
          .record(
            z.string().max(100),
            z.strictObject({ color: color.optional(), texture: id.optional() }),
          )
          .optional(),
        behavior: z.string().min(1).max(100).optional(),
      }),
    )
    .max(MORADA_LIMITS.instances),
  pet: id.nullable(),
})
