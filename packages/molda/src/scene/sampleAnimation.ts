import type { Vec3 } from '../core/model'
import type { SceneAnimationClip, SceneAnimationTrack } from './animation'
import { indexSceneAnimations } from './animationIndex'
import type { ModelSceneNode, MoldaSceneDocument } from './document'
import { indexSceneNodes, type SceneIndex } from './graph'
import { SCENE_LIMITS } from './limits'
import { type AffineMatrix, affineMultiply, composeTransform, type Quaternion } from './matrix'
import { readSceneAnimationClip } from './readAnimation'
import { list, number, requireScene, tuple, id as validateId } from './validation'

export interface SceneAnimationPose {
  /** Exact immutable revision owner; late poses cannot move another revision's pieces. */
  source: MoldaSceneDocument
  clipId: string
  time: number
  worldMatrices: ReadonlyMap<string, Readonly<AffineMatrix>>
  /** Ephemeral assistance display, never animation data or a second transform source. */
  twoBoneGuide?: {
    chain: readonly [string, string, string]
    target: Readonly<Vec3>
  }
}

interface SceneAnimationSampler {
  source: MoldaSceneDocument
  clip: SceneAnimationClip
  sample(seconds: number, loop?: boolean): SceneAnimationPose
}

export function sceneAnimationTime(
  clip: Pick<SceneAnimationClip, 'duration' | 'loop'>,
  seconds: number,
) {
  number(seconds, 'time')
  if (!clip.loop) return Math.max(0, Math.min(clip.duration, seconds))
  const remainder = seconds % clip.duration
  // Adding duration unconditionally would erase tiny positive Double times.
  return remainder < 0 ? remainder + clip.duration : remainder === 0 ? 0 : remainder
}

function unit(value: readonly number[]): Quaternion {
  const length = Math.hypot(...value)
  return value.map((component) => component / length) as Quaternion
}

function rotation(a: Quaternion, b: Quaternion, weight: number): Quaternion {
  const start = unit(a)
  const end = unit(b)
  let dot = start.reduce((sum, value, i) => sum + value * end[i]!, 0)
  const direction = dot < 0 ? -1 : 1
  dot = Math.min(1, Math.abs(dot))
  const angle = Math.acos(dot)
  const sine = Math.sin(angle)
  const coincident = 1 - dot * dot <= Number.EPSILON
  const left = coincident ? 1 - weight : Math.sin((1 - weight) * angle) / sine
  const right = coincident ? weight : Math.sin(weight * angle) / sine
  return unit(start.map((value, i) => left * value + right * direction * end[i]!))
}

/** Binary search, owned output and shortest-arc rotations; input is a validated immutable track. */
export function sampleSceneAnimationTrack(
  track: SceneAnimationTrack,
  time: number,
): Vec3 | Quaternion {
  number(time, 'time')
  let low = 0
  let high = track.keys.length
  while (low < high) {
    const middle = (low + high) >>> 1
    if (track.keys[middle]!.time <= time) low = middle + 1
    else high = middle
  }
  const index = Math.max(0, low - 1)
  const a = track.keys[index]
  requireScene(a, 'track', 'A trilha precisa de pelo menos uma chave.')
  const b = track.keys[index + 1]
  if (!b || time <= a.time || a.interpolation === 'step')
    return track.channel === 'rotation' ? unit(a.value) : [...a.value]
  let weight = (time - a.time) / (b.time - a.time)
  if (a.interpolation === 'smooth') weight = weight * weight * (3 - 2 * weight)
  if (track.channel === 'rotation')
    return rotation(a.value as Quaternion, b.value as Quaternion, weight)
  // Weighted endpoints avoid overflow in b-a for finite large values of opposite signs.
  return a.value.map((value, i) =>
    value === b.value[i] ? value : (1 - weight) * value + weight * b.value[i]!,
  ) as Vec3
}

/** Compile only hierarchy/tracks once. Sampling never indexes geometry or reads/copies pixels. */
export function prepareSceneAnimation(
  source: MoldaSceneDocument,
  clipId: string,
): SceneAnimationSampler {
  const scene = indexSceneNodes(source.nodes)
  const clip = indexSceneAnimations(source, scene).animations.get(clipId)
  requireScene(clip, 'clipId', 'O movimento escolhido não existe.')
  return compileSceneAnimation(source, scene, clip)
}

/** Explicit session-only clip override: owned/validated keys, original revision owns the geometry. */
export function prepareSceneAnimationPreview(
  source: MoldaSceneDocument,
  draft: SceneAnimationClip,
): SceneAnimationSampler {
  const clip = readSceneAnimationClip(draft)
  const scene = indexSceneNodes(source.nodes)
  indexSceneAnimations({ ...source, animations: [clip] }, scene)
  return compileSceneAnimation(source, scene, clip)
}

/** Fixed-time, session-only rotation overrides. Nested targets propagate once in hierarchy order. */
export function prepareSceneAnimationRotationPreview(
  source: MoldaSceneDocument,
  clipId: string,
  nodeIds: readonly string[],
  time: number,
) {
  const scene = indexSceneNodes(source.nodes),
    clip = indexSceneAnimations(source, scene).animations.get(clipId)
  requireScene(clip, 'clipId', 'O movimento escolhido não existe.')
  number(time, 'time', 0, clip.duration)
  const allowed = new Set(
    list(nodeIds, 'nodes', SCENE_LIMITS.nodes).map((value) => validateId(value, 'nodes')),
  )
  requireScene(allowed.size > 0, 'nodes', 'Escolha apoios para ajustar a pose.')
  for (const id of allowed) {
    const node = scene.nodes.get(id)
    requireScene(node, 'nodes', 'O apoio escolhido não existe.')
    requireScene(
      clip.space !== 'local' || node.transform.kind === 'trs',
      'pose',
      'Use um movimento relativo para ajustar um apoio com eixos inclinados.',
    )
  }
  const compiled = compileSceneAnimation(source, scene, clip, allowed, time),
    own = (pose: SceneAnimationPose): SceneAnimationPose => ({
      ...pose,
      worldMatrices: new Map(
        [...pose.worldMatrices].map(([id, matrix]) => [id, [...matrix] as AffineMatrix]),
      ),
    })
  return {
    original: own(compiled.sample(time, false)),
    sample(rotations: ReadonlyMap<string, Quaternion>): SceneAnimationPose {
      const owned = new Map<string, Quaternion>()
      for (const [id, input] of rotations) {
        requireScene(allowed.has(id), 'nodes', 'Esta rotação pertence a outro ajuste.')
        const value = tuple(input, 4, `rotation.${id}`)
        requireScene(Math.abs(Math.hypot(...value) - 1) <= 1e-6, 'rotation', 'Rotação inválida.')
        owned.set(id, unit(value))
      }
      return own(compiled.sample(time, false, owned))
    },
  }
}

function animatedTransform(
  node: ModelSceneNode,
  space: SceneAnimationClip['space'],
  tracks: readonly SceneAnimationTrack[],
  time: number,
) {
  const rest = space === 'local' && node.transform.kind === 'trs' ? node.transform : null,
    transform = {
      kind: 'trs' as const,
      translation: rest?.translation ?? ([0, 0, 0] as Vec3),
      rotation: rest?.rotation ?? ([0, 0, 0, 1] as Quaternion),
      scale: rest?.scale ?? ([1, 1, 1] as Vec3),
    }
  for (const track of tracks) {
    const value = sampleSceneAnimationTrack(track, time)
    if (track.channel === 'rotation') transform.rotation = value as Quaternion
    else transform[track.channel] = value as Vec3
  }
  return transform
}

function compileSceneAnimation(
  source: MoldaSceneDocument,
  scene: SceneIndex<ModelSceneNode>,
  clip: SceneAnimationClip,
  rotationTargets: ReadonlySet<string> = new Set(),
  fixedTime?: number,
) {
  const tracksByNode = new Map<string, SceneAnimationTrack[]>()
  for (const track of clip.tracks) {
    const tracks = tracksByNode.get(track.nodeId) ?? []
    tracks.push(track)
    tracksByNode.set(track.nodeId, tracks)
  }
  const affected = new Set<string>()
  const locals = new Map<string, AffineMatrix>()
  for (const id of scene.order) {
    const node = scene.nodes.get(id)!
    if (
      tracksByNode.has(id) ||
      rotationTargets.has(id) ||
      (node.parentId !== null && affected.has(node.parentId))
    ) {
      affected.add(id)
      locals.set(id, composeTransform(node.transform))
    }
  }
  const fixedLocals = fixedTime === undefined ? null : new Map<string, AffineMatrix>(),
    fixedTransforms = new Map<string, ReturnType<typeof animatedTransform>>()
  if (fixedLocals && fixedTime !== undefined)
    for (const id of affected) {
      const tracks = tracksByNode.get(id),
        base = locals.get(id)!,
        transform =
          tracks || rotationTargets.has(id)
            ? animatedTransform(scene.nodes.get(id)!, clip.space, tracks ?? [], fixedTime)
            : null,
        animated = tracks ? composeTransform(transform!) : null
      fixedLocals.set(
        id,
        animated ? (clip.space === 'local' ? animated : affineMultiply(base, animated)) : base,
      )
      if (rotationTargets.has(id)) fixedTransforms.set(id, transform!)
    }
  return {
    source,
    clip,
    sample(
      seconds: number,
      loop = clip.loop,
      rotations?: ReadonlyMap<string, Quaternion>,
    ): SceneAnimationPose {
      const time = sceneAnimationTime({ duration: clip.duration, loop }, seconds)
      const worldMatrices = new Map(scene.worldMatrices)
      for (const id of affected) {
        const node = scene.nodes.get(id)!
        const base = locals.get(id)!
        const tracks = tracksByNode.get(id)
        const rotation = rotations?.get(id)
        let local = fixedLocals?.get(id) ?? base
        if (rotation || (!fixedLocals && tracks)) {
          const transform =
              fixedTransforms.get(id) ?? animatedTransform(node, clip.space, tracks ?? [], time),
            animated = composeTransform(rotation ? { ...transform, rotation } : transform)
          local = clip.space === 'local' ? animated : affineMultiply(base, animated)
        }
        const world =
          node.parentId === null ? local : affineMultiply(worldMatrices.get(node.parentId)!, local)
        worldMatrices.set(id, world)
      }
      return { source, clipId: clip.id, time, worldMatrices }
    },
  }
}
