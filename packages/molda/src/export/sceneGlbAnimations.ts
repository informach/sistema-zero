import type { SceneAnimationTrack } from '../scene/animation'
import { requireScene } from '../scene/validation'
import type { GlbBinary } from './GlbBinary'
import type { prepareSceneGlbHierarchy } from './sceneGlbHierarchy'
import type { SceneGlbIssue } from './sceneGlbReport'
import { prepareSceneGlbTrack, type SceneGlbAnimationBudget } from './sceneGlbTrack'

export const MAX_SCENE_GLB_ANIMATION_CHANNELS = 65_536
interface GlbAnimation {
  name: string
  channels: Array<{
    sampler: number
    target: { node: number; path: SceneAnimationTrack['channel'] }
  }>
  samplers: Array<{
    input: number
    output: number
    interpolation: 'STEP' | 'LINEAR' | 'CUBICSPLINE'
  }>
  extras: {
    molda: {
      sourceId: string
      duration: number
      fps: number
      loop: boolean
      space: 'local' | 'local-delta'
      originalName?: string
    }
  }
}

function portableClipName(name: string, reserved: ReadonlySet<string>, used: ReadonlySet<string>) {
  if (!used.has(name)) return name
  for (let ordinal = 2; ; ordinal++) {
    const suffix = ` (${ordinal})`
    // Preserve whole Unicode characters when making room within the native 128-unit text budget.
    const prefix = name.slice(0, 128 - suffix.length).replace(/[\uD800-\uDBFF]$/, '')
    const candidate = prefix + suffix
    if (!reserved.has(candidate) && !used.has(candidate)) return candidate
  }
}

/** Replicated mirror channels share binary samplers; local and delta targets never collide. */
export function prepareSceneGlbAnimations(
  hierarchy: ReturnType<typeof prepareSceneGlbHierarchy>,
  binary: GlbBinary,
  issues: SceneGlbIssue[],
) {
  const animations: GlbAnimation[] = []
  const reserved = new Set(Array.from(hierarchy.index.animations.values(), (clip) => clip.name))
  const used = new Set<string>()
  const budget: SceneGlbAnimationBudget = { keys: 0, channels: 0 }
  for (const clip of hierarchy.index.animations.values()) {
    const animation: GlbAnimation = {
      name: clip.name,
      channels: [],
      samplers: [],
      extras: {
        molda: {
          sourceId: clip.id,
          duration: clip.duration,
          fps: clip.fps,
          loop: clip.loop,
          space: clip.space,
        },
      },
    }
    for (const track of clip.tracks) {
      const targets = hierarchy.targets.get(track.nodeId)
      if (!targets?.length) continue
      requireScene(
        budget.channels + targets.length <= MAX_SCENE_GLB_ANIMATION_CHANNELS,
        'export.animation.channels',
        'Os grupos e espelhos gerariam canais demais nos movimentos do GLB.',
      )
      budget.channels += targets.length
      const prepared = prepareSceneGlbTrack(track, clip.duration, budget)
      if (prepared.resampled)
        issues.push({
          code: 'animation-resampled',
          sourceId: clip.id,
          nodeId: track.nodeId,
          channel: track.channel,
          samples: prepared.samples,
        })
      const sampler = animation.samplers.length
      animation.samplers.push({
        input: binary.floats(prepared.times, 'SCALAR', true),
        output: binary.floats(prepared.output, track.channel === 'rotation' ? 'VEC4' : 'VEC3'),
        interpolation: prepared.interpolation,
      })
      for (const target of targets) {
        const node = clip.space === 'local' ? target.local : target.delta
        requireScene(node !== null, 'export.animation.target', 'Alvo de movimento ausente no GLB.')
        animation.channels.push({ sampler, target: { node, path: track.channel } })
      }
    }
    if (animation.channels.length) {
      const name = portableClipName(clip.name, reserved, used)
      used.add(name)
      if (name !== clip.name) {
        animation.name = name
        animation.extras.molda.originalName = clip.name
        issues.push({ code: 'clip-renamed', sourceId: clip.id, originalName: clip.name, name })
      }
      animations.push(animation)
    } else
      issues.push({
        code: 'clip-omitted',
        sourceId: clip.id,
        reason: clip.tracks.length ? 'hidden' : 'empty',
      })
  }
  return { animations, keys: budget.keys, channels: budget.channels }
}
