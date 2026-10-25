/**
 * Modelo de dados do Pinta: os ASSETS que a criança desenha. Cada asset é um
 * registro independente no IndexedDB (ver src/state/persistence.ts) — não há
 * "projeto" navegável na v1: a galeria é a lista de assets do perfil.
 *
 * Bitmaps são `Uint8Array` de ÍNDICES de paleta (0 = transparente — ver
 * core/palette.ts): 1 byte/pixel, structured-clone nativo no IndexedDB e
 * operações puras testáveis sem canvas.
 */

import { PINTA_SOURCE_REF_PATTERN } from '@sistemazero/core/studio/pinta-source-ref'
import { sanitizeMaskReferences } from '../vector/mask'
import { sanitizeVectorShape, type VectorShape } from '../vector/model'
import { normalizeHex } from './color'
import { COPY } from './copy'
import { newId } from './id'
import {
  DEFAULT_PALETTE_ID,
  getPalette,
  isPaletteId,
  PALETTE_SIZE,
  type PaletteId,
  TRANSPARENT_INDEX,
} from './palette'
import {
  clampProjectInt,
  createBitmap,
  createPixelLayer,
  normalizeAssetName,
  PINTA_LIMITS,
  TILE_SIZES,
  uniqueAnimationName,
  VECTOR_TILE_SIZES,
} from './projectConfig'

export {
  BACKGROUND_SIZES,
  createBitmap,
  createPixelBackgroundAsset,
  createPixelLayer,
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
  createVectorBackgroundAsset,
  createVectorSpriteAsset,
  createVectorTilesetAsset,
  normalizeAssetName,
  PINTA_LIMITS,
  SPRITE_FRAME_SIZES,
  TILE_SIZES,
  uniqueAnimationName,
  VECTOR_SIZES,
  VECTOR_SPRITE_SIZES,
  VECTOR_TILE_SIZES,
} from './projectConfig'

export interface PintaBitmap {
  width: number
  height: number
  /** Índices de paleta, row-major, length = width*height. */
  data: Uint8Array
}

/**
 * Os 7 tipos, em RUNTIME. Existe como valor (e não só como união de tipo) porque quem está fora
 * do pacote precisa PERGUNTAR se um payload é um desenho — o bloco de aula do admin distingue a
 * entrega do Pinta da do Estúdio por aqui, já que as duas moram na mesma tabela.
 */
export const PINTA_ASSET_KINDS = [
  'pixel-sprite',
  'pixel-background',
  'tileset',
  'tilemap',
  'vector-sprite',
  'vector-background',
  'vector-tileset',
] as const

export type PintaAssetKind = (typeof PINTA_ASSET_KINDS)[number]

/** O payload é um desenho do Pinta? Checa só a identidade — o formato interno é do sanitize. */
export function isPintaAssetLike(value: unknown): boolean {
  const kind = (value as { kind?: unknown } | null | undefined)?.kind
  return typeof kind === 'string' && (PINTA_ASSET_KINDS as readonly string[]).includes(kind)
}

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
  /**
   * De qual documento de FORA este desenho é a cópia (ex.: um desenho de jogo de exemplo do
   * Estúdio, `example-pygame:<jogo>/<documento>`). É o que deixa a cópia ser REAPROVEITADA:
   * dois mapas do jogo sobre as mesmas peças usam UM conjunto de peças da criança. Ausente
   * (a forma canônica de todo desenho feito aqui) = o sanitize OMITE; duplicar ou restaurar
   * um backup cria um desenho NOVO e tira a marca (`state/importPlan.ts`).
   */
  sourceRef?: string
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
  /** Suavização da prévia (opcional; ausente = `linear`). GIF/SVG preservam os tempos. */
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

/**
 * Paleta que um asset de PIXEL pode apontar: uma das prontas OU `'custom'` —
 * e aí as cores moram em `customPalette`, EMBUTIDAS no próprio asset (o
 * desenho viaja com a paleta dele: pack, nuvem, entrega ao professor). A
 * união `PaletteId` continua fechada de propósito: o catálogo `PALETTES`/
 * `isPaletteId` não conhece `'custom'`.
 */
export type AssetPaletteId = PaletteId | 'custom'

/**
 * Paleta personalizada embutida: SEMPRE 16 posições, `[0] = ''` (transparente)
 * e slots vazios `''` PRESERVADOS — compactar deslocaria os índices já
 * pintados no bitmap. O render já tolera `''` (pinta transparente; os
 * swatches pulam o vazio).
 */
export interface PintaCustomPalette {
  name: string
  colors: readonly string[]
}

/**
 * CAMADA de um desenho de pixel — só os metadados (olho, nome, ordem). O
 * desenho de cada camada vive nos "cels": um `PintaBitmap` por camada,
 * ALINHADO por índice com `layers`. Espelha o `TilemapLayer`, mas sem os bytes
 * dentro, porque no sprite a MESMA camada tem um cel por quadro.
 *
 * Índice 0 = camada de FUNDO (no achatamento a de cima vence). A UI lista ao
 * contrário: o topo da lista é a camada de cima.
 *
 * ⚠️ O bitmap é INDEXADO (1 byte/pixel, sem alpha): a composição só sabe
 * "índice opaco de cima vence". Opacidade/blend por camada são inexprimíveis.
 */
export interface PintaPixelLayer {
  id: string
  name: string
  visible: boolean
  /**
   * Cadeado: trancada, o CONTEÚDO não muda (desenhar/transformar/apagar a
   * camada). Olho, nome e ordem continuam livres; excluir pede destrancar.
   * Convenção do `hidden` do vetor: `true` emite a chave, o resto OMITE.
   */
  locked?: boolean
}

/** Um quadro de pixel: um cel por camada, alinhado com `asset.layers`. */
export type PintaPixelFrame = PintaBitmap[]

export type PintaPixelAnimation = PintaAnimation<PintaPixelFrame>

export interface PixelSpriteAsset extends PintaAssetBase {
  kind: 'pixel-sprite'
  frameWidth: number
  frameHeight: number
  paletteId: AssetPaletteId
  /** Presente SOMENTE quando `paletteId === 'custom'` (o sanitize impõe). */
  customPalette?: PintaCustomPalette
  extraColors?: PintaExtraColors
  /** ≥1 camada, válida para TODAS as animações (cada quadro tem um cel por camada). */
  layers: PintaPixelLayer[]
  /** Sempre ≥1; a primeira nasce "parado". */
  animations: PintaPixelAnimation[]
}

export interface PixelBackgroundAsset extends PintaAssetBase {
  kind: 'pixel-background'
  paletteId: AssetPaletteId
  /** Presente SOMENTE quando `paletteId === 'custom'` (o sanitize impõe). */
  customPalette?: PintaCustomPalette
  extraColors?: PintaExtraColors
  /** ≥1 camada (índice 0 = fundo). */
  layers: PintaPixelLayer[]
  /** Um bitmap por camada, alinhado com `layers`. */
  cels: PintaPixelFrame
}

export interface TilesetAsset extends PintaAssetBase {
  kind: 'tileset'
  /** Tile QUADRADO (o bloco de tilemap do Studio usa um número só). */
  tileSize: number
  paletteId: AssetPaletteId
  /** Presente SOMENTE quando `paletteId === 'custom'` (o sanitize impõe). */
  customPalette?: PintaCustomPalette
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

/**
 * Camada de PEÇAS do mapa (a de sempre). O `kind` é OPCIONAL de propósito: todo
 * mapa salvo antes das camadas de objetos não tem a chave, e o sanitize a OMITE
 * na camada de peças — o registro antigo atravessa o round-trip byte a byte.
 */
export interface TilemapTileLayer {
  kind?: 'tiles'
  id: string
  name: string
  visible: boolean
  /** Índices de tile por célula, row-major; -1 = vazio. */
  cells: Int16Array
  /**
   * Camada "da frente": desenhada POR CIMA do jogador (copa de árvore, telhado).
   * No Estúdio vira um 2º tilemap desenhado depois do sprite. Ausente = fundo.
   */
  front?: boolean
  /**
   * As PEÇAS desta camada (outro tileset do mesmo perfil, com o MESMO tamanho de
   * peça e o mesmo estilo das peças do mapa). Ausente = as do mapa
   * (`TilemapAsset.tilesetId`), que é como todo mapa antigo é lido. Leia sempre
   * por `tileLayerTilesetId`.
   */
  tilesetId?: string
  objects?: never
}

/** Valor de uma propriedade de objeto: texto, número ou sim/não. */
export type TilemapObjectPropertyValue = string | number | boolean

/**
 * Um OBJETO do mapa: ponto de partida do jogador, inimigo, porta, área de
 * colisão, lugar de item. Coordenadas em PIXELS DO MAPA (coluna × tamanho da
 * peça), canto de cima à esquerda. `width === 0 && height === 0` = PONTO;
 * senão é um retângulo.
 */
export interface TilemapObject {
  id: string
  name: string
  /** O "tipo" que o jogo lê (`inimigo`, `porta`…). Texto livre, pode ser vazio. */
  type: string
  x: number
  y: number
  width: number
  height: number
  /** Até `maxObjectProperties` pares; chaves em `OBJECT_PROPERTY_KEY_PATTERN`. */
  properties: Record<string, TilemapObjectPropertyValue>
}

/** Camada de OBJETOS: não tem peças, só a lista de objetos. */
export interface TilemapObjectLayer {
  kind: 'objects'
  id: string
  name: string
  visible: boolean
  objects: TilemapObject[]
  // Chaves exclusivas da camada de peças: `never` deixa ler `layer.front` na união
  // (dá `undefined` aqui) sem deixar escrever uma camada de objetos com células.
  cells?: never
  front?: never
  tilesetId?: never
}

export type TilemapLayer = TilemapTileLayer | TilemapObjectLayer

export interface TilemapAsset extends PintaAssetBase {
  kind: 'tilemap'
  /**
   * As peças PADRÃO do mapa (um TilesetAsset do MESMO perfil). Camada de peças
   * sem `tilesetId` próprio usa estas; a ponte do Estúdio leva a grade só das
   * camadas que usam estas.
   */
  tilesetId: string
  cols: number
  rows: number
  /** Nasce com 1 camada ("Chão"); peças e objetos dividem o teto de camadas. */
  layers: TilemapLayer[]
}

export function isTileLayer(layer: TilemapLayer): layer is TilemapTileLayer {
  return layer.kind !== 'objects'
}

export function isObjectLayer(layer: TilemapLayer): layer is TilemapObjectLayer {
  return layer.kind === 'objects'
}

/** As camadas de PEÇAS, na ordem do mapa (fundo primeiro). */
export function tileLayersOf(tilemap: TilemapAsset): TilemapTileLayer[] {
  return tilemap.layers.filter(isTileLayer)
}

/** O tileset que uma camada de peças usa (o próprio ou o padrão do mapa). */
export function tileLayerTilesetId(tilemap: TilemapAsset, layer: TilemapTileLayer): string {
  return layer.tilesetId ?? tilemap.tilesetId
}

/** Todos os tilesets que o mapa referencia, sem repetir: o PADRÃO primeiro. */
export function tilemapTilesetIds(tilemap: TilemapAsset): string[] {
  const ids = [tilemap.tilesetId]
  for (const layer of tilemap.layers) {
    if (!isTileLayer(layer)) continue
    const id = tileLayerTilesetId(tilemap, layer)
    if (!ids.includes(id)) ids.push(id)
  }
  return ids
}

/** O mapa usa este tileset (como padrão ou em alguma camada)? */
export function tilemapUsesTileset(tilemap: TilemapAsset, tilesetId: string): boolean {
  return tilemapTilesetIds(tilemap).includes(tilesetId)
}

/**
 * Um tileset pode entrar numa camada de um mapa cujas peças padrão são `base`?
 * Mesmo ESTILO (o mapa é desenhado inteiro em canvas OU em SVG) e mesmo tamanho
 * de peça (a grade é uma só).
 */
export function isCompatibleMapTileset(base: AnyTilesetAsset, candidate: AnyTilesetAsset): boolean {
  return candidate.kind === base.kind && candidate.tileSize === base.tileSize
}

/**
 * O mapa com TODAS as referências a tileset trocadas por `remap` (a padrão e as
 * das camadas) — o import religa um mapa às peças que vieram junto com ids
 * novos. Camada que cai no padrão perde a chave (forma canônica). Mesmo asset
 * quando nada muda.
 */
export function remapTilemapTilesetIds(
  tilemap: TilemapAsset,
  remap: (id: string) => string,
): TilemapAsset {
  const tilesetId = remap(tilemap.tilesetId)
  let changed = tilesetId !== tilemap.tilesetId
  const layers = tilemap.layers.map((layer): TilemapLayer => {
    if (!isTileLayer(layer) || layer.tilesetId === undefined) return layer
    const next = remap(layer.tilesetId)
    if (next === layer.tilesetId && next !== tilesetId) return layer
    changed = true
    const { tilesetId: _previous, ...rest } = layer
    return next === tilesetId ? rest : { ...rest, tilesetId: next }
  })
  return changed ? { ...tilemap, tilesetId, layers } : tilemap
}

/** O mapa tem algo que o envelope v1 do `.pinta.json` não sabe descrever? */
export function tilemapNeedsV2(tilemap: TilemapAsset): boolean {
  return tilemap.layers.some((layer) => isObjectLayer(layer) || layer.tilesetId !== undefined)
}

/**
 * Chave de propriedade de objeto: começa com letra, depois letras, números, `_`
 * ou `-` (o que o código do jogo lê sem aspas: `vida`, `max_pulos`, `porta-2`).
 */
export const OBJECT_PROPERTY_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/

/**
 * O que a criança digitou → chave válida (sem acento, espaço vira `_`), ou
 * `null` quando não sobra nada aproveitável. A UI usa; o sanitize só VALIDA.
 */
export function normalizeObjectPropertyKey(input: string): string | null {
  const key = input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9_-]/g, '')
    .replace(/^[^A-Za-z]+/, '')
    .slice(0, PINTA_LIMITS.maxObjectPropertyKeyChars)
  return key && OBJECT_PROPERTY_KEY_PATTERN.test(key) ? key : null
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

/** Os kinds de pixel com CAMADAS (peças ficaram de fora — ver pixel/layers.ts). */
export type PixelLayeredAsset = PixelSpriteAsset | PixelBackgroundAsset

export function isPixelLayeredKind(asset: PintaAsset): asset is PixelLayeredAsset {
  return asset.kind === 'pixel-sprite' || asset.kind === 'pixel-background'
}

/**
 * Paleta do asset, com default para kinds sem paleta própria (tilemap herda a
 * das peças na prática; vetoriais usam cor livre e só precisam de um valor
 * estável para os caminhos de export que pedem paleta).
 */
export function paletteIdOf(asset: PintaAsset): AssetPaletteId {
  return 'paletteId' in asset ? asset.paletteId : DEFAULT_PALETTE_ID
}

/**
 * A paleta personalizada embutida, quando o asset usa uma (`paletteId ===
 * 'custom'`). Fronteira única: quem quer as CORES usa `resolveAssetPalette`;
 * quem quer o NOME usa `assetPaletteName`.
 */
export function customPaletteOf(asset: PintaAsset): PintaCustomPalette | null {
  if (!('paletteId' in asset) || asset.paletteId !== 'custom') return null
  return asset.customPalette ?? null
}

/** Nome da paleta ativa do asset, para os títulos (PaletteBar e o painel do vetor). */
export function assetPaletteName(asset: PintaAsset): string {
  const custom = customPaletteOf(asset)
  return custom ? custom.name : getPalette(paletteIdOf(asset)).name
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
  // Paleta personalizada EMBUTIDA no asset vence; `getPalette` cai em arcade
  // para qualquer id que não conheça (inclusive um 'custom' órfão — estado que
  // o sanitize não deixa existir).
  const custom = customPaletteOf(asset)
  const base = custom ? custom.colors : getPalette(paletteIdOf(asset)).colors
  const extra = extraColorsOf(asset)
  return extra.length > 0 ? [...base, ...extra] : base
}

/**
 * Quotas do modelo — compartilhadas entre criação, edição e o sanitizer do
 * load (subir uma sobe em todos os pontos, sem re-recorte ao reabrir).
 */

function clampInt(value: number, min: number, max: number): number {
  return clampProjectInt(value, min, max)
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
  // Coage array simples → Uint8Array (registro que veio por JSON/outro realm, em
  // que o structured clone não preservou o typed array) antes de validar.
  const data =
    b.data instanceof Uint8Array
      ? b.data
      : Array.isArray(b.data)
        ? Uint8Array.from(b.data as number[])
        : null
  if (!data || data.length !== b.width * b.height) return null
  return { width: b.width, height: b.height, data }
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
 * A marca de origem válida, ou `undefined` (malformada = omitida, nunca o desenho). A regra é
 * a mesma com que o Estúdio reconhece os nomes dos desenhos de exemplo (`@sistemazero/core`).
 */
export function sanitizeSourceRef(raw: unknown): string | undefined {
  return typeof raw === 'string' && PINTA_SOURCE_REF_PATTERN.test(raw) ? raw : undefined
}

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
    ? [
        ...new Set(
          r.palette
            .filter((c): c is string => typeof c === 'string' && PROJECT_REF_HEX.test(c))
            .map((c) => c.toLowerCase()),
        ),
      ].slice(0, 8)
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

/**
 * Paleta personalizada vinda do disco/import: 16 posições com os SLOTS
 * PRESERVADOS (`''` = vazio; compactar deslocaria os índices pintados no
 * bitmap), `[0]` sempre transparente, hex normalizado. `null` quando não
 * sobra nenhuma cor pintável — aí o asset volta para a arcade SEM a chave.
 */
export function sanitizeCustomPalette(raw: unknown): PintaCustomPalette | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (!Array.isArray(r.colors)) return null
  const colors: string[] = []
  let painted = 0
  for (let i = 0; i < PALETTE_SIZE; i += 1) {
    if (i === TRANSPARENT_INDEX) {
      colors.push('')
      continue
    }
    const hex = typeof r.colors[i] === 'string' ? normalizeHex(r.colors[i] as string) : null
    if (hex) {
      colors.push(hex)
      painted += 1
    } else {
      colors.push('')
    }
  }
  if (painted === 0) return null
  const name =
    typeof r.name === 'string' && r.name.trim()
      ? r.name.trim().slice(0, PINTA_LIMITS.maxNameChars)
      : COPY.a11y.customPaletteName
  return { name, colors }
}

/**
 * O PAR paleta do asset: `'custom'` só vale com uma `customPalette` válida —
 * senão degrada para a arcade SEM a chave (asset antigo continua
 * byte-idêntico no round-trip; a emissão é condicional nos 3 kinds de pixel).
 */
function sanitizeAssetPalette(record: Record<string, unknown>): {
  paletteId: AssetPaletteId
  customPalette?: PintaCustomPalette
} {
  if (record.paletteId === 'custom') {
    const customPalette = sanitizeCustomPalette(record.customPalette)
    if (customPalette) return { paletteId: 'custom', customPalette }
    return { paletteId: DEFAULT_PALETTE_ID }
  }
  return { paletteId: isPaletteId(record.paletteId) ? record.paletteId : DEFAULT_PALETTE_ID }
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
  const sourceRef = sanitizeSourceRef(raw.sourceRef)
  return {
    id: raw.id,
    name,
    ...sanitizeTimestamps(raw),
    ...(projectRef ? { projectRef } : {}),
    ...(sourceRef ? { sourceRef } : {}),
  }
}

/**
 * Um QUADRO de pixel vindo do disco. Aceita os dois formatos:
 * - LEGADO (antes das camadas): um bitmap solto → vira `[bitmap]`;
 * - atual: lista de cels (um por camada).
 * Devolve `null` só quando não sobra nenhum cel válido (o chamador descarta o
 * quadro, como sempre fez).
 */
function sanitizePixelFrame(
  raw: unknown,
  /** Dimensão esperada (sprite/tile). Ausente = livre (cenário: manda o 1º cel). */
  dims?: { width: number; height: number },
): PintaPixelFrame | null {
  const list = Array.isArray(raw) ? raw : [raw]
  const limited = list.slice(0, PINTA_LIMITS.maxPixelLayers)
  const valid = limited.map((cel) => sanitizeBitmap(cel, dims))
  if (!valid.some((cel) => cel !== null)) return null
  const inferred =
    dims ??
    valid.reduce<{ width: number; height: number } | null>((found, bitmap) => {
      if (found) return found
      return bitmap ? { width: bitmap.width, height: bitmap.height } : null
    }, null)
  if (!inferred) return null
  return valid.map((cel) => cel ?? createBitmap(inferred.width, inferred.height))
}

/**
 * Alinha os cels de um quadro ao número de camadas: falta cel → camada vazia;
 * sobra → corta. É o invariante que o resto do motor assume (`cels[i]` é da
 * `layers[i]`).
 */
function alignCels(
  cels: PintaPixelFrame,
  layerCount: number,
  dims: { width: number; height: number },
): PintaPixelFrame {
  if (cels.length === layerCount) return cels
  const out: PintaBitmap[] = []
  for (let i = 0; i < layerCount; i += 1) {
    out.push(cels[i] ?? createBitmap(dims.width, dims.height))
  }
  return out
}

/**
 * Camadas vindas do disco. Ausentes/inválidas (registro anterior às camadas) →
 * derivadas do nº de cels do desenho, com nomes automáticos. NUNCA devolve
 * lista vazia: um asset sem camada some da galeria.
 */
function sanitizePixelLayers(raw: unknown, celCount: number): PintaPixelLayer[] {
  const fallbackCount = Math.min(Math.max(celCount, 1), PINTA_LIMITS.maxPixelLayers)
  if (Array.isArray(raw)) {
    const seen = new Set<string>()
    const layers = raw.slice(0, PINTA_LIMITS.maxPixelLayers).map((layer, index) => {
      if (!layer || typeof layer !== 'object') {
        const fallback = createPixelLayer(index)
        seen.add(fallback.id)
        return fallback
      }
      const l = layer as Record<string, unknown>
      const candidate = typeof l.id === 'string' && l.id && !seen.has(l.id) ? l.id : newId()
      seen.add(candidate)
      const name =
        typeof l.name === 'string' && l.name.trim()
          ? l.name.trim().slice(0, PINTA_LIMITS.maxAnimationNameChars)
          : `${COPY.layers.namePrefix} ${index + 1}`
      return {
        id: candidate,
        name,
        visible: l.visible !== false,
        // Cadeado: `true` emite a chave, lixo/ausente OMITE (round-trip estrito).
        ...(l.locked === true ? { locked: true as const } : {}),
      }
    })
    if (layers.length > 0) return layers
  }
  return Array.from({ length: fallbackCount }, (_, index) => createPixelLayer(index))
}

function ensureUniqueIds<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.map((item) => {
    if (!seen.has(item.id)) {
      seen.add(item.id)
      return item
    }
    let id = newId()
    while (seen.has(id)) id = newId()
    seen.add(id)
    return { ...item, id }
  })
}

function ensureUniqueAnimationIdentity<T extends { id: string; name: string }>(items: T[]): T[] {
  const withIds = ensureUniqueIds(items)
  const names = new Set<string>()
  return withIds.map((item) => {
    const name = uniqueAnimationName(item.name, names)
    names.add(name)
    return name === item.name ? item : { ...item, name }
  })
}

function sanitizeAnimation(
  raw: unknown,
  frame: { width: number; height: number },
): PintaPixelAnimation | null {
  if (!raw || typeof raw !== 'object') return null
  const a = raw as Record<string, unknown>
  if (typeof a.id !== 'string' || !a.id) return null
  const name =
    typeof a.name === 'string' && a.name.trim()
      ? a.name.trim().slice(0, PINTA_LIMITS.maxAnimationNameChars)
      : COPY.a11y.defaultAnimation
  const fps = typeof a.fps === 'number' && Number.isFinite(a.fps) ? clampInt(a.fps, 1, 30) : 8
  const loop = a.loop !== false
  if (!Array.isArray(a.frames)) return null
  const easing = sanitizeEasing(a.easing)
  const frames = a.frames
    .slice(0, PINTA_LIMITS.maxFramesPerAnimation)
    .map((f) => sanitizePixelFrame(f, frame))
    .filter((f): f is PintaPixelFrame => f !== null)
  if (frames.length === 0) return null
  return { id: a.id, name, fps, loop, frames, ...(easing === 'ease' ? { easing } : {}) }
}

/** Um quadro vetorial vindo do disco: shapes válidos sobrevivem, o resto cai. */
function sanitizeVectorFrame(raw: unknown): VectorFrame | null {
  if (!Array.isArray(raw)) return null
  const shapes = raw
    .slice(0, PINTA_LIMITS.maxShapes)
    .map((s) => sanitizeVectorShape(s))
    .filter((s): s is VectorShape => s !== null)
  return sanitizeMaskReferences(ensureUniqueIds(shapes))
}

function sanitizeTilemapCells(raw: unknown, cellCount: number): Int16Array | null {
  const values = raw instanceof Int16Array ? Array.from(raw) : Array.isArray(raw) ? raw : null
  if (!values || values.length !== cellCount) return null
  if (
    !values.every(
      (cell) =>
        typeof cell === 'number' &&
        Number.isInteger(cell) &&
        cell >= -1 &&
        cell < PINTA_LIMITS.maxTiles,
    )
  ) {
    return null
  }
  return Int16Array.from(values)
}

/** Referência a um tileset: qualquer id não vazio (a mesma régua de sempre do mapa). */
function isTilesetRef(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

/** Coordenada/medida de objeto: número finito, arredondado ao pixel e dentro do teto. */
function sanitizeObjectMeasure(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return clampInt(value, 0, PINTA_LIMITS.maxObjectCoord)
}

function sanitizeObjectText(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, PINTA_LIMITS.maxObjectNameChars) : ''
}

/**
 * Propriedades de um objeto: chave fora do padrão, valor de tipo desconhecido,
 * número não finito e o que passa do teto CAEM; texto longo é cortado. Montado
 * por `Object.fromEntries` (propriedade própria, nunca o protótipo).
 */
function sanitizeObjectProperties(raw: unknown): Record<string, TilemapObjectPropertyValue> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const entries: Array<[string, TilemapObjectPropertyValue]> = []
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (entries.length >= PINTA_LIMITS.maxObjectProperties) break
    if (key.length > PINTA_LIMITS.maxObjectPropertyKeyChars) continue
    if (!OBJECT_PROPERTY_KEY_PATTERN.test(key)) continue
    if (typeof value === 'string') {
      entries.push([key, value.slice(0, PINTA_LIMITS.maxObjectPropertyStringChars)])
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      entries.push([key, value])
    } else if (typeof value === 'boolean') {
      entries.push([key, value])
    }
  }
  return Object.fromEntries(entries)
}

/** Os objetos de uma camada: objeto sem id ou com medida inválida é DESCARTADO. */
function sanitizeTilemapObjects(raw: unknown): TilemapObject[] {
  if (!Array.isArray(raw)) return []
  const objects: TilemapObject[] = []
  for (const item of raw.slice(0, PINTA_LIMITS.maxTilemapObjects)) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    if (typeof o.id !== 'string' || !o.id) continue
    const x = sanitizeObjectMeasure(o.x)
    const y = sanitizeObjectMeasure(o.y)
    const width = sanitizeObjectMeasure(o.width)
    const height = sanitizeObjectMeasure(o.height)
    if (x === null || y === null || width === null || height === null) continue
    objects.push({
      id: o.id,
      name: sanitizeObjectText(o.name),
      type: sanitizeObjectText(o.type),
      x,
      y,
      width,
      height,
      properties: sanitizeObjectProperties(o.properties),
    })
  }
  return ensureUniqueIds(objects)
}

function sanitizeVectorAnimation(raw: unknown): PintaVectorAnimation | null {
  if (!raw || typeof raw !== 'object') return null
  const a = raw as Record<string, unknown>
  if (typeof a.id !== 'string' || !a.id) return null
  const name =
    typeof a.name === 'string' && a.name.trim()
      ? a.name.trim().slice(0, PINTA_LIMITS.maxAnimationNameChars)
      : COPY.a11y.defaultAnimation
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
  const palette = sanitizeAssetPalette(record)

  switch (record.kind) {
    case 'pixel-sprite': {
      if (!isFinitePositiveInt(record.frameWidth, PINTA_LIMITS.maxFrameSize)) return null
      if (!isFinitePositiveInt(record.frameHeight, PINTA_LIMITS.maxFrameSize)) return null
      const frame = { width: record.frameWidth, height: record.frameHeight }
      if (!Array.isArray(record.animations)) return null
      const animations = ensureUniqueAnimationIdentity(
        record.animations
          .slice(0, PINTA_LIMITS.maxAnimations)
          .map((a) => sanitizeAnimation(a, frame))
          .filter((a): a is PintaPixelAnimation => a !== null),
      )
      if (animations.length === 0) return null
      // Camadas do sprite: o nº de cels do 1º quadro é a referência do legado
      // (quadro solto → 1 camada). Todo quadro é alinhado a ela.
      const layers = sanitizePixelLayers(record.layers, animations[0]?.frames[0]?.length ?? 1)
      const extraColors = sanitizeExtraColors(record.extraColors)
      return {
        ...base,
        kind: 'pixel-sprite',
        frameWidth: frame.width,
        frameHeight: frame.height,
        paletteId: palette.paletteId,
        ...(palette.customPalette ? { customPalette: palette.customPalette } : {}),
        ...(extraColors ? { extraColors } : {}),
        layers,
        animations: animations.map((animation) => ({
          ...animation,
          frames: animation.frames.map((cels) => alignCels(cels, layers.length, frame)),
        })),
      }
    }
    case 'pixel-background': {
      // Legado (antes das camadas): `bitmap` solto vira o cel da camada única.
      const cels = sanitizePixelFrame(record.cels ?? record.bitmap)
      if (!cels) return null
      const first = cels[0]
      if (!first) return null
      // O 1º cel manda no tamanho do cenário; divergentes caem (e o alignCels
      // repõe uma camada vazia no lugar, preservando a ordem).
      const dims = { width: first.width, height: first.height }
      const layers = sanitizePixelLayers(record.layers, cels.length)
      const extraColors = sanitizeExtraColors(record.extraColors)
      return {
        ...base,
        kind: 'pixel-background',
        paletteId: palette.paletteId,
        ...(palette.customPalette ? { customPalette: palette.customPalette } : {}),
        ...(extraColors ? { extraColors } : {}),
        layers,
        cels: alignCels(cels, layers.length, dims),
      }
    }
    case 'tileset': {
      if (
        typeof record.tileSize !== 'number' ||
        !TILE_SIZES.includes(record.tileSize as (typeof TILE_SIZES)[number])
      ) {
        return null
      }
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
        paletteId: palette.paletteId,
        ...(palette.customPalette ? { customPalette: palette.customPalette } : {}),
        ...(extraColors ? { extraColors } : {}),
        tiles,
        solid,
        platform,
      }
    }
    case 'tilemap': {
      if (!isTilesetRef(record.tilesetId)) return null
      const mapTilesetId = record.tilesetId
      if (!isFinitePositiveInt(record.cols, PINTA_LIMITS.maxTilemapCols)) return null
      if (!isFinitePositiveInt(record.rows, PINTA_LIMITS.maxTilemapRows)) return null
      const cellCount = record.cols * record.rows
      if (!Array.isArray(record.layers)) return null
      const layers = ensureUniqueIds(
        record.layers
          .slice(0, PINTA_LIMITS.maxTilemapLayers)
          .map((layer): TilemapLayer | null => {
            if (!layer || typeof layer !== 'object') return null
            const l = layer as Record<string, unknown>
            if (typeof l.id !== 'string' || !l.id) return null
            const name =
              typeof l.name === 'string' && l.name.trim()
                ? l.name.trim().slice(0, 30)
                : COPY.tiles.layerNamePrefix
            if (l.kind === 'objects') {
              return {
                kind: 'objects',
                id: l.id,
                name,
                visible: l.visible !== false,
                objects: sanitizeTilemapObjects(l.objects),
              }
            }
            // `kind` desconhecido (versão futura): descarta a camada, não o mapa.
            if (l.kind !== undefined && l.kind !== 'tiles') return null
            // Coage array simples → Int16Array (JSON/outro realm) antes de validar.
            const cells = sanitizeTilemapCells(l.cells, cellCount)
            if (!cells) return null
            // Tileset da camada: só quando é OUTRO (o padrão é a ausência — forma
            // canônica, e o mapa antigo continua byte-idêntico).
            const tilesetId =
              isTilesetRef(l.tilesetId) && l.tilesetId !== mapTilesetId ? l.tilesetId : undefined
            return {
              id: l.id,
              name,
              visible: l.visible !== false,
              cells,
              ...(l.front === true ? { front: true } : {}),
              ...(tilesetId ? { tilesetId } : {}),
            }
          })
          .filter((l): l is TilemapLayer => l !== null),
      )
      // Sem NENHUMA camada de peças o mapa não tem o que desenhar (nem o editor
      // tem onde pintar): descarta, como sempre foi com zero camadas.
      if (!layers.some(isTileLayer)) return null
      return {
        ...base,
        kind: 'tilemap',
        tilesetId: mapTilesetId,
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
      const animations = ensureUniqueAnimationIdentity(
        record.animations
          .slice(0, PINTA_LIMITS.maxAnimations)
          .map((a) => sanitizeVectorAnimation(a))
          .filter((a): a is PintaVectorAnimation => a !== null),
      )
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
      if (
        typeof record.tileSize !== 'number' ||
        !VECTOR_TILE_SIZES.includes(record.tileSize as (typeof VECTOR_TILE_SIZES)[number])
      ) {
        return null
      }
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
