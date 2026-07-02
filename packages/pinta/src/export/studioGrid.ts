/**
 * Export do TILEMAP no formato que o bloco de tilemap do Studio consome:
 * - grade = linhas separadas por `;`, células por espaço, `.` = vazio
 *   (`"0 1 1 0;. . 2 ."`) — colável direto no bloco;
 * - sólidos = lista `"1, 3"` (índices de tile que barram o sprite).
 * Round-trip garantido por teste que reimplementa o `parseGrid`/`parseSolidList`
 * do runtime (game-2d/runtime.ts).
 */
import type { AnyTilesetAsset, TilemapAsset } from '../core/project'
import { flattenLayers } from '../tiles/tilemapOps'

/** O texto de grade do bloco (camadas visíveis ACHATADAS, a de cima vence). */
export function tilemapToStudioGrid(tilemap: TilemapAsset): string {
  const cells = flattenLayers(tilemap)
  const lines: string[] = []
  for (let row = 0; row < tilemap.rows; row += 1) {
    const parts: string[] = []
    for (let col = 0; col < tilemap.cols; col += 1) {
      const value = cells[row * tilemap.cols + col] ?? -1
      parts.push(value < 0 ? '.' : String(value))
    }
    lines.push(parts.join(' '))
  }
  return lines.join(';')
}

/** A lista de sólidos do bloco (`"1, 3"`); vazia = nenhum tile sólido. */
export function tilesetSolidList(tileset: AnyTilesetAsset): string {
  const indices: number[] = []
  tileset.solid.forEach((isSolid, index) => {
    if (isSolid) indices.push(index)
  })
  return indices.join(', ')
}

/**
 * `.pinta-tilemap.json` — o pacote completo p/ usar FORA do Studio (VS Code):
 * grade + sólidos + tamanho do tile + dimensões (a imagem vai ao lado no ZIP).
 */
export function tilemapExportJson(tilemap: TilemapAsset, tileset: AnyTilesetAsset): string {
  return JSON.stringify(
    {
      tileSize: tileset.tileSize,
      cols: tilemap.cols,
      rows: tilemap.rows,
      grid: tilemapToStudioGrid(tilemap),
      solid: tilesetSolidList(tileset),
      layers: tilemap.layers.map((layer) => ({
        name: layer.name,
        visible: layer.visible,
        cells: Array.from(layer.cells),
      })),
    },
    null,
    2,
  )
}

/** A receita em PT mostrada no ExportDialog/LEIA-ME. */
export function tilemapRecipe(tilemap: TilemapAsset, tileset: AnyTilesetAsset): string {
  const solid = tilesetSolidList(tileset)
  return [
    `Mapa de ${tilemap.cols} × ${tilemap.rows} peças, cada peça com ${tileset.tileSize} × ${tileset.tileSize}.`,
    'No Estúdio, use o bloco de tilemap: cole a GRADE no campo de texto,',
    `use a imagem das peças ("${tileset.name}") e tamanho ${tileset.tileSize}.`,
    solid ? `Peças sólidas (barram o personagem): ${solid}.` : 'Nenhuma peça sólida marcada.',
  ].join('\n')
}
