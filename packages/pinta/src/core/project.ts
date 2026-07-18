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
import { normalizeHex } from './color'
import { newId } from './id'
import { DEFAULT_PALETTE_ID, getPalette, isPaletteId, type PaletteId } from './palette'

export interface PintaBitmap {
  width: number
  height: number
  /** Índices de paleta, row-major, length = width*height. */
  data: Uint8Array
}

export type PintaAssetKind =
  | 'pixel-sprite'
  | 'pixel-background'
  | 'tileset'
  | 'tilemap'
  | 'vector-sprite'
  | 'vector-background'
  | 'vector-tileset'

/** Estilo de desenho (a PRIMEIRA escolha da criança ao criar um asset). */
export type PintaAssetStyle = 'pixel' | 'vector'

/** Papel do asset no jogo (a SEGUNDA escolha, igual nos dois estilos). */
export type PintaAssetRole = 'sprite' | 'background' | 'tileset' | 'tilemap'

/** Estilo derivado do kind. `null` para o tilemap (herda o estilo das peças). */
export function assetStyle(kind: PintaAssetKind): PintaAssetStyle | null {
  if (kind === 'tilemap') return null
  return kind.startsWith('vector') ? 'vector' : 'pixel'
}

export function assetRole(kind: PintaAssetKind): PintaAssetRole {
  switch (kind) {
    case 'pixel-sprite':
    case 'vector-sprite':
      return 'sprite'
    case 'pixel-background':
    case 'vector-background':
      return 'background'
    case 'tileset':
    case 'vector-tileset':
      return 'tileset'
    case 'tilemap':
      return 'tilemap'
  }
}

/**
 * Vínculo do asset com um PROJETO do Pensa (07/2026): agrupa a galeria por jogo
 * ("os desenhos do meu Dino") e carrega a paleta da identidade p/ os swatches
 * extras do vetor. Opcional — desenho avulso segue sem vínculo.
 */
export interface PintaProjectRef {
  id: string
  name: string
  /** Paleta do jogo (hex `#rrggbb`, ≤8) escolhida na etapa E do Pensa. */
  palette?: string[]
}

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
  /** Projeto do Pensa dono deste desenho (agrupamento da galeria). */
  projectRef?: PintaProjectRef
}

/**
 * Suavização da PRÉVIA da animação (só dentro do Pinta — não vai para a ponte
 * do Estúdio, que só conhece fps/loop). `linear` = passo constante (o de sempre;
 * ausência = `linear`); `ease` acelera/desacelera nas pontas de cada ciclo sem
 * mudar a DURAÇÃO total.
 */
export type PintaEasing = 'linear' | 'ease'

/**
 * Uma animação nomeada. Genérica no tipo do QUADRO com default `PintaBitmap`:
 * o código pixel existente não muda; o sprite vetorial usa `VectorFrame`.
 */
export interface PintaAnimation<TFrame = PintaBitmap> {
  id: string
  /** Nome livre em PT ("parado", "andar", "pular"…), mostrado na UI e no export. */
  name: string
  /** Quadros por segundo (1–30) — o MESMO valor que sai no metadado do export. */
  fps: number
  loop: boolean
  /** Suavização da prévia (opcional; ausente = `linear`). Não sai no export. */
  easing?: PintaEasing
  frames: TFrame[]
}

/** Um quadro vetorial = lista de shapes (ordem = z-order, fundo primeiro). */
export type VectorFrame = VectorShape[]

export type PintaVectorAnimation = PintaAnimation<VectorFrame>

/**
 * Cores PERSONALIZADAS que a criança adicionou (via seletor livre), ANEXADAS
 * depois das 16 da paleta base: o índice de uma cor extra é `16 + posição`. O
 * bitmap continua indexado (1 byte/pixel, até 256 índices), então adicionar uma
 * cor nunca repinta a arte existente. Ausente = só as 16 base (comportamento
 * histórico). Trocar a paleta base preserva estas. Ver `resolveAssetPalette`.
 */
export type PintaExtraColors = readonly string[]

export interface PixelSpriteAsset extends PintaAssetBase {
  kind: 'pixel-sprite'
  frameWidth: number
  frameHeight: number
  paletteId: PaletteId
  extraColors?: PintaExtraColors
  /** Sempre ≥1; a primeira nasce "parado". */
  animations: PintaAnimation[]
}

export interface PixelBackgroundAsset extends PintaAssetBase {
  kind: 'pixel-background'
  paletteId: PaletteId
  extraColors?: PintaExtraColors
  bitmap: PintaBitmap
}

export interface TilesetAsset extends PintaAssetBase {
  kind: 'tileset'
  /** Tile QUADRADO (o bloco de tilemap do Studio usa um número só). */
  tileSize: number
  paletteId: PaletteId
  extraColors?: PintaExtraColors
  /** O índice no array É o índice do tile no Studio (empacotamento row-major). */
  tiles: PintaBitmap[]
  /** Paralelo a `tiles`: alimenta a lista de "tiles sólidos" do bloco. */
  solid: boolean[]
  /**
   * Paralelo a `tiles`: peça PLATAFORMA (one-way — pisa por cima, atravessa por
   * baixo). Mutuamente exclusivo com `solid` (sólido vence no conflito).
   */
  platform: boolean[]
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

export interface VectorSpriteAsset extends PintaAssetBase {
  kind: 'vector-sprite'
  /** O quadro rasteriza 1:1 na spritesheet — este É o tamanho do sprite no jogo. */
  frameWidth: number
  frameHeight: number
  /** Sempre ≥1; a primeira nasce "parado". */
  animations: PintaVectorAnimation[]
}

/** O antigo kind `vector` ("Desenho livre") — migrado no sanitize. */
export interface VectorBackgroundAsset extends PintaAssetBase {
  kind: 'vector-background'
  width: number
  height: number
  /** Ordem = z-order (fundo primeiro). */
  shapes: VectorShape[]
}

export interface VectorTilesetAsset extends PintaAssetBase {
  kind: 'vector-tileset'
  /** Tile QUADRADO (o bloco de tilemap do Studio usa um número só). */
  tileSize: number
  /** O índice no array É o índice do tile no Studio (empacotamento row-major). */
  tiles: VectorFrame[]
  /** Paralelo a `tiles`: alimenta a lista de "tiles sólidos" do bloco. */
  solid: boolean[]
  /**
   * Paralelo a `tiles`: peça PLATAFORMA (one-way — pisa por cima, atravessa por
   * baixo). Mutuamente exclusivo com `solid` (sólido vence no conflito).
   */
  platform: boolean[]
}

export type PintaAsset =
  | PixelSpriteAsset
  | PixelBackgroundAsset
  | TilesetAsset
  | TilemapAsset
  | VectorSpriteAsset
  | VectorBackgroundAsset
  | VectorTilesetAsset

/** Os dois estilos de tileset — o tilemap referencia qualquer um. */
export type AnyTilesetAsset = TilesetAsset | VectorTilesetAsset

export function isTilesetKind(asset: PintaAsset): asset is AnyTilesetAsset {
  return asset.kind === 'tileset' || asset.kind === 'vector-tileset'
}

/** Sprites animados dos dois estilos — as ops de animation/frames.ts servem os dois. */
export type AnimatedSpriteAsset = PixelSpriteAsset | VectorSpriteAsset

export function isAnimatedSpriteKind(asset: PintaAsset): asset is AnimatedSpriteAsset {
  return asset.kind === 'pixel-sprite' || asset.kind === 'vector-sprite'
}

/**
 * Paleta do asset, com default para kinds sem paleta própria (tilemap herda a
 * das peças na prática; vetoriais usam cor livre e só precisam de um valor
 * estável para os caminhos de export que pedem paleta).
 */
export function paletteIdOf(asset: PintaAsset): PaletteId {
  return 'paletteId' in asset ? asset.paletteId : DEFAULT_PALETTE_ID
}

/**
 * Cores extras do asset (se houver), sempre um array (nunca `undefined`).
 * `tilemap` herda as do tileset na prática, mas ele mesmo não guarda extras.
 */
export function extraColorsOf(asset: PintaAsset): PintaExtraColors {
  return 'extraColors' in asset && asset.extraColors ? asset.extraColors : []
}

/**
 * Paleta EFETIVA do asset = 16 cores base (por `paletteId`) + cores extras
 * personalizadas. É a fronteira única de cor: render, thumbs e export recebem
 * ESTE array (não mais um `paletteId`), então "qualquer cor" funciona sem
 * espalhar o conceito de paleta indexada. Índice de pixel fora do array sai
 * transparente (garantido em `bitmapToRGBA`).
 */
export function resolveAssetPalette(asset: PintaAsset): readonly string[] {
  const base = getPalette(paletteIdOf(asset)).colors
  const extra = extraColorsOf(asset)
  return extra.length > 0 ? [...base, ...extra] : base
}

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
  // Teto casado com o `MAX_TILEMAP_DIM` do Studio (128) — mapas maiores exigem
  // grade compacta (RLE) nos dois parsers do runtime + culling no editor.
  maxTilemapCols: 128,
  maxTilemapRows: 128,
  maxTilemapLayers: 4,
  maxShapes: 500,
  maxNameChars: 48,
  maxAnimationNameChars: 30,
  /**
   * Teto de cores EXTRAS por asset (além das 16 base). 16 + 48 = 64 índices no
   * total, bem abaixo dos 256 que o Uint8Array do bitmap comporta.
   */
  maxExtraColors: 48,
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
/**
 * O quadro vetorial rasteriza 1:1 na folha do Estúdio, então o documento É o
 * tamanho do sprite no jogo (o zoom do editor dá o conforto, sem perda).
 */
export const VECTOR_SPRITE_SIZES = [32, 64, 128] as const
/** Paridade com os tamanhos que o bloco de tilemap do Studio espera. */
export const VECTOR_TILE_SIZES = TILE_SIZES

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

export function createVectorSpriteAsset(input: {
  name: string
  frameSize: number
  now?: number
}): VectorSpriteAsset {
  const now = input.now ?? Date.now()
  const size = clampInt(input.frameSize, PINTA_LIMITS.minFrameSize, PINTA_LIMITS.maxFrameSize)
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
    width: clampInt(input.width, 1, 2048),
    height: clampInt(input.height, 1, 2048),
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

const PROJECT_REF_HEX = /^#[0-9a-f]{6}$/i

/**
 * `projectRef` válido sobrevive ao round-trip; malformado é DESCARTADO (não o
 * asset). Exportado: o `galleryStore.create` passa o intent do Pensa por aqui
 * também (portão ÚNICO — hex minúsculo, nome no teto, ≤8 cores).
 */
export function sanitizeProjectRef(raw: unknown): PintaProjectRef | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string' || !r.id || r.id.length > 64) return undefined
  if (typeof r.name !== 'string' || !r.name.trim()) return undefined
  const palette = Array.isArray(r.palette)
    ? r.palette
        .filter((c): c is string => typeof c === 'string' && PROJECT_REF_HEX.test(c))
        .map((c) => c.toLowerCase())
        .slice(0, 8)
    : []
  return {
    id: r.id,
    name: r.name.trim().slice(0, PINTA_LIMITS.maxNameChars),
    ...(palette.length > 0 ? { palette } : {}),
  }
}

/**
 * Cores extras vindas do disco/import: cada uma normalizada para `#rrggbb`,
 * deduplicadas e cortadas no teto. `undefined` (não `[]`) quando não há nenhuma
 * válida — mantém o asset idêntico ao histórico (a chave nem aparece).
 */
function sanitizeExtraColors(raw: unknown): PintaExtraColors | undefined {
  if (!Array.isArray(raw)) return undefined
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of raw) {
    if (typeof value !== 'string') continue
    const hex = normalizeHex(value)
    if (!hex || seen.has(hex)) continue
    seen.add(hex)
    out.push(hex)
    if (out.length >= PINTA_LIMITS.maxExtraColors) break
  }
  return out.length > 0 ? out : undefined
}

/** Suavização vinda do disco: só `ease` é reconhecido; o resto vira `linear`. */
function sanitizeEasing(raw: unknown): PintaEasing {
  return raw === 'ease' ? 'ease' : 'linear'
}

function sanitizeBase(raw: Record<string, unknown>): PintaAssetBase | null {
  if (typeof raw.id !== 'string' || !raw.id || raw.id.includes(':')) return null
  const name = typeof raw.name === 'string' ? normalizeAssetName(raw.name) : null
  if (!name) return null
  const projectRef = sanitizeProjectRef(raw.projectRef)
  return { id: raw.id, name, ...sanitizeTimestamps(raw), ...(projectRef ? { projectRef } : {}) }
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
  const easing = sanitizeEasing(a.easing)
  const frames = a.frames
    .slice(0, PINTA_LIMITS.maxFramesPerAnimation)
    .map((f) => sanitizeBitmap(f, frame))
    .filter((f): f is PintaBitmap => f !== null)
  if (frames.length === 0) return null
  return { id: a.id, name, fps, loop, frames, ...(easing === 'ease' ? { easing } : {}) }
}

/** Um quadro vetorial vindo do disco: shapes válidos sobrevivem, o resto cai. */
function sanitizeVectorFrame(raw: unknown): VectorFrame | null {
  if (!Array.isArray(raw)) return null
  return raw
    .slice(0, PINTA_LIMITS.maxShapes)
    .map((s) => sanitizeVectorShape(s))
    .filter((s): s is VectorShape => s !== null)
}

function sanitizeVectorAnimation(raw: unknown): PintaVectorAnimation | null {
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
  // Diferente do pixel: um quadro vetorial VAZIO ([]) é válido (quadro em branco);
  // só descartamos o que nem é lista.
  const easing = sanitizeEasing(a.easing)
  const frames = a.frames
    .slice(0, PINTA_LIMITS.maxFramesPerAnimation)
    .map((f) => sanitizeVectorFrame(f))
    .filter((f): f is VectorFrame => f !== null)
  if (frames.length === 0) return null
  return { id: a.id, name, fps, loop, frames, ...(easing === 'ease' ? { easing } : {}) }
}

/**
 * Valida um asset vindo de fonte não confiável (IndexedDB de outra versão,
 * import). Retorna o asset normalizado ou `null` (descartar). Nunca lança.
 *
 * Também é o ponto de MIGRAÇÃO lazy: o kind antigo `vector` ("Desenho livre")
 * volta como `vector-background` — o registro no disco só é reescrito no
 * próximo save do asset.
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
      const extraColors = sanitizeExtraColors(record.extraColors)
      return {
        ...base,
        kind: 'pixel-sprite',
        frameWidth: frame.width,
        frameHeight: frame.height,
        paletteId,
        ...(extraColors ? { extraColors } : {}),
        animations,
      }
    }
    case 'pixel-background': {
      const bitmap = sanitizeBitmap(record.bitmap)
      if (!bitmap) return null
      const extraColors = sanitizeExtraColors(record.extraColors)
      return {
        ...base,
        kind: 'pixel-background',
        paletteId,
        ...(extraColors ? { extraColors } : {}),
        bitmap,
      }
    }
    case 'tileset': {
      if (!isFinitePositiveInt(record.tileSize, PINTA_LIMITS.maxFrameSize)) return null
      const tileSize = record.tileSize
      const tileDims = { width: tileSize, height: tileSize }
      if (!Array.isArray(record.tiles)) return null
      // Tile corrompido vira tile VAZIO (não some): o índice no array é a
      // identidade da peça nos mapas e na folha — compactar deslocaria tudo.
      const tiles = record.tiles
        .slice(0, PINTA_LIMITS.maxTiles)
        .map((t) => sanitizeBitmap(t, tileDims) ?? createBitmap(tileSize, tileSize))
      if (tiles.length === 0) return null
      const rawSolid = Array.isArray(record.solid) ? record.solid : []
      const solid = tiles.map((_, i) => rawSolid[i] === true)
      const rawPlatform = Array.isArray(record.platform) ? record.platform : []
      // Exclusividade: sólido vence; ausente (asset antigo) → tudo falso.
      const platform = tiles.map((_, i) => rawPlatform[i] === true && solid[i] !== true)
      const extraColors = sanitizeExtraColors(record.extraColors)
      return {
        ...base,
        kind: 'tileset',
        tileSize,
        paletteId,
        ...(extraColors ? { extraColors } : {}),
        tiles,
        solid,
        platform,
      }
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
    // `vector` é o kind ANTIGO (pré paridade vetorial): migra para
    // `vector-background` aqui, sem tocar nos dados.
    case 'vector':
    case 'vector-background': {
      if (!isFinitePositiveInt(record.width, 2048)) return null
      if (!isFinitePositiveInt(record.height, 2048)) return null
      const shapes = sanitizeVectorFrame(record.shapes)
      if (shapes === null) return null
      return {
        ...base,
        kind: 'vector-background',
        width: record.width,
        height: record.height,
        shapes,
      }
    }
    case 'vector-sprite': {
      if (!isFinitePositiveInt(record.frameWidth, PINTA_LIMITS.maxFrameSize)) return null
      if (!isFinitePositiveInt(record.frameHeight, PINTA_LIMITS.maxFrameSize)) return null
      if (!Array.isArray(record.animations)) return null
      const animations = record.animations
        .slice(0, PINTA_LIMITS.maxAnimations)
        .map((a) => sanitizeVectorAnimation(a))
        .filter((a): a is PintaVectorAnimation => a !== null)
      if (animations.length === 0) return null
      return {
        ...base,
        kind: 'vector-sprite',
        frameWidth: record.frameWidth,
        frameHeight: record.frameHeight,
        animations,
      }
    }
    case 'vector-tileset': {
      if (!isFinitePositiveInt(record.tileSize, PINTA_LIMITS.maxFrameSize)) return null
      if (!Array.isArray(record.tiles)) return null
      // Como no pixel: tile corrompido vira VAZIO para preservar os índices.
      const tiles = record.tiles
        .slice(0, PINTA_LIMITS.maxTiles)
        .map((t) => sanitizeVectorFrame(t) ?? [])
      if (tiles.length === 0) return null
      const rawSolid = Array.isArray(record.solid) ? record.solid : []
      const solid = tiles.map((_, i) => rawSolid[i] === true)
      const rawPlatform = Array.isArray(record.platform) ? record.platform : []
      const platform = tiles.map((_, i) => rawPlatform[i] === true && solid[i] !== true)
      return { ...base, kind: 'vector-tileset', tileSize: record.tileSize, tiles, solid, platform }
    }
    default:
      return null
  }
}
