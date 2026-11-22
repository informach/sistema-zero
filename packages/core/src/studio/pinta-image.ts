import { z } from 'zod'
import { canonicalJson } from '../creations/content-fingerprint'
import { PYTHON_PINTA_PHYSICS_FEATURE, PYTHON_PINTA_WORLD_FEATURE } from './python-runtime-features'

export const PINTA_IMAGE_ID_PATTERN = /^[^\p{Cc}]+$/u
export const PINTA_IMAGE_WORLD_PNG_PATTERN = /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/
const id = z.string().min(1).max(200).regex(PINTA_IMAGE_ID_PATTERN)
const sha256 = z.string().regex(/^[a-f0-9]{64}$/)
const positiveInteger = z.number().int().positive().max(Number.MAX_SAFE_INTEGER)

/** A map has at most this many layers, so it can use at most this many tilesets (Pinta's
 * `PINTA_LIMITS.maxMapLayers`). Bounds the dependencies of a `map` derivation. */
export const PINTA_IMAGE_MAX_MAP_TILESETS = 32
/** Até 32 folhas, 64 conjuntos e 128 desenhos usados pelos objetos. */
export const PINTA_IMAGE_MAX_MAP_DEPENDENCIES = 224

/** A bounded, self-contained runtime world. Project image quotas still apply independently. */
export const PINTA_IMAGE_WORLD_LIMITS = {
  maps: 16,
  cells: 2_097_152,
  encodedChars: 4 * 1024 * 1024,
  metadataBytes: 16 * 1024 * 1024,
  dimension: 4096,
  imagePixels: 4_194_304,
  totalImagePixels: 16_777_216,
} as const

export const PintaImageWorldSchema = z
  .strictObject({
    version: z.literal(1),
    rootId: id,
    maps: z
      .array(
        z.strictObject({
          id,
          name: z.string().min(1).max(48),
          png: z
            .string()
            .max(PINTA_IMAGE_WORLD_LIMITS.encodedChars)
            .regex(PINTA_IMAGE_WORLD_PNG_PATTERN),
        }),
      )
      .max(PINTA_IMAGE_WORLD_LIMITS.maps - 1),
  })
  .superRefine((world, context) => {
    const ids = world.maps.map((map) => map.id)
    if (new Set([world.rootId, ...ids]).size !== ids.length + 1)
      context.addIssue({
        code: 'custom',
        path: ['maps'],
        message: 'Each map appears once; the root is not nested.',
      })
    if (
      world.maps.reduce((sum, map) => sum + map.png.length, 0) >
      PINTA_IMAGE_WORLD_LIMITS.encodedChars
    )
      context.addIssue({
        code: 'custom',
        path: ['maps'],
        message: 'The linked map images exceed the world budget.',
      })
  })
export type PintaImageWorld = z.infer<typeof PintaImageWorldSchema>

/**
 * Selections whose PNG carries the drawing's own data (animations, tiles, map layers and
 * objects) in one `iTXt` chunk right after `IHDR`: keyword {@link PINTA_IMAGE_DATA_KEYWORD},
 * compression flag 1 (zlib), empty language and translated keyword, UTF-8 JSON text.
 * Always PNG, never SVG.
 */
export const PINTA_IMAGE_DATA_KINDS = ['spritesheet', 'tileset', 'map', 'map-world'] as const
export type PintaImageDataKind = (typeof PINTA_IMAGE_DATA_KINDS)[number]
export const PINTA_IMAGE_DATA_KEYWORD = 'pinta'

/** Selection is positional. A removed animation/frame is an error, never frame zero. */
export const PintaImageRecipeSchema = z
  .strictObject({
    version: z.union([z.literal(1), z.literal(2)]),
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
      // The whole sprite sheet (one row per animation) with its animations embedded.
      z.strictObject({ kind: z.literal('spritesheet') }),
      // The whole tile sheet with its solid/platform marks embedded.
      z.strictObject({ kind: z.literal('tileset') }),
      // An atlas of every tileset the map uses, with its layers and objects embedded.
      z.strictObject({ kind: z.literal('map') }),
      // A complete scene with its linked destinations, kept inside one derived PNG.
      z.strictObject({ kind: z.literal('map-world') }),
    ]),
    // Explicit user choice. Output dimensions round to the nearest pixel; zero is rejected.
    scale: z.number().positive(),
    /** Requested by the DESTINATION (a Pygame Zero project) for a vector drawing. Absent = PNG,
     * so recipes captured before this field keep their exact identity key. */
    output: z.literal('svg').optional(),
  })
  .superRefine((value, context) => {
    if ((value.selection.kind === 'map-world') !== (value.version === 2))
      context.addIssue({
        code: 'custom',
        path: ['version'],
        message: 'Linked worlds require recipe version 2; existing selections keep version 1.',
      })
    if (value.output === 'svg' && isPintaImageDataKind(value.selection.kind))
      context.addIssue({
        code: 'custom',
        path: ['output'],
        message: 'Sheets and maps with embedded Pinta data are always PNG.',
      })
  })
export type PintaImageRecipe = z.infer<typeof PintaImageRecipeSchema>
export type PintaImageSelectionKind = PintaImageRecipe['selection']['kind']

export function isPintaImageDataKind(kind: string): kind is PintaImageDataKind {
  return (PINTA_IMAGE_DATA_KINDS as readonly string[]).includes(kind)
}

/**
 * Which tilesets a selection depends on: none, the map's DEFAULT tileset (the flat `tilemap`
 * image draws only its layers) or EVERY tileset the map uses (`map`). The source fingerprint
 * of a drawing depends on this, so inspecting a drawing names the selection kind.
 */
export type PintaImageDependencyRule = 'none' | 'default-tileset' | 'all-tilesets' | 'linked-maps'
export function pintaImageDependencyRule(kind: PintaImageSelectionKind): PintaImageDependencyRule {
  return kind === 'tilemap'
    ? 'default-tileset'
    : kind === 'map'
      ? 'all-tilesets'
      : kind === 'map-world'
        ? 'linked-maps'
        : 'none'
}

export type PintaImageOutputMime = 'image/png' | 'image/svg+xml'

/** The one rule mapping a recipe to its output format. */
export function pintaImageOutputMime(recipe: PintaImageRecipe): PintaImageOutputMime {
  return recipe.output === 'svg' ? 'image/svg+xml' : 'image/png'
}

/** Opt-in gallery facts from validated native drawings. No source, pixels or write authority.
 * Counts and names retain the Pinta model's bounds; frame/tile indexes remain positional. */
export type PintaImageSelectionSummary =
  | ((
      | { kind: 'background'; width: number; height: number }
      | {
          kind: 'tilemap'
          width: number
          height: number
          /** Size of the `map` atlas (every tileset stacked). Absent = `map` not offered. */
          sheet?: PintaImageSheetSize
        }
      | {
          kind: 'frame'
          width: number
          height: number
          animations: Array<{ id: string; name: string; frameCount: number }>
          /** Size of the whole `spritesheet`. Absent = `spritesheet` not offered. */
          sheet?: PintaImageSheetSize
        }
      | {
          kind: 'tile'
          width: number
          height: number
          tileCount: number
          /** Size of the whole `tileset` sheet. Absent = `tileset` not offered. */
          sheet?: PintaImageSheetSize
        }
    ) & {
      /** True when the selection has a portable vector path (an SVG recipe may be requested). */
      vector?: boolean
      /**
       * True when every frame is made only of shapes a turtle shape can carry (no text, picture
       * or mask): a Turtle project asks for the SVG only then, else the PNG.
       */
      turtleShape?: boolean
    })
  | { kind: 'unavailable'; reason: 'needs-tileset' }

/** Source-pixel size of a whole sheet/atlas, before the recipe scale. */
export interface PintaImageSheetSize {
  width: number
  height: number
}

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
      // Map tilesets in Pinta's order (the map's default first). Only `map` lists more than one.
      dependencies: z
        .array(z.strictObject({ drawingId: id, sha256 }))
        .max(PINTA_IMAGE_MAX_MAP_DEPENDENCIES),
    }),
    output: z.strictObject({
      mime: z.enum(['image/png', 'image/svg+xml']),
      // Legacy outputs keep their exact shape. New structured maps declare their reader.
      dataVersion: z.union([z.literal(2), z.literal(3), z.literal(4)]).optional(),
      width: positiveInteger,
      height: positiveInteger,
      bytes: positiveInteger,
      sha256,
    }),
  })
  .superRefine((value, context) => {
    if (
      value.output.dataVersion !== undefined &&
      !(
        (value.recipe.selection.kind === 'map' &&
          (value.output.dataVersion === 2 || value.output.dataVersion === 4)) ||
        (value.recipe.selection.kind === 'map-world' &&
          (value.output.dataVersion === 3 || value.output.dataVersion === 4))
      )
    ) {
      context.addIssue({
        code: 'custom',
        path: ['output', 'dataVersion'],
        message: 'The structured data version must match the map selection.',
      })
    }
    if (value.output.mime !== pintaImageOutputMime(value.recipe)) {
      context.addIssue({
        code: 'custom',
        path: ['output', 'mime'],
        message: 'The output format must be the one the recipe requested.',
      })
    }
    const count = value.provenance.dependencies.length
    const rule = pintaImageDependencyRule(value.recipe.selection.kind)
    if (
      rule === 'default-tileset'
        ? count !== 1
        : rule === 'all-tilesets'
          ? count < 1 || count > PINTA_IMAGE_MAX_MAP_DEPENDENCIES
          : rule === 'linked-maps'
            ? false // Private resources are already fingerprinted with their containing map.
            : count !== 0
    ) {
      context.addIssue({
        code: 'custom',
        path: ['provenance', 'dependencies'],
        message:
          rule === 'all-tilesets'
            ? 'Map data requires every captured tileset it uses.'
            : 'Map images require exactly their captured tileset.',
      })
    }
    const ids = value.provenance.dependencies.map((dependency) => dependency.drawingId)
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: 'custom',
        path: ['provenance', 'dependencies'],
        message: 'A tileset is listed only once.',
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

/** A derivative's declared reader requirement; no permission is granted by this metadata. */
export function pintaImageRequiredRuntimeFeature(
  image: PintaImageDerivation,
): typeof PYTHON_PINTA_WORLD_FEATURE | typeof PYTHON_PINTA_PHYSICS_FEATURE | undefined {
  if (image.output.dataVersion === 4) return PYTHON_PINTA_PHYSICS_FEATURE
  return image.output.dataVersion !== undefined || image.recipe.selection.kind === 'map-world'
    ? PYTHON_PINTA_WORLD_FEATURE
    : undefined
}

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
