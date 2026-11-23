import { expect, test } from 'bun:test'
import '../testing/idbMock'
import { filterGalleryAssets } from '../core/gallerySearch'
import { expandSelection } from '../core/gallerySelection'
import { pintaWorkshopBackup, readPintaWorkshopBackup } from '../export/workshopDocument'
import { automapFixture } from '../testing/automapFixture'
import { isPintaAuthoredMap } from '../tiles/automapping/model'
import { expandRegionMap, prepareMapRegions } from '../tiles/regionMap'
import { setCell } from '../tiles/tilemapOps'
import { createGalleryStore } from './galleryStore'
import { createWorkshopPintaPersistence } from './workshopPersistence'

test('galeria normal encontra, duplica e restaura regiões e regras com IDs novos, sem converter células', async () => {
  const { sheet, map, book } = await automapFixture()
  const init = prepareMapRegions(map)
  if (!init.ok) throw Error(init.reason)
  const expanded = expandRegionMap(init.map, { col: -256, row: -128, cols: 800, rows: 500 })
  if (!expanded.ok) throw Error(expanded.reason)
  const painted = setCell(expanded.map, map.layers[0]!.id, -256, -128, 0)
  const authored = { ...painted, schema: 9 as const, automapping: book }
  const local = createWorkshopPintaPersistence({ namespace: 'gallery-workshop' })
  await local.persistAssets([sheet, authored])
  const store = createGalleryStore(local)
  await store.getState().load()
  const all = store.getState().assets
  expect(
    filterGalleryAssets(all, { query: 'mapa', style: 'all', role: 'all' }).map((a) => a.id),
  ).toContain(map.id)
  const chosen = expandSelection(all, new Set([map.id]))
  expect(chosen.autoIncludedTilesetIds).toEqual([sheet.id])
  const copy = await store.getState().duplicate(map.id)
  if (!copy || !isPintaAuthoredMap(copy)) throw Error('cópia recusada')
  expect(copy.id).not.toBe(map.id)
  expect(copy.automapping.rules[0]!.input[0]!.layer).not.toBe(book.rules[0]!.input[0]!.layer)
  expect(copy.automapping.rules[0]!.input[0]!.sheet).toBe(sheet.id)
  const text = await pintaWorkshopBackup(chosen.assets)
  if (!text) throw Error('backup recusado')
  const { assets, warnings } = await readPintaWorkshopBackup(text)
  expect(warnings).toEqual([])
  expect(await store.getState().importAssets(assets, { atomic: true })).toEqual({
    added: 2,
    skipped: 0,
  })
  const restored = store
    .getState()
    .assets.find((a) => isPintaAuthoredMap(a) && a.id !== map.id && a.id !== copy.id)
  if (!restored || !isPintaAuthoredMap(restored) || !('origin' in restored))
    throw Error('região ausente')
  expect(restored.origin).toEqual({ col: -256, row: -128 })
  expect(restored.tilesetId).not.toBe(sheet.id)
  expect(restored.automapping.rules[0]!.input[0]!.sheet).toBe(restored.tilesetId)
  expect(await local.loadAssetById(restored.id)).toEqual(restored)
})

test('duplicar um mapa com a folha repintada preserva o livro como está, sem erro', async () => {
  const { sheet, map, book } = await automapFixture()
  const authored = { ...map, schema: 9 as const, automapping: book }
  const repainted = { ...sheet, solid: [true] }
  const local = createWorkshopPintaPersistence({ namespace: 'gallery-workshop-stale' })
  await local.persistAssets([repainted, authored])
  const store = createGalleryStore(local)
  await store.getState().load()
  const copy = await store.getState().duplicate(map.id)
  expect(store.getState().mutateError).toBeNull()
  if (!copy || !isPintaAuthoredMap(copy)) throw Error('cópia recusada')
  const plane = copy.automapping.rules[0]!.input[0]!
  expect(plane.layer).toBe(copy.layers[0]!.id)
  expect(plane.layer).not.toBe(book.rules[0]!.input[0]!.layer)
  expect(plane.sheet).toBe(sheet.id)
  // The rules stay out of date: the editor warns until the example is captured again.
  expect(plane.sha256).toBe(book.rules[0]!.input[0]!.sha256)
  expect(await local.loadAssetById(copy.id)).toEqual(copy)
})
