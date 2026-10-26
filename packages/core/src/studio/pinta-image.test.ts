import { describe, expect, test } from 'bun:test'
import {
  assertPintaImageDimensions,
  isPintaImageDataKind,
  PINTA_IMAGE_MAX_MAP_TILESETS,
  PintaImageDerivationSchema,
  type PintaImageRecipe,
  PintaImageRecipeSchema,
  pintaImageDependencyRule,
  pintaImageOutputMime,
  pintaImageRecipeKey,
} from './pinta-image'

const recipe = {
  version: 1,
  algorithm: 'pinta-image-1',
  drawingId: 'drawing',
  selection: { kind: 'frame', animationId: 'walk', frameIndex: 1 },
  scale: 1,
} as const
const metadata = {
  recipe,
  provenance: { sourceSha256: 'a'.repeat(64), dependencies: [] },
  output: { mime: 'image/png', width: 16, height: 16, bytes: 72, sha256: 'b'.repeat(64) },
}

describe('Pinta derived image identity', () => {
  test('revision and output changes keep identity; distinct positions/scale do not', () => {
    const before = PintaImageDerivationSchema.parse(metadata)
    const after = PintaImageDerivationSchema.parse({
      ...metadata,
      provenance: { ...metadata.provenance, sourceSha256: 'c'.repeat(64) },
      output: { ...metadata.output, width: 32, sha256: 'd'.repeat(64) },
    })
    expect(pintaImageRecipeKey(before.recipe)).toBe(pintaImageRecipeKey(after.recipe))
    expect(pintaImageRecipeKey({ ...recipe, scale: 2 })).not.toBe(pintaImageRecipeKey(recipe))
    expect(
      pintaImageRecipeKey({ ...recipe, selection: { ...recipe.selection, frameIndex: 0 } }),
    ).not.toBe(pintaImageRecipeKey(recipe))
  })
  test('rejects unknown metadata, missing selections and invented frame identities', () => {
    for (const invalid of [
      { ...recipe, scale: Infinity },
      { ...recipe, scale: 0 },
      { ...recipe, output: metadata.output },
      { ...recipe, selection: { kind: 'frame', animationId: 'walk', frameId: 'stable' } },
    ])
      expect(PintaImageRecipeSchema.safeParse(invalid).success).toBe(false)
    expect(
      PintaImageDerivationSchema.safeParse({
        ...metadata,
        recipe: { ...recipe, selection: { kind: 'tilemap' } },
      }).success,
    ).toBe(false)
    expect(
      PintaImageDerivationSchema.safeParse({
        ...metadata,
        provenance: {
          ...metadata.provenance,
          dependencies: [{ drawingId: 'other', sha256: 'a'.repeat(64) }],
        },
      }).success,
    ).toBe(false)
  })
  test('an SVG recipe is explicit: legacy recipes keep their key, svg gets its own', () => {
    // Recipes captured before the field existed must keep the exact same identity key.
    expect(pintaImageRecipeKey(recipe)).toBe(
      '{"algorithm":"pinta-image-1","drawingId":"drawing","scale":1,"selection":{"animationId":"walk","frameIndex":1,"kind":"frame"},"version":1}',
    )
    const svg = { ...recipe, output: 'svg' as const }
    expect(pintaImageRecipeKey(svg)).not.toBe(pintaImageRecipeKey(recipe))
    expect(pintaImageOutputMime(recipe)).toBe('image/png')
    expect(pintaImageOutputMime(svg)).toBe('image/svg+xml')
    for (const output of ['png', 'SVG', 'image/svg+xml', null])
      expect(PintaImageRecipeSchema.safeParse({ ...recipe, output }).success).toBe(false)
    const svgOutput = { ...metadata.output, mime: 'image/svg+xml' }
    expect(
      PintaImageDerivationSchema.safeParse({ ...metadata, recipe: svg, output: svgOutput }).success,
    ).toBe(true)
    // The mime must be the one the recipe asked for, in both directions.
    expect(PintaImageDerivationSchema.safeParse({ ...metadata, output: svgOutput }).success).toBe(
      false,
    )
    expect(PintaImageDerivationSchema.safeParse({ ...metadata, recipe: svg }).success).toBe(false)
  })
  test('checks the destination quotas independently before allocation', () => {
    const limits = {
      dimension: 4096,
      imagePixels: 4194304,
      totalImagePixels: 16777216,
      imageBytes: 16777216,
      dataUrlChars: 23000000,
    }
    expect(() => assertPintaImageDimensions(4096, 1024, limits)).not.toThrow()
    for (const [width, height] of [
      [4097, 1],
      [2049, 2049],
      [0, 20],
      [1.5, 2],
    ])
      expect(() => assertPintaImageDimensions(width!, height!, limits)).toThrow()
    expect(() => assertPintaImageDimensions(10, 10, { ...limits, totalImagePixels: 99 })).toThrow()
  })
})

describe('Pinta images with embedded data (spritesheet, tileset, map)', () => {
  const data = (selection: PintaImageRecipe['selection'], dependencies: string[] = []) => ({
    recipe: { ...recipe, selection, scale: 2 },
    provenance: {
      sourceSha256: 'a'.repeat(64),
      dependencies: dependencies.map((drawingId) => ({ drawingId, sha256: 'c'.repeat(64) })),
    },
    output: metadata.output,
  })
  test('the new kinds parse, keep their own identity and never request SVG', () => {
    for (const kind of ['spritesheet', 'tileset', 'map'] as const) {
      const sheet = { ...recipe, selection: { kind } }
      expect(PintaImageRecipeSchema.safeParse(sheet).success).toBe(true)
      expect(pintaImageRecipeKey(sheet)).toBe(
        `{"algorithm":"pinta-image-1","drawingId":"drawing","scale":1,"selection":{"kind":"${kind}"},"version":1}`,
      )
      expect(isPintaImageDataKind(kind)).toBe(true)
      expect(PintaImageRecipeSchema.safeParse({ ...sheet, output: 'svg' }).success).toBe(false)
      expect(pintaImageOutputMime(sheet)).toBe('image/png')
      // Extra selection fields stay rejected (the union members are strict).
      expect(
        PintaImageRecipeSchema.safeParse({ ...recipe, selection: { kind, tileIndex: 0 } }).success,
      ).toBe(false)
    }
    for (const kind of ['background', 'frame', 'tile', 'tilemap'])
      expect(isPintaImageDataKind(kind)).toBe(false)
    // The flat kinds still accept the SVG output of a Pygame Zero vector drawing.
    expect(
      PintaImageRecipeSchema.safeParse({ ...recipe, selection: { kind: 'tilemap' }, output: 'svg' })
        .success,
    ).toBe(true)
  })
  test('dependency rule per kind: none, the default tileset, or every tileset (1..8)', () => {
    expect(pintaImageDependencyRule('frame')).toBe('none')
    expect(pintaImageDependencyRule('spritesheet')).toBe('none')
    expect(pintaImageDependencyRule('tileset')).toBe('none')
    expect(pintaImageDependencyRule('tilemap')).toBe('default-tileset')
    expect(pintaImageDependencyRule('map')).toBe('all-tilesets')
    const ok = (value: unknown) => PintaImageDerivationSchema.safeParse(value).success
    expect(ok(data({ kind: 'spritesheet' }))).toBe(true)
    expect(ok(data({ kind: 'tileset' }))).toBe(true)
    expect(ok(data({ kind: 'spritesheet' }, ['t1']))).toBe(false)
    expect(ok(data({ kind: 'tileset' }, ['t1']))).toBe(false)
    expect(ok(data({ kind: 'map' }))).toBe(false)
    expect(ok(data({ kind: 'map' }, ['t1']))).toBe(true)
    const eight = Array.from({ length: PINTA_IMAGE_MAX_MAP_TILESETS }, (_, i) => `t${i}`)
    expect(ok(data({ kind: 'map' }, eight))).toBe(true)
    expect(ok(data({ kind: 'map' }, [...eight, 't9']))).toBe(false)
    expect(ok(data({ kind: 'map' }, ['t1', 't1']))).toBe(false)
    expect(ok(data({ kind: 'map' }, ['t1', 'drawing']))).toBe(false)
    // The flat map image keeps "exactly its captured tileset".
    expect(ok(data({ kind: 'tilemap' }, ['t1']))).toBe(true)
    expect(ok(data({ kind: 'tilemap' }, ['t1', 't2']))).toBe(false)
  })
})
