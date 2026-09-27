import { BBMODEL_CLIP_PROBLEM_COPY } from '../core/bbmodelAnimationImportCopy'
import { SCENE_LIMITS } from '../scene/limits'
import { bindBbmodelAnimations } from './bbmodelAnimationBindings'
import type { BbmodelAnimationBinding } from './bbmodelAnimationBindingTypes'
import { classifyBbmodelAnimationConstant } from './bbmodelAnimationConstant'
import { readBbmodelAnimationKeyframes } from './bbmodelAnimationKeyframes'
import type { BbmodelKeyAnimator } from './bbmodelAnimationKeyTypes'
import { readBbmodelAnimationStructure } from './bbmodelAnimationStructure'
import { prepareBbmodelAnimationTrack } from './bbmodelAnimationTrack'
import type { BbmodelAnimationSource } from './bbmodelAnimationTypes'
import { assessBbmodelClipCoverage } from './bbmodelClipCoverage'
import { readBbmodelClipOptions } from './bbmodelClipOptions'
import type {
  BbmodelClipOptions,
  BbmodelClipPlanReport,
  BbmodelClipProblem,
} from './bbmodelClipPlanTypes'
import type { BbmodelEnvelope } from './bbmodelEnvelope'
import type { BbmodelGraph } from './bbmodelGraph'
import { BbmodelInputError } from './bbmodelInput'
import type { BbmodelNativeClipDraft } from './bbmodelNativeClipTypes'
import type { BbmodelNodeMetadata } from './bbmodelNodeMetadata'
import { BbmodelReportBudget } from './bbmodelReportLimits'
import type { BbmodelSelection } from './bbmodelSelection'
import type { BbmodelTransform } from './bbmodelTransforms'

export interface BbmodelClipContext {
  envelope: BbmodelEnvelope
  graph: BbmodelGraph
  metadata: readonly BbmodelNodeMetadata[]
  selection: BbmodelSelection
  transforms: ReadonlyMap<number, BbmodelTransform>
  nodeIds: ReadonlyMap<number, string>
}
function animatorProblem(
  animator: BbmodelKeyAnimator,
  binding: BbmodelAnimationBinding,
): BbmodelClipProblem | null {
  if (binding.kind !== 'bound' || !binding.selected)
    return { code: 'binding', path: binding.path, binding: structuredBinding(binding) }
  if (animator.kind !== 'transform' || animator.sourceType !== 'bone')
    return { code: 'animator-mode', path: animator.declaration.path, mode: 'unsupported-type' }
  if (animator.rotationGlobal)
    return {
      code: 'animator-mode',
      path: `${animator.declaration.path}.rotation_global`,
      mode: 'global',
    }
  if (animator.quaternionInterpolation)
    return {
      code: 'animator-mode',
      path: `${animator.declaration.path}.quaternion_interpolation`,
      mode: 'quaternion',
    }
  for (const key of animator.keys)
    if (key.kind === 'unresolved') return { code: 'channel', path: key.path, channel: key.channel }
  return null
}
function structuredBinding(binding: BbmodelAnimationBinding): BbmodelAnimationBinding {
  return binding.kind === 'unresolved'
    ? { ...binding, detail: { ...binding.detail } }
    : { ...binding }
}
function timingProblem(source: BbmodelAnimationSource): BbmodelClipProblem | null {
  for (const [field, value] of [
    ['anim_time_update', source.timing.timeUpdate],
    ['start_delay', source.timing.startDelay],
    ['loop_delay', source.timing.loopDelay],
  ] as const)
    if (value !== '') return { code: 'timing', path: `${source.path}.${field}` }
  if (source.loop !== 'once' && source.loop !== 'hold' && source.loop !== 'loop')
    return { code: 'loop', path: `${source.path}.loop`, value: source.loop }
  return null
}

/**
 * Source readers validate ALL known declarations before any per-clip policy/omission.
 * Only independent, bound local-Euler bone clips qualify. Unsupported clips are atomic:
 * omit-clip records the first reason and never salvages a prefix of their moving parts.
 * Numeric/budget/internal errors are NOT swallowed by that policy. No sampling or adoption.
 *
 * Auxiliary/unmapped field decisions are separate from mathematical adaptation. Unknown
 * values remain unread; entire discarded marker metadata is counted as a subtree omission.
 * Source controller coverage and final world/report/worker checks remain caller obligations.
 */
export function planBbmodelClips(context: BbmodelClipContext, options: BbmodelClipOptions = {}) {
  const policy = readBbmodelClipOptions(options),
    structure = readBbmodelAnimationStructure(context.envelope),
    keys = readBbmodelAnimationKeyframes(structure),
    bindings = bindBbmodelAnimations(
      { ...context, keys },
      { nameReferences: policy.nameReferences },
    ),
    drafts: BbmodelNativeClipDraft[] = [],
    reports: BbmodelClipPlanReport[] = [],
    budget = new BbmodelReportBudget()
  if (structure.clips.length && policy.adaptation === 'reject')
    throw new BbmodelInputError(
      'unsupported',
      'options.adaptation',
      'Escolha como adaptar os movimentos antes de continuar.',
    )
  let nativeTracks = 0
  function report(value: BbmodelClipPlanReport) {
    budget.addIssue({ detail: value })
    reports.push(value)
  }
  for (const source of structure.clips) {
    const keyed = keys.clips[source.index],
      bound = bindings.clips[source.index],
      identity = {
        clip: source.index,
        path: source.path,
        sourceUuid: source.uuid,
        sourceName: source.name,
      }
    if (
      !keyed ||
      !bound ||
      keyed.clip !== source.index ||
      bound.clip !== source.index ||
      keyed.animators.length !== bound.animators.length
    )
      throw new Error('Mismatched bbmodel clip stages')
    function omit(problem: BbmodelClipProblem): void {
      if (policy.unresolved === 'reject')
        throw new BbmodelInputError(
          'unsupported',
          problem.path,
          `${BBMODEL_CLIP_PROBLEM_COPY[problem.code]} Revise os ajustes ou escolha deixar este movimento inteiro de fora.`,
        )
      report({ ...identity, kind: 'omitted', problem })
    }
    let problem = timingProblem(source)
    for (const [index, animator] of keyed.animators.entries()) {
      const binding = bound.animators[index]
      if (!binding || binding.animator !== animator.index)
        throw new Error('Mismatched bbmodel animator stages')
      problem ??= animatorProblem(animator, binding)
    }
    if (problem) {
      omit(problem)
      continue
    }
    if (policy.duration === 'declared') {
      if (source.length <= 0) {
        omit({ code: 'duration', path: `${source.path}.length`, value: source.length })
        continue
      }
      if (source.length > SCENE_LIMITS.animationSeconds)
        throw new BbmodelInputError(
          'budget',
          `${source.path}.length`,
          'Este movimento ultrapassa a duração máxima do Molda.',
        )
    }
    const rawWeight = source.timing.blendWeight,
      defaulted = rawWeight === '' || rawWeight === 0,
      constant = defaulted
        ? { kind: 'constant' as const, value: 1 }
        : classifyBbmodelAnimationConstant(rawWeight)
    if (constant.kind !== 'constant') {
      omit({
        code: 'weight',
        path: `${source.path}.blend_weight`,
        reason: constant.kind === 'expression' ? 'expression' : constant.reason,
      })
      continue
    }
    const coverage = assessBbmodelClipCoverage(source, keyed.animators, policy)
    if (coverage.problem) {
      omit(coverage.problem)
      continue
    }
    const tracks: BbmodelNativeClipDraft['tracks'][number][] = []
    let lastTime = 0,
      nameReferences = 0,
      emptyAnimators = 0
    for (const [index, animator] of keyed.animators.entries()) {
      const binding = bound.animators[index]
      if (animator.kind !== 'transform' || !binding || binding.kind !== 'bound')
        throw new Error('Unresolved animator passed clip gates')
      const nodeId = context.nodeIds.get(binding.node),
        base = context.transforms.get(binding.node)
      if (!nodeId || !base) throw new Error('Missing native target/rest pose for bbmodel clip')
      if (binding.via !== 'uuid') nameReferences++
      if (!animator.keys.length) emptyAnimators++
      for (const channel of ['position', 'rotation', 'scale'] as const) {
        const track = prepareBbmodelAnimationTrack(animator, channel, structure.version)
        if (track.status !== 'ready') {
          problem = { code: 'track', path: track.issue.path, issue: track.issue }
          break
        }
        if (!track.keys.length) continue
        const split = track.keys.find((key) => key.points.length === 2)
        if (split && policy.discontinuities === 'reject') {
          problem = { code: 'pre-post', path: split.path }
          break
        }
        const last = track.keys[track.keys.length - 1]
        if (!last) throw new Error('Prepared bbmodel track changed during planning')
        lastTime = Math.max(lastTime, last.time)
        tracks.push({ path: `${animator.declaration.path}.${channel}`, nodeId, base, track })
      }
      if (problem) break
    }
    if (problem) {
      omit(problem)
      continue
    }
    const duration =
      policy.duration === 'declared' ? source.length : Math.max(1 / policy.fps, lastTime)
    if (policy.duration === 'fit-keys' && duration > SCENE_LIMITS.animationSeconds)
      throw new BbmodelInputError(
        'budget',
        `${source.path}.length`,
        'Este movimento ultrapassa a duração máxima do Molda.',
      )
    if (source.loop !== 'once' && source.loop !== 'hold' && source.loop !== 'loop')
      throw new Error('Unresolved playback mode passed clip gates')
    nativeTracks += tracks.length
    if (drafts.length >= SCENE_LIMITS.animationClips || nativeTracks > SCENE_LIMITS.animationTracks)
      throw new BbmodelInputError(
        'budget',
        source.path,
        'Os clipes e trilhas ultrapassam o orçamento nativo.',
      )
    const weight = Math.max(0, constant.value),
      loop = source.loop === 'loop'
    report({
      ...identity,
      kind: 'prepared',
      duration: { mode: policy.duration, source: source.length, native: duration },
      playback: { source: source.loop, nativeLoop: loop, standalone: true },
      weight: { value: weight, defaulted, clamped: constant.value < 0 },
      metadataFields: coverage.metadataFields,
      unmappedFields: coverage.unmappedFields,
      firstMetadataPath: coverage.firstMetadataPath,
      firstUnmappedPath: coverage.firstUnmappedPath,
      markers: source.markers.length,
      nameReferences,
      emptyAnimators,
    })
    drafts.push({
      clip: source.index,
      path: source.path,
      name: source.name,
      duration,
      fps: policy.fps,
      loop,
      weight,
      catmullLoopNeighbours: false,
      tracks,
    })
  }
  return {
    drafts,
    reports,
    policy,
    sourceCounts: { ...structure.counts },
    keyCounts: { ...keys.counts },
    bindingCounts: { ...bindings.counts },
  }
}
