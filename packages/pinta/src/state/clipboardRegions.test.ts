import { expect, test } from 'bun:test'
import { createTilesetAsset } from '../core/project'
import { createRegionMapObject } from '../tiles/mapObjects'
import {
  CLIPBOARD_STORAGE_KEY,
  type ClipboardMirror,
  createClipboardStore,
  parseClipboardMirror,
} from './clipboardStore'

test('a versioned region clipboard survives another store without clamping signed geometry or art', () => {
  const data = new Map<string, string>(),
    mirror: ClipboardMirror = {
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => {
        data.set(k, v)
      },
      removeItem: (k) => {
        data.delete(k)
      },
    }
  const art = createTilesetAsset({ name: 'arvore', tileSize: 16 }),
    version = { sourceId: 'source', capturedAt: 1, asset: { ...art, id: 'frozen' } },
    object = createRegionMapObject({
      id: 'tree',
      x: -32.5,
      y: -16.25,
      width: 16.5,
      height: 24.25,
      rotation: 0,
      art: { assetId: 'frozen', tile: 0 },
    })!
  const item = {
    kind: 'objects' as const,
    coordinates: 'signed' as const,
    objects: [object],
    resources: [version],
  }
  createClipboardStore({ mirror, now: () => 1 })
    .getState()
    .set(item)
  const text = data.get(CLIPBOARD_STORAGE_KEY)!,
    wire = JSON.parse(text)
  expect(wire.v).toBe(3)
  expect(createClipboardStore({ mirror }).getState().get()).toEqual(item)
  expect(data.get(CLIPBOARD_STORAGE_KEY)).toBe(text)
})

test('region clipboard refuses invalid or future metadata as a whole', () => {
  const object = createRegionMapObject({ id: 'tree', x: -2.5 })!
  const valid = { v: 3, at: 1, kind: 'objects', objects: [object] }
  expect(parseClipboardMirror(JSON.stringify(valid))?.item).toEqual({
    kind: 'objects',
    coordinates: 'signed',
    objects: [object],
  })
  for (const wire of [
    { ...valid, v: 4 },
    { ...valid, unknown: 1 },
    { ...valid, objects: [object, object] },
    { ...valid, objects: [object, { ...object, id: 'invalid', x: 480001 }] },
    { ...valid, objects: [{ ...object, future: 1 }] },
  ])
    expect(parseClipboardMirror(JSON.stringify(wire))).toBeNull()
})
