import { frameDurationsMs } from '../animation/player'
import type { PintaVectorAnimation, VectorSpriteAsset } from '../core/project'
import { boundsCenter, shapeBounds } from '../vector/geometry'
import { type VectorShape, visibleShapes } from '../vector/model'
import {
  gradientDefsMarkup,
  shapeGeometryAttrs,
  shapesToMarkup,
  shapeToMarkup,
} from '../vector/svg'

export const MODULE_ANIMATED_SVG_MAX_BYTES = 2 * 1024 * 1024

export type AnimatedVectorSvgFailureReason = 'empty' | 'text' | 'image' | 'too-large'

export interface AnimatedVectorSvgSuccess {
  ok: true
  svg: string
  bytes: number
  sourceFrameCount: number
  poseCount: number
  staticTracks: number
  smoothedTracks: number
  discreteTracks: number
}

export type AnimatedVectorSvgResult =
  | AnimatedVectorSvgSuccess
  | { ok: false; reason: Exclude<AnimatedVectorSvgFailureReason, 'too-large'> }
  | { ok: false; reason: 'too-large'; bytes: number }

export interface AnimatedVectorSvgOptions {
  /** Interpola posição/tamanho/rotação/opacidade quando a trilha é inequivocamente segura. */
  smooth?: boolean
}

interface Pose {
  shapes: VectorShape[]
  durationMs: number
}

const SMOOTH_TYPES = new Set<VectorShape['type']>(['rect', 'ellipse', 'line'])

function number(value: number): string {
  const rounded = Math.round(value * 1_000_000) / 1_000_000
  return String(Object.is(rounded, -0) ? 0 : rounded)
}

/** Identidade VISUAL: metadados de edição e vínculo entre quadros não contam. */
function visualSignature(shape: VectorShape): string {
  const {
    id: _id,
    motionId: _motionId,
    groupId: _groupId,
    hidden: _hidden,
    locked: _locked,
    ...visual
  } = shape
  return JSON.stringify(visual)
}

function frameSignature(shapes: VectorShape[]): string {
  return JSON.stringify(shapes.map(visualSignature))
}

function smoothStyleSignature(shape: VectorShape): string {
  return JSON.stringify({ type: shape.type, fill: shape.fill, stroke: shape.stroke })
}

function compactPoses(animation: PintaVectorAnimation): Pose[] {
  const durations = frameDurationsMs(
    animation.frames.length,
    animation.fps,
    animation.easing ?? 'linear',
  )
  const poses: Pose[] = []
  let previousSignature: string | null = null

  animation.frames.forEach((frame, index) => {
    const shapes = visibleShapes(frame)
    const signature = frameSignature(shapes)
    const durationMs = durations[index] ?? 0
    const previous = poses.at(-1)
    if (previous && signature === previousSignature) {
      previous.durationMs += durationMs
      return
    }
    poses.push({ shapes, durationMs })
    previousSignature = signature
  })

  return poses
}

function timeline(poses: Pose[]): { dur: string; keyTimes: string } {
  const total = poses.reduce((sum, pose) => sum + pose.durationMs, 0)
  let elapsed = 0
  const times = [0]
  for (const pose of poses) {
    elapsed += pose.durationMs
    times.push(total > 0 ? elapsed / total : 1)
  }
  return {
    dur: `${number(total)}ms`,
    keyTimes: times.map(number).join(';'),
  }
}

function animationEnd(loop: boolean): string {
  return loop ? 'repeatCount="indefinite"' : 'repeatCount="1" fill="freeze"'
}

function valuesWithEnd(values: string[], loop: boolean): string[] {
  if (values.length === 0) return []
  return [...values, loop ? (values[0] as string) : (values.at(-1) as string)]
}

function animate(
  attributeName: string,
  values: string[],
  keyTimes: string,
  dur: string,
  loop: boolean,
  calcMode: 'linear' | 'discrete',
): string {
  return `<animate attributeName="${attributeName}" values="${valuesWithEnd(values, loop).join(
    ';',
  )}" keyTimes="${keyTimes}" dur="${dur}" calcMode="${calcMode}" ${animationEnd(loop)}/>`
}

function animatedGeometryAttrs(shape: VectorShape): string[] {
  switch (shape.type) {
    case 'rect':
      return ['x', 'y', 'width', 'height', 'rx']
    case 'ellipse':
      return ['cx', 'cy', 'rx', 'ry']
    case 'line':
      return ['x1', 'y1', 'x2', 'y2']
    default:
      return []
  }
}

function canSmooth(shapes: Array<VectorShape | undefined>, poses: Pose[]): shapes is VectorShape[] {
  const first = shapes[0]
  if (!first?.motionId || !SMOOTH_TYPES.has(first.type)) return false
  const style = smoothStyleSignature(first)
  return shapes.every((shape, poseIndex) => {
    if (
      !shape ||
      shape.motionId !== first.motionId ||
      shape.type !== first.type ||
      smoothStyleSignature(shape) !== style
    ) {
      return false
    }
    return (
      poses[poseIndex]?.shapes.filter((candidate) => candidate.motionId === first.motionId)
        .length === 1
    )
  })
}

function smoothMarkup(
  shapes: VectorShape[],
  prefix: string,
  keyTimes: string,
  dur: string,
  loop: boolean,
): string {
  const first = shapes[0] as VectorShape
  const geometries = shapes.map(shapeGeometryAttrs)
  const children: string[] = []

  for (const attribute of animatedGeometryAttrs(first)) {
    const values = geometries.map((geometry) => geometry.attrs[attribute] ?? '0')
    if (new Set(values).size > 1) {
      children.push(animate(attribute, values, keyTimes, dur, loop, 'linear'))
    }
  }

  const opacities = shapes.map((shape) => number(shape.opacity))
  if (new Set(opacities).size > 1) {
    children.push(animate('opacity', opacities, keyTimes, dur, loop, 'linear'))
  }

  const rotations = shapes.map((shape) => {
    const center = boundsCenter(shapeBounds(shape))
    return `${number(shape.rotation)} ${number(center.x)} ${number(center.y)}`
  })
  if (new Set(rotations).size > 1 && shapes.some((shape) => shape.rotation !== 0)) {
    children.push(
      `<animateTransform attributeName="transform" type="rotate" values="${valuesWithEnd(
        rotations,
        loop,
      ).join(';')}" keyTimes="${keyTimes}" dur="${dur}" calcMode="linear" ${animationEnd(loop)}/>`,
    )
  }

  return shapeToMarkup(first, prefix, children.join(''))
}

function discreteMarkup(
  shapes: Array<VectorShape | undefined>,
  slot: number,
  keyTimes: string,
  dur: string,
  loop: boolean,
): { defs: string[]; markup: string } {
  const variants = new Map<string, VectorShape>()
  for (const shape of shapes) {
    if (shape) variants.set(visualSignature(shape), shape)
  }

  const defs: string[] = []
  const groups = [...variants.entries()].map(([signature, shape], variant) => {
    const prefix = `pin-d${slot}-${variant}-`
    const variantDefs = gradientDefsMarkup([shape], prefix)
    if (variantDefs) defs.push(variantDefs)
    const states = shapes.map((candidate) =>
      candidate && visualSignature(candidate) === signature ? 'visible' : 'hidden',
    )
    const visibility = animate('visibility', states, keyTimes, dur, loop, 'discrete')
    return `<g visibility="${states[0] ?? 'hidden'}">${visibility}${shapeToMarkup(
      shape,
      prefix,
    )}</g>`
  })

  return { defs, markup: groups.join('') }
}

/**
 * Gera o SVG que a Comunidade Kids aceita. A função é pura: não usa DOM/canvas,
 * não carrega recursos externos e mantém um primeiro quadro estático para quem
 * pede redução de movimento no sistema.
 */
export function buildAnimatedVectorSvg(
  asset: VectorSpriteAsset,
  animation: PintaVectorAnimation,
  options: AnimatedVectorSvgOptions = {},
): AnimatedVectorSvgResult {
  if (animation.frames.length === 0) return { ok: false, reason: 'empty' }

  const visible = animation.frames.flatMap((frame) => visibleShapes(frame))
  if (visible.some((shape) => shape.type === 'text')) return { ok: false, reason: 'text' }
  if (visible.some((shape) => shape.type === 'image')) return { ok: false, reason: 'image' }
  if (visible.length === 0) return { ok: false, reason: 'empty' }

  const poses = compactPoses(animation)
  const { dur, keyTimes } = timeline(poses)
  const maxSlots = Math.max(...poses.map((pose) => pose.shapes.length))
  const defs: string[] = []
  const scene: string[] = []
  let staticTracks = 0
  let smoothedTracks = 0
  let discreteTracks = 0

  for (let slot = 0; slot < maxSlots; slot += 1) {
    const shapes = poses.map((pose) => pose.shapes[slot])
    const first = shapes[0]
    const signatures = shapes.map((shape) => (shape ? visualSignature(shape) : null))
    if (first && signatures.every((signature) => signature === signatures[0])) {
      const prefix = `pin-s${slot}-`
      const slotDefs = gradientDefsMarkup([first], prefix)
      if (slotDefs) defs.push(slotDefs)
      scene.push(shapeToMarkup(first, prefix))
      staticTracks += 1
      continue
    }

    if (options.smooth !== false && canSmooth(shapes, poses)) {
      const prefix = `pin-m${slot}-`
      const slotDefs = gradientDefsMarkup([shapes[0] as VectorShape], prefix)
      if (slotDefs) defs.push(slotDefs)
      scene.push(smoothMarkup(shapes, prefix, keyTimes, dur, animation.loop))
      smoothedTracks += 1
      continue
    }

    const discrete = discreteMarkup(shapes, slot, keyTimes, dur, animation.loop)
    defs.push(...discrete.defs)
    scene.push(discrete.markup)
    discreteTracks += 1
  }

  const reducedPrefix = 'pin-reduced-'
  const reducedShapes = poses[0]?.shapes ?? []
  const reducedDefs = gradientDefsMarkup(reducedShapes, reducedPrefix)
  if (reducedDefs) defs.push(reducedDefs)

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${asset.frameWidth}" height="${asset.frameHeight}" viewBox="0 0 ${asset.frameWidth} ${asset.frameHeight}" role="img" aria-label="Animação vetorial criada no Pinta" preserveAspectRatio="xMidYMid meet">`,
    '<style>.pin-reduced{display:none}@media(prefers-reduced-motion:reduce){.pin-motion{display:none}.pin-reduced{display:inline}}</style>',
    ...defs,
    `<g class="pin-motion">${scene.join('')}</g>`,
    `<g class="pin-reduced" aria-label="Primeiro quadro estático">${shapesToMarkup(
      reducedShapes,
      '',
      reducedPrefix,
    )}</g>`,
    '</svg>',
  ].join('\n')
  const bytes = new TextEncoder().encode(svg).byteLength
  if (bytes > MODULE_ANIMATED_SVG_MAX_BYTES) return { ok: false, reason: 'too-large', bytes }

  return {
    ok: true,
    svg,
    bytes,
    sourceFrameCount: animation.frames.length,
    poseCount: poses.length,
    staticTracks,
    smoothedTracks,
    discreteTracks,
  }
}
