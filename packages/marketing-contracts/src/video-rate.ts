import { z } from 'zod'

export const fpsSchema = z
  .object({
    numerator: z.number().int().min(1).max(60000),
    denominator: z.number().int().min(1).max(1001),
  })
  .strict()
  .refine(
    (value) =>
      value.numerator / value.denominator >= 1 && value.numerator / value.denominator <= 120,
    'FPS fora do limite',
  )
