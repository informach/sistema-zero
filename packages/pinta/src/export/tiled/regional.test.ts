import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { createRegionCellReader, PINTA_REGION_LIMITS } from '@sistemazero/core/creations'
import type { PintaRegionSceneWire } from '@sistemazero/core/studio/pinta-region-scene'
import { nativeImageOf } from '../../../scripts/homologacao/generate'
import { warnSkippedInCi } from '../../testing/ciPython'
import { projectedVila } from '../../testing/projectedVila'
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
  editorsettings?: { chunksize?: { width: number; height: number } }
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

test('the regional Tiled files ask Tiled to keep 32×32 chunks in JSON and TMX', async () => {
  const { map, assets } = regionVila()
  const files = await buildScenePackage(map, assets, 'tiled', { imageOf: nativeImageOf })
  const document = JSON.parse(String(files['mapas/mapa-0/mapa.json'])) as TiledDocument
  expect(document.editorsettings).toEqual({ chunksize: { width: 32, height: 32 } })
  const tmx = String(files['mapas/mapa-0/mapa.tmx'])
  expect(tmx).toContain('<editorsettings><chunksize width="32" height="32"/></editorsettings>')
  expect(tmx.indexOf('<editorsettings>')).toBeLessThan(tmx.indexOf('<properties>'))
  const entries = new Map(
    Object.entries(files).map(([key, value]) => [
      key,
      typeof value === 'string' ? new TextEncoder().encode(value) : value,
    ]),
  )
  const source = tiledPackageSource(entries, 'mapas/mapa-0/mapa.tmx')
  const fromTmx = await importRegionalTiledScene(tiledXmlToJson(tmx), source.resolver)
  const fromJson = await importRegionalTiledScene(document, source.resolver)
  expect(fromTmx.scene).toEqual(fromJson.scene)
})

test('a large map re-saved by Tiled in 16×16 chunks returns whole: the ceiling counts Pinta regions', async () => {
  const { map, assets } = regionVila()
  const files = await buildScenePackage(map, assets, 'tiled', { imageOf: nativeImageOf })
  const path = 'mapas/mapa-0/mapa.json'
  const input = JSON.parse(String(files[path])) as TiledDocument
  const floor = flatten(input.layers).find((layer) =>
    layer.chunks?.some((chunk) => chunk.x === -64 && chunk.y === -64),
  )
  if (!floor?.chunks) throw new Error('A camada assinada da Vila não veio no Tiled.')
  const gid = floor.chunks.find((chunk) => chunk.x === -64 && chunk.y === -64)!.data[0]!
  // 23×23 Pinta regions filled to the edge: 529 regions, which Tiled writes as 2,116 chunks.
  const side = 23 * 32,
    start = 2048
  const cells = new Map<string, number>()
  for (const chunk of floor.chunks)
    for (const [i, value] of chunk.data.entries())
      if (value)
        cells.set(`${chunk.x + (i % chunk.width)},${chunk.y + Math.floor(i / chunk.width)}`, value)
  for (let y = start; y < start + side; y++)
    for (let x = start; x < start + side; x++) cells.set(`${x},${y}`, gid)
  const tiledChunks = new Map<string, Chunk>()
  for (const [key, value] of cells) {
    const [x, y] = key.split(',').map(Number) as [number, number]
    const cx = Math.floor(x / 16) * 16,
      cy = Math.floor(y / 16) * 16
    let chunk = tiledChunks.get(`${cx},${cy}`)
    if (!chunk) {
      chunk = { x: cx, y: cy, width: 16, height: 16, data: new Array(256).fill(0) }
      tiledChunks.set(`${cx},${cy}`, chunk)
    }
    chunk.data[(y - cy) * 16 + x - cx] = value
  }
  floor.chunks = [...tiledChunks.values()]
  expect(floor.chunks.length).toBeGreaterThan(PINTA_REGION_LIMITS.maxChunks)
  const source = tiledPackageSource(
    new Map(
      Object.entries(files).map(([key, value]) => [
        key,
        typeof value === 'string' ? new TextEncoder().encode(value) : value,
      ]),
    ),
    path,
  )
  const { scene } = await importRegionalTiledScene(input, source.resolver)
  const imported = scene.layers.find((layer) => layer.id === property(floor.properties, 'pinta:id'))
  if (imported?.kind !== 'tiles') throw new Error('A camada re-salva não voltou.')
  const reader = createRegionCellReader(imported.cells)
  expect(reader.at(-64, -64)).toBe(3)
  expect(reader.at(start, start)).toBe(reader.at(-64, -64))
  expect(reader.at(start + side - 1, start + side - 1)).toBe(reader.at(-64, -64))
  expect(reader.at(start + side, start)).toBe(-1)
  expect(imported.cells.chunks.length).toBeGreaterThanOrEqual(529)
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
warnSkippedInCi(
  tiledBinary,
  'Os ensaios do Tiled de verdade com cenários regionais pularam: o CI não tem o Tiled (PINTA_TILED_BIN).',
)
test.skipIf(!tiledBinary)(
  'Tiled opens JSON and external TSX, then round-trips the whole Vila and Cabana scenes',
  async () => {
    const { map, cabana, assets } = regionVila()
    const files = await buildScenePackage(map, assets, 'tiled', {
      imageOf: nativeImageOf,
    })
    // Cells with flags, objects and doors, sets, physics, sheets and art, as the players read them.
    const authored = await Promise.all(
      [map, cabana].map(
        async (source) =>
          (
            await exportPintaRegionScene(
              source,
              (id) => assets.find((asset) => asset.id === id) ?? null,
              nativeImageOf,
            )
          ).scene,
      ),
    )
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
          expect([tmxMap.warnings, jsonMap.warnings]).toEqual([[], []])
          expect(jsonMap.scene).toEqual(authored[index]!)
        }
      }
    } finally {
      await rm(scratch, { force: true, recursive: true })
    }
  },
  60_000,
)

async function projectedPackage() {
  const { map, assets } = projectedVila()
  return buildScenePackage(map, assets, 'tiled', { imageOf: nativeImageOf })
}

test('projected Tiled packages use native orientations and preserve exact physical metadata', async () => {
  const files = await projectedPackage()
  const iso = JSON.parse(String(files['mapas/mapa-0/mapa.json'])) as TiledDocument
  const hex = JSON.parse(String(files['mapas/mapa-1/mapa.json'])) as TiledDocument
  expect(iso.orientation).toBe('isometric')
  expect(hex.orientation).toBe('hexagonal')
  expect(
    flatten(hex.layers)
      .flatMap((layer) => layer.chunks ?? [])
      .find((chunk) => chunk.x === -64 && chunk.y === -64)?.data[0],
  ).toBe(0x60000004)
  expect(files['mapas/mapa-0/mapa.tmx']).toContain('orientation="isometric"')
  expect(files['mapas/mapa-1/mapa.tmx']).toContain('hexsidelength="16"')
  expect(files['mapas/mapa-1/mapa.tmx']).toContain('staggerindex="odd"')
  expect(files['mapas/mapa-1/tiles-0.tsx']).toContain('objectalignment="bottomleft"')
  const objects = flatten(iso.layers).flatMap((layer) => layer.objects ?? [])
  const door = objects.find((object) =>
    String(property(object.properties, 'pinta:object')).includes('"id":"door"'),
  )!
  expect([door.x, door.y]).toEqual([144, 48])
  expect(JSON.parse(String(property(door.properties, 'pinta:object'))).geometry).toEqual({
    x: 96,
    y: 96,
    width: 16,
    height: 16,
  })
})

test.skipIf(!tiledBinary)(
  'Tiled opens projected JSON and external TSX, then round-trips signed GIDs',
  async () => {
    const files = await projectedPackage()
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
          expect(result.orientation).toBe(original.orientation)
          expect(occupied(result)).toEqual(occupied(original))
          expect(result.tilesets.map((sheet) => sheet.firstgid)).toEqual(
            original.tilesets.map((sheet) => sheet.firstgid),
          )
          for (const key of [
            'pinta:id',
            'pinta:bounds',
            'pinta:physics',
            'pinta:sets',
            'pinta:projection',
          ])
            expect(property(result.properties, key)).toEqual(property(original.properties, key))
        }
      }
    } finally {
      await rm(scratch, { force: true, recursive: true })
    }
  },
  60_000,
)
