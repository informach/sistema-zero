import { mkdir, writeFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import type { PintaScene } from '@sistemazero/core/studio/pinta-scene'
import type { SceneBox } from '@sistemazero/core/studio/pinta-scene-geometry'
import { isObjectLayer, isTileLayer, pintaAssetReferenceIds } from '../../src/core/project'
import { encodeRegionSceneWorldPng } from '../../src/export/regionSceneWorldPng'
import { createMapObject } from '../../src/tiles/mapObjects'
import { physicsScenario } from './physics'
import { regionalGeometryFixture } from './regionalGeometryFixture'

/** Native authoring fixture shared by editor and external runtime qualification.
 * The fractional position comes from a layer offset, as in the actual editor.
 */
export function platformPhysicsScenario() {
  const fixture = physicsScenario(),
    map = fixture.map
  const set = fixture.assets.find((asset) => asset.id === 'qa-physics-wall-set')
  const tiles = fixture.assets.find((asset) => asset.id === map.tilesetId)
  if (set?.kind !== 'map-set' || tiles?.kind !== 'tileset')
    throw Error('Faltam as peças da plataforma')
  const tile = tiles.solid.findIndex(Boolean)
  if (tile < 0) throw Error('Falta a peça de referência')
  tiles.solid = tiles.tiles.map(() => false)
  tiles.platform = tiles.tiles.map((_, index) => index === tile)
  set.id = 'qa-physics-platform-set'
  set.name = 'piso-pequeno'
  set.map.cols = 1
  set.map.rows = 1
  set.map.layers = [
    { id: 'platform', name: 'Plataforma', visible: true, cells: Int16Array.of(tile) },
  ]
  map.id = 'qa-platform-physics'
  map.name = 'plataformas-precisas'
  map.physics = 'precise'
  map.cols = 16
  map.rows = 12
  const floor = map.layers.find(isTileLayer),
    objects = map.layers.find(isObjectLayer)
  if (!floor || !objects) throw Error('Faltam as camadas da plataforma')
  floor.cells = new Int16Array(map.cols * map.rows).fill(-1)
  objects.offsetY = 0.25
  objects.objects = [
    createMapObject({
      id: 'start',
      name: 'Início',
      role: 'start',
      x: 42,
      y: 20,
      width: 0,
      height: 0,
      shape: 'point',
    }),
    createMapObject({
      id: 'platform',
      name: 'Piso pequeno',
      shape: 'set',
      setId: set.id,
      x: 40,
      y: 40,
      width: 4,
      height: 2,
    }),
  ]
  return fixture
}

/** Independent numeric expectations, shared by JS, Pygame and Godot probes. */
export function platformGeometryCases(base: PintaScene) {
  const box = (x: number, y: number, width = 4, height = 4): SceneBox => ({ x, y, width, height })
  const objects = (scene: PintaScene) => {
    const layer = scene.layers.find((l) => l.kind === 'objects')
    if (layer?.kind !== 'objects') throw Error('Faltam os objetos da fixture')
    return layer
  }
  const instance = (scene: PintaScene) => {
    const object = objects(scene).objects.find((o) => o.setId)
    if (!object) throw Error('Falta a instância da plataforma')
    return object
  }
  const definition = (scene: PintaScene) => {
    const set = scene.sets?.find((s) => s.id === instance(scene).setId)
    if (!set) throw Error('Falta a definição da plataforma')
    const layer = set.layers.find((l) => l.kind === 'tiles')
    if (layer?.kind !== 'tiles') throw Error('Faltam as peças da plataforma')
    return { set, layer }
  }
  const make = (
    name: string,
    edit: (scene: PintaScene) => void,
    previous: SceneBox,
    desired: SceneBox,
    result: SceneBox | null,
    gravity = 1,
  ) => {
    const scene = structuredClone(base)
    scene.name = `plataforma-${name}`
    edit(scene)
    return { name, scene, previous, desired, gravity, result }
  }
  const rotated = (scene: PintaScene) => {
    objects(scene).offsetY = 0
    Object.assign(instance(scene), { x: 64, y: 40, width: 16, height: 4, rotation: 45 })
  }
  return [
    make('pequena', () => {}, box(40, 10), box(40, 100), box(40, 36.25)),
    make(
      'corpo-largo',
      () => {},
      box(37.2, 10, 9.6, 14.4),
      box(37.2, 100, 9.6, 14.4),
      box(37.2, 25.85, 9.6, 14.4),
    ),
    make('gravidade-invertida', () => {}, box(40, 100), box(40, 10), box(40, 42.25), -1),
    make('salto-por-baixo', () => {}, box(40, 100), box(40, 10), null),
    make('vista-de-cima', () => {}, box(40, 10), box(40, 100), null, 0),
    make('borda-livre', () => {}, box(36, 10), box(36, 100), null),
    make('giro', rotated, box(66, 0, 2), box(66, 100, 2), box(66, 38, 2)),
    make('giro-fora', rotated, box(58, 0, 2), box(58, 100, 2), null),
    make(
      'espelho-x',
      (scene) => {
        const { set, layer } = definition(scene)
        set.cols = 2
        layer.cells = [layer.cells[0]!, -1]
        objects(scene).offsetY = 0
        Object.assign(instance(scene), { x: 32, y: 32, width: 32, height: 16, flipX: true })
      },
      box(50, 0),
      box(50, 100),
      box(50, 28),
    ),
    make(
      'espelho-y',
      (scene) => {
        const { set, layer } = definition(scene)
        set.rows = 2
        layer.cells = [layer.cells[0]!, -1]
        objects(scene).offsetY = 0
        Object.assign(instance(scene), { x: 32, y: 32, width: 16, height: 32, flipY: true })
      },
      box(34, 0),
      box(34, 100),
      box(34, 44),
    ),
    make(
      'grupo',
      (scene) => {
        objects(scene).parentId = 'group'
        objects(scene).opacity = 0
        definition(scene).layer.offsetY = 8
        scene.layers.unshift({
          id: 'group',
          kind: 'group',
          name: 'Grupo',
          visible: true,
          offsetX: 0.5,
          offsetY: 1.25,
        })
      },
      box(40.5, 0),
      box(40.5, 100),
      box(40.5, 38.5),
    ),
    make(
      'invisivel',
      (scene) => {
        objects(scene).visible = false
      },
      box(40, 0),
      box(40, 100),
      null,
    ),
    make(
      'transparente',
      (scene) => {
        objects(scene).opacity = 0
      },
      box(40, 0),
      box(40, 100),
      box(40, 36.25),
    ),
    make(
      'fora-da-definicao',
      (scene) => {
        definition(scene).layer.offsetY = 160
      },
      box(40, 0),
      box(40, 100),
      box(40, 56.25),
    ),
    make(
      'solido-prevalece',
      (scene) => {
        definition(scene).layer.collision = true
      },
      box(40, 0),
      box(40, 100),
      null,
    ),
    make(
      'rampa-sob-teto',
      (scene) => {
        rotated(scene)
        objects(scene).objects.push({
          id: 'ceiling',
          name: 'Teto',
          type: '',
          shape: 'rect',
          x: 63,
          y: 35,
          width: 4,
          height: 4,
          collision: true,
          properties: {},
        })
      },
      box(68, 40, 2),
      box(66, 40.1, 2),
      box(68, 40, 2),
    ),
  ]
}

if (import.meta.main) {
  const out = resolve(process.argv[2] ?? '.tmp/pinta-platform-physics')
  const fixture = platformPhysicsScenario()
  const { nativeImageOf, nativeImageRaster } = await import('./generate')
  const { exportPintaScene } = await import('../../src/export/scene')
  const { galleryToPintaJson } = await import('../../src/export/projectJson')
  const { deriveLoadedPintaImage } = await import('../../src/export/portableImage')
  const { buildScenePackage } = await import('../../src/export/scenePackage')
  await mkdir(out, { recursive: true })
  await writeFile(resolve(out, 'platforms.pinta.json'), galleryToPintaJson(fixture.assets))
  await writeFile(
    resolve(out, 'scene.json'),
    JSON.stringify(
      await exportPintaScene(
        fixture.map,
        (id) => fixture.assets.find((a) => a.id === id) ?? null,
        nativeImageOf,
      ),
    ),
  )
  const needed = new Set(pintaAssetReferenceIds(fixture.map))
  for (const id of needed) {
    const asset = fixture.assets.find((a) => a.id === id)
    if (asset) for (const ref of pintaAssetReferenceIds(asset)) needed.add(ref)
  }
  const dependencies = fixture.assets.filter((a) => needed.has(a.id))
  for (const scale of [1, 2]) {
    const image = await deriveLoadedPintaImage(
      fixture.map,
      {
        version: 1,
        algorithm: 'pinta-image-1',
        drawingId: fixture.map.id,
        selection: { kind: 'map' },
        scale,
      },
      {
        dimension: 4096,
        imagePixels: 4194304,
        totalImagePixels: 16777216,
        imageBytes: 16777216,
        dataUrlChars: 800000,
      },
      {
        assets: dependencies,
        raster: nativeImageRaster(),
        tilesets: dependencies.filter(
          (a): a is Extract<typeof a, { kind: 'tileset' }> => a.kind === 'tileset',
        ),
      },
    )
    await writeFile(
      resolve(out, `platforms-${scale}x.png`),
      Buffer.from(image.dataUrl.split(',')[1]!, 'base64'),
    )
  }
  const base = await exportPintaScene(
    fixture.map,
    (id) => fixture.assets.find((asset) => asset.id === id) ?? null,
    nativeImageOf,
  )
  const geometry = platformGeometryCases(base)
  geometry[0]!.scene.name = fixture.map.name
  const canonical = geometry.map((item, index) => ({
    ...item,
    scene: regionalGeometryFixture({ ...item.scene, id: index === 0 ? fixture.map.id : item.name }),
  }))
  const worldPng = await encodeRegionSceneWorldPng(
    fixture.map.id,
    new Map(canonical.map((item) => [item.scene.id, item.scene])),
  )
  for (const target of ['pygame', 'phaser', 'godot'] as const) {
    const files = await buildScenePackage(fixture.map, fixture.assets, target, {
        imageOf: nativeImageOf,
      }),
      folder = resolve(out, target)
    for (const [name, content] of Object.entries(files)) {
      const destination = resolve(folder, name)
      if (!destination.startsWith(folder + sep)) throw Error('Caminho fora do pacote')
      await mkdir(resolve(destination, '..'), { recursive: true })
      await writeFile(destination, content)
    }
    const maps = files['maps.json']
    if (typeof maps !== 'string') throw Error('O pacote perdeu o mapa estruturado')
    const saved = Object.values(JSON.parse(maps))[0] as {
      tilesets: PintaScene['tilesets']
      art?: PintaScene['art']
    }
    const copies: Array<{ path: string; content: string | Uint8Array }> = []
    const cases = canonical.map((item, index) => {
      const capture = <T extends { image: string }>(asset: T): T => {
        const path = asset.image.replace('mapas/mapa-0/', `mapas/mapa-${index}/`)
        const content = files[asset.image]
        if (content === undefined) throw Error('A fixture perdeu uma imagem capturada.')
        copies.push({ path, content })
        return { ...asset, image: path }
      }
      return {
        ...item,
        scene: {
          ...item.scene,
          tilesets: saved.tilesets.map(capture),
          ...(saved.art ? { art: saved.art.map(capture) } : {}),
        },
      }
    })
    for (const copy of copies) {
      const path = resolve(folder, copy.path)
      if (!path.startsWith(folder + sep)) throw Error('Imagem fora do pacote')
      await mkdir(resolve(path, '..'), { recursive: true })
      await writeFile(path, copy.content)
    }
    await writeFile(
      resolve(folder, 'maps.json'),
      JSON.stringify(Object.fromEntries(cases.map((item) => [item.scene.id, item.scene]))),
    )
    await writeFile(resolve(folder, 'platform-probes.json'), JSON.stringify({ cases }))
    if (target === 'pygame') await writeFile(resolve(folder, 'cenario.png'), worldPng.png)
    if (target === 'godot')
      await writeFile(
        resolve(folder, 'qa-platforms.gd'),
        await Bun.file(new URL('./platforms-godot.gd', import.meta.url)).text(),
      )
  }
}
