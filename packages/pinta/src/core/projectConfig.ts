import { COPY } from './copy'
import { newId } from './id'
import { DEFAULT_PALETTE_ID, type PaletteId } from './palette'
import type {
  PintaBitmap,
  PintaPixelLayer,
  PixelBackgroundAsset,
  PixelSpriteAsset,
  TilemapAsset,
  TilesetAsset,
  VectorBackgroundAsset,
  VectorSpriteAsset,
  VectorTilesetAsset,
} from './project'

export const PINTA_LIMITS = {
  maxAssets: 64,
  maxAnimations: 12,
  maxFramesPerAnimation: 24,
  minFrameSize: 8,
  maxFrameSize: 128,
  maxBitmapSize: 512,
  maxTiles: 64,
  maxTilemapCols: 128,
  maxTilemapRows: 128,
  maxTilemapLayers: 4,
  maxPixelLayers: 4,
  maxShapes: 500,
  maxNameChars: 48,
  maxAnimationNameChars: 30,
  maxExtraColors: 48,
} as const

export function uniqueAnimationName(desired: string, takenNames: Iterable<string>): string {
  const taken = new Set(takenNames)
  const base = desired.trim().slice(0, PINTA_LIMITS.maxAnimationNameChars)
  if (!taken.has(base)) return base
  for (let suffixNumber = 2; suffixNumber <= PINTA_LIMITS.maxAnimations + 1; suffixNumber += 1) {
    const suffix = ` ${suffixNumber}`
    const candidate = `${base.slice(0, PINTA_LIMITS.maxAnimationNameChars - suffix.length).trimEnd()}${suffix}`
    if (!taken.has(candidate)) return candidate
  }
  return base
}

export const SPRITE_FRAME_SIZES = [16, 32, 48, 64] as const
export const BACKGROUND_SIZES = [
  { width: 160, height: 120 },
  { width: 240, height: 180 },
  { width: 480, height: 360 },
] as const
export const TILE_SIZES = [16, 32, 48] as const
export const VECTOR_SIZES = [
  { width: 480, height: 360 },
  { width: 960, height: 540 },
] as const
export const VECTOR_SPRITE_SIZES = [32, 64, 128] as const
export const VECTOR_TILE_SIZES = TILE_SIZES

const ASSET_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/

export function normalizeAssetName(input: string): string | null {
  const trimmed = input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!trimmed || trimmed.length > PINTA_LIMITS.maxNameChars) return null
  return ASSET_NAME_PATTERN.test(trimmed) ? trimmed : null
}

export function createBitmap(width: number, height: number): PintaBitmap {
  return { width, height, data: new Uint8Array(width * height) }
}

export function createPixelLayer(index: number): PintaPixelLayer {
  return { id: newId(), name: `${COPY.layers.namePrefix} ${index + 1}`, visible: true }
}

export function createPixelSpriteAsset(input: {
  name: string
  frameSize: number
  paletteId?: PaletteId
  now?: number
}): PixelSpriteAsset {
  const now = input.now ?? Date.now()
  const size = clampProjectInt(
    input.frameSize,
    PINTA_LIMITS.minFrameSize,
    PINTA_LIMITS.maxFrameSize,
  )
  return {
    id: newId(),
    kind: 'pixel-sprite',
    name: input.name,
    createdAt: now,
    updatedAt: now,
    frameWidth: size,
    frameHeight: size,
    paletteId: input.paletteId ?? DEFAULT_PALETTE_ID,
    layers: [createPixelLayer(0)],
    animations: [
      { id: newId(), name: 'parado', fps: 8, loop: true, frames: [[createBitmap(size, size)]] },
    ],
  }
}

export function createPixelBackgroundAsset(input: {
  name: string
  width: number
  height: number
  paletteId?: PaletteId
  now?: number
}): PixelBackgroundAsset {
  const now = input.now ?? Date.now()
  const width = clampProjectInt(input.width, 1, PINTA_LIMITS.maxBitmapSize)
  const height = clampProjectInt(input.height, 1, PINTA_LIMITS.maxBitmapSize)
  return {
    id: newId(),
    kind: 'pixel-background',
    name: input.name,
    createdAt: now,
    updatedAt: now,
    paletteId: input.paletteId ?? DEFAULT_PALETTE_ID,
    layers: [createPixelLayer(0)],
    cels: [createBitmap(width, height)],
  }
}

export function createTilesetAsset(input: {
  name: string
  tileSize: number
  paletteId?: PaletteId
  now?: number
}): TilesetAsset {
  const now = input.now ?? Date.now()
  const tileSize = TILE_SIZES.includes(input.tileSize as (typeof TILE_SIZES)[number])
    ? input.tileSize
    : 16
  return {
    id: newId(),
    kind: 'tileset',
    name: input.name,
    createdAt: now,
    updatedAt: now,
    tileSize,
    paletteId: input.paletteId ?? DEFAULT_PALETTE_ID,
    tiles: [createBitmap(tileSize, tileSize)],
    solid: [false],
    platform: [false],
  }
}

export function createTilemapAsset(input: {
  name: string
  tilesetId: string
  cols: number
  rows: number
  now?: number
}): TilemapAsset {
  const now = input.now ?? Date.now()
  const cols = clampProjectInt(input.cols, 1, PINTA_LIMITS.maxTilemapCols)
  const rows = clampProjectInt(input.rows, 1, PINTA_LIMITS.maxTilemapRows)
  return {
    id: newId(),
    kind: 'tilemap',
    name: input.name,
    createdAt: now,
    updatedAt: now,
    tilesetId: input.tilesetId,
    cols,
    rows,
    layers: [
      { id: newId(), name: COPY.a11y.defaultLayer, visible: true, cells: emptyCells(cols * rows) },
    ],
  }
}

export function createVectorSpriteAsset(input: {
  name: string
  frameSize: number
  now?: number
}): VectorSpriteAsset {
  const now = input.now ?? Date.now()
  const size = clampProjectInt(
    input.frameSize,
    PINTA_LIMITS.minFrameSize,
    PINTA_LIMITS.maxFrameSize,
  )
  return {
    id: newId(),
    kind: 'vector-sprite',
    name: input.name,
    createdAt: now,
    updatedAt: now,
    frameWidth: size,
    frameHeight: size,
    animations: [{ id: newId(), name: 'parado', fps: 8, loop: true, frames: [[]] }],
  }
}

export function createVectorBackgroundAsset(input: {
  name: string
  width: number
  height: number
  now?: number
}): VectorBackgroundAsset {
  const now = input.now ?? Date.now()
  return {
    id: newId(),
    kind: 'vector-background',
    name: input.name,
    createdAt: now,
    updatedAt: now,
    // 2048 também é o teto MOSTRADO no tamanho personalizado do wizard
    // (gallery/customSize.ts) — mudar aqui pede mudar lá (e no sanitize).
    width: clampProjectInt(input.width, 1, 2048),
    height: clampProjectInt(input.height, 1, 2048),
    shapes: [],
  }
}

export function createVectorTilesetAsset(input: {
  name: string
  tileSize: number
  now?: number
}): VectorTilesetAsset {
  const now = input.now ?? Date.now()
  const tileSize = VECTOR_TILE_SIZES.includes(input.tileSize as (typeof VECTOR_TILE_SIZES)[number])
    ? input.tileSize
    : 16
  return {
    id: newId(),
    kind: 'vector-tileset',
    name: input.name,
    createdAt: now,
    updatedAt: now,
    tileSize,
    tiles: [[]],
    solid: [false],
    platform: [false],
  }
}

function emptyCells(length: number): Int16Array {
  return new Int16Array(length).fill(-1)
}

export function clampProjectInt(value: number, min: number, max: number): number {
  const rounded = Math.round(Number.isFinite(value) ? value : min)
  return Math.min(Math.max(rounded, min), max)
}
