/**
 * O mapa ACHATADO com tileset VETORIAL como imagem: cada tile vira um
 * `<symbol>` (definido UMA vez) e cada célula um `<use>` — o documento não
 * explode de tamanho nem com 100×100 células. `<symbol>` instanciado com
 * width/height clipa o conteúdo (paridade com o bitmap).
 *
 * Mapa com várias peças: as do tileset PADRÃO continuam `tile-<i>` (o markup de
 * todo mapa antigo fica igual); as de outro tileset ganham o prefixo da posição
 * dele em `tilemapTilesetIds` (`tile-<s>-<i>`).
 */
import type { TilemapAsset, VectorFrame, VectorTilesetAsset } from '../core/project'
import { effectiveLayer, isTileLayer, tileLayerTilesetId, tilemapNeedsV3 } from '../core/project'
import { embedVectorFonts } from '../vector/portableSvg'
import { svgToPngDataUrl } from '../vector/rasterize'
import { sceneDefsMarkup, shapesToMarkup } from '../vector/svg'
import { cellTile } from './cell'
import { cellMatrix } from './chunks'
import { drawableMapTile, type MapTilesets, resolveMapTilesets } from './mapTilesets'
import { flattenWithTilesets } from './tilemapOps'

function vectorTilesets(
  tilemap: TilemapAsset,
  source: MapTilesets,
): Array<VectorTilesetAsset | null> {
  return resolveMapTilesets(tilemap, source).map((tileset) =>
    tileset?.kind === 'vector-tileset' ? tileset : null,
  )
}

function symbolId(source: number, index: number): string {
  return source === 0 ? `tile-${index}` : `tile-${source}-${index}`
}

function vectorCells(map: TilemapAsset, resolved: Array<VectorTilesetAsset | null>) {
  return map.layers.flatMap((l) => {
    if (!isTileLayer(l) || l.collision) return []
    const e = effectiveLayer(map, l),
      source = resolved.findIndex((t) => t?.id === tileLayerTilesetId(map, l)),
      ts = resolved[source]
    if (!e.visible || !e.opacity || !ts) return []
    return [...l.cells.entries()].flatMap(([i, value]) => {
      const index = cellTile(value)
      return index < 0 || index >= ts.tiles.length
        ? []
        : [{ index, source, value, col: i % map.cols, row: Math.floor(i / map.cols), e }]
    })
  })
}
/** As peças realmente usadas: chave `source:index` → formas. */
function usedTiles(
  tilemap: TilemapAsset,
  resolved: Array<VectorTilesetAsset | null>,
): Map<string, { source: number; index: number; shapes: VectorFrame }> {
  const flat = flattenWithTilesets(tilemap, undefined, drawableMapTile(tilemap, resolved))
  const used = new Map<string, { source: number; index: number; shapes: VectorFrame }>()
  if (tilemapNeedsV3(tilemap)) {
    for (const c of vectorCells(tilemap, resolved))
      used.set(`${c.source}:${c.index}`, {
        source: c.source,
        index: c.index,
        shapes: resolved[c.source]!.tiles[c.index] ?? [],
      })
    return used
  }
  for (let at = 0; at < flat.tiles.length; at += 1) {
    const index = flat.tiles[at] ?? -1
    if (index < 0) continue
    const source = flat.sources[at] ?? 0
    const tileset = resolved[source]
    if (!tileset || index >= tileset.tiles.length) continue
    const key = `${source}:${index}`
    if (!used.has(key)) used.set(key, { source, index, shapes: tileset.tiles[index] ?? [] })
  }
  return used
}

export function vectorTilemapSvg(tilemap: TilemapAsset, tilesets: MapTilesets): string {
  const resolved = vectorTilesets(tilemap, tilesets)
  const tile = resolved[0]?.tileSize ?? 16
  const width = tilemap.cols * tile
  const height = tilemap.rows * tile
  const flat = flattenWithTilesets(tilemap, undefined, drawableMapTile(tilemap, resolved))

  // Só define símbolos para tiles realmente usados no mapa.
  const used = usedTiles(tilemap, resolved)
  const symbols = [...used.values()]
    .sort((a, b) => a.source - b.source || a.index - b.index)
    .map(({ source, index, shapes }) => {
      const id = symbolId(source, index)
      const idPrefix = `${id}-`
      const defs = sceneDefsMarkup(shapes, idPrefix)
      const content = [
        defs ? `      ${defs.replace(/\n/g, '\n      ')}` : '',
        shapesToMarkup(shapes, '      ', idPrefix),
      ]
        .filter(Boolean)
        .join('\n')
      return `    <symbol id="${id}" viewBox="0 0 ${tile} ${tile}">\n${content}\n    </symbol>`
    })

  const uses: string[] = []
  if (tilemapNeedsV3(tilemap))
    for (const c of vectorCells(tilemap, resolved)) {
      const [a, b, d, e] = cellMatrix(c.value),
        x = c.col * tile + c.e.offsetX + tile / 2,
        y = c.row * tile + c.e.offsetY + tile / 2
      uses.push(
        '<g opacity="' +
          c.e.opacity +
          '" transform="translate(' +
          x +
          ' ' +
          y +
          ') matrix(' +
          [a, b, d, e, 0, 0].join(' ') +
          ')"><use href="#' +
          symbolId(c.source, c.index) +
          '" x="' +
          -tile / 2 +
          '" y="' +
          -tile / 2 +
          '" width="' +
          tile +
          '" height="' +
          tile +
          '"/></g>',
      )
    }
  if (!tilemapNeedsV3(tilemap))
    for (let row = 0; row < tilemap.rows; row += 1) {
      for (let col = 0; col < tilemap.cols; col += 1) {
        const at = row * tilemap.cols + col
        const index = flat.tiles[at] ?? -1
        const source = flat.sources[at] ?? 0
        if (index < 0 || !used.has(`${source}:${index}`)) continue
        uses.push(
          `  <use href="#${symbolId(source, index)}" x="${col * tile}" y="${row * tile}" width="${tile}" height="${tile}"/>`,
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

function usedTileShapes(tilemap: TilemapAsset, tilesets: MapTilesets) {
  return [...usedTiles(tilemap, vectorTilesets(tilemap, tilesets)).values()].flatMap(
    (entry) => entry.shapes,
  )
}

export async function vectorTilemapPortableSvg(
  tilemap: TilemapAsset,
  tilesets: MapTilesets,
): Promise<string> {
  return embedVectorFonts(vectorTilemapSvg(tilemap, tilesets), usedTileShapes(tilemap, tilesets))
}

/** Rasteriza o mapa achatado. `null` sem canvas/Image (happy-dom). */
export async function vectorTilemapPngDataUrl(
  tilemap: TilemapAsset,
  tilesets: MapTilesets,
  scale = 1,
): Promise<string | null> {
  const tile = vectorTilesets(tilemap, tilesets)[0]?.tileSize ?? 16
  return svgToPngDataUrl(
    await vectorTilemapPortableSvg(tilemap, tilesets),
    tilemap.cols * tile,
    tilemap.rows * tile,
    scale,
  )
}
