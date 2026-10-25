/**
 * Gallery drawings as real Pinta documents (what the child opens and edits in Pinta) and as the
 * PNG files a pygame game loads (`pinta.py`): sprites with animations, backgrounds, tilesets and
 * maps with tile and object layers. Ids and timestamps are deterministic.
 *
 * ⭐ The PNG is DERIVED from those documents by the Pinta's own recipe (`portableImageData`, the
 * Studio's `pinta-image-1` at scale 2): the same data block (`pngWithPintaData`, byte for byte),
 * the same hitbox, object ids and names. "Editar no Pinta" re-derives the image from the copied
 * document, and that first derivation must give the game exactly the image it already had;
 * `derivation.test.ts` compares both, drawing by drawing.
 */
import {
  type AnyTilesetAsset,
  createPixelBackgroundAsset,
  createPixelSpriteAsset,
  createTilesetAsset,
  isTilesetKind,
  type PintaAsset,
  type PintaBitmap,
  resolveAssetPalette,
  sanitizePintaAsset,
  type TilemapAsset,
} from '../../src/core/project'
import { pngWithPintaData } from '../../src/export/pngText'
import {
  mapAtlasSelection,
  type PintaImageData,
  spritesheetSelection,
  tilesetSheetSelection,
} from '../../src/export/portableImageData'
import type { PintaImageScene } from '../../src/export/portableImageRender'
import { galleryToPintaJson } from '../../src/export/projectJson'
import { flattenCelsOrBlank } from '../../src/pixel/layers'
import { bitmapToRGBA } from '../../src/pixel/render'
import { buildTilemap } from '../../src/templates/builders'
import type { Color, Px } from './pixel'
import { encodePng, type RgbaImage } from './png'

export const GALLERY_TIME = Date.UTC(2026, 9, 25)

export interface SpriteDrawing {
  kind: 'sprite'
  name: string
  frameWidth: number
  frameHeight: number
  animations: { name: string; fps: number; loop: boolean; frames: Px[] }[]
}
export interface BackgroundDrawing {
  kind: 'background'
  name: string
  image: Px
}
export interface TilesetDrawing {
  kind: 'tileset'
  name: string
  tileSize: number
  tiles: { image: Px; collision?: 'solid' | 'platform' }[]
}
export interface MapObject {
  name: string
  type: string
  /** Pinta pixels (before the import scale); 0×0 is a point. */
  x: number
  y: number
  width?: number
  height?: number
  properties?: Record<string, string | number | boolean>
}
export type MapLayer =
  | {
      type: 'tiles'
      name: string
      tileset: TilesetDrawing
      cells: number[]
      front?: boolean
      visible?: boolean
    }
  | { type: 'objects'; name: string; objects: MapObject[]; visible?: boolean }
export interface MapDrawing {
  kind: 'map'
  name: string
  cols: number
  rows: number
  layers: MapLayer[]
}
export type Drawing = SpriteDrawing | BackgroundDrawing | TilesetDrawing | MapDrawing

/** Indexed bitmaps sharing one palette: 15 custom colours + up to 48 extra (Pinta's limit). */
function palettize(name: string, images: Px[]) {
  const colors: Color[] = []
  const index = new Map<Color, number>()
  for (const image of images)
    for (const color of image.data) {
      if (color === null || index.has(color)) continue
      colors.push(color)
      index.set(color, colors.length)
    }
  if (colors.length > 63)
    throw new Error(`O desenho ${name} usa ${colors.length} cores; o Pinta guarda até 63.`)
  const bitmaps: PintaBitmap[] = images.map((image) => ({
    width: image.width,
    height: image.height,
    data: Uint8Array.from(image.data, (color) => (color === null ? 0 : index.get(color)!)),
  }))
  const custom = ['', ...colors.slice(0, 15)]
  while (custom.length < 16) custom.push('')
  return {
    bitmaps,
    paletteFields: {
      paletteId: 'custom' as const,
      customPalette: { name, colors: custom },
      ...(colors.length > 15 ? { extraColors: colors.slice(15) } : {}),
    },
  }
}

function stable<T extends PintaAsset>(asset: T, id: string): T {
  const checked = sanitizePintaAsset(
    structuredClone({ ...asset, id, createdAt: GALLERY_TIME, updatedAt: GALLERY_TIME }),
  )
  if (!checked) throw new Error(`O Pinta recusou o desenho ${asset.name}.`)
  return checked as T
}

function tilesetAsset(drawing: TilesetDrawing, id: string) {
  if (
    drawing.tiles.some(
      (tile) => tile.image.width !== drawing.tileSize || tile.image.height !== drawing.tileSize,
    )
  )
    throw new Error(`O conjunto ${drawing.name} tem peças fora do tamanho ${drawing.tileSize}.`)
  const { bitmaps, paletteFields } = palettize(
    drawing.name,
    drawing.tiles.map((tile) => tile.image),
  )
  const base = createTilesetAsset({
    name: drawing.name,
    tileSize: drawing.tileSize,
    now: GALLERY_TIME,
  })
  return stable(
    {
      ...base,
      ...paletteFields,
      tiles: bitmaps,
      solid: drawing.tiles.map((tile) => tile.collision === 'solid'),
      platform: drawing.tiles.map((tile) => tile.collision === 'platform'),
    },
    id,
  )
}

/** The Pinta documents of one drawing (a map brings its tilesets along, the drawing last). */
export function pintaDocuments(drawing: Drawing, prefix: string): PintaAsset[] {
  const documents = buildDocuments(drawing, prefix)
  const document = documents.at(-1)!
  // Whatever the sanitizer clamped or dropped would make the Pinta's image differ from the game's.
  const kept =
    drawing.kind === 'sprite'
      ? document.kind === 'pixel-sprite' &&
        document.frameWidth === drawing.frameWidth &&
        document.frameHeight === drawing.frameHeight &&
        document.animations.length === drawing.animations.length &&
        document.animations.every(
          (animation, index) =>
            animation.frames.length === drawing.animations[index]!.frames.length,
        )
      : drawing.kind === 'background'
        ? document.kind === 'pixel-background' &&
          document.cels[0]?.width === drawing.image.width &&
          document.cels[0]?.height === drawing.image.height
        : drawing.kind === 'tileset'
          ? document.kind === 'tileset' &&
            document.tileSize === drawing.tileSize &&
            document.tiles.length === drawing.tiles.length
          : document.kind === 'tilemap' &&
            document.cols === drawing.cols &&
            document.rows === drawing.rows &&
            document.layers.length === drawing.layers.length
  if (!kept)
    throw new Error(
      `O Pinta mudou o desenho ${drawing.name} ao guardá-lo (tamanho, quadros ou camadas).`,
    )
  return documents
}

function buildDocuments(drawing: Drawing, prefix: string): PintaAsset[] {
  const id = `${prefix}-${drawing.name}`
  if (drawing.kind === 'sprite') {
    const frames = drawing.animations.flatMap((animation) => animation.frames)
    // The Pinta clamps a frame size and DROPS an animation whose frames do not match it, in
    // silence: the image it derives would then differ from the game's.
    for (const animation of drawing.animations)
      if (
        animation.frames.some(
          (frame) => frame.width !== drawing.frameWidth || frame.height !== drawing.frameHeight,
        )
      )
        throw new Error(
          `A animação ${animation.name} de ${drawing.name} tem quadros fora do tamanho ${drawing.frameWidth}x${drawing.frameHeight}.`,
        )
    const { bitmaps, paletteFields } = palettize(drawing.name, frames)
    const base = createPixelSpriteAsset({
      name: drawing.name,
      frameSize: drawing.frameWidth,
      frameWidth: drawing.frameWidth,
      frameHeight: drawing.frameHeight,
      now: GALLERY_TIME,
    })
    let at = 0
    return [
      stable(
        {
          ...base,
          ...paletteFields,
          layers: [{ ...base.layers[0]!, id: `${id}-camada` }],
          animations: drawing.animations.map((animation, index) => ({
            id: `${id}-anim-${index}`,
            name: animation.name,
            fps: animation.fps,
            loop: animation.loop,
            frames: animation.frames.map(() => [bitmaps[at++]!]),
          })),
        },
        id,
      ),
    ]
  }
  if (drawing.kind === 'background') {
    const { bitmaps, paletteFields } = palettize(drawing.name, [drawing.image])
    const base = createPixelBackgroundAsset({
      name: drawing.name,
      width: drawing.image.width,
      height: drawing.image.height,
      now: GALLERY_TIME,
    })
    return [
      stable(
        {
          ...base,
          ...paletteFields,
          layers: [{ ...base.layers[0]!, id: `${id}-camada` }],
          cels: bitmaps,
        },
        id,
      ),
    ]
  }
  if (drawing.kind === 'tileset') return [tilesetAsset(drawing, id)]
  const tilesets = mapTilesets(drawing)
  // A layer naming a missing piece would become an empty cell in the Pinta: never in silence.
  for (const layer of drawing.layers)
    if (layer.type === 'tiles' && layer.cells.some((cell) => cell >= layer.tileset.tiles.length))
      throw new Error(`A camada ${layer.name} do mapa ${drawing.name} usa uma peça que não existe.`)
  const assets = new Map(
    tilesets.map((tileset) => [tileset, tilesetAsset(tileset, `${prefix}-${tileset.name}`)]),
  )
  const map: TilemapAsset = buildTilemap({
    name: drawing.name,
    tileset: assets.get(tilesets[0]!)!,
    tilesets: [...assets.values()],
    cols: drawing.cols,
    rows: drawing.rows,
    objectUnits: 'pixels',
    layers: drawing.layers.map((layer) =>
      layer.type === 'tiles'
        ? {
            name: layer.name,
            cells: layer.cells,
            tileset: assets.get(layer.tileset)!,
            front: layer.front ?? false,
            visible: layer.visible ?? true,
          }
        : {
            kind: 'objects' as const,
            name: layer.name,
            visible: layer.visible ?? true,
            objects: layer.objects.map((object) => ({ ...object, type: object.type })),
          },
    ),
  })
  let objectIndex = 0
  const fixed = {
    ...map,
    layers: map.layers.map((layer, index) =>
      'objects' in layer && layer.objects
        ? {
            ...layer,
            id: `${id}-camada-${index}`,
            objects: layer.objects.map((object) => ({
              ...object,
              id: `${id}-obj-${objectIndex++}`,
            })),
          }
        : { ...layer, id: `${id}-camada-${index}` },
    ),
  } as TilemapAsset
  return [...assets.values(), stable(fixed, id)]
}

function mapTilesets(drawing: MapDrawing): TilesetDrawing[] {
  const used: TilesetDrawing[] = []
  for (const layer of drawing.layers)
    if (layer.type === 'tiles' && !used.includes(layer.tileset)) used.push(layer.tileset)
  if (!used.length) throw new Error(`O mapa ${drawing.name} precisa de uma camada de peças.`)
  // The Pinta leaves out a layer whose pieces do not match the map's own: never in silence here.
  if (used.some((tileset) => tileset.tileSize !== used[0]!.tileSize))
    throw new Error(`As peças do mapa ${drawing.name} precisam ter o mesmo tamanho.`)
  for (const layer of drawing.layers)
    if (layer.type === 'tiles' && layer.cells.length !== drawing.cols * drawing.rows)
      throw new Error(`A camada ${layer.name} do mapa ${drawing.name} tem o tamanho errado.`)
  return used
}

/**
 * Every Pinta document of a game, once each. A map brings its tilesets along, so the same
 * tileset may come twice, and that is fine when it is the SAME document. Two DIFFERENT drawings
 * becoming one id (a sprite and a tileset both called `enfeites`) would keep only one of them in
 * `desenhos.pinta.json`, and "Editar no Pinta" on the other PNG would open the wrong drawing:
 * that is an error, as is two drawings writing the same PNG.
 */
export function gameDocuments(drawings: Drawing[], game: string): PintaAsset[] {
  const byId = new Map<string, { document: PintaAsset; json: string; from: string }>()
  const pngs = new Set<string>()
  for (const drawing of drawings) {
    if (pngs.has(drawing.name))
      throw new Error(
        `${game}: dois desenhos se chamam ${drawing.name} e gravariam o mesmo assets/${drawing.name}.png.`,
      )
    pngs.add(drawing.name)
    for (const document of pintaDocuments(drawing, game)) {
      const json = galleryToPintaJson([document])
      const from = `${document.kind} ${document.name} (de ${drawing.kind} ${drawing.name})`
      const seen = byId.get(document.id)
      if (seen && seen.json !== json)
        throw new Error(
          `${game}: dois desenhos diferentes viram o documento ${document.id}: ${seen.from} e ${from}. Dê nomes diferentes a eles.`,
        )
      if (!seen) byId.set(document.id, { document, json, from })
    }
  }
  const names = new Map<string, string>()
  for (const { document } of byId.values()) {
    const other = names.get(document.name)
    if (other)
      throw new Error(
        `${game}: os documentos ${other} e ${document.id} têm o mesmo nome ${document.name}.`,
      )
    names.set(document.name, document.id)
  }
  return [...byId.values()].map((entry) => entry.document)
}

/** The Studio's selection for a drawing of a pygame example (`exampleDrawingLink`). */
export function recipeSelection(
  document: PintaAsset,
): 'spritesheet' | 'tileset' | 'map' | 'background' {
  if (document.kind === 'pixel-sprite' || document.kind === 'vector-sprite') return 'spritesheet'
  if (isTilesetKind(document)) return 'tileset'
  if (document.kind === 'tilemap') return 'map'
  return 'background'
}

/**
 * The pixels of a pixel scene at an integer scale: what the Pinta's canvas draws with smoothing
 * off (`renderPintaImage`). `derivation.test.ts` checks it against the real canvas.
 */
function rasterize(scene: PintaImageScene, width: number, height: number): RgbaImage {
  const sheet =
    scene.kind === 'pixel'
      ? {
          cells: [{ bitmap: scene.bitmap, colors: scene.colors, x: 0, y: 0 }],
          sourceWidth: scene.bitmap.width,
          sourceHeight: scene.bitmap.height,
        }
      : scene.kind === 'pixel-cells'
        ? { cells: scene.cells, sourceWidth: scene.width, sourceHeight: scene.height }
        : null
  if (!sheet) throw new Error('A galeria só tem desenhos de pixels.')
  const { cells, sourceWidth, sourceHeight } = sheet
  const scale = width / sourceWidth
  if (!Number.isInteger(scale) || height / sourceHeight !== scale)
    throw new Error('A escala da galeria precisa ser inteira.')
  const pixels = new Uint8Array(width * height * 4)
  for (const cell of cells) {
    const rgba = bitmapToRGBA(cell.bitmap, cell.colors)
    for (let y = 0; y < cell.bitmap.height; y++)
      for (let x = 0; x < cell.bitmap.width; x++) {
        const from = (y * cell.bitmap.width + x) * 4
        if (rgba[from + 3] === 0) continue
        for (let dy = 0; dy < scale; dy++) {
          const row = ((cell.y + y) * scale + dy) * width
          for (let dx = 0; dx < scale; dx++)
            pixels.set(rgba.subarray(from, from + 4), (row + (cell.x + x) * scale + dx) * 4)
        }
      }
  }
  return { width, height, pixels }
}

/**
 * The image the Pinta derives for a document (the Studio's recipe at `scale`): the scene, the
 * output size and, for sheets and maps, the data block. `tilesets` = the map's tilesets, the
 * map's own first (the order `pintaDocuments` gives).
 */
export function pintaSelection(
  document: PintaAsset,
  tilesets: readonly AnyTilesetAsset[],
  scale: number,
): { scene: PintaImageScene; width: number; height: number; data?: PintaImageData } {
  const selection = recipeSelection(document)
  if (
    selection === 'spritesheet' &&
    (document.kind === 'pixel-sprite' || document.kind === 'vector-sprite')
  )
    return spritesheetSelection(document, scale)
  if (selection === 'tileset' && isTilesetKind(document))
    return tilesetSheetSelection(document, scale)
  if (selection === 'map' && document.kind === 'tilemap')
    return mapAtlasSelection(document, tilesets, scale)
  if (document.kind !== 'pixel-background')
    throw new Error(`O desenho ${document.name} não é de pixels.`)
  // `portableImage.select` for a background: the flattened layers, the size times the scale.
  const bitmap: PintaBitmap = flattenCelsOrBlank(document.cels, document.layers)
  return {
    scene: { kind: 'pixel', bitmap, colors: resolveAssetPalette(document) },
    width: Math.round(bitmap.width * scale),
    height: Math.round(bitmap.height * scale),
  }
}

/**
 * The PNG a pygame project receives for a drawing: `documents` are the drawing's own documents
 * (`pintaDocuments`: a map's tilesets first, the drawing itself last).
 */
export async function gamePng(
  documents: readonly PintaAsset[],
  scale: number,
): Promise<Uint8Array> {
  const document = documents.at(-1)
  if (!document) throw new Error('Desenho sem documento do Pinta.')
  const tilesets = documents.slice(0, -1).filter(isTilesetKind)
  const selection = pintaSelection(document, tilesets, scale)
  const png = encodePng(rasterize(selection.scene, selection.width, selection.height))
  return selection.data ? pngWithPintaData(png, selection.data) : png
}
