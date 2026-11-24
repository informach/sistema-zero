import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { PintaImageRecipe } from '@sistemazero/core/studio/pinta-image'
import { deriveLoadedPintaImage } from '../../src/export/portableImage'
import { collectMapTilesetsFrom } from '../../src/tiles/mapTilesets'
import { vilaEFloresta } from './fixture'
import { nativeImageRaster } from './generate'

const output = resolve(process.argv[2] ?? '.tmp/pinta-python-world-e2e')
const { map, assets } = vilaEFloresta()
await mkdir(output, { recursive: true })
for (const kind of ['map-world', 'map'] as const)
  for (const scale of [1, 2]) {
    const recipe: PintaImageRecipe = {
      version: kind === 'map-world' ? 2 : 1,
      algorithm: 'pinta-image-1',
      drawingId: map.id,
      selection: { kind },
      scale,
    }
    const image = await deriveLoadedPintaImage(
      map,
      recipe,
      {
        dimension: 4096,
        imagePixels: 4_194_304,
        totalImagePixels: 16_777_216,
        imageBytes: 16_777_216,
        dataUrlChars: 800_000,
      },
      {
        assets: assets.filter((asset) => asset.id !== map.id),
        tilesets: collectMapTilesetsFrom(map, assets),
        raster: nativeImageRaster(),
      },
    )
    const base = kind === 'map-world' ? 'vila-mundo' : 'vila-cena'
    const name = scale === 1 ? base : `${base}-2x`
    await writeFile(
      resolve(output, `${name}.png`),
      Buffer.from(image.dataUrl.split(',')[1]!, 'base64'),
    )
    await writeFile(
      resolve(output, `${name}.derivation.json`),
      `${JSON.stringify(image.derivation, null, 2)}\n`,
    )
  }
