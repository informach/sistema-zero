/**
 * As contas do minimapa, PURAS: a cor de cada casa (com a cor de cada peça guardada por
 * conjunto de peças) e o retângulo do que aparece na tela.
 */
import { type AnyTilesetAsset, createTilemapAsset, type TilemapAsset } from '../../../core/project'
import { drawableMapTile, resolveMapTilesets } from '../../../tiles/mapTilesets'
import { tilemapMinimapColors } from '../../../tiles/minimap'
import { flattenWithTilesets } from '../../../tiles/tilemapOps'

const tileColorCache = new WeakMap<AnyTilesetAsset, Array<string | null>>()

/**
 * A cor de cada peça de um conjunto, calculada UMA vez por conjunto (o objeto muda quando uma
 * peça é redesenhada, e aí a conta é refeita). A conta é a do minimapa de sempre, feita sobre
 * um mapa de uma linha com todas as peças em fila.
 */
export function tilesetMinimapColors(tileset: AnyTilesetAsset): Array<string | null> {
  const cached = tileColorCache.get(tileset)
  if (cached) return cached
  const count = tileset.tiles.length
  const strip = createTilemapAsset({ name: 'cores', tilesetId: tileset.id, cols: 1, rows: 1 })
  const first = strip.layers[0]
  const colors =
    count > 0 && first
      ? tilemapMinimapColors(
          {
            ...strip,
            cols: count,
            rows: 1,
            layers: [{ ...first, cells: Int16Array.from({ length: count }, (_, i) => i) }],
          } as TilemapAsset,
          tileset,
        )
      : []
  tileColorCache.set(tileset, colors)
  return colors
}

/** Uma cor (ou `null`) por casa do mapa, usando as cores guardadas de cada conjunto de peças. */
export function cachedMinimapColors(
  map: TilemapAsset,
  tilesets: readonly AnyTilesetAsset[],
): Array<string | null> {
  const resolved = resolveMapTilesets(map, tilesets)
  const flat = flattenWithTilesets(map, undefined, drawableMapTile(map, resolved))
  const bySource = resolved.map((tileset) => (tileset ? tilesetMinimapColors(tileset) : null))
  return Array.from(flat.tiles, (index, at) =>
    index >= 0 ? (bySource[flat.sources[at] ?? 0]?.[index] ?? null) : null,
  )
}

export interface MinimapViewRect {
  /** Frações de 0 a 1 do tamanho do mapa. */
  left: number
  top: number
  width: number
  height: number
}

/**
 * A parte do mapa que aparece no palco, em frações do mapa. `null` quando o palco ainda não
 * tem tamanho ou quando o mapa inteiro já cabe na tela (não há o que mostrar).
 */
export function minimapViewRect(
  stage: { scrollLeft: number; scrollTop: number; clientWidth: number; clientHeight: number },
  cellPx: number,
  pad: number,
  cols: number,
  rows: number,
): MinimapViewRect | null {
  if (stage.clientWidth <= 0 || stage.clientHeight <= 0 || cellPx <= 0 || !cols || !rows)
    return null
  const clamp = (v: number): number => Math.max(0, Math.min(1, v))
  const left = clamp((stage.scrollLeft / cellPx - pad) / cols),
    top = clamp((stage.scrollTop / cellPx - pad) / rows),
    right = clamp(((stage.scrollLeft + stage.clientWidth) / cellPx - pad) / cols),
    bottom = clamp(((stage.scrollTop + stage.clientHeight) / cellPx - pad) / rows)
  if (right - left >= 1 && bottom - top >= 1) return null
  return { left, top, width: right - left, height: bottom - top }
}
