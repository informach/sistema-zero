/**
 * O que cada ferramenta de PINTAR faz com as casas do mapa, sem tela nem ponteiro: lápis,
 * borracha, carimbo, terreno inteligente, espalhar e balde. Todas devolvem o MESMO mapa
 * quando nada muda (é assim que quem chama sabe que não há o que gravar).
 */
import type { AnyTilesetAsset, TilemapAsset, TileTerrain } from '../../../core/project'
import type { CellPos } from '../../../tiles/cellGeometry'
import { scatterTiles } from '../../../tiles/scatter'
import { stampCells, type TileStamp } from '../../../tiles/stamp'
import { paintTerrain, terrainRegion } from '../../../tiles/terrain'
import { floodFillCells, setCells } from '../../../tiles/tilemapOps'
import type { MapBrushSettings } from '../MapTerrainPanel'

export interface MapBrushContext {
  layerId: string
  /** `true` com a borracha: tudo apaga, até o terreno. */
  erasing: boolean
  selectedTile: number
  stamp: TileStamp | null
  /** Onde o gesto começou: é o que alinha o desenho do carimbo. */
  anchor: CellPos | null
  /** As peças da camada ativa. */
  tileset: AnyTilesetAsset | null
  brush: MapBrushSettings
}

export function brushTerrain(context: MapBrushContext): TileTerrain | undefined {
  return context.tileset?.terrains?.find((t) => t.id === context.brush.terrainId)
}

/** Pinta `cells` com a ferramenta de agora. `unmatched` = faltaram peças de borda do terreno. */
export function applyMapBrush(
  map: TilemapAsset,
  cells: readonly CellPos[],
  context: MapBrushContext,
): { map: TilemapAsset; unmatched: boolean } {
  const { layerId, erasing, brush, stamp, anchor, selectedTile } = context
  const terrain = brushTerrain(context)
  if (terrain) {
    const result = paintTerrain(map, layerId, terrain, erasing ? 0 : brush.color, cells, brush.seed)
    return { map: result.map, unmatched: result.unmatched > 0 }
  }
  if (brush.scatter && !erasing)
    return {
      map: scatterTiles(
        map,
        layerId,
        cells,
        brush.tiles.length ? brush.tiles : [selectedTile],
        brush.density,
        brush.seed,
      ),
      unmatched: false,
    }
  if (erasing) return { map: setCells(map, layerId, cells, -1), unmatched: false }
  if (stamp && anchor)
    return {
      map: stampCells(map, layerId, cells, stamp, anchor, context.tileset?.tiles.length ?? 0),
      unmatched: false,
    }
  return { map: setCells(map, layerId, cells, selectedTile), unmatched: false }
}

/**
 * O balde. Sem terreno nem espalhar, enche a área com a casa do carimbo, COM os bits de
 * virar e girar (a peça virada pinta virada). Com terreno ou espalhar, pinta a região inteira
 * com o pincel de agora.
 */
export function fillWithBrush(
  map: TilemapAsset,
  at: CellPos,
  context: MapBrushContext,
): { map: TilemapAsset; unmatched: boolean } {
  const terrain = brushTerrain(context)
  if (terrain || context.brush.scatter)
    return applyMapBrush(map, terrainRegion(map, context.layerId, at, terrain), {
      ...context,
      erasing: false,
      anchor: context.anchor ?? at,
    })
  const cell = context.stamp ? (context.stamp.tiles[0] ?? -1) : context.selectedTile
  return {
    map: floodFillCells(map, context.layerId, at.col, at.row, cell),
    unmatched: false,
  }
}
