/**
 * The PNG of every gallery drawing IS the image the Pinta derives on the first "Editar no Pinta":
 * the Studio copies the document out of `desenhos.pinta.json` and asks the Pinta for the recipe
 * `pinta-image-1` at scale 2 (`exampleDrawingLink`). If the two differed (an object id, a hitbox,
 * a name, a pixel), the child's game would change just by opening the drawing.
 *
 * For each drawing of each game: the kit's PNG (what `generate.ts` writes) against the real
 * derivation (`deriveLoadedPintaImage`, with a native canvas) of the document read back from the
 * JSON as the Studio reads it: the `pinta` iTXt chunk byte for byte and every decoded pixel.
 */
import { describe, expect, test } from 'bun:test'
import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import type { PintaImageTargetLimits } from '@sistemazero/core/studio/pinta-image'
import { type AnyTilesetAsset, isTilesetKind, tilemapTilesetIds } from '../../src/core/project'
import { deriveLoadedPintaImage } from '../../src/export/portableImage'
import type { PintaImageRaster } from '../../src/export/portableImageRender'
import { importPintaJson } from '../../src/export/projectJson'
import { type Drawing, gameDocuments, gamePng, pintaDocuments, recipeSelection } from './drawing'

const SCALE = 2
const examples = resolve(import.meta.dirname, '../../../studio/src/examples/python/pygame')
const limits: PintaImageTargetLimits = {
  dimension: 8192,
  imagePixels: 16777216,
  totalImagePixels: 67108864,
  imageBytes: 67108864,
  dataUrlChars: 100_000_000,
}

const raster: PintaImageRaster = {
  createCanvas: (width, height) => createCanvas(width, height) as unknown as HTMLCanvasElement,
  releaseCanvas(canvas) {
    canvas.width = 1
    canvas.height = 1
  },
  drawSvg() {
    throw new Error('A galeria só tem desenhos de pixels.')
  },
}

/** Each chunk of a PNG, as raw bytes (length, type, data and CRC). */
function chunks(png: Uint8Array) {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  const found: { type: string; bytes: Uint8Array }[] = []
  for (let at = 8; at < png.length; ) {
    const length = view.getUint32(at)
    found.push({
      type: String.fromCharCode(...png.subarray(at + 4, at + 8)),
      bytes: png.subarray(at, at + 12 + length),
    })
    at += 12 + length
  }
  return found
}

async function decode(png: Uint8Array) {
  const image = await loadImage(Buffer.from(png))
  const canvas = createCanvas(image.width, image.height)
  const context = canvas.getContext('2d')
  context.drawImage(image, 0, 0)
  const data = context.getImageData(0, 0, image.width, image.height).data
  canvas.width = canvas.height = 1
  return {
    width: image.width,
    height: image.height,
    data: Buffer.from(data.buffer, data.byteOffset, data.byteLength),
  }
}

const games = (await readdir(resolve(import.meta.dirname, 'games')))
  .filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'))
  .map((file) => file.slice(0, -3))
  .sort()

describe('the gallery PNG is the Pinta derivation of its document', () => {
  test('every game is checked', () => {
    expect(games.length).toBe(8)
  })

  for (const game of games)
    test(game, async () => {
      const drawings: Drawing[] = (await import(`./games/${game}.ts`)).drawings()
      gameDocuments(drawings, game)
      // The documents as the Studio hands them to the Pinta: parsed back from the JSON on disk.
      const json = await readFile(resolve(examples, game, 'desenhos.pinta.json'), 'utf8')
      const parsed = importPintaJson(json)
      expect(parsed.warnings).toEqual([])
      const byId = new Map(parsed.assets.map((asset) => [asset.id, asset]))
      let derived = 0
      for (const drawing of drawings) {
        const own = pintaDocuments(drawing, game)
        const kit = await gamePng(own, SCALE)
        const id = `${game}-${drawing.name}`
        const source = byId.get(id)
        if (!source) throw new Error(`${id} não está no desenhos.pinta.json`)
        expect(source.kind).toBe(own.at(-1)!.kind)
        const tilesets =
          source.kind === 'tilemap'
            ? tilemapTilesetIds(source).map((tilesetId) => {
                const tileset = byId.get(tilesetId)
                if (!tileset || !isTilesetKind(tileset))
                  throw new Error(`${id}: falta ${tilesetId}`)
                return tileset as AnyTilesetAsset
              })
            : []
        const image = await deriveLoadedPintaImage(
          source,
          {
            version: 1,
            algorithm: 'pinta-image-1',
            drawingId: source.id,
            selection: { kind: recipeSelection(source) },
            scale: SCALE,
          },
          limits,
          { tilesets, raster },
        )
        const pinta = Buffer.from(image.dataUrl.split(',')[1]!, 'base64')
        const kitData = chunks(kit).filter((chunk) => chunk.type === 'iTXt')
        const pintaData = chunks(pinta).filter((chunk) => chunk.type === 'iTXt')
        expect(kitData.length, `${id}: blocos de dados`).toBe(pintaData.length)
        if (pintaData[0]) {
          expect(
            Buffer.from(kitData[0]!.bytes).equals(Buffer.from(pintaData[0].bytes)),
            `${id}: iTXt`,
          ).toBe(true)
          // Right after IHDR, where pinta.py reads it.
          expect(chunks(kit)[1]!.type, id).toBe('iTXt')
        }
        const [kitPixels, pintaPixels] = [await decode(kit), await decode(pinta)]
        expect([kitPixels.width, kitPixels.height], `${id}: tamanho`).toEqual([
          pintaPixels.width,
          pintaPixels.height,
        ])
        expect(kitPixels.data.equals(pintaPixels.data), `${id}: pixels`).toBe(true)
        // And the file on disk is that very PNG (the generator is up to date).
        const disk = await readFile(resolve(examples, game, 'assets', `${drawing.name}.png`))
        expect(
          disk.equals(Buffer.from(kit)),
          `${id}: assets/${drawing.name}.png desatualizado`,
        ).toBe(true)
        derived++
      }
      expect(derived).toBe(drawings.length)
    }, 120_000)
})
