import {
  type PintaScene,
  type PintaSceneLayer,
  PintaSceneSchema,
} from '@sistemazero/core/studio/pinta-scene'
import { thumbnailBitmap, thumbnailShapes } from '../core/assetThumb'
import {
  isObjectLayer,
  isTileLayer,
  isTilesetKind,
  type PintaAsset,
  resolveAssetPalette,
  type TilemapAsset,
  tileLayerTilesetId,
  tilemapTilesetIds,
} from '../core/project'
import { tilesetGridGeometry } from '../tiles/packGeometry'
import { tilesetPngDataUrl } from '../tiles/packTileset'
import { vectorTilesetPngDataUrl } from '../tiles/packVectorTileset'
import { vectorToPortableSvg } from '../vector/portableSvg'
import { svgToPngDataUrl } from '../vector/rasterize'
import { bitmapToPngDataUrl } from './png'

export function sceneLayers(map: TilemapAsset): PintaSceneLayer[] {
  return map.layers.map((l) => {
    if (isTileLayer(l)) {
      const { front, ...rest } = l
      return {
        ...rest,
        kind: 'tiles' as const,
        tilesetId: tileLayerTilesetId(map, l),
        cells: Array.from(l.cells),
        ...(front ? { front: true as const } : {}),
      }
    }
    return isObjectLayer(l) ? { ...l, objects: structuredClone(l.objects) } : { ...l }
  })
}

/** Conversor único de documento para cena. Imagens injetáveis permitem fixtures sem DOM. */
export async function exportPintaScene(
  map: TilemapAsset,
  find: (id: string) => PintaAsset | null,
  imageOf?: (asset: PintaAsset) => Promise<string | null>,
): Promise<PintaScene> {
  const sets = map.layers.flatMap((l) =>
    isObjectLayer(l) ? l.objects.flatMap((o) => (o.setId ? [o.setId] : [])) : [],
  )
  const definitions = [...new Set(sets)].map((id) => find(id)).filter((a) => a?.kind === 'map-set')
  if (definitions.length !== new Set(sets).size)
    throw new Error('Um conjunto deste mapa não está mais na biblioteca.')
  const ids = [
    ...new Set([
      ...tilemapTilesetIds(map),
      ...definitions.flatMap((s) => tilemapTilesetIds(s.map)),
    ]),
  ]
  const tilesets = await Promise.all(
    ids.map(async (id) => {
      const ts = find(id)
      if (!ts || !isTilesetKind(ts))
        throw new Error('As peças deste mapa não estão mais na biblioteca.')
      const image = imageOf
        ? await imageOf(ts)
        : ts.kind === 'tileset'
          ? tilesetPngDataUrl(ts)
          : await vectorTilesetPngDataUrl(ts)
      if (!image) throw new Error('Não foi possível preparar a imagem das peças.')
      return {
        id: ts.id,
        name: ts.name,
        image,
        columns: tilesetGridGeometry(ts.tiles.length).columns,
        count: ts.tiles.length,
        solid: ts.solid.flatMap((v, i) => (v ? [i] : [])),
        platform: ts.platform.flatMap((v, i) => (v ? [i] : [])),
        ...(ts.animations ? { animations: structuredClone(ts.animations) } : {}),
        ...(ts.tileProperties ? { tileProperties: structuredClone(ts.tileProperties) } : {}),
        ...(ts.terrains ? { terrains: structuredClone(ts.terrains) } : {}),
      }
    }),
  )
  const base = find(map.tilesetId)
  if (!base || !isTilesetKind(base)) throw new Error('O mapa precisa de peças.')
  const artIds = [
    ...new Set(
      [map, ...definitions.map((s) => s.map)].flatMap((m) =>
        m.layers.flatMap((l) =>
          isObjectLayer(l) ? l.objects.flatMap((o) => (o.art ? [o.art.assetId] : [])) : [],
        ),
      ),
    ),
  ].filter((id) => !ids.includes(id))
  const art = await Promise.all(
    artIds.map(async (id) => {
      const asset = find(id)
      if (!asset) throw new Error('Um desenho dos objetos não está mais na biblioteca.')
      const bitmap = thumbnailBitmap(asset),
        shapes = thumbnailShapes(asset)
      const payload = imageOf
        ? {
            dataUrl: await imageOf(asset),
            width: bitmap?.width ?? shapes?.width ?? 16,
            height: bitmap?.height ?? shapes?.height ?? 16,
          }
        : bitmap
          ? {
              dataUrl: bitmapToPngDataUrl(bitmap, resolveAssetPalette(asset)),
              width: bitmap.width,
              height: bitmap.height,
            }
          : shapes
            ? {
                dataUrl: await svgToPngDataUrl(
                  await vectorToPortableSvg(shapes),
                  shapes.width,
                  shapes.height,
                ),
                width: shapes.width,
                height: shapes.height,
              }
            : null
      if (!payload?.dataUrl) throw new Error('Não foi possível preparar o desenho do objeto.')
      return { id, image: payload.dataUrl, width: payload.width, height: payload.height }
    }),
  )
  return PintaSceneSchema.parse({
    version: 1,
    id: map.id,
    name: map.name,
    tileSize: base.tileSize,
    cols: map.cols,
    rows: map.rows,
    tilesets,
    layers: sceneLayers(map),
    ...(definitions.length
      ? {
          sets: definitions.map((s) => ({
            id: s.id,
            cols: s.map.cols,
            rows: s.map.rows,
            layers: sceneLayers(s.map),
          })),
        }
      : {}),
    ...(art.length ? { art } : {}),
  })
}
