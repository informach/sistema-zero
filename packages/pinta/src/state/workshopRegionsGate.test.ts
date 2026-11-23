import { beforeEach, expect, test } from 'bun:test'
import { COPY } from '../core/copy'
import { createTilesetAsset } from '../core/project'
import { attachWorkshopBook } from '../export/workshopDocument'
import { automapFixture } from '../testing/automapFixture'
import { clearIdbMock, idbMockDb, setIdbMockCodec } from '../testing/idbMock'
import { createRegionWorld, REGION_WORLD_START } from '../tiles/regionMap'
import { PINTA_CAUSAL_OUTBOX_KEY } from './assetAuthorityKeys'
import { createGalleryStore } from './galleryStore'
import { isLocalRegionAsset } from './localRegionAssetAuthority'
import { createPintaPersistence, dbNameFor, setPintaStorageNamespace } from './persistence'
import {
  createWorkshopPintaPersistence,
  WORKSHOP_NATIVE_CEILING_MESSAGE,
} from './workshopPersistence'

// Etapa 1 das regiões (23/11/2026): o host grava no máximo o nativo 8. O nativo 9 (autorregras e
// projeções) ainda não está pronto; uma fila que anuncia nuvem 7 não pode guardar uma unidade 9
// que ela mesma recusaria para sempre.

beforeEach(() => {
  clearIdbMock()
  setIdbMockCodec(true)
  setPintaStorageNamespace('')
})

const snapshot = (namespace: string) => structuredClone([...idbMockDb(dbNameFor(namespace))])

test('com o teto 8, o mundo gigante grava e o mapa com regras é recusado sem tocar no disco', async () => {
  const namespace = 'teto-oito'
  setPintaStorageNamespace(namespace)
  const local = createWorkshopPintaPersistence({ namespace, nativeCeiling: 8 })
  const sheet = createTilesetAsset({ name: 'pecas', tileSize: 16 })
  const world = createRegionWorld({ name: 'mundo', tilesetId: sheet.id })
  if (!world) throw Error('O mundo gigante não nasceu')
  await local.persistAssets([sheet, world])
  expect(isLocalRegionAsset((await local.loadAssetById(world.id))!)).toBe(true)

  const { map, sheet: ruleSheet, book } = await automapFixture()
  const authored = attachWorkshopBook(map, book)
  if (!authored) throw Error('O livro não se ligou ao mapa')
  const before = snapshot(namespace)
  await expect(local.persistAssets([ruleSheet, authored])).rejects.toThrow(
    WORKSHOP_NATIVE_CEILING_MESSAGE,
  )
  expect(snapshot(namespace)).toEqual(before)
  await expect(
    local.causal.encodeCandidates([authored], new AbortController().signal),
  ).rejects.toThrow(WORKSHOP_NATIVE_CEILING_MESSAGE)

  // A qualificação local (teto 9, o padrão) continua gravando o livro.
  const qualification = createWorkshopPintaPersistence({ namespace: 'teto-nove' })
  setPintaStorageNamespace('teto-nove')
  await qualification.persistAssets([ruleSheet, authored])
  expect(await qualification.loadAssetById(authored.id)).toMatchObject({ schema: 9 })
})

test('o índice da galeria focal lê ao lado da fila V4 só quando quem pede é a conta', async () => {
  const namespace = 'indice-conta'
  setPintaStorageNamespace(namespace)
  const local = createWorkshopPintaPersistence({
    namespace,
    guardCausalWrites: true,
    nativeCeiling: 8,
  })
  const sheet = createTilesetAsset({ name: 'pecas', tileSize: 16 })
  const world = createRegionWorld({ name: 'mundo', tilesetId: sheet.id })
  if (!world) throw Error('O mundo gigante não nasceu')
  await local.persistAssets([sheet, world])
  expect((await local.listGalleryIndex())?.cards.map((card) => card.id)).toEqual([world.id])

  await local.causal.rememberProtocol()
  expect(idbMockDb(dbNameFor(namespace)).has(PINTA_CAUSAL_OUTBOX_KEY)).toBe(true)
  expect(await local.listGalleryIndex()).toBeNull()
  const index = await local.listGalleryIndex({ causal: true })
  expect(index?.cards).toEqual([
    expect.objectContaining({
      id: world.id,
      name: 'mundo',
      cols: REGION_WORLD_START.cols,
      rows: REGION_WORLD_START.rows,
      dependencies: [sheet.id],
    }),
  ])
  expect(index?.assets.map((asset) => asset.id)).toEqual([sheet.id])
})

test('a galeria cria o mundo gigante só no armazenamento da oficina', async () => {
  const namespace = 'mundo-galeria'
  setPintaStorageNamespace(namespace)
  const workshop = createWorkshopPintaPersistence({ namespace, nativeCeiling: 8 })
  const sheet = createTilesetAsset({ name: 'pecas', tileSize: 16 })
  await workshop.persistAsset(sheet)
  const gallery = createGalleryStore(workshop)
  await gallery.getState().load()
  const created = await gallery.getState().createRegionMap({ name: 'mundo', tilesetId: sheet.id })
  if (!created || !isLocalRegionAsset(created)) throw Error('O mundo gigante não foi guardado')
  expect(created).toMatchObject({ schema: 8, cols: 1024, rows: 768, tilesetId: sheet.id })
  const reopened = await createWorkshopPintaPersistence({ namespace }).loadAssetById(created.id)
  expect(reopened && isLocalRegionAsset(reopened)).toBe(true)
  expect(await gallery.getState().createRegionMap({ name: 'mundo', tilesetId: sheet.id })).toBe(
    null,
  )
  expect(gallery.getState().mutateError).toBe(COPY.newAsset.nameTaken)

  // O armazenamento de sempre (aula, conta sem fila causal) não guarda o formato.
  setPintaStorageNamespace('mundo-antigo')
  const legacy = createPintaPersistence({ namespace: 'mundo-antigo' })
  await legacy.persistAsset(sheet)
  const old = createGalleryStore(legacy)
  await old.getState().load()
  const before = snapshot('mundo-antigo')
  expect(await old.getState().createRegionMap({ name: 'mundo', tilesetId: sheet.id })).toBeNull()
  expect(old.getState().mutateError).toBe(COPY.editor.saveError)
  expect(snapshot('mundo-antigo')).toEqual(before)
})
