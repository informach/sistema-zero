/**
 * A galeria da oficina ainda não abre mapas projetados: ela os guarda inteiros, leva no backup e
 * restaura como cópia.
 */
import { beforeEach, expect, test } from 'bun:test'
import '../testing/idbMock'
import { strFromU8, unzipSync } from 'fflate'
import { COPY } from '../core/copy'
import { isWorkshopProjectedMap } from '../core/workshopAsset'
import { PINTA_GALLERY_ZIP_ENTRY } from '../export/backupFormat'
import { pintaWorkshopAssetToJson, readPintaWorkshopBackup } from '../export/workshopDocument'
import { zipGallery } from '../export/zip'
import { clearIdbMock, idbMockDb } from '../testing/idbMock'
import { nativeNineGallery, withoutSession } from '../testing/nativeNineFixtures'
import { createGalleryStore } from './galleryStore'
import { authorityKey, mirrorKey } from './localAssetAuthority'
import { dbNameFor, setPintaStorageNamespace } from './persistence'
import { createWorkshopPintaPersistence } from './workshopPersistence'

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
})

async function workshopGallery(namespace: string, withProjected = true) {
  setPintaStorageNamespace(namespace)
  const fixtures = await nativeNineGallery()
  const { sheet, authored, hex, iso } = fixtures
  const local = createWorkshopPintaPersistence({ namespace })
  await local.persistAssets(withProjected ? [sheet, authored, hex, iso] : [sheet, authored])
  const store = createGalleryStore(local)
  await store.getState().load()
  const db = idbMockDb(dbNameFor(namespace))
  const stored = () =>
    [hex, iso].flatMap((map) => [db.get(authorityKey(map.id)), db.get(mirrorKey(map.id))])
  return { ...fixtures, local, store, stored }
}

test('a galeria lista o projetado como indisponível, fora dos cartões, e o leva no backup inteiro', async () => {
  const { store, sheet, authored, hex, iso } = await workshopGallery('galeria-projetada')
  const state = store.getState()
  expect(state.assets.map(({ id }) => id).sort()).toEqual([sheet.id, authored.id].sort())
  expect(state.projected.map(({ id }) => id).sort()).toEqual([hex.id, iso.id].sort())
  expect(COPY.gallery.projectedUnavailable(['praca'])).toBe(
    'O mapa "praca" ainda não abre nesta versão do Pinta. Ele continua guardado.',
  )
  const zip = unzipSync(await zipGallery([...state.assets, ...state.projected]))
  const backup = zip[PINTA_GALLERY_ZIP_ENTRY]
  if (!backup) throw Error('O ZIP veio sem o backup')
  const { assets, warnings } = await readPintaWorkshopBackup(strFromU8(backup))
  expect(warnings).toEqual([])
  for (const map of [hex, iso]) {
    const back = assets.find(({ id }) => id === map.id)
    expect(back && pintaWorkshopAssetToJson(back)).toBe(pintaWorkshopAssetToJson(map))
  }
  expect(strFromU8(zip['LEIA-ME.txt']!)).toContain('O mapa "colmeia" está no arquivo da galeria.')
})

test('restaurar o backup traz o projetado como cópia, com o livro religado à cópia', async () => {
  const { store, stored, hex, iso } = await workshopGallery('galeria-restaura-projetado')
  const before = stored()
  const state = store.getState()
  const zip = unzipSync(await zipGallery([...state.assets, ...state.projected]))
  const { assets } = await readPintaWorkshopBackup(strFromU8(zip[PINTA_GALLERY_ZIP_ENTRY]!))
  expect(await store.getState().importAssets(assets, { atomic: true })).toEqual({
    added: 4,
    skipped: 0,
  })
  const copies = store.getState().projected.filter(({ id }) => id !== hex.id && id !== iso.id)
  expect(copies.map(({ name }) => name).sort()).toEqual(['colmeia-2', 'praca-2'])
  for (const copy of copies) {
    expect(pintaWorkshopAssetToJson(copy)).not.toBeNull()
    expect(copy.tilesetId).not.toBe(hex.tilesetId)
    const layers = new Set(copy.layers.map(({ id }) => id))
    for (const rule of copy.automapping?.rules ?? [])
      for (const plane of [...rule.input, ...rule.outputs.flat()]) {
        expect(layers.has(plane.layer)).toBe(true)
        expect(plane.sheet).toBe(copy.tilesetId)
      }
  }
  expect(copies.find(({ name }) => name === 'colmeia-2')?.automapping?.rules).toHaveLength(1)
  // The originals were not rewritten by the restore.
  const after = stored()
  for (const [index, record] of before.entries()) expect(after[index]).toBe(record)
  const reopened = createGalleryStore(
    createWorkshopPintaPersistence({ namespace: 'galeria-restaura-projetado' }),
  )
  await reopened.getState().load()
  expect(withoutSession(reopened.getState().projected)).toEqual(
    withoutSession(store.getState().projected).sort(
      (a, b) =>
        reopened.getState().projected.findIndex(({ id }) => id === a.id) -
        reopened.getState().projected.findIndex(({ id }) => id === b.id),
    ),
  )
  expect(reopened.getState().projected.every(isWorkshopProjectedMap)).toBe(true)
})
