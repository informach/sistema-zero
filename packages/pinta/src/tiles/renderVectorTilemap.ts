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
import type { TilemapCells, VectorFrame, VectorTilesetAsset } from '../core/project'
import { effectiveLayer, isTileLayer, tileLayerTilesetId, tilemapNeedsV3 } from '../core/project'
import { embedVectorFonts } from '../vector/portableSvg'
import { svgToPngDataUrl } from '../vector/rasterize'
import { sceneDefsMarkup, shapesToMarkup, withSvgRootSize } from '../vector/svg'
import { cellTile } from './cell'
import { cellMatrix } from './chunks'
import type { AuthorMap } from './mapCellEdits'
import { createTileCellReader, mapCellBounds } from './mapCells'
import { admitMapSvg, MAP_IMAGE_LIMITS, MapImageBudgetError, mapImageSize } from './mapImageBudget'
import { drawableMapTile, type MapTilesets, resolveMapTilesets } from './mapTilesets'
import { flattenWithTilesets } from './tilemapOps'

function vectorTilesets(tilemap: AuthorMap, source: MapTilesets): Array<VectorTilesetAsset | null> {
  return resolveMapTilesets(tilemap, source).map((tileset) =>
    tileset?.kind === 'vector-tileset' ? tileset : null,
  )
}

function symbolId(source: number, index: number): string {
  return source === 0 ? `tile-${index}` : `tile-${source}-${index}`
}

interface VectorCell {
  index: number
  source: number
  value: number
  col: number
  row: number
  e: ReturnType<typeof effectiveLayer>
}

function visitVectorCells(
  map: AuthorMap,
  resolved: Array<VectorTilesetAsset | null>,
  visit: (cell: VectorCell) => void,
): void {
  const bounds = mapCellBounds(map)
  for (const l of map.layers) {
    if (!isTileLayer<TilemapCells>(l) || l.collision) continue
    const e = effectiveLayer(map, l),
      source = resolved.findIndex((t) => t?.id === tileLayerTilesetId(map, l)),
      ts = resolved[source]
    if (!e.visible || !e.opacity || !ts) continue
    createTileCellReader(l.cells, bounds).visitOccupied(
      bounds,
      (value, col, row) => {
        const index = cellTile(value)
        if (index >= 0 && index < ts.tiles.length) visit({ index, source, value, col, row, e })
      },
      'row-major',
    )
  }
}
/** As peças realmente usadas: chave `source:index` → formas. */
function usedTiles(
  tilemap: AuthorMap,
  resolved: Array<VectorTilesetAsset | null>,
): Map<string, { source: number; index: number; shapes: VectorFrame }> {
  const used = new Map<string, { source: number; index: number; shapes: VectorFrame }>()
  if ('origin' in tilemap || tilemapNeedsV3(tilemap)) {
    visitVectorCells(tilemap, resolved, (c) => {
      used.set(`${c.source}:${c.index}`, {
        source: c.source,
        index: c.index,
        shapes: resolved[c.source]!.tiles[c.index] ?? [],
      })
    })
    return used
  }
  const flat = flattenWithTilesets(tilemap, undefined, drawableMapTile(tilemap, resolved))
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

export function vectorTilemapSvg(tilemap: AuthorMap, tilesets: MapTilesets): string {
  const resolved = vectorTilesets(tilemap, tilesets)
  const region = 'origin' in tilemap
  if (region && !resolved[0]) throw new Error('As peças deste mapa não foram encontradas.')
  const tile = resolved[0]?.tileSize ?? 16
  const width = tilemap.cols * tile
  const height = tilemap.rows * tile
  const bounds = mapCellBounds(tilemap),
    structured = 'origin' in tilemap || tilemapNeedsV3(tilemap),
    flat =
      'origin' in tilemap || structured
        ? null
        : flattenWithTilesets(tilemap, undefined, drawableMapTile(tilemap, resolved))
  let chars = 0
  const part = (text: string): string => {
    if (region) {
      chars += text.length + 1
      if (chars > MAP_IMAGE_LIMITS.svgChars) throw new MapImageBudgetError()
    }
    return text
  }
  const header = part(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"${region ? ' overflow="hidden"' : ''}>`,
  )

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
      return part(
        `    <symbol id="${id}" viewBox="0 0 ${tile} ${tile}">\n${content}\n    </symbol>`,
      )
    })

  const uses: string[] = []
  if (structured)
    visitVectorCells(tilemap, resolved, (c) => {
      const [a, b, d, e] = cellMatrix(c.value),
        x = (c.col - bounds.col) * tile + c.e.offsetX + tile / 2,
        y = (c.row - bounds.row) * tile + c.e.offsetY + tile / 2
      uses.push(
        part(
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
        ),
      )
    })
  if (flat)
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

  const svg = [header, '  <defs>', ...symbols, '  </defs>', ...uses, '</svg>'].join('\n')
  return region ? admitMapSvg(svg) : svg
}

function usedTileShapes(tilemap: AuthorMap, tilesets: MapTilesets) {
  return [...usedTiles(tilemap, vectorTilesets(tilemap, tilesets)).values()].flatMap(
    (entry) => entry.shapes,
  )
}

export async function vectorTilemapPortableSvg(
  tilemap: AuthorMap,
  tilesets: MapTilesets,
): Promise<string> {
  const svg = await embedVectorFonts(
    vectorTilemapSvg(tilemap, tilesets),
    usedTileShapes(tilemap, tilesets),
  )
  return 'origin' in tilemap ? admitMapSvg(svg) : svg
}

/** Rasteriza o mapa achatado. `null` sem canvas/Image (happy-dom). */
export async function vectorTilemapPngDataUrl(
  tilemap: AuthorMap,
  tilesets: MapTilesets,
  scale = 1,
): Promise<string | null> {
  const primary = vectorTilesets(tilemap, tilesets)[0],
    tile = primary?.tileSize ?? 16
  if ('origin' in tilemap) {
    if (!primary) return null
    const image = mapImageSize(tilemap, tile, scale)
    if (!image) return null
    const svg = withSvgRootSize(
      await vectorTilemapPortableSvg(tilemap, tilesets),
      image.width,
      image.height,
    )
    return svgToPngDataUrl(svg, image.width, image.height)
  }
  return svgToPngDataUrl(
    await vectorTilemapPortableSvg(tilemap, tilesets),
    tilemap.cols * tile,
    tilemap.rows * tile,
    scale,
  )
}
