import { expect, it } from 'bun:test'
import { createCanvas } from '@napi-rs/canvas'
import { PintaSceneSchema } from '@sistemazero/core/studio/pinta-scene'
import { sceneObjects, sceneSolidAt } from '@sistemazero/core/studio/pinta-scene-runtime'
import { createTilemapAsset, createTilesetAsset } from '../core/project'
import { updateMapObject } from '../tiles/mapObjects'
import { createMapSet, detachMapSet, placeMapSet } from '../tiles/sets'
import { addObjectLayer } from '../tiles/tilemapOps'
import { exportPintaScene } from './scene'
import { drawScene } from './sceneDrawing'

it('tile art objects use the same animation clock as terrain, including inside reflected sets', () => {
  const scene = PintaSceneSchema.parse({
    version: 1,
    id: 'map',
    name: 'map',
    tileSize: 16,
    cols: 4,
    rows: 2,
    tilesets: [
      {
        id: 'ts',
        name: 'ts',
        image: 'tiles',
        columns: 2,
        count: 2,
        solid: [],
        platform: [],
        animations: {
          0: [
            { tile: 0, duration: 100 },
            { tile: 1, duration: 100 },
          ],
        },
      },
    ],
    sets: [
      {
        id: 'set',
        cols: 1,
        rows: 1,
        layers: [
          {
            id: 'art',
            kind: 'objects',
            name: 'Art',
            visible: true,
            objects: [
              {
                id: 'flower',
                name: 'Flower',
                type: '',
                shape: 'art',
                art: { assetId: 'ts', tile: 0 },
                x: 0,
                y: 0,
                width: 16,
                height: 16,
                properties: {},
              },
            ],
          },
        ],
      },
    ],
    layers: [
      {
        id: 'objects',
        name: 'Objects',
        visible: true,
        kind: 'objects',
        objects: [
          {
            id: 'direct',
            name: 'Direct',
            type: '',
            shape: 'art',
            art: { assetId: 'ts', tile: 0 },
            x: 0,
            y: 0,
            width: 16,
            height: 16,
            properties: {},
          },
          {
            id: 'copy',
            name: 'Copy',
            type: '',
            shape: 'set',
            setId: 'set',
            x: 16,
            y: 0,
            width: 16,
            height: 16,
            flipX: true,
            properties: {},
          },
        ],
      },
    ],
  })
  const image = createCanvas(32, 16),
    brush = image.getContext('2d')
  brush.fillStyle = 'red'
  brush.fillRect(0, 0, 16, 16)
  brush.fillStyle = 'blue'
  brush.fillRect(16, 0, 16, 16)
  for (const [time, channel] of [
    [0, 0],
    [150, 2],
    [250, 0],
  ]) {
    const canvas = createCanvas(64, 32),
      ctx = canvas.getContext('2d')
    drawScene(
      ctx as unknown as CanvasRenderingContext2D,
      scene,
      new Map([['ts', image as unknown as CanvasImageSource]]),
      'back',
      time,
    )
    expect(ctx.getImageData(4, 4, 1, 1).data[channel!]).toBe(255)
    expect(ctx.getImageData(20, 4, 1, 1).data[channel!]).toBe(255)
  }
})

it('soltar um conjunto conserva os pixels nos quatro giros e espelhos', async () => {
  const ts = createTilesetAsset({ name: 'Peças', tileSize: 16 })
  ts.tiles = [ts.tiles[0]!]
  const sheet = createCanvas(16, 16),
    brush = sheet.getContext('2d')
  brush.fillStyle = 'red'
  brush.fillRect(0, 0, 16, 16)
  brush.fillStyle = 'blue'
  brush.fillRect(0, 0, 7, 5)
  const source = createTilemapAsset({ name: 'Recorte', tilesetId: ts.id, cols: 2, rows: 1 })
  source.layers[0]!.cells = Int16Array.of(0, 4096)
  const set = createMapSet(source, { col: 0, row: 0, cols: 2, rows: 1 }, 16, 'Conjunto')
  for (const rotation of [0, 90, 180, 270])
    for (const flipX of [false, true])
      for (const flipY of [false, true]) {
        let map = addObjectLayer(
          createTilemapAsset({ name: 'Mapa', tilesetId: ts.id, cols: 4, rows: 4 }),
          'Objetos',
        )
        const layer = map.layers.at(-1)!,
          id = layer.id
        map = placeMapSet(map, id, set, 32, 32, 16)
        const instance = map.layers.flatMap((l) => (l.kind === 'objects' ? l.objects : []))[0]!
        map = updateMapObject(map, id, instance.id, {
          rotation,
          flipX: flipX ? true : undefined,
          flipY: flipY ? true : undefined,
        })
        const detached = detachMapSet(map, id, instance.id, set, 16)
        expect(detached).not.toBe(map)
        const pixels = []
        for (const document of [map, detached]) {
          const scene = await exportPintaScene(
            document,
            (id) => (id === ts.id ? ts : id === set.id ? set : null),
            async () => sheet.toDataURL(),
          )
          const c = createCanvas(64, 64),
            ctx = c.getContext('2d')
          drawScene(
            ctx as unknown as CanvasRenderingContext2D,
            scene,
            new Map([[ts.id, sheet as unknown as CanvasImageSource]]),
            'back',
          )
          pixels.push(Buffer.from(ctx.getImageData(0, 0, 64, 64).data))
        }
        expect(pixels[1], `giro ${rotation}, espelhos ${flipX}/${flipY}`).toEqual(pixels[0])
      }
})

it('imagem, frente, grupo translúcido e conjunto mantêm arte, colisão e objetos', () => {
  const scene = PintaSceneSchema.parse({
    version: 1,
    id: 'mapa',
    name: 'vila',
    tileSize: 16,
    cols: 4,
    rows: 2,
    tilesets: [
      { id: 'ts', name: 'peças', image: 'tiles', columns: 1, count: 1, solid: [0], platform: [] },
    ],
    sets: [
      {
        id: 'set',
        cols: 1,
        rows: 1,
        layers: [
          { id: 's', name: 'peças', visible: true, kind: 'tiles', tilesetId: 'ts', cells: [4096] },
          {
            id: 'so',
            name: 'objetos',
            visible: true,
            kind: 'objects',
            objects: [
              {
                id: 'p',
                name: 'Região',
                type: '',
                x: 0,
                y: 0,
                width: 16,
                height: 16,
                role: 'region',
                properties: {},
              },
            ],
          },
        ],
      },
    ],
    layers: [
      { id: 'g', kind: 'group', name: 'grupo', visible: true, opacity: 0.5, offsetX: 16 },
      {
        id: 't',
        parentId: 'g',
        name: 'fundo',
        visible: true,
        kind: 'tiles',
        tilesetId: 'ts',
        cells: [0, -1, -1, -1, -1, -1, -1, -1],
      },
      {
        id: 'f',
        name: 'frente',
        visible: true,
        kind: 'tiles',
        tilesetId: 'ts',
        front: true,
        cells: [-1, -1, 0, -1, -1, -1, -1, -1],
      },
      {
        id: 'o',
        name: 'objetos',
        visible: true,
        kind: 'objects',
        objects: [
          {
            id: 'c',
            name: 'conjunto',
            type: '',
            shape: 'set',
            setId: 'set',
            x: 0,
            y: 16,
            width: 16,
            height: 16,
            properties: {},
          },
        ],
      },
    ],
  })
  const sheet = createCanvas(16, 16),
    s = sheet.getContext('2d')
  s.fillStyle = 'red'
  s.fillRect(0, 0, 8, 16)
  s.fillStyle = 'blue'
  s.fillRect(8, 0, 8, 16)
  const canvas = createCanvas(64, 32),
    ctx = canvas.getContext('2d'),
    images = new Map([['ts', sheet as unknown as CanvasImageSource]])
  drawScene(ctx as unknown as CanvasRenderingContext2D, scene, images, 'back')
  expect(ctx.getImageData(17, 1, 1, 1).data[3]).toBe(128)
  expect(ctx.getImageData(33, 1, 1, 1).data[3]).toBe(0)
  expect(ctx.getImageData(1, 17, 1, 1).data[2]).toBe(255)
  drawScene(ctx as unknown as CanvasRenderingContext2D, scene, images, 'front')
  expect(ctx.getImageData(33, 1, 1, 1).data[0]).toBe(255)
  expect(sceneSolidAt(scene, 1, 17)).toBe(true)
  expect(sceneObjects(scene).find((o) => o.id === 'c/p')?.y).toBe(16)
})
it('o contrato recusa referências quebradas, colisão fora da folha e propriedades de tipo errado', () => {
  const base = {
    version: 1,
    id: 'm',
    name: 'm',
    tileSize: 16,
    cols: 1,
    rows: 1,
    tilesets: [
      { id: 'ts', name: 'ts', image: 'png', columns: 1, count: 1, solid: [], platform: [] },
    ],
    layers: [
      {
        id: 'o',
        kind: 'objects',
        name: 'o',
        visible: true,
        objects: [
          {
            id: 'p',
            name: 'p',
            type: '',
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            properties: { vida: { type: 'int', value: '3' } },
          },
        ],
      },
    ],
  }
  expect(PintaSceneSchema.safeParse(base).success).toBe(false)
  expect(
    PintaSceneSchema.safeParse({
      ...base,
      layers: [],
      tilesets: [{ ...base.tilesets[0], solid: [2] }],
    }).success,
  ).toBe(false)
  expect(
    PintaSceneSchema.safeParse({
      ...base,
      layers: [
        {
          ...base.layers[0],
          objects: [{ ...base.layers[0]!.objects[0], properties: {}, art: { assetId: 'ausente' } }],
        },
      ],
    }).success,
  ).toBe(false)
})
