import { expect, test } from 'bun:test'
import { createCanvas } from '@napi-rs/canvas'
import { scene4BudgetFixture } from '../../../core/tests/fixtures/pinta-region-scene'
import { pngWithPintaJson } from './pngText'
import { embedPintaRegionImage } from './regionImage'
import { readPintaRegionImageWorld } from './regionImageWorld'

function png(width = 64, height = 32, color = '#1234ef') {
  const canvas = createCanvas(width, height),
    context = canvas.getContext('2d')
  context.fillStyle = color
  context.fillRect(0, 0, width, height)
  return new Uint8Array(canvas.toBuffer('image/png'))
}
const url = (bytes: Uint8Array) => `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`
function scene(id = 'vila', image = url(png(64, 16))) {
  const { art: _art, resources: _resources, ...source } = scene4BudgetFixture(1, 1)
  return {
    ...source,
    id,
    name: id,
    physics: 'legacy' as const,
    tilesets: source.tilesets.map((sheet) => ({ ...sheet, image })),
  }
}
const embed = async (source = scene(), cover = png(), scale = 1) =>
  (await embedPintaRegionImage(cover, JSON.stringify(source), { scale })).png

test('captures a real two-map PNG world with signed regions and deduplicated resource bytes', async () => {
  const root = scene(),
    child = scene('cabana', root.tilesets[0]!.image),
    childPng = await embed(child)
  const original = (
    await embedPintaRegionImage(png(), JSON.stringify(root), {
      world: {
        version: 1,
        rootId: 'vila',
        maps: [{ id: 'cabana', name: 'cabana', png: url(childPng) }],
      },
    })
  ).png
  const before = original.slice(),
    result = readPintaRegionImageWorld(original)
  expect(result.rootId).toBe('vila')
  expect([...result.maps.keys()]).toEqual(['vila', 'cabana'])
  expect(result.images.size).toBe(1)
  expect(result.imagePixels).toBe(64 * 32 * 2 + 64 * 16)
  expect(result.maps.get('cabana')?.data.scene.origin).toEqual({ col: -64, row: -64 })
  const layer = result.maps.get('cabana')!.data.scene.layers[0]!
  if (layer.kind !== 'tiles') throw Error('Expected tiles')
  expect(layer.cells.chunks).toHaveLength(1)
  expect(layer.cells.chunks[0]!.cells.byteLength).toBe(2048)
  expect(Buffer.from(original).equals(before)).toBe(true)
  original.fill(0)
  expect(result.maps.get('vila')!.png[0]).toBe(137)
  expect(result.maps.get('vila')!.png.buffer).not.toBe(original.buffer)
})

test('remaining world quotas accept the exact size and refuse the header before restoring cells', async () => {
  const original = await embed()
  const { metadataBytes, indexBytes, imagePixels } = readPintaRegionImageWorld(original)
  const exact = { metadataBytes, indexBytes, imagePixels }
  expect(readPintaRegionImageWorld(original, exact)).toMatchObject(exact)
  for (const key of Object.keys(exact) as Array<keyof typeof exact>)
    expect(() => readPintaRegionImageWorld(original, { ...exact, [key]: exact[key] - 1 })).toThrow()
  for (const invalid of [-1, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER])
    expect(() => readPintaRegionImageWorld(original, { ...exact, indexBytes: invalid })).toThrow()
  const payload = scene().layers[0]!.cells.chunks[0]!.data
  const atob = globalThis.atob
  let indexDecodes = 0
  globalThis.atob = (value) => {
    if (value === payload) indexDecodes++
    return atob(value)
  }
  try {
    expect(() => readPintaRegionImageWorld(original, { ...exact, indexBytes: 0 })).toThrow()
    expect(indexDecodes).toBe(0)
  } finally {
    globalThis.atob = atob
  }
})

test('a corrupt late linked PNG refuses before decoding root cells and preserves its CRC failure', async () => {
  const root = scene(),
    child = await embed(scene('cabana')),
    corrupted = child.slice()
  corrupted[corrupted.length - 1]! ^= 1
  const original = (
    await embedPintaRegionImage(png(), JSON.stringify(root), {
      world: {
        version: 1,
        rootId: 'vila',
        maps: [{ id: 'cabana', name: 'cabana', png: url(corrupted) }],
      },
    })
  ).png
  const payload = root.layers[0]!.cells.chunks[0]!.data,
    atob = globalThis.atob
  let cells = 0
  globalThis.atob = (value) => {
    if (value === payload) cells++
    return atob(value)
  }
  try {
    expect(() => readPintaRegionImageWorld(original)).toThrow('Integridade')
  } finally {
    globalThis.atob = atob
  }
  expect(cells).toBe(0)
})

test('future linked metadata, mismatched names and nested worlds return no partial registry', async () => {
  const root = scene(),
    child = scene('cabana'),
    raw = { format: 'pinta', version: 5, kind: 'map', name: child.name, scale: 1, scene: child }
  for (const metadata of [
    { ...raw, version: 6 },
    { ...raw, scene: { ...child, id: 'other' } },
    { ...raw, name: 'other', scene: { ...child, name: 'other' } },
    { ...raw, world: { version: 1, rootId: child.id, maps: [] } },
  ]) {
    const childPng = await pngWithPintaJson(png(), JSON.stringify(metadata))
    const original = (
      await embedPintaRegionImage(png(), JSON.stringify(root), {
        world: {
          version: 1,
          rootId: root.id,
          maps: [{ id: child.id, name: child.name, png: url(childPng) }],
        },
      })
    ).png
    expect(() => readPintaRegionImageWorld(original)).toThrow('conferir')
  }
})

test('resource images are captured from canonical PNG data, never remote URLs or filenames', async () => {
  for (const image of [
    'https://example.invalid/tiles.png',
    'assets/tiles.png',
    'data:image/jpeg;base64,AA==',
    'data:image/png;base64,AA==',
  ]) {
    const source = await embed(scene('vila', image))
    expect(() => readPintaRegionImageWorld(source)).toThrow()
  }
})

test('tileset and art geometry must match their captured PNG headers', async () => {
  expect(() => readPintaRegionImageWorld(new Uint8Array())).toThrow()
  const wrongSheet = await embed(scene('vila', url(png(16, 16))))
  expect(() => readPintaRegionImageWorld(wrongSheet)).toThrow('conferir')
  const source = {
    ...scene(),
    art: [{ id: 'hero', image: url(png(16, 16)), width: 17, height: 16 }],
  }
  const wrongArt = (await embedPintaRegionImage(png(), JSON.stringify(source))).png
  expect(() => readPintaRegionImageWorld(wrongArt)).toThrow('conferir')
})

test('source and scaled image budgets are checked without creating game surfaces', async () => {
  const image = url(png(2048, 2048)),
    base = scene(),
    source = { ...base, art: [{ id: 'hero', image, width: 2048, height: 2048 }] }
  const tooLarge = (await embedPintaRegionImage(png(), JSON.stringify(source), { scale: 2 })).png
  expect(() => readPintaRegionImageWorld(tooLarge)).toThrow()
})

test('identical URLs count once, while distinct source images share the global pixel budget', async () => {
  const base = scene(),
    image = url(png(2048, 2048))
  const repeated = {
    ...base,
    tilesets: Array.from({ length: 5 }, (_, index) => ({
      ...base.tilesets[0]!,
      id: index ? `sheet-${index}` : 'ground',
      image,
    })),
  }
  const accepted = readPintaRegionImageWorld(
    (await embedPintaRegionImage(png(), JSON.stringify(repeated))).png,
  )
  expect(accepted.images.size).toBe(1)
  expect(accepted.imagePixels).toBe(2048 * 2048 + 64 * 32)
  const distinct = {
    ...repeated,
    tilesets: repeated.tilesets.map((sheet, index) => ({
      ...sheet,
      image: url(png(2048, 2048, `rgb(${index},52,239)`)),
    })),
  }
  const rejected = (await embedPintaRegionImage(png(), JSON.stringify(distinct))).png
  expect(() => readPintaRegionImageWorld(rejected)).toThrow('grande demais')
})

test('the cover pixel total also bounds linked maps before their scene cells are decoded', async () => {
  const cover = png(4096, 1024),
    root = scene(),
    maps = []
  for (let index = 0; index < 4; index++) {
    const id = `place-${index}`,
      child = await embed(scene(id), cover)
    maps.push({ id, name: id, png: url(child) })
  }
  const source = (
    await embedPintaRegionImage(cover, JSON.stringify(root), {
      world: { version: 1, rootId: root.id, maps },
    })
  ).png
  const payload = root.layers[0]!.cells.chunks[0]!.data,
    atob = globalThis.atob
  let cells = 0
  globalThis.atob = (value) => {
    if (value === payload) cells++
    return atob(value)
  }
  try {
    expect(() => readPintaRegionImageWorld(source)).toThrow('grande demais')
  } finally {
    globalThis.atob = atob
  }
  expect(cells).toBe(0)
})
