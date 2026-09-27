import type { SceneAnimationTrack } from '../scene/animation'
import { SCENE_LIMITS } from '../scene/limits'
import { mergeAnimationSampleTimes } from './animationSampleTimes'
import type { GltfAccessor } from './gltfAccessors'
import type { GltfAnimation } from './gltfAnimationTypes'
import type { GltfClipIssue, GltfClipOptions } from './gltfClipTypes'
import type { GltfDocument } from './gltfDocument'
import type { GltfHierarchy } from './gltfHierarchy'
import { GltfInputError, gltfInteger, requireGltf } from './gltfInput'
import { gltfChoice } from './gltfMetadata'
import type { GltfSelection } from './gltfSelection'

export interface GltfClipTrackPlan {
  channel: number
  property: SceneAnimationTrack['channel']
  nodeId: string
  path: string
  input: number
  lowerKeyCount: number
}
interface ClipPlan {
  animation: GltfAnimation
  sourceIndex: number
  id: string
  path: string
  duration: number
  tracks: GltfClipTrackPlan[]
}

// Without binary/sparse storage glTF permits arbitrary bounds intended for
// extensions, while the core accessor decoded by this importer contains zeros.
function timeBound(input: GltfAccessor, bound: 'min' | 'max'): number {
  return input.layout || input.sparseViews ? input[bound]![0]! : 0
}

/** Metadata gate only. No accessor values, raster, geometry or authorial key allocation. */
export function planGltfClips(
  source: GltfDocument,
  selection: GltfSelection,
  hierarchy: GltfHierarchy,
  options: GltfClipOptions,
) {
  const fps = gltfInteger(options.fps ?? 30, 'animation.fps', 1, 120),
    loop = options.loop ?? false,
    cubic = gltfChoice(options.cubic ?? 'reject', ['reject', 'bake'], 'animation.cubic'),
    rotations = gltfChoice(
      options.rotations ?? 'preserve',
      ['preserve', 'normalize'],
      'animation.rotations',
    ),
    morphs = gltfChoice(options.morphs ?? 'reject', ['reject', 'omit'], 'animation.morphs'),
    unresolved = gltfChoice(
      options.unresolved ?? 'reject',
      ['reject', 'omit'],
      'animation.unresolved',
    ),
    nodes = new Map(hierarchy.nodes.map((node) => [node.id, node])),
    plans: ClipPlan[] = [],
    issues: GltfClipIssue[] = []
  requireGltf(
    typeof loop === 'boolean',
    'animation.loop',
    'Repetir precisa ser verdadeiro ou falso.',
  )
  let trackCount = 0,
    minimumKeys = 0
  for (const selected of selection.animations) {
    const animation = source.animations[selected.animation]!,
      path = `animations[${selected.animation}]`,
      id = `gltf_clip_${selected.animation}`,
      tracks: GltfClipTrackPlan[] = []
    for (const channel of selected.outsideSceneChannels)
      issues.push({
        code: 'outside-scene-channel',
        clipId: id,
        path: `${path}.channels[${channel}]`,
        count: 1,
      })
    for (const channel of selected.unresolvedChannels) {
      const targetPath = `${path}.channels[${channel}].target`
      if (unresolved === 'reject')
        throw new GltfInputError(
          'unsupported',
          targetPath,
          'Este movimento depende de um alvo ainda sem suporte; sua omissão precisa ser escolhida.',
        )
      issues.push({ code: 'unresolved-channel-omitted', clipId: id, path: targetPath, count: 1 })
    }
    for (const channelIndex of selected.channels) {
      const channel = animation.channels[channelIndex]!,
        target = channel.target,
        field = `${path}.channels[${channelIndex}]`
      requireGltf(
        target.kind === 'node',
        `${field}.target`,
        'O canal selecionado não tem alvo core.',
      )
      if (target.path === 'weights') {
        if (morphs === 'reject')
          throw new GltfInputError(
            'unsupported',
            `${field}.target`,
            'A animação de morphs não tem trilha nativa; sua omissão precisa ser escolhida.',
          )
        issues.push({
          code: 'morph-channel-omitted',
          clipId: id,
          path: `${field}.target`,
          count: 1,
        })
        continue
      }
      const nodeId = hierarchy.nodeIds.get(target.node),
        node = nodeId === undefined ? undefined : nodes.get(nodeId),
        sampler = animation.samplers[channel.sampler]!,
        input = source.accessors[sampler.input]!
      requireGltf(
        node !== undefined && node.transform.kind === 'trs',
        `${field}.target`,
        'O alvo precisa corresponder a um nó TRS da hierarquia convertida.',
      )
      const isCubic = sampler.interpolation === 'CUBICSPLINE'
      if (isCubic && cubic === 'reject')
        throw new GltfInputError(
          'unsupported',
          `${path}.samplers[${channel.sampler}].interpolation`,
          'Curvas cúbicas precisam de conversão explícita em amostras; smooth nativo não é a mesma curva.',
        )
      const gridCount = isCubic
          ? Math.max(
              0,
              Math.floor(timeBound(input, 'max') * fps) -
                Math.ceil(timeBound(input, 'min') * fps) +
                1,
            )
          : 0,
        lowerKeyCount = Math.max(input.count, gridCount)
      trackCount++
      minimumKeys += lowerKeyCount
      if (trackCount > SCENE_LIMITS.animationTracks || minimumKeys > SCENE_LIMITS.animationKeys)
        throw new GltfInputError(
          'budget',
          field,
          'As trilhas ou chaves ultrapassam o orçamento nativo.',
        )
      tracks.push({
        channel: channelIndex,
        property: target.path,
        nodeId: node.id,
        path: field,
        input: sampler.input,
        lowerKeyCount,
      })
    }
    if (tracks.length === 0) {
      issues.push({ code: 'empty-clip-omitted', clipId: id, path, count: 1 })
      continue
    }
    // Keep the source clip's period, including held tails from channels outside this scene.
    // Unreferenced samplers do not define an animation's duration.
    let duration = 0
    for (const channel of animation.channels)
      duration = Math.max(
        duration,
        timeBound(source.accessors[animation.samplers[channel.sampler]!.input]!, 'max'),
      )
    if (duration > SCENE_LIMITS.animationSeconds)
      throw new GltfInputError('budget', path, 'O movimento ultrapassa a duração nativa máxima.')
    if (duration === 0) {
      duration = 1 / fps
      issues.push({ code: 'zero-duration-expanded', clipId: id, path, count: 1, fps })
    }
    if (plans.length >= SCENE_LIMITS.animationClips)
      throw new GltfInputError('budget', 'animations', 'Há clipes selecionados demais para editar.')
    plans.push({ animation, sourceIndex: selected.animation, id, path, duration, tracks })
  }
  return { plans, issues, fps, loop, rotations, minimumKeys }
}

/** Sorted exact union; never snap authored times onto the sampling grid. */
export function gltfCubicSampleTimes(
  input: Float64Array,
  fps: number,
  available: number,
  path: string,
): number[] {
  if (input.length === 0) return []
  const times: number[] = [],
    first = input[0]!,
    last = input[input.length - 1]!
  for (const time of mergeAnimationSampleTimes(input, first, last, fps, 'grid')) {
    if (times.length >= available)
      throw new GltfInputError(
        'budget',
        path,
        'Manter chaves originais e amostras ultrapassa o orçamento de animação.',
      )
    times.push(time)
  }
  return times
}
