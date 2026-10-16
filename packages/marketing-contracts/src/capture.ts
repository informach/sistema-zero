import { z } from 'zod'

const battlerSchema = z
  .object({
    name: z.string().max(200),
    hp: z.number(),
    max: z.number().positive(),
    energy: z.number(),
    availableMoves: z
      .array(
        z
          .object({ name: z.string().max(200), cost: z.number().nonnegative(), heal: z.boolean() })
          .strict(),
      )
      .max(100),
    alive: z.boolean(),
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
  })
  .strict()
export const captureObservationSchema = z
  .object({
    battle: z
      .object({
        phase: z.string().max(100),
        actor: z.string().max(200),
        menuIndex: z.number().int(),
        menuLabels: z.array(z.string().max(300)).max(100),
        allies: z.array(battlerSchema).max(30),
        foes: z.array(battlerSchema).max(30),
      })
      .strict()
      .nullable(),
    canvas: z
      .object({
        x: z.number(),
        y: z.number(),
        width: z.number().positive(),
        height: z.number().positive(),
        pixelWidth: z.number().positive(),
        pixelHeight: z.number().positive(),
      })
      .strict()
      .nullable(),
  })
  .strict()
export type CaptureObservation = z.infer<typeof captureObservationSchema>
export const capturePlanSchema = z
  .object({
    schemaVersion: z.literal(1),
    kind: z.literal('capture'),
    view: z.enum(['runtime', 'blocks']),
    width: z.number().int().min(240).max(1920),
    height: z.number().int().min(160).max(1920),
    steps: z
      .array(
        z.union([
          z
            .object({ action: z.literal('wait'), frames: z.number().int().min(1).max(300) })
            .strict(),
          z
            .object({
              action: z.literal('key'),
              key: z.enum([
                'ArrowLeft',
                'ArrowRight',
                'ArrowUp',
                'ArrowDown',
                'Space',
                'Enter',
                'a',
                'd',
                'w',
                's',
              ]),
              frames: z.number().int().min(1).max(300),
            })
            .strict(),
          z.object({ action: z.literal('start') }).strict(),
          z
            .object({
              action: z.literal('battle'),
              target: z.string().min(1).max(200),
              lifeBelow: z.number().gt(0).lt(1),
              attack: z.string().min(1).max(100),
              heal: z.string().min(1).max(100),
              healBelow: z.number().gt(0).lt(1),
              maxTurns: z.number().int().min(1).max(30),
            })
            .strict(),
          z
            .object({ action: z.literal('click'), text: z.string().trim().min(1).max(100) })
            .strict(),
          z
            .object({
              action: z.literal('point'),
              x: z.number().min(0).max(1),
              y: z.number().min(0).max(1),
            })
            .strict(),
        ]),
      )
      .max(20),
  })
  .strict()
  .refine(
    (value) =>
      value.steps.reduce((total, step) => total + ('frames' in step ? step.frames : 0), 0) <= 600,
    'A captura aceita até 600 quadros de ações',
  )
export type CapturePlan = z.infer<typeof capturePlanSchema>
