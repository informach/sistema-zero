import type { PintaScene } from '@sistemazero/core/studio/pinta-scene'
import {
  createBitmap,
  createPixelBackgroundAsset,
  createTilesetAsset,
  normalizeAssetName,
  type PintaAsset,
  sanitizePintaAsset,
  TILE_SIZES,
  type TilemapAsset,
  type TilemapLayer,
} from '../../core/project'
import { PINTA_SCENE_SCHEMA } from '../../core/projectConfig'
import { quantizeFrames } from '../../core/quantizeFrames'
import { decodeImageFile } from '../../import/decodeImage'
import type { RGBAImage } from '../../import/quantize'
import { dataUrlToBlob } from '../png'
import { TiledImportError } from './import'

const hex = (n: number) => n.toString(16).padStart(2, '0')
async function pixels(url: string): Promise<RGBAImage> {
  const blob = dataUrlToBlob(url)
  if (!blob) throw new TiledImportError('Imagem de peças inválida.')
  const image = await decodeImageFile(new File([blob], 'imagem.png', { type: blob.type }))
  if (!image) throw new TiledImportError('Não foi possível abrir a imagem das peças.')
  return image
}
export async function sceneToNative(
  scene: PintaScene,
  decode: (url: string) => Promise<RGBAImage> = pixels,
): Promise<{ assets: PintaAsset[]; warnings: string[] }> {
  if (!(TILE_SIZES as readonly number[]).includes(scene.tileSize))
    throw new TiledImportError(
      `O Pinta aceita peças de ${TILE_SIZES.join(', ')} pixels. O mapa usa ${scene.tileSize}.`,
    )
  const assets: PintaAsset[] = [],
    warnings: string[] = [],
    now = Date.now()
  for (const owner of [scene, ...(scene.sets ?? [])])
    for (const layer of owner.layers)
      if (layer.kind === 'objects')
        for (const object of layer.objects)
          if (object.x < 0 || object.y < 0)
            throw new TiledImportError(
              `O objeto ${object.name || object.id} tem coordenada negativa. O documento do Pinta ainda não guarda objetos fora do canto inicial; mova o objeto no Tiled antes de importar.`,
            )
  const quantize = (image: RGBAImage, name: string) => {
    if (image.width * image.height > 4_194_304)
      throw new TiledImportError('Imagem acima do orçamento de importação.')
    const data = Uint8ClampedArray.from(image.data),
      q = quantizeFrames([data], 64, { width: image.width, dither: false })
    const colors = q.palette.map(([r, g, b], i) => (i === 0 ? '' : `#${hex(r)}${hex(g)}${hex(b)}`))
    const distinct = new Set<string>()
    let alpha = false
    for (let i = 0; i < data.length; i += 4) {
      if ((data[i + 3] ?? 0) !== 0 && (data[i + 3] ?? 0) !== 255) alpha = true
      if ((data[i + 3] ?? 0) >= 128) distinct.add(`${data[i]},${data[i + 1]},${data[i + 2]}`)
      if (distinct.size > 63) break
    }
    if (distinct.size > 63)
      warnings.push(`As cores de ${name} foram reduzidas para as 63 cores de uma paleta do Pinta.`)
    if (alpha)
      warnings.push(
        `A transparência parcial da imagem ${name} virou pixels opacos ou transparentes.`,
      )
    return {
      indices: q.frames[0]!,
      paletteId: 'custom' as const,
      customPalette: { name, colors: Array.from({ length: 16 }, (_, i) => colors[i] ?? '') },
      ...(colors.length > 16 ? { extraColors: colors.slice(16) } : {}),
    }
  }
  for (const ts of scene.tilesets) {
    const image = await decode(ts.image),
      q = quantize(image, ts.name),
      size = scene.tileSize
    if (image.width < ts.columns * size || image.height < Math.ceil(ts.count / ts.columns) * size)
      throw new TiledImportError('A folha de peças é menor que os dados do mapa.')
    const tiles = Array.from({ length: ts.count }, (_, tile) => {
      const b = createBitmap(size, size),
        ox = (tile % ts.columns) * size,
        oy = Math.floor(tile / ts.columns) * size
      for (let y = 0; y < size; y++)
        b.data.set(
          q.indices.subarray((oy + y) * image.width + ox, (oy + y) * image.width + ox + size),
          y * size,
        )
      return b
    })
    const { indices: _indices, ...palette } = q
    const asset = sanitizePintaAsset({
      ...createTilesetAsset({ name: normalizeAssetName(ts.name) ?? 'pecas', tileSize: size }),
      ...palette,
      id: ts.id,
      tiles,
      solid: tiles.map((_, i) => ts.solid.includes(i)),
      platform: tiles.map((_, i) => ts.platform.includes(i)),
      animations: ts.animations,
      terrains: ts.terrains,
      tileProperties: ts.tileProperties,
    })
    if (!asset) throw new TiledImportError(`As peças ${ts.name} não puderam ser convertidas.`)
    assets.push(asset)
  }
  for (const art of scene.art ?? []) {
    const image = await decode(art.image)
    if (image.width > 512 || image.height > 512)
      throw new TiledImportError('Um desenho dos objetos ultrapassa 512 × 512 pixels.')
    const { indices, ...palette } = quantize(image, 'objeto')
    // Tudo o que vem de fora passa pelo mesmo portão do documento, como as folhas e o mapa.
    const asset = sanitizePintaAsset({
      ...createPixelBackgroundAsset({ name: 'objeto', width: image.width, height: image.height }),
      ...palette,
      id: art.id,
      cels: [{ width: image.width, height: image.height, data: indices }],
    })
    if (!asset) throw new TiledImportError('Um desenho dos objetos não pôde ser convertido.')
    assets.push(asset)
  }
  const mapOf = (
    id: string,
    name: string,
    cols: number,
    rows: number,
    layers: PintaScene['layers'],
  ): TilemapAsset => ({
    id,
    name: normalizeAssetName(name) ?? 'mapa',
    kind: 'tilemap',
    createdAt: now,
    updatedAt: now,
    cols,
    rows,
    tilesetId: scene.tilesets[0]!.id,
    layers: layers.map((l) =>
      l.kind === 'tiles' ? { ...l, cells: Int16Array.from(l.cells) } : { ...l },
    ) as TilemapLayer[],
  })
  for (const set of scene.sets ?? []) {
    const asset = sanitizePintaAsset({
      id: set.id,
      kind: 'map-set',
      schema: PINTA_SCENE_SCHEMA,
      name: `conjunto-${assets.length}`,
      createdAt: now,
      updatedAt: now,
      map: mapOf(set.id, 'conjunto', set.cols, set.rows, set.layers),
    })
    if (!asset)
      throw new TiledImportError('Um conjunto do mapa não cabe nos limites do documento do Pinta.')
    assets.push(asset)
  }
  const map = sanitizePintaAsset(mapOf(scene.id, scene.name, scene.cols, scene.rows, scene.layers))
  if (!map)
    throw new TiledImportError('O mapa convertido não cabe nos limites do documento do Pinta.')
  assets.push(map)
  return { assets, warnings }
}
