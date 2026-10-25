import { describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { sha256Hex } from '@sistemazero/core/creations'
import {
  PintaImageDerivationSchema,
  type PintaImageRecipe,
  type PintaImageTargetLimits,
} from '@sistemazero/core/studio/pinta-image'
import { unzlibSync } from 'fflate'
import {
  type AnyTilesetAsset,
  createBitmap,
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
  createVectorSpriteAsset,
  createVectorTilesetAsset,
  type PintaAsset,
  type TilemapAsset,
} from '../core/project'
import { tileLayerAt } from '../testing/fixtures'
import { addMapObject, createMapObject } from '../tiles/mapObjects'
import { addLayer, addObjectLayer, toggleLayerFront } from '../tiles/tilemapOps'
import { makeRect } from '../vector/shapes'
import { assetToJson } from './assetJson'
import { pngChunk, pngCrc32 } from './pngText'
import { deriveLoadedPintaImage, type PintaPortableImage } from './portableImage'
import { type PintaImageRaster, readPngDimensions } from './portableImageRender'

const limits: PintaImageTargetLimits = {
  dimension: 4096,
  imagePixels: 4194304,
  totalImagePixels: 16777216,
  imageBytes: 16777216,
  dataUrlChars: 800000,
}
const colors = ['', '#ff0000', '#0000ff', '#00ff00', ...Array<string>(12).fill('')]
const recipe = (
  asset: PintaAsset,
  selection: PintaImageRecipe['selection'],
  scale = 2,
): PintaImageRecipe => ({
  version: 1,
  algorithm: 'pinta-image-1',
  drawingId: asset.id,
  selection,
  scale,
})

function nativeRaster(): PintaImageRaster {
  return {
    releaseCanvas(canvas) {
      canvas.width = 1
      canvas.height = 1
    },
    createCanvas(width, height) {
      return createCanvas(width, height) as unknown as HTMLCanvasElement
    },
    async drawSvg(svg, canvas) {
      const image = await loadImage(Buffer.from(svg))
      canvas
        .getContext('2d')!
        .drawImage(image as unknown as CanvasImageSource, 0, 0, canvas.width, canvas.height)
    },
  }
}

function bytesOf(image: PintaPortableImage): Uint8Array {
  return new Uint8Array(Buffer.from(image.dataUrl.split(',')[1]!, 'base64'))
}

/**
 * Lê os `iTXt` de um PNG, conferindo assinatura e CRCs: o espelho do `ler_dados` do
 * `pinta.py`. Só o teste lê o bloco (o Pinta só escreve), por isso mora aqui.
 */
function readPngITxt(png: Uint8Array) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10]
  if (!signature.every((value, i) => png[i] === value)) throw new Error('Arquivo PNG inválido.')
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  const decoder = new TextDecoder('utf-8', { fatal: true })
  const latin1 = (bytes: Uint8Array) => String.fromCharCode(...bytes)
  const found: Array<{
    keyword: string
    compressed: boolean
    language: string
    translated: string
    text: string
    offset: number
  }> = []
  let cursor = 8
  while (cursor + 12 <= png.length) {
    const length = view.getUint32(cursor)
    if (length > png.length - cursor - 12) throw new Error('Arquivo PNG truncado.')
    const type = latin1(png.subarray(cursor + 4, cursor + 8))
    if (pngCrc32(png, cursor + 4, cursor + 8 + length) !== view.getUint32(cursor + 8 + length))
      throw new Error('Integridade PNG inválida.')
    if (type === 'IEND') break
    if (type === 'iTXt') {
      const data = png.subarray(cursor + 8, cursor + 8 + length)
      const keyEnd = data.indexOf(0)
      const languageEnd = data.indexOf(0, keyEnd + 3)
      const translatedEnd = data.indexOf(0, languageEnd + 1)
      if (keyEnd < 1 || languageEnd < 0 || translatedEnd < 0)
        throw new Error('Bloco iTXt inválido.')
      const compressed = data[keyEnd + 1] === 1
      const body = data.subarray(translatedEnd + 1)
      found.push({
        keyword: latin1(data.subarray(0, keyEnd)),
        compressed,
        language: latin1(data.subarray(keyEnd + 3, languageEnd)),
        translated: decoder.decode(data.subarray(languageEnd + 1, translatedEnd)),
        text: decoder.decode(compressed ? unzlibSync(body) : body),
        offset: cursor,
      })
    }
    cursor += length + 12
  }
  return found
}

async function pintaData(image: PintaPortableImage) {
  const chunks = readPngITxt(bytesOf(image))
  expect(chunks.length).toBe(1)
  const [chunk] = chunks
  // Exactly the layout the pygame reader (`pinta.py`) expects, right after IHDR.
  expect(chunk).toMatchObject({
    keyword: 'pinta',
    compressed: true,
    language: '',
    translated: '',
    offset: 33,
  })
  return JSON.parse(chunk!.text)
}

async function pixel(image: PintaPortableImage, x: number, y: number) {
  const decoded = await loadImage(Buffer.from(bytesOf(image)))
  const canvas = createCanvas(decoded.width, decoded.height)
  canvas.getContext('2d').drawImage(decoded, 0, 0)
  return [...canvas.getContext('2d').getImageData(x, y, 1, 1).data]
}

function filled(width: number, height: number, color: number) {
  const bitmap = createBitmap(width, height)
  bitmap.data.fill(color)
  return bitmap
}

function customPalette<T extends { paletteId: string; customPalette?: unknown }>(asset: T): T {
  asset.paletteId = 'custom'
  asset.customPalette = { name: 'teste', colors }
  return asset
}

function heroSprite() {
  const sprite = customPalette(createPixelSpriteAsset({ name: 'heroi', frameSize: 8 }))
  const idle = sprite.animations[0]!
  idle.name = 'parado'
  idle.fps = 8
  idle.loop = true
  idle.frames = [[filled(8, 8, 1)], [filled(8, 8, 2)]]
  sprite.animations.push({
    ...structuredClone(idle),
    id: 'correr-id',
    name: 'correr',
    fps: 12,
    loop: false,
    frames: [[filled(8, 8, 3)], [filled(8, 8, 1)], [filled(8, 8, 2)]],
  })
  return sprite
}

function tileset(name: string, tiles: number[], size = 16): AnyTilesetAsset {
  const asset = customPalette(createTilesetAsset({ name, tileSize: size }))
  asset.tiles = tiles.map((color) => filled(size, size, color))
  asset.solid = tiles.map(() => false)
  asset.platform = tiles.map(() => false)
  return asset
}

describe('spritesheet — the whole sheet with its animations embedded', () => {
  test('one row per animation, columns = most frames, frames left-aligned, scaled crisp', async () => {
    const sprite = heroSprite()
    const image = await deriveLoadedPintaImage(
      sprite,
      recipe(sprite, { kind: 'spritesheet' }),
      limits,
      {
        raster: nativeRaster(),
      },
    )
    // 3 columns (correr has 3) × 2 rows of 8 px frames, at scale 2.
    expect([image.derivation.output.width, image.derivation.output.height]).toEqual([48, 32])
    expect(image.derivation.output.mime).toBe('image/png')
    expect(image.derivation.provenance.dependencies).toEqual([])
    expect(await pintaData(image)).toEqual({
      format: 'pinta',
      version: 1,
      kind: 'sprite',
      name: 'heroi',
      scale: 2,
      frameWidth: 16,
      frameHeight: 16,
      columns: 3,
      rows: 2,
      animations: [
        { name: 'parado', row: 0, frames: 2, fps: 8, loop: true },
        { name: 'correr', row: 1, frames: 3, fps: 12, loop: false },
      ],
      // The art fills the frame: no box to declare (the whole frame).
      hitbox: null,
    })
    expect(await pixel(image, 15, 15)).toEqual([255, 0, 0, 255])
    expect(await pixel(image, 16, 0)).toEqual([0, 0, 255, 255])
    // parado has 2 frames: its third slot stays transparent.
    expect((await pixel(image, 40, 8))[3]).toBe(0)
    expect(await pixel(image, 0, 16)).toEqual([0, 255, 0, 255])
    expect(await pixel(image, 47, 31)).toEqual([0, 0, 255, 255])
    const png = bytesOf(image)
    expect(png.byteLength).toBe(image.derivation.output.bytes)
    expect(createHash('sha256').update(png).digest('hex')).toBe(image.derivation.output.sha256)
    // Any PNG decoder still reads it as a plain image of the declared size.
    expect(readPngDimensions(png, limits)).toEqual({ width: 48, height: 32 })
  })

  test('raw bytes: iTXt right after IHDR, keyword "pinta", compression 1, method 0', async () => {
    const sprite = heroSprite()
    const png = bytesOf(
      await deriveLoadedPintaImage(sprite, recipe(sprite, { kind: 'spritesheet' }, 1), limits, {
        raster: nativeRaster(),
      }),
    )
    const ascii = (from: number, to: number) => String.fromCharCode(...png.subarray(from, to))
    expect(ascii(12, 16)).toBe('IHDR')
    expect(ascii(37, 41)).toBe('iTXt')
    expect(ascii(41, 46)).toBe('pinta')
    // keyword NUL, compression flag 1, method 0 (zlib), empty language NUL, empty translated NUL.
    expect([...png.subarray(46, 51)]).toEqual([0, 1, 0, 0, 0])
    // zlib stream header (CMF = deflate, 32K window).
    expect(png[51]).toBe(0x78)
    const length = new DataView(png.buffer).getUint32(33)
    expect(new DataView(png.buffer).getUint32(41 + length)).toBe(pngCrc32(png, 37, 41 + length))
  })

  test('the hitbox comes from the drawing, in output pixels relative to the frame', async () => {
    const sprite = customPalette(createPixelSpriteAsset({ name: 'nave', frameSize: 8 }))
    const bitmap = createBitmap(8, 8)
    for (let y = 1; y < 8; y++) for (let x = 2; x < 6; x++) bitmap.data[y * 8 + x] = 1
    sprite.animations[0]!.frames = [[bitmap]]
    const image = await deriveLoadedPintaImage(
      sprite,
      recipe(sprite, { kind: 'spritesheet' }),
      limits,
      {
        raster: nativeRaster(),
      },
    )
    expect((await pintaData(image)).hitbox).toEqual({ x: 4, y: 2, width: 8, height: 14 })
  })

  test('a vector sprite sheet is rasterized whole, still PNG with data', async () => {
    const sprite = createVectorSpriteAsset({ name: 'robo', frameSize: 32 })
    const red = makeRect(
      { x: 0, y: 0 },
      { x: 32, y: 32 },
      { fill: '#ff0000', stroke: null, opacity: 1 },
    )
    sprite.animations[0]!.frames = [[red], [{ ...red, id: 'b', fill: '#0000ff' }]]
    const image = await deriveLoadedPintaImage(
      sprite,
      recipe(sprite, { kind: 'spritesheet' }, 1),
      limits,
      {
        raster: nativeRaster(),
      },
    )
    expect([image.derivation.output.width, image.derivation.output.height]).toEqual([64, 32])
    const data = await pintaData(image)
    expect(data).toMatchObject({ kind: 'sprite', frameWidth: 32, columns: 2, rows: 1 })
    expect(await pixel(image, 10, 10)).toEqual([255, 0, 0, 255])
    expect(await pixel(image, 42, 10)).toEqual([0, 0, 255, 255])
  })
})

describe('tileset — the whole tile sheet with solid/platform marks', () => {
  test('columns = min(count, 8), row-major, empty tiles keep their slot', async () => {
    const pieces = tileset('terreno', [1, 2, 0, 3, 1, 1, 1, 1, 2, 0])
    pieces.solid[0] = pieces.solid[1] = true
    pieces.platform[3] = true
    // A tile marked both stays solid (Pinta's rule).
    pieces.solid[8] = pieces.platform[8] = true
    const image = await deriveLoadedPintaImage(
      pieces,
      recipe(pieces, { kind: 'tileset' }),
      limits,
      {
        raster: nativeRaster(),
      },
    )
    expect([image.derivation.output.width, image.derivation.output.height]).toEqual([256, 64])
    expect(await pintaData(image)).toEqual({
      format: 'pinta',
      version: 1,
      kind: 'tileset',
      name: 'terreno',
      scale: 2,
      tileSize: 32,
      columns: 8,
      count: 10,
      solid: [0, 1, 8],
      platform: [3],
    })
    expect(await pixel(image, 40, 10)).toEqual([0, 0, 255, 255])
    expect((await pixel(image, 70, 10))[3]).toBe(0)
    // Tile 8 is the first of the second row.
    expect(await pixel(image, 5, 40)).toEqual([0, 0, 255, 255])
    expect((await pixel(image, 40, 40))[3]).toBe(0)
  })

  test('a vector tileset sheet', async () => {
    const pieces = createVectorTilesetAsset({ name: 'blocos', tileSize: 16 })
    pieces.tiles = [
      [makeRect({ x: 0, y: 0 }, { x: 16, y: 16 }, { fill: '#00ff00', stroke: null, opacity: 1 })],
    ]
    pieces.solid = [true]
    pieces.platform = [false]
    const image = await deriveLoadedPintaImage(
      pieces,
      recipe(pieces, { kind: 'tileset' }),
      limits,
      {
        raster: nativeRaster(),
      },
    )
    expect(await pintaData(image)).toMatchObject({ tileSize: 32, columns: 1, count: 1, solid: [0] })
    expect(await pixel(image, 16, 16)).toEqual([0, 255, 0, 255])
  })
})

function multiTilesetMap() {
  const ground = tileset('terreno', [1, 2])
  ground.solid[0] = true
  const deco = tileset('enfeites', [2, 2, 2, 2, 2, 2, 2, 2, 3])
  deco.platform[8] = true
  const big = tileset('grande', [1], 32)
  let map: TilemapAsset = createTilemapAsset({
    name: 'fase-1',
    tilesetId: ground.id,
    cols: 3,
    rows: 2,
  })
  map.layers[0]!.name = 'Terreno'
  tileLayerAt(map).cells.set([0, 1, -1, 0, 0, 7])
  map = addLayer(map, 'Enfeites', deco.id)
  const decoLayer = tileLayerAt(map, 1)
  decoLayer.cells.set([-1, 8, -1, -1, -1, 99])
  map = toggleLayerFront(map, decoLayer.id)
  // A layer over an incompatible tileset (another tile size) is never drawn nor exported.
  map = addLayer(map, 'Grande')
  map.layers[2] = { ...tileLayerAt(map, 2), tilesetId: big.id }
  map = addObjectLayer(map, 'Entidades')
  const objectLayerId = map.layers[3]!.id
  for (const object of [
    createMapObject({
      id: 'o1',
      name: 'jogador',
      type: 'jogador',
      x: 16,
      y: 8,
      properties: { vida: 3 },
    }),
    createMapObject({
      id: 'o2',
      name: 'porta',
      type: 'porta',
      x: 32,
      y: 0,
      width: 16,
      height: 32,
      properties: { aberta: false, destino: 'fase-2' },
    }),
  ])
    map = addMapObject(map, objectLayerId, object)
  return { map, ground, deco, big }
}

describe('map — an atlas of every tileset, layers and objects embedded', () => {
  test('stacks the sheets (default first), keeps layer order, scales objects', async () => {
    const { map, ground, deco, big } = multiTilesetMap()
    const image = await deriveLoadedPintaImage(map, recipe(map, { kind: 'map' }), limits, {
      tilesets: [ground, deco, big],
      raster: nativeRaster(),
    })
    // Widest sheet = 8 columns of 16 px; heights 1 + 2 rows; at scale 2.
    expect([image.derivation.output.width, image.derivation.output.height]).toEqual([256, 96])
    // Every USED tileset is a dependency; the incompatible one is not part of the map.
    expect(image.derivation.provenance.dependencies).toEqual([
      { drawingId: ground.id, sha256: await sha256Hex(assetToJson(ground)) },
      { drawingId: deco.id, sha256: await sha256Hex(assetToJson(deco)) },
    ])
    expect(PintaImageDerivationSchema.safeParse(image.derivation).success).toBe(true)
    expect(await pintaData(image)).toEqual({
      format: 'pinta',
      version: 1,
      kind: 'map',
      name: 'fase-1',
      scale: 2,
      tileSize: 32,
      cols: 3,
      rows: 2,
      tilesets: [
        { name: 'terreno', y: 0, columns: 2, count: 2, solid: [0], platform: [] },
        { name: 'enfeites', y: 32, columns: 8, count: 9, solid: [], platform: [8] },
      ],
      layers: [
        // A cell pointing past the tileset (7) reads as empty.
        {
          type: 'tiles',
          name: 'Terreno',
          visible: true,
          front: false,
          tileset: 0,
          cells: [0, 1, -1, 0, 0, -1],
        },
        {
          type: 'tiles',
          name: 'Enfeites',
          visible: true,
          front: true,
          tileset: 1,
          cells: [-1, 8, -1, -1, -1, -1],
        },
        {
          type: 'objects',
          name: 'Entidades',
          visible: true,
          objects: [
            {
              id: 'o1',
              name: 'jogador',
              type: 'jogador',
              x: 32,
              y: 16,
              width: 0,
              height: 0,
              properties: { vida: 3 },
            },
            {
              id: 'o2',
              name: 'porta',
              type: 'porta',
              x: 64,
              y: 0,
              width: 32,
              height: 64,
              properties: { aberta: false, destino: 'fase-2' },
            },
          ],
        },
      ],
    })
    // Atlas pixels: terreno at y 0, enfeites at y 32 (output pixels).
    expect(await pixel(image, 2, 2)).toEqual([255, 0, 0, 255])
    expect(await pixel(image, 40, 2)).toEqual([0, 0, 255, 255])
    expect((await pixel(image, 80, 2))[3]).toBe(0)
    expect(await pixel(image, 2, 34)).toEqual([0, 0, 255, 255])
    // enfeites tile 8 = first of its second row, at y 64.
    expect(await pixel(image, 2, 66)).toEqual([0, 255, 0, 255])
  })

  test('the flat tilemap image keeps exactly one dependency on the same map', async () => {
    const { map, ground, deco } = multiTilesetMap()
    // The flat image refuses a cell past its tileset (unchanged behavior); point it at a real one.
    tileLayerAt(map).cells[5] = 1
    const flat = await deriveLoadedPintaImage(map, recipe(map, { kind: 'tilemap' }, 1), limits, {
      tilesets: [ground, deco],
      raster: nativeRaster(),
    })
    expect(flat.derivation.provenance.dependencies.map((d) => d.drawingId)).toEqual([ground.id])
    expect(readPngITxt(bytesOf(flat))).toEqual([])
  })

  test('a change in ANY tileset changes the map provenance (the sync re-derives)', async () => {
    const { map, ground, deco } = multiTilesetMap()
    const before = await deriveLoadedPintaImage(map, recipe(map, { kind: 'map' }), limits, {
      tilesets: [ground, deco],
      raster: nativeRaster(),
    })
    const edited = { ...deco, name: 'enfeites-novos' }
    const after = await deriveLoadedPintaImage(map, recipe(map, { kind: 'map' }), limits, {
      tilesets: [ground, edited],
      raster: nativeRaster(),
    })
    expect(after.derivation.provenance.sourceSha256).toBe(before.derivation.provenance.sourceSha256)
    expect(after.derivation.provenance.dependencies[0]).toEqual(
      before.derivation.provenance.dependencies[0]!,
    )
    expect(after.derivation.provenance.dependencies[1]).not.toEqual(
      before.derivation.provenance.dependencies[1],
    )
    expect((await pintaData(after)).tilesets[1].name).toBe('enfeites-novos')
  })

  test('without its default tileset the map is refused', async () => {
    const { map, deco } = multiTilesetMap()
    const error = await deriveLoadedPintaImage(map, recipe(map, { kind: 'map' }), limits, {
      tilesets: [deco],
      raster: nativeRaster(),
    }).catch((caught: Error) => caught)
    expect((error as Error).message).toBe('O conjunto de peças deste mapa não está disponível.')
  })
})

describe('determinism, limits and refusals', () => {
  test('the same input gives the same bytes and SHA', async () => {
    const { map, ground, deco } = multiTilesetMap()
    const options = { tilesets: [ground, deco], raster: nativeRaster() }
    const first = await deriveLoadedPintaImage(map, recipe(map, { kind: 'map' }), limits, options)
    const second = await deriveLoadedPintaImage(map, recipe(map, { kind: 'map' }), limits, options)
    expect(second.dataUrl).toBe(first.dataUrl)
    expect(second.derivation).toEqual(first.derivation)
  })

  test('respects the destination limits with a friendly message', async () => {
    const sprite = heroSprite()
    const error = await deriveLoadedPintaImage(
      sprite,
      recipe(sprite, { kind: 'spritesheet' }),
      { ...limits, dimension: 40 },
      { raster: nativeRaster() },
    ).catch((caught: Error) => caught)
    expect((error as Error).message).toBe(
      'A imagem ultrapassa o limite de resolução do projeto. Escolha outra escala.',
    )
    const tight = await deriveLoadedPintaImage(
      sprite,
      recipe(sprite, { kind: 'spritesheet' }),
      { ...limits, imageBytes: 120 },
      { raster: nativeRaster() },
    ).catch((caught: Error) => caught)
    expect(tight).toBeInstanceOf(Error)
  })

  test('a scale that would split a frame in a fraction of a pixel is refused', async () => {
    const pieces = tileset('terreno', [1])
    const error = await deriveLoadedPintaImage(
      pieces,
      recipe(pieces, { kind: 'tileset' }, 0.3),
      limits,
      {
        raster: nativeRaster(),
      },
    ).catch((caught: Error) => caught)
    expect((error as Error).message).toContain('Escolha outra escala')
  })

  test('the kind must match the drawing, and SVG is never accepted', async () => {
    const sprite = heroSprite()
    const pieces = tileset('terreno', [1])
    for (const [source, selection] of [
      [sprite, { kind: 'tileset' }],
      [sprite, { kind: 'map' }],
      [pieces, { kind: 'spritesheet' }],
    ] as const) {
      const error = await deriveLoadedPintaImage(source, recipe(source, selection), limits, {
        raster: nativeRaster(),
      }).catch((caught: Error) => caught)
      expect(error).toBeInstanceOf(Error)
    }
    const svg = await deriveLoadedPintaImage(
      sprite,
      { ...recipe(sprite, { kind: 'spritesheet' }), output: 'svg' },
      limits,
      { raster: nativeRaster() },
    ).catch((caught: Error) => caught)
    expect(svg).toBeInstanceOf(Error)
  })
})

describe('pngText — the chunk writer/reader', () => {
  test('CRC-32 matches the PNG reference values', () => {
    const iend = pngChunk('IEND', new Uint8Array())
    expect([...iend]).toEqual([0, 0, 0, 0, 73, 69, 78, 68, 0xae, 0x42, 0x60, 0x82])
    expect(pngCrc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
  })
})
