import { mkdir, writeFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import type { SceneBox } from '@sistemazero/core/studio/pinta-scene-geometry'
import {
  createTilemapAsset,
  isObjectLayer,
  type MapSetAsset,
  pintaAssetReferenceIds,
} from '../../src/core/project'
import { galleryToPintaJson } from '../../src/export/projectJson'
import { createMapObject } from '../../src/tiles/mapObjects'
import { vilaEFloresta } from './fixture'

/** Entirely native fixture: integer authoring coordinates and one solid tile in
 * a reusable set. Scaling that set makes the tile narrower than the old samples. */
export function physicsScenario() {
  const fixture = vilaEFloresta()
  const original = fixture.assets.find((a) => a.kind === 'map-set')
  const tiles = fixture.assets.find((a) => a.id === fixture.map.tilesetId)
  if (original?.kind !== 'map-set' || tiles?.kind !== 'tileset')
    throw new Error('Faltam os recursos da Vila')
  const solid = tiles.solid.findIndex(Boolean)
  if (solid < 0) throw new Error('A fixture precisa de uma peça sólida real')
  const set = structuredClone(original)
  set.id = 'qa-physics-wall-set'
  set.name = 'Parede estreita'
  set.map = {
    ...set.map,
    id: 'qa-physics-wall-definition',
    cols: 16,
    rows: 1,
    layers: [
      {
        id: 'wall-tiles',
        name: 'Peça sólida',
        visible: true,
        cells: Int16Array.from([solid, ...Array(15).fill(-1)]),
      },
    ],
  }
  const map = structuredClone(fixture.map)
  map.id = 'qa-physics'
  map.name = 'geometria-fisica'
  map.cols = 8
  map.rows = 4
  map.layers = [
    {
      id: 'floor',
      name: 'Chão',
      visible: true,
      cells: new Int16Array(map.cols * map.rows).fill(-1),
    },
    {
      kind: 'objects',
      id: 'objects',
      name: 'Objetos',
      visible: true,
      objects: [
        {
          id: 'start',
          name: 'Início',
          type: '',
          role: 'start',
          x: 8,
          y: 32,
          width: 0,
          height: 0,
          properties: {},
        },
        {
          id: 'wall',
          name: 'Parede',
          type: '',
          shape: 'set',
          setId: set.id,
          x: 40,
          y: 0,
          width: 1,
          height: 64,
          properties: {},
        },
      ],
    },
  ]
  return { map, assets: [...fixture.assets, set, map] }
}

export type PhysicsProbe = { name: string; box: SceneBox; blocked: boolean }
/** One authoring fixture shared by the editor, JavaScript, PNG reader and portable Pygame. */
export function objectPhysicsScenario() {
  const fixture = physicsScenario(),
    map = fixture.map
  map.id = 'qa-object-physics'
  map.name = 'contornos-do-cenario'
  map.physics = 'precise'
  map.cols = 16
  map.rows = 12
  map.layers[0] = {
    id: 'floor',
    name: 'Chão',
    visible: true,
    cells: new Int16Array(map.cols * map.rows).fill(-1),
  }
  const layer = map.layers.find(isObjectLayer)
  if (!layer) throw new Error('Falta a camada de objetos')
  layer.objects.push(
    createMapObject({
      id: 'ellipse',
      name: 'Elipse',
      x: 64,
      y: 16,
      width: 32,
      height: 16,
      shape: 'ellipse',
      collision: true,
    }),
    createMapObject({
      id: 'rotated',
      name: 'Parede girada',
      x: 112,
      y: 16,
      width: 16,
      height: 16,
      shape: 'rect',
      rotation: 30,
      collision: true,
    }),
    createMapObject({
      id: 'concave',
      name: 'Parede em L',
      x: 160,
      y: 16,
      width: 32,
      height: 32,
      shape: 'polygon',
      points: [
        { x: 0, y: 0 },
        { x: 32, y: 0 },
        { x: 32, y: 8 },
        { x: 8, y: 8 },
        { x: 8, y: 32 },
        { x: 0, y: 32 },
      ],
      collision: true,
    }),
    createMapObject({
      id: 'path',
      name: 'Linha aberta',
      x: 16,
      y: 80,
      width: 32,
      height: 32,
      shape: 'polyline',
      points: [
        { x: 0, y: 0 },
        { x: 32, y: 0 },
        { x: 32, y: 32 },
      ],
      collision: true,
    }),
    createMapObject({
      id: 'point',
      name: 'Ponto sólido',
      x: 80,
      y: 96,
      shape: 'point',
      collision: true,
    }),
  )
  const base = fixture.assets.find((a) => a.id === 'qa-physics-wall-set')
  if (base?.kind !== 'map-set') throw new Error('Falta o conjunto base')
  const affine: MapSetAsset = structuredClone(base)
  affine.id = 'qa-affine-set'
  affine.name = 'Conjunto afim'
  affine.map = {
    ...affine.map,
    id: 'qa-affine-definition',
    cols: 2,
    rows: 2,
    layers: [
      { id: 'floor', name: 'Chão', visible: true, cells: new Int16Array(4).fill(-1) },
      {
        id: 'objects',
        kind: 'objects',
        name: 'Paredes',
        visible: true,
        objects: [
          createMapObject({
            id: 'inner-ellipse',
            name: 'Elipse interna',
            x: 4,
            y: 4,
            width: 8,
            height: 4,
            shape: 'ellipse',
            rotation: 37,
            collision: true,
          }),
          createMapObject({
            id: 'reference',
            name: 'Referência',
            x: 0,
            y: 0,
            properties: { alvo: { type: 'object', value: 'inner-ellipse' } },
          }),
        ],
      },
    ],
  }
  fixture.assets.push(affine)
  layer.objects.push(
    createMapObject({
      id: 'affine',
      name: 'Conjunto girado e espelhado',
      x: 160,
      y: 96,
      width: 48,
      height: 16,
      shape: 'set',
      setId: affine.id,
      rotation: 30,
      flipX: true,
    }),
  )
  const probes: PhysicsProbe[] = [
    {
      name: 'parede fina dentro do corpo',
      box: { x: 35, y: 28, width: 10, height: 10 },
      blocked: true,
    },
    { name: 'centro da elipse', box: { x: 79, y: 23, width: 2, height: 2 }, blocked: true },
    { name: 'canto livre da elipse', box: { x: 64, y: 16, width: 1, height: 1 }, blocked: false },
    { name: 'centro da parede girada', box: { x: 117, y: 26, width: 1, height: 1 }, blocked: true },
    { name: 'fora da parede girada', box: { x: 112, y: 14, width: 1, height: 1 }, blocked: false },
    { name: 'perna do polígono', box: { x: 164, y: 40, width: 1, height: 1 }, blocked: true },
    { name: 'vão do polígono', box: { x: 184, y: 40, width: 1, height: 1 }, blocked: false },
    { name: 'segmento da linha', box: { x: 47.5, y: 94, width: 1, height: 1 }, blocked: true },
    { name: 'sem fechamento da linha', box: { x: 31, y: 95, width: 1, height: 1 }, blocked: false },
    { name: 'ponto dentro do corpo', box: { x: 79, y: 95, width: 2, height: 2 }, blocked: true },
    { name: 'fora do ponto', box: { x: 82, y: 95, width: 1, height: 1 }, blocked: false },
    {
      name: 'centro da elipse sob base afim',
      box: { x: 191.5, y: 118.5, width: 1, height: 1 },
      blocked: true,
    },
    {
      name: 'fora da elipse sob base afim',
      box: { x: 171, y: 96, width: 1, height: 1 },
      blocked: false,
    },
    { name: 'borda esquerda do mundo', box: { x: -1, y: 1, width: 1, height: 1 }, blocked: true },
    {
      name: 'borda direita sem penetração',
      box: { x: 255, y: 1, width: 1, height: 1 },
      blocked: false,
    },
    { name: 'fora do mundo', box: { x: 256, y: 1, width: 1, height: 1 }, blocked: true },
  ]
  return { ...fixture, probes }
}

/** A legacy scene leads to a precise scene and back, through the PNG world's registry. */
export function objectPhysicsWorldScenario() {
  const fixture = objectPhysicsScenario(),
    physicalMap = fixture.map
  const map = createTilemapAsset({
    name: 'corredor-dos-contornos',
    tilesetId: physicalMap.tilesetId,
    cols: 16,
    rows: 12,
    now: 1,
  })
  map.id = 'qa-physics-corridor'
  map.layers.push({
    id: 'doors',
    kind: 'objects',
    name: 'Portas',
    visible: true,
    objects: [
      createMapObject({ id: 'start', name: 'Início', role: 'start', x: 8, y: 32 }),
      createMapObject({
        id: 'to-physics',
        name: 'Ir aos contornos',
        shape: 'rect',
        role: 'door',
        x: 8,
        y: 32,
        width: 16,
        height: 16,
        properties: { destino: physicalMap.name },
      }),
    ],
  })
  const objects = physicalMap.layers.find(isObjectLayer)
  if (!objects) throw new Error('Falta a camada física')
  objects.objects.push(
    createMapObject({
      id: 'back',
      name: 'Voltar ao corredor',
      shape: 'rect',
      role: 'door',
      x: 224,
      y: 144,
      width: 16,
      height: 16,
      properties: { destino: map.name },
    }),
  )
  return { ...fixture, map, physicalMap, assets: [...fixture.assets, map] }
}

if (import.meta.main) {
  const out = resolve(process.argv[2] ?? '.tmp/pinta-physics-e2e')
  await mkdir(out, { recursive: true })
  const fixture = physicsScenario()
  await writeFile(resolve(out, 'geometria-fisica.pinta.json'), galleryToPintaJson(fixture.assets))
  if (process.argv.includes('--objects')) {
    const fixture = objectPhysicsScenario()
    const { nativeImageOf, nativeImageRaster } = await import('./generate')
    const { deriveLoadedPintaImage } = await import('../../src/export/portableImage')
    const { buildScenePackage } = await import('../../src/export/scenePackage')
    const { exportPintaScene } = await import('../../src/export/scene')
    const needed = new Set(pintaAssetReferenceIds(fixture.map))
    for (const id of needed) {
      const asset = fixture.assets.find((a) => a.id === id)
      if (asset) for (const next of pintaAssetReferenceIds(asset)) needed.add(next)
    }
    const dependencies = fixture.assets.filter(
      (a) => needed.has(a.id) && a.id !== fixture.map.id && a.kind !== 'tilemap',
    )
    const scene = await exportPintaScene(
      fixture.map,
      (id) => fixture.assets.find((a) => a.id === id) ?? null,
      nativeImageOf,
    )
    const { sceneIntersectsBox } = await import('@sistemazero/core/studio/pinta-scene-geometry')
    for (const probe of fixture.probes)
      if (sceneIntersectsBox(scene, probe.box) !== probe.blocked)
        throw new Error(`Geometria divergente: ${probe.name}`)
    await writeFile(
      resolve(out, 'contornos-do-cenario.pinta.json'),
      galleryToPintaJson(fixture.assets),
    )
    await writeFile(
      resolve(out, 'physics-probes.json'),
      JSON.stringify({ scene, probes: fixture.probes }, null, 2),
    )
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
        resolve(out, `physics-${scale}x.png`),
        Buffer.from(image.dataUrl.split(',')[1]!, 'base64'),
      )
      await writeFile(
        resolve(out, `physics-${scale}x.json`),
        JSON.stringify(image.derivation, null, 2),
      )
    }
    for (const target of ['pygame', 'phaser', 'godot'] as const) {
      const files = await buildScenePackage(fixture.map, fixture.assets, target, {
          imageOf: nativeImageOf,
        }),
        folder = resolve(out, target)
      for (const [name, content] of Object.entries(files)) {
        const path = resolve(folder, name)
        if (!path.startsWith(folder + sep)) throw new Error('Caminho fora do pacote')
        await mkdir(resolve(path, '..'), { recursive: true })
        await writeFile(path, content)
      }
      if (target === 'godot') {
        await writeFile(
          resolve(folder, 'qa-physics.gd'),
          await Bun.file(new URL('./physics-godot.gd', import.meta.url)).text(),
        )
        await writeFile(
          resolve(folder, 'physics-probes.json'),
          JSON.stringify({ probes: fixture.probes }),
        )
      }
    }
    // Exercise Tiled's real distinction between tile images and geometric objects.
    const artMap = structuredClone(fixture.map)
    const artLayer = artMap.layers.find(isObjectLayer)
    const ellipse = artLayer?.objects.find((o) => o.id === 'ellipse')
    if (!ellipse) throw new Error('Falta a elipse da fixture')
    ellipse.art = { assetId: artMap.tilesetId, tile: 0 }
    const artScene = await exportPintaScene(
      artMap,
      (id) => fixture.assets.find((a) => a.id === id) ?? null,
      nativeImageOf,
    )
    const artFolder = resolve(out, 'art-tiled')
    const artFiles = await buildScenePackage(artMap, fixture.assets, 'tiled', {
      imageOf: nativeImageOf,
    })
    for (const [name, content] of Object.entries(artFiles)) {
      const path = resolve(artFolder, name)
      if (!path.startsWith(artFolder + sep)) throw new Error('Caminho fora do pacote')
      await mkdir(resolve(path, '..'), { recursive: true })
      await writeFile(path, content)
    }
    await writeFile(
      resolve(artFolder, 'physics-probes.json'),
      JSON.stringify({ scene: artScene, probes: fixture.probes }),
    )
  }
}
