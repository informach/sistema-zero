import { expect, test } from 'bun:test'
import { compositeSceneImage, compositeSceneImageRegion, type SceneRgba } from './composite'
import type { SceneImage } from './document'
import { changedSceneImageRegion, prepareSceneImageRaster } from './imageRaster'

function fixture(encoding: SceneImage['encoding']): SceneImage {
  return {
    id: 'image',
    name: 'Imagem',
    width: 7,
    height: 5,
    encoding,
    layers: [
      {
        id: 'bottom',
        name: 'Fundo',
        opacity: 0.37,
        visible: true,
        pixels: new Uint8Array(35 * (encoding === 'rgba' ? 4 : 1)).fill(1),
      },
      {
        id: 'top',
        name: 'Frente',
        opacity: 0.63,
        visible: true,
        pixels: new Uint8Array(35 * (encoding === 'rgba' ? 4 : 1)),
      },
    ],
  }
}
const palette: SceneRgba[] = [
  [0, 0, 0, 0],
  [0.7, 0.2, 0.1, 1],
  [0.3, 0.8, 0.5, 1],
]
const base: SceneRgba = [0.2, 0.4, 0.6, 0.4]

test.each([
  'indexed',
  'rgba',
] as const)('%s region comparison includes every changed byte, ignores equal clones and hidden paint', (encoding) => {
  const source = fixture(encoding)
  const channels = encoding === 'rgba' ? 4 : 1
  const next = structuredClone(source)
  expect(changedSceneImageRegion(source, next)).toBeNull()
  next.layers[1]!.pixels[(1 * 7 + 2) * channels + channels - 1] = 2
  next.layers[1]!.pixels[(3 * 7 + 5) * channels] = 2
  expect(changedSceneImageRegion(source, next)).toEqual({ x0: 2, y0: 1, x1: 5, y1: 3 })
  source.layers[1]!.visible = false
  next.layers[1]!.visible = false
  expect(changedSceneImageRegion(source, next)).toBeNull()
  next.layers[1]!.visible = true
  expect(changedSceneImageRegion(source, next)).toBe('all')
  expect(changedSceneImageRegion(source, { ...source, width: 8 })).toBe('all')
  expect(changedSceneImageRegion(source, { ...source, layers: [...source.layers].reverse() })).toBe(
    'all',
  )
})

test.each([
  'indexed',
  'rgba',
] as const)('%s patches and reverse patches exactly reconstruct full source-over composition', (encoding) => {
  let image = fixture(encoding)
  const channels = encoding === 'rgba' ? 4 : 1
  const paletteKey = JSON.stringify(palette)
  let raster = compositeSceneImage(image, palette, base)
  for (let step = 0; step < 80; step++) {
    const before = image
    const next = structuredClone(image)
    const offset = ((step * 11) % 35) * channels
    next.layers[step % 2]!.pixels[offset] = encoding === 'indexed' ? step % 3 : (step * 17) % 256
    if (channels === 4) next.layers[step % 2]!.pixels[offset + 3] = (step * 23) % 256
    for (const [source, previous] of [
      [next, before],
      [before, next],
      [next, before],
    ] as const) {
      const patch = prepareSceneImageRaster({ image: source, paletteKey, base }, palette, {
        image: previous,
        paletteKey,
        base,
      })
      if (patch?.region) {
        const r = patch.region,
          width = r.x1 - r.x0 + 1
        for (let y = r.y0; y <= r.y1; y++)
          raster.set(
            patch.pixels.subarray((y - r.y0) * width * 4, (y - r.y0 + 1) * width * 4),
            (y * 7 + r.x0) * 4,
          )
      } else if (patch) raster = patch.pixels
      expect(raster).toEqual(compositeSceneImage(source, palette, base))
    }
    image = next
  }
})

test('opacity/palette/base changes force complete composition; names and equal bytes do not', () => {
  const image = fixture('indexed'),
    paletteKey = JSON.stringify(palette)
  const previous = { image, paletteKey, base }
  const nameOnly = {
    ...image,
    name: 'Nome novo',
    layers: image.layers.map((layer) => ({ ...layer, name: 'Outro nome' })),
  }
  expect(prepareSceneImageRaster({ ...previous, image: nameOnly }, palette, previous)).toBeNull()
  for (const source of [
    { ...previous, paletteKey: 'changed' },
    { ...previous, base: [0, 0, 0, 0] as SceneRgba },
    {
      ...previous,
      image: { ...image, layers: image.layers.map((layer) => ({ ...layer, opacity: 1 })) },
    },
  ]) {
    const patch = prepareSceneImageRaster(source, palette, previous)!
    expect(patch.region).toBeUndefined()
    expect(patch.pixels.length).toBe(7 * 5 * 4)
  }
  const full = compositeSceneImage(image, palette, base)
  const patch = compositeSceneImageRegion(image, palette, base, { x0: 2, y0: 1, x1: 3, y1: 2 })
  expect(patch).toEqual(new Uint8Array([...full.slice(36, 44), ...full.slice(64, 72)]))
  expect(() =>
    compositeSceneImageRegion(image, palette, base, { x0: -1, y0: 0, x1: 1, y1: 1 }),
  ).toThrow()
})
