import { z } from 'zod'

/** Grid footprint in world pixels. Atlas frame size remains a tileset property. */
const pixel = z.number().int().min(1).max(128)
const size = { tileWidth: pixel, tileHeight: pixel }

export const PintaMapProjectionSchema = z
  .discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('orthogonal'), ...size }),
    z.strictObject({ kind: z.literal('isometric'), ...size }),
    z.strictObject({
      kind: z.literal('hexagonal'),
      ...size,
      staggerAxis: z.enum(['x', 'y']),
      staggerIndex: z.enum(['even', 'odd']),
      hexSideLength: pixel,
    }),
  ])
  .refine((projection) => {
    if (projection.kind !== 'hexagonal') return true
    const axis = projection.staggerAxis === 'x' ? projection.tileWidth : projection.tileHeight
    const cross = projection.staggerAxis === 'x' ? projection.tileHeight : projection.tileWidth
    return cross >= 2 && projection.hexSideLength <= axis - 2
  })

export type PintaMapProjection = z.infer<typeof PintaMapProjectionSchema>
