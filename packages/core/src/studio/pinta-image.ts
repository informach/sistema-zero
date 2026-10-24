import { z } from 'zod'
import { canonicalJson } from '../creations/content-fingerprint'

const id = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[^\p{Cc}]+$/u)
const sha256 = z.string().regex(/^[a-f0-9]{64}$/)
const positiveInteger = z.number().int().positive().max(Number.MAX_SAFE_INTEGER)

/** Selection is positional. A removed animation/frame is an error, never frame zero. */
export const PintaImageRecipeSchema = z.strictObject({
  version: z.literal(1),
  algorithm: z.literal('pinta-image-1'),
  drawingId: id,
  selection: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('background') }),
    z.strictObject({
      kind: z.literal('frame'),
      animationId: id,
      frameIndex: z.number().int().nonnegative(),
    }),
    z.strictObject({ kind: z.literal('tile'), tileIndex: z.number().int().nonnegative() }),
    z.strictObject({ kind: z.literal('tilemap') }),
  ]),
  // Explicit user choice. Output dimensions round to the nearest pixel; zero is rejected.
  scale: z.number().positive(),
  /** Requested by the DESTINATION (a Pygame Zero project) for a vector drawing. Absent = PNG,
   * so recipes captured before this field keep their exact identity key. */
  output: z.literal('svg').optional(),
})
export type PintaImageRecipe = z.infer<typeof PintaImageRecipeSchema>

export type PintaImageOutputMime = 'image/png' | 'image/svg+xml'

/** The one rule mapping a recipe to its output format. */
export function pintaImageOutputMime(recipe: PintaImageRecipe): PintaImageOutputMime {
  return recipe.output === 'svg' ? 'image/svg+xml' : 'image/png'
}

/** Opt-in gallery facts from validated native drawings. No source, pixels or write authority.
 * Counts and names retain the Pinta model's bounds; frame/tile indexes remain positional. */
export type PintaImageSelectionSummary =
  | ((
      | { kind: 'background' | 'tilemap'; width: number; height: number }
      | {
          kind: 'frame'
          width: number
          height: number
          animations: Array<{ id: string; name: string; frameCount: number }>
        }
      | { kind: 'tile'; width: number; height: number; tileCount: number }
    ) & {
      /** True when the selection has a portable vector path (an SVG recipe may be requested). */
      vector?: boolean
    })
  | { kind: 'unavailable'; reason: 'needs-tileset' }

/** Supplied by the destination, including its remaining aggregate pixel budget. No defaults. */
export const PintaImageTargetLimitsSchema = z.strictObject({
  dimension: positiveInteger,
  imagePixels: positiveInteger,
  totalImagePixels: positiveInteger,
  imageBytes: positiveInteger,
  dataUrlChars: positiveInteger,
})
export type PintaImageTargetLimits = z.infer<typeof PintaImageTargetLimitsSchema>

export const PintaImageDerivationSchema = z
  .strictObject({
    recipe: PintaImageRecipeSchema,
    provenance: z.strictObject({
      // SHA of the exact native .pinta.json snapshot; includes all source data, not updatedAt alone.
      sourceSha256: sha256,
      dependencies: z.array(z.strictObject({ drawingId: id, sha256 })).max(1),
    }),
    output: z.strictObject({
      mime: z.enum(['image/png', 'image/svg+xml']),
      width: positiveInteger,
      height: positiveInteger,
      bytes: positiveInteger,
      sha256,
    }),
  })
  .superRefine((value, context) => {
    if (value.output.mime !== pintaImageOutputMime(value.recipe)) {
      context.addIssue({
        code: 'custom',
        path: ['output', 'mime'],
        message: 'The output format must be the one the recipe requested.',
      })
    }
    if (
      value.provenance.dependencies.length !== (value.recipe.selection.kind === 'tilemap' ? 1 : 0)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['provenance', 'dependencies'],
        message: 'Map images require exactly their captured tileset.',
      })
    }
    if (
      value.provenance.dependencies.some(
        (dependency) => dependency.drawingId === value.recipe.drawingId,
      )
    ) {
      context.addIssue({
        code: 'custom',
        path: ['provenance', 'dependencies'],
        message: 'A drawing cannot be its own tileset.',
      })
    }
  })
export type PintaImageDerivation = z.infer<typeof PintaImageDerivationSchema>

/** Identity excludes source revision/fingerprint and all output properties. */
export function pintaImageRecipeKey(input: PintaImageRecipe): string {
  return canonicalJson(PintaImageRecipeSchema.parse(input))
}

export function assertPintaImageDimensions(
  width: number,
  height: number,
  limits: PintaImageTargetLimits,
): void {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > limits.dimension ||
    height > limits.dimension ||
    width * height > limits.imagePixels ||
    width * height > limits.totalImagePixels
  ) {
    throw new Error('A imagem ultrapassa o limite de resolução do projeto. Escolha outra escala.')
  }
}
