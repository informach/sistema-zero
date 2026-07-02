/**
 * Helpers PUROS de edição: qual bitmap está "sob o pincel" (asset + seleção da
 * sessão) e como devolver o asset com esse bitmap trocado (imutável, com
 * structural sharing — só o quadro editado ganha referência nova).
 */
import type { PintaAnimation, PintaAsset, PintaBitmap } from './project'

export interface ActiveFrameRef {
  /** Animação selecionada (sprites): null = a primeira do asset. */
  animationId: string | null
  frameIndex: number
}

export function activeAnimationOf(
  asset: Extract<PintaAsset, { kind: 'pixel-sprite' }>,
  ref: ActiveFrameRef,
): PintaAnimation | null {
  const byId = ref.animationId ? asset.animations.find((a) => a.id === ref.animationId) : undefined
  return byId ?? asset.animations[0] ?? null
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
