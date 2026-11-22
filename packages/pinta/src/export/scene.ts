import {
  type PintaScene,
  type PintaSceneCellsLayer,
  type PintaSceneLayer,
  PintaSceneSchema,
} from '@sistemazero/core/studio/pinta-scene'
import { frameDurationsMs } from '../animation/timing'
import type { PintaMemoryAsset } from '../core/assetMemory'
import { thumbnailBitmap, thumbnailShapes } from '../core/assetThumb'
import { mergeMapResourceVersions, withMapResourceVersions } from '../core/mapResourceVersions'
import {
  isObjectLayer,
  isTileLayer,
  isTilesetKind,
  type MapSetAsset,
  type PintaAsset,
  pintaAssetReferenceIds,
  type RegionMapSetAsset,
  type RegionTilemapAsset,
  resolveAssetPalette,
  type TilemapAsset,
  type TilemapCells,
  type TilemapTileLayer,
  tileLayerTilesetId,
  tilemapNeedsV7,
  tilemapTilesetIds,
  type VersionablePintaAsset,
} from '../core/project'
import { tilesetGridGeometry } from '../tiles/packGeometry'
import { tilesetPngDataUrl } from '../tiles/packTileset'
import { vectorTilesetPngDataUrl } from '../tiles/packVectorTileset'
import { vectorToPortableSvg } from '../vector/portableSvg'
import { svgToPngDataUrl } from '../vector/rasterize'
import { bitmapToPngDataUrl } from './png'
import { packSpritesheet, spritesheetPngDataUrl } from './spritesheet'
import { packVectorSpritesheet, vectorSheetPngDataUrl } from './vectorSheet'

export function sceneLayers(map: TilemapAsset): PintaSceneLayer[] {
  return sceneLayersWithCells(map, (layer) => Array.from(layer.cells))
}

/** One metadata conversion; admission may inspect a view without cloning object payloads. */
export function sceneLayersWithCells<SourceCells extends TilemapCells, Cells>(
  map: TilemapAsset<SourceCells>,
  readCells: (layer: TilemapTileLayer<SourceCells>) => Cells,
  cloneObjects = true,
): PintaSceneCellsLayer<Cells>[] {
  return map.layers.map((l) => {
    if (isTileLayer(l)) {
      const { front, ...rest } = l
      return {
        ...rest,
        kind: 'tiles' as const,
        tilesetId: tileLayerTilesetId(map, l),
        cells: readCells(l),
        ...(front ? { front: true as const } : {}),
      }
    }
    return isObjectLayer(l)
      ? { ...l, objects: cloneObjects ? structuredClone(l.objects) : l.objects }
      : { ...l }
  })
}

export type SceneMapSource = TilemapAsset | RegionTilemapAsset
/** Shared resource/image preparation; map admission runs before any image work. */
export async function preparePintaSceneResources(
  map: SceneMapSource,
  findExternal: (id: string) => PintaMemoryAsset | null,
  imageOf?: (asset: VersionablePintaAsset) => Promise<string | null>,
  options?: {
    admitMaps?: (
      documents: readonly SceneMapSource[],
      definitions: readonly (MapSetAsset | RegionMapSetAsset)[],
    ) => void
    strictReferences?: true
  },
) {
  const sets = map.layers.flatMap((l) =>
    isObjectLayer(l) ? l.objects.flatMap((o) => (o.setId ? [o.setId] : [])) : [],
  )
  const definitions = [...new Set(sets)]
    .map((id) => findExternal(id))
    .filter((a) => a?.kind === 'map-set')
  if (definitions.length !== new Set(sets).size)
    throw new Error('Um conjunto deste mapa não está mais na biblioteca.')
  let resources = map.resources ?? []
  for (const definition of definitions) {
    const merged = mergeMapResourceVersions(resources, definition.map.resources ?? [])
    if (!merged)
      throw new Error(
        'Não foi possível reunir as versões dos desenhos deste cenário. Confira os conjuntos e as versões guardadas.',
      )
    resources = merged
  }
  const find = withMapResourceVersions({ ...map, resources }, findExternal)
  const documents = [map, ...definitions.map((s) => s.map)]
  options?.admitMaps?.(documents, definitions)
  const references = new Set(documents.flatMap(pintaAssetReferenceIds))
  // Typed asset properties are executable references too, including tile properties.
  for (const id of references) {
    const asset = find(id)
    if (!asset && options?.strictReferences)
      throw new Error('Falta um desenho ou conjunto usado pelo cenário.')
    if (asset && isTilesetKind(asset))
      for (const dependency of pintaAssetReferenceIds(asset)) references.add(dependency)
  }
  const ids = [
    ...new Set([
      ...documents.flatMap(tilemapTilesetIds),
      ...[...references].filter((id) => {
        const a = find(id)
        return a && isTilesetKind(a)
      }),
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
  const artIds = [...references].filter((id) => {
    const a = find(id)
    return a && a.kind !== 'tilemap' && a.kind !== 'map-set' && !isTilesetKind(a)
  })
  for (const m of documents)
    for (const l of m.layers)
      if (isObjectLayer(l))
        for (const o of l.objects)
          if (o.art && !find(o.art.assetId))
            throw new Error('Um desenho dos objetos não está mais na biblioteca.')
  const art = await Promise.all(
    artIds.map(async (id) => {
      const asset = find(id)
      if (!asset) throw new Error('Um desenho dos objetos não está mais na biblioteca.')
      if (asset.kind === 'pixel-sprite' || asset.kind === 'vector-sprite') {
        const pack =
          asset.kind === 'pixel-sprite' ? packSpritesheet(asset) : packVectorSpritesheet(asset)
        const image = imageOf
          ? await imageOf(asset)
          : asset.kind === 'pixel-sprite'
            ? spritesheetPngDataUrl(asset, packSpritesheet(asset))
            : await vectorSheetPngDataUrl(packVectorSpritesheet(asset))
        if (!image) throw new Error('Não foi possível preparar a animação do objeto.')
        return {
          id,
          image,
          width: pack.columns * pack.frameWidth,
          height: pack.rows * pack.frameHeight,
          sprite: {
            frameWidth: pack.frameWidth,
            frameHeight: pack.frameHeight,
            columns: pack.columns,
            animations: asset.animations.map((a, row) => ({
              id: a.id,
              name: a.name,
              loop: a.loop,
              frames: frameDurationsMs(a.frames.length, a.fps, a.easing).map((duration, tile) => ({
                tile: row * pack.columns + tile,
                duration,
              })),
            })),
          },
        }
      }
      if (asset.kind === 'tilemap' || asset.kind === 'map-set')
        throw new Error('Não foi possível preparar o desenho do objeto.')
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
  const versions = resources
    .filter((r) => ids.includes(r.asset.id) || artIds.includes(r.asset.id))
    .map((r) => ({ id: r.asset.id, sourceId: r.sourceId, capturedAt: r.capturedAt }))
  const animatedTileObjects = documents.some((m) =>
    m.layers.some(
      (l) =>
        isObjectLayer(l) &&
        l.objects.some(
          (o) =>
            o.art &&
            tilesets.some(
              (t) => t.id === o.art!.assetId && t.animations?.[o.art!.tile ?? 0]?.length,
            ),
        ),
    ),
  )
  return { definitions, documents, tilesets, art, versions, animatedTileObjects, base }
}

/** Public legacy converter retains scene 1–3 and its existing image/data contracts. */
export async function exportPintaScene(
  map: TilemapAsset,
  findExternal: (id: string) => PintaAsset | null,
  imageOf?: (asset: PintaAsset) => Promise<string | null>,
): Promise<PintaScene> {
  const prepared = await preparePintaSceneResources(map, findExternal, imageOf)
  const definitions = prepared.definitions.filter(
    (definition): definition is MapSetAsset => !('origin' in definition.map),
  )
  if (definitions.length !== prepared.definitions.length)
    throw new Error('Este conjunto precisa de um leitor de cenários mais novo.')
  const documents = prepared.documents
  const { tilesets, art, versions, animatedTileObjects, base } = prepared
  return PintaSceneSchema.parse({
    version: documents.some(tilemapNeedsV7)
      ? 3
      : versions.length || art.some((a) => a.sprite) || animatedTileObjects
        ? 2
        : 1,
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
    ...(versions.length ? { resources: versions } : {}),
  })
}
