/**
 * Construtores dos MODELOS PRONTOS: montam assets Pinta a partir das fábricas
 * do modelo + a arte autorada (ASCII para pixel, shapes para vetor). Cada
 * chamada gera ids FRESCOS (asset/animação/camada) → o template vira uma CÓPIA
 * independente por construção (sem clonar/regenerar ids depois).
 */
import { newId } from '../core/id'
import {
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
  createVectorBackgroundAsset,
  createVectorSpriteAsset,
  type PixelSpriteAsset,
  type TilemapAsset,
  type TilesetAsset,
  type VectorBackgroundAsset,
  type VectorSpriteAsset,
} from '../core/project'
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

export interface LayerSpec {
  name: string
  rows: string[]
}

/** Todas as camadas DEVEM ter as mesmas dimensões (a 1ª define cols/rows). */
export function buildPixelTilemap(
  name: string,
  tilesetId: string,
  layers: LayerSpec[],
): TilemapAsset {
  const first = cellsFromArt(layers[0]?.rows ?? [])
  const base = createTilemapAsset({ name, tilesetId, cols: first.cols, rows: first.rows })
  return {
    ...base,
    layers: layers.map((l) => ({
      id: newId(),
      name: l.name,
      visible: true,
      cells: cellsFromArt(l.rows).cells,
    })),
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
