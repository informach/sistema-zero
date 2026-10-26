/**
 * Export do TILEMAP no formato que o bloco de tilemap do Studio consome:
 * - grade = linhas separadas por `;`, células por espaço, `.` = vazio
 *   (`"0 1 1 0;. . 2 ."`) — colável direto no bloco;
 * - sólidos = lista `"1, 3"` (índices de tile que barram o sprite).
 * Round-trip garantido por teste que reimplementa o `parseGrid`/`parseSolidList`
 * do runtime (game-2d/runtime.ts).
 *
 * ⚠️ O bloco do Estúdio conhece UMA imagem de peças. Num mapa com várias peças,
 * a grade leva só as camadas das peças PADRÃO do mapa (`usesMapTileset`); as
 * outras camadas e os objetos saem inteiros no `.pinta-tilemap.json`.
 */
import {
  type AnyTilesetAsset,
  isObjectLayer,
  type TilemapAsset,
  tileLayerTilesetId,
  tilemapTilesetIds,
} from '../core/project'
import { type MapTilesets, resolveMapTilesets } from '../tiles/mapTilesets'
import { tilesetGridGeometry } from '../tiles/packGeometry'
import { flattenLayers, type TileLayerFilter, usesMapTileset } from '../tiles/tilemapOps'

/**
 * O texto de grade do bloco (camadas visíveis ACHATADAS, a de cima vence), só
 * das camadas que usam as peças padrão. `include` filtra mais (ex.: só fundo, ou
 * só as "da frente").
 */
export function tilemapToStudioGrid(tilemap: TilemapAsset, include?: TileLayerFilter): string {
  const onMapTileset = usesMapTileset(tilemap)
  const cells = flattenLayers(
    tilemap,
    (layer) => onMapTileset(layer) && (!include || include(layer)),
  )
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

/** A lista de PLATAFORMAS one-way do bloco (`"2, 5"`); vazia = nenhuma. */
export function tilesetPlatformList(tileset: AnyTilesetAsset): string {
  const indices: number[] = []
  tileset.platform.forEach((isPlatform, index) => {
    if (isPlatform) indices.push(index)
  })
  return indices.join(', ')
}

function indicesOf(flags: readonly boolean[]): number[] {
  return flags.flatMap((flag, index) => (flag ? [index] : []))
}

/** Formato e versão do `.pinta-tilemap.json` (a v2 trouxe objetos e peças por camada). */
export const TILEMAP_JSON_FORMAT = 'pinta-tilemap'
export const TILEMAP_JSON_VERSION = 2

/**
 * `.pinta-tilemap.json` — o pacote completo p/ usar FORA do Studio (VS Code):
 * grade + sólidos + tamanho do tile + dimensões (a imagem vai ao lado no ZIP).
 *
 * Os campos de cima (`tileSize`, `cols`, `rows`, `grid`, `solid`, `platform`)
 * são os de sempre e falam das peças PADRÃO. A v2 acrescenta:
 * - `tilesets`: as peças do mapa, a padrão primeiro (`name`, `tileSize`,
 *   `columns` da folha, `tileCount`, `solid`/`platform` como listas de índices);
 * - em cada camada, `type` (`"tiles"` | `"objects"`); as de peças levam `front`
 *   e `tileset` (índice em `tilesets`, `null` se as peças sumiram) além de
 *   `cells`; as de objetos levam `objects` (`id`, `name`, `type`, `x`, `y`,
 *   `width`, `height` em pixels do mapa — largura e altura 0 = ponto — e
 *   `properties`).
 */
export function tilemapExportJson(tilemap: TilemapAsset, tilesets: MapTilesets): string {
  const ids = tilemapTilesetIds(tilemap)
  const resolved = resolveMapTilesets(tilemap, tilesets)
  const present = resolved.filter((tileset): tileset is AnyTilesetAsset => tileset !== null)
  const primary = resolved[0] ?? null
  const indexOfId = (id: string): number | null => {
    const tileset = resolved[ids.indexOf(id)] ?? null
    return tileset ? present.indexOf(tileset) : null
  }
  return JSON.stringify(
    {
      format: TILEMAP_JSON_FORMAT,
      version: TILEMAP_JSON_VERSION,
      tileSize: primary?.tileSize ?? null,
      cols: tilemap.cols,
      rows: tilemap.rows,
      grid: tilemapToStudioGrid(tilemap),
      solid: primary ? tilesetSolidList(primary) : '',
      platform: primary ? tilesetPlatformList(primary) : '',
      tilesets: present.map((tileset) => ({
        name: tileset.name,
        tileSize: tileset.tileSize,
        columns: tilesetGridGeometry(tileset.tiles.length).columns,
        tileCount: tileset.tiles.length,
        solid: indicesOf(tileset.solid),
        platform: indicesOf(tileset.platform),
      })),
      layers: tilemap.layers.map((layer) =>
        isObjectLayer(layer)
          ? {
              type: 'objects',
              name: layer.name,
              visible: layer.visible,
              objects: layer.objects.map((object) => ({
                id: object.id,
                name: object.name,
                type: object.type,
                x: object.x,
                y: object.y,
                width: object.width,
                height: object.height,
                properties: object.properties,
              })),
            }
          : {
              type: 'tiles',
              name: layer.name,
              visible: layer.visible,
              front: layer.front === true,
              tileset: indexOfId(tileLayerTilesetId(tilemap, layer)),
              cells: Array.from(layer.cells),
            },
      ),
    },
    null,
    2,
  )
}

/** A receita em PT mostrada no ExportDialog/LEIA-ME. */
export function tilemapRecipe(tilemap: TilemapAsset, tilesets: MapTilesets): string {
  const resolved = resolveMapTilesets(tilemap, tilesets)
  const tileset = resolved[0]
  if (!tileset) return ''
  const solid = tilesetSolidList(tileset)
  const platform = tilesetPlatformList(tileset)
  const objectCount = tilemap.layers.reduce(
    (sum, layer) => sum + (isObjectLayer(layer) ? layer.objects.length : 0),
    0,
  )
  return [
    `Mapa de ${tilemap.cols} × ${tilemap.rows} peças, cada peça com ${tileset.tileSize} × ${tileset.tileSize}.`,
    'Jeito FÁCIL: no Pinta, toque no foguete "Usar no Estúdio" e, no Estúdio,',
    'use o bloco "Criar mapa do meu desenho" — grade, peças e sólidos vão juntos.',
    'Ou monte na mão com o bloco "Criar mapa de tiles": cole a GRADE no campo,',
    `use a imagem das peças ("${tileset.name}") e tamanho ${tileset.tileSize}.`,
    solid ? `Peças sólidas (barram o personagem): ${solid}.` : 'Nenhuma peça sólida marcada.',
    platform ? `Peças plataforma (dá para pisar em cima e passar por baixo): ${platform}.` : '',
    resolved.length > 1
      ? `Este mapa usa ${resolved.length} conjuntos de peças: a grade leva só as camadas das peças "${tileset.name}". As outras camadas estão no arquivo .pinta-tilemap.json.`
      : '',
    objectCount > 0
      ? `O mapa tem ${objectCount} ${objectCount === 1 ? 'objeto' : 'objetos'} (pontos e áreas): estão no arquivo .pinta-tilemap.json.`
      : '',
  ]
    .filter(Boolean)
    .join('\n')
}
