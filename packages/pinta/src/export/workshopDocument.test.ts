import { expect, test } from 'bun:test'
import { automapFixture } from '../testing/automapFixture'
import { isPintaAuthoredMap } from '../tiles/automapping/model'
import { prepareMapRegions } from '../tiles/regionMap'
import {
  pintaWorkshopAssetFromJson,
  pintaWorkshopAssetToJson,
  pintaWorkshopBackup,
  readPintaWorkshopBackup,
} from './workshopDocument'

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
    const changed = { ...sheet, solid: [true] }
    expect(await pintaWorkshopBackup([changed, input])).toBeNull()
  }
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
