import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { PINTA_PROJECTED_SCENE_MAX_INDEX_BYTES } from '@sistemazero/core/studio/pinta-projected-scene'
import {
  PINTA_REGION_SCENE_MAX_INDEX_BYTES,
  type PintaRegionSceneWire,
} from '@sistemazero/core/studio/pinta-region-scene'
import { nativeImageOf } from '../../../scripts/homologacao/generate'
import { projectedVila } from '../../testing/projectedVila'
import { regionVilaPlatform } from '../../testing/regionVilaPlatform'
import { exportPintaRegionScene } from '../regionScene'
import { buildScenePackage } from '../scenePackage'
import { pintaWorkshopAssetToJson, readPintaWorkshopBackup } from '../workshopDocument'
import { godotProjectedScript, godotRegionalScript } from './project'
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
  expect(godotRegionalScript).toContain('func _read_package() -> bool:')
  expect(godotRegionalScript).toContain('const REGION_SIDE := 32')
  expect(godotRegionalScript).not.toContain('${')
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

test('a projected world goes to Godot with the projected reader, its layouts and a reimportable native backup', async () => {
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
  const restored = await readPintaWorkshopBackup(String(files['desenhos.pinta.json']))
  expect(restored.warnings).toEqual([])
  for (const original of [map, cabana]) {
    const reopened = restored.assets.find((asset) => asset.id === original.id)
    if (!reopened) throw Error('A cópia editável perdeu um mapa')
    expect(pintaWorkshopAssetToJson(reopened)).toBe(pintaWorkshopAssetToJson(original))
  }
  expect(String(files['LEIA-ME.txt'])).toContain('projections.json')
  await expect(
    buildScenePackage(map, assets, 'pygame', { imageOf: nativeImageOf }),
  ).rejects.toThrow('adaptador de projeção')
})

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex')

test('the regional and projected pinta.gd stay the scripts rehearsed in Godot 4.7.2, apart from the scene 5 budget', () => {
  // The bytes the exporter writes today. Changing them needs a new Godot rehearsal
  // (scripts/homologacao/verify-region-godot.ts, with and without --projected) first.
  expect(sha256(godotRegionalScript)).toBe(
    '44df4acba54dcecac3e42db661472ecf7a033fed915507190d1e08331d50cce0',
  )
  expect(sha256(godotProjectedScript)).toBe(
    '8a6ee5d6d01c4228e0038319e0f6fa710ad83ed7b85c7b6f8fa1e0f569eb716d',
  )
  // 23/11/2026: f7123100c kept these scripts byte for byte as in 347b2527e, the line rehearsed
  // in Godot 4.7.2. Since then only a730f1dc1 changed them, raising the scene 5 index budget
  // from 4 MiB (2048 chunks of 2048 bytes) to the scene 4 budget. With the old budget they are
  // the rehearsed bytes again; the rehearsal of the new budget is still pending.
  const budget = (scene5: number) =>
    `map_bytes > (${scene5} if version == 5 else ${PINTA_REGION_SCENE_MAX_INDEX_BYTES})`
  const rehearsed = (script: string) => {
    expect(script.split(budget(PINTA_PROJECTED_SCENE_MAX_INDEX_BYTES))).toHaveLength(2)
    return sha256(script.replace(budget(PINTA_PROJECTED_SCENE_MAX_INDEX_BYTES), budget(4_194_304)))
  }
  expect(rehearsed(godotRegionalScript)).toBe(
    'd9db63670f1788e63dfb1b39027e1c2d5886863c7c358051ca35938fb143f74f',
  )
  expect(rehearsed(godotProjectedScript)).toBe(
    '0ad4cfc8d48b7c38f687e7ee76e9f86d40bb48b35df9963ff6ddb2a3359c0bbe',
  )
})
