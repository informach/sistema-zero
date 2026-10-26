/**
 * As imagens "PNG com os dados do Pinta dentro" do Estúdio Python (pygame): a FOLHA inteira
 * de um personagem, a folha inteira de um conjunto de peças e o ATLAS de um mapa (todas as
 * peças que ele usa, uma folha embaixo da outra) — cada uma com o JSON que diz como cortá-la.
 *
 * Puro: monta a cena (em pixels do DESENHO) e o JSON (em pixels da SAÍDA, já multiplicados
 * pela escala). Quem rasteriza é o `portableImageRender`; quem embute o JSON no PNG é o
 * `pngText`. A geometria é a de sempre, por construção:
 * - folha de quadros = `packAnimationsGeometry` (uma linha por animação, colunas = o maior
 *   número de quadros, quadros alinhados à esquerda);
 * - folha de peças = `tilesetGridGeometry` (colunas = min(peças, 8), row-major; peça vazia
 *   continua no lugar dela, senão os índices do mapa mudariam).
 *
 * O leitor é o `pinta.py` (`packages/studio/src/runtime/python/pygame/py/pinta.py`): mudar um
 * nome de campo aqui quebra os jogos. Campo novo é acréscimo; o resto pede `version: 2`.
 */
import {
  type AnyTilesetAsset,
  isTileLayer,
  type PixelSpriteAsset,
  resolveAssetPalette,
  type TilemapAsset,
  type TilemapObjectPropertyValue,
  tileLayerTilesetId,
  type VectorSpriteAsset,
} from '../core/project'
import { flattenCelsOrBlank } from '../pixel/layers'
import { resolveMapTilesets } from '../tiles/mapTilesets'
import { tilesetGridGeometry } from '../tiles/packGeometry'
import type { PintaImageScene, PixelSceneCell, VectorSceneCell } from './portableImageRender'
import { pixelSpriteHitbox, vectorSpriteHitbox } from './spriteHitbox'
import { packAnimationsGeometry } from './spritesheet'

interface DataHeader {
  format: 'pinta'
  version: 1
  name: string
  scale: number
}

export interface PintaImageSpriteData extends DataHeader {
  kind: 'sprite'
  frameWidth: number
  frameHeight: number
  columns: number
  rows: number
  animations: Array<{ name: string; row: number; frames: number; fps: number; loop: boolean }>
  /** A caixa de colisão do desenho, relativa ao quadro; `null` = o quadro inteiro. */
  hitbox: { x: number; y: number; width: number; height: number } | null
}

export interface PintaImageTilesetData extends DataHeader {
  kind: 'tileset'
  tileSize: number
  columns: number
  count: number
  solid: number[]
  platform: number[]
}

export interface PintaImageMapData extends DataHeader {
  kind: 'map'
  tileSize: number
  cols: number
  rows: number
  /** As folhas do atlas, empilhadas: a padrão do mapa primeiro, cada uma em `y`. */
  tilesets: Array<{
    name: string
    y: number
    columns: number
    count: number
    solid: number[]
    platform: number[]
  }>
  layers: Array<
    | {
        type: 'tiles'
        name: string
        visible: boolean
        front: boolean
        /** Índice em `tilesets`. */
        tileset: number
        /** Row-major, `cols × rows`; -1 = casa vazia. */
        cells: number[]
      }
    | {
        type: 'objects'
        name: string
        visible: boolean
        objects: Array<{
          id: string
          name: string
          type: string
          x: number
          y: number
          width: number
          height: number
          properties: Record<string, TilemapObjectPropertyValue>
        }>
      }
  >
}

export type PintaImageData = PintaImageSpriteData | PintaImageTilesetData | PintaImageMapData

export interface PintaImageDataSelection {
  scene: PintaImageScene
  /** Tamanho da SAÍDA (já com a escala). */
  width: number
  height: number
  data: PintaImageData
}

/**
 * Um quadro/peça precisa ter um número INTEIRO de pixels na saída: o jogo corta a folha por
 * esses números, e meio pixel desalinharia todos os quadros seguintes.
 */
function outputCell(size: number, scale: number): number {
  const value = size * scale
  const rounded = Math.round(value)
  if (rounded < 1 || Math.abs(value - rounded) > 1e-9)
    throw new Error(
      'Com este tamanho, cada quadro ou peça ficaria com um pedaço de pixel. Escolha outra escala.',
    )
  return rounded
}

function header(name: string, scale: number): DataHeader {
  return { format: 'pinta', version: 1, name, scale }
}

/** Índices marcados (sólido vence plataforma, como no Pinta), só os que existem. */
function marks(tileset: AnyTilesetAsset): { solid: number[]; platform: number[] } {
  const solid: number[] = []
  const platform: number[] = []
  for (let index = 0; index < tileset.tiles.length; index++) {
    if (tileset.solid[index] === true) solid.push(index)
    else if (tileset.platform[index] === true) platform.push(index)
  }
  return { solid, platform }
}

export function spritesheetSelection(
  source: PixelSpriteAsset | VectorSpriteAsset,
  scale: number,
): PintaImageDataSelection {
  const geometry = packAnimationsGeometry(
    source.frameWidth,
    source.frameHeight,
    source.animations.map((animation) => ({
      name: animation.name,
      fps: animation.fps,
      loop: animation.loop,
      frameCount: animation.frames.length,
    })),
  )
  const frameWidth = outputCell(source.frameWidth, scale),
    frameHeight = outputCell(source.frameHeight, scale)
  const width = geometry.columns * source.frameWidth,
    height = Math.max(geometry.rows, 1) * source.frameHeight
  let scene: PintaImageScene
  let fraction: ReturnType<typeof pixelSpriteHitbox>
  if (source.kind === 'pixel-sprite') {
    const colors = resolveAssetPalette(source)
    const cells: PixelSceneCell[] = []
    source.animations.forEach((animation, row) => {
      animation.frames.forEach((cels, col) => {
        cells.push({
          bitmap: flattenCelsOrBlank(cels, source.layers),
          colors,
          x: col * source.frameWidth,
          y: row * source.frameHeight,
        })
      })
    })
    scene = { kind: 'pixel-cells', width, height, cells }
    fraction = pixelSpriteHitbox(
      source.animations.flatMap((animation) => animation.frames),
      source.layers,
      source.frameWidth,
      source.frameHeight,
    )
  } else {
    const cells: VectorSceneCell[] = []
    source.animations.forEach((animation, row) => {
      animation.frames.forEach((shapes, col) => {
        cells.push({
          shapes,
          x: col * source.frameWidth,
          y: row * source.frameHeight,
          width: source.frameWidth,
          height: source.frameHeight,
        })
      })
    })
    scene = { kind: 'vector-cells', width, height, cells }
    fraction = vectorSpriteHitbox(
      source.animations.flatMap((animation) => animation.frames),
      source.frameWidth,
      source.frameHeight,
    )
  }
  let hitbox: PintaImageSpriteData['hitbox'] = null
  if (fraction) {
    const x = Math.min(frameWidth - 1, Math.round(fraction.x * frameWidth))
    const y = Math.min(frameHeight - 1, Math.round(fraction.y * frameHeight))
    hitbox = {
      x,
      y,
      width: Math.max(1, Math.min(frameWidth - x, Math.round(fraction.w * frameWidth))),
      height: Math.max(1, Math.min(frameHeight - y, Math.round(fraction.h * frameHeight))),
    }
  }
  return {
    scene,
    width: geometry.columns * frameWidth,
    height: Math.max(geometry.rows, 1) * frameHeight,
    data: {
      ...header(source.name, scale),
      kind: 'sprite',
      frameWidth,
      frameHeight,
      columns: geometry.columns,
      rows: geometry.rows,
      animations: geometry.animations.map(({ name, row, frames, fps, loop }) => ({
        name,
        row,
        frames,
        fps,
        loop,
      })),
      hitbox,
    },
  }
}

/** As células de UMA folha de peças, deslocadas para `top` (em pixels do desenho). */
function tilesetCells(
  tileset: AnyTilesetAsset,
  top: number,
): { pixel: PixelSceneCell[]; vector: VectorSceneCell[] } {
  const { columns } = tilesetGridGeometry(tileset.tiles.length)
  const size = tileset.tileSize
  const at = (index: number) => ({
    x: (index % columns) * size,
    y: top + Math.floor(index / columns) * size,
  })
  if (tileset.kind === 'tileset') {
    const colors = resolveAssetPalette(tileset)
    return {
      pixel: tileset.tiles.map((bitmap, index) => ({ bitmap, colors, ...at(index) })),
      vector: [],
    }
  }
  return {
    pixel: [],
    vector: tileset.tiles.map((shapes, index) => ({
      shapes,
      ...at(index),
      width: size,
      height: size,
    })),
  }
}

function cellsScene(
  style: AnyTilesetAsset['kind'],
  width: number,
  height: number,
  parts: Array<{ pixel: PixelSceneCell[]; vector: VectorSceneCell[] }>,
): PintaImageScene {
  return style === 'tileset'
    ? { kind: 'pixel-cells', width, height, cells: parts.flatMap((part) => part.pixel) }
    : { kind: 'vector-cells', width, height, cells: parts.flatMap((part) => part.vector) }
}

export function tilesetSheetSelection(
  source: AnyTilesetAsset,
  scale: number,
): PintaImageDataSelection {
  const tileSize = outputCell(source.tileSize, scale)
  const { columns, rows } = tilesetGridGeometry(source.tiles.length)
  return {
    scene: cellsScene(source.kind, columns * source.tileSize, rows * source.tileSize, [
      tilesetCells(source, 0),
    ]),
    width: columns * tileSize,
    height: rows * tileSize,
    data: {
      ...header(source.name, scale),
      kind: 'tileset',
      tileSize,
      columns,
      count: source.tiles.length,
      ...marks(source),
    },
  }
}

/**
 * O atlas do mapa: as folhas das peças que ele usa (a padrão primeiro, depois as das camadas na
 * ordem de `tilemapTilesetIds`), alinhadas à esquerda e empilhadas. Uma camada cujas peças não
 * vieram ou não combinam com as padrão fica de fora, como no Pinta (nunca é desenhada com as
 * peças erradas). Casa que aponta para uma peça que não existe vira vazia (-1).
 */
export function mapAtlasSelection(
  map: TilemapAsset,
  available: readonly AnyTilesetAsset[],
  scale: number,
): PintaImageDataSelection {
  const primary = available[0]
  if (!primary || primary.id !== map.tilesetId)
    throw new Error('O conjunto de peças deste mapa não está disponível.')
  const tilesets = resolveMapTilesets(map, available).filter(
    (tileset): tileset is AnyTilesetAsset => tileset !== null,
  )
  const size = primary.tileSize
  const tileSize = outputCell(size, scale)
  let top = 0,
    width = 0
  const sheets = tilesets.map((tileset) => {
    const { columns, rows } = tilesetGridGeometry(tileset.tiles.length)
    const sheet = { tileset, columns, rows, top }
    width = Math.max(width, columns * size)
    top += rows * size
    return sheet
  })
  const index = new Map(tilesets.map((tileset, position) => [tileset.id, position]))
  const layers: PintaImageMapData['layers'] = []
  for (const layer of map.layers) {
    if (isTileLayer(layer)) {
      const position = index.get(tileLayerTilesetId(map, layer))
      if (position === undefined) continue
      const count = tilesets[position]!.tiles.length
      layers.push({
        type: 'tiles',
        name: layer.name,
        visible: layer.visible,
        front: layer.front === true,
        tileset: position,
        cells: Array.from(layer.cells, (cell) => (cell >= 0 && cell < count ? cell : -1)),
      })
    } else {
      layers.push({
        type: 'objects',
        name: layer.name,
        visible: layer.visible,
        objects: layer.objects.map((object) => ({
          id: object.id,
          name: object.name,
          type: object.type,
          x: object.x * scale,
          y: object.y * scale,
          width: object.width * scale,
          height: object.height * scale,
          properties: { ...object.properties },
        })),
      })
    }
  }
  return {
    scene: cellsScene(
      primary.kind,
      width,
      top,
      sheets.map((sheet) => tilesetCells(sheet.tileset, sheet.top)),
    ),
    width: (width / size) * tileSize,
    height: (top / size) * tileSize,
    data: {
      ...header(map.name, scale),
      kind: 'map',
      tileSize,
      cols: map.cols,
      rows: map.rows,
      tilesets: sheets.map((sheet) => ({
        name: sheet.tileset.name,
        y: (sheet.top / size) * tileSize,
        columns: sheet.columns,
        count: sheet.tileset.tiles.length,
        ...marks(sheet.tileset),
      })),
      layers,
    },
  }
}

/** Source-pixel size of each whole sheet, for the selection summary (no pixels touched). */
export function spritesheetSourceSize(source: PixelSpriteAsset | VectorSpriteAsset) {
  const columns = Math.max(...source.animations.map((animation) => animation.frames.length), 1)
  return {
    width: columns * source.frameWidth,
    height: Math.max(source.animations.length, 1) * source.frameHeight,
  }
}

export function tilesetSourceSize(source: AnyTilesetAsset) {
  const { columns, rows } = tilesetGridGeometry(source.tiles.length)
  return { width: columns * source.tileSize, height: rows * source.tileSize }
}

export function mapAtlasSourceSize(map: TilemapAsset, available: readonly AnyTilesetAsset[]) {
  const tilesets = resolveMapTilesets(map, available).filter(
    (tileset): tileset is AnyTilesetAsset => tileset !== null,
  )
  let width = 0,
    height = 0
  for (const tileset of tilesets) {
    const size = tilesetSourceSize(tileset)
    width = Math.max(width, size.width)
    height += size.height
  }
  return { width, height }
}
