import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { createRegionCellReader } from '@sistemazero/core/creations'
import type { PintaRegionSceneWire } from '@sistemazero/core/studio/pinta-region-scene'
import { nativeImageOf } from '../../../scripts/homologacao/generate'
import { regionVila } from '../../testing/regionVila'
import { decodeRegionGalleryBackup } from '../regionBackup'
import { exportPintaRegionScene } from '../regionScene'
import { buildScenePackage, scenePackageBlob } from '../scenePackage'
import { cellToGid, tiledMap } from './export'
import { importRegionalTiledScene, importTiledScene, tiledXmlToJson } from './import'
import { readTiledPackage, tiledPackageSource } from './package'
import { importRegionalTiledWorld } from './regionWorld'

type Property = { name: string; value: unknown }
interface Chunk {
  x: number
  y: number
  width: number
  height: number
  data: number[]
}
interface Layer {
  type: string
  chunks?: Chunk[]
  layers?: Layer[]
  objects?: Array<{ x: number; y: number; properties?: Property[] }>
  properties?: Property[]
}
interface TiledDocument {
  infinite: boolean
  orientation: string
  tiledversion: string
  layers: Layer[]
  tilesets: Array<{
    firstgid: number
    source?: string
    tiles?: Array<{ id: number; animation?: unknown; properties?: Property[] }>
    properties?: Property[]
  }>
  properties: Property[]
}
const property = (properties: Property[] | undefined, name: string) =>
  properties?.find((p) => p.name === name)?.value
const flatten = (layers: Layer[]): Layer[] =>
  layers.flatMap((layer) => [layer, ...flatten(layer.layers ?? [])])
function occupied(map: TiledDocument) {
  return Object.fromEntries(
    flatten(map.layers)
      .filter((layer) => layer.type === 'tilelayer')
      .map((layer) => [
        property(layer.properties, 'pinta:id'),
        (layer.chunks ?? [])
          .flatMap((chunk) =>
            chunk.data.flatMap((gid, i) =>
              gid
                ? [[chunk.x + (i % chunk.width), chunk.y + Math.floor(i / chunk.width), gid]]
                : [],
            ),
          )
          .sort(([ax, ay], [bx, by]) => ay! - by! || ax! - bx!),
      ]),
  )
}

test('regional JSON, TMX and real TSX retain the signed sparse world and editable metadata', async () => {
  const { map, cabana, assets } = regionVila()
  const before = structuredClone(map)
  const files = await buildScenePackage(map, assets, 'tiled', {
    imageOf: nativeImageOf,
  })
  const document = JSON.parse(String(files['mapas/mapa-0/mapa.json'])) as TiledDocument
  const scenes = JSON.parse(String(files['maps.json'])) as Record<string, PintaRegionSceneWire>
  expect(Object.keys(scenes)).toEqual([map.id, cabana.id])
  expect(document.infinite).toBe(true)
  expect(document.orientation).toBe('orthogonal')
  expect(property(document.properties, 'pinta:sceneVersion')).toBe(4)
  expect(JSON.parse(String(property(document.properties, 'pinta:bounds')))).toEqual({
    ...map.origin,
    cols: map.cols,
    rows: map.rows,
  })
  const floor = flatten(document.layers).find((layer) =>
    layer.chunks?.some((chunk) => chunk.x === -64 && chunk.y === -64),
  )!
  const chunk = floor.chunks!.find((entry) => entry.x === -64 && entry.y === -64)!
  expect([chunk.width, chunk.height, chunk.data.length, chunk.data[0]]).toEqual([
    32,
    32,
    1024,
    cellToGid(3, 1),
  ])
  expect(JSON.parse(String(property(document.properties, 'pinta:sets')))).toEqual(
    scenes[map.id]!.sets!,
  )
  expect(document.tilesets.some((sheet) => sheet.tiles?.some((tile) => tile.animation))).toBe(true)
  expect(document.tilesets[1]!.firstgid).toBeGreaterThan(1)
  expect(
    flatten(document.layers).some((layer) =>
      layer.objects?.some((object) =>
        String(property(object.properties, 'pinta:object')).includes('"role":"door"'),
      ),
    ),
  ).toBe(true)
  expect(files['mapas/mapa-0/mapa.tmx']).toContain('<chunk x="-64" y="-64" width="32" height="32">')
  expect(files['mapas/mapa-0/mapa.tmx']).toContain('source="tiles-0.tsx"')
  expect(files['mapas/mapa-0/tiles-0.tsx']).toContain('<image source="images/tiles-0.png"')
  expect(files['mapas/mapa-0/images/tiles-0.png']).toBeInstanceOf(Uint8Array)
  const original = decodeRegionGalleryBackup(String(files['desenhos.pinta.json']))
  expect(original.warnings).toEqual([])
  expect(original.assets).toContainEqual(map)
  expect(original.assets).toContainEqual(cabana)
  expect(map).toEqual(before)
})

test('private return reads the edited Tiled chunks and properties instead of the original scene sidecar', async () => {
  const { map, assets } = regionVila()
  const files = await buildScenePackage(map, assets, 'tiled', {
    imageOf: nativeImageOf,
  })
  const path = 'mapas/mapa-0/mapa.json'
  const input = JSON.parse(String(files[path])) as TiledDocument
  const floor = flatten(input.layers).find((layer) =>
    layer.chunks?.some((chunk) => chunk.x === -64 && chunk.y === -64),
  )
  const chunk = floor?.chunks?.find((entry) => entry.x === -64 && entry.y === -64)
  if (!chunk || !floor) throw new Error('A camada assinada da Vila não veio no Tiled.')
  chunk.data[0] = cellToGid(2 | 0x1000, 1)
  floor.properties?.push({ name: 'recado', value: 'mudou no Tiled' })
  files[path] = JSON.stringify(input)
  const zip = await scenePackageBlob(files)
  const { entries } = await readTiledPackage([Object.assign(zip, { name: 'vila.zip' })])
  const source = tiledPackageSource(entries, path)
  await expect(importTiledScene(source.map(), source.resolver)).rejects.toThrow('infinitos')
  const { scene } = await importRegionalTiledScene(source.map(), source.resolver)
  const base = await exportPintaRegionScene(
    map,
    (id) => assets.find((a) => a.id === id) ?? null,
    nativeImageOf,
  )
  const imported = scene.layers.find((layer) => layer.id === property(floor.properties, 'pinta:id'))
  if (imported?.kind !== 'tiles') throw new Error('A camada editada não foi recuperada.')
  expect(scene.origin).toEqual(map.origin)
  expect(scene.physics).toBe(base.scene.physics)
  expect(scene.id).toBe(map.id)
  expect(scene.layers.length).toBeGreaterThanOrEqual(16)
  expect(scene.tilesets).toEqual(base.scene.tilesets)
  expect(scene.sets).toEqual(base.scene.sets)
  expect(scene.art).toEqual(base.scene.art)
  expect(imported.properties?.recado).toBe('mudou no Tiled')
  expect(createRegionCellReader(imported.cells).at(-64, -64)).toBe(2 | 0x1000)
  expect(imported.cells.chunks.length).toBeLessThan(32)
  await expect(importRegionalTiledWorld(entries, [path])).rejects.toThrow('destino')
  const recovered = await importRegionalTiledWorld(entries, [path, 'mapas/mapa-1/mapa.tmx'])
  expect(recovered.world.rootId).toBe(map.id)
  expect(recovered.world.maps.size).toBe(2)
  const recoveredRoot = recovered.world.maps.get(map.id)!
  expect(recoveredRoot.data.scene).toEqual(scene)
  const backInTiled = await tiledMap(recoveredRoot.data.scene)
  expect(occupied(backInTiled as unknown as TiledDocument)).toEqual(occupied(input))
  chunk.x--
  await expect(importRegionalTiledScene(input, source.resolver)).rejects.toThrow('fora da área')
})

test('missing linked maps fail instead of producing a partial package', async () => {
  const { map, cabana, assets } = regionVila()
  await expect(
    buildScenePackage(
      map,
      assets.filter((asset) => asset.id !== cabana.id),
      'tiled',
      {
        imageOf: nativeImageOf,
      },
    ),
  ).rejects.toThrow('destino')
})

const tiledBinary = process.env.PINTA_TILED_BIN
test.skipIf(!tiledBinary)(
  'Tiled opens JSON and external TSX, then round-trips signed GIDs',
  async () => {
    const { map, assets } = regionVila()
    const files = await buildScenePackage(map, assets, 'tiled', {
      imageOf: nativeImageOf,
    })
    const tempRoot = resolve(tmpdir())
    const scratch = await mkdtemp(join(tempRoot, 'pinta-tiled-regional-'))
    if (dirname(scratch) !== tempRoot || !basename(scratch).startsWith('pinta-tiled-regional-'))
      throw new Error('Diretório temporário inesperado.')
    try {
      for (const [file, content] of Object.entries(files)) {
        const path = join(scratch, file)
        await mkdir(dirname(path), { recursive: true })
        await writeFile(path, content)
      }
      const convert = async (format: string, input: string, output: string): Promise<string> => {
        const run = spawnSync(tiledBinary!, ['--export-map', format, input, output], {
          encoding: 'utf8',
          windowsHide: true,
          timeout: 10_000,
        })
        if (run.status !== 0) throw new Error(run.stderr || run.error?.message || 'Tiled failed')
        for (let n = 0; n < 60; n++) {
          const content = await readFile(output, 'utf8').catch(() => '')
          if (content.length) return content
          await Bun.sleep(50)
        }
        throw new Error('Tiled did not write its conversion')
      }
      for (const [index, file] of ['mapas/mapa-0', 'mapas/mapa-1'].entries()) {
        const folder = join(scratch, file)
        const original = JSON.parse(String(files[`${file}/mapa.json`])) as TiledDocument
        const nativeTmx = join(folder, `native-${index}.tmx`)
        const xml = await convert('tmx', join(folder, 'mapa.json'), nativeTmx)
        expect(xml).toContain('infinite="1"')
        for (const [i, tmx] of [join(folder, 'mapa.tmx'), nativeTmx].entries()) {
          const result = JSON.parse(
            await convert('json', tmx, join(folder, `native-${index}-${i}.json`)),
          ) as TiledDocument
          expect(result.tiledversion).toBe('1.12.2')
          expect(result.infinite).toBe(true)
          expect(occupied(result)).toEqual(occupied(original))
          expect(result.tilesets.map((sheet) => sheet.firstgid)).toEqual(
            original.tilesets.map((sheet) => sheet.firstgid),
          )
          for (const key of ['pinta:id', 'pinta:bounds', 'pinta:physics', 'pinta:sets'])
            expect(property(result.properties, key)).toEqual(property(original.properties, key))
          const entries = new Map(
            Object.entries(files).map(([key, value]) => [
              key,
              typeof value === 'string' ? new TextEncoder().encode(value) : value,
            ]),
          )
          const mapPath = `${file}/mapa.tmx`
          const tmxSource = tiledPackageSource(entries, mapPath)
          const tmxMap = await importRegionalTiledScene(
            tiledXmlToJson(await readFile(tmx, 'utf8')),
            tmxSource.resolver,
          )
          const jsonMap = await importRegionalTiledScene(result, tmxSource.resolver)
          expect(tmxMap.scene).toEqual(jsonMap.scene)
          expect(tmxMap.scene.id).toBe(property(original.properties, 'pinta:id') as string)
        }
      }
    } finally {
      await rm(scratch, { force: true, recursive: true })
    }
  },
  60_000,
)
