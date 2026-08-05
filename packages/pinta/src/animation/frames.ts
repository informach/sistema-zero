/**
 * Operações PURAS sobre animações/quadros de um sprite: devolvem um asset novo
 * (structural sharing — só a animação tocada ganha referência nova) ou o MESMO
 * asset quando a operação não se aplica (quota cheia, índice inválido) — o
 * chamador compara referência para saber se commita no undo.
 *
 * Genéricas sobre o ESTILO do sprite (`AnimatedSpriteAsset`): a lógica de lista
 * (splice/limites/nomes) é uma só; só criar/clonar um quadro difere — pixel
 * cria bitmap vazio e clona bytes, vetor cria lista vazia e clona shapes com
 * ids NOVOS (evita colisão de keys React quando dois quadros aparecem juntos,
 * ex.: onion skin).
 */
import { newId } from '../core/id'
import type {
  AnimatedSpriteAsset,
  PintaEasing,
  PintaPixelFrame,
  VectorFrame,
} from '../core/project'
import { createBitmap, PINTA_LIMITS, uniqueAnimationName } from '../core/project'
import { cloneBitmap } from '../pixel/bitmap'

/** O tipo do quadro de um sprite: `PintaBitmap` (pixel) ou `VectorFrame` (vetor). */
export type FrameOf<A extends AnimatedSpriteAsset> = A['animations'][number]['frames'][number]

type AnimationOf<A extends AnimatedSpriteAsset> = A['animations'][number]

/**
 * Quadro em branco. No pixel um quadro é a PILHA de cels (um por camada), então
 * um quadro novo já nasce com todas as camadas do sprite — o painel de camadas
 * é o mesmo em qualquer quadro.
 */
function emptyFrameFor<A extends AnimatedSpriteAsset>(asset: A): FrameOf<A> {
  const frame: PintaPixelFrame | VectorFrame =
    asset.kind === 'pixel-sprite'
      ? asset.layers.map(() => createBitmap(asset.frameWidth, asset.frameHeight))
      : []
  return frame as FrameOf<A>
}

function cloneFrameOf<A extends AnimatedSpriteAsset>(asset: A, frame: FrameOf<A>): FrameOf<A> {
  const clone: PintaPixelFrame | VectorFrame =
    asset.kind === 'pixel-sprite'
      ? (frame as PintaPixelFrame).map(cloneBitmap)
      : (frame as VectorFrame).map((shape) => ({ ...shape, id: newId() }))
  return clone as FrameOf<A>
}

function withAnimation<A extends AnimatedSpriteAsset>(
  asset: A,
  animationId: string,
  update: (animation: AnimationOf<A>) => AnimationOf<A>,
): A {
  const animations = asset.animations as AnimationOf<A>[]
  const index = animations.findIndex((a) => a.id === animationId)
  if (index === -1) return asset
  const current = animations[index]
  if (!current) return asset
  const next = update(current)
  if (next === current) return asset
  return {
    ...asset,
    animations: animations.map((a, i) => (i === index ? next : a)),
  }
}

// ── Quadros ─────────────────────────────────────────────────────────────────

/** Novo quadro VAZIO após `afterIndex` (fluxo "quadro em branco"). */
export function addFrame<A extends AnimatedSpriteAsset>(
  asset: A,
  animationId: string,
  afterIndex: number,
): A {
  return withAnimation(asset, animationId, (animation) => {
    if (animation.frames.length >= PINTA_LIMITS.maxFramesPerAnimation) return animation
    const frames = [...animation.frames]
    frames.splice(afterIndex + 1, 0, emptyFrameFor(asset))
    return { ...animation, frames }
  })
}

/** Duplica o quadro (fluxo clássico de animar: copia e ajusta). */
export function duplicateFrame<A extends AnimatedSpriteAsset>(
  asset: A,
  animationId: string,
  index: number,
): A {
  return withAnimation(asset, animationId, (animation) => {
    if (animation.frames.length >= PINTA_LIMITS.maxFramesPerAnimation) return animation
    const source = animation.frames[index]
    if (!source) return animation
    const frames = [...animation.frames]
    frames.splice(index + 1, 0, cloneFrameOf(asset, source as FrameOf<A>))
    return { ...animation, frames }
  })
}

/** Remove o quadro — nunca deixa a animação vazia (o último não sai). */
export function removeFrame<A extends AnimatedSpriteAsset>(
  asset: A,
  animationId: string,
  index: number,
): A {
  return withAnimation(asset, animationId, (animation) => {
    if (animation.frames.length <= 1 || !animation.frames[index]) return animation
    return { ...animation, frames: animation.frames.filter((_, i) => i !== index) }
  })
}

/** Move o quadro uma posição (delta -1/+1, botões "mover"). */
export function moveFrame<A extends AnimatedSpriteAsset>(
  asset: A,
  animationId: string,
  index: number,
  delta: number,
): A {
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

/** Substitui o conteúdo de um quadro (usado pelo editor via withActive*). */
export function setFrame<A extends AnimatedSpriteAsset>(
  asset: A,
  animationId: string,
  index: number,
  frame: FrameOf<A>,
): A {
  return withAnimation(asset, animationId, (animation) => {
    if (!animation.frames[index]) return animation
    return { ...animation, frames: animation.frames.map((f, i) => (i === index ? frame : f)) }
  })
}

// ── Animações ───────────────────────────────────────────────────────────────

const DEFAULT_ANIMATION_NAMES = ['parado', 'andar', 'pular', 'correr', 'atacar', 'dano']

function nextAnimationName(asset: AnimatedSpriteAsset): string {
  const taken = new Set(asset.animations.map((a) => a.name))
  for (const name of DEFAULT_ANIMATION_NAMES) {
    if (!taken.has(name)) return name
  }
  return `animação ${asset.animations.length + 1}`
}

/** Nova animação com 1 quadro vazio; devolve o asset E o id criado. */
export function addAnimation<A extends AnimatedSpriteAsset>(
  asset: A,
): {
  asset: A
  animationId: string | null
} {
  if (asset.animations.length >= PINTA_LIMITS.maxAnimations) {
    return { asset, animationId: null }
  }
  const animation = {
    id: newId(),
    name: nextAnimationName(asset),
    fps: 8,
    loop: true,
    frames: [emptyFrameFor(asset)],
  } as AnimationOf<A>
  return {
    asset: { ...asset, animations: [...(asset.animations as AnimationOf<A>[]), animation] },
    animationId: animation.id,
  }
}

export function renameAnimation<A extends AnimatedSpriteAsset>(
  asset: A,
  animationId: string,
  name: string,
): A {
  const trimmed = name.trim().slice(0, PINTA_LIMITS.maxAnimationNameChars)
  if (!trimmed) return asset
  const unique = uniqueAnimationName(
    trimmed,
    asset.animations
      .filter((animation) => animation.id !== animationId)
      .map((animation) => animation.name),
  )
  return withAnimation(asset, animationId, (animation) =>
    animation.name === unique ? animation : { ...animation, name: unique },
  )
}

export function duplicateAnimation<A extends AnimatedSpriteAsset>(
  asset: A,
  animationId: string,
): { asset: A; animationId: string | null } {
  if (asset.animations.length >= PINTA_LIMITS.maxAnimations) {
    return { asset, animationId: null }
  }
  const animations = asset.animations as AnimationOf<A>[]
  const source = animations.find((a) => a.id === animationId)
  if (!source) return { asset, animationId: null }
  const copy = {
    ...source,
    id: newId(),
    name: uniqueAnimationName(
      source.name,
      animations.map((animation) => animation.name),
    ),
    frames: source.frames.map((frame) => cloneFrameOf(asset, frame as FrameOf<A>)),
  } as AnimationOf<A>
  const index = animations.findIndex((a) => a.id === animationId)
  const next = [...animations]
  next.splice(index + 1, 0, copy)
  return { asset: { ...asset, animations: next }, animationId: copy.id }
}

/** Remove a animação — nunca deixa o sprite sem nenhuma (a última não sai). */
export function removeAnimation<A extends AnimatedSpriteAsset>(asset: A, animationId: string): A {
  if (asset.animations.length <= 1) return asset
  if (!asset.animations.some((a) => a.id === animationId)) return asset
  return {
    ...asset,
    animations: (asset.animations as AnimationOf<A>[]).filter((a) => a.id !== animationId),
  }
}

/** Grava o fps da animação — o MESMO valor que sai no metadado do export. */
export function setAnimationFps<A extends AnimatedSpriteAsset>(
  asset: A,
  animationId: string,
  fps: number,
): A {
  const clamped = Math.min(Math.max(Math.round(fps), 1), 30)
  return withAnimation(asset, animationId, (animation) =>
    animation.fps === clamped ? animation : { ...animation, fps: clamped },
  )
}

export function setAnimationLoop<A extends AnimatedSpriteAsset>(
  asset: A,
  animationId: string,
  loop: boolean,
): A {
  return withAnimation(asset, animationId, (animation) =>
    animation.loop === loop ? animation : { ...animation, loop },
  )
}

/**
 * Grava a suavização da PRÉVIA (só dentro do Pinta — não sai no export). Só
 * `ease` fica gravado; `linear` (o padrão) volta a omitir a chave, mantendo o
 * asset idêntico ao histórico.
 */
export function setAnimationEasing<A extends AnimatedSpriteAsset>(
  asset: A,
  animationId: string,
  easing: PintaEasing,
): A {
  return withAnimation(asset, animationId, (animation) => {
    if ((animation.easing ?? 'linear') === easing) return animation
    if (easing === 'linear') {
      const { easing: _drop, ...rest } = animation
      return rest as typeof animation
    }
    return { ...animation, easing }
  })
}
