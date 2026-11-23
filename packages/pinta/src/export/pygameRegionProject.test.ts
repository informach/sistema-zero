import { expect, test } from 'bun:test'
import { nativeImageOf } from '../../scripts/homologacao/generate'
import { regionVilaPlatform } from '../testing/regionVilaPlatform'
import { buildPygamePintaScenesModule } from './pythonScenesModuleSource'
import { readPintaRegionImageWorld } from './regionImageWorld'
import { buildScenePackage } from './scenePackage'

test('the regional Pygame package ships the shared provided module and a PNG 5 world', async () => {
  const { map, cabana, assets } = regionVilaPlatform()
  const files = await buildScenePackage(map, assets, 'pygame', { imageOf: nativeImageOf })
  expect(files['pinta_cenario.py']).toBe(buildPygamePintaScenesModule())
  expect(files['requirements.txt']).toBe('pygame-ce==2.5.8\n')
  expect(String(files['main.py'])).toContain('from pinta_cenario import carregar_cenario')
  const png = files['cenario.png']
  if (!(png instanceof Uint8Array)) throw new Error('O pacote precisa do cenario.png.')
  // The same complete reader that admits PNG 5 in Studio opens the packaged world.
  const world = readPintaRegionImageWorld(png)
  expect(world.rootId).toBe(map.id)
  expect([...world.maps.keys()].sort()).toEqual([map.id, cabana.id].sort())
  expect(world.maps.get(map.id)?.data.scene.origin).toEqual(map.origin)
  expect(String(files['LEIA-ME.txt'])).toContain('python main.py')
  const damaged = png.slice()
  damaged[damaged.length - 9] = damaged[damaged.length - 9]! ^ 1
  expect(() => readPintaRegionImageWorld(damaged)).toThrow()
})
