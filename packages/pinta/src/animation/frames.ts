/**
 * Operações PURAS sobre animações/quadros de um sprite: devolvem um asset novo
 * (structural sharing — só a animação tocada ganha referência nova) ou o MESMO
 * asset quando a operação não se aplica (quota cheia, índice inválido) — o
 * chamador compara referência para saber se commita no undo.
 */
import { newId } from '../core/id'
import type { PixelSpriteAsset } from '../core/project'
import { createBitmap, PINTA_LIMITS, type PintaAnimation, type PintaBitmap } from '../core/project'
import { cloneBitmap } from '../pixel/bitmap'

function withAnimation(
  asset: PixelSpriteAsset,
  animationId: string,
  update: (animation: PintaAnimation) => PintaAnimation,
): PixelSpriteAsset {
  const index = asset.animations.findIndex((a) => a.id === animationId)
  if (index === -1) return asset
  const current = asset.animations[index]
  if (!current) return asset
  const next = update(current)
  if (next === current) return asset
  return {
    ...asset,
    animations: asset.animations.map((a, i) => (i === index ? next : a)),
  }
}

// ── Quadros ─────────────────────────────────────────────────────────────────

/** Novo quadro VAZIO após `afterIndex` (fluxo "quadro em branco"). */
export function addFrame(
  asset: PixelSpriteAsset,
  animationId: string,
  afterIndex: number,
): PixelSpriteAsset {
  return withAnimation(asset, animationId, (animation) => {
    if (animation.frames.length >= PINTA_LIMITS.maxFramesPerAnimation) return animation
    const frames = [...animation.frames]
    frames.splice(afterIndex + 1, 0, createBitmap(asset.frameWidth, asset.frameHeight))
    return { ...animation, frames }
  })
}

/** Duplica o quadro (fluxo clássico de animar: copia e ajusta). */
export function duplicateFrame(
  asset: PixelSpriteAsset,
  animationId: string,
  index: number,
): PixelSpriteAsset {
  return withAnimation(asset, animationId, (animation) => {
    if (animation.frames.length >= PINTA_LIMITS.maxFramesPerAnimation) return animation
    const source = animation.frames[index]
    if (!source) return animation
    const frames = [...animation.frames]
    frames.splice(index + 1, 0, cloneBitmap(source))
    return { ...animation, frames }
  })
}

/** Remove o quadro — nunca deixa a animação vazia (o último não sai). */
export function removeFrame(
  asset: PixelSpriteAsset,
  animationId: string,
  index: number,
): PixelSpriteAsset {
  return withAnimation(asset, animationId, (animation) => {
    if (animation.frames.length <= 1 || !animation.frames[index]) return animation
    return { ...animation, frames: animation.frames.filter((_, i) => i !== index) }
  })
}

/** Move o quadro uma posição (delta -1/+1, botões "mover"). */
export function moveFrame(
  asset: PixelSpriteAsset,
  animationId: string,
  index: number,
  delta: number,
): PixelSpriteAsset {
  return withAnimation(asset, animationId, (animation) => {
    const target = index + delta
    const frame = animation.frames[index]
    if (!frame || target < 0 || target >= animation.frames.length) return animation
    const frames = [...animation.frames]
    frames.splice(index, 1)
    frames.splice(target, 0, frame)
    return { ...animation, frames }
  })
}

/** Substitui o bitmap de um quadro (usado pelo editor via withActiveBitmap). */
export function setFrame(
  asset: PixelSpriteAsset,
  animationId: string,
  index: number,
  bitmap: PintaBitmap,
): PixelSpriteAsset {
  return withAnimation(asset, animationId, (animation) => {
    if (!animation.frames[index]) return animation
    return { ...animation, frames: animation.frames.map((f, i) => (i === index ? bitmap : f)) }
  })
}

// ── Animações ───────────────────────────────────────────────────────────────

const DEFAULT_ANIMATION_NAMES = ['parado', 'andar', 'pular', 'correr', 'atacar', 'dano']

function nextAnimationName(asset: PixelSpriteAsset): string {
  const taken = new Set(asset.animations.map((a) => a.name))
  for (const name of DEFAULT_ANIMATION_NAMES) {
    if (!taken.has(name)) return name
  }
  return `animação ${asset.animations.length + 1}`
}

/** Nova animação com 1 quadro vazio; devolve o asset E o id criado. */
export function addAnimation(asset: PixelSpriteAsset): {
  asset: PixelSpriteAsset
  animationId: string | null
} {
  if (asset.animations.length >= PINTA_LIMITS.maxAnimations) {
    return { asset, animationId: null }
  }
  const animation: PintaAnimation = {
    id: newId(),
    name: nextAnimationName(asset),
    fps: 8,
    loop: true,
    frames: [createBitmap(asset.frameWidth, asset.frameHeight)],
  }
  return {
    asset: { ...asset, animations: [...asset.animations, animation] },
    animationId: animation.id,
  }
}

export function renameAnimation(
  asset: PixelSpriteAsset,
  animationId: string,
  name: string,
): PixelSpriteAsset {
  const trimmed = name.trim().slice(0, PINTA_LIMITS.maxAnimationNameChars)
  if (!trimmed) return asset
  return withAnimation(asset, animationId, (animation) =>
    animation.name === trimmed ? animation : { ...animation, name: trimmed },
  )
}

export function duplicateAnimation(
  asset: PixelSpriteAsset,
  animationId: string,
): { asset: PixelSpriteAsset; animationId: string | null } {
  if (asset.animations.length >= PINTA_LIMITS.maxAnimations) {
    return { asset, animationId: null }
  }
  const source = asset.animations.find((a) => a.id === animationId)
  if (!source) return { asset, animationId: null }
  const copy: PintaAnimation = {
    ...source,
    id: newId(),
    name: `${source.name} 2`.slice(0, PINTA_LIMITS.maxAnimationNameChars),
    frames: source.frames.map((frame) => cloneBitmap(frame)),
  }
  const index = asset.animations.findIndex((a) => a.id === animationId)
  const animations = [...asset.animations]
  animations.splice(index + 1, 0, copy)
  return { asset: { ...asset, animations }, animationId: copy.id }
}

/** Remove a animação — nunca deixa o sprite sem nenhuma (a última não sai). */
export function removeAnimation(asset: PixelSpriteAsset, animationId: string): PixelSpriteAsset {
  if (asset.animations.length <= 1) return asset
  if (!asset.animations.some((a) => a.id === animationId)) return asset
  return { ...asset, animations: asset.animations.filter((a) => a.id !== animationId) }
}

/** Grava o fps da animação — o MESMO valor que sai no metadado do export. */
export function setAnimationFps(
  asset: PixelSpriteAsset,
  animationId: string,
  fps: number,
): PixelSpriteAsset {
  const clamped = Math.min(Math.max(Math.round(fps), 1), 30)
  return withAnimation(asset, animationId, (animation) =>
    animation.fps === clamped ? animation : { ...animation, fps: clamped },
  )
}

export function setAnimationLoop(
  asset: PixelSpriteAsset,
  animationId: string,
  loop: boolean,
): PixelSpriteAsset {
  return withAnimation(asset, animationId, (animation) =>
    animation.loop === loop ? animation : { ...animation, loop },
  )
}
