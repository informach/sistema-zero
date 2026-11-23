import { expect, test } from 'bun:test'
import { strFromU8, unzipSync } from 'fflate'
import { automapFixture } from '../testing/automapFixture'
import { isPintaAuthoredMap } from '../tiles/automapping/model'
import { prepareMapRegions } from '../tiles/regionMap'
import { PINTA_GALLERY_ZIP_ENTRY } from './backupFormat'
import {
  pintaWorkshopAssetFromJson,
  pintaWorkshopAssetToJson,
  pintaWorkshopBackup,
  readPintaWorkshopBackup,
  workshopAssetBundleToJson,
} from './workshopDocument'
import { zipGallery } from './zip'

test('uma parte causal conserva autoria 9 em mapa denso ou regional antes da chegada da folha', async () => {
  const { map, sheet, book } = await automapFixture()
  const regional = prepareMapRegions(map)
  if (!regional.ok) throw Error(regional.reason)
  for (const base of [map, regional.map]) {
    const input =
      'origin' in base
        ? { ...base, schema: 9 as const, automapping: book }
        : { ...base, schema: 9 as const, automapping: book }
    const part = pintaWorkshopAssetToJson(input)
    if (!part) throw Error('Parte')
    const source = pintaWorkshopAssetFromJson(part)
    expect(source && isPintaAuthoredMap(source) && source.automapping).toEqual(book)
    expect(source && 'origin' in source).toBe('origin' in base)
    expect((await readPintaWorkshopBackup(part)).assets).toHaveLength(0)
    const full = await pintaWorkshopBackup([sheet, input])
    expect(full).toBeTruthy()
    const reopened = await readPintaWorkshopBackup(full!)
    expect(reopened.warnings).toEqual([])
    expect(reopened.assets.map((a) => a.id)).toEqual([sheet.id, map.id])
    // A repainted sheet leaves the rules out of date; the backup keeps the book as it is.
    const changed = { ...sheet, solid: [true] }
    const stale = await pintaWorkshopBackup([changed, input])
    if (!stale) throw Error('backup com a folha repintada')
    const kept = await readPintaWorkshopBackup(stale)
    expect(kept.warnings).toEqual([])
    const back = kept.assets.find((a) => a.id === map.id)
    expect(back && isPintaAuthoredMap(back) && back.automapping).toEqual(book)
  }
})

test('um mapa com a folha repintada não derruba o backup da galeria inteira', async () => {
  const { map, sheet, book } = await automapFixture()
  const other = await automapFixture()
  const changed = { ...sheet, solid: [true] }
  const gallery = [
    changed,
    { ...map, schema: 9 as const, automapping: book },
    other.sheet,
    { ...other.map, schema: 9 as const, automapping: other.book },
  ]
  const entries = unzipSync(await zipGallery(gallery))
  const backup = entries[PINTA_GALLERY_ZIP_ENTRY]
  if (!backup) throw Error('o ZIP veio sem o backup')
  const reopened = await readPintaWorkshopBackup(strFromU8(backup))
  expect(reopened.warnings).toEqual([])
  expect(reopened.assets.map((a) => a.id).sort()).toEqual(gallery.map((a) => a.id).sort())
  const books = reopened.assets.flatMap((a) => (isPintaAuthoredMap(a) ? [a.automapping] : []))
  expect(books).toContainEqual(book)
  expect(books).toContainEqual(other.book)
})

test('o arquivo editável separa peça ausente de arquivo que não pôde ser montado', async () => {
  const { map, sheet, book } = await automapFixture()
  const authored = { ...map, schema: 9 as const, automapping: book }
  const stale = await workshopAssetBundleToJson(authored, [{ ...sheet, solid: [true] }])
  expect(stale.ok).toBe(true)
  expect(await workshopAssetBundleToJson(authored, [])).toEqual({
    ok: false,
    reason: 'missing-dependency',
  })
  const broken = structuredClone(book)
  broken.rules[0]!.input[0]!.layer = 'camada-que-sumiu'
  expect(await workshopAssetBundleToJson({ ...authored, automapping: broken }, [sheet])).toEqual({
    ok: false,
    reason: 'unwritable',
  })
})
test('partes antigas, e um arquivo de backup com vários desenhos, mantêm seus formatos e fronteiras', async () => {
  const { map, sheet } = await automapFixture()
  const file = await pintaWorkshopBackup([sheet, map])
  if (!file) throw Error('Backup')
  expect(JSON.parse(file).version).toBe(1)
  expect(pintaWorkshopAssetFromJson(file)).toBeNull()
  expect((await readPintaWorkshopBackup(file)).assets.length).toBe(2)
  const parsed = pintaWorkshopAssetFromJson(pintaWorkshopAssetToJson(sheet)!)
  expect(parsed?.kind).toBe('tileset')
})
