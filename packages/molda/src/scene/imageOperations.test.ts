import { expect, test } from 'bun:test'
import type { SceneImage } from './document'
import { convertSceneImageRgba, fillSceneImage, readSceneImageOperation } from './imageOperations'

function indexed(width: number, height: number, pixels: number[]): SceneImage {
  return {
    id: 'image',
    name: 'Imagem',
    width,
    height,
    encoding: 'indexed',
    layers: [
      { id: 'layer', name: 'Camada', visible: true, opacity: 0.5, pixels: new Uint8Array(pixels) },
    ],
  }
}
test('fill has four-connected exact index semantics, no row wrap, and retains other layers by reference', () => {
  const image = indexed(3, 3, [1, 1, 2, 2, 2, 1, 1, 2, 1])
  image.layers.push({ ...image.layers[0]!, id: 'other' })
  const result = fillSceneImage(
    image,
    { kind: 'fill', layerId: 'layer', point: [0, 0], color: 3, tolerance: 0 },
    4,
  )
  expect([...result.layers[0]!.pixels]).toEqual([3, 3, 2, 2, 2, 1, 1, 2, 1])
  expect([...image.layers[0]!.pixels]).toEqual([1, 1, 2, 2, 2, 1, 1, 2, 1])
  expect(result.layers[0]!.opacity).toBe(0.5)
  expect(result.layers[1]).toBe(image.layers[1])
  expect(
    fillSceneImage(
      image,
      { kind: 'fill', layerId: 'layer', point: [0, 0], color: 1, tolerance: 0 },
      4,
    ),
  ).toBe(image)
})

test('RGBA fill compares all four original channels against the seed, without growing tolerance transitively', () => {
  const image: SceneImage = { ...indexed(4, 1, []), encoding: 'rgba' }
  image.layers[0]!.pixels = new Uint8Array([
    10, 20, 30, 80, 15, 25, 35, 85, 20, 30, 40, 90, 10, 20, 30, 255,
  ])
  const result = fillSceneImage(
    image,
    { kind: 'fill', layerId: 'layer', point: [0, 0], color: [100, 200, 50, 0], tolerance: 5 },
    1,
  )
  expect([...result.layers[0]!.pixels]).toEqual([
    100, 200, 50, 0, 100, 200, 50, 0, 20, 30, 40, 90, 10, 20, 30, 255,
  ])
  // Same seed color with a non-zero tolerance still changes its different neighbors.
  const same = fillSceneImage(
    image,
    { kind: 'fill', layerId: 'layer', point: [0, 0], color: [10, 20, 30, 80], tolerance: 5 },
    1,
  )
  expect([...same.layers[0]!.pixels.slice(4, 8)]).toEqual([10, 20, 30, 80])
})

test('bounded fill agrees with independent small-grid connectivity and handles a full megapixel without recursion', () => {
  let seed = 1234
  const random = (max: number) => {
    seed = (1664525 * seed + 1013904223) >>> 0
    return seed % max
  }
  for (let run = 0; run < 120; run++) {
    const width = 1 + random(12),
      height = 1 + random(12)
    const pixels = Array.from({ length: width * height }, () => random(3))
    const x = random(width),
      y = random(height),
      color = random(4)
    const connected = new Set<number>([y * width + x])
    let changed = true
    while (changed) {
      changed = false
      for (let j = 0; j < height; j++)
        for (let i = 0; i < width; i++) {
          const n = j * width + i
          if (connected.has(n) || pixels[n] !== pixels[y * width + x]) continue
          if (
            (i > 0 && connected.has(n - 1)) ||
            (i + 1 < width && connected.has(n + 1)) ||
            (j > 0 && connected.has(n - width)) ||
            (j + 1 < height && connected.has(n + width))
          ) {
            connected.add(n)
            changed = true
          }
        }
    }
    const result = fillSceneImage(
      indexed(width, height, pixels),
      { kind: 'fill', layerId: 'layer', point: [x, y], color, tolerance: 0 },
      4,
    )
    expect([...result.layers[0]!.pixels]).toEqual(
      pixels.map((value, i) => (connected.has(i) ? color : value)),
    )
  }
  const image = indexed(1024, 1024, [])
  image.layers[0]!.pixels = new Uint8Array(1024 * 1024)
  const result = fillSceneImage(
    image,
    { kind: 'fill', layerId: 'layer', point: [1023, 1023], color: 3, tolerance: 0 },
    4,
  )
  expect(result.layers[0]!.pixels.every((c) => c === 3)).toBe(true)
  expect(image.layers[0]!.pixels.every((c) => c === 0)).toBe(true)
})

test('conversion preserves transparent RGB and layer metadata; fill validation refuses invalid drafts', () => {
  const image = indexed(2, 1, [0, 1])
  const result = convertSceneImageRgba(image, [
    [0, 0, 0, 0],
    [0.2, 0.4, 0.6, 1],
  ])
  expect([...result.layers[0]!.pixels]).toEqual([0, 0, 0, 0, 51, 102, 153, 255])
  expect(result.layers[0]!.id).toBe('layer')
  expect(result.layers[0]!.opacity).toBe(0.5)
  expect(convertSceneImageRgba(result, [])).toBe(result)
  const op = { kind: 'fill', layerId: 'layer', point: [0, 0], color: 1, tolerance: 0 }
  for (const patch of [
    { point: [2, 0] },
    { point: [0.5, 0] },
    { tolerance: 1 },
    { color: 2 },
    { layerId: 'absent' },
    { extra: true },
  ])
    expect(() => readSceneImageOperation({ ...op, ...patch }, image, 2)).toThrow()
  expect(() =>
    readSceneImageOperation(op, { ...image, layers: [{ ...image.layers[0]!, visible: false }] }, 2),
  ).toThrow()
})
