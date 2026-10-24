import { expect, test } from 'bun:test'
import type { ProjectAsset } from '#core'
import { assertPintaImageFits, pintaImageTargetLimits } from '../../asset-library/pintaImageTarget'
import {
  TURTLE_GRAPHICS_LIMITS,
  TURTLE_IMAGE_DIMENSION_LIMIT,
} from '../../runtime/python/turtle/graphicsProtocol'

const dataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jH1QAAAAASUVORK5CYII='
const asset: ProjectAsset = {
  id: 'existing',
  name: 'existing',
  kind: 'image',
  source: 'upload',
  dataUrl,
  width: 0,
  height: 0,
}
const preview = () => ({
  dataUrl,
  derivation: {
    recipe: {
      version: 1 as const,
      algorithm: 'pinta-image-1' as const,
      drawingId: 'drawing',
      selection: { kind: 'background' as const },
      scale: 1,
    },
    provenance: { sourceSha256: 'a'.repeat(64), dependencies: [] },
    output: {
      mime: 'image/png' as const,
      width: 1,
      height: 1,
      bytes: Buffer.from(dataUrl.split(',')[1]!, 'base64').length,
      sha256: 'b'.repeat(64),
    },
  },
})

test('uses the shared target quotas and actual PNG dimensions, returning budget only for the replaced material', () => {
  const limits = pintaImageTargetLimits([asset])
  expect(limits.dimension).toBe(TURTLE_IMAGE_DIMENSION_LIMIT)
  expect(limits.imagePixels).toBe(TURTLE_GRAPHICS_LIMITS.imagePixels)
  expect(limits.totalImagePixels).toBe(TURTLE_GRAPHICS_LIMITS.totalImagePixels - 1)
  expect(pintaImageTargetLimits([asset], asset.id).totalImagePixels).toBe(
    TURTLE_GRAPHICS_LIMITS.totalImagePixels,
  )
  // The same object with changed bytes cannot reuse a previous measurement.
  const mutable = { ...asset }
  pintaImageTargetLimits([mutable])
  mutable.dataUrl = 'data:image/png;base64,AAAA'
  expect(() => pintaImageTargetLimits([mutable])).toThrow()
})

test('PNG binary bytes and encoded character limits are independent; malformed/remote previews never render', () => {
  const limits = pintaImageTargetLimits([])
  expect(() => assertPintaImageFits(preview(), limits)).not.toThrow()
  expect(() => assertPintaImageFits(preview(), { ...limits, imageBytes: 1 })).toThrow()
  expect(() =>
    assertPintaImageFits(preview(), { ...limits, dataUrlChars: dataUrl.length - 1 }),
  ).toThrow()
  expect(() =>
    assertPintaImageFits({ ...preview(), dataUrl: 'https://example.invalid/a.png' }, limits),
  ).toThrow()
  const forged = preview()
  forged.derivation.output.width = 2
  expect(() => assertPintaImageFits(forged, limits)).toThrow()
  forged.derivation.output.width = 1
  forged.derivation.output.bytes += 1
  expect(() => assertPintaImageFits(forged, limits)).toThrow()
})

test('an SVG preview (Pygame Zero) must say its output size in the root and keep its exact bytes', () => {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="24" viewBox="0 0 16 12"><rect width="16" height="12"/></svg>'
  const svgPreview = () => {
    const base = preview()
    return {
      dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
      derivation: {
        ...base.derivation,
        recipe: { ...base.derivation.recipe, output: 'svg' as const },
        output: {
          ...base.derivation.output,
          mime: 'image/svg+xml' as const,
          width: 32,
          height: 24,
          bytes: Buffer.byteLength(svg),
        },
      },
    }
  }
  const limits = pintaImageTargetLimits([])
  expect(() => assertPintaImageFits(svgPreview(), limits)).not.toThrow()
  // Over the destination budget: refused with a clear message, never turned into a PNG.
  expect(() => assertPintaImageFits(svgPreview(), { ...limits, imageBytes: 10 })).toThrow(
    'O desenho vetorial ultrapassa o espaço disponível no projeto.',
  )
  const resized = svgPreview()
  resized.derivation.output.width = 16
  expect(() => assertPintaImageFits(resized, limits)).toThrow()
  // A PNG data URL cannot pass as the SVG the recipe asked for (and vice versa).
  expect(() => assertPintaImageFits({ ...svgPreview(), dataUrl }, limits)).toThrow()
  expect(() =>
    assertPintaImageFits({ ...preview(), dataUrl: svgPreview().dataUrl }, limits),
  ).toThrow()
})
