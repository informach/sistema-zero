/**
 * Helpers PUROS de edição: qual bitmap (pixel) ou lista de shapes (vetor) está
 * "sob o pincel" (asset + seleção da sessão) e como devolver o asset com esse
 * conteúdo trocado (imutável, com structural sharing — só o quadro editado
 * ganha referência nova).
 */
import type { VectorShape } from '../vector/model'
import type { AnimatedSpriteAsset, PintaAsset, PintaBitmap } from './project'

export interface ActiveFrameRef {
  /** Animação selecionada (sprites): null = a primeira do asset. */
  animationId: string | null
  frameIndex: number
}

export function activeAnimationOf<A extends AnimatedSpriteAsset>(
  asset: A,
  ref: ActiveFrameRef,
): A['animations'][number] | null {
  const animations = asset.animations as A['animations'][number][]
  const byId = ref.animationId ? animations.find((a) => a.id === ref.animationId) : undefined
  return byId ?? animations[0] ?? null
}

/** Bitmap ativo para edição. `null` p/ tipos sem bitmap direto (tilemap/vector). */
export function activeBitmapOf(asset: PintaAsset, ref: ActiveFrameRef): PintaBitmap | null {
  switch (asset.kind) {
    case 'pixel-background':
      return asset.bitmap
    case 'pixel-sprite': {
      const animation = activeAnimationOf(asset, ref)
      if (!animation) return null
      const index = Math.min(Math.max(ref.frameIndex, 0), animation.frames.length - 1)
      return animation.frames[index] ?? null
    }
    case 'tileset': {
      // No tileset o `frameIndex` da sessão é o ÍNDICE DO TILE em edição.
      const index = Math.min(Math.max(ref.frameIndex, 0), asset.tiles.length - 1)
      return asset.tiles[index] ?? null
    }
    default:
      return null
  }
}

/** Quadro ANTERIOR ao ativo (onion skin). `null` no primeiro quadro/sem sprite. */
export function previousFrameOf(asset: PintaAsset, ref: ActiveFrameRef): PintaBitmap | null {
  if (asset.kind !== 'pixel-sprite') return null
  const animation = activeAnimationOf(asset, ref)
  if (!animation || ref.frameIndex <= 0) return null
  return animation.frames[ref.frameIndex - 1] ?? null
}

/** Devolve o asset com o bitmap ativo TROCADO. No-op p/ tipos sem bitmap. */
export function withActiveBitmap(
  asset: PintaAsset,
  ref: ActiveFrameRef,
  bitmap: PintaBitmap,
): PintaAsset {
  switch (asset.kind) {
    case 'pixel-background':
      return { ...asset, bitmap }
    case 'pixel-sprite': {
      const animation = activeAnimationOf(asset, ref)
      if (!animation) return asset
      const index = Math.min(Math.max(ref.frameIndex, 0), animation.frames.length - 1)
      return {
        ...asset,
        animations: asset.animations.map((a) =>
          a.id === animation.id
            ? { ...a, frames: a.frames.map((frame, i) => (i === index ? bitmap : frame)) }
            : a,
        ),
      }
    }
    case 'tileset': {
      const index = Math.min(Math.max(ref.frameIndex, 0), asset.tiles.length - 1)
      return { ...asset, tiles: asset.tiles.map((tile, i) => (i === index ? bitmap : tile)) }
    }
    default:
      return asset
  }
}

// ── Vetor (espelho do par bitmap acima) ─────────────────────────────────────

/** O documento vetorial "sob o pincel": dimensões + shapes do quadro/tile ativo. */
export interface ActiveShapesDoc {
  width: number
  height: number
  shapes: VectorShape[]
}

/** Documento vetorial ativo. `null` p/ kinds sem shapes (pixel/tilemap). */
export function activeShapesOf(asset: PintaAsset, ref: ActiveFrameRef): ActiveShapesDoc | null {
  switch (asset.kind) {
    case 'vector-background':
      return { width: asset.width, height: asset.height, shapes: asset.shapes }
    case 'vector-sprite': {
      const animation = activeAnimationOf(asset, ref)
      if (!animation) return null
      const index = Math.min(Math.max(ref.frameIndex, 0), animation.frames.length - 1)
      const frame = animation.frames[index]
      if (!frame) return null
      return { width: asset.frameWidth, height: asset.frameHeight, shapes: frame }
    }
    case 'vector-tileset': {
      // Como no tileset pixel: o `frameIndex` da sessão é o ÍNDICE DO TILE.
      const index = Math.min(Math.max(ref.frameIndex, 0), asset.tiles.length - 1)
      const tile = asset.tiles[index]
      if (!tile) return null
      return { width: asset.tileSize, height: asset.tileSize, shapes: tile }
    }
    default:
      return null
  }
}

/** Quadro vetorial ANTERIOR ao ativo (onion skin). `null` fora do vector-sprite. */
export function previousShapesOf(asset: PintaAsset, ref: ActiveFrameRef): VectorShape[] | null {
  if (asset.kind !== 'vector-sprite') return null
  const animation = activeAnimationOf(asset, ref)
  if (!animation || ref.frameIndex <= 0) return null
  return animation.frames[ref.frameIndex - 1] ?? null
}

/** Devolve o asset com a lista de shapes ativa TROCADA. No-op p/ os demais. */
export function withActiveShapes(
  asset: PintaAsset,
  ref: ActiveFrameRef,
  shapes: VectorShape[],
): PintaAsset {
  switch (asset.kind) {
    case 'vector-background':
      return { ...asset, shapes }
    case 'vector-sprite': {
      const animation = activeAnimationOf(asset, ref)
      if (!animation) return asset
      const index = Math.min(Math.max(ref.frameIndex, 0), animation.frames.length - 1)
      return {
        ...asset,
        animations: asset.animations.map((a) =>
          a.id === animation.id
            ? { ...a, frames: a.frames.map((frame, i) => (i === index ? shapes : frame)) }
            : a,
        ),
      }
    }
    case 'vector-tileset': {
      const index = Math.min(Math.max(ref.frameIndex, 0), asset.tiles.length - 1)
      return { ...asset, tiles: asset.tiles.map((tile, i) => (i === index ? shapes : tile)) }
    }
    default:
      return asset
  }
}
