import { mkdir, writeFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { createCanvas, ImageData, loadImage } from '@napi-rs/canvas'
import { thumbnailBitmap } from '../../src/core/assetThumb'
import { isTilesetKind, type PintaAsset, resolveAssetPalette } from '../../src/core/project'
import { deriveLoadedPintaImage } from '../../src/export/portableImage'
import type { PintaImageRaster } from '../../src/export/portableImageRender'
import { galleryToPintaJson } from '../../src/export/projectJson'
import {
  buildScenePackage,
  type ScenePackageTarget,
  scenePackageBlob,
} from '../../src/export/scenePackage'
import { packSpritesheet } from '../../src/export/spritesheet'
import { bitmapToRGBA } from '../../src/pixel/render'
import { vilaEFloresta } from './fixture'
export function nativeImageRaster(): PintaImageRaster {
  return {
    createCanvas: (w, h) => createCanvas(w, h) as unknown as HTMLCanvasElement,
    releaseCanvas: (c) => {
      c.width = 1
      c.height = 1
    },
    drawSvg: async (svg, c) => {
      const im = await loadImage(Buffer.from(svg))
      c.getContext('2d')!.drawImage(im as unknown as CanvasImageSource, 0, 0, c.width, c.height)
    },
  }
}
export async function nativeImageOf(asset: PintaAsset): Promise<string | null> {
  if (asset.kind === 'pixel-sprite') {
    const pack = packSpritesheet(asset),
      canvas = createCanvas(pack.columns * pack.frameWidth, pack.rows * pack.frameHeight),
      ctx = canvas.getContext('2d')
    for (const cell of pack.cells)
      ctx.putImageData(
        new ImageData(
          bitmapToRGBA(cell.bitmap, resolveAssetPalette(asset)),
          cell.bitmap.width,
          cell.bitmap.height,
        ),
        cell.col * pack.frameWidth,
        cell.row * pack.frameHeight,
      )
    return canvas.toDataURL('image/png')
  }
  if (asset.kind === 'tileset') {
    const cols = Math.min(8, asset.tiles.length),
      rows = Math.ceil(asset.tiles.length / cols),
      c = createCanvas(cols * asset.tileSize, rows * asset.tileSize),
      ctx = c.getContext('2d')
    for (const [i, b] of asset.tiles.entries())
      ctx.putImageData(
        new ImageData(bitmapToRGBA(b, resolveAssetPalette(asset)), b.width, b.height),
        (i % cols) * asset.tileSize,
        Math.floor(i / cols) * asset.tileSize,
      )
    return c.toDataURL('image/png')
  }
  const b = thumbnailBitmap(asset)
  if (!b) return null
  const c = createCanvas(b.width, b.height)
  c.getContext('2d').putImageData(
    new ImageData(bitmapToRGBA(b, resolveAssetPalette(asset)), b.width, b.height),
    0,
    0,
  )
  return c.toDataURL('image/png')
}
/**
 * Grava a referência "A Vila e a Floresta" em `output`: o backup, o PNG com dados versão 2 e os
 * quatro pacotes (pasta e ZIP). Devolve os arquivos de cada pacote, como foram gravados.
 */
export async function generateHomologation(
  output: string,
  log: (line: string) => void = () => {},
): Promise<Record<ScenePackageTarget, Record<string, Uint8Array | string>>> {
  const { assets, map } = vilaEFloresta()
  await mkdir(output, { recursive: true })
  await writeFile(resolve(output, 'vila-e-floresta.pinta.json'), galleryToPintaJson(assets))
  const png = await deriveLoadedPintaImage(
    map,
    {
      version: 1,
      algorithm: 'pinta-image-1',
      drawingId: map.id,
      selection: { kind: 'map' },
      scale: 1,
    },
    {
      dimension: 4096,
      imagePixels: 4194304,
      totalImagePixels: 16777216,
      imageBytes: 16777216,
      dataUrlChars: 800000,
    },
    {
      tilesets: assets.filter(isTilesetKind),
      assets: assets.filter((a) => a.id !== map.id && a.kind !== 'tilemap'),
      raster: nativeImageRaster(),
    },
  )
  await writeFile(
    resolve(output, 'vila-e-floresta.png'),
    Buffer.from(png.dataUrl.split(',')[1]!, 'base64'),
  )
  const packages = {} as Record<ScenePackageTarget, Record<string, Uint8Array | string>>
  for (const target of [
    'tiled',
    'phaser',
    'pygame',
    'godot',
  ] as const satisfies readonly ScenePackageTarget[]) {
    const files = await buildScenePackage(map, assets, target, { imageOf: nativeImageOf }),
      folder = resolve(output, target)
    for (const [name, content] of Object.entries(files)) {
      const path = resolve(folder, name)
      if (!path.startsWith(folder + sep)) throw new Error('Caminho fora do pacote')
      await mkdir(resolve(path, '..'), { recursive: true })
      await writeFile(path, content)
    }
    await writeFile(
      resolve(output, `${target}.zip`),
      new Uint8Array(await (await scenePackageBlob(files)).arrayBuffer()),
    )
    packages[target] = files
    log(`${target}: ${Object.keys(files).length} arquivos em ${folder}`)
  }
  return packages
}
if (import.meta.main)
  await generateHomologation(
    resolve(
      process.argv[2] ?? resolve(import.meta.dirname, '../../../..', 'output/pinta-cenarios'),
    ),
    console.log,
  )
