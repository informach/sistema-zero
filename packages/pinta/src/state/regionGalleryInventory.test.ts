import { expect, test } from 'bun:test'
import { createTilemapAsset, createTilesetAsset } from '../core/project'
import { createGalleryStore } from './galleryStore'
import { createMemoryPersistence } from './memoryPersistence'
import type { RegionGalleryIndex } from './regionGalleryIndex'

test('a gallery refresh keeps the complete catalog while a remap editor owns its inventory', async () => {
  const storage = createMemoryPersistence()
  const tileset = createTilesetAsset({ name: 'Peças', tileSize: 16 })
  const map = createTilemapAsset({ name: 'Vila', cols: 4, rows: 4, tilesetId: tileset.id })
  await storage.persistAssets([tileset, map])
  const sparse: RegionGalleryIndex = {
    assets: [tileset],
    cards: [
      {
        regionalCard: true,
        id: map.id,
        kind: 'tilemap',
        name: map.name,
        updatedAt: map.updatedAt,
        cols: 4,
        rows: 4,
        revision: 'regional-revision',
        namespace: '',
        preview: { col: 0, row: 0 },
        dependencies: [tileset.id],
      },
    ],
  }
  let resume!: (value: RegionGalleryIndex) => void
  const gate = new Promise<RegionGalleryIndex>((resolve) => {
    resume = resolve
  })
  let observed!: () => void
  const request = new Promise<void>((resolve) => {
    observed = resolve
  })
  const gallery = createGalleryStore(
    {
      ...storage,
      listGalleryIndex: () => {
        observed()
        return gate
      },
    },
    { focalGallery: true },
  )
  const load = gallery.getState().load()
  await request
  const release = gallery.getState().holdFullInventory()
  resume(sparse)
  await load
  expect(gallery.getState().assets.map(({ id }) => id)).toContain(map.id)
  expect(gallery.getState().regionCards).toEqual([])

  release()
  await gallery.getState().load()
  expect(gallery.getState().assets).toEqual([tileset])
  expect(gallery.getState().regionCards).toEqual(sparse.cards)
  expect(await gallery.getState().remove(tileset.id)).toBe(false)
})
