import { beforeEach, expect, test } from 'bun:test'
import { strFromU8, unzipSync } from 'fflate'
import { createTilesetAsset, isTileLayer } from '../core/project'
import { PINTA_GALLERY_ZIP_ENTRY } from '../export/backupFormat'
import { importPintaJson } from '../export/projectJson'
import { pintaWorkshopAssetToJson, readPintaWorkshopBackup } from '../export/workshopDocument'
import { zipGallery } from '../export/zip'
import { clearIdbMock, setIdbMockCodec } from '../testing/idbMock'
import { createRegionWorld } from '../tiles/regionMap'
import { cellAt, setCell } from '../tiles/tilemapOps'
import { addTile } from '../tiles/tilesetOps'
import { createGalleryStore } from './galleryStore'
import { isLocalRegionAsset } from './localRegionAssetAuthority'
import { createPintaPersistence, setPintaStorageNamespace } from './persistence'
import { createWorkshopPintaPersistence } from './workshopPersistence'

// Etapa 1 das regiões (23/11/2026): o arquivo `.pinta.json` (o ZIP da galeria) leva e traz o
// mundo gigante sem perda, e o leitor antigo recusa o arquivo em vez de cortar o mapa.

beforeEach(() => {
  clearIdbMock()
  setIdbMockCodec(true)
})

async function savedWorld(namespace: string) {
  setPintaStorageNamespace(namespace)
  const local = createWorkshopPintaPersistence({ namespace, nativeCeiling: 8 })
  const sheet = addTile(createTilesetAsset({ name: 'pecas', tileSize: 16 }), 0)
  const empty = createRegionWorld({ name: 'mundo', tilesetId: sheet.id })
  const layer = empty?.layers.find(isTileLayer)
  if (!empty || !layer) throw Error('O mundo gigante não nasceu')
  // Duas casas longe uma da outra: só duas regiões ocupam espaço.
  const world = setCell(setCell(empty, layer.id, 3, 4, 1), layer.id, 1000, 700, 1)
  await local.persistAssets([sheet, world])
  return { local, sheet, world, layerId: layer.id }
}

test('o ZIP da galeria leva o mundo gigante e a restauração traz os mesmos bytes', async () => {
  const { local, world } = await savedWorld('arquivo-ida')
  const zip = unzipSync(await zipGallery(await local.listAllAssets()))
  const backup = zip[PINTA_GALLERY_ZIP_ENTRY]
  if (!backup) throw Error('O ZIP veio sem o backup')
  const { assets, warnings } = await readPintaWorkshopBackup(strFromU8(backup))
  expect(warnings).toEqual([])
  const back = assets.find(({ id }) => id === world.id)
  expect(back && pintaWorkshopAssetToJson(back)).toBe(pintaWorkshopAssetToJson(world))
})

test('restaurar noutro perfil guarda o mundo com ids novos e as mesmas casas', async () => {
  const { local, world } = await savedWorld('arquivo-origem')
  const zip = unzipSync(await zipGallery(await local.listAllAssets()))
  const { assets } = await readPintaWorkshopBackup(strFromU8(zip[PINTA_GALLERY_ZIP_ENTRY]!))
  setPintaStorageNamespace('arquivo-destino')
  const target = createWorkshopPintaPersistence({ namespace: 'arquivo-destino', nativeCeiling: 8 })
  const gallery = createGalleryStore(target)
  await gallery.getState().load()
  expect(await gallery.getState().importAssets(assets, { atomic: true })).toEqual({
    added: 2,
    skipped: 0,
  })
  const restored = (await target.listAllAssets()).find(
    (asset) => asset.kind === 'tilemap' && asset.name.startsWith('mundo'),
  )
  if (!restored || !isLocalRegionAsset(restored) || restored.kind !== 'tilemap')
    throw Error('O mundo não voltou como mapa por regiões')
  expect([restored.cols, restored.rows]).toEqual([world.cols, world.rows])
  const layer = restored.layers.find(isTileLayer)
  if (!layer) throw Error('Camada de peças ausente')
  expect([cellAt(restored, layer.id, 3, 4), cellAt(restored, layer.id, 1000, 700)]).toEqual([1, 1])
})

test('o leitor antigo recusa o arquivo do mundo gigante inteiro, sem cortar nem guardar nada', async () => {
  const { local } = await savedWorld('arquivo-antigo')
  const zip = unzipSync(await zipGallery(await local.listAllAssets()))
  const text = strFromU8(zip[PINTA_GALLERY_ZIP_ENTRY]!)
  const old = importPintaJson(text)
  expect(old.assets).toEqual([])
  expect(old.warnings.length).toBeGreaterThan(0)
  // A galeria de sempre (aula, conta sem fila causal) restaura pelo mesmo leitor: nada entra.
  setPintaStorageNamespace('arquivo-antigo-destino')
  const legacy = createPintaPersistence({ namespace: 'arquivo-antigo-destino' })
  expect(await legacy.listAllAssets()).toEqual([])
})
