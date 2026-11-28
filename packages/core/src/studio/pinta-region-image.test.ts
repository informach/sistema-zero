import { expect, test } from 'bun:test'
import { scene4BudgetFixture, scene4Fixture } from '../../tests/fixtures/pinta-region-scene'
import { PintaImageDerivationSchema } from './pinta-image'
import {
  PINTA_REGION_IMAGE_MAX_INDEX_BYTES,
  PINTA_REGION_IMAGE_MAX_JSON_BYTES,
  readPintaRegionImageData,
} from './pinta-region-image'
import { readPintaRegionScene } from './pinta-region-scene'

function fixture() {
  const scene = { ...scene4Fixture(), physics: 'precise' }
  return { format: 'pinta', version: 5, kind: 'map', name: scene.name, scale: 1, scene }
}

test('PNG 6 admits projected geometry through the same bounded reader and rejects mismatched envelopes', () => {
  const previous = fixture()
  const scene = {
    ...previous.scene,
    version: 5,
    projection: { kind: 'isometric' as const, tileWidth: 32, tileHeight: 16 },
  }
  const source = { ...previous, version: 6, scene }
  const data = readPintaRegionImageData(JSON.stringify(source))
  expect(data?.version).toBe(6)
  expect(data?.scene.version).toBe(5)
  if (data?.scene.version !== 5) throw Error('Projected scene was not admitted')
  expect(data.scene.projection).toEqual(scene.projection)
  const old = readPintaRegionScene(JSON.stringify(previous.scene))
  if (!old) throw Error('Old scene was not admitted')
  expect(data.scene.layers).toEqual(old.layers)
  expect(readPintaRegionImageData(JSON.stringify({ ...source, version: 5 }))).toBeNull()
  expect(readPintaRegionImageData(JSON.stringify({ ...previous, version: 6 }))).toBeNull()
})
test('PNG 5 metadata reuses the admitted scene-4 codec and preserves signed cells, properties and physics', () => {
  const source = fixture(),
    data = readPintaRegionImageData(JSON.stringify(source))
  expect(data?.version).toBe(5)
  expect(data?.scene.origin).toEqual({ col: -64, row: -64 })
  expect(data?.scene.physics).toBe('precise')
  const layer = data?.scene.layers.find((layer) => layer.kind === 'tiles')
  if (layer?.kind !== 'tiles') throw Error('Missing positive control')
  expect(layer.cells.chunks[0]!.cells).toBeInstanceOf(Int16Array)
  expect(layer.cells.chunks[0]!.cells[7]).toBe(7 * 4096 + 2)
  const objects = data?.scene.layers.find((entry) => entry.kind === 'objects')
  if (objects?.kind !== 'objects') throw Error('Missing objects')
  expect(objects.objects[0]?.properties).toEqual({ life: { type: 'int', value: 3 } })
})
test('PNG 5 is a new strict envelope, while the public derivation still refuses its activation', () => {
  const source = fixture()
  for (const version of [1, 2, 3, 4, 6])
    expect(readPintaRegionImageData(JSON.stringify({ ...source, version }))).toBeNull()
  for (const invalid of [
    { ...source, future: true },
    { ...source, format: 'other' },
    { ...source, kind: 'sprite' },
    { ...source, scene: { ...source.scene, version: 3 } },
    { ...source, scene: { ...source.scene, future: true } },
  ])
    expect(readPintaRegionImageData(JSON.stringify(invalid))).toBeNull()
  expect(
    PintaImageDerivationSchema.safeParse({
      recipe: {
        version: 1,
        algorithm: 'pinta-image-1',
        drawingId: 'world',
        selection: { kind: 'map' },
        scale: 1,
      },
      provenance: { sourceSha256: 'a'.repeat(64), dependencies: [] },
      output: {
        mime: 'image/png',
        dataVersion: 5,
        width: 1,
        height: 1,
        bytes: 1,
        sha256: 'b'.repeat(64),
      },
    }).success,
  ).toBe(false)
})
test('PNG 5 requires a stable integral output tile size and explicit collision mode', () => {
  const source = fixture()
  for (const scale of [1, 0.5, 2])
    expect(readPintaRegionImageData(JSON.stringify({ ...source, scale }))?.scale).toBe(scale)
  for (const scale of [0, -1, 1 / 3, Infinity, NaN, 4097])
    expect(readPintaRegionImageData(JSON.stringify({ ...source, scale }))).toBeNull()
  const { physics: _physics, ...scene } = source.scene
  expect(readPintaRegionImageData(JSON.stringify({ ...source, scene }))).toBeNull()
})
test('world descriptors are admitted before scene payloads and must refer to the same root', () => {
  const source = fixture(),
    world = {
      version: 1 as const,
      rootId: source.scene.id,
      maps: [{ id: 'cabana', name: 'Cabana', png: 'data:image/png;base64,AA==' }],
    }
  expect(readPintaRegionImageData(JSON.stringify({ ...source, world }))?.world).toEqual(world)
  let decodes = 0
  const original = globalThis.atob
  globalThis.atob = (text) => {
    decodes++
    return original(text)
  }
  try {
    for (const invalid of [
      { ...source, name: 'other' },
      { ...source, world: { ...world, rootId: 'other' } },
      { ...source, world: { ...world, maps: [...world.maps, ...world.maps] } },
    ])
      expect(readPintaRegionImageData(JSON.stringify(invalid))).toBeNull()
    expect(decodes).toBe(0)
  } finally {
    globalThis.atob = original
  }
})
test('PNG metadata budgets count UTF-8 and reject oversized JSON before parsing', () => {
  expect(readPintaRegionImageData('{')).toBeNull()
  expect(readPintaRegionImageData(' '.repeat(PINTA_REGION_IMAGE_MAX_JSON_BYTES + 1))).toBeNull()
  expect(readPintaRegionImageData('á'.repeat(PINTA_REGION_IMAGE_MAX_JSON_BYTES / 2 + 1))).toBeNull()
})

test('PNG 5 does not raise the existing runtime index budget and refuses before decoding any payload', () => {
  const exact = readPintaRegionImageData(
    JSON.stringify({
      ...fixture(),
      scene: { ...scene4BudgetFixture(32, 64), sets: [], physics: 'precise' },
    }),
  )
  expect(exact?.scene.layers).toHaveLength(32)
  const source = scene4BudgetFixture(30, 50),
    definition = scene4BudgetFixture(30, 50),
    scene = {
      ...source,
      physics: 'precise',
      sets: [
        {
          id: 'large-set',
          cols: definition.cols,
          rows: definition.rows,
          origin: definition.origin,
          layers: definition.layers,
        },
      ],
    }
  expect(readPintaRegionScene(JSON.stringify(scene))).not.toBeNull()
  let decodes = 0
  const original = globalThis.atob
  globalThis.atob = (text) => {
    decodes++
    return original(text)
  }
  try {
    expect(readPintaRegionImageData(JSON.stringify({ ...fixture(), scene }))).toBeNull()
    expect(decodes).toBe(0)
  } finally {
    globalThis.atob = original
  }
})

test('world loaders may narrow the remaining index budget but cannot relax its ceiling', () => {
  const json = JSON.stringify(fixture())
  expect(readPintaRegionImageData(json)).not.toBeNull()
  let decodes = 0
  const original = globalThis.atob
  globalThis.atob = (text) => {
    decodes++
    return original(text)
  }
  try {
    for (const budget of [0, 1, -1, NaN, Infinity, PINTA_REGION_IMAGE_MAX_INDEX_BYTES + 1])
      expect(readPintaRegionImageData(json, budget)).toBeNull()
    expect(decodes).toBe(0)
    expect(readPintaRegionScene('{}', PINTA_REGION_IMAGE_MAX_JSON_BYTES)).toBeNull()
  } finally {
    globalThis.atob = original
  }
})
