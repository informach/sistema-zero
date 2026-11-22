/**
 * Modelo de dados do Pinta: os ASSETS que a criança desenha. Cada asset é um
 * registro independente no IndexedDB (ver src/state/persistence.ts) — não há
 * "projeto" navegável na v1: a galeria é a lista de assets do perfil.
 *
 * Bitmaps são `Uint8Array` de ÍNDICES de paleta (0 = transparente — ver
 * core/palette.ts): 1 byte/pixel, structured-clone nativo no IndexedDB e
 * operações puras testáveis sem canvas.
 */

import {
  PINTA_REGION_LIMITS,
  type PintaRegionCells,
  parsePintaRegionLayers,
} from '@sistemazero/core/creations'
import { PINTA_SOURCE_REF_PATTERN } from '@sistemazero/core/studio/pinta-source-ref'
import { cellTile, isValidCell } from '../tiles/cell'
import { unpackCells } from '../tiles/cellCodec'
import { sanitizeMaskReferences } from '../vector/mask'
import { sanitizeVectorShape, type VectorShape } from '../vector/model'
import { retainedAssetBytes } from './assetMemory'
import { normalizeHex } from './color'
import { COPY } from './copy'
import { newId } from './id'
import { regionDocumentMetadata, sameMapDocumentMetadata } from './mapDocumentBoundary'
import { sanitizeMapResourceVersions } from './mapResourceVersions'
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
  PINTA_COLLISION_SCHEMA,
  PINTA_LIMITS,
  PINTA_MAP_FORMAT_LIMITS,
  PINTA_MAP_SCHEMA,
  PINTA_MAX_SCHEMA,
  PINTA_PRECISE_SCHEMA,
  PINTA_RESOURCE_SCHEMA,
  PINTA_SCENE_SCHEMA,
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
  PINTA_COLLISION_SCHEMA,
  PINTA_LIMITS,
  PINTA_MAP_FORMAT_LIMITS,
  PINTA_MAP_SCHEMA,
  PINTA_MAX_SCHEMA,
  PINTA_PRECISE_SCHEMA,
  PINTA_SCENE_SCHEMA,
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
  'map-set',
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
  if (kind === 'tilemap' || kind === 'map-set') return null
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
    case 'map-set':
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
  schema?: number
  animations?: Record<string, TileAnimationFrame[]>
  terrains?: TileTerrain[]
  tileProperties?: Record<string, Record<string, TilemapObjectPropertyValue>>
}

export interface TileAnimationFrame {
  tile: number
  duration: number
}
/** As oito posições Wang, em sentido horário, começando pela borda de cima. Zero = vazio. */
export interface TileTerrain {
  id: string
  name: string
  mode: 'corner' | 'edge' | 'mixed'
  colors: string[]
  tiles: Record<string, number[]>
}

/** Metadados das peças, compartilhados pelo pixel e pelo vetor. */
export function sanitizeTilesetExtras(
  record: Record<string, unknown>,
  count: number,
): Pick<TilesetAsset, 'schema' | 'animations' | 'terrains' | 'tileProperties'> {
  const out: Pick<TilesetAsset, 'schema' | 'animations' | 'terrains' | 'tileProperties'> = {}
  const validIndex = (key: string): boolean => /^(0|[1-9]\d*)$/.test(key) && Number(key) < count
  if (record.animations && typeof record.animations === 'object') {
    const entries = Object.entries(record.animations)
      .filter(([key]) => validIndex(key))
      .flatMap(([key, raw]) => {
        if (!Array.isArray(raw)) return []
        const frames: TileAnimationFrame[] = raw.slice(0, 64).flatMap((f) => {
          if (
            !f ||
            typeof f !== 'object' ||
            !Number.isInteger(f.tile) ||
            f.tile < 0 ||
            f.tile >= count ||
            typeof f.duration !== 'number' ||
            !Number.isFinite(f.duration)
          )
            return []
          return [{ tile: f.tile, duration: clampInt(f.duration, 16, 60000) }]
        })
        return frames.length ? [[key, frames] as const] : []
      })
    if (entries.length) out.animations = Object.fromEntries(entries)
  }
  if (record.tileProperties && typeof record.tileProperties === 'object') {
    const entries = Object.entries(record.tileProperties)
      .filter(([key]) => validIndex(key))
      .map(([key, value]) => [key, sanitizeObjectProperties(value)] as const)
      .filter(([, value]) => Object.keys(value).length)
    if (entries.length) out.tileProperties = Object.fromEntries(entries)
  }
  if (Array.isArray(record.terrains)) {
    const terrains: TileTerrain[] = record.terrains.slice(0, 16).flatMap((t) => {
      if (
        !t ||
        typeof t !== 'object' ||
        !isTilesetRef(t.id) ||
        !['corner', 'edge', 'mixed'].includes(t.mode) ||
        !Array.isArray(t.colors) ||
        !t.tiles ||
        typeof t.tiles !== 'object'
      )
        return []
      const colors = t.colors
        .slice(0, 15)
        .map((c: unknown) =>
          typeof c === 'string' && /^#[\da-f]{6}$/i.test(c) ? c.toLowerCase() : '#808080',
        )
      const tiles = Object.fromEntries(
        Object.entries(t.tiles).filter(
          ([key, v]) =>
            validIndex(key) &&
            Array.isArray(v) &&
            v.length === 8 &&
            v.every((c) => Number.isInteger(c) && c >= 0 && c <= colors.length),
        ),
      )
      return [
        { id: t.id, name: sanitizeObjectText(t.name), mode: t.mode, colors, tiles } as TileTerrain,
      ]
    })
    if (terrains.length) out.terrains = ensureUniqueIds(terrains)
  }
  // O carimbo acompanha o conteúdo: 4 com animação, terreno ou propriedade de peça; 3 só por
  // passar de 64 peças; ausente no conjunto que cabe no formato antigo.
  const schema = tilesetSchemaFor({ tiles: { length: count }, ...out })
  if (schema !== undefined) out.schema = schema
  return out
}

type TilesetSchemaInput = Pick<TilesetAsset, 'animations' | 'terrains' | 'tileProperties'> & {
  tiles: { length: number }
}

/** O conjunto de peças guarda animação, terreno ou propriedade de peça (cena completa)? */
export function tilesetNeedsV4(tileset: TilesetSchemaInput): boolean {
  return (
    (tileset.animations !== undefined && Object.keys(tileset.animations).length > 0) ||
    (tileset.terrains !== undefined && tileset.terrains.length > 0) ||
    (tileset.tileProperties !== undefined && Object.keys(tileset.tileProperties).length > 0)
  )
}

/** O carimbo que este conjunto de peças precisa levar, ou `undefined` quando não precisa. */
export function tilesetSchemaFor(tileset: TilesetSchemaInput): number | undefined {
  if (tilesetNeedsV4(tileset)) return PINTA_SCENE_SCHEMA
  return tileset.tiles.length > LEGACY_MAP.tiles ? PINTA_MAP_SCHEMA : undefined
}

/**
 * Camada de PEÇAS do mapa (a de sempre). O `kind` é OPCIONAL de propósito: todo
 * mapa salvo antes das camadas de objetos não tem a chave, e o sanitize a OMITE
 * na camada de peças — o registro antigo atravessa o round-trip byte a byte.
 */
/**
 * O que toda camada do mapa pode ter, seja de peças, de objetos ou um grupo. Tudo opcional e
 * OMITIDO no valor padrão: um mapa que não usa nada disto continua byte a byte o de antes.
 * Num grupo, estes valores valem para tudo o que está dentro dele (leia por `effectiveLayer`).
 */
export interface TilemapLayerCommon {
  id: string
  name: string
  visible: boolean
  /** O grupo que contém esta camada (um `TilemapGroupLayer` que vem ANTES na lista). */
  parentId?: string
  /** Trancada: o editor não deixa mudar o conteúdo nem apagar. Ausente = livre. */
  locked?: true
  /** 0 a 1. Ausente = 1 (opaca). */
  opacity?: number
  /** Deslocamento do desenho da camada, em pixels do mapa, inclusive frações. Ausente = 0. */
  offsetX?: number
  offsetY?: number
  /** Quanto a camada acompanha a câmera (1 = junto; 0,5 = metade, parece mais longe). Ausente = 1. */
  parallaxX?: number
  parallaxY?: number
  /** Dados que o jogo lê da camada. Mesmas regras das propriedades de objeto. */
  properties?: Record<string, TilemapObjectPropertyValue>
}

export type TilemapCells = Int16Array | PintaRegionCells

export interface TilemapTileLayer<Cells extends TilemapCells = Int16Array>
  extends TilemapLayerCommon {
  kind?: 'tiles'
  /** Uma célula por posição, linha a linha; -1 = vazia. Leia a peça por `cellTile` (`tiles/cell`). */
  cells: Cells
  /**
   * Camada de COLISÃO: onde há peça, o jogo não deixa passar; ela não é desenhada no jogo.
   * Serve para barreiras que não coincidem com as peças do cenário. Ausente = camada comum.
   */
  collision?: true
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
export type TilemapObjectPropertyValue =
  | string
  | number
  | boolean
  | {
      type: 'int' | 'float' | 'color' | 'object' | 'asset'
      value: string | number
    }

export const MAP_OBJECT_SHAPES = [
  'point',
  'rect',
  'ellipse',
  'polygon',
  'polyline',
  'art',
  'set',
] as const
export type MapObjectShape = (typeof MAP_OBJECT_SHAPES)[number]
export const MAP_OBJECT_ROLES = [
  'start',
  'danger',
  'door',
  'path',
  'trigger',
  'enemy',
  'region',
] as const
export type MapObjectRole = (typeof MAP_OBJECT_ROLES)[number]

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
  shape?: MapObjectShape
  points?: Array<{ x: number; y: number }>
  rotation?: number
  flipX?: true
  flipY?: true
  art?: { assetId: string; tile?: number; animationId?: string }
  setId?: string
  role?: MapObjectRole
  /** The authored outline stops a character; never inferred from free properties or role. */
  collision?: true
}

/** Camada de OBJETOS: não tem peças, só a lista de objetos. */
export interface TilemapObjectLayer extends TilemapLayerCommon {
  kind: 'objects'
  objects: TilemapObject[]
  // Chaves exclusivas da camada de peças: `never` deixa ler `layer.front` na união
  // (dá `undefined` aqui) sem deixar escrever uma camada de objetos com células.
  cells?: never
  front?: never
  tilesetId?: never
}

/**
 * Um GRUPO de camadas (uma região do mapa: "Vila", "Floresta"). Não tem conteúdo próprio; as
 * camadas que estão nele apontam para cá por `parentId` e ficam DEPOIS dele na lista.
 */
export interface TilemapGroupLayer extends TilemapLayerCommon {
  kind: 'group'
  cells?: never
  objects?: never
  front?: never
  tilesetId?: never
  collision?: never
}

export type TilemapLayer<Cells extends TilemapCells = Int16Array> =
  | TilemapTileLayer<Cells>
  | TilemapObjectLayer
  | TilemapGroupLayer

export interface TilemapAsset<Cells extends TilemapCells = Int16Array> extends PintaAssetBase {
  kind: 'tilemap'
  /** Explicit opt-in for existing maps; scene 1/2 games keep their previous tile-grid physics. */
  physics?: 'precise'
  /**
   * As peças PADRÃO do mapa (um TilesetAsset do MESMO perfil). Camada de peças
   * sem `tilesetId` próprio usa estas; a ponte do Estúdio leva a grade só das
   * camadas que usam estas.
   */
  tilesetId: string
  cols: number
  rows: number
  /** Nasce com 1 camada ("Chão"); peças, objetos e grupos dividem o teto de camadas. */
  layers: TilemapLayer<Cells>[]
  /** Versões de arte com ID próprio: editar a biblioteca não altera uma versão guardada. */
  resources?: TilemapResourceVersion[]
  /**
   * Carimbo do formato, gravado só quando o mapa usa algo que o formato anterior não descreve:
   * 3 para o que é de camadas (`tilemapNeedsV3`), 4 para o que é da cena completa
   * (`tilemapNeedsV4`), 5 para offsets fracionários (`tilemapNeedsV5`). Um código que não conhece
   * o número NÃO lê o mapa (devolve `null` sem
   * regravar), em vez de cortar o que não entende.
   */
  schema?: number
}

/** In-memory preparation only; not part of PintaAsset/persistence until all format-8 readers exist. */
export interface RegionTilemapAsset extends TilemapAsset<PintaRegionCells> {
  schema: 8
  origin: { col: number; row: number }
}

/** Um pedaço reutilizável do mapa; uma instância aponta para o id deste desenho. */
export interface MapSetAsset<Cells extends TilemapCells = Int16Array> extends PintaAssetBase {
  kind: 'map-set'
  /**
   * 4, ou 5 se o mapa interno usa offsets fracionários. O tipo aceita número para ler também
   * o 3 que as primeiras versões gravaram.
   */
  schema: number
  map: TilemapAsset<Cells>
}

/** Internal native-8 set; deliberately excluded from the public gallery union. */
export interface RegionMapSetAsset extends MapSetAsset<PintaRegionCells> {
  schema: 8
  map: RegionTilemapAsset
}

export function isTileLayer<Cells extends TilemapCells>(
  layer: TilemapLayer<Cells>,
): layer is TilemapTileLayer<Cells> {
  return layer.kind === undefined || layer.kind === 'tiles'
}

export function isGroupLayer(layer: TilemapLayer<TilemapCells>): layer is TilemapGroupLayer {
  return layer.kind === 'group'
}

/** Os grupos que contêm a camada, do mais próximo ao mais de fora. */
export function layerAncestors(
  tilemap: TilemapAsset<TilemapCells>,
  layer: TilemapLayer<TilemapCells>,
): TilemapGroupLayer[] {
  const out: TilemapGroupLayer[] = []
  let parentId = layer.parentId
  // O sanitizador garante que não há ciclo; o teto é só o cinto.
  while (parentId !== undefined && out.length < 16) {
    const parent = tilemap.layers.find((candidate) => candidate.id === parentId)
    if (!parent || !isGroupLayer(parent)) break
    out.push(parent)
    parentId = parent.parentId
  }
  return out
}

/** Como a camada vale DE VERDADE, somando o que os grupos em volta dela impõem. */
export interface EffectiveLayer {
  visible: boolean
  locked: boolean
  opacity: number
  offsetX: number
  offsetY: number
  parallaxX: number
  parallaxY: number
}

export function effectiveLayer(
  tilemap: TilemapAsset<TilemapCells>,
  layer: TilemapLayer<TilemapCells>,
): EffectiveLayer {
  const out: EffectiveLayer = {
    visible: layer.visible,
    locked: layer.locked === true,
    opacity: layer.opacity ?? 1,
    offsetX: layer.offsetX ?? 0,
    offsetY: layer.offsetY ?? 0,
    parallaxX: layer.parallaxX ?? 1,
    parallaxY: layer.parallaxY ?? 1,
  }
  for (const group of layerAncestors(tilemap, layer)) {
    out.visible = out.visible && group.visible
    out.locked = out.locked || group.locked === true
    out.opacity *= group.opacity ?? 1
    out.offsetX += group.offsetX ?? 0
    out.offsetY += group.offsetY ?? 0
    out.parallaxX *= group.parallaxX ?? 1
    out.parallaxY *= group.parallaxY ?? 1
  }
  return out
}

/** A camada aparece? (ela e todos os grupos em volta estão visíveis). */
export function isLayerShown(
  tilemap: TilemapAsset<TilemapCells>,
  layer: TilemapLayer<TilemapCells>,
): boolean {
  if (!layer.visible) return false
  return layer.parentId === undefined || effectiveLayer(tilemap, layer).visible
}

export function isObjectLayer(layer: TilemapLayer<TilemapCells>): layer is TilemapObjectLayer {
  return layer.kind === 'objects'
}

/** As camadas de PEÇAS, na ordem do mapa (fundo primeiro). */
export function tileLayersOf<Cells extends TilemapCells>(
  tilemap: TilemapAsset<Cells>,
): TilemapTileLayer<Cells>[] {
  return tilemap.layers.filter(isTileLayer)
}

/** O tileset que uma camada de peças usa (o próprio ou o padrão do mapa). */
export function tileLayerTilesetId(
  tilemap: Pick<TilemapAsset, 'tilesetId'>,
  layer: Pick<TilemapTileLayer, 'tilesetId'>,
): string {
  return layer.tilesetId ?? tilemap.tilesetId
}

/** Todos os tilesets que o mapa referencia, sem repetir: o PADRÃO primeiro. */
export function tilemapTilesetIds(tilemap: TilemapAsset<TilemapCells>): string[] {
  const ids = [tilemap.tilesetId]
  for (const layer of tilemap.layers) {
    if (!isTileLayer(layer)) continue
    const id = tileLayerTilesetId(tilemap, layer)
    if (!ids.includes(id)) ids.push(id)
  }
  return ids
}

/** O mapa usa este tileset (como padrão ou em alguma camada)? */
export function tilemapUsesTileset(
  tilemap: TilemapAsset<TilemapCells>,
  tilesetId: string,
): boolean {
  return (
    tilemapTilesetIds(tilemap).includes(tilesetId) ||
    tilemap.layers.some(
      (l) => isObjectLayer(l) && l.objects.some((o) => o.art?.assetId === tilesetId),
    )
  )
}

/** Orçamento da captura portátil já usado pelo adaptador de imagens; nunca corta um pacote. */
export const PINTA_DEPENDENCY_ASSET_LIMIT = 225

/** One map view for direct documents and reusable definitions, independent of storage. */
export function tilemapOfAsset(
  asset: PintaAsset | RegionTilemapAsset | RegionMapSetAsset,
): TilemapAsset | RegionTilemapAsset | null {
  return asset.kind === 'tilemap' ? asset : asset.kind === 'map-set' ? asset.map : null
}

export type PintaAssetReferenceRole = 'default-sheet' | 'layer-sheet' | 'art' | 'set' | 'property'

type ReferenceAsset = PintaAsset | RegionTilemapAsset | RegionMapSetAsset
type ReferenceVisitor = (id: string, role: PintaAssetReferenceRole) => void

/** Dependências diretas visuais e tipadas. A travessia e a transação pertencem ao adaptador. */
function visitPintaAssetReferences(asset: ReferenceAsset, visit: ReferenceVisitor): void {
  const add: ReferenceVisitor = (id, role) => {
    if (id !== asset.id) visit(id, role)
  }
  const addProperties = (properties: Record<string, TilemapObjectPropertyValue> | undefined) => {
    for (const value of Object.values(properties ?? {})) {
      if (typeof value === 'object' && value.type === 'asset' && typeof value.value === 'string')
        add(value.value, 'property')
    }
  }
  const map = tilemapOfAsset(asset)
  if (map) {
    add(map.tilesetId, 'default-sheet')
    for (const layer of map.layers) {
      if (isTileLayer(layer) && layer.tilesetId !== undefined) add(layer.tilesetId, 'layer-sheet')
    }
    for (const layer of map.layers) {
      addProperties(layer.properties)
      if (isObjectLayer(layer))
        for (const object of layer.objects) {
          if (object.art) add(object.art.assetId, 'art')
          if (object.setId) add(object.setId, 'set')
          addProperties(object.properties)
        }
    }
  }
  if (isTilesetKind(asset))
    for (const properties of Object.values(asset.tileProperties ?? {})) addProperties(properties)
}

export function pintaAssetReferenceIds(asset: ReferenceAsset): string[] {
  const ids = new Set<string>()
  visitPintaAssetReferences(asset, (id) => ids.add(id))
  return [...ids]
}

/** Dependências externas: versões autocontidas não exigem um registro mutável na galeria. */
export function visitPintaAssetDependencies(asset: ReferenceAsset, visit: ReferenceVisitor): void {
  const versions = tilemapOfAsset(asset)?.resources ?? []
  const privateIds = new Set(versions.map((version) => version.asset.id))
  const external: ReferenceVisitor = (id, role) => {
    if (id !== asset.id && !privateIds.has(id)) visit(id, role)
  }
  visitPintaAssetReferences(asset, external)
  for (const version of versions) visitPintaAssetReferences(version.asset, external)
}

export function pintaAssetDependencyIds(asset: ReferenceAsset): string[] {
  const ids = new Set<string>()
  visitPintaAssetDependencies(asset, (id) => ids.add(id))
  return [...ids]
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
 * novos. No legado, camada que cai no padrão perde a chave (forma canônica). Mesmo asset
 * quando nada muda.
 */
export function remapTilemapTilesetIds<Map extends TilemapAsset<TilemapCells>>(
  tilemap: Map,
  remap: (id: string) => string,
): Map {
  const tilesetId = remap(tilemap.tilesetId)
  // Explicit binding remains authorial data in native 8; legacy canonicalization is unchanged.
  const preserveExplicit = 'origin' in tilemap
  let changed = tilesetId !== tilemap.tilesetId
  const layers = tilemap.layers.map((layer) => {
    if (!isTileLayer(layer) || layer.tilesetId === undefined) return layer
    const next = remap(layer.tilesetId)
    if (next === layer.tilesetId && (preserveExplicit || next !== tilesetId)) return layer
    changed = true
    const { tilesetId: _previous, ...rest } = layer
    return next === tilesetId && !preserveExplicit ? rest : { ...rest, tilesetId: next }
  }) as Map['layers']
  return changed ? { ...tilemap, tilesetId, layers } : tilemap
}

/** O mapa tem algo que o envelope v1 do `.pinta.json` não sabe descrever? */
export function tilemapNeedsV2(tilemap: TilemapAsset): boolean {
  return tilemap.layers.some((layer) => isObjectLayer(layer) || layer.tilesetId !== undefined)
}

/** Os tetos do mapa de ANTES do formato 3: o que um código antigo sabe ler sem cortar. */
const LEGACY_MAP = { cols: 128, rows: 128, layers: 8, tiles: 64 } as const

/**
 * O mapa usa algo que o formato de antes das camadas não descreve (formato 3 ou superior)? É a
 * pergunta de quem decide entre o caminho antigo e o da cena (desenho, entrega ao Estúdio). Um
 * mapa que cabe no formato anterior continua saindo exatamente como antes. Para saber QUAL
 * carimbo o mapa leva, use `tilemapSchemaFor`.
 */
export function tilemapNeedsV3(tilemap: TilemapAsset): boolean {
  return tilemapNeedsLayersFormat(tilemap) || tilemapNeedsV4(tilemap)
}

/**
 * O mapa usa algo da cena completa (formato 4 ou superior)? Hoje são os objetos: forma,
 * giro, espelho, papel, arte, instância de conjunto e propriedade tipada de objeto ou camada.
 * Para o número exato, use `tilemapSchemaFor`: o leitor completo de 4 arredondava frações.
 */
export function tilemapNeedsV4(tilemap: TilemapAsset): boolean {
  return (
    tilemapNeedsV5(tilemap) ||
    tilemap.layers.some(
      (layer) =>
        Object.values(layer.properties ?? {}).some((value) => typeof value === 'object') ||
        (isObjectLayer(layer) && layer.objects.some(objectNeedsV4)),
    )
  )
}

/** Frações de pixel precisam recusar também o leitor completo publicado com schema 4. */
export function tilemapNeedsV5(tilemap: TilemapAsset): boolean {
  if (tilemapNeedsV6(tilemap)) return true
  const fractional = (value: number | undefined) =>
    value !== undefined && Number.isFinite(value) && !Number.isInteger(value)
  return tilemap.layers.some((layer) => fractional(layer.offsetX) || fractional(layer.offsetY))
}

export function tilemapNeedsV6(tilemap: TilemapAsset): boolean {
  return (
    tilemapNeedsV7(tilemap) ||
    !!tilemap.resources?.length ||
    tilemap.layers.some(
      (layer) =>
        isObjectLayer(layer) &&
        layer.objects.some((object) => object.art?.animationId !== undefined),
    )
  )
}

export function tilemapNeedsV7(
  tilemap: Pick<TilemapAsset<TilemapCells>, 'physics' | 'layers'>,
): boolean {
  return (
    tilemap.physics === 'precise' ||
    tilemap.layers.some(
      (layer) => isObjectLayer(layer) && layer.objects.some((object) => object.collision === true),
    )
  )
}

/** O carimbo que este mapa precisa levar, ou `undefined` quando cabe no formato antigo. */
export function tilemapSchemaFor(tilemap: TilemapAsset): number | undefined {
  if (tilemapNeedsV7(tilemap)) return PINTA_COLLISION_SCHEMA
  if (tilemapNeedsV6(tilemap)) return PINTA_RESOURCE_SCHEMA
  if (tilemapNeedsV5(tilemap)) return PINTA_PRECISE_SCHEMA
  if (tilemapNeedsV4(tilemap)) return PINTA_SCENE_SCHEMA
  return tilemapNeedsLayersFormat(tilemap) ? PINTA_MAP_SCHEMA : undefined
}

/** O conjunto externo também protege o formato do seu documento interno. */
export function mapSetSchemaFor(map: TilemapAsset): number {
  return Math.max(PINTA_SCENE_SCHEMA, tilemapSchemaFor(map) ?? 0)
}

/**
 * O carimbo que o desenho PRECISA, calculado pelo conteúdo e não pela chave `schema` (que pode
 * estar velha em memória). Zero = não precisa de carimbo. É o que a sincronia com a nuvem
 * compara para perceber um registro que perdeu recursos.
 */
export function pintaAssetSchema(asset: PintaAsset): number {
  if (asset.kind === 'map-set') return mapSetSchemaFor(asset.map)
  if (asset.kind === 'tilemap') return tilemapSchemaFor(asset) ?? 0
  if (asset.kind === 'tileset' || asset.kind === 'vector-tileset')
    return tilesetSchemaFor(asset) ?? 0
  return 0
}

/**
 * O desenho com o carimbo `schema` certo para o conteúdo: entra quando precisa, some quando deixa
 * de precisar. Mesmo desenho (mesma referência) quando já está certo. Toda GRAVAÇÃO passa por
 * aqui (`state/persistence`, `assets/wire`): o editor mexe no mapa em memória sem recalcular o
 * carimbo, e é o carimbo no disco que faz um código mais antigo recusar o registro.
 */
export function withPintaSchemaStamp<T extends PintaAsset>(asset: T): T {
  if (asset.kind === 'map-set') {
    const map = withPintaSchemaStamp(asset.map)
    const schema = mapSetSchemaFor(map)
    if (map === asset.map && asset.schema === schema) return asset
    return { ...asset, schema, map }
  }
  if (asset.kind !== 'tilemap' && asset.kind !== 'tileset' && asset.kind !== 'vector-tileset')
    return asset
  const needed = pintaAssetSchema(asset)
  if ((asset.schema ?? 0) === needed) return asset
  const { schema: _stale, ...rest } = asset
  return (needed ? { ...rest, schema: needed } : rest) as T
}

/** O mapa usa algo do formato de camadas (3)? Não olha os objetos: isso é do formato 4. */
function tilemapNeedsLayersFormat(tilemap: TilemapAsset): boolean {
  if (tilemap.cols > LEGACY_MAP.cols || tilemap.rows > LEGACY_MAP.rows) return true
  if (tilemap.layers.length > LEGACY_MAP.layers) return true
  return tilemap.layers.some((layer) => {
    if (isGroupLayer(layer)) return true
    if (
      layer.parentId !== undefined ||
      layer.locked !== undefined ||
      layer.opacity !== undefined ||
      layer.offsetX !== undefined ||
      layer.offsetY !== undefined ||
      layer.parallaxX !== undefined ||
      layer.parallaxY !== undefined ||
      layer.properties !== undefined
    )
      return true
    if (!isTileLayer(layer)) return false
    if (layer.collision !== undefined) return true
    // Peça acima do teto antigo ou virada: o código antigo descartaria a camada inteira.
    for (let i = 0; i < layer.cells.length; i += 1)
      if ((layer.cells[i] ?? -1) >= LEGACY_MAP.tiles) return true
    return false
  })
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
  schema?: number
  animations?: Record<string, TileAnimationFrame[]>
  terrains?: TileTerrain[]
  tileProperties?: Record<string, Record<string, TilemapObjectPropertyValue>>
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
  | MapSetAsset

/** Os dois estilos de tileset — o tilemap referencia qualquer um. */
export type AnyTilesetAsset = TilesetAsset | VectorTilesetAsset

export type VersionablePintaAsset = Exclude<PintaAsset, TilemapAsset | MapSetAsset>
export interface TilemapResourceVersion {
  sourceId: string
  capturedAt: number
  asset: VersionablePintaAsset
}

export function isTilesetKind(
  asset: PintaAsset | RegionTilemapAsset | RegionMapSetAsset,
): asset is AnyTilesetAsset {
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
  // A célula guarda a peça e os bits de giro (`tiles/cell`): vale o que cabe nos bits e aponta
  // para uma peça dentro do teto do formato.
  if (
    !values.every((cell) => isValidCell(cell) && cellTile(cell) < PINTA_MAP_FORMAT_LIMITS.maxTiles)
  )
    return null
  return Int16Array.from(values)
}

/** Número finito dentro da faixa, ou `undefined`. */
function numberIn(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return Math.min(max, Math.max(min, value))
}

/**
 * Os campos comuns de uma camada. Cada um só entra quando difere do padrão; o `parentId` é
 * conferido depois, com a lista inteira (`sanitizeLayerTree`).
 */
function sanitizeLayerCommon(
  l: Record<string, unknown>,
  regions = false,
): Omit<TilemapLayerCommon, 'id' | 'name' | 'visible'> {
  const opacity = numberIn(l.opacity, 0, 1)
  const offset = regions ? REGION_PIXEL_LIMIT : PINTA_MAP_FORMAT_LIMITS.maxLayerOffset
  const offsetX = numberIn(l.offsetX, -offset, offset)
  const offsetY = numberIn(l.offsetY, -offset, offset)
  const parallaxX = numberIn(l.parallaxX, 0, PINTA_MAP_FORMAT_LIMITS.maxLayerParallax)
  const parallaxY = numberIn(l.parallaxY, 0, PINTA_MAP_FORMAT_LIMITS.maxLayerParallax)
  const properties = sanitizeObjectProperties(l.properties)
  return {
    ...(typeof l.parentId === 'string' && l.parentId ? { parentId: l.parentId } : {}),
    ...(l.locked === true ? { locked: true as const } : {}),
    ...(opacity !== undefined && (regions || opacity !== 1) ? { opacity } : {}),
    ...(offsetX !== undefined && (regions || offsetX !== 0) ? { offsetX } : {}),
    ...(offsetY !== undefined && (regions || offsetY !== 0) ? { offsetY } : {}),
    ...(parallaxX !== undefined && (regions || parallaxX !== 1) ? { parallaxX } : {}),
    ...(parallaxY !== undefined && (regions || parallaxY !== 1) ? { parallaxY } : {}),
    ...(Object.keys(properties).length > 0 || (regions && l.properties !== undefined)
      ? { properties }
      : {}),
  }
}

/** Metadata only: header edits never enumerate object or cell payloads. */
export function tilemapLayerHeader(layer: TilemapLayerCommon): TilemapLayerCommon {
  return {
    id: layer.id,
    name: layer.name,
    visible: layer.visible,
    ...(layer.parentId !== undefined ? { parentId: layer.parentId } : {}),
    ...(layer.locked !== undefined ? { locked: layer.locked } : {}),
    ...(layer.opacity !== undefined ? { opacity: layer.opacity } : {}),
    ...(layer.offsetX !== undefined ? { offsetX: layer.offsetX } : {}),
    ...(layer.offsetY !== undefined ? { offsetY: layer.offsetY } : {}),
    ...(layer.parallaxX !== undefined ? { parallaxX: layer.parallaxX } : {}),
    ...(layer.parallaxY !== undefined ? { parallaxY: layer.parallaxY } : {}),
    ...(layer.properties !== undefined ? { properties: layer.properties } : {}),
  }
}

/** Same policy as the native-8 reader, with atomic refusal of lossy normalization. */
export function sanitizeRegionLayerHeader(raw: unknown): TilemapLayerCommon | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const record = raw as Record<string, unknown>
  if (
    typeof record.id !== 'string' ||
    !record.id ||
    typeof record.name !== 'string' ||
    typeof record.visible !== 'boolean'
  )
    return null
  const header = {
    id: record.id,
    name: record.name.trim().slice(0, 30),
    visible: record.visible,
    ...sanitizeLayerCommon(record, true),
  }
  return header.name && sameMapDocumentMetadata(record, header) ? header : null
}

/**
 * Confere a árvore de grupos: o pai precisa existir, ser um grupo, vir ANTES na lista e não
 * passar da profundidade. Camada com pai inválido sai do grupo (vai para a raiz); nunca some.
 */
function sanitizeLayerTree<Cells extends TilemapCells>(
  layers: TilemapLayer<Cells>[],
): TilemapLayer<Cells>[] {
  const depthById = new Map<string, number>()
  return layers.map((layer) => {
    let next = layer
    let depth = 0
    if (layer.parentId !== undefined) {
      const parentDepth = depthById.get(layer.parentId)
      if (parentDepth === undefined || parentDepth + 1 > PINTA_MAP_FORMAT_LIMITS.maxGroupDepth) {
        const { parentId: _orphan, ...rest } = layer
        next = rest as TilemapLayer<Cells>
      } else depth = parentDepth + 1
    }
    // Só grupo já visto pode ser pai: é o que impede ciclo e pai que vem depois.
    if (isGroupLayer(next)) depthById.set(next.id, depth)
    return next
  })
}

/** Referência a um tileset: qualquer id não vazio (a mesma régua de sempre do mapa). */
function isTilesetRef(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

/** Coordenada/medida de objeto: número finito, arredondado ao pixel e dentro do teto. */
function sanitizeObjectMeasure(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return clampInt(value, 0, PINTA_MAP_FORMAT_LIMITS.maxObjectCoord)
}

function sanitizeObjectText(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, PINTA_LIMITS.maxObjectNameChars) : ''
}

/**
 * Propriedades de um objeto: chave fora do padrão, valor de tipo desconhecido,
 * número não finito e o que passa do teto CAEM; texto longo é cortado. Montado
 * por `Object.fromEntries` (propriedade própria, nunca o protótipo).
 */
export function sanitizeObjectProperties(raw: unknown): Record<string, TilemapObjectPropertyValue> {
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
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      const v = value as Record<string, unknown>
      if (
        (v.type === 'int' || v.type === 'float') &&
        typeof v.value === 'number' &&
        Number.isFinite(v.value)
      )
        entries.push([
          key,
          { type: v.type, value: v.type === 'int' ? Math.round(v.value) : v.value },
        ])
      else if (
        v.type === 'color' &&
        typeof v.value === 'string' &&
        /^#[\da-f]{6}([\da-f]{2})?$/i.test(v.value)
      )
        entries.push([key, { type: v.type, value: v.value.toLowerCase() }])
      else if (
        (v.type === 'object' || v.type === 'asset') &&
        typeof v.value === 'string' &&
        v.value.length > 0 &&
        v.value.length <= 200
      )
        entries.push([key, { type: v.type, value: v.value }])
    }
  }
  return Object.fromEntries(entries)
}

/**
 * O objeto usa algo além do ponto e do retângulo de sempre? Qualquer destas chaves pede o
 * formato 4: o código que só conhece camadas reconstruiria o objeto sem elas.
 */
export function objectNeedsV4(o: TilemapObject): boolean {
  return (
    o.collision === true ||
    o.shape !== undefined ||
    o.rotation !== undefined ||
    o.flipX === true ||
    o.flipY === true ||
    o.role !== undefined ||
    o.art !== undefined ||
    o.setId !== undefined ||
    Object.values(o.properties).some((v) => typeof v === 'object')
  )
}

export function sanitizeObjectExtras(o: Record<string, unknown>): Partial<TilemapObject> {
  return sanitizeObjectExtrasFor(o, false)
}

const REGION_PIXEL_LIMIT = PINTA_REGION_LIMITS.maxCoordinateExclusive * Math.max(...TILE_SIZES)

function sanitizeObjectExtrasFor(
  o: Record<string, unknown>,
  regions: boolean,
): Partial<TilemapObject> {
  const out: Partial<TilemapObject> = {}
  if (o.collision === true) out.collision = true
  if (typeof o.shape === 'string' && (MAP_OBJECT_SHAPES as readonly string[]).includes(o.shape))
    out.shape = o.shape as MapObjectShape
  if (out.shape === 'polygon' || out.shape === 'polyline') {
    if (Array.isArray(o.points))
      out.points = o.points.slice(0, 256).flatMap((p) => {
        if (
          !p ||
          typeof p !== 'object' ||
          typeof p.x !== 'number' ||
          typeof p.y !== 'number' ||
          !Number.isFinite(p.x) ||
          !Number.isFinite(p.y)
        )
          return []
        const max = regions ? REGION_PIXEL_LIMIT : PINTA_MAP_FORMAT_LIMITS.maxObjectCoord
        return [{ x: Math.max(-max, Math.min(max, p.x)), y: Math.max(-max, Math.min(max, p.y)) }]
      })
  }
  if (typeof o.rotation === 'number' && Number.isFinite(o.rotation)) {
    if (regions) {
      if (o.rotation >= 0 && o.rotation < 360) out.rotation = o.rotation
    } else {
      const angle = ((o.rotation % 360) + 360) % 360
      if (angle) out.rotation = angle
    }
  }
  if (o.flipX === true) out.flipX = true
  if (o.flipY === true) out.flipY = true
  if (typeof o.role === 'string' && (MAP_OBJECT_ROLES as readonly string[]).includes(o.role))
    out.role = o.role as MapObjectRole
  if (o.art && typeof o.art === 'object') {
    const a = o.art as Record<string, unknown>
    if (isTilesetRef(a.assetId))
      out.art = {
        assetId: a.assetId,
        ...(isTilesetRef(a.animationId) ? { animationId: a.animationId } : {}),
        ...(typeof a.tile === 'number' &&
        Number.isInteger(a.tile) &&
        a.tile >= 0 &&
        a.tile < PINTA_MAP_FORMAT_LIMITS.maxTiles
          ? { tile: a.tile }
          : {}),
      }
  }
  if (isTilesetRef(o.setId)) out.setId = o.setId
  return out
}

/** Os objetos de uma camada: objeto sem id ou com medida inválida é DESCARTADO. */
export function sanitizeTilemapObjects(raw: unknown): TilemapObject[] {
  return sanitizeTilemapObjectsFor(raw, false)
}

/** Strict authoring admission for one native-8 object; never repairs authored geometry. */
export function sanitizeRegionMapObject(raw: unknown): TilemapObject | null {
  const object = sanitizeTilemapObjectsFor([raw], true)[0]
  return object && sameMapDocumentMetadata(raw, object) ? object : null
}

function sanitizeTilemapObjectsFor(raw: unknown, regions: boolean): TilemapObject[] {
  if (!Array.isArray(raw)) return []
  const objects: TilemapObject[] = []
  for (const item of raw.slice(0, PINTA_LIMITS.maxTilemapObjects)) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    if (typeof o.id !== 'string' || !o.id) continue
    const x = regions
      ? (numberIn(o.x, -REGION_PIXEL_LIMIT, REGION_PIXEL_LIMIT) ?? null)
      : sanitizeObjectMeasure(o.x)
    const y = regions
      ? (numberIn(o.y, -REGION_PIXEL_LIMIT, REGION_PIXEL_LIMIT) ?? null)
      : sanitizeObjectMeasure(o.y)
    const width = regions
      ? (numberIn(o.width, 0, REGION_PIXEL_LIMIT) ?? null)
      : sanitizeObjectMeasure(o.width)
    const height = regions
      ? (numberIn(o.height, 0, REGION_PIXEL_LIMIT) ?? null)
      : sanitizeObjectMeasure(o.height)
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
      ...sanitizeObjectExtrasFor(o, regions),
    })
  }
  return ensureUniqueIds(objects)
}

/** Internal native-8 reader. Public persistence stays on formats 0–7 until all consumers exist. */
function prepareRegionTilemapMetadata(
  raw: unknown,
): { map: RegionTilemapAsset; rawCells: unknown[] } | null {
  try {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
    const record = raw as Record<string, unknown>
    if (record.kind !== 'tilemap' || record.schema !== 8 || !isTilesetRef(record.tilesetId))
      return null
    const base = sanitizeBase(record)
    // Native 8 validates names without renaming an already authored document.
    if (
      base &&
      typeof record.name === 'string' &&
      record.name.trim() &&
      record.name.length <= PINTA_LIMITS.maxNameChars
    )
      base.name = record.name
    if (
      !base ||
      !record.origin ||
      typeof record.origin !== 'object' ||
      Array.isArray(record.origin)
    )
      return null
    const origin = record.origin as Record<string, unknown>
    if (
      typeof origin.col !== 'number' ||
      typeof origin.row !== 'number' ||
      typeof record.cols !== 'number' ||
      typeof record.rows !== 'number'
    )
      return null
    if (!Array.isArray(record.layers) || record.layers.length > PINTA_REGION_LIMITS.maxLayers)
      return null
    const resources = sanitizeMapResourceVersions(
      record.resources,
      sanitizePintaAsset,
      retainedAssetBytes,
    )
    if (!resources || resources.some((version) => version.asset.id === base.id)) return null
    const layers: TilemapLayer<PintaRegionCells>[] = []
    const rawCells: unknown[] = []
    const layerIds = new Set<string>(),
      objectIds = new Set<string>()
    for (const item of record.layers) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null
      const l = item as Record<string, unknown>
      if (typeof l.id !== 'string' || !l.id || layerIds.has(l.id)) return null
      layerIds.add(l.id)
      const {
        kind: _kind,
        cells: _cells,
        objects: _objects,
        front: _front,
        tilesetId: _tilesetId,
        collision: _collision,
        ...headerFields
      } = l
      const header = sanitizeRegionLayerHeader(headerFields)
      if (!header) return null
      if (l.kind === 'objects') {
        const objects = sanitizeTilemapObjectsFor(l.objects, true)
        for (const object of objects) {
          if (objectIds.has(object.id)) return null
          objectIds.add(object.id)
        }
        layers.push({ kind: 'objects', ...header, objects })
      } else if (l.kind === 'group') {
        layers.push({ kind: 'group', ...header })
      } else if (l.kind === undefined || l.kind === 'tiles') {
        rawCells.push(l.cells)
        layers.push({
          ...header,
          ...(l.kind === 'tiles' ? { kind: 'tiles' as const } : {}),
          cells: { kind: 'regions', version: 1, side: 32, chunks: [] },
          ...(typeof l.front === 'boolean' ? { front: l.front } : {}),
          ...(isTilesetRef(l.tilesetId) ? { tilesetId: l.tilesetId } : {}),
          ...(l.collision === true ? { collision: true as const } : {}),
        })
      } else return null
    }
    if (!rawCells.length) return null
    const map: RegionTilemapAsset = {
      ...base,
      kind: 'tilemap',
      schema: 8,
      tilesetId: record.tilesetId,
      origin: { col: origin.col, row: origin.row },
      cols: record.cols,
      rows: record.rows,
      ...(record.physics === 'precise' ? { physics: 'precise' as const } : {}),
      layers: sanitizeLayerTree(layers),
      ...(record.resources !== undefined ? { resources } : {}),
    }
    return { map, rawCells }
  } catch {
    return null
  }
}

function decodePreparedRegionMap(prepared: {
  map: RegionTilemapAsset
  rawCells: unknown[]
}): RegionTilemapAsset | null {
  try {
    const { map, rawCells } = prepared
    const grids = parsePintaRegionLayers(rawCells, {
      ...map.origin,
      cols: map.cols,
      rows: map.rows,
    })
    if (!grids) return null
    let index = 0
    for (const layer of map.layers) {
      if (!isTileLayer(layer)) continue
      const cells = grids[index++]!
      for (const chunk of cells.chunks)
        for (const cell of chunk.cells)
          if (cellTile(cell) >= PINTA_MAP_FORMAT_LIMITS.maxTiles) return null
      layer.cells = cells
    }
    return map
  } catch {
    return null
  }
}

/** Compare the entire document before allocating any decoded cell chunks. */
export function sanitizeRegionTilemapAsset(raw: unknown): RegionTilemapAsset | null {
  const prepared = prepareRegionTilemapMetadata(raw)
  if (!prepared) return null
  const original = regionDocumentMetadata(raw),
    validated = regionDocumentMetadata(prepared.map)
  if (!original || !validated || !sameMapDocumentMetadata(original, validated)) return null
  return decodePreparedRegionMap(prepared)
}

/** A region template keeps the same strict map contract and cannot contain live nested sets. */
export function sanitizeRegionMapSetAsset(raw: unknown): RegionMapSetAsset | null {
  try {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
    const record = raw as Record<string, unknown>
    if (record.kind !== 'map-set' || record.schema !== 8) return null
    const base = sanitizeBase(record)
    if (!base) return null
    if (
      typeof record.name === 'string' &&
      record.name.trim() &&
      record.name.length <= PINTA_LIMITS.maxNameChars
    )
      base.name = record.name
    const prepared = prepareRegionTilemapMetadata(record.map)
    if (
      !prepared ||
      prepared.map.layers.some(
        (l) => isObjectLayer(l) && l.objects.some((o) => o.setId || o.shape === 'set'),
      )
    )
      return null
    const candidate: RegionMapSetAsset = { ...base, kind: 'map-set', schema: 8, map: prepared.map }
    const original = regionDocumentMetadata(record),
      validated = regionDocumentMetadata(candidate)
    if (!original || !validated || !sameMapDocumentMetadata(original, validated)) return null
    const map = decodePreparedRegionMap(prepared)
    return map ? { ...candidate, map } : null
  } catch {
    return null
  }
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
        record.schema !== undefined &&
        (!Number.isInteger(record.schema) || Number(record.schema) > PINTA_MAX_SCHEMA)
      )
        return null
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
        .slice(0, PINTA_MAP_FORMAT_LIMITS.maxTiles)
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
        ...sanitizeTilesetExtras(record, tiles.length),
      }
    }
    case 'tilemap': {
      if (!isTilesetRef(record.tilesetId)) return null
      const mapTilesetId = record.tilesetId
      // Formato mais novo que este código: não lê. Ler seria reconstruir o mapa sem o que não
      // conhecemos; quem chama recebe `null` e o registro guardado fica como está.
      if (record.schema !== undefined) {
        if (typeof record.schema !== 'number' || record.schema > PINTA_MAX_SCHEMA) return null
      }
      if (!isFinitePositiveInt(record.cols, PINTA_MAP_FORMAT_LIMITS.maxCols)) return null
      if (!isFinitePositiveInt(record.rows, PINTA_MAP_FORMAT_LIMITS.maxRows)) return null
      const cellCount = record.cols * record.rows
      const resources = sanitizeMapResourceVersions(record.resources, sanitizePintaAsset)
      if (!resources) return null
      if (resources.some((version) => version.asset.id === base.id)) return null
      if (!Array.isArray(record.layers)) return null
      const layers = ensureUniqueIds(
        record.layers
          .slice(0, PINTA_MAP_FORMAT_LIMITS.maxLayers)
          .map((layer): TilemapLayer | null => {
            if (!layer || typeof layer !== 'object') return null
            const l = layer as Record<string, unknown>
            if (typeof l.id !== 'string' || !l.id) return null
            const name =
              typeof l.name === 'string' && l.name.trim()
                ? l.name.trim().slice(0, 30)
                : COPY.tiles.layerNamePrefix
            const common = sanitizeLayerCommon(l)
            if (l.kind === 'objects') {
              return {
                kind: 'objects',
                id: l.id,
                name,
                visible: l.visible !== false,
                ...common,
                objects: sanitizeTilemapObjects(l.objects),
              }
            }
            if (l.kind === 'group') {
              return { kind: 'group', id: l.id, name, visible: l.visible !== false, ...common }
            }
            // `kind` desconhecido (versão futura): descarta a camada, não o mapa.
            if (l.kind !== undefined && l.kind !== 'tiles') return null
            // Coage array simples → Int16Array (JSON/outro realm) antes de validar. Mapa grande
            // viaja com as células compactadas (`cellsPacked`).
            const cells =
              typeof l.cellsPacked === 'string'
                ? unpackCells(l.cellsPacked, cellCount, PINTA_MAP_FORMAT_LIMITS.maxTiles)
                : sanitizeTilemapCells(l.cells, cellCount)
            if (!cells) return null
            // Tileset da camada: só quando é OUTRO (o padrão é a ausência — forma
            // canônica, e o mapa antigo continua byte-idêntico).
            const tilesetId =
              isTilesetRef(l.tilesetId) && l.tilesetId !== mapTilesetId ? l.tilesetId : undefined
            return {
              id: l.id,
              name,
              visible: l.visible !== false,
              ...common,
              cells,
              ...(l.front === true ? { front: true } : {}),
              ...(tilesetId ? { tilesetId } : {}),
              ...(l.collision === true ? { collision: true as const } : {}),
            }
          })
          .filter((l): l is TilemapLayer => l !== null),
      )
      // Sem NENHUMA camada de peças o mapa não tem o que desenhar (nem o editor
      // tem onde pintar): descarta, como sempre foi com zero camadas.
      const tileLayerCount = layers.filter(isTileLayer).length
      if (tileLayerCount === 0) return null
      // O orçamento de memória do formato: um mapa acima dele não é deste editor.
      if (cellCount * tileLayerCount > PINTA_MAP_FORMAT_LIMITS.maxCells) return null
      const tilemap: TilemapAsset = {
        ...base,
        kind: 'tilemap',
        tilesetId: mapTilesetId,
        ...(record.physics === 'precise' ? { physics: 'precise' as const } : {}),
        cols: record.cols,
        rows: record.rows,
        layers: sanitizeLayerTree(layers),
        ...(resources.length ? { resources } : {}),
      }
      // O carimbo acompanha o conteúdo: 3 quando o mapa só usa camadas, 4 quando usa a cena
      // completa, e sai quando deixa de precisar (o mapa que cabe no formato antigo fica byte a
      // byte como era).
      const schema = tilemapSchemaFor(tilemap)
      return schema === undefined ? tilemap : { ...tilemap, schema }
    }
    case 'map-set': {
      // O conjunto acompanha a capacidade do mapa interno, incluindo suas versões de recursos.
      if (
        (record.schema !== PINTA_MAP_SCHEMA &&
          record.schema !== PINTA_SCENE_SCHEMA &&
          record.schema !== PINTA_PRECISE_SCHEMA &&
          record.schema !== PINTA_RESOURCE_SCHEMA &&
          record.schema !== PINTA_COLLISION_SCHEMA) ||
        !record.map ||
        typeof record.map !== 'object' ||
        (record.map as Record<string, unknown>).kind !== 'tilemap'
      )
        return null
      const map = sanitizePintaAsset(record.map)
      if (map?.kind !== 'tilemap') return null
      if (
        map.layers.some(
          (l) => isObjectLayer(l) && l.objects.some((o) => o.setId || o.shape === 'set'),
        )
      )
        return null
      return { ...base, kind: 'map-set', schema: mapSetSchemaFor(map), map }
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
        record.schema !== undefined &&
        (!Number.isInteger(record.schema) || Number(record.schema) > PINTA_MAX_SCHEMA)
      )
        return null
      if (
        typeof record.tileSize !== 'number' ||
        !VECTOR_TILE_SIZES.includes(record.tileSize as (typeof VECTOR_TILE_SIZES)[number])
      ) {
        return null
      }
      if (!Array.isArray(record.tiles)) return null
      // Como no pixel: tile corrompido vira VAZIO para preservar os índices.
      const tiles = record.tiles
        .slice(0, PINTA_MAP_FORMAT_LIMITS.maxTiles)
        .map((t) => sanitizeVectorFrame(t) ?? [])
      if (tiles.length === 0) return null
      const rawSolid = Array.isArray(record.solid) ? record.solid : []
      const solid = tiles.map((_, i) => rawSolid[i] === true)
      const rawPlatform = Array.isArray(record.platform) ? record.platform : []
      const platform = tiles.map((_, i) => rawPlatform[i] === true && solid[i] !== true)
      return {
        ...base,
        kind: 'vector-tileset',
        tileSize: record.tileSize,
        tiles,
        solid,
        platform,
        ...sanitizeTilesetExtras(record, tiles.length),
      }
    }
    default:
      return null
  }
}
