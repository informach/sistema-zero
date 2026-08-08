/**
 * Helpers PUROS de edição: qual bitmap (pixel) ou lista de shapes (vetor) está
 * "sob o pincel" (asset + seleção da sessão) e como devolver o asset com esse
 * conteúdo trocado (imutável, com structural sharing — só o quadro editado
 * ganha referência nova).
 */
import { flattenCels, layerIndexOf } from '../pixel/layers'
import { removeColorIndex } from '../pixel/ops'
import type { VectorShape } from '../vector/model'
import { PALETTE_SIZE } from './palette'
import {
  type AnimatedSpriteAsset,
  isPixelLayeredKind,
  type PintaAsset,
  type PintaBitmap,
  type PintaPixelFrame,
} from './project'

export interface ActiveFrameRef {
  /** Animação selecionada (sprites): null = a primeira do asset. */
  animationId: string | null
  frameIndex: number
  /** Camada em edição (kinds de pixel com camadas); null/ausente = a de CIMA. */
  layerId?: string | null
}

export function activeAnimationOf<A extends AnimatedSpriteAsset>(
  asset: A,
  ref: ActiveFrameRef,
): A['animations'][number] | null {
  const animations = asset.animations as A['animations'][number][]
  const byId = ref.animationId ? animations.find((a) => a.id === ref.animationId) : undefined
  return byId ?? animations[0] ?? null
}

/**
 * Os CELS do quadro ativo (um por camada, alinhados com `asset.layers`).
 * `null` fora dos kinds de pixel com camadas.
 */
export function activeCelsOf(asset: PintaAsset, ref: ActiveFrameRef): PintaPixelFrame | null {
  switch (asset.kind) {
    case 'pixel-background':
      return asset.cels
    case 'pixel-sprite': {
      const animation = activeAnimationOf(asset, ref)
      if (!animation) return null
      const index = Math.min(Math.max(ref.frameIndex, 0), animation.frames.length - 1)
      return animation.frames[index] ?? null
    }
    default:
      return null
  }
}

/**
 * Bitmap ativo para edição = o cel da CAMADA ATIVA (kinds com camadas) ou o
 * bitmap direto (tileset). `null` p/ tipos sem bitmap (tilemap/vector).
 */
export function activeBitmapOf(asset: PintaAsset, ref: ActiveFrameRef): PintaBitmap | null {
  if (isPixelLayeredKind(asset)) {
    const cels = activeCelsOf(asset, ref)
    if (!cels) return null
    return cels[layerIndexOf(asset, ref.layerId ?? null)] ?? null
  }
  if (asset.kind === 'tileset') {
    // No tileset o `frameIndex` da sessão é o ÍNDICE DO TILE em edição.
    const index = Math.min(Math.max(ref.frameIndex, 0), asset.tiles.length - 1)
    return asset.tiles[index] ?? null
  }
  return null
}

/**
 * O desenho VISÍVEL do quadro ativo (camadas achatadas) — é o que vai para
 * prévia, miniaturas e export. Fora dos kinds com camadas cai no bitmap direto.
 */
export function flattenActiveOf(asset: PintaAsset, ref: ActiveFrameRef): PintaBitmap | null {
  if (!isPixelLayeredKind(asset)) return activeBitmapOf(asset, ref)
  const cels = activeCelsOf(asset, ref)
  if (!cels) return null
  return flattenCels(cels, asset.layers)
}

/**
 * Quadro ANTERIOR ao ativo, ACHATADO (onion skin). `null` no primeiro quadro/
 * sem sprite.
 */
export function previousFrameOf(asset: PintaAsset, ref: ActiveFrameRef): PintaBitmap | null {
  if (asset.kind !== 'pixel-sprite') return null
  const animation = activeAnimationOf(asset, ref)
  if (!animation || ref.frameIndex <= 0) return null
  const cels = animation.frames[ref.frameIndex - 1]
  return cels ? flattenCels(cels, asset.layers) : null
}

/**
 * Devolve o asset com o bitmap ativo TROCADO — nos kinds com camadas, troca só
 * o cel da CAMADA ATIVA (structural sharing: as outras camadas e os demais
 * quadros seguem por referência). No-op p/ tipos sem bitmap.
 */
export function withActiveBitmap(
  asset: PintaAsset,
  ref: ActiveFrameRef,
  bitmap: PintaBitmap,
): PintaAsset {
  if (isPixelLayeredKind(asset)) {
    const layer = layerIndexOf(asset, ref.layerId ?? null)
    const withCel = (cels: PintaPixelFrame): PintaPixelFrame =>
      cels.map((cel, i) => (i === layer ? bitmap : cel))
    if (asset.kind === 'pixel-background') return { ...asset, cels: withCel(asset.cels) }
    const animation = activeAnimationOf(asset, ref)
    if (!animation) return asset
    const index = Math.min(Math.max(ref.frameIndex, 0), animation.frames.length - 1)
    return {
      ...asset,
      animations: asset.animations.map((a) =>
        a.id === animation.id
          ? { ...a, frames: a.frames.map((cels, i) => (i === index ? withCel(cels) : cels)) }
          : a,
      ),
    }
  }
  if (asset.kind === 'tileset') {
    const index = Math.min(Math.max(ref.frameIndex, 0), asset.tiles.length - 1)
    return { ...asset, tiles: asset.tiles.map((tile, i) => (i === index ? bitmap : tile)) }
  }
  return asset
}

/**
 * Aplica uma transformação em TODAS as camadas do quadro ativo, na mesma
 * transação. É o caminho de espelhar/girar: fazer isso só na camada ativa
 * desalinharia o desenho e, no caso do girar, deixaria camadas com dimensões
 * diferentes — que o sanitize descarta no próximo load.
 */
export function withActiveCels(
  asset: PintaAsset,
  ref: ActiveFrameRef,
  transform: (bitmap: PintaBitmap) => PintaBitmap,
): PintaAsset {
  if (!isPixelLayeredKind(asset)) {
    const bitmap = activeBitmapOf(asset, ref)
    return bitmap ? withActiveBitmap(asset, ref, transform(bitmap)) : asset
  }
  const cels = activeCelsOf(asset, ref)
  if (!cels) return asset
  const next = cels.map(transform)
  if (asset.kind === 'pixel-background') return { ...asset, cels: next }
  const animation = activeAnimationOf(asset, ref)
  if (!animation) return asset
  const index = Math.min(Math.max(ref.frameIndex, 0), animation.frames.length - 1)
  return {
    ...asset,
    animations: asset.animations.map((a) =>
      a.id === animation.id
        ? { ...a, frames: a.frames.map((frame, i) => (i === index ? next : frame)) }
        : a,
    ),
  }
}

/**
 * Remove uma cor EXTRA (índice ≥ PALETTE_SIZE) do asset, remapeando TODOS os
 * bitmaps: pixels da cor viram transparente, índices maiores descem 1 e a
 * entrada sai de `extraColors` (vazia → a CHAVE some, convenção do
 * `sanitizeExtraColors`). As 16 cores base são fixas — `null` = não removível
 * (cor base, extra fora do alcance ou kind sem paleta); o chamador trata como
 * no-op. Mapas dependentes de tileset NÃO precisam de remap (guardam índice de
 * PEÇA, não de cor — re-renderizam com a paleta nova sozinhos).
 */
export function removeExtraColor(asset: PintaAsset, colorIndex: number): PintaAsset | null {
  if (!('paletteId' in asset)) return null
  const extras = asset.extraColors ?? []
  const extraPos = colorIndex - PALETTE_SIZE
  if (extraPos < 0 || extraPos >= extras.length) return null
  const nextExtras = extras.filter((_, i) => i !== extraPos)
  const extrasPatch = nextExtras.length > 0 ? { extraColors: nextExtras } : {}
  // ⚠️ Com camadas o remap tem um nível a mais (cels): esquecer UM nível
  // desloca índices só em parte do desenho = corrupção silenciosa.
  const remapCels = (cels: PintaPixelFrame): PintaPixelFrame =>
    cels.map((cel) => removeColorIndex(cel, colorIndex))
  switch (asset.kind) {
    case 'pixel-background': {
      const { extraColors: _drop, ...rest } = asset
      return { ...rest, ...extrasPatch, cels: remapCels(asset.cels) }
    }
    case 'pixel-sprite': {
      const { extraColors: _drop, ...rest } = asset
      return {
        ...rest,
        ...extrasPatch,
        animations: asset.animations.map((animation) => ({
          ...animation,
          frames: animation.frames.map(remapCels),
        })),
      }
    }
    case 'tileset': {
      const { extraColors: _drop, ...rest } = asset
      return {
        ...rest,
        ...extrasPatch,
        tiles: asset.tiles.map((tile) => removeColorIndex(tile, colorIndex)),
      }
    }
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
