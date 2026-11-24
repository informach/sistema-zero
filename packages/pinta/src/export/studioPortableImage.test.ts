import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
  createCanvas,
  loadImage,
  Image as NativeImage,
  ImageData as NativeImageData,
} from '@napi-rs/canvas'
import { sha256Hex } from '@sistemazero/core/creations'
import type { PintaImageRecipe, PintaImageTargetLimits } from '@sistemazero/core/studio/pinta-image'
import { vilaEFloresta } from '../../scripts/homologacao/fixture'
import {
  createBitmap,
  createTilemapAsset,
  createTilesetAsset,
  createVectorSpriteAsset,
  type PintaAsset,
  sanitizePintaAsset,
} from '../core/project'
import { tileLayerAt } from '../testing/fixtures'
import { clearIdbMock, idbMockDb, idbMockStats, setIdbReadGuard } from '../testing/idbMock'
import { makeRect } from '../vector/shapes'
import { assetToJson } from './assetJson'

const { exportAssetForStudio, exportImageAndSourceForStudio } = await import('./studioLibrary')
const { browserPintaImageRaster } = await import('./portableImageRender')

const limits: PintaImageTargetLimits = {
  dimension: 4096,
  imagePixels: 4194304,
  totalImagePixels: 16777216,
  imageBytes: 16777216,
  dataUrlChars: 800000,
}
const originalDocument = globalThis.document,
  originalImageData = globalThis.ImageData,
  originalImage = globalThis.Image
const originalRaster = { ...browserPintaImageRaster }
const canvases: HTMLCanvasElement[] = []
function seed(...assets: PintaAsset[]) {
  for (const asset of assets)
    idbMockDb('sistema-zero-pinta-a').set(`pinta:asset:${asset.id}`, structuredClone(asset))
}
function rect(color: string) {
  return makeRect({ x: 0, y: 0 }, { x: 16, y: 16 }, { fill: color, stroke: null, opacity: 1 })
}
async function pixel(url: string) {
  const image = await loadImage(Buffer.from(url.split(',')[1]!, 'base64'))
  const canvas = createCanvas(image.width, image.height)
  canvas.getContext('2d').drawImage(image, 0, 0)
  const rgba = [...canvas.getContext('2d').getImageData(1, 1, 1, 1).data]
  canvas.width = canvas.height = 1
  return rgba
}
beforeEach(() => {
  clearIdbMock()
  globalThis.document = {
    createElement(tag: string) {
      if (tag !== 'canvas') throw new Error('Only owned canvas allocation is allowed')
      const canvas = createCanvas(1, 1) as unknown as HTMLCanvasElement
      canvases.push(canvas)
      return canvas
    },
  } as unknown as Document
  globalThis.ImageData = NativeImageData as unknown as typeof ImageData
  globalThis.Image = NativeImage as unknown as typeof Image
  browserPintaImageRaster.releaseCanvas = (canvas) => {
    canvas.width = canvas.height = 1
  }
  browserPintaImageRaster.drawSvg = async (svg, canvas) => {
    const image = await loadImage(Buffer.from(svg))
    canvas
      .getContext('2d')!
      .drawImage(image as unknown as CanvasImageSource, 0, 0, canvas.width, canvas.height)
  }
})
afterEach(() => {
  globalThis.document = originalDocument
  globalThis.ImageData = originalImageData
  globalThis.Image = originalImage
  Object.assign(browserPintaImageRaster, originalRaster)
  for (const canvas of canvases.splice(0)) canvas.width = canvas.height = 1
})

describe('one captured drawing produces canonical personal bytes and a selected PNG', () => {
  test('exporta os destinos das portas com suas próprias cenas e recusa destino perdido', async () => {
    const { map, cabana, assets } = vilaEFloresta()
    seed(...assets)
    const result = await exportAssetForStudio(map.id, { namespace: 'a' })
    if (!result.ok) throw new Error(result.reason)
    expect(result.ok).toBe(true)
    expect(result.asset.maps?.map((a) => a.id)).toEqual([cabana.id])
    expect(result.asset.maps?.[0]?.scene?.id).toBe(cabana.id)
    expect(result.asset.scene?.layers).toHaveLength(18)
    const layer = map.layers.find((l) => l.kind === 'objects')!
    if (layer.kind !== 'objects') throw new Error('objetos necessários')
    layer.objects.find((o) => o.role === 'door')!.properties.destino = 'mapa-perdido'
    // A fresh inventory: mutating only the legacy mirror must not override its protected head.
    clearIdbMock()
    seed(...assets)
    const missing = await exportAssetForStudio(map.id, { namespace: 'a' })
    expect(missing.ok).toBe(false)
    if (missing.ok) throw new Error('destino ausente não pode ser omitido')
    expect(missing.reason).toBe('map-links-invalid')
  })
  test('vector source keeps its full SVG spritesheet while the requested second frame is a blue PNG', async () => {
    const source = createVectorSpriteAsset({ name: 'heroi', frameSize: 16 })
    source.animations[0]!.frames = [[rect('#ff0000')], [rect('#0000ff')]]
    seed(source)
    const recipe: PintaImageRecipe = {
      version: 1,
      algorithm: 'pinta-image-1',
      drawingId: source.id,
      selection: { kind: 'frame', animationId: source.animations[0]!.id, frameIndex: 1 },
      scale: 1,
    }
    const result = await exportImageAndSourceForStudio(recipe, limits, { namespace: 'a' })
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('composition required')
    expect(result.asset.dataUrl).toStartWith('data:image/svg+xml;')
    expect(result.asset.sprite?.animations[0]?.to).toBe(1)
    // Persisted drawings are normalized on read; fingerprint the canonical source,
    // not a factory object with optional style defaults still absent.
    const captured = sanitizePintaAsset(source)
    if (!captured) throw new Error('source fixture must be readable')
    expect(result.image.derivation.provenance.sourceSha256).toBe(
      await sha256Hex(assetToJson(captured)),
    )
    expect(result.image.derivation.output.width).toBe(16)
    expect(await pixel(result.image.dataUrl)).toEqual([0, 0, 255, 255])
    expect('sprite' in result.image).toBe(false)
    expect(idbMockStats()).toMatchObject({
      atomic: 1,
      atomicKeys: 2,
      get: 0,
      getMany: 0,
      set: 0,
      setMany: 0,
    })
    const canonical = await exportAssetForStudio(source.id, { namespace: 'a' })
    expect(canonical).toEqual({ ok: true, asset: result.asset })
  })

  test('map and tileset revision captured atomically feed both representations, without a second read', async () => {
    const tileset = createTilesetAsset({ name: 'pecas', tileSize: 16 })
    tileset.paletteId = 'custom'
    tileset.customPalette = {
      name: 'cores',
      colors: ['', '#ff0000', '#0000ff', ...Array<string>(13).fill('')],
    }
    tileset.tiles = [createBitmap(16, 16)]
    tileset.tiles[0]!.data.fill(1)
    const source = createTilemapAsset({ name: 'mapa', tilesetId: tileset.id, cols: 2, rows: 1 })
    tileLayerAt(source).cells.fill(0)
    seed(source, tileset)
    const initialTileset = structuredClone(tileset)
    setIdbReadGuard(() => {
      tileset.tiles[0]!.data.fill(2)
      seed(source, tileset)
    })
    const recipe: PintaImageRecipe = {
      version: 1,
      algorithm: 'pinta-image-1',
      drawingId: source.id,
      selection: { kind: 'tilemap' },
      scale: 1,
    }
    const result = await exportImageAndSourceForStudio(recipe, limits, { namespace: 'a' })
    if (!result.ok) throw new Error(`composition failed: ${result.reason}`)
    const capturedTileset = sanitizePintaAsset(initialTileset)
    if (!capturedTileset) throw new Error('tileset fixture must be readable')
    expect(result.image.derivation.provenance.dependencies).toEqual([
      { drawingId: tileset.id, sha256: await sha256Hex(assetToJson(capturedTileset)) },
    ])
    expect(await pixel(result.asset.dataUrl)).toEqual([255, 0, 0, 255])
    expect(await pixel(result.asset.tilemap!.tileset.dataUrl)).toEqual([255, 0, 0, 255])
    expect(await pixel(result.image.dataUrl)).toEqual([255, 0, 0, 255])
    expect(idbMockStats()).toMatchObject({
      atomic: 1,
      atomicKeys: 4,
      get: 0,
      getMany: 0,
      set: 0,
      setMany: 0,
    })
  })

  test('uma seleção PNG Python não exige os outros mapas configurados nas portas', async () => {
    const tileset = createTilesetAsset({ name: 'pecas', tileSize: 16 })
    const source = createTilemapAsset({ name: 'mapa', tilesetId: tileset.id, cols: 2, rows: 1 })
    source.layers.push({
      id: 'objects',
      kind: 'objects',
      name: 'Portas',
      visible: true,
      objects: [
        {
          id: 'door',
          name: 'Cabana',
          type: '',
          role: 'door',
          shape: 'rect',
          x: 0,
          y: 0,
          width: 16,
          height: 16,
          properties: { destino: 'outro-mapa' },
        },
      ],
    })
    seed(source, tileset)
    const result = await exportImageAndSourceForStudio(
      {
        version: 1,
        algorithm: 'pinta-image-1',
        drawingId: source.id,
        selection: { kind: 'tilemap' },
        scale: 1,
      },
      limits,
      { namespace: 'a' },
    )
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.reason)
    expect(result.asset.maps).toBeUndefined()
    expect(result.asset.scene?.id).toBe(source.id)
    expect(result.image.derivation.recipe.selection.kind).toBe('tilemap')
  })

  test('cancelled raster cannot return a canonical/derived pair for the host to save', async () => {
    const source = createVectorSpriteAsset({ name: 'heroi', frameSize: 16 })
    source.animations[0]!.frames = [[rect('#ff0000')]]
    seed(source)
    const controller = new AbortController(),
      entered = Promise.withResolvers<void>(),
      release = Promise.withResolvers<void>()
    const draw = browserPintaImageRaster.drawSvg
    browserPintaImageRaster.drawSvg = async (...args) => {
      entered.resolve()
      await release.promise
      await draw(...args)
    }
    const pending = exportImageAndSourceForStudio(
      {
        version: 1,
        algorithm: 'pinta-image-1',
        drawingId: source.id,
        selection: { kind: 'frame', animationId: source.animations[0]!.id, frameIndex: 0 },
        scale: 1,
      },
      limits,
      { namespace: 'a', signal: controller.signal },
    ).then(
      () => null,
      (error: unknown) => error,
    )
    await entered.promise
    controller.abort()
    release.resolve()
    expect(await pending).toBeInstanceOf(DOMException)
    expect(idbMockStats()).toMatchObject({ set: 0, setMany: 0 })
  })
})
