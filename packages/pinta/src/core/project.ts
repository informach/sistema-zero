/**
 * Modelo de dados do Pinta: os ASSETS que a criança desenha. Cada asset é um
 * registro independente no IndexedDB (ver src/state/persistence.ts) — não há
 * "projeto" navegável na v1: a galeria é a lista de assets do perfil.
 *
 * Bitmaps são `Uint8Array` de ÍNDICES de paleta (0 = transparente — ver
 * core/palette.ts): 1 byte/pixel, structured-clone nativo no IndexedDB e
 * operações puras testáveis sem canvas.
 */

import { sanitizeVectorShape, type VectorShape } from '../vector/model'
import { newId } from './id'
import { DEFAULT_PALETTE_ID, isPaletteId, type PaletteId } from './palette'

export interface PintaBitmap {
  width: number
  height: number
  /** Índices de paleta, row-major, length = width*height. */
  data: Uint8Array
}

export type PintaAssetKind = 'pixel-sprite' | 'pixel-background' | 'tileset' | 'tilemap' | 'vector'

interface PintaAssetBase {
  id: string
  /**
   * Nome kebab-case, MESMA normalização do studio (`normalizeAssetName`) — na
   * ponte "Usar no Estúdio" ele vira o nome do `ProjectAsset` que os blocos
   * referenciam.
   */
  name: string
  createdAt: number
  updatedAt: number
}

export interface PintaAnimation {
  id: string
  /** Nome livre em PT ("parado", "andar", "pular"…), mostrado na UI e no export. */
  name: string
  /** Quadros por segundo (1–30) — o MESMO valor que sai no metadado do export. */
  fps: number
  loop: boolean
  frames: PintaBitmap[]
}

export interface PixelSpriteAsset extends PintaAssetBase {
  kind: 'pixel-sprite'
  frameWidth: number
  frameHeight: number
  paletteId: PaletteId
  /** Sempre ≥1; a primeira nasce "parado". */
  animations: PintaAnimation[]
}

export interface PixelBackgroundAsset extends PintaAssetBase {
  kind: 'pixel-background'
  paletteId: PaletteId
  bitmap: PintaBitmap
}

export interface TilesetAsset extends PintaAssetBase {
  kind: 'tileset'
  /** Tile QUADRADO (o bloco de tilemap do Studio usa um número só). */
  tileSize: number
  paletteId: PaletteId
  /** O índice no array É o índice do tile no Studio (empacotamento row-major). */
  tiles: PintaBitmap[]
  /** Paralelo a `tiles`: alimenta a lista de "tiles sólidos" do bloco. */
  solid: boolean[]
}

export interface TilemapLayer {
  id: string
  name: string
  visible: boolean
  /** Índices de tile por célula, row-major; -1 = vazio. */
  cells: Int16Array
}

export interface TilemapAsset extends PintaAssetBase {
  kind: 'tilemap'
  /** Referência a um TilesetAsset do MESMO perfil. */
  tilesetId: string
  cols: number
  rows: number
  /** Nasce com 1 camada ("Chão"); o modelo já suporta várias. */
  layers: TilemapLayer[]
}

export interface VectorAsset extends PintaAssetBase {
  kind: 'vector'
  width: number
  height: number
  /** Ordem = z-order (fundo primeiro). */
  shapes: VectorShape[]
}

export type PintaAsset =
  | PixelSpriteAsset
  | PixelBackgroundAsset
  | TilesetAsset
  | TilemapAsset
  | VectorAsset

/**
 * Quotas do modelo — compartilhadas entre criação, edição e o sanitizer do
 * load (subir uma sobe em todos os pontos, sem re-recorte ao reabrir).
 */
export const PINTA_LIMITS = {
  maxAssets: 64,
  maxAnimations: 12,
  maxFramesPerAnimation: 24,
  minFrameSize: 8,
  maxFrameSize: 128,
  maxBitmapSize: 512,
  maxTiles: 64,
  maxTilemapCols: 100,
  maxTilemapRows: 100,
  maxTilemapLayers: 4,
  maxShapes: 500,
  maxNameChars: 48,
  maxAnimationNameChars: 30,
} as const

/** Tamanhos amigáveis oferecidos no passo "tamanho" da criação. */
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

const ASSET_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/

/**
 * Normaliza um nome de asset para kebab-case ASCII (`herói do mar` →
 * `heroi-do-mar`). `null` se sobrar vazio ou exceder o teto.
 * ⚠️ Manter em sincronia com `normalizeAssetName` de
 * packages/studio/src/core/project.ts — o nome atravessa a ponte p/ o Estúdio.
 */
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

// ── Fábricas ────────────────────────────────────────────────────────────────

export function createBitmap(width: number, height: number): PintaBitmap {
  return { width, height, data: new Uint8Array(width * height) }
}

export function createPixelSpriteAsset(input: {
  name: string
  frameSize: number
  paletteId?: PaletteId
  now?: number
}): PixelSpriteAsset {
  const now = input.now ?? Date.now()
  const size = clampInt(input.frameSize, PINTA_LIMITS.minFrameSize, PINTA_LIMITS.maxFrameSize)
  return {
    id: newId(),
    kind: 'pixel-sprite',
    name: input.name,
    createdAt: now,
    updatedAt: now,
    frameWidth: size,
    frameHeight: size,
    paletteId: input.paletteId ?? DEFAULT_PALETTE_ID,
    animations: [
      { id: newId(), name: 'parado', fps: 8, loop: true, frames: [createBitmap(size, size)] },
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
  const width = clampInt(input.width, 1, PINTA_LIMITS.maxBitmapSize)
  const height = clampInt(input.height, 1, PINTA_LIMITS.maxBitmapSize)
  return {
    id: newId(),
    kind: 'pixel-background',
    name: input.name,
    createdAt: now,
    updatedAt: now,
    paletteId: input.paletteId ?? DEFAULT_PALETTE_ID,
    bitmap: createBitmap(width, height),
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
  const cols = clampInt(input.cols, 1, PINTA_LIMITS.maxTilemapCols)
  const rows = clampInt(input.rows, 1, PINTA_LIMITS.maxTilemapRows)
  return {
    id: newId(),
    kind: 'tilemap',
    name: input.name,
    createdAt: now,
    updatedAt: now,
    tilesetId: input.tilesetId,
    cols,
    rows,
    layers: [{ id: newId(), name: 'Chão', visible: true, cells: emptyCells(cols * rows) }],
  }
}

export function createVectorAsset(input: {
  name: string
  width: number
  height: number
  now?: number
}): VectorAsset {
  const now = input.now ?? Date.now()
  return {
    id: newId(),
    kind: 'vector',
    name: input.name,
    createdAt: now,
    updatedAt: now,
    width: clampInt(input.width, 1, 2048),
    height: clampInt(input.height, 1, 2048),
    shapes: [],
  }
}

function emptyCells(length: number): Int16Array {
  return new Int16Array(length).fill(-1)
}

function clampInt(value: number, min: number, max: number): number {
  const v = Math.round(Number.isFinite(value) ? value : min)
  return Math.min(Math.max(v, min), max)
}

// ── Sanitização (dados vindos do disco/import — nunca lança) ────────────────

function isFinitePositiveInt(value: unknown, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= max
}

function sanitizeBitmap(
  raw: unknown,
  expected?: { width: number; height: number },
): PintaBitmap | null {
  if (!raw || typeof raw !== 'object') return null
  const b = raw as Record<string, unknown>
  if (!isFinitePositiveInt(b.width, PINTA_LIMITS.maxBitmapSize)) return null
  if (!isFinitePositiveInt(b.height, PINTA_LIMITS.maxBitmapSize)) return null
  if (expected && (b.width !== expected.width || b.height !== expected.height)) return null
  if (!(b.data instanceof Uint8Array) || b.data.length !== b.width * b.height) return null
  return { width: b.width, height: b.height, data: b.data }
}

function sanitizeTimestamps(raw: Record<string, unknown>): {
  createdAt: number
  updatedAt: number
} {
  const createdAt =
    typeof raw.createdAt === 'number' && Number.isFinite(raw.createdAt) ? raw.createdAt : 0
  const updatedAt =
    typeof raw.updatedAt === 'number' && Number.isFinite(raw.updatedAt) ? raw.updatedAt : createdAt
  return { createdAt, updatedAt }
}

function sanitizeBase(raw: Record<string, unknown>): PintaAssetBase | null {
  if (typeof raw.id !== 'string' || !raw.id || raw.id.includes(':')) return null
  const name = typeof raw.name === 'string' ? normalizeAssetName(raw.name) : null
  if (!name) return null
  return { id: raw.id, name, ...sanitizeTimestamps(raw) }
}

function sanitizeAnimation(
  raw: unknown,
  frame: { width: number; height: number },
): PintaAnimation | null {
  if (!raw || typeof raw !== 'object') return null
  const a = raw as Record<string, unknown>
  if (typeof a.id !== 'string' || !a.id) return null
  const name =
    typeof a.name === 'string' && a.name.trim()
      ? a.name.trim().slice(0, PINTA_LIMITS.maxAnimationNameChars)
      : 'animação'
  const fps = typeof a.fps === 'number' && Number.isFinite(a.fps) ? clampInt(a.fps, 1, 30) : 8
  const loop = a.loop !== false
  if (!Array.isArray(a.frames)) return null
  const frames = a.frames
    .slice(0, PINTA_LIMITS.maxFramesPerAnimation)
    .map((f) => sanitizeBitmap(f, frame))
    .filter((f): f is PintaBitmap => f !== null)
  if (frames.length === 0) return null
  return { id: a.id, name, fps, loop, frames }
}

/**
 * Valida um asset vindo de fonte não confiável (IndexedDB de outra versão,
 * import). Retorna o asset normalizado ou `null` (descartar). Nunca lança.
 */
export function sanitizePintaAsset(raw: unknown): PintaAsset | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  const base = sanitizeBase(record)
  if (!base) return null
  const paletteId = isPaletteId(record.paletteId) ? record.paletteId : DEFAULT_PALETTE_ID

  switch (record.kind) {
    case 'pixel-sprite': {
      if (!isFinitePositiveInt(record.frameWidth, PINTA_LIMITS.maxFrameSize)) return null
      if (!isFinitePositiveInt(record.frameHeight, PINTA_LIMITS.maxFrameSize)) return null
      const frame = { width: record.frameWidth, height: record.frameHeight }
      if (!Array.isArray(record.animations)) return null
      const animations = record.animations
        .slice(0, PINTA_LIMITS.maxAnimations)
        .map((a) => sanitizeAnimation(a, frame))
        .filter((a): a is PintaAnimation => a !== null)
      if (animations.length === 0) return null
      return {
        ...base,
        kind: 'pixel-sprite',
        frameWidth: frame.width,
        frameHeight: frame.height,
        paletteId,
        animations,
      }
    }
    case 'pixel-background': {
      const bitmap = sanitizeBitmap(record.bitmap)
      if (!bitmap) return null
      return { ...base, kind: 'pixel-background', paletteId, bitmap }
    }
    case 'tileset': {
      if (!isFinitePositiveInt(record.tileSize, PINTA_LIMITS.maxFrameSize)) return null
      const tileDims = { width: record.tileSize, height: record.tileSize }
      if (!Array.isArray(record.tiles)) return null
      const tiles = record.tiles
        .slice(0, PINTA_LIMITS.maxTiles)
        .map((t) => sanitizeBitmap(t, tileDims))
        .filter((t): t is PintaBitmap => t !== null)
      if (tiles.length === 0) return null
      const rawSolid = Array.isArray(record.solid) ? record.solid : []
      const solid = tiles.map((_, i) => rawSolid[i] === true)
      return { ...base, kind: 'tileset', tileSize: record.tileSize, paletteId, tiles, solid }
    }
    case 'tilemap': {
      if (typeof record.tilesetId !== 'string' || !record.tilesetId) return null
      if (!isFinitePositiveInt(record.cols, PINTA_LIMITS.maxTilemapCols)) return null
      if (!isFinitePositiveInt(record.rows, PINTA_LIMITS.maxTilemapRows)) return null
      const cellCount = record.cols * record.rows
      if (!Array.isArray(record.layers)) return null
      const layers = record.layers
        .slice(0, PINTA_LIMITS.maxTilemapLayers)
        .map((layer): TilemapLayer | null => {
          if (!layer || typeof layer !== 'object') return null
          const l = layer as Record<string, unknown>
          if (typeof l.id !== 'string' || !l.id) return null
          if (!(l.cells instanceof Int16Array) || l.cells.length !== cellCount) return null
          const name =
            typeof l.name === 'string' && l.name.trim() ? l.name.trim().slice(0, 30) : 'Camada'
          return { id: l.id, name, visible: l.visible !== false, cells: l.cells }
        })
        .filter((l): l is TilemapLayer => l !== null)
      if (layers.length === 0) return null
      return {
        ...base,
        kind: 'tilemap',
        tilesetId: record.tilesetId,
        cols: record.cols,
        rows: record.rows,
        layers,
      }
    }
    case 'vector': {
      if (!isFinitePositiveInt(record.width, 2048)) return null
      if (!isFinitePositiveInt(record.height, 2048)) return null
      if (!Array.isArray(record.shapes)) return null
      const shapes = record.shapes
        .slice(0, PINTA_LIMITS.maxShapes)
        .map((s) => sanitizeVectorShape(s))
        .filter((s): s is VectorShape => s !== null)
      return { ...base, kind: 'vector', width: record.width, height: record.height, shapes }
    }
    default:
      return null
  }
}
