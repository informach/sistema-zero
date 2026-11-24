import { beforeEach, expect, it } from 'bun:test'
import { vilaEFloresta } from '../../scripts/homologacao/fixture'
import { clearIdbMock } from '../testing/idbMock'
import { capturePintaAssetForImage, createPintaPersistence } from './persistence'

beforeEach(clearIdbMock)

it('captures named destination maps and their native resources in the protected inventory', async () => {
  const { map, cabana, assets } = vilaEFloresta()
  const namespace = 'scene-world-capture'
  const persistence = createPintaPersistence({ namespace })
  await persistence.persistAssets(assets)
  const normal = await capturePintaAssetForImage(map.id, { namespace })
  if (!normal.ok) throw new Error(normal.reason)
  expect(normal.assets?.some((a) => a.id === cabana.id) ?? false).toBe(false)
  const world = await capturePintaAssetForImage(map.id, { namespace, includeSceneMaps: true })
  if (!world.ok) throw new Error(world.reason)
  expect(new Set(world.assets?.map((a) => a.id))).toEqual(
    new Set(assets.filter((a) => a.id !== map.id).map((a) => a.id)),
  )
  expect(world.source.id).toBe(map.id)
  expect(world.tileset?.id).toBe(map.tilesetId)
})
