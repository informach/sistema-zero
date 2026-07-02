/**
 * O mapa ACHATADO com tileset VETORIAL como imagem: cada tile vira um
 * `<symbol>` (definido UMA vez) e cada célula um `<use>` — o documento não
 * explode de tamanho nem com 100×100 células. `<symbol>` instanciado com
 * width/height clipa o conteúdo (paridade com o bitmap).
 */
import type { TilemapAsset, VectorTilesetAsset } from '../core/project'
import { svgToPngDataUrl } from '../vector/rasterize'
import { shapesToMarkup } from '../vector/svg'
import { flattenLayers } from './tilemapOps'

export function vectorTilemapSvg(tilemap: TilemapAsset, tileset: VectorTilesetAsset): string {
  const tile = tileset.tileSize
  const width = tilemap.cols * tile
  const height = tilemap.rows * tile
  const flat = flattenLayers(tilemap)

  // Só define símbolos para tiles realmente usados no mapa.
  const used = new Set<number>()
  for (const index of flat) {
    if (index >= 0 && index < tileset.tiles.length) used.add(index)
  }
  const symbols = [...used]
    .sort((a, b) => a - b)
    .map(
      (index) =>
        `    <symbol id="tile-${index}" viewBox="0 0 ${tile} ${tile}">\n${shapesToMarkup(tileset.tiles[index] ?? [], '      ')}\n    </symbol>`,
    )

  const uses: string[] = []
  for (let row = 0; row < tilemap.rows; row += 1) {
    for (let col = 0; col < tilemap.cols; col += 1) {
      const index = flat[row * tilemap.cols + col] ?? -1
      if (index < 0 || !used.has(index)) continue
      uses.push(
        `  <use href="#tile-${index}" x="${col * tile}" y="${row * tile}" width="${tile}" height="${tile}"/>`,
      )
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '  <defs>',
    ...symbols,
    '  </defs>',
    ...uses,
    '</svg>',
  ].join('\n')
}

/** Rasteriza o mapa achatado. `null` sem canvas/Image (happy-dom). */
export async function vectorTilemapPngDataUrl(
  tilemap: TilemapAsset,
  tileset: VectorTilesetAsset,
  scale = 1,
): Promise<string | null> {
  return svgToPngDataUrl(
    vectorTilemapSvg(tilemap, tileset),
    tilemap.cols * tileset.tileSize,
    tilemap.rows * tileset.tileSize,
    scale,
  )
}
