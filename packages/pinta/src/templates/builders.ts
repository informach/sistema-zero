/**
 * Construtores dos MODELOS PRONTOS: montam assets Pinta a partir das fábricas
 * do modelo + a arte autorada (ASCII para pixel, shapes para vetor). Cada
 * chamada gera ids FRESCOS (asset/animação/camada) → o template vira uma CÓPIA
 * independente por construção (sem clonar/regenerar ids depois).
 */
import { newId } from '../core/id'
import {
  type AnyTilesetAsset,
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
  createVectorBackgroundAsset,
  createVectorSpriteAsset,
  isCompatibleMapTileset,
  normalizeAssetName,
  OBJECT_PROPERTY_KEY_PATTERN,
  PINTA_LIMITS,
  type PixelSpriteAsset,
  sanitizePintaAsset,
  type TilemapAsset,
  type TilemapLayer,
  type TilemapObjectPropertyValue,
  type TilesetAsset,
  type VectorBackgroundAsset,
  type VectorSpriteAsset,
} from '../core/project'
import { createMapObject } from '../tiles/mapObjects'
import type { TileCollision } from '../tiles/tilesetOps'
import type { VectorShape } from '../vector/model'
import { bitmapFromArt, cellsFromArt } from './art'

export interface SpriteAnimSpec {
  name: string
  fps?: number
  loop?: boolean
  /** Cada quadro é um bloco de linhas de arte (ASCII). */
  frames: string[][]
}

export function buildPixelSprite(
  name: string,
  size: number,
  anims: SpriteAnimSpec[],
): PixelSpriteAsset {
  const base = createPixelSpriteAsset({ name, frameSize: size })
  return {
    ...base,
    animations: anims.map((a) => ({
      id: newId(),
      name: a.name,
      fps: a.fps ?? 8,
      loop: a.loop ?? true,
      // Modelo pronto nasce com UMA camada: a arte é o cel dela.
      frames: a.frames.map((art) => [bitmapFromArt(art)]),
    })),
  }
}

export interface TileSpec {
  art: string[]
  collision?: TileCollision
}

export function buildPixelTileset(name: string, tileSize: number, tiles: TileSpec[]): TilesetAsset {
  const base = createTilesetAsset({ name, tileSize })
  return {
    ...base,
    tiles: tiles.map((t) => bitmapFromArt(t.art)),
    solid: tiles.map((t) => t.collision === 'solid'),
    platform: tiles.map((t) => t.collision === 'platform'),
  }
}

/** Uma camada de PEÇAS do mapa. */
export interface LayerSpec {
  /** Ausente = camada de peças (é o jeito antigo de escrever o modelo). */
  kind?: 'tiles'
  name: string
  /** Linhas de arte do mapa (`"0 1 . 2"`, `.` = vazio) — o dialeto de `cellsFromArt`. */
  rows?: string[]
  /** OU as células cruas, row-major (`-1` = vazio), com `cols × rows` do mapa. */
  cells?: ArrayLike<number>
  /**
   * As peças desta camada (o tileset ou o id dele). Ausente = as do mapa. Tem de
   * ter o mesmo estilo e o mesmo tamanho de peça das peças do mapa.
   */
  tileset?: AnyTilesetAsset | string
  /** Desenhada por cima do jogador (copa, telhado). */
  front?: boolean
  visible?: boolean
}

/** Um objeto do mapa (ponto: sem `width`/`height`). */
export interface ObjectSpec {
  name: string
  type?: string
  /** Na unidade de `buildTilemap({ objectUnits })`: pixels do mapa (padrão) ou peças. */
  x: number
  y: number
  width?: number
  height?: number
  properties?: Record<string, TilemapObjectPropertyValue>
}

/** Uma camada de OBJETOS (spawn, inimigos, portas, áreas de colisão…). */
export interface ObjectLayerSpec {
  kind: 'objects'
  name: string
  visible?: boolean
  objects: ObjectSpec[]
}

export type TilemapLayerSpec = LayerSpec | ObjectLayerSpec

export interface TilemapSpec {
  name: string
  /** As peças PADRÃO do mapa (definem o tamanho da peça e o estilo). */
  tileset: AnyTilesetAsset
  /**
   * Outras peças que as camadas citam por id (`LayerSpec.tileset: 'id'`). Quem
   * passa o tileset inteiro na camada não precisa repetir aqui.
   */
  tilesets?: readonly AnyTilesetAsset[]
  /** Tamanho do mapa em células. Ausente = o da 1ª camada de peças com `rows`. */
  cols?: number
  rows?: number
  /** Fundo primeiro. Peças e objetos dividem o teto de `PINTA_LIMITS.maxTilemapLayers`. */
  layers: TilemapLayerSpec[]
  /** Unidade das coordenadas dos objetos: `pixels` do mapa (padrão) ou `tiles` (× tamanho da peça). */
  objectUnits?: 'pixels' | 'tiles'
}

/** Erro de AUTORIA do modelo (quem gera mapas por código vê o problema na hora). */
function fail(name: string, message: string): never {
  throw new Error(`buildTilemap("${name}"): ${message}`)
}

/**
 * Monta um MAPA completo por código: camadas de peças (cada uma com as peças
 * dela, se quiser) e camadas de objetos. Ids frescos por chamada, como todo
 * modelo pronto.
 *
 * ⚠️ Diferente do sanitize (que nunca lança e descarta o que não serve), o
 * construtor LANÇA no erro de autoria — peças de outro tamanho ou estilo, camada
 * com tamanho diferente, teto estourado, propriedade com nome inválido — porque
 * um mapa gerado errado viraria um desenho que some ou perde objetos em silêncio
 * no primeiro load. A última linha confere exatamente isso: o mapa montado passa
 * inteiro pelo `sanitizePintaAsset`.
 */
export function buildTilemap(spec: TilemapSpec): TilemapAsset {
  const name = normalizeAssetName(spec.name)
  if (!name) fail(spec.name, 'nome inválido (use letras, números e hífen)')
  if (spec.layers.length === 0) fail(name, 'o mapa precisa de pelo menos uma camada')
  if (spec.layers.length > PINTA_LIMITS.maxTilemapLayers) {
    fail(name, `no máximo ${PINTA_LIMITS.maxTilemapLayers} camadas`)
  }
  const base = spec.tileset
  const known = new Map<string, AnyTilesetAsset>([[base.id, base]])
  for (const tileset of spec.tilesets ?? []) known.set(tileset.id, tileset)

  const firstArt = spec.layers.find(
    (layer): layer is LayerSpec => layer.kind !== 'objects' && layer.rows !== undefined,
  )
  const fromArt = firstArt?.rows ? cellsFromArt(firstArt.rows) : null
  const cols = spec.cols ?? fromArt?.cols
  const rows = spec.rows ?? fromArt?.rows
  if (!cols || !rows) fail(name, 'informe cols/rows ou uma camada de peças com `rows`')
  if (cols > PINTA_LIMITS.maxTilemapCols || rows > PINTA_LIMITS.maxTilemapRows) {
    fail(name, `no máximo ${PINTA_LIMITS.maxTilemapCols} × ${PINTA_LIMITS.maxTilemapRows} células`)
  }
  const unit = spec.objectUnits === 'tiles' ? base.tileSize : 1

  const layers = spec.layers.map((layer, index): TilemapLayer => {
    const label = `camada ${index + 1} ("${layer.name}")`
    if (layer.kind === 'objects') {
      if (layer.objects.length > PINTA_LIMITS.maxTilemapObjects) {
        fail(name, `${label}: no máximo ${PINTA_LIMITS.maxTilemapObjects} objetos`)
      }
      return {
        kind: 'objects',
        id: newId(),
        name: layer.name,
        visible: layer.visible !== false,
        objects: layer.objects.map((object) => {
          const properties = object.properties ?? {}
          const keys = Object.keys(properties)
          if (keys.length > PINTA_LIMITS.maxObjectProperties) {
            fail(
              name,
              `objeto "${object.name}": no máximo ${PINTA_LIMITS.maxObjectProperties} propriedades`,
            )
          }
          for (const key of keys) {
            if (
              key.length > PINTA_LIMITS.maxObjectPropertyKeyChars ||
              !OBJECT_PROPERTY_KEY_PATTERN.test(key)
            ) {
              fail(name, `objeto "${object.name}": propriedade "${key}" com nome inválido`)
            }
          }
          const box = {
            x: object.x * unit,
            y: object.y * unit,
            width: (object.width ?? 0) * unit,
            height: (object.height ?? 0) * unit,
          }
          const inside =
            Object.values(box).every((v) => Number.isFinite(v) && v >= 0) &&
            box.x + box.width <= cols * base.tileSize &&
            box.y + box.height <= rows * base.tileSize
          if (!inside) fail(name, `objeto "${object.name}": fora do mapa`)
          return createMapObject({
            name: object.name,
            type: object.type ?? '',
            ...box,
            properties,
          })
        }),
      }
    }
    const tileset =
      typeof layer.tileset === 'string' ? known.get(layer.tileset) : (layer.tileset ?? base)
    if (!tileset) fail(name, `${label}: peças "${String(layer.tileset)}" não foram passadas`)
    if (!isCompatibleMapTileset(base, tileset)) {
      fail(
        name,
        `${label}: as peças "${tileset.name}" precisam ser do mesmo estilo e ter peças de ${base.tileSize} px`,
      )
    }
    const cells = layer.rows
      ? cellsFromArt(layer.rows)
      : { cols, rows, cells: Int16Array.from(layer.cells ?? new Int16Array(cols * rows).fill(-1)) }
    if (cells.cols !== cols || cells.rows !== rows || cells.cells.length !== cols * rows) {
      fail(name, `${label}: precisa ter ${cols} × ${rows} células`)
    }
    for (const value of cells.cells) {
      if (value >= tileset.tiles.length) {
        fail(name, `${label}: a peça ${value} não existe em "${tileset.name}"`)
      }
    }
    return {
      id: newId(),
      name: layer.name,
      visible: layer.visible !== false,
      cells: cells.cells,
      ...(layer.front ? { front: true } : {}),
      ...(tileset.id !== base.id ? { tilesetId: tileset.id } : {}),
    }
  })
  if (!layers.some((layer) => layer.kind !== 'objects')) {
    fail(name, 'o mapa precisa de pelo menos uma camada de peças')
  }

  const map: TilemapAsset = {
    ...createTilemapAsset({ name, tilesetId: base.id, cols, rows }),
    layers,
  }
  // O que o load faria com o mapa: tem de sair IGUAL (nada descartado, nada cortado).
  const roundTrip = sanitizePintaAsset(structuredClone(map))
  if (
    roundTrip?.kind !== 'tilemap' ||
    JSON.stringify(wireLayers(roundTrip)) !== JSON.stringify(wireLayers(map))
  ) {
    fail(name, 'o mapa não sobreviveria ao load (confira nomes, medidas e propriedades)')
  }
  return map
}

function wireLayers(map: TilemapAsset): unknown {
  return map.layers.map((layer) =>
    layer.kind === 'objects' ? layer : { ...layer, cells: Array.from(layer.cells) },
  )
}

/**
 * O jeito antigo dos modelos prontos: só camadas de peças, as peças por id.
 * Todas as camadas DEVEM ter as mesmas dimensões (a 1ª define cols/rows). Para
 * objetos e peças por camada com validação, use `buildTilemap`.
 */
export function buildPixelTilemap(
  name: string,
  tilesetId: string,
  layers: LayerSpec[],
): TilemapAsset {
  const first = cellsFromArt(layers[0]?.rows ?? [])
  const base = createTilemapAsset({ name, tilesetId, cols: first.cols, rows: first.rows })
  return {
    ...base,
    layers: layers.map((l) => {
      const layerTileset = typeof l.tileset === 'string' ? l.tileset : l.tileset?.id
      return {
        id: newId(),
        name: l.name,
        visible: l.visible !== false,
        cells: l.rows ? cellsFromArt(l.rows).cells : Int16Array.from(l.cells ?? []),
        ...(l.front ? { front: true } : {}),
        ...(layerTileset && layerTileset !== tilesetId ? { tilesetId: layerTileset } : {}),
      }
    }),
  }
}
export interface VectorAnimSpec {
  name: string
  fps?: number
  loop?: boolean
  frames: VectorShape[][]
}

export function buildVectorSprite(
  name: string,
  size: number,
  anims: VectorAnimSpec[],
): VectorSpriteAsset {
  const base = createVectorSpriteAsset({ name, frameSize: size })
  return {
    ...base,
    animations: anims.map((a) => ({
      id: newId(),
      name: a.name,
      fps: a.fps ?? 6,
      loop: a.loop ?? true,
      frames: a.frames,
    })),
  }
}

export function buildVectorBackground(
  name: string,
  width: number,
  height: number,
  shapes: VectorShape[],
): VectorBackgroundAsset {
  const base = createVectorBackgroundAsset({ name, width, height })
  return { ...base, shapes }
}
