import { PINTA_REGION_CHUNK_BYTES } from '@sistemazero/core/creations'
import { type AnyTilesetAsset, isTilesetKind, tilemapTilesetIds } from '../../../core/project'
import { authorityKey, mirrorKey } from '../../../state/localAssetAuthority'
import {
  createLocalRegionAssetAuthority,
  matchesLocalRegionMirror,
} from '../../../state/localRegionAssetAuthority'
import {
  decodeLocalRegionChunks,
  localRegionChunkDirectory,
  prepareLocalRegionDocument,
} from '../../../state/localRegionChunkStorage'
import { readLocalPintaRecords } from '../../../state/persistence'
import { type MapViewport, visibleLayerChunks } from '../../../tiles/chunks'
import { resolveMapTilesets } from '../../../tiles/mapTilesets'
import {
  type MapCanvasOptions,
  mapCanvasViewport,
  mapCanvasWorldViewport,
  paintMapCanvas,
} from './mapCanvas'

type ViewOptions = Pick<MapCanvasOptions, 'stage' | 'pad' | 'cellPx' | 'showCollision'>
type DrawOptions = Pick<MapCanvasOptions, 'canvas' | 'cache' | 'time'> & {
  sheetOf(tileset: AnyTilesetAsset): HTMLCanvasElement | null
}

/** Contains the stage painter for one window. No authorable asset escapes this reader. */
interface StoredRegionMapViewport {
  revision: string
  bytes: number
  paint(options: DrawOptions): MapViewport | null
}

const assetKeys = (id: string) => [authorityKey(id), mirrorKey(id)]

function sameView(left: MapViewport, right: MapViewport): boolean {
  return (
    left.x === right.x &&
    left.y === right.y &&
    left.width === right.width &&
    left.height === right.height
  )
}

/** Complete directory admission before payloads; only the drawn chunks reach the painter. */
export async function readStoredRegionMapViewport(
  id: string,
  options: ViewOptions & { namespace?: string; revision?: string; signal?: AbortSignal },
): Promise<StoredRegionMapViewport | null> {
  const { stage, pad, cellPx, showCollision, namespace, revision, signal } = options
  signal?.throwIfAborted()
  if (!Number.isFinite(cellPx) || cellPx <= 0 || (pad !== 0 && pad !== 1)) return null
  const camera = stage && {
    clientWidth: stage.clientWidth,
    clientHeight: stage.clientHeight,
    scrollLeft: stage.scrollLeft,
    scrollTop: stage.scrollTop,
  }
  const rootKeys = assetKeys(id)
  const authority = createLocalRegionAssetAuthority()
  let directory: ReturnType<typeof prepareLocalRegionDocument> | undefined
  let selected:
    | {
        viewport: MapViewport
        tilesets: ReadonlyMap<string, AnyTilesetAsset>
        tileSize: number
        chunks: Set<string>
      }
    | null
    | undefined
  function select(records: ReadonlyMap<string, unknown>): readonly string[] {
    signal?.throwIfAborted()
    if (rootKeys.some((key) => !records.has(key))) return rootKeys
    if (directory === undefined) {
      directory = prepareLocalRegionDocument(authorityKey(id), records.get(authorityKey(id)))
      if (
        directory &&
        ((revision !== undefined && directory.revision !== revision) ||
          !matchesLocalRegionMirror(records.get(mirrorKey(id)), id, directory.revision))
      )
        directory = null
    }
    if (directory?.empty.kind !== 'tilemap') return []
    if (selected === undefined) {
      const map = directory.empty
      const ids = tilemapTilesetIds(map)
      const keys = ids
        .filter(
          (id) => !map.resources?.some(({ asset }) => asset.id === id && isTilesetKind(asset)),
        )
        .flatMap(assetKeys)
      if (keys.some((key) => !records.has(key))) return keys
      const snapshot = authority.resolveLocalRecords(
        new Map(keys.map((key) => [key, records.get(key)])),
      )
      const sheets = resolveMapTilesets(map, [...snapshot.assets.values()].filter(isTilesetKind))
      const primary = sheets[0]
      if (!primary || snapshot.issues.length || snapshot.recovered.length) {
        selected = null
        return []
      }
      const tilesets = new Map<string, AnyTilesetAsset>()
      for (const [index, id] of ids.entries()) {
        const sheet = sheets[index]
        if (sheet) tilesets.set(id, sheet)
      }
      const viewport = mapCanvasViewport(
        (map.cols + 2 * pad) * cellPx,
        (map.rows + 2 * pad) * cellPx,
        camera,
      )
      const layers = localRegionChunkDirectory(directory)
      const visible = visibleLayerChunks(
        map,
        tilesets,
        mapCanvasWorldViewport(map.origin, viewport, cellPx, primary.tileSize, pad),
        showCollision,
        { locationsOf: (layer) => layers.get(layer), includeTransparent: showCollision },
      )
      const chunks = new Set<string>()
      for (const { layer, chunks: positions } of visible) {
        const wanted = new Set(positions.map(({ col, row }) => `${col},${row}`))
        for (const { col, row, key } of layers.get(layer.id) ?? [])
          if (wanted.has(`${col},${row}`)) chunks.add(key)
      }
      selected = { viewport, tilesets, tileSize: primary.tileSize, chunks }
    }
    return [...(selected?.chunks ?? [])]
  }
  const result = await readLocalPintaRecords(namespace, select, (records) => {
    signal?.throwIfAborted()
    if (!directory || !selected) return null
    const { viewport, tilesets, tileSize, chunks } = selected
    const map = decodeLocalRegionChunks(directory, records, chunks)
    if (map.kind !== 'tilemap') return null
    return {
      revision: directory.revision,
      bytes: chunks.size * PINTA_REGION_CHUNK_BYTES,
      paint(draw: DrawOptions) {
        if (
          signal?.aborted ||
          !sameView(
            viewport,
            mapCanvasViewport((map.cols + 2 * pad) * cellPx, (map.rows + 2 * pad) * cellPx, stage),
          )
        )
          return null
        return paintMapCanvas({
          ...draw,
          map,
          stage: camera,
          pad,
          cellPx,
          tileSize,
          showCollision,
          tilesetById: tilesets,
          sheetOf: (id) => {
            const sheet = tilesets.get(id)
            return sheet ? draw.sheetOf(sheet) : null
          },
        })
      },
    }
  })
  signal?.throwIfAborted()
  return result
}
