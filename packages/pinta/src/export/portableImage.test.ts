import { describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { sha256Hex } from '@sistemazero/core/creations'
import {
  type PintaImageRecipe,
  type PintaImageTargetLimits,
  pintaImageRecipeKey,
} from '@sistemazero/core/studio/pinta-image'
import sharp from 'sharp'
import {
  type AnyTilesetAsset,
  createBitmap,
  createPixelBackgroundAsset,
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
  createVectorBackgroundAsset,
  createVectorSpriteAsset,
  createVectorTilesetAsset,
  type PintaAsset,
} from '../core/project'
import { makeRect, makeText } from '../vector/shapes'
import { assetToJson } from './assetJson'
import {
  deriveLoadedPintaImage,
  PintaImageSelectionError,
  type PintaPortableImage,
} from './portableImage'
import { browserPintaImageRaster, type PintaImageRaster } from './portableImageRender'

// Current Turtle image quotas; dataURL is the separate project material boundary.
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
  scale = 1,
): PintaImageRecipe => ({
  version: 1,
  algorithm: 'pinta-image-1',
  drawingId: asset.id,
  selection,
  scale,
})
function nativeRaster(svgBackend: 'skia' | 'libvips' = 'skia') {
  const canvases: HTMLCanvasElement[] = [],
    released: HTMLCanvasElement[] = [],
    dimensions: number[][] = [],
    svgs: string[] = []
  const raster: PintaImageRaster = {
    releaseCanvas(canvas) {
      canvas.width = 1
      canvas.height = 1
      released.push(canvas)
    },
    createCanvas(width, height) {
      dimensions.push([width, height])
      const canvas = createCanvas(width, height) as unknown as HTMLCanvasElement
      canvases.push(canvas)
      return canvas
    },
    async drawSvg(svg, canvas) {
      svgs.push(svg)
      // Skia's installed SVG decoder does not load embedded PNGs; libvips is an
      // independent real SVG rasterizer already used by Pinta's export tests.
      const bytes =
        svgBackend === 'libvips'
          ? await sharp(Buffer.from(svg), { limitInputPixels: canvas.width * canvas.height })
              .png()
              .toBuffer()
          : Buffer.from(svg)
      const image = await loadImage(bytes)
      canvas
        .getContext('2d')!
        .drawImage(image as unknown as CanvasImageSource, 0, 0, canvas.width, canvas.height)
    },
  }
  return { raster, canvases, released, dimensions, svgs }
}
async function pixels(image: PintaPortableImage, x: number, y: number) {
  const decoded = await loadImage(Buffer.from(image.dataUrl.split(',')[1]!, 'base64'))
  const canvas = createCanvas(decoded.width, decoded.height)
  canvas.getContext('2d').drawImage(decoded, 0, 0)
  const result = [...canvas.getContext('2d').getImageData(x, y, 1, 1).data]
  canvas.width = canvas.height = 1
  return result
}
function pixelSprite() {
  const sprite = createPixelSpriteAsset({ name: 'personagem', frameSize: 8 })
  sprite.paletteId = 'custom'
  sprite.customPalette = { name: 'teste', colors }
  sprite.animations[0]!.frames[0]![0]!.data.fill(1)
  const blue = createBitmap(8, 8)
  blue.data.fill(2)
  sprite.animations[0]!.frames.push([blue])
  return sprite
}
const rect = (color: string, width = 32, opacity = 1) =>
  makeRect({ x: 0, y: 0 }, { x: width, y: 32 }, { fill: color, stroke: null, opacity })

describe('Pinta portable PNGs — actual native raster and PNG decoder', () => {
  test('selects one positional pixel frame, scales without blur, keeps stable recipe identity', async () => {
    const source = pixelSprite(),
      animationId = source.animations[0]!.id
    const renderer = nativeRaster()
    const first = await deriveLoadedPintaImage(
      source,
      recipe(source, { kind: 'frame', animationId, frameIndex: 0 }),
      limits,
      { raster: renderer.raster },
    )
    const second = await deriveLoadedPintaImage(
      source,
      recipe(source, { kind: 'frame', animationId, frameIndex: 1 }, 2),
      limits,
      { raster: renderer.raster },
    )
    expect([first.derivation.output.width, first.derivation.output.height]).toEqual([8, 8])
    expect([second.derivation.output.width, second.derivation.output.height]).toEqual([16, 16])
    expect(await pixels(first, 3, 3)).toEqual([255, 0, 0, 255])
    expect(await pixels(second, 7, 7)).toEqual([0, 0, 255, 255])
    expect(first.derivation.output.sha256).not.toBe(second.derivation.output.sha256)
    expect(first.derivation.provenance.sourceSha256).toBe(await sha256Hex(assetToJson(source)))
    expect(Buffer.from(second.dataUrl.split(',')[1]!, 'base64').byteLength).toBe(
      second.derivation.output.bytes,
    )
    expect(second.dataUrl.length).toBeGreaterThan(second.derivation.output.bytes)
    expect('sprite' in second).toBe(false)
    expect(renderer.released.length).toBe(renderer.canvases.length)
    expect(renderer.canvases.every((canvas) => canvas.width === 1 && canvas.height === 1)).toBe(
      true,
    )
  })

  test('vector frame retains alpha and an untouched transparent area', async () => {
    const source = createVectorSpriteAsset({ name: 'brilho', frameSize: 32 })
    source.animations[0]!.frames = [[rect('#ff0000', 8, 0.5)], [rect('#0000ff', 8)]]
    const image = await deriveLoadedPintaImage(
      source,
      recipe(source, { kind: 'frame', animationId: source.animations[0]!.id, frameIndex: 0 }),
      limits,
      { raster: nativeRaster().raster },
    )
    expect(await pixels(image, 2, 2)).toEqual([255, 0, 0, 128])
    expect(await pixels(image, 20, 2)).toEqual([0, 0, 0, 0])
  })

  for (const kind of ['pixel', 'vector'] as const) {
    test(`full ${kind} map composes visible front alpha in order, without thumbnail downscale`, async () => {
      let tileset: AnyTilesetAsset
      if (kind === 'pixel') {
        tileset = createTilesetAsset({ name: 'pecas', tileSize: 32 })
        tileset.paletteId = 'custom'
        tileset.customPalette = { name: 'teste', colors }
        const floor = createBitmap(32, 32),
          front = createBitmap(32, 32)
        floor.data.fill(1)
        for (let y = 0; y < 32; y++) for (let x = 0; x < 8; x++) front.data[y * 32 + x] = 2
        tileset.tiles = [floor, front]
      } else {
        tileset = createVectorTilesetAsset({ name: 'pecas', tileSize: 32 })
        tileset.tiles = [[rect('#ff0000')], [rect('#0000ff', 8)]]
      }
      const map = createTilemapAsset({ name: 'mapa', tilesetId: tileset.id, cols: 20, rows: 2 })
      map.layers[0]!.cells.fill(0)
      map.layers.push({
        id: 'front',
        name: 'Frente',
        visible: true,
        front: true,
        cells: new Int16Array(40).fill(-1),
      })
      map.layers[1]!.cells[0] = 1
      map.layers.push({
        id: 'hidden',
        name: 'Escondida',
        visible: false,
        cells: new Int16Array(40).fill(1),
      })
      const renderer = nativeRaster()
      const image = await deriveLoadedPintaImage(map, recipe(map, { kind: 'tilemap' }), limits, {
        tileset,
        raster: renderer.raster,
      })
      expect([image.derivation.output.width, image.derivation.output.height]).toEqual([640, 64])
      expect(await pixels(image, 1, 1)).toEqual([0, 0, 255, 255])
      expect(await pixels(image, 20, 1)).toEqual([255, 0, 0, 255])
      expect(await pixels(image, 639, 63)).toEqual([255, 0, 0, 255])
      expect(image.derivation.provenance.dependencies).toEqual([
        { drawingId: tileset.id, sha256: await sha256Hex(assetToJson(tileset)) },
      ])
      const previous = pintaImageRecipeKey(image.derivation.recipe)
      if (tileset.kind === 'tileset') tileset.tiles[0]!.data.fill(2)
      else tileset.tiles[0] = [rect('#0000ff')]
      const changed = await deriveLoadedPintaImage(map, recipe(map, { kind: 'tilemap' }), limits, {
        tileset,
        raster: renderer.raster,
      })
      expect(changed.derivation.provenance.sourceSha256).toBe(
        image.derivation.provenance.sourceSha256,
      )
      expect(changed.derivation.provenance.dependencies[0]!.sha256).not.toBe(
        image.derivation.provenance.dependencies[0]!.sha256,
      )
      expect(changed.derivation.output.sha256).not.toBe(image.derivation.output.sha256)
      expect(pintaImageRecipeKey(changed.derivation.recipe)).toBe(previous)
    })
  }

  test('pixel background uses only visible layers; a fully hidden drawing stays transparent', async () => {
    const source = createPixelBackgroundAsset({ name: 'fundo', width: 8, height: 8 })
    source.paletteId = 'custom'
    source.customPalette = { name: 'teste', colors }
    source.cels[0]!.data.fill(1)
    source.layers[0]!.visible = false
    const image = await deriveLoadedPintaImage(
      source,
      recipe(source, { kind: 'background' }),
      limits,
      { raster: nativeRaster().raster },
    )
    expect(await pixels(image, 1, 1)).toEqual([0, 0, 0, 0])
  })

  test('selected vector tile is clipped to its square instead of painting the neighbouring cell', async () => {
    const tileset = createVectorTilesetAsset({ name: 'peca-larga', tileSize: 32 })
    tileset.tiles = [[rect('#0000ff', 96)]]
    const map = createTilemapAsset({ name: 'mapa', tilesetId: tileset.id, cols: 2, rows: 1 })
    map.layers[0]!.cells[0] = 0
    const image = await deriveLoadedPintaImage(map, recipe(map, { kind: 'tilemap' }), limits, {
      tileset,
      raster: nativeRaster().raster,
    })
    expect(await pixels(image, 1, 1)).toEqual([0, 0, 255, 255])
    expect(await pixels(image, 40, 1)).toEqual([0, 0, 0, 0])
    const tile = await deriveLoadedPintaImage(
      tileset,
      recipe(tileset, { kind: 'tile', tileIndex: 0 }),
      limits,
      { raster: nativeRaster().raster },
    )
    expect([tile.derivation.output.width, tile.derivation.output.height]).toEqual([32, 32])
    expect(await pixels(tile, 31, 31)).toEqual([0, 0, 255, 255])
  })

  test('libvips renders embedded PNG pixels and alpha; no browser equivalence is assumed', async () => {
    const embedded = createCanvas(4, 4)
    embedded.getContext('2d').fillStyle = '#0000ff'
    embedded.getContext('2d').fillRect(0, 0, 2, 4)
    const source = createVectorBackgroundAsset({ name: 'figura', width: 16, height: 16 })
    source.shapes = [
      {
        id: 'png',
        type: 'image',
        x: 0,
        y: 0,
        w: 16,
        h: 16,
        src: embedded.toDataURL('image/png'),
        fill: 'none',
        stroke: null,
        opacity: 1,
        rotation: 0,
      },
    ]
    const image = await deriveLoadedPintaImage(
      source,
      recipe(source, { kind: 'background' }),
      limits,
      { raster: nativeRaster('libvips').raster },
    )
    expect(await pixels(image, 1, 1)).toEqual([0, 0, 255, 255])
    expect(await pixels(image, 14, 1)).toEqual([0, 0, 0, 0])
    embedded.width = embedded.height = 1
  })

  test('embedded unsupported/ambiguous MIME, invalid CRC, truncation and decode bombs are refused before any native decoder', async () => {
    const png = createCanvas(8, 8).toBuffer('image/png')
    const corrupt = Buffer.from(png)
    corrupt[20] = corrupt[20]! ^ 1
    const bomb = Buffer.from(png)
    bomb.writeUInt32BE(4097, 16)
    // Correct IHDR CRC makes this a dimension rejection, not a checksum shortcut.
    let crc = 0xffffffff
    for (const byte of bomb.subarray(12, 29)) {
      crc ^= byte
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
    bomb.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 29)
    const prefix = 'data:image/png;base64,'
    const inputs = [
      'https://example.invalid/image.png',
      'data:image/svg+xml,<svg/>',
      'data:image/gif;base64,R0lGODlh',
      'data:image/jpeg;base64,/9j/',
      `data:image/png;charset=utf-8;base64,${png.toString('base64')}`,
      prefix + corrupt.toString('base64'),
      prefix + png.subarray(0, 33).toString('base64'),
      prefix + bomb.toString('base64'),
    ]
    for (const src of inputs) {
      const source = createVectorBackgroundAsset({ name: 'figura', width: 16, height: 16 })
      source.shapes = [
        {
          id: 'png',
          type: 'image',
          x: 0,
          y: 0,
          w: 16,
          h: 16,
          src,
          fill: 'none',
          stroke: null,
          opacity: 1,
          rotation: 0,
        },
      ]
      const renderer = nativeRaster()
      const error = await deriveLoadedPintaImage(
        source,
        recipe(source, { kind: 'background' }),
        limits,
        { raster: renderer.raster },
      ).then(
        () => null,
        (error: unknown) => error,
      )
      expect(error).toBeInstanceOf(Error)
      expect(renderer.dimensions).toEqual([])
      expect(renderer.svgs).toEqual([])
    }
  })

  test('Unicode text uses local portable font data and produces nonempty PNG', async () => {
    const source = createVectorBackgroundAsset({ name: 'texto', width: 128, height: 48 })
    source.shapes = [
      makeText(
        { x: 2, y: 30 },
        'Olá, ação!',
        { fill: '#ff0000', stroke: null, opacity: 1 },
        'left',
        'nunito',
      ),
    ]
    const renderer = nativeRaster()
    const image = await deriveLoadedPintaImage(
      source,
      recipe(source, { kind: 'background' }),
      limits,
      { raster: renderer.raster },
    )
    expect(renderer.svgs[0]).toContain('Olá, ação!')
    expect(renderer.svgs[0]).toContain('data:font/woff2;base64,')
    expect(renderer.svgs[0]).not.toContain('https://')
    expect(image.derivation.output.bytes).toBeGreaterThan(100)
  })

  test('embedded image pixels count towards the aggregate budget before SVG/canvas allocation', async () => {
    const png = createCanvas(8, 8)
    const source = createVectorBackgroundAsset({ name: 'figura', width: 16, height: 16 })
    source.shapes = [
      {
        id: 'png',
        type: 'image',
        x: 0,
        y: 0,
        w: 16,
        h: 16,
        src: png.toDataURL('image/png'),
        fill: 'none',
        stroke: null,
        opacity: 1,
        rotation: 0,
      },
    ]
    png.width = png.height = 1
    const renderer = nativeRaster()
    const error = await deriveLoadedPintaImage(
      source,
      recipe(source, { kind: 'background' }),
      { ...limits, totalImagePixels: 319 },
      { raster: renderer.raster },
    ).then(
      () => null,
      (error: unknown) => error,
    )
    expect(error).toBeInstanceOf(Error)
    expect(renderer.dimensions).toEqual([])
    expect(renderer.svgs).toEqual([])
  })

  test('copies source bytes before hashing awaits, so a caller mutation cannot alter the chosen frame', async () => {
    const source = pixelSprite(),
      sourceText = assetToJson(source)
    const pending = deriveLoadedPintaImage(
      source,
      recipe(source, { kind: 'frame', animationId: source.animations[0]!.id, frameIndex: 1 }),
      limits,
      { raster: nativeRaster().raster },
    )
    source.animations[0]!.frames[1]![0]!.data.fill(1)
    const image = await pending
    expect(await pixels(image, 1, 1)).toEqual([0, 0, 255, 255])
    expect(image.derivation.provenance.sourceSha256).toBe(await sha256Hex(sourceText))
  })

  test('missing animation, frame and tile reject before native allocation; never fall back to zero', async () => {
    const source = pixelSprite(),
      renderer = nativeRaster()
    for (const selection of [
      { kind: 'frame', animationId: 'gone', frameIndex: 0 },
      { kind: 'frame', animationId: source.animations[0]!.id, frameIndex: 9 },
    ] as const) {
      const error = await deriveLoadedPintaImage(source, recipe(source, selection), limits, {
        raster: renderer.raster,
      }).then(
        () => null,
        (error: unknown) => error,
      )
      expect(error).toBeInstanceOf(PintaImageSelectionError)
    }
    const tileset = createVectorTilesetAsset({ name: 'pecas', tileSize: 16 })
    const error = await deriveLoadedPintaImage(
      tileset,
      recipe(tileset, { kind: 'tile', tileIndex: 999 }),
      limits,
      { raster: renderer.raster },
    ).then(
      () => null,
      (error: unknown) => error,
    )
    expect(error).toBeInstanceOf(PintaImageSelectionError)
    expect(renderer.dimensions).toEqual([])
  })

  test('dimension/pixel quotas reject before canvas; PNG byte and dataURL ceilings are independent', async () => {
    const source = pixelSprite(),
      chosen = recipe(source, {
        kind: 'frame',
        animationId: source.animations[0]!.id,
        frameIndex: 0,
      })
    for (const restricted of [
      { ...limits, dimension: 7 },
      { ...limits, imagePixels: 63 },
      { ...limits, totalImagePixels: 63 },
    ]) {
      const renderer = nativeRaster()
      expect(
        await deriveLoadedPintaImage(source, chosen, restricted, { raster: renderer.raster }).then(
          () => null,
          (error: unknown) => error,
        ),
      ).toBeInstanceOf(Error)
      expect(renderer.dimensions).toEqual([])
    }
    const baseline = await deriveLoadedPintaImage(source, chosen, limits, {
      raster: nativeRaster().raster,
    })
    for (const restricted of [
      { ...limits, imageBytes: baseline.derivation.output.bytes - 1 },
      { ...limits, dataUrlChars: baseline.dataUrl.length - 1 },
    ]) {
      const renderer = nativeRaster()
      expect(
        await deriveLoadedPintaImage(source, chosen, restricted, { raster: renderer.raster }).then(
          () => null,
          (error: unknown) => error,
        ),
      ).toBeInstanceOf(Error)
      expect(renderer.released.length).toBe(renderer.canvases.length)
      expect(renderer.canvases.every((canvas) => canvas.width === 1 && canvas.height === 1)).toBe(
        true,
      )
    }
  })

  test('explicit map scale changes only the output viewport, before decoding the SVG', async () => {
    const tileset = createVectorTilesetAsset({ name: 'pecas', tileSize: 48 })
    tileset.tiles = [[rect('#ff0000', 48)]]
    const source = createTilemapAsset({ name: 'grande', tilesetId: tileset.id, cols: 128, rows: 2 })
    source.layers[0]!.cells.fill(0)
    const renderer = nativeRaster()
    const image = await deriveLoadedPintaImage(
      source,
      recipe(source, { kind: 'tilemap' }, 0.25),
      limits,
      { tileset, raster: renderer.raster },
    )
    expect([image.derivation.output.width, image.derivation.output.height]).toEqual([1536, 24])
    expect(renderer.svgs[0]).toStartWith(
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1536" height="24" viewBox="0 0 6144 96"',
    )
  })
})

/** A destination asking for SVG never allocates a canvas: the vector document IS the output. */
function noCanvas(): PintaImageRaster {
  return {
    createCanvas() {
      throw new Error('An SVG recipe must not rasterize')
    },
    releaseCanvas() {},
    async drawSvg() {
      throw new Error('An SVG recipe must not rasterize')
    },
  }
}
const svgRecipe = (
  asset: PintaAsset,
  selection: PintaImageRecipe['selection'],
  scale = 1,
): PintaImageRecipe => ({ ...recipe(asset, selection, scale), output: 'svg' })
function svgText(image: PintaPortableImage) {
  const prefix = 'data:image/svg+xml;charset=utf-8,'
  expect(image.dataUrl).toStartWith(prefix)
  return decodeURIComponent(image.dataUrl.slice(prefix.length))
}
const rootTag = (svg: string) => /<svg\b[^>]*>/.exec(svg)?.[0] ?? ''

describe('Pinta portable SVGs — the real vector for a Pygame Zero destination', () => {
  test('vector frame becomes SVG whose root width/height are the scaled output size', async () => {
    const source = createVectorSpriteAsset({ name: 'nave', frameSize: 16 })
    source.animations[0]!.frames = [[rect('#ff0000', 16)], [rect('#0000ff', 16)]]
    const animationId = source.animations[0]!.id
    const selection = { kind: 'frame', animationId, frameIndex: 1 } as const
    const image = await deriveLoadedPintaImage(source, svgRecipe(source, selection, 2), limits, {
      raster: noCanvas(),
    })
    const svg = svgText(image)
    const root = rootTag(svg)
    expect(root).toContain(' width="32"')
    expect(root).toContain(' height="32"')
    // The content keeps its own coordinates; only the viewport is the chosen scale.
    expect(root).toContain(' viewBox="0 0 16 16"')
    expect(image.derivation.output).toMatchObject({ mime: 'image/svg+xml', width: 32, height: 32 })
    const bytes = new TextEncoder().encode(svg)
    expect(image.derivation.output.bytes).toBe(bytes.byteLength)
    expect(image.derivation.output.sha256).toBe(createHash('sha256').update(bytes).digest('hex'))
    expect(image.derivation.recipe.output).toBe('svg')
    // The chosen frame, not the first one, drawn by an independent SVG rasterizer.
    const png = await sharp(Buffer.from(svg)).png().toBuffer()
    const meta = await sharp(png).metadata()
    expect([meta.width, meta.height]).toEqual([32, 32])
    const decoded = await loadImage(png)
    const canvas = createCanvas(32, 32)
    canvas.getContext('2d').drawImage(decoded, 0, 0)
    expect([...canvas.getContext('2d').getImageData(20, 20, 1, 1).data]).toEqual([0, 0, 255, 255])
    canvas.width = canvas.height = 1
    // PNG and SVG of the same selection are distinct identities.
    expect(pintaImageRecipeKey(svgRecipe(source, selection, 2))).not.toBe(
      pintaImageRecipeKey(recipe(source, selection, 2)),
    )
  })

  test('output size rounds like the PNG path; background and vector tile keep their viewBox', async () => {
    const background = createVectorBackgroundAsset({ name: 'ceu', width: 10, height: 6 })
    background.shapes = [rect('#00ff00', 10)]
    const small = await deriveLoadedPintaImage(
      background,
      svgRecipe(background, { kind: 'background' }, 0.25),
      limits,
      { raster: noCanvas() },
    )
    // Math.round(2.5) = 3 and Math.round(1.5) = 2, the same numbers the PNG path uses.
    expect([small.derivation.output.width, small.derivation.output.height]).toEqual([3, 2])
    expect(rootTag(svgText(small))).toContain(' width="3" height="2" viewBox="0 0 10 6"')
    const tileset = createVectorTilesetAsset({ name: 'pecas', tileSize: 16 })
    tileset.tiles = [[rect('#ff0000', 16)], [rect('#0000ff', 16)]]
    const tile = await deriveLoadedPintaImage(
      tileset,
      svgRecipe(tileset, { kind: 'tile', tileIndex: 1 }),
      limits,
      { raster: noCanvas() },
    )
    expect(rootTag(svgText(tile))).toContain(' width="16" height="16" viewBox="0 0 16 16"')
  })

  test('a map over vector tiles has a portable SVG path; its root carries the scaled map size', async () => {
    const tileset = createVectorTilesetAsset({ name: 'pecas', tileSize: 48 })
    tileset.tiles = [[rect('#ff0000', 48)]]
    const source = createTilemapAsset({ name: 'mapa', tilesetId: tileset.id, cols: 4, rows: 2 })
    source.layers[0]!.cells.fill(0)
    const image = await deriveLoadedPintaImage(
      source,
      svgRecipe(source, { kind: 'tilemap' }, 0.5),
      limits,
      { tileset, raster: noCanvas() },
    )
    expect(rootTag(svgText(image))).toContain(' width="96" height="48" viewBox="0 0 192 96"')
    expect(image.derivation.provenance.dependencies).toHaveLength(1)
  })

  test('pixel art and maps over pixel tiles refuse SVG instead of falling back to PNG', async () => {
    const sprite = pixelSprite()
    const animationId = sprite.animations[0]!.id
    await expect(
      deriveLoadedPintaImage(
        sprite,
        svgRecipe(sprite, { kind: 'frame', animationId, frameIndex: 0 }),
        limits,
        { raster: noCanvas() },
      ),
    ).rejects.toThrow('Este desenho é de pixels e só pode vir como imagem PNG.')
    const background = createPixelBackgroundAsset({ name: 'chao', width: 8, height: 8 })
    await expect(
      deriveLoadedPintaImage(background, svgRecipe(background, { kind: 'background' }), limits, {
        raster: noCanvas(),
      }),
    ).rejects.toThrow('pixels')
    const tileset = createTilesetAsset({ name: 'pecas', tileSize: 8 })
    tileset.tiles = [createBitmap(8, 8)]
    await expect(
      deriveLoadedPintaImage(tileset, svgRecipe(tileset, { kind: 'tile', tileIndex: 0 }), limits, {
        raster: noCanvas(),
      }),
    ).rejects.toThrow('pixels')
    const map = createTilemapAsset({ name: 'mapa', tilesetId: tileset.id, cols: 2, rows: 1 })
    map.layers[0]!.cells.fill(0)
    await expect(
      deriveLoadedPintaImage(map, svgRecipe(map, { kind: 'tilemap' }), limits, {
        tileset,
        raster: noCanvas(),
      }),
    ).rejects.toThrow('Este mapa usa peças de pixels e só pode vir como imagem PNG.')
  })

  test('an SVG over the destination byte or dataURL limits is refused, never rasterized instead', async () => {
    const source = createVectorBackgroundAsset({ name: 'ceu', width: 32, height: 32 })
    source.shapes = Array.from({ length: 40 }, (_, index) =>
      rect(index % 2 ? '#ff0000' : '#0000ff'),
    )
    for (const tight of [{ dataUrlChars: 500 }, { imageBytes: 300 }])
      await expect(
        deriveLoadedPintaImage(
          source,
          svgRecipe(source, { kind: 'background' }),
          { ...limits, ...tight },
          { raster: noCanvas() },
        ),
      ).rejects.toThrow('O desenho vetorial ficou grande demais para o projeto.')
  })
})

describe('portable image resource lifetime (control-path doubles, no pixel claims)', () => {
  test('post-await cancellation drops the image and releases all canvases', async () => {
    const source = createVectorBackgroundAsset({ name: 'cancelar', width: 16, height: 16 })
    source.shapes = [rect('#ff0000')]
    const controller = new AbortController(),
      entered = Promise.withResolvers<void>(),
      release = Promise.withResolvers<void>()
    const renderer = nativeRaster()
    renderer.raster.drawSvg = async () => {
      entered.resolve()
      await release.promise
    }
    const pending = deriveLoadedPintaImage(source, recipe(source, { kind: 'background' }), limits, {
      signal: controller.signal,
      raster: renderer.raster,
    }).then(
      () => null,
      (error: unknown) => error,
    )
    await entered.promise
    controller.abort()
    release.resolve()
    expect(await pending).toBeInstanceOf(DOMException)
    expect(renderer.released).toHaveLength(1)
    expect(renderer.canvases[0]!.width).toBe(1)
    const before = nativeRaster()
    expect(
      await deriveLoadedPintaImage(source, recipe(source, { kind: 'background' }), limits, {
        signal: controller.signal,
        raster: before.raster,
      }).then(
        () => null,
        (error: unknown) => error,
      ),
    ).toBeInstanceOf(DOMException)
    expect(before.dimensions).toEqual([])
  })

  test('preserves primary and cleanup errors, and still attempts to release every owned canvas', async () => {
    const source = createVectorBackgroundAsset({ name: 'erro', width: 16, height: 16 })
    const renderer = nativeRaster(),
      primary = new Error('render primary'),
      cleanup = new Error('release secondary')
    let released = 0
    renderer.raster.drawSvg = async () => {
      throw primary
    }
    const originalRelease = renderer.raster.releaseCanvas
    renderer.raster.releaseCanvas = (canvas) => {
      released++
      originalRelease(canvas)
      throw cleanup
    }
    const error = await deriveLoadedPintaImage(
      source,
      recipe(source, { kind: 'background' }),
      limits,
      { raster: renderer.raster },
    ).then(
      () => null,
      (error: unknown) => error,
    )
    expect(error).toBeInstanceOf(AggregateError)
    if (!(error instanceof AggregateError)) throw new Error('AggregateError required')
    expect(error.errors).toEqual([primary, cleanup])
    expect(error.cause).toBe(primary)
    expect(released).toBe(1)
  })

  test('cancels pending native SVG load and releases URL/listeners/image', async () => {
    const originalImage = globalThis.Image,
      originalCreate = URL.createObjectURL,
      originalRevoke = URL.revokeObjectURL
    const urls: string[] = [],
      revoked: string[] = []
    const images: PendingImage[] = []
    class PendingImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      src = ''
      constructor() {
        images.push(this)
      }
    }
    const controller = new AbortController()
    try {
      globalThis.Image = PendingImage as unknown as typeof Image
      URL.createObjectURL = () => {
        urls.push('blob:owned')
        return 'blob:owned'
      }
      URL.revokeObjectURL = (url) => {
        revoked.push(url)
      }
      const pending = browserPintaImageRaster
        .drawSvg(
          '<svg/>',
          {
            getContext: () => ({
              drawImage: () => {
                throw new Error('Cancelled draw must not run')
              },
            }),
          } as unknown as HTMLCanvasElement,
          controller.signal,
        )
        .then(
          () => null,
          (error: unknown) => error,
        )
      controller.abort()
      expect(await pending).toBeInstanceOf(DOMException)
      expect(revoked).toEqual(urls)
      expect(images).toHaveLength(1)
      const image = images[0]!
      expect(image.src).toBe('')
      expect(image.onload).toBeNull()
      expect(image.onerror).toBeNull()
    } finally {
      globalThis.Image = originalImage
      URL.createObjectURL = originalCreate
      URL.revokeObjectURL = originalRevoke
    }
  })

  test('Image constructor failure still releases the already-created URL and preserves its error', async () => {
    const originalImage = globalThis.Image,
      originalCreate = URL.createObjectURL,
      originalRevoke = URL.revokeObjectURL
    const revoked: string[] = [],
      primary = new Error('Image allocation failed')
    try {
      globalThis.Image = class {
        constructor() {
          throw primary
        }
      } as unknown as typeof Image
      URL.createObjectURL = () => 'blob:owned'
      URL.revokeObjectURL = (url) => {
        revoked.push(url)
      }
      const error = await browserPintaImageRaster
        .drawSvg('<svg/>', { getContext: () => ({}) } as unknown as HTMLCanvasElement)
        .then(
          () => null,
          (error: unknown) => error,
        )
      expect(error).toBe(primary)
      expect(revoked).toEqual(['blob:owned'])
    } finally {
      globalThis.Image = originalImage
      URL.createObjectURL = originalCreate
      URL.revokeObjectURL = originalRevoke
    }
  })

  test('failure to release one pixel canvas cannot skip releasing the other canvas', async () => {
    const source = pixelSprite(),
      renderer = nativeRaster(),
      cleanup = new Error('release error')
    const release = renderer.raster.releaseCanvas
    renderer.raster.releaseCanvas = (canvas) => {
      release(canvas)
      throw cleanup
    }
    const error = await deriveLoadedPintaImage(
      source,
      recipe(source, { kind: 'frame', animationId: source.animations[0]!.id, frameIndex: 0 }),
      { ...limits, imageBytes: 10 },
      { raster: renderer.raster },
    ).then(
      () => null,
      (error: unknown) => error,
    )
    expect(error).toBeInstanceOf(AggregateError)
    if (!(error instanceof AggregateError)) throw new Error('AggregateError required')
    expect(error.cause).toBeInstanceOf(Error)
    expect(error.errors.slice(1)).toEqual([cleanup, cleanup])
    expect(renderer.released).toHaveLength(2)
    expect(renderer.canvases.every((canvas) => canvas.width === 1 && canvas.height === 1)).toBe(
      true,
    )
  })
})
