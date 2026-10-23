import { describe, expect, test } from 'bun:test'
import {
  assertPintaImageDimensions,
  PintaImageDerivationSchema,
  PintaImageRecipeSchema,
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
