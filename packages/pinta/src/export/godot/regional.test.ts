import { expect, test } from 'bun:test'
import type { PintaRegionSceneWire } from '@sistemazero/core/studio/pinta-region-scene'
import { nativeImageOf } from '../../../scripts/homologacao/generate'
import { projectedVila } from '../../testing/projectedVila'
import { regionVilaPlatform } from '../../testing/regionVilaPlatform'
import { exportPintaRegionScene } from '../regionScene'
import { buildScenePackage } from '../scenePackage'
import { godotProjectedScript, godotRegionalScript, godotScript } from './project'
import { assertGodotRegionWork, GODOT_REGION_WORK } from './regionWork'

test('the regional Godot package carries the region reader, Scene4 maps and the start ID', async () => {
  const { map, cabana, assets } = regionVilaPlatform()
  const files = await buildScenePackage(map, assets, 'godot', { imageOf: nativeImageOf })
  expect(files['pinta.gd']).toBe(godotRegionalScript)
  expect(String(files['project.godot'])).toContain('config_version=5')
  expect(String(files['main.tscn'])).toContain('MeuMapa')
  expect(JSON.parse(String(files['start.json']))).toBe(map.id)
  const maps = JSON.parse(String(files['maps.json'])) as Record<string, PintaRegionSceneWire>
  expect(Object.keys(maps)).toEqual([map.id, cabana.id])
  for (const [id, scene] of Object.entries(maps)) {
    expect(scene.version).toBe(4)
    expect(scene.id).toBe(id)
    for (const layer of scene.layers)
      if (layer.kind === 'tiles') expect(layer.cells.encoding).toBe('i16le-base64-v1')
    for (const entry of [...scene.tilesets, ...(scene.art ?? [])]) {
      expect(entry.image.startsWith('mapas/')).toBe(true)
      expect(files[entry.image]).toBeInstanceOf(Uint8Array)
    }
  }
  expect(maps[map.id]!.origin).toEqual(map.origin)
  expect(String(files['LEIA-ME.txt'])).toContain('Godot 4.7.2')
  expect(files['desenhos.pinta.json']).toBeDefined()
  // The regional reader stays out of the legacy script, which keeps its dense cells.
  expect(godotRegionalScript).toContain('func _read_package() -> bool:')
  expect(godotRegionalScript).toContain('const REGION_SIDE := 32')
  expect(godotRegionalScript).not.toContain('${')
  expect(godotScript).not.toContain('_read_package')
  expect(godotScript).not.toContain('regionIndex')
})

test('set instances are charged before the Godot package is written', async () => {
  const { map, assets } = regionVilaPlatform()
  const { scene } = await exportPintaRegionScene(
    map,
    (id) => assets.find((asset) => asset.id === id) ?? null,
    nativeImageOf,
  )
  expect(() => assertGodotRegionWork(scene)).not.toThrow()
  const objects = scene.layers.find((layer) => layer.kind === 'objects')
  const tiles = scene.layers.find((layer) => layer.kind === 'tiles')
  if (objects?.kind !== 'objects' || tiles?.kind !== 'tiles' || !objects.objects[0])
    throw new Error('A Vila precisa de camadas de objetos e de peças.')
  const instance = (index: number) => ({ ...objects.objects[0]!, id: `copia-${index}`, setId: 's' })
  const missing = { ...scene, layers: [...scene.layers, { ...objects, objects: [instance(0)] }] }
  expect(() => assertGodotRegionWork(missing)).toThrow('Falta um conjunto')

  const full = { col: 0, row: 0, cells: new Int16Array(32 * 32) }
  const definition = {
    id: 's',
    origin: { col: 0, row: 0 },
    cols: 32,
    rows: 32,
    layers: [{ ...tiles, cells: { ...tiles.cells, chunks: [full] } }],
  }
  const copies = Math.floor(GODOT_REGION_WORK.cells / full.cells.length) + 1
  const crowded = {
    ...scene,
    sets: [...(scene.sets ?? []), definition],
    layers: [
      ...scene.layers,
      { ...objects, objects: Array.from({ length: copies }, (_, index) => instance(index)) },
    ],
  }
  expect(() => assertGodotRegionWork(crowded)).toThrow('espaço demais no Godot')
  expect(() =>
    assertGodotRegionWork({
      ...crowded,
      layers: [...scene.layers, { ...objects, objects: [instance(0)] }],
    }),
  ).not.toThrow()
})

test('a projected world goes to Godot with the projected reader, its layouts and no native backup', async () => {
  const { map, cabana, assets } = projectedVila()
  const files = await buildScenePackage(map, assets, 'godot', { imageOf: nativeImageOf })
  expect(files['pinta.gd']).toBe(godotProjectedScript)
  expect(godotProjectedScript).not.toBe(godotRegionalScript)
  const layouts = JSON.parse(String(files['projections.json'])) as Record<
    string,
    { root: { projection: { kind: string } } }
  >
  expect(layouts[map.id]?.root.projection.kind).toBe('isometric')
  expect(layouts[cabana.id]?.root.projection.kind).toBe('hexagonal')
  const maps = JSON.parse(String(files['maps.json'])) as Record<string, { version: number }>
  expect(Object.values(maps).map((scene) => scene.version)).toEqual([5, 5])
  expect(files['desenhos.pinta.json']).toBeUndefined()
  expect(String(files['LEIA-ME.txt'])).toContain('projections.json')
  await expect(
    buildScenePackage(map, assets, 'pygame', { imageOf: nativeImageOf }),
  ).rejects.toThrow('adaptador de projeção')
})
